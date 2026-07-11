import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../utils/display_image_contract.dart';
import '../identity/canon_image_url_service.dart';
import '../network/intent_presentation.dart' as intent_presentation;

class _InterestGraphCompletionSnapshot {
  const _InterestGraphCompletionSnapshot({
    required this.subjectType,
    required this.subjectId,
    required this.completionPercent,
  });

  final String subjectType;
  final String subjectId;
  final int completionPercent;
}

class VaultCardIdentity {
  const VaultCardIdentity({
    required this.cardId,
    required this.gvId,
    required this.name,
    required this.setName,
    this.number,
    this.imageUrl,
    this.canonicalImageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
  });

  final String cardId;
  final String gvId;
  final String name;
  final String setName;
  final String? number;
  final String? imageUrl;
  final String? canonicalImageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;

  factory VaultCardIdentity.fromJson(Map<String, dynamic> json) {
    final set = json['set'] as Map<String, dynamic>?;
    final setName = (set?['name'] ?? json['set_name'] ?? json['set_code'] ?? '')
        .toString();
    final imageUrl = _cardDisplayImageUrl(json);
    return VaultCardIdentity(
      cardId: (json['id'] ?? '').toString(),
      gvId: (json['gv_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      setName: setName,
      number: json['number_plain']?.toString() ?? json['number']?.toString(),
      imageUrl: imageUrl,
      canonicalImageUrl: _trimmedOrNull(json['image_url']),
      representativeImageUrl: _trimmedOrNull(json['representative_image_url']),
      imageStatus: _trimmedOrNull(json['image_status']),
      imageNote: _trimmedOrNull(json['image_note']),
      variantKey: _trimmedOrNull(json['variant_key']),
      printedIdentityModifier: _trimmedOrNull(
        json['printed_identity_modifier'],
      ),
      setIdentityModel: _trimmedOrNull(set?['identity_model']),
    );
  }
}

class WallCategoryOption {
  const WallCategoryOption({required this.value, required this.label});

  final String value;
  final String label;
}

class VaultIntentOption {
  const VaultIntentOption({
    required this.value,
    required this.label,
    required this.discoverable,
  });

  final String value;
  final String label;
  final bool discoverable;
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

const List<VaultIntentOption> kVaultIntentOptions = [
  VaultIntentOption(value: 'hold', label: 'Hold', discoverable: false),
  VaultIntentOption(value: 'trade', label: 'Trade', discoverable: true),
  VaultIntentOption(value: 'sell', label: 'Sell', discoverable: true),
  VaultIntentOption(value: 'showcase', label: 'Showcase', discoverable: true),
];

enum SharedCardPriceDisplayMode { grookai, myPrice, hidden }

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

String? normalizeSharedCardPriceDisplayMode(dynamic value) {
  switch ((value ?? '').toString().trim().toLowerCase()) {
    case 'grookai':
      return 'grookai';
    case 'my_price':
      return 'my_price';
    case 'hidden':
      return 'hidden';
    default:
      return null;
  }
}

String normalizeVaultIntentValue(dynamic value) {
  return intent_presentation.normalizeVaultIntentValue(value);
}

String? normalizeDiscoverableVaultIntentValue(dynamic value) {
  return intent_presentation.normalizeDiscoverableVaultIntentValue(value);
}

String getVaultIntentLabel(String? intent) {
  return intent_presentation.getVaultIntentLabel(intent);
}

class VaultManageCardPricing {
  const VaultManageCardPricing({
    this.askingPriceAmount,
    this.askingPriceCurrency,
  });

  final double? askingPriceAmount;
  final String? askingPriceCurrency;
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

  VaultManageCardCopy copyWith({String? intent}) {
    return VaultManageCardCopy(
      instanceId: instanceId,
      gvviId: gvviId,
      conditionLabel: conditionLabel,
      intent: intent ?? this.intent,
      note: note,
      createdAt: createdAt,
      grader: grader,
      grade: grade,
      certNumber: certNumber,
      isGraded: isGraded,
    );
  }

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
      intent: normalizeVaultIntentValue(json['intent']),
      note: _trimmedOrNull(json['notes']),
      createdAt: DateTime.tryParse((json['created_at'] ?? '').toString()),
      grader: grader,
      grade: gradeLabel ?? gradeValue,
      certNumber: certNumber,
      isGraded: isGraded,
    );
  }
}

class VaultManageCopySectionMembership {
  const VaultManageCopySectionMembership({
    required this.id,
    required this.name,
    required this.position,
    required this.isMember,
  });

  final String id;
  final String name;
  final int position;
  final bool isMember;

  VaultManageCopySectionMembership copyWith({bool? isMember}) {
    return VaultManageCopySectionMembership(
      id: id,
      name: name,
      position: position,
      isMember: isMember ?? this.isMember,
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
    required this.intent,
    required this.isShared,
    required this.publicProfileEnabled,
    required this.vaultSharingEnabled,
    required this.copies,
    this.gvId,
    this.setCode,
    this.number,
    this.rarity,
    this.imageUrl,
    this.canonicalImageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
    this.wallCategory,
    this.publicNote,
    this.publicSlug,
    this.priceDisplayMode,
    this.primarySharedGvviId,
    this.askingPriceAmount,
    this.askingPriceCurrency,
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
  final String? canonicalImageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final int totalCopies;
  final int rawCount;
  final int slabCount;
  final int inPlayCount;
  final String intent;
  final bool isShared;
  final String? wallCategory;
  final String? publicNote;
  final String? publicSlug;
  final String? priceDisplayMode;
  final String? primarySharedGvviId;
  final double? askingPriceAmount;
  final String? askingPriceCurrency;
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

class VaultOwnedCopyTarget {
  const VaultOwnedCopyTarget({
    required this.instanceId,
    required this.gvviId,
    required this.vaultItemId,
    required this.cardPrintId,
    this.createdAt,
  });

  final String instanceId;
  final String gvviId;
  final String vaultItemId;
  final String cardPrintId;
  final DateTime? createdAt;
}

class VaultOwnedCardAnchor {
  const VaultOwnedCardAnchor({
    required this.vaultItemId,
    required this.cardPrintId,
  });

  final String vaultItemId;
  final String cardPrintId;
}

class VaultCardService {
  static const _canonicalSelect =
      'id,gv_id,name,set_code,number,number_plain,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,set:sets(name,code,identity_model)';
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

    final enriched = await CanonImageUrlService.enrichRows([
      Map<String, dynamic>.from(row),
    ]);
    final identity = VaultCardIdentity.fromJson(enriched.first);
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
    String? cardPrintingId,
  }) async {
    final qtyDelta = deltaQty < 1 ? 1 : deltaQty;
    debugPrint('vault.mobile.add.begin: $cardId');
    final completionBefore = await _fetchInterestGraphCompletionSnapshot(
      client: client,
      userId: userId,
      cardPrintId: cardId,
    );

    final response = await client.functions.invoke(
      'vault-add-card-instance-v1',
      body: {
        'card_print_id': cardId,
        'quantity': qtyDelta,
        'condition_label': conditionLabel,
        'notes': notes,
        'name': fallbackName,
        'set_name': fallbackSetName,
        'photo_url': fallbackImageUrl,
        if (_trimmedOrNull(cardPrintingId) != null)
          'card_printing_id': _trimmedOrNull(cardPrintingId),
      },
    );

    if (response.status < 200 || response.status >= 300) {
      throw Exception('Vault add failed.');
    }

    final responseData = response.data;
    final result = responseData is Map
        ? Map<String, dynamic>.from(
            (responseData['result'] is Map
                    ? responseData['result']
                    : responseData)
                as Map,
          )
        : null;

    if (result is Map<String, dynamic>) {
      final gvviId = (result['gv_vi_id'] ?? '').toString();
      if (gvviId.isNotEmpty) {
        await _emitInterestGraphCompletionCrossings(
          client: client,
          userId: userId,
          cardPrintId: cardId,
          previous: completionBefore,
        );
        return gvviId;
      }
    }

    await _emitInterestGraphCompletionCrossings(
      client: client,
      userId: userId,
      cardPrintId: cardId,
      previous: completionBefore,
    );
    return '';
  }

  static Future<Map<String, _InterestGraphCompletionSnapshot>>
  _fetchInterestGraphCompletionSnapshot({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
  }) async {
    try {
      final raw = await client.rpc(
        'interest_graph_completion_snapshot_for_card_v1',
        params: {'p_user_id': userId, 'p_card_print_id': cardPrintId},
      );
      if (raw is! List) {
        return const <String, _InterestGraphCompletionSnapshot>{};
      }

      final snapshots = <String, _InterestGraphCompletionSnapshot>{};
      for (final item in raw) {
        if (item is! Map) continue;
        final row = Map<String, dynamic>.from(item);
        final subjectType = _trimmedOrNull(row['subject_type']);
        final subjectId = _trimmedOrNull(row['subject_id']);
        final percentRaw = row['completion_percent'];
        final percent = percentRaw is num
            ? percentRaw.toInt()
            : int.tryParse(percentRaw?.toString() ?? '');
        if (subjectType == null || subjectId == null || percent == null) {
          continue;
        }
        snapshots['$subjectType:$subjectId'] = _InterestGraphCompletionSnapshot(
          subjectType: subjectType,
          subjectId: subjectId,
          completionPercent: percent.clamp(0, 100),
        );
      }
      return snapshots;
    } catch (error) {
      debugPrint('interest_graph.completion_snapshot.failed: $error');
      return const <String, _InterestGraphCompletionSnapshot>{};
    }
  }

  static Future<void> _emitInterestGraphCompletionCrossings({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    required Map<String, _InterestGraphCompletionSnapshot> previous,
  }) async {
    try {
      final next = await _fetchInterestGraphCompletionSnapshot(
        client: client,
        userId: userId,
        cardPrintId: cardPrintId,
      );
      for (final entry in next.entries) {
        final priorPercent = previous[entry.key]?.completionPercent ?? 0;
        final nextSnapshot = entry.value;
        if (nextSnapshot.completionPercent <= priorPercent) continue;
        await client.rpc(
          'card_events_emit_completion_crossings_v1',
          params: {
            'p_user_id': userId,
            'p_subject_type': nextSnapshot.subjectType,
            'p_subject_id': nextSnapshot.subjectId,
            'p_previous_percent': priorPercent,
            'p_next_percent': nextSnapshot.completionPercent,
            'p_payload': {'card_print_id': cardPrintId, 'source': 'vault_add'},
          },
        );
      }
    } catch (error) {
      debugPrint('interest_graph.completion_crossing.failed: $error');
    }
  }

  static Future<VaultOwnedCopyTarget?> resolveLatestOwnedCopyTarget({
    required SupabaseClient client,
    required String cardPrintId,
  }) async {
    final userId = client.auth.currentUser?.id;
    final anchor = await resolveOwnedCardAnchor(
      client: client,
      cardPrintId: cardPrintId,
    );
    if (anchor == null || userId == null || userId.isEmpty) {
      return null;
    }

    final copies = await _loadManageCardCopies(
      client: client,
      vaultItemId: anchor.vaultItemId,
      cardPrintId: anchor.cardPrintId,
    );
    final fromCopies = _resolveOwnedTargetFromCopies(
      anchor: anchor,
      copies: copies,
    );
    if (fromCopies != null) {
      return fromCopies;
    }

    final fromCollectorRow = await _resolveOwnedTargetFromCollectorRow(
      client: client,
      anchor: anchor,
    );
    if (fromCollectorRow != null) {
      return fromCollectorRow;
    }

    final sharedGvviId = await _resolvePrimarySharedGvvi(
      client: client,
      ownerUserId: userId,
      cardPrintId: anchor.cardPrintId,
      copies: copies,
    );
    if (sharedGvviId != null) {
      return _resolveOwnedTargetFromGvvi(
        client: client,
        anchor: anchor,
        gvviId: sharedGvviId,
      );
    }

    return null;
  }

  static Future<VaultOwnedCardAnchor?> resolveOwnedCardAnchor({
    required SupabaseClient client,
    required String cardPrintId,
  }) async {
    final userId = client.auth.currentUser?.id;
    final normalizedCardPrintId = _trimmedOrNull(cardPrintId);
    if (userId == null || userId.isEmpty || normalizedCardPrintId == null) {
      return null;
    }

    final anchorRaw = await client.rpc(
      'resolve_active_vault_anchor_v1',
      params: {
        'p_user_id': userId,
        'p_card_print_id': normalizedCardPrintId,
        'p_create_if_missing': false,
      },
    );

    if (anchorRaw == null) {
      return null;
    }

    final anchor = Map<String, dynamic>.from(anchorRaw as Map);
    final vaultItemId = _trimmedOrNull(anchor['id']);
    if (vaultItemId == null) {
      return null;
    }

    return VaultOwnedCardAnchor(
      vaultItemId: vaultItemId,
      cardPrintId: normalizedCardPrintId,
    );
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
      params: {
        'p_vault_item_id': _trimmedOrNull(vaultItemId),
        'p_card_print_id': cardId,
      },
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
      params: {
        'p_vault_item_id': _trimmedOrNull(vaultItemId),
        'p_card_print_id': cardId,
      },
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

    final rawCanonicalRow = responses[0] as Map<String, dynamic>?;
    final canonicalRow = rawCanonicalRow == null
        ? null
        : (await CanonImageUrlService.enrichRows([
            Map<String, dynamic>.from(rawCanonicalRow),
          ])).first;
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
    final primarySharedGvviId = await _resolvePrimarySharedGvvi(
      client: client,
      ownerUserId: userId,
      cardPrintId: cardPrintId,
      copies: copyRows,
      fallbackGvviId: fallbackGvviId,
    );
    final pricing = await _loadPrivateInstancePricing(
      client: client,
      userId: userId,
      gvviId: primarySharedGvviId,
    );

    final totalCopies = copyRows.isNotEmpty
        ? copyRows.length
        : fallbackOwnedCount;
    final slabCount = copyRows.where((copy) => copy.isGraded).length;
    final rawCount = copyRows.isNotEmpty
        ? totalCopies - slabCount
        : fallbackOwnedCount;
    final inPlayCount = copyRows.where((copy) => copy.intent != 'hold').length;
    final resolvedIntent = _deriveManageCardIntent(copies: copyRows);
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
      canonicalImageUrl: _trimmedOrNull(identity?.canonicalImageUrl),
      representativeImageUrl: _trimmedOrNull(identity?.representativeImageUrl),
      imageStatus: _trimmedOrNull(identity?.imageStatus),
      imageNote: _trimmedOrNull(identity?.imageNote),
      variantKey: _trimmedOrNull(identity?.variantKey),
      printedIdentityModifier: _trimmedOrNull(
        identity?.printedIdentityModifier,
      ),
      setIdentityModel: _trimmedOrNull(identity?.setIdentityModel),
      totalCopies: totalCopies,
      rawCount: rawCount < 0 ? 0 : rawCount,
      slabCount: slabCount,
      inPlayCount: inPlayCount,
      intent: resolvedIntent,
      isShared: sharedRow?['is_shared'] != false && sharedRow != null,
      wallCategory: normalizeWallCategory(
        sharedRow?['wall_category']?.toString(),
      ),
      publicNote: _trimmedOrNull(sharedRow?['public_note']),
      publicSlug: _trimmedOrNull(profileRow?['slug']),
      priceDisplayMode: normalizeSharedCardPriceDisplayMode(
        sharedRow?['price_display_mode'],
      ),
      primarySharedGvviId: primarySharedGvviId,
      askingPriceAmount: pricing?.askingPriceAmount,
      askingPriceCurrency: pricing?.askingPriceCurrency,
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
      // LOCK: shared_cards.share_intent is wall compatibility only.
      // LOCK: Public intent authority is vault_item_instances.intent.
      'share_intent': 'shared',
    }, onConflict: 'user_id,card_id');

    return true;
  }

  static Future<String> saveVaultItemInstanceIntent({
    required SupabaseClient client,
    required String instanceId,
    required String intent,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final normalizedInstanceId = _trimmedOrNull(instanceId);
    if (normalizedInstanceId == null) {
      throw Exception('Vault copy is missing exact identity.');
    }

    final nextIntent = normalizeVaultIntentValue(intent);
    // LOCK: Copy intent authority is exact-copy level.
    // LOCK: Do not write grouped vault_items or shared_cards from copy rows.
    final row = await client
        .from('vault_item_instances')
        .update({'intent': nextIntent})
        .eq('id', normalizedInstanceId)
        .eq('user_id', userId)
        .filter('archived_at', 'is', null)
        .select('id,intent')
        .maybeSingle();

    if (row == null) {
      throw Exception('Copy intent could not be saved.');
    }

    final savedIntent = normalizeVaultIntentValue(row['intent']);
    if (savedIntent != nextIntent) {
      throw Exception('Copy intent could not be saved.');
    }

    return savedIntent;
  }

  static Future<String> saveVaultItemInstancesIntentBulk({
    required SupabaseClient client,
    required Iterable<String> instanceIds,
    required String intent,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final normalizedInstanceIds = instanceIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (normalizedInstanceIds.isEmpty) {
      throw Exception('Choose at least one copy.');
    }

    final nextIntent = normalizeVaultIntentValue(intent);
    // LOCK: Bulk copy intent authority is exact-copy level.
    // LOCK: Do not write grouped vault_items or shared_cards from bulk copy actions.
    final ownedRows = await client
        .from('vault_item_instances')
        .select('id,user_id,archived_at')
        .eq('user_id', userId)
        .filter('archived_at', 'is', null)
        .inFilter('id', normalizedInstanceIds);

    if ((ownedRows as List<dynamic>).length != normalizedInstanceIds.length) {
      throw Exception('Selected copies could not be updated.');
    }

    final updatedRows = await client
        .from('vault_item_instances')
        .update({'intent': nextIntent})
        .eq('user_id', userId)
        .filter('archived_at', 'is', null)
        .inFilter('id', normalizedInstanceIds)
        .select('id,intent');

    if ((updatedRows as List<dynamic>).length != normalizedInstanceIds.length) {
      throw Exception('Selected copies could not be updated.');
    }

    return nextIntent;
  }

  static Future<Map<String, List<VaultManageCopySectionMembership>>>
  loadCopySectionMemberships({
    required SupabaseClient client,
    required Iterable<String> instanceIds,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      return const <String, List<VaultManageCopySectionMembership>>{};
    }

    final normalizedInstanceIds = instanceIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (normalizedInstanceIds.isEmpty) {
      return const <String, List<VaultManageCopySectionMembership>>{};
    }

    final ownershipRows = await client
        .from('vault_item_instances')
        .select('id,user_id,archived_at')
        .eq('user_id', userId)
        .filter('archived_at', 'is', null)
        .inFilter('id', normalizedInstanceIds);
    final ownedInstanceIds = (ownershipRows as List<dynamic>)
        .map((row) => _trimmedOrNull((row as Map)['id']))
        .whereType<String>()
        .toSet();
    if (ownedInstanceIds.isEmpty) {
      return const <String, List<VaultManageCopySectionMembership>>{};
    }

    final results = await Future.wait<dynamic>([
      client
          .from('wall_sections')
          .select('id,name,position,is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('position', ascending: true)
          .order('created_at', ascending: true),
      client
          .from('wall_section_memberships')
          .select('section_id,vault_item_instance_id')
          .inFilter('vault_item_instance_id', ownedInstanceIds.toList()),
    ]);

    final sectionRows = (results[0] as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .where((row) {
          return _trimmedOrNull(row['id']) != null &&
              _trimmedOrNull(row['name']) != null &&
              row['is_active'] == true;
        })
        .toList(growable: false);
    final membershipPairs = (results[1] as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .map(
          (row) =>
              '${_trimmedOrNull(row['vault_item_instance_id']) ?? ''}:${_trimmedOrNull(row['section_id']) ?? ''}',
        )
        .where((value) => !value.endsWith(':') && !value.startsWith(':'))
        .toSet();

    return <String, List<VaultManageCopySectionMembership>>{
      for (final instanceId in ownedInstanceIds)
        instanceId: sectionRows
            .map((row) {
              final sectionId = _trimmedOrNull(row['id'])!;
              return VaultManageCopySectionMembership(
                id: sectionId,
                name: _trimmedOrNull(row['name'])!,
                position: _toInt(row['position']) ?? 0,
                isMember: membershipPairs.contains('$instanceId:$sectionId'),
              );
            })
            .toList(growable: false),
    };
  }

  static Future<void> assignCopySectionMembership({
    required SupabaseClient client,
    required String instanceId,
    required String sectionId,
  }) async {
    final userId = client.auth.currentUser?.id;
    final normalizedInstanceId = _trimmedOrNull(instanceId);
    final normalizedSectionId = _trimmedOrNull(sectionId);
    if (userId == null ||
        userId.isEmpty ||
        normalizedInstanceId == null ||
        normalizedSectionId == null ||
        normalizedSectionId.toLowerCase() == 'wall') {
      throw Exception('Section assignment could not be saved.');
    }

    await _assertOwnedSectionTarget(
      client: client,
      userId: userId,
      instanceId: normalizedInstanceId,
      sectionId: normalizedSectionId,
    );

    final existing = await client
        .from('wall_section_memberships')
        .select('section_id')
        .eq('vault_item_instance_id', normalizedInstanceId)
        .eq('section_id', normalizedSectionId)
        .maybeSingle();
    if (existing != null) {
      return;
    }

    // LOCK: Grouped card row section assignment is exact-copy only.
    // LOCK: Do not write shared_cards or grouped vault_items.
    await client.from('wall_section_memberships').insert({
      'section_id': normalizedSectionId,
      'vault_item_instance_id': normalizedInstanceId,
    });
  }

  static Future<void> removeCopySectionMembership({
    required SupabaseClient client,
    required String instanceId,
    required String sectionId,
  }) async {
    final userId = client.auth.currentUser?.id;
    final normalizedInstanceId = _trimmedOrNull(instanceId);
    final normalizedSectionId = _trimmedOrNull(sectionId);
    if (userId == null ||
        userId.isEmpty ||
        normalizedInstanceId == null ||
        normalizedSectionId == null ||
        normalizedSectionId.toLowerCase() == 'wall') {
      throw Exception('Section assignment could not be saved.');
    }

    await _assertOwnedSectionTarget(
      client: client,
      userId: userId,
      instanceId: normalizedInstanceId,
      sectionId: normalizedSectionId,
    );

    // LOCK: Grouped card row section removal is exact-copy only.
    // LOCK: Do not write shared_cards or grouped vault_items.
    await client
        .from('wall_section_memberships')
        .delete()
        .eq('vault_item_instance_id', normalizedInstanceId)
        .eq('section_id', normalizedSectionId);
  }

  static Future<void> bulkCopySectionMembership({
    required SupabaseClient client,
    required Iterable<String> instanceIds,
    required String sectionId,
    required bool add,
  }) async {
    final userId = client.auth.currentUser?.id;
    final normalizedSectionId = _trimmedOrNull(sectionId);
    final normalizedInstanceIds = instanceIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (userId == null ||
        userId.isEmpty ||
        normalizedSectionId == null ||
        normalizedSectionId.toLowerCase() == 'wall' ||
        normalizedInstanceIds.isEmpty) {
      throw Exception('Section assignment could not be saved.');
    }

    final results = await Future.wait<dynamic>([
      client
          .from('vault_item_instances')
          .select('id,user_id,archived_at')
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .inFilter('id', normalizedInstanceIds),
      client
          .from('wall_sections')
          .select('id,user_id,is_active')
          .eq('id', normalizedSectionId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
    ]);

    final ownedRows = results[0] as List<dynamic>;
    if (ownedRows.length != normalizedInstanceIds.length ||
        results[1] == null) {
      throw Exception('Section assignment could not be saved.');
    }

    if (add) {
      final existingRows = await client
          .from('wall_section_memberships')
          .select('section_id,vault_item_instance_id')
          .eq('section_id', normalizedSectionId)
          .inFilter('vault_item_instance_id', normalizedInstanceIds);
      final existingInstanceIds = (existingRows as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map((row) => _trimmedOrNull(row['vault_item_instance_id']))
          .whereType<String>()
          .toSet();
      final rowsToInsert = normalizedInstanceIds
          .where((id) => !existingInstanceIds.contains(id))
          .map(
            (id) => {
              'section_id': normalizedSectionId,
              'vault_item_instance_id': id,
            },
          )
          .toList(growable: false);

      if (rowsToInsert.isNotEmpty) {
        // LOCK: Bulk grouped-card section assignment is exact-copy only.
        // LOCK: Do not write shared_cards or grouped vault_items.
        await client.from('wall_section_memberships').insert(rowsToInsert);
      }
    } else {
      // LOCK: Bulk grouped-card section removal is exact-copy only.
      // LOCK: Do not write shared_cards or grouped vault_items.
      await client
          .from('wall_section_memberships')
          .delete()
          .eq('section_id', normalizedSectionId)
          .inFilter('vault_item_instance_id', normalizedInstanceIds);
    }
  }

  static Future<void> _assertOwnedSectionTarget({
    required SupabaseClient client,
    required String userId,
    required String instanceId,
    required String sectionId,
  }) async {
    final results = await Future.wait<dynamic>([
      client
          .from('vault_item_instances')
          .select('id,user_id,archived_at')
          .eq('id', instanceId)
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .maybeSingle(),
      client
          .from('wall_sections')
          .select('id,user_id,is_active')
          .eq('id', sectionId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
    ]);

    if (results[0] == null || results[1] == null) {
      throw Exception('Section assignment could not be saved.');
    }
  }

  static Future<Map<String, dynamic>?> _loadSharedCardRow({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    required String? gvId,
  }) async {
    final byCardId = await client
        .from('shared_cards')
        .select('is_shared,wall_category,public_note,price_display_mode')
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
        .select('is_shared,wall_category,public_note,price_display_mode')
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

  static VaultOwnedCopyTarget? _resolveOwnedTargetFromCopies({
    required VaultOwnedCardAnchor anchor,
    required List<VaultManageCardCopy> copies,
  }) {
    if (copies.isEmpty) {
      return null;
    }

    final sortedCopies = [...copies]
      ..sort((a, b) {
        final createdCompare =
            (b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0)).compareTo(
              a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0),
            );
        if (createdCompare != 0) {
          return createdCompare;
        }
        return b.instanceId.compareTo(a.instanceId);
      });

    for (final copy in sortedCopies) {
      final instanceId = _trimmedOrNull(copy.instanceId);
      final gvviId = _trimmedOrNull(copy.gvviId);
      if (instanceId == null || gvviId == null) {
        continue;
      }

      return VaultOwnedCopyTarget(
        instanceId: instanceId,
        gvviId: gvviId,
        vaultItemId: anchor.vaultItemId,
        cardPrintId: anchor.cardPrintId,
        createdAt: copy.createdAt,
      );
    }

    return null;
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
    if (row['archived_at'] != null) {
      return null;
    }
    return VaultManageCardCopy.fromJson(row);
  }

  static Future<VaultOwnedCopyTarget?> _resolveOwnedTargetFromCollectorRow({
    required SupabaseClient client,
    required VaultOwnedCardAnchor anchor,
  }) async {
    final rows = await getCanonicalCollectorRows(client: client);
    final rawRow = rows.cast<Map<String, dynamic>?>().firstWhere(
      (row) => _trimmedOrNull(row?['card_id']) == anchor.cardPrintId,
      orElse: () => null,
    );
    if (rawRow == null) {
      return null;
    }

    final gvviId = _trimmedOrNull(rawRow['gv_vi_id']);
    if (gvviId == null) {
      return null;
    }

    return _resolveOwnedTargetFromGvvi(
      client: client,
      anchor: anchor,
      gvviId: gvviId,
    );
  }

  static Future<VaultOwnedCopyTarget?> _resolveOwnedTargetFromGvvi({
    required SupabaseClient client,
    required VaultOwnedCardAnchor anchor,
    required String gvviId,
  }) async {
    final copy = await _loadManageCardCopyByGvvi(
      client: client,
      gvviId: gvviId,
    );
    if (copy == null) {
      return null;
    }

    final instanceId = _trimmedOrNull(copy.instanceId);
    final resolvedGvviId =
        _trimmedOrNull(copy.gvviId) ?? _trimmedOrNull(gvviId);
    if (instanceId == null || resolvedGvviId == null) {
      return null;
    }

    return VaultOwnedCopyTarget(
      instanceId: instanceId,
      gvviId: resolvedGvviId,
      vaultItemId: anchor.vaultItemId,
      cardPrintId: anchor.cardPrintId,
      createdAt: copy.createdAt,
    );
  }

  static Future<String?> _resolvePrimarySharedGvvi({
    required SupabaseClient client,
    required String ownerUserId,
    required String cardPrintId,
    required List<VaultManageCardCopy> copies,
    String? fallbackGvviId,
  }) async {
    try {
      final rows = await client.rpc(
        'public_shared_card_primary_gvvi_v1',
        params: {
          'p_owner_user_id': ownerUserId,
          'p_card_print_ids': <String>[cardPrintId],
        },
      );
      if (rows is List && rows.isNotEmpty) {
        final row = Map<String, dynamic>.from(rows.first as Map);
        final gvviId = _trimmedOrNull(row['gv_vi_id']);
        if (gvviId != null) {
          return gvviId;
        }
      }
    } catch (_) {}

    for (final copy in copies) {
      final gvviId = _trimmedOrNull(copy.gvviId);
      if (gvviId != null) {
        return gvviId;
      }
    }

    return _trimmedOrNull(fallbackGvviId);
  }

  static Future<VaultManageCardPricing?> _loadPrivateInstancePricing({
    required SupabaseClient client,
    required String userId,
    required String? gvviId,
  }) async {
    final normalizedGvviId = _trimmedOrNull(gvviId);
    if (normalizedGvviId == null) {
      return null;
    }

    final row = await client
        .from('vault_item_instances')
        .select('asking_price_amount,asking_price_currency')
        .eq('user_id', userId)
        .eq('gv_vi_id', normalizedGvviId)
        .filter('archived_at', 'is', null)
        .maybeSingle();

    if (row == null) {
      return null;
    }

    return VaultManageCardPricing(
      askingPriceAmount: _toMoney(row['asking_price_amount']),
      askingPriceCurrency: _normalizeCurrency(row['asking_price_currency']),
    );
  }
}

String? _trimmedOrNull(dynamic value) {
  final normalized = value?.toString().trim() ?? '';
  return normalized.isEmpty ? null : normalized;
}

String? _cardDisplayImageUrl(Map<String, dynamic> json) {
  return resolveDisplayImageUrlFromRow(json);
}

String? _normalizeCurrency(dynamic value) {
  final normalized = (value ?? '').toString().trim().toUpperCase();
  if (normalized.length != 3 || RegExp(r'[^A-Z]').hasMatch(normalized)) {
    return null;
  }
  return normalized;
}

double? _toMoney(dynamic value) {
  if (value is num) {
    final normalized = value.toDouble();
    return normalized.isFinite && normalized >= 0
        ? double.parse(normalized.toStringAsFixed(2))
        : null;
  }
  final parsed = double.tryParse((value ?? '').toString().trim());
  if (parsed == null || !parsed.isFinite || parsed < 0) {
    return null;
  }
  return double.parse(parsed.toStringAsFixed(2));
}

int? _toInt(dynamic value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse((value ?? '').toString().trim());
}

String _deriveManageCardIntent({required List<VaultManageCardCopy> copies}) {
  final discoverableIntents = copies
      .map((copy) => normalizeDiscoverableVaultIntentValue(copy.intent))
      .whereType<String>()
      .toSet()
      .toList();

  if (discoverableIntents.length == 1) {
    return discoverableIntents.first;
  }

  return 'hold';
}
