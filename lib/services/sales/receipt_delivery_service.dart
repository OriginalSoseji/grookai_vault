import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../secrets.dart';

typedef ReceiptDeliverySession = ({String owner, String token});

class ReceiptDeliveryService {
  ReceiptDeliveryService({
    http.Client? transport,
    Uri? origin,
    ReceiptDeliverySession? Function()? session,
  }) : _http = transport ?? http.Client(),
       _origin = origin,
       _session = session ?? _currentSession;
  final http.Client _http;
  final Uri? _origin;
  final ReceiptDeliverySession? Function() _session;
  String? _owner;

  static ReceiptDeliverySession? _currentSession() {
    final s = Supabase.instance.client.auth.currentSession;
    return s == null ? null : (owner: s.user.id, token: s.accessToken);
  }

  Future<Map<String, dynamic>> _call({
    Map<String, dynamic>? body,
    String? receiptId,
  }) async {
    final session = _session();
    if (session == null || (_owner != null && _owner != session.owner)) {
      throw StateError('Sign in again before sending a receipt.');
    }
    _owner ??= session.owner;
    final origin = _origin ?? Uri.parse(grookaiWebBaseUrl);
    final trusted =
        origin.origin == 'https://grookaivault.com' ||
        (kDebugMode && origin.scheme == 'http' && origin.host == '127.0.0.1');
    if (!trusted ||
        origin.userInfo.isNotEmpty ||
        origin.hasQuery ||
        origin.hasFragment ||
        (origin.path.isNotEmpty && origin.path != '/')) {
      throw StateError('Receipt service address is unavailable.');
    }
    final uri = origin
        .resolve('/api/receipts/delivery')
        .replace(
          queryParameters: receiptId == null ? null : {'receiptId': receiptId},
        );
    final request = http.Request(body == null ? 'GET' : 'POST', uri)
      ..followRedirects = false
      ..headers['Authorization'] = 'Bearer ${session.token}';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    final response = await http.Response.fromStream(
      await _http.send(request).timeout(const Duration(seconds: 25)),
    ).timeout(const Duration(seconds: 25));
    if (_session()?.owner != _owner) {
      throw StateError('Your signed-in account changed.');
    }
    if (response.statusCode != 200) {
      throw StateError(
        'Delivery could not be confirmed. Check its status before trying again.',
      );
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  Future<({bool email, bool sms})> capabilities() async {
    final data = (await _call())['capabilities'] as Map;
    return (email: data['email'] == true, sms: data['sms'] == true);
  }

  List<Map<String, dynamic>> _rows(
    Map<String, dynamic> data,
    String receiptId,
  ) {
    final rows = (data['deliveries'] as List)
        .map((r) => Map<String, dynamic>.from(r as Map))
        .toList();
    if (rows.any((r) => r['receiptId'] != receiptId)) {
      throw StateError('Receipt identity changed.');
    }
    return rows;
  }

  Future<List<Map<String, dynamic>>> read(
    String id, {
    bool refresh = false,
  }) async => _rows(
    await _call(
      body: refresh ? {'refreshReceiptId': id} : null,
      receiptId: refresh ? null : id,
    ),
    id,
  );
  Future<List<Map<String, dynamic>>> send({
    required String receiptId,
    required String requestId,
    required String channel,
    required String destination,
  }) async {
    final target = destination.trim();
    if (channel != 'email' && channel != 'sms') {
      throw StateError('Choose email or text.');
    }
    final valid = channel == 'sms'
        ? RegExp(r'^\+[1-9][0-9]{7,14}$')
        : RegExp(r'^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$');
    if (target.length > 254 || !valid.hasMatch(target)) {
      throw StateError(
        channel == 'sms'
            ? 'Use + and country code for the phone number.'
            : 'Enter a valid email address.',
      );
    }
    return _rows(
      await _call(
        body: {
          'receiptId': receiptId,
          'requestId': requestId,
          'channel': channel,
          'destination': target,
          'confirmed': true,
        },
      ),
      receiptId,
    );
  }

  void dispose() => _http.close();
}

String receiptDeliveryStatus(String status) => switch (status) {
  'queued' => 'Queued',
  'sending' => 'Sending',
  'accepted' => 'Accepted by sending service · delivery not yet confirmed',
  'delivered' => 'Delivered',
  'failed' => 'Not delivered · use Share or contact support',
  'uncertain' =>
    'Delivery unconfirmed · do not resend; check with the recipient',
  _ => 'Delivery status unavailable',
};
