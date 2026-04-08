import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class VaultCardIdentity {
  const VaultCardIdentity({
    required this.cardId,
    required this.gvId,
    required this.name,
    required this.setName,
    this.number,
    this.imageUrl,
  });

  final String cardId;
  final String gvId;
  final String name;
  final String setName;
  final String? number;
  final String? imageUrl;

  factory VaultCardIdentity.fromJson(Map<String, dynamic> json) {
    final set = json['set'] as Map<String, dynamic>?;
    final setName = (set?['name'] ?? json['set_name'] ?? json['set_code'] ?? '')
        .toString();
    final imageUrl = (json['image_url'] ?? json['image_alt_url'])?.toString();
    return VaultCardIdentity(
      cardId: (json['id'] ?? '').toString(),
      gvId: (json['gv_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      setName: setName,
      number: json['number_plain']?.toString() ?? json['number']?.toString(),
      imageUrl: imageUrl == null || imageUrl.isEmpty ? null : imageUrl,
    );
  }
}

class WallCategoryOption {
  const WallCategoryOption({required this.value, required this.label});

  final String value;
  final String label;
}

const List<WallCategoryOption> kWallCategoryOptions = [
  WallCategoryOption(value: 'grails', label: 'Grails'),
  WallCategoryOption(value: 'favorites', label: 'Favorites'),
  WallCategoryOption(value: 'for_sale', label: 'For Sale'),
  WallCategoryOption(value: 'personal_collection', label: 'PC'),
  WallCategoryOption(value: 'trades', label: 'Trades'),
  WallCategoryOption(value: 'promos', label: 'Promos'),
  WallCategoryOption(value: 'psa', label: 'PSA'),
  WallCategoryOption(value: 'cgc', label: 'CGC'),
  WallCategoryOption(value: 'bgs', label: 'BGS'),
  WallCategoryOption(value: 'other', label: 'Other'),
];

String? normalizeWallCategory(String? value) {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'grails':
      return 'grails';
    case 'favorites':
      return 'favorites';
    case 'for_sale':
      return 'for_sale';
    case 'personal_collection':
      return 'personal_collection';
    case 'trades':
      return 'trades';
    case 'promos':
      return 'promos';
    case 'psa':
      return 'psa';
    case 'cgc':
      return 'cgc';
    case 'bgs':
      return 'bgs';
    case 'other':
      return 'other';
    default:
      return null;
  }
}

class VaultManageCardCopy {
  const VaultManageCardCopy({
    required this.instanceId,
    required this.conditionLabel,
    required this.intent,
    this.gvviId,
    this.note,
    this.createdAt,
    this.grader,
    this.grade,
    this.certNumber,
    this.isGraded = false,
  });

  final String instanceId;
  final String? gvviId;
  final String conditionLabel;
  final String intent;
  final String? note;
  final DateTime? createdAt;
  final String? grader;
  final String? grade;
  final String? certNumber;
  final bool isGraded;

  factory VaultManageCardCopy.fromJson(Map<String, dynamic> json) {
    final grader = _trimmedOrNull(json['grade_company']);
    final gradeValue = _trimmedOrNull(json['grade_value']);
    final gradeLabel = _trimmedOrNull(json['grade_label']);
    final certNumber =
        _trimmedOrNull(json['cert_number']) ??
        _trimmedOrNull(json['slab_cert_id']);
    final isGraded =
        grader != null ||
        gradeValue != null ||
        gradeLabel != null ||
        certNumber != null;

    return VaultManageCardCopy(
      instanceId: (json['id'] ?? '').toString(),
      gvviId: _trimmedOrNull(json['gv_vi_id']),
      conditionLabel: _trimmedOrNull(json['condition_label']) ?? 'NM',
      intent: _normalizeVaultIntent(json['intent']),
      note: _trimmedOrNull(json['notes']),
      createdAt: DateTime.tryParse((json['created_at'] ?? '').toString()),
      grader: grader,
      grade: gradeLabel ?? gradeValue,
      certNumber: certNumber,
      isGraded: isGraded,
    );
  }
}

class VaultManageCardData {
  const VaultManageCardData({
    required this.vaultItemId,
    required this.cardPrintId,
    required this.name,
    required this.setName,
    required this.totalCopies,
    required this.rawCount,
    required this.slabCount,
    required this.inPlayCount,
    required this.isShared,
    required this.publicProfileEnabled,
    required this.vaultSharingEnabled,
    required this.copies,
    this.gvId,
    this.setCode,
    this.number,
    this.rarity,
    this.imageUrl,
    this.wallCategory,
    this.publicNote,
    this.publicSlug,
  });

  final String vaultItemId;
  final String cardPrintId;
  final String? gvId;
  final String name;
  final String setName;
  final String? setCode;
  final String? number;
  final String? rarity;
  final String? imageUrl;
  final int totalCopies;
  final int rawCount;
  final int slabCount;
  final int inPlayCount;
  final bool isShared;
  final String? wallCategory;
  final String? publicNote;
  final String? publicSlug;
  final bool publicProfileEnabled;
  final bool vaultSharingEnabled;
  final List<VaultManageCardCopy> copies;

  bool get canViewWall =>
      isShared &&
      (publicSlug?.isNotEmpty ?? false) &&
      publicProfileEnabled &&
      vaultSharingEnabled;
}

class VaultSharedCardState {
  const VaultSharedCardState({
    required this.cardPrintId,
    required this.isShared,
    this.wallCategory,
    this.publicNote,
  });

  final String cardPrintId;
  final bool isShared;
  final String? wallCategory;
  final String? publicNote;
}

class VaultCardService {
  static const _canonicalSelect =
      'id,gv_id,name,set_code,number,number_plain,image_url,image_alt_url,set:sets(name,code)';
  static const _wallGuardMessage =
      'Enable your public profile and vault sharing before adding cards to your wall.';

  static Future<VaultCardIdentity> resolveCanonicalCard({
    required SupabaseClient client,
    required String cardId,
  }) async {
    final row = await client
        .from('card_prints')
        .select(_canonicalSelect)
        .eq('id', cardId)
        .maybeSingle();

    if (row == null) {
      throw Exception('Canonical card row not found for card_id=$cardId');
    }

    final identity = VaultCardIdentity.fromJson(Map<String, dynamic>.from(row));
    if (identity.gvId.isEmpty) {
      throw Exception('Canonical card row missing gv_id for card_id=$cardId');
    }

    return identity;
  }

  static Future<Map<String, int>> getOwnedCountsByCardPrintIds({
    required SupabaseClient client,
    required List<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedIds.isEmpty) {
      return const <String, int>{};
    }

    final response = await client.rpc(
      'vault_owned_counts_v1',
      params: {'p_card_print_ids': normalizedIds},
    );

    final counts = <String, int>{};
    if (response is! List) {
      return counts;
    }

    for (final row in response) {
      if (row is! Map<String, dynamic>) {
        continue;
      }

      final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
      final ownedCountRaw = row['owned_count'];
      final ownedCount = ownedCountRaw is num
          ? ownedCountRaw.toInt()
          : int.tryParse(ownedCountRaw?.toString() ?? '');

      if (cardPrintId.isEmpty || ownedCount == null) {
        continue;
      }

      counts[cardPrintId] = ownedCount;
    }

    return counts;
  }

  static Future<List<Map<String, dynamic>>> getCanonicalCollectorRows({
    required SupabaseClient client,
  }) async {
    final response = await client.rpc('vault_mobile_collector_rows_v1');

    if (response is! List) {
      return const <Map<String, dynamic>>[];
    }

    return response
        .whereType<Map<String, dynamic>>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  static Future<Map<String, VaultSharedCardState>>
  getSharedStatesByCardPrintIds({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      return const <String, VaultSharedCardState>{};
    }

    final normalizedIds = cardPrintIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedIds.isEmpty) {
      return const <String, VaultSharedCardState>{};
    }

    final response = await client
        .from('shared_cards')
        .select('card_id,is_shared,wall_category,public_note')
        .eq('user_id', userId)
        .inFilter('card_id', normalizedIds);

    final states = <String, VaultSharedCardState>{};
    for (final rawRow in response as List<dynamic>) {
      if (rawRow is! Map) {
        continue;
      }

      final row = Map<String, dynamic>.from(rawRow);

      final cardPrintId = _trimmedOrNull(row['card_id']);
      if (cardPrintId == null) {
        continue;
      }

      states[cardPrintId] = VaultSharedCardState(
        cardPrintId: cardPrintId,
        isShared: row['is_shared'] != false,
        wallCategory: normalizeWallCategory(row['wall_category']?.toString()),
        publicNote: _trimmedOrNull(row['public_note']),
      );
    }

    return states;
  }

  static Future<String> addOrIncrementVaultItem({
    required SupabaseClient client,
    required String userId,
    required String cardId,
    int deltaQty = 1,
    String conditionLabel = 'NM',
    String? notes,
    String? fallbackName,
    String? fallbackSetName,
    String? fallbackImageUrl,
  }) async {
    final qtyDelta = deltaQty < 1 ? 1 : deltaQty;
    debugPrint('vault.mobile.add.begin: $cardId');

    final result = await client.rpc(
      'vault_add_card_instance_v1',
      params: {
        'p_card_print_id': cardId,
        'p_quantity': qtyDelta,
        'p_condition_label': conditionLabel,
        'p_notes': notes,
        'p_name': fallbackName,
        'p_set_name': fallbackSetName,
        'p_photo_url': fallbackImageUrl,
      },
    );

    if (result is Map<String, dynamic>) {
      final gvviId = (result['gv_vi_id'] ?? '').toString();
      if (gvviId.isNotEmpty) {
        return gvviId;
      }
    }

    return '';
  }

  static Future<void> archiveOneVaultItem({
    required SupabaseClient client,
    required String userId,
    required String vaultItemId,
    required String cardId,
  }) async {
    debugPrint('vault.mobile.archive.begin: $cardId');
    await client.rpc(
      'vault_archive_one_instance_v1',
      params: {'p_vault_item_id': vaultItemId, 'p_card_print_id': cardId},
    );
  }

  static Future<void> archiveAllVaultItems({
    required SupabaseClient client,
    required String userId,
    required String vaultItemId,
    required String cardId,
  }) async {
    debugPrint('vault.mobile.archive.begin: $cardId');
    await client.rpc(
      'vault_archive_all_instances_v1',
      params: {'p_vault_item_id': vaultItemId, 'p_card_print_id': cardId},
    );
  }

  static Future<VaultManageCardData> loadManageCard({
    required SupabaseClient client,
    required String vaultItemId,
    required String cardPrintId,
    required int fallbackOwnedCount,
    String? fallbackGvviId,
    String? fallbackGvId,
    String? fallbackName,
    String? fallbackSetName,
    String? fallbackNumber,
    String? fallbackImageUrl,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      throw Exception('Sign in required.');
    }
    var copyRows = await _loadManageCardCopies(
      client: client,
      vaultItemId: vaultItemId,
      cardPrintId: cardPrintId,
    );
    if (copyRows.isEmpty && _trimmedOrNull(fallbackGvviId) != null) {
      final exactCopy = await _loadManageCardCopyByGvvi(
        client: client,
        gvviId: fallbackGvviId!,
      );
      if (exactCopy != null) {
        copyRows = [exactCopy];
      }
    }

    final responses = await Future.wait<dynamic>([
      client
          .from('card_prints')
          .select(_canonicalSelect)
          .eq('id', cardPrintId)
          .maybeSingle(),
      client
          .from('public_profiles')
          .select('slug,public_profile_enabled,vault_sharing_enabled')
          .eq('user_id', userId)
          .maybeSingle(),
    ]);

    final canonicalRow = responses[0] as Map<String, dynamic>?;
    final profileRow = responses[1] as Map<String, dynamic>?;

    final identity = canonicalRow == null
        ? null
        : VaultCardIdentity.fromJson(Map<String, dynamic>.from(canonicalRow));
    final resolvedGvId =
        _trimmedOrNull(identity?.gvId) ?? _trimmedOrNull(fallbackGvId);
    final sharedRow = await _loadSharedCardRow(
      client: client,
      userId: userId,
      cardPrintId: cardPrintId,
      gvId: resolvedGvId,
    );

    final totalCopies = copyRows.isNotEmpty
        ? copyRows.length
        : fallbackOwnedCount;
    final slabCount = copyRows.where((copy) => copy.isGraded).length;
    final rawCount = copyRows.isNotEmpty
        ? totalCopies - slabCount
        : fallbackOwnedCount;
    final inPlayCount = copyRows.where((copy) => copy.intent != 'hold').length;
    final setName =
        _trimmedOrNull(identity?.setName) ??
        _trimmedOrNull(fallbackSetName) ??
        'Unknown set';
    final number =
        _trimmedOrNull(identity?.number) ?? _trimmedOrNull(fallbackNumber);
    final imageUrl =
        _trimmedOrNull(identity?.imageUrl) ?? _trimmedOrNull(fallbackImageUrl);

    return VaultManageCardData(
      vaultItemId: vaultItemId,
      cardPrintId: cardPrintId,
      gvId: resolvedGvId,
      name:
          _trimmedOrNull(identity?.name) ??
          _trimmedOrNull(fallbackName) ??
          'Unknown card',
      setName: setName,
      setCode: _trimmedOrNull(canonicalRow?['set_code'])?.toUpperCase(),
      number: number,
      rarity: _trimmedOrNull(canonicalRow?['rarity']),
      imageUrl: imageUrl,
      totalCopies: totalCopies,
      rawCount: rawCount < 0 ? 0 : rawCount,
      slabCount: slabCount,
      inPlayCount: inPlayCount,
      isShared: sharedRow?['is_shared'] != false && sharedRow != null,
      wallCategory: normalizeWallCategory(
        sharedRow?['wall_category']?.toString(),
      ),
      publicNote: _trimmedOrNull(sharedRow?['public_note']),
      publicSlug: _trimmedOrNull(profileRow?['slug']),
      publicProfileEnabled: profileRow?['public_profile_enabled'] == true,
      vaultSharingEnabled: profileRow?['vault_sharing_enabled'] == true,
      copies: copyRows,
    );
  }

  static Future<bool> setSharedCardVisibility({
    required SupabaseClient client,
    required String cardPrintId,
    required String gvId,
    required bool nextShared,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      throw Exception('Sign in required.');
    }

    if (cardPrintId.trim().isEmpty || gvId.trim().isEmpty) {
      throw Exception('Vault card is missing canonical card identity.');
    }

    if (!nextShared) {
      await client
          .from('shared_cards')
          .delete()
          .eq('user_id', userId)
          .eq('card_id', cardPrintId);
      return false;
    }

    final profileRow = await client
        .from('public_profiles')
        .select('public_profile_enabled,vault_sharing_enabled')
        .eq('user_id', userId)
        .maybeSingle();

    if (profileRow == null ||
        profileRow['public_profile_enabled'] != true ||
        profileRow['vault_sharing_enabled'] != true) {
      throw Exception(_wallGuardMessage);
    }

    await client.from('shared_cards').upsert({
      'user_id': userId,
      'card_id': cardPrintId,
      'gv_id': gvId,
      'is_shared': true,
      'share_intent': 'shared',
    }, onConflict: 'user_id,card_id');

    return true;
  }

  static Future<String?> saveSharedCardWallCategory({
    required SupabaseClient client,
    required String cardPrintId,
    String? wallCategory,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final nextWallCategory = normalizeWallCategory(wallCategory);
    final rawWallCategory = (wallCategory ?? '').trim();
    if (rawWallCategory.isNotEmpty && nextWallCategory == null) {
      throw Exception('Invalid wall category.');
    }

    final sharedRow = await client
        .from('shared_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('card_id', cardPrintId)
        .maybeSingle();

    if (sharedRow == null) {
      throw Exception(
        'Add this card to your wall before assigning a category.',
      );
    }

    await client
        .from('shared_cards')
        .update({'wall_category': nextWallCategory})
        .eq('user_id', userId)
        .eq('card_id', cardPrintId);

    return nextWallCategory;
  }

  static Future<String?> saveSharedCardPublicNote({
    required SupabaseClient client,
    required String cardPrintId,
    required String note,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final sharedRow = await client
        .from('shared_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('card_id', cardPrintId)
        .maybeSingle();

    if (sharedRow == null) {
      throw Exception(
        'Add this card to your wall before adding a public note.',
      );
    }

    final nextPublicNote = _trimmedOrNull(note);
    await client
        .from('shared_cards')
        .update({'public_note': nextPublicNote})
        .eq('user_id', userId)
        .eq('card_id', cardPrintId);

    return nextPublicNote;
  }

  static Future<Map<String, dynamic>?> _loadSharedCardRow({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    required String? gvId,
  }) async {
    final byCardId = await client
        .from('shared_cards')
        .select('is_shared,wall_category,public_note')
        .eq('user_id', userId)
        .eq('card_id', cardPrintId)
        .maybeSingle();

    if (byCardId != null) {
      return Map<String, dynamic>.from(byCardId);
    }

    final normalizedGvId = _trimmedOrNull(gvId);
    if (normalizedGvId == null) {
      return null;
    }

    final byGvId = await client
        .from('shared_cards')
        .select('is_shared,wall_category,public_note')
        .eq('user_id', userId)
        .eq('gv_id', normalizedGvId)
        .maybeSingle();

    if (byGvId == null) {
      return null;
    }

    return Map<String, dynamic>.from(byGvId);
  }

  static Future<List<VaultManageCardCopy>> _loadManageCardCopies({
    required SupabaseClient client,
    required String vaultItemId,
    required String cardPrintId,
  }) async {
    final rawRows = await client.rpc(
      'vault_mobile_card_copies_v1',
      params: {
        'p_card_print_id': cardPrintId,
        'p_vault_item_id': _trimmedOrNull(vaultItemId),
      },
    );
    if (rawRows is! List || rawRows.isEmpty) {
      return const <VaultManageCardCopy>[];
    }

    return rawRows
        .whereType<Map>()
        .map(
          (row) => VaultManageCardCopy.fromJson(Map<String, dynamic>.from(row)),
        )
        .where((copy) => copy.instanceId.isNotEmpty)
        .toList();
  }

  static Future<VaultManageCardCopy?> _loadManageCardCopyByGvvi({
    required SupabaseClient client,
    required String gvviId,
  }) async {
    final normalizedGvviId = _trimmedOrNull(gvviId);
    if (normalizedGvviId == null) {
      return null;
    }

    final rawData = await client.rpc(
      'vault_mobile_instance_detail_v1',
      params: {'p_gv_vi_id': normalizedGvviId},
    );
    if (rawData == null) {
      return null;
    }

    final row = Map<String, dynamic>.from(rawData as Map);
    return VaultManageCardCopy.fromJson(row);
  }
}

String? _trimmedOrNull(dynamic value) {
  final normalized = value?.toString().trim() ?? '';
  return normalized.isEmpty ? null : normalized;
}

String _normalizeVaultIntent(dynamic value) {
  switch ((value ?? '').toString().trim().toLowerCase()) {
    case 'trade':
      return 'trade';
    case 'sell':
      return 'sell';
    case 'showcase':
      return 'showcase';
    default:
      return 'hold';
  }
}
