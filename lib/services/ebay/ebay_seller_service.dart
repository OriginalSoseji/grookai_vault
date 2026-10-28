import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

abstract interface class EbaySellerApi {
  String get ownerId;
  Future<Map<String, dynamic>> workspace({String? instanceId});
  Future<Map<String, dynamic>> draft(String draftId);
  Future<Map<String, dynamic>> call(
    String action,
    Map<String, dynamic> payload,
  );
  Future<void> uploadPhoto({
    required String draftId,
    required String photoId,
    required String path,
    required Uint8List bytes,
    required String contentType,
  });
  Future<String?> photoPreview(String path);
  void dispose();
}

/// Native transport only. Verified ownership, conditions, fees, reservations
/// and listing transitions belong to the shared server workflow.
class EbaySellerService implements EbaySellerApi {
  EbaySellerService(
    this.client, {
    required this.ownerId,
    http.Client? transport,
  }) : _transport = transport ?? http.Client();

  final SupabaseClient client;
  @override
  final String ownerId;
  final http.Client _transport;
  static final _uuid = RegExp(r'^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$');
  static final _endpoint = Uri.parse(
    'https://grookaivault.com/api/ebay/seller',
  );
  static const uncertainMessage =
      'Connection interrupted. Your draft or operation may already be saved. '
      'Refresh its status before trying again.';

  void _requireOwner() {
    if (ownerId.isEmpty || client.auth.currentUser?.id != ownerId) {
      throw StateError('Sign in to the same grookai account to continue.');
    }
  }

  Future<Map<String, dynamic>> _request(
    Uri uri, [
    Map<String, dynamic>? body,
  ]) async {
    _requireOwner();
    final token = client.auth.currentSession?.accessToken;
    if (token == null || token.isEmpty) {
      throw StateError('Sign in to your grookai account to continue.');
    }
    Future<Map<String, dynamic>> send() async {
      final request = http.Request(body == null ? 'GET' : 'POST', uri)
        ..followRedirects = false
        ..headers['Authorization'] = 'Bearer $token'
        ..headers['Accept'] = 'application/json';
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      final response = await _transport.send(request);
      // Metadata includes the complete card-aspect dictionary plus policies.
      // Keep the larger envelope confined to that authenticated read action.
      final maxBytes = body?['action'] == 'metadata'
          ? 8 * 1024 * 1024
          : 2 * 1024 * 1024;
      final bytes = BytesBuilder(copy: false);
      var size = 0;
      await for (final chunk in response.stream) {
        size += chunk.length;
        if (size > maxBytes) throw StateError(uncertainMessage);
        bytes.add(chunk);
      }
      _requireOwner();
      dynamic result;
      try {
        result = jsonDecode(utf8.decode(bytes.takeBytes()));
      } catch (_) {
        throw StateError(uncertainMessage);
      }
      if (response.statusCode == 401) {
        throw StateError('Sign in to your grookai account to continue.');
      }
      if (result is! Map<String, dynamic>) throw StateError(uncertainMessage);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = result['error'];
        throw StateError(
          message is String && message.isNotEmpty && message.length <= 600
              ? message
              : uncertainMessage,
        );
      }
      return result;
    }

    try {
      // Never retry a mutation here. Its owner-local request ID and the server
      // receipt own recovery when the connection or acknowledgement is lost.
      return await send().timeout(const Duration(seconds: 75));
    } on TimeoutException {
      throw StateError(uncertainMessage);
    } on http.ClientException {
      throw StateError(uncertainMessage);
    }
  }

  @override
  Future<Map<String, dynamic>> workspace({String? instanceId}) => _request(
    _endpoint.replace(
      queryParameters: instanceId == null ? null : {'instanceId': instanceId},
    ),
  );

  @override
  Future<Map<String, dynamic>> draft(String draftId) async {
    final response = await _request(
      _endpoint.replace(queryParameters: {'draftId': draftId}),
    );
    if (response['draft'] is! Map) throw StateError(uncertainMessage);
    return Map<String, dynamic>.from(response['draft'] as Map);
  }

  @override
  Future<Map<String, dynamic>> call(
    String action,
    Map<String, dynamic> payload,
  ) => _request(_endpoint, {...payload, 'action': action});

  @override
  Future<void> uploadPhoto({
    required String draftId,
    required String photoId,
    required String path,
    required Uint8List bytes,
    required String contentType,
  }) async {
    _requireOwner();
    if (!_uuid.hasMatch(draftId) ||
        !_uuid.hasMatch(photoId) ||
        path != '$ownerId/$draftId/$photoId.jpg' ||
        !['image/jpeg', 'image/png'].contains(contentType) ||
        bytes.isEmpty ||
        bytes.length > 16 * 1024 * 1024) {
      throw StateError('Choose a JPEG or PNG photo up to 16 MB.');
    }
    try {
      await client.storage
          .from('ebay-listing-private')
          .uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: contentType, upsert: true),
          );
    } catch (_) {
      throw StateError(
        'Photo upload is unconfirmed. Keep the same photo and retry its upload.',
      );
    }
    _requireOwner();
  }

  @override
  Future<String?> photoPreview(String path) async {
    _requireOwner();
    final parts = path.split('/');
    if (parts.length != 3 ||
        parts[0] != ownerId ||
        !_uuid.hasMatch(parts[1]) ||
        !parts[2].endsWith('.jpg') ||
        !_uuid.hasMatch(parts[2].substring(0, parts[2].length - 4))) {
      return null;
    }
    try {
      final result = await client.storage
          .from('ebay-listing-private')
          .createSignedUrl(path, 120);
      _requireOwner();
      return result;
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() => _transport.close();
}
