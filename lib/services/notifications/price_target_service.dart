import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../secrets.dart';
import 'price_targets.dart';

class PriceTargetFailure implements Exception {
  const PriceTargetFailure(this.message, {this.definitive = false});
  final String message;
  final bool definitive;
  @override
  String toString() => message;
}

class PriceTargetService extends ChangeNotifier {
  PriceTargetService({
    required this.ownerId,
    http.Client? httpClient,
    SupabaseClient? supabase,
    String? baseUrl,
    ({String? ownerId, String? token}) Function()? sessionReader,
    Stream<String?>? ownerChanges,
  }) : _http = httpClient ?? http.Client(),
       _supabase = supabase,
       _sessionReader = sessionReader,
       baseUrl = (baseUrl ?? grookaiWebBaseUrl).replaceFirst(
         RegExp(r'/+$'),
         '',
       ) {
    _subscription =
        (ownerChanges ??
                (sessionReader == null
                    ? _client.auth.onAuthStateChange.map(
                        (e) => e.session?.user.id,
                      )
                    : null))
            ?.listen((id) {
              if (id != ownerId) _close();
            }, onError: (Object _) => _close());
  }
  final String ownerId, baseUrl;
  final http.Client _http;
  final SupabaseClient? _supabase;
  final ({String? ownerId, String? token}) Function()? _sessionReader;
  SupabaseClient get _client => _supabase ?? Supabase.instance.client;
  StreamSubscription<String?>? _subscription;
  bool _closed = false, _disposed = false;
  bool get closed => _closed || _disposed;
  ({String? ownerId, String? token}) get _session {
    if (_sessionReader != null) return _sessionReader();
    final s = _client.auth.currentSession;
    return (ownerId: s?.user.id, token: s?.accessToken);
  }

  void _close() {
    if (closed) return;
    _closed = true;
    notifyListeners();
  }

  void _check() {
    final s = _session;
    if (closed || s.ownerId != ownerId || s.token == null) {
      _close();
      throw const PriceTargetFailure(
        'Your account changed. Reopen price alerts.',
      );
    }
  }

  Future<Map<String, dynamic>> _request(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
  }) async {
    _check();
    final token = _session.token;
    final headers = {
      'authorization': 'Bearer $token',
      'accept': 'application/json',
      if (body != null) 'content-type': 'application/json',
    };
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final serialized = body == null ? null : jsonEncode(body);
    late http.Response response;
    late Map<String, dynamic> value;
    try {
      response =
          await (serialized == null
                  ? _http.get(uri, headers: headers)
                  : _http.post(uri, headers: headers, body: serialized))
              .timeout(const Duration(seconds: 25));
      _check();
      value = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    } catch (_) {
      _check();
      throw PriceTargetFailure(
        body == null
            ? 'Price alerts could not load. Please retry.'
            : 'The save could not be confirmed. Keep this screen open and retry the same request.',
      );
    }
    _check();
    if (response.statusCode == 401) {
      _close();
      throw const PriceTargetFailure(
        'Your account changed. Reopen price alerts.',
      );
    }
    if (response.statusCode != 200) {
      throw PriceTargetFailure(
        value['definitive'] == true && value['error'] is String
            ? value['error'] as String
            : body == null
            ? 'Price alerts could not load. Please retry.'
            : 'The save could not be confirmed. Keep this screen open and retry the same request.',
        definitive: value['definitive'] == true,
      );
    }
    if (value['ownerId'] != ownerId) {
      _close();
      throw const PriceTargetFailure(
        'Your account changed. Reopen price alerts.',
      );
    }
    return value;
  }

  Future<PriceTargets> read() async =>
      PriceTargets.fromJson(ownerId, await _request('/api/price-alerts'));
  Future<Map<String, dynamic>> catalog(String query, int offset) async {
    final value = await _request(
      '/api/price-alerts/catalog',
      query: {'q': query, 'offset': '$offset'},
    );
    return Map<String, dynamic>.from(value['catalog'] as Map);
  }

  Future<void> save(Map<String, dynamic> body) async {
    final id = body['id'],
        expected =
            BigInt.parse(body['expectedRevision'] as String) + BigInt.one;
    final value = await _request('/api/price-alerts', body: body);
    if (value['id'] != id || value['revision'] != expected.toString()) {
      throw const PriceTargetFailure(
        'The save could not be confirmed. Retry the same request.',
      );
    }
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_subscription?.cancel());
    _http.close();
    super.dispose();
  }
}
