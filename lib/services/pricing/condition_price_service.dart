import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';

const conditionPriceCodes = {'NM', 'LP', 'MP', 'HP', 'DMG'};
typedef ConditionPriceSession = ({String owner, String token});
typedef ConditionPriceReaderFactory = ConditionPriceReader Function();

abstract interface class ConditionPriceReader {
  Future<ConditionPriceReference> read(String printingId, String condition);
  void dispose();
}

/// Exact reference DTO only. Mapping, freshness and pricing remain server-owned.
class ConditionPriceReference {
  const ConditionPriceReference({
    required this.printingId,
    required this.condition,
    required this.amount,
    required this.updatedAt,
  });

  final String printingId;
  final String condition;
  final double? amount;
  final DateTime? updatedAt;

  factory ConditionPriceReference.fromResponse(
    Object? data, {
    required String printingId,
    required String condition,
  }) {
    if (data is! Map<String, dynamic> || data['ok'] != true) {
      throw const FormatException('Invalid condition price response');
    }
    final price = data['pricing'];
    if (price is! Map<String, dynamic> ||
        price['version'] != 'CONDITION_PRICE_READ_MODEL_V1' ||
        price['card_printing_id'] != printingId ||
        price['condition'] != condition ||
        !conditionPriceCodes.contains(condition) ||
        price['pricing_lane'] != 'reference' ||
        price['currency'] != null ||
        price['currency_hint'] != 'USD' ||
        price['currency_verified'] != false ||
        price['source_label'] != 'TCGplayer condition price via TCGTracking') {
      throw const FormatException('Condition price selection mismatch');
    }
    final available = price['status'] == 'available';
    final amount = price['amount'];
    final timestamp = price['provider_updated_at'];
    final updatedAt = timestamp is String ? DateTime.tryParse(timestamp) : null;
    if (available
        ? price['confidence'] != 'medium' ||
              amount is! num ||
              !amount.isFinite ||
              amount <= 0 ||
              updatedAt == null
        : price['status'] != 'unavailable' ||
              price['confidence'] != 'unavailable' ||
              amount != null) {
      throw const FormatException('Invalid condition price amount');
    }
    return ConditionPriceReference(
      printingId: printingId,
      condition: condition,
      amount: available ? (amount as num).toDouble() : null,
      updatedAt: updatedAt,
    );
  }
}

/// Uses the existing SDK session against the shared authenticated web reader.
/// Closing an instance cancels its in-flight transport; it never writes data.
class ConditionPriceService implements ConditionPriceReader {
  ConditionPriceService({
    http.Client? transport,
    Uri? origin,
    ConditionPriceSession? Function()? session,
  }) : _http = transport ?? http.Client(),
       _origin = origin,
       _session = session ?? _currentSession;

  final http.Client _http;
  final Uri? _origin;
  final ConditionPriceSession? Function() _session;
  String? _owner;
  bool _disposed = false;

  static ConditionPriceSession? _currentSession() {
    final session = Supabase.instance.client.auth.currentSession;
    return session == null
        ? null
        : (owner: session.user.id, token: session.accessToken);
  }

  @override
  Future<ConditionPriceReference> read(
    String printingId,
    String condition,
  ) async {
    if (_disposed ||
        !RegExp(
          r'^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$',
        ).hasMatch(printingId) ||
        !conditionPriceCodes.contains(condition)) {
      throw StateError('Choose an exact printing and condition.');
    }
    final session = _session();
    if (session == null ||
        session.owner.isEmpty ||
        session.token.isEmpty ||
        (_owner != null && session.owner != _owner)) {
      throw StateError('Sign in to see condition prices.');
    }
    _owner ??= session.owner;
    final origin = _origin ?? Uri.parse(grookaiWebBaseUrl);
    final trusted =
        (!kDebugMode && origin.origin == 'https://grookaivault.com') ||
        (kDebugMode &&
            origin.scheme == 'http' &&
            const {'127.0.0.1', 'localhost', '10.0.2.2'}.contains(origin.host));
    if (!trusted ||
        origin.userInfo.isNotEmpty ||
        origin.hasQuery ||
        origin.hasFragment ||
        (origin.path.isNotEmpty && origin.path != '/')) {
      throw StateError('Condition price service address is unavailable.');
    }
    final request =
        http.Request(
            'GET',
            origin
                .resolve('/api/condition-pricing/v1')
                .replace(
                  queryParameters: {
                    'card_printing_id': printingId,
                    'condition': condition,
                  },
                ),
          )
          ..followRedirects = false
          ..headers['Authorization'] = 'Bearer ${session.token}'
          ..headers['Accept'] = 'application/json'
          ..headers['Cache-Control'] = 'no-store';
    try {
      return await (() async {
        final response = await _http.send(request);
        if (response.statusCode != 200) {
          throw StateError('Condition price could not load.');
        }
        final bytes = BytesBuilder(copy: false);
        var size = 0;
        await for (final chunk in response.stream) {
          size += chunk.length;
          if (size > 32 * 1024) {
            throw const FormatException('Condition price response too large');
          }
          bytes.add(chunk);
        }
        if (_disposed || _session()?.owner != _owner) {
          throw StateError('Your signed-in account changed.');
        }
        return ConditionPriceReference.fromResponse(
          jsonDecode(utf8.decode(bytes.takeBytes())),
          printingId: printingId,
          condition: condition,
        );
      })().timeout(const Duration(seconds: 25));
    } on TimeoutException {
      dispose();
      throw StateError('Condition price could not load.');
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _http.close();
  }
}
