import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'dart:math';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../secrets.dart';

class StorefrontException implements Exception {
  const StorefrontException(this.message);
  final String message;
  @override
  String toString() => message;
}

class StorefrontData {
  StorefrontData.fromJson(Map<String, dynamic> json)
    : store = Map<String, dynamic>.from(json['store'] as Map),
      items = (json['items'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      sections = (json['sections'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      total = json['total'] as int,
      offset = json['offset'] as int,
      limit = json['limit'] as int,
      preview = json['preview'] == true {
    if (!{
      'VENDOR_STORE_V1',
      'VENDOR_STORE_V2',
    }.contains(json['schema_version'])) {
      throw const StorefrontException('Unsupported store response.');
    }
  }
  final Map<String, dynamic> store;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> sections;
  final int total;
  final int offset;
  final int limit;
  final bool preview;
  String get slug => store['slug'] as String;
}

class StoreOwnerData {
  StoreOwnerData.fromJson(Map<String, dynamic> json)
    : store = json['store'] is Map
          ? Map<String, dynamic>.from(json['store'] as Map)
          : null,
      capabilities = Map<String, dynamic>.from(json['capabilities'] as Map),
      rollout = Map<String, dynamic>.from(json['rollout'] as Map),
      sections = (json['sections'] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      inventory = json['inventory'] is Map
          ? StorefrontData.fromJson(
              Map<String, dynamic>.from(json['inventory'] as Map),
            )
          : null;
  final Map<String, dynamic>? store;
  final Map<String, dynamic> capabilities;
  final Map<String, dynamic> rollout;
  final List<Map<String, dynamic>> sections;
  final StorefrontData? inventory;
  bool get canEdit =>
      capabilities['store_app'] == true && rollout['app_enabled'] == true;
  bool get canPublishWeb =>
      canEdit &&
      capabilities['store_web'] == true &&
      rollout['web_enabled'] == true;
}

class StorefrontService extends ChangeNotifier {
  StorefrontService({
    http.Client? client,
    SupabaseClient? supabase,
    String? baseUrl,
    String? accessToken,
    String? ownerId,
    ({String? ownerId, String? token}) Function()? sessionReader,
    Stream<String?>? ownerChanges,
  }) : _http = client ?? http.Client(),
       _supabase = supabase,
       baseUrl = (baseUrl ?? grookaiWebBaseUrl).replaceFirst(
         RegExp(r'/+$'),
         '',
       ),
       _tokenOverride = accessToken,
       _ownerOverride = ownerId,
       _sessionReader = sessionReader,
       _ownerChanges = ownerChanges;
  final http.Client _http;
  final SupabaseClient? _supabase;
  final String? _tokenOverride, _ownerOverride;
  final ({String? ownerId, String? token}) Function()? _sessionReader;
  final Stream<String?>? _ownerChanges;
  StreamSubscription<String?>? _ownerSubscription;
  String? _boundOwner;
  bool _bound = false, _closed = false, _disposed = false;
  bool get ownerClosed => _closed || _disposed;
  bool get hasSession => _session.token != null;
  ({String? ownerId, String? token}) get _session {
    if (_sessionReader != null) return _sessionReader();
    if (_tokenOverride != null) {
      return (ownerId: _ownerOverride, token: _tokenOverride);
    }
    try {
      final session = _client.auth.currentSession;
      return (ownerId: session?.user.id, token: session?.accessToken);
    } catch (_) {
      return (ownerId: null, token: null);
    }
  }

  void _closeOwner() {
    if (ownerClosed) return;
    _closed = true;
    notifyListeners();
  }

  /// Bind once for this workspace, including all pushed editors and previews.
  /// Returning to the same account does not revive a closed workspace.
  void bindOwner() {
    if (_bound || ownerClosed) return;
    _bound = true;
    _boundOwner = _session.ownerId;
    if (_boundOwner == null || _session.token == null) {
      _closeOwner();
      return;
    }
    Stream<String?>? changes = _ownerChanges;
    if (changes == null && _sessionReader == null && _tokenOverride == null) {
      changes = _client.auth.onAuthStateChange.map((e) => e.session?.user.id);
    }
    _ownerSubscription = changes?.listen((id) {
      if (id != _boundOwner) _closeOwner();
    }, onError: (Object _) => _closeOwner());
  }

  void assertOwner() {
    bindOwner();
    final session = _session;
    if (ownerClosed ||
        session.ownerId != _boundOwner ||
        session.token == null) {
      _closeOwner();
      throw const StorefrontException(
        'Your account changed. Reopen Store to continue.',
      );
    }
  }

  Map<String, String> _privateHeaders() {
    assertOwner();
    // One synchronous capture, before any request or SDK await.
    return {
      'accept': 'application/json',
      'authorization': 'Bearer ${_session.token}',
    };
  }

  final String baseUrl;
  SupabaseClient get _client => _supabase ?? Supabase.instance.client;
  String? get _token => _session.token;
  Map<String, String> get headers => _bound
      ? _privateHeaders()
      : {
          'accept': 'application/json',
          if (_token != null) 'authorization': 'Bearer $_token',
        };
  Uri uri(String path, [Map<String, String> query = const {}]) => Uri.parse(
    '$baseUrl$path',
  ).replace(queryParameters: query.isEmpty ? null : query);

  Future<Map<String, dynamic>> _get(
    String path,
    Map<String, String> query,
  ) async {
    final private =
        path.startsWith('/api/stores/owner') ||
        path.contains('/preview') ||
        path.contains('/app');
    final requestHeaders = private ? _privateHeaders() : headers;
    final response = await _http
        .get(uri(path, query), headers: requestHeaders)
        .timeout(const Duration(seconds: 20));
    if (private) assertOwner();
    if (response.statusCode == 401) {
      if (private) _closeOwner();
      throw const StorefrontException('Sign in to manage or visit this store.');
    }
    if (response.statusCode == 404) {
      throw const StorefrontException('This store is not available.');
    }
    if (response.statusCode != 200) {
      throw const StorefrontException(
        'Store could not be loaded. Please retry.',
      );
    }
    return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
  }

  Future<StoreOwnerData> owner({
    String query = '',
    String kind = 'all',
    String condition = '',
    String section = '',
    int offset = 0,
  }) async {
    final data = await _get('/api/stores/owner', {
      'q': query,
      'kind': kind,
      'condition': condition,
      'section': section,
      'offset': '$offset',
    });
    assertOwner();
    if (data['actorId'] != _boundOwner) {
      _closeOwner();
      throw const StorefrontException('Store account could not be verified.');
    }
    return StoreOwnerData.fromJson(data);
  }

  Future<StorefrontData> read(
    String slug, {
    bool preview = false,
    String query = '',
    String kind = 'all',
    String condition = '',
    String section = '',
    int offset = 0,
  }) async {
    final suffix = preview
        ? '/preview'
        : _token == null
        ? ''
        : '/app';
    return StorefrontData.fromJson(
      await _get('/api/stores/${Uri.encodeComponent(slug)}$suffix', {
        'q': query,
        'kind': kind,
        'condition': condition,
        'section': section,
        'offset': '$offset',
      }),
    );
  }

  Future<void> change(Map<String, dynamic> action) async {
    final response = await _http
        .post(
          uri('/api/stores/owner'),
          headers: {..._privateHeaders(), 'content-type': 'application/json'},
          body: jsonEncode(action),
        )
        .timeout(const Duration(seconds: 20));
    assertOwner();
    if (response.statusCode == 401) _closeOwner();
    if (response.statusCode == 403) {
      throw const StorefrontException(
        'Your package does not allow this store action.',
      );
    }
    if (response.statusCode != 200) {
      throw const StorefrontException(
        'Change was not saved. Check eligibility, sharing settings, and store details.',
      );
    }
  }

  Future<Map<String, dynamic>> customProducts({String? id, int offset = 0}) =>
      _get('/api/stores/owner/products', {'offset': '$offset', 'id': ?id});

  Future<Map<String, dynamic>> changeProduct(
    Map<String, dynamic>? product,
    String action, [
    Map<String, dynamic> data = const {},
  ]) async {
    final response = await _http
        .post(
          uri('/api/stores/owner/products'),
          headers: {..._privateHeaders(), 'content-type': 'application/json'},
          body: jsonEncode({
            'id': product?['id'],
            'version': product?['version'],
            'action': action,
            'data': data,
          }),
        )
        .timeout(const Duration(seconds: 20));
    assertOwner();
    if (response.statusCode == 401) _closeOwner();
    if (response.statusCode == 409) {
      throw const StorefrontException(
        'Product changed elsewhere. Reload before saving; your unsaved text is still here.',
      );
    }
    if (response.statusCode != 200) {
      throw const StorefrontException(
        'Change not saved. Check fields, package access and publication requirements.',
      );
    }
    return Map<String, dynamic>.from(
      (jsonDecode(response.body)['products'] as List).first as Map,
    );
  }

  String _productPath(String slug, String id, bool preview) =>
      '/api/stores/${Uri.encodeComponent(slug)}${preview
          ? '/preview'
          : _token == null
          ? ''
          : '/app'}/products/${Uri.encodeComponent(id)}';
  Future<Map<String, dynamic>> product(
    String slug,
    String id, {
    bool preview = false,
  }) => _get(_productPath(slug, id, preview), {});
  String productMediaUrl(
    String slug,
    String id,
    String photo, {
    bool preview = false,
  }) => uri(
    '${_productPath(slug, id, preview)}/media/${Uri.encodeComponent(photo)}',
  ).toString();

  Future<void> uploadMedia(String storeId, String kind, Uint8List bytes) async {
    if (!{'logo', 'banner'}.contains(kind)) {
      throw const StorefrontException('Invalid branding type.');
    }
    final path = await _upload('$storeId/$kind', bytes);
    await change({'action': 'media', 'kind': kind, 'path': path});
  }

  Future<String> uploadProductPhoto(
    String storeId,
    String productId,
    Uint8List bytes,
  ) => _upload('$storeId/products/$productId', bytes);

  Future<String> _upload(String prefix, Uint8List bytes) async {
    if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
      throw const StorefrontException(
        'Choose a JPEG, PNG, or WebP image up to 5 MB.',
      );
    }
    final png =
        bytes.length >= 8 &&
        bytes[0] == 137 &&
        bytes[1] == 80 &&
        bytes[2] == 78 &&
        bytes[3] == 71;
    final jpg =
        bytes.length >= 3 &&
        bytes[0] == 255 &&
        bytes[1] == 216 &&
        bytes[2] == 255;
    final webp =
        bytes.length >= 12 &&
        ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF' &&
        ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP';
    if (!png && !jpg && !webp) {
      throw const StorefrontException('Choose a JPEG, PNG, or WebP image.');
    }
    final capturedHeaders = _privateHeaders();
    // Storage grants validate both the store owner and immutable object path.
    final random = Random.secure();
    final idBytes = List<int>.generate(16, (_) => random.nextInt(256));
    idBytes[6] = (idBytes[6] & 15) | 64;
    idBytes[8] = (idBytes[8] & 63) | 128;
    final hex = idBytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    final id =
        '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
    final extension = png
        ? 'png'
        : jpg
        ? 'jpg'
        : 'webp';
    final path = '$prefix/$id.$extension';
    await _client.storage
        .from('vendor-store-media')
        .uploadBinary(
          path,
          bytes,
          retryAttempts: 0,
          fileOptions: FileOptions(
            headers: {'Authorization': capturedHeaders['authorization']!},
            contentType: png
                ? 'image/png'
                : jpg
                ? 'image/jpeg'
                : 'image/webp',
          ),
        );
    assertOwner();
    return path;
  }

  String mediaUrl(String slug, String kind, {bool preview = false}) => uri(
    '/api/stores/${Uri.encodeComponent(slug)}${preview
        ? '/preview'
        : _token != null
        ? '/app'
        : ''}/media/$kind',
  ).toString();
  @override
  void dispose() {
    if (_disposed) return;
    _closeOwner();
    _disposed = true;
    _ownerSubscription?.cancel();
    _http.close();
    super.dispose();
  }
}
