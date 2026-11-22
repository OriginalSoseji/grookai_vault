import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

/// Thin owner-bound transport. Eligibility, stock and sales live on the server.
abstract interface class SquareGateway {
  Future<Map<String, dynamic>> workspace();
  Future<Map<String, dynamic>> call(String action, Map<String, dynamic> data);
  void dispose();
}

class SquareService implements SquareGateway {
  SquareService(this.client, {required this.ownerId, http.Client? transport})
    : _transport = transport ?? http.Client();
  final SupabaseClient client;
  final String ownerId;
  final http.Client _transport;
  static final endpoint = Uri.parse('https://grookaivault.com/api/square');
  static const uncertain =
      'The Square result is still being checked. Refresh its status before trying again.';

  void _owner() {
    if (client.auth.currentUser?.id != ownerId || ownerId.isEmpty) {
      throw StateError('Sign in to the same grookai account to continue.');
    }
  }

  @override
  Future<Map<String, dynamic>> workspace() => _request();
  @override
  Future<Map<String, dynamic>> call(String action, Map<String, dynamic> data) =>
      _request({...data, 'action': action});
  Future<Map<String, dynamic>> notifyOffer(String instanceId) => _request({
    'instanceId': instanceId,
  }, endpoint.replace(path: '/api/square/notify'));

  Future<Map<String, dynamic>> _request([
    Map<String, dynamic>? data,
    Uri? target,
  ]) async {
    _owner();
    final token = client.auth.currentSession?.accessToken;
    if (token == null || token.isEmpty) {
      throw StateError('Sign in to grookai to continue.');
    }
    try {
      return await (() async {
        final request =
            http.Request(data == null ? 'GET' : 'POST', target ?? endpoint)
              ..followRedirects = false
              ..headers['Authorization'] = 'Bearer $token'
              ..headers['Accept'] = 'application/json';
        if (data != null) {
          request.headers['Content-Type'] = 'application/json';
          request.body = jsonEncode(data);
        }
        final response = await _transport.send(request);
        final bytes = BytesBuilder(copy: false);
        var length = 0;
        await for (final chunk in response.stream) {
          length += chunk.length;
          if (length > 2 * 1024 * 1024) throw StateError(uncertain);
          bytes.add(chunk);
        }
        _owner();
        final dynamic value = jsonDecode(utf8.decode(bytes.takeBytes()));
        if (value is! Map<String, dynamic>) throw StateError(uncertain);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw StateError(
            value['error'] is String ? value['error'] as String : uncertain,
          );
        }
        return value;
      })().timeout(const Duration(seconds: 65));
    } on TimeoutException {
      throw StateError(uncertain);
    } on http.ClientException {
      throw StateError(uncertain);
    } on FormatException {
      throw StateError(uncertain);
    }
  }

  @override
  void dispose() => _transport.close();
}
