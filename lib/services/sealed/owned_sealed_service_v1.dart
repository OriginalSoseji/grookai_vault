import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'mtg_sealed_client_v1.dart';

const kSealedOwnershipEnabled = bool.fromEnvironment(
  'SEALED_OWNERSHIP_V1_ENABLED',
  defaultValue: false,
);

typedef SealedRpc =
    Future<dynamic> Function(String name, Map<String, dynamic> params);

String sealedPhotoPath(String owner, String instance, bool back) {
  final revision = List.generate(
    16,
    (_) => Random.secure().nextInt(256),
  ).map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '$owner/vault-instances/$instance/${back ? 'back' : 'front'}/revisions/$revision';
}

bool isSealedPhotoPath(String path, String owner, String instance, bool back) {
  final prefix = '$owner/vault-instances/$instance/${back ? 'back' : 'front'}/';
  return path.startsWith(prefix) &&
      RegExp(
        r'^(current|revisions/[a-f0-9]{32})$',
      ).hasMatch(path.substring(prefix.length));
}

class OwnedSealedCopy {
  OwnedSealedCopy.fromJson(Map<String, dynamic> json)
    : data = Map.unmodifiable(json) {
    if (json['object_kind'] != 'sealed' ||
        !RegExp(
          r'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$',
        ).hasMatch(text('instance_id')) ||
        !RegExp(
          r'^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$',
        ).hasMatch(text('sealed_product_variant_id')) ||
        text('gv_vi_id').isEmpty ||
        text('name').isEmpty) {
      throw const FormatException('Invalid sealed ownership identity');
    }
  }
  final Map<String, dynamic> data;
  String text(String key) => data[key]?.toString() ?? '';
  double? amount(String key) {
    final n = double.tryParse(text(key));
    return n != null && n.isFinite && n >= 0 ? n : null;
  }

  String get id => text('instance_id');
  String get name => text('name');
  String get identity => [
    name,
    text('package_form').replaceAll('_', ' '),
    text('language_code').toUpperCase(),
    text('region_code'),
    text('edition'),
    text('wave'),
  ].where((e) => e.isNotEmpty).join(' - ');
  List<String> get sectionIds =>
      (data['section_ids'] as List? ?? []).map((e) => e.toString()).toList();
}

class OwnedSealedTotals {
  OwnedSealedTotals.fromJson(Map<String, dynamic> json)
    : copies = (json['active_copy_count'] as num).toInt(),
      priced = (json['priced_copy_count'] as num).toInt(),
      unpriced = (json['unpriced_copy_count'] as num).toInt(),
      currencies = Map<String, dynamic>.from(
        json['totals_by_currency'] as Map,
      ) {
    if (copies < 0 ||
        priced < 0 ||
        unpriced < 0 ||
        priced + unpriced != copies ||
        [
          'active_copy_count',
          'priced_copy_count',
          'unpriced_copy_count',
        ].any((key) => json[key] != (json[key] as num).toInt()) ||
        currencies.entries.any(
          (e) =>
              !RegExp(r'^[A-Z]{3}$').hasMatch(e.key) ||
              e.value is! num ||
              !(e.value as num).isFinite ||
              (e.value as num) < 0,
        )) {
      throw const FormatException('Inconsistent sealed totals');
    }
  }
  final int copies, priced, unpriced;
  final Map<String, dynamic> currencies;
  double? get usd => double.tryParse(currencies['USD']?.toString() ?? '');
}

class OwnedSealedService {
  static final _additions = StreamController<String>.broadcast();
  static Stream<String> get additions => _additions.stream;
  static final _clients = Expando<OwnedSealedService>();
  static final Map<String, Future<Map<String, dynamic>>> _inFlight = {};
  static final List<Completer<void>> _imageWaiters = [];
  static int _imageRequests = 0;
  OwnedSealedService({required this.rpc, required this.userId});
  factory OwnedSealedService.supabase([SupabaseClient? client]) {
    final c = client ?? Supabase.instance.client;
    return _clients[c] ??= OwnedSealedService(
      rpc: (name, params) async => await c.rpc(name, params: params),
      userId: () => c.auth.currentUser?.id,
    );
  }
  final SealedRpc rpc;
  final String? Function() userId;

  String? _capabilityUser;
  DateTime? _capabilityUntil;
  Future<bool>? _capability;
  Future<bool> canAdd() async {
    final user = userId();
    if (user == null) return false;
    if (_capability == null ||
        _capabilityUser != user ||
        !_capabilityUntil!.isAfter(DateTime.now())) {
      _capabilityUser = user;
      _capabilityUntil = DateTime.now().add(const Duration(seconds: 30));
      _capability = rpc(
        'get_sealed_ownership_capabilities_v1',
        {},
      ).then((r) => r?['add_enabled'] == true).catchError((_) => false);
    }
    final allowed = await _capability!;
    return userId() == user && allowed;
  }

  Future<List<OwnedSealedCopy>> page({
    int offset = 0,
    String? ownerId,
    List<String>? ids,
    String? sectionId,
    String? query,
    bool wallOnly = false,
  }) async {
    if (userId() == null) return [];
    final result = await rpc(
      ids == null
          ? 'get_owned_sealed_inventory_v1'
          : 'get_owned_sealed_copies_v1',
      {
        'p_limit': 50,
        'p_offset': offset,
        'p_owner_id': ?ownerId,
        'p_instance_ids': ?ids,
        if (ids == null) ...{
          'p_section_id': sectionId,
          'p_query': query,
          'p_wall_only': wallOnly,
        },
      },
    );
    return (result as List)
        .map(
          (e) => OwnedSealedCopy.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
  }

  Future<OwnedSealedTotals> totals() async => OwnedSealedTotals.fromJson(
    Map<String, dynamic>.from(
      await rpc('get_owned_sealed_totals_v1', {}) as Map,
    ),
  );

  Future<List<Map<String, dynamic>>> history({int offset = 0}) async =>
      (await rpc('get_sealed_ownership_history_v1', {
                'p_limit': 50,
                'p_offset': offset,
              })
              as List)
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList();

  Future<String?> personalImage(
    OwnedSealedCopy copy, {
    bool back = false,
  }) async {
    final path = copy.text(
      back ? 'personal_back_image_url' : 'personal_image_url',
    );
    if (!isSealedPhotoPath(path, copy.text('owner_id'), copy.id, back)) {
      return null;
    }
    try {
      return await Supabase.instance.client.storage
          .from('user-card-images')
          .createSignedUrl(path, 3600);
    } catch (_) {
      return null;
    }
  }

  // Persist before calling the server. Retain the key on transport/readback failure.
  Future<Map<String, dynamic>> mutation(
    String operation,
    Map<String, dynamic> params, {
    Future<void> Function(Map<String, dynamic>)? verify,
  }) async {
    final key = jsonEncode([userId(), operation, params]);
    final existing = _inFlight[key];
    if (existing != null) return existing;
    final task = _performMutation(operation, params, verify: verify);
    _inFlight[key] = task;
    try {
      return await task;
    } finally {
      _inFlight.remove(key);
    }
  }

  Future<Map<String, dynamic>> _performMutation(
    String operation,
    Map<String, dynamic> params, {
    Future<void> Function(Map<String, dynamic>)? verify,
  }) async {
    final user = userId();
    if (user == null) throw StateError('Sign in to manage your Vault');
    final key =
        'sealed_request_v1:$user:${sha256.convert(utf8.encode(jsonEncode([operation, params])))}';
    final prefs = await SharedPreferences.getInstance();
    var request = prefs.getString(key);
    if (request == null) {
      final bytes = List<int>.generate(16, (_) => Random.secure().nextInt(256));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      final hex = bytes.map((e) => e.toRadixString(16).padLeft(2, '0')).join();
      request =
          '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
      if (!await prefs.setString(key, request)) {
        throw StateError('Could not preserve request');
      }
    }
    final result = Map<String, dynamic>.from(
      await rpc(operation, {...params, 'p_request_id': request}) as Map,
    );
    if (userId() != user) throw StateError('Account changed during request');
    if (verify != null) await verify(result);
    if (!await prefs.remove(key)) {
      throw StateError('Could not confirm request completion');
    }
    return result;
  }

  Future<void> add({
    required String variantId,
    required int quantity,
    required String seal,
    required String condition,
    String? acquisition,
    String currency = 'USD',
  }) async {
    final owner = userId();
    await mutation(
      'vault_add_sealed_copies_v1',
      {
        'p_variant_id': variantId,
        'p_quantity': quantity,
        'p_seal_state': seal,
        'p_package_condition': condition,
        'p_acquisition_cost': acquisition,
        'p_acquisition_currency': acquisition == null ? null : currency,
      },
      verify: (result) async {
        final ids = (result['instance_ids'] as List).cast<String>();
        if (result['created_count'] != quantity ||
            ids.length != quantity ||
            ids.toSet().length != quantity) {
          throw StateError('Copy count did not reconcile');
        }
        final found = <OwnedSealedCopy>[];
        for (var i = 0; i < ids.length; i += 50) {
          found.addAll(
            await page(ids: ids.sublist(i, min(i + 50, ids.length))),
          );
        }
        if (found.length != quantity ||
            found.map((r) => r.id).toSet().length != quantity ||
            found.any(
              (r) =>
                  !ids.contains(r.id) ||
                  r.text('sealed_product_variant_id') != variantId,
            )) {
          throw StateError(
            'Addition awaiting ownership readback. Retry to confirm.',
          );
        }
      },
    );
    if (owner != null && userId() == owner) _additions.add(owner);
  }

  Future<void> save(
    OwnedSealedCopy copy, {
    required String seal,
    required String condition,
    required String intent,
    String? asking,
    String currency = 'USD',
  }) async {
    await rpc('vault_update_sealed_copy_v1', {
      'p_instance_id': copy.id,
      'p_seal_state': seal,
      'p_package_condition': condition,
      'p_intent': intent,
      'p_asking_price': asking,
      'p_asking_currency': asking == null ? null : currency,
    });
    final rows = await page(ids: [copy.id]);
    if (rows.length != 1 ||
        rows.single.text('seal_state') != seal ||
        rows.single.text('package_condition') != condition ||
        rows.single.text('intent') != intent ||
        rows.single.amount('asking_price_amount') !=
            (asking == null ? null : double.parse(asking)) ||
        rows.single.text('asking_price_currency') !=
            (asking == null ? '' : currency)) {
      throw StateError('Settings awaiting readback');
    }
  }

  Future<void> disposeCopy(
    OwnedSealedCopy copy,
    String operation,
    Map<String, dynamic> details,
  ) async {
    await mutation(
      'vault_dispose_sealed_copy_v1',
      {'p_instance_id': copy.id, 'p_operation': operation, ...details},
      verify: (result) async {
        if (result['instance_id'] != copy.id ||
            result['operation'] != operation ||
            result['archived'] != true ||
            (await page(ids: [copy.id])).isNotEmpty) {
          throw StateError('Disposition awaiting readback');
        }
      },
    );
  }

  Future<String?> image(OwnedSealedCopy copy) async {
    final path = copy.text('image_object_path');
    if (path.isEmpty || !['mtg', 'pokemon'].contains(copy.text('game_key'))) {
      return null;
    }
    if (_imageRequests >= 6) {
      final waiting = Completer<void>();
      _imageWaiters.add(waiting);
      await waiting.future;
    } else {
      _imageRequests++;
    }
    try {
      return await SupabaseMtgSealedClientTransportV1(
        client: Supabase.instance.client,
        gameKey: copy.text('game_key'),
      ).createSignedImageUrl(
        bucket: copy.text('image_storage_bucket'),
        objectPath: path,
        expiresInSeconds: 3600,
      );
    } catch (_) {
      return null;
    } finally {
      if (_imageWaiters.isNotEmpty) {
        _imageWaiters.removeAt(0).complete();
      } else {
        _imageRequests--;
      }
    }
  }
}
