import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../utils/display_image_contract.dart';
import '../identity/canon_image_url_service.dart';
import '../network/intent_presentation.dart' as intent_presentation;

class _InterestGraphCompletionSnapshot {
  const _InterestGraphCompletionSnapshot({
    required this.subjectType,
    required this.subjectId,
    required this.totalCount,
    required this.completedCount,
    required this.directAddCompletionDelta,
  });

  final String subjectType;
  final String subjectId;
  final int totalCount;
  final int completedCount;
  final int directAddCompletionDelta;

  int get completionPercent => totalCount <= 0
      ? 0
      : ((completedCount / totalCount) * 100).round().clamp(0, 100);

  _InterestGraphCompletionSnapshot afterDirectAdd() {
    return _InterestGraphCompletionSnapshot(
      subjectType: subjectType,
      subjectId: subjectId,
      totalCount: totalCount,
      completedCount: (completedCount + directAddCompletionDelta).clamp(
        0,
        totalCount,
      ),
      directAddCompletionDelta: 0,
    );
  }
}

/// A finish-aware master-set completion total calculated from exact owned
/// instances. A directly anchored instance always wins over a slab anchor so
/// dual-anchored rows cannot count twice.
class VaultSetCompletionSnapshot {
  const VaultSetCompletionSnapshot({
    required this.variantOptionCount,
    required this.ownedVariantOptionCount,
    this.optionKeys = const <String>{},
    this.ownedOptionKeys = const <String>{},
  });

  final int variantOptionCount;
  final int ownedVariantOptionCount;
  final Set<String> optionKeys;
  final Set<String> ownedOptionKeys;

  int get completionPercent => variantOptionCount <= 0
      ? 0
      : ((ownedVariantOptionCount / variantOptionCount) * 100).round().clamp(
          0,
          100,
        );

  /// Returns whether one newly created direct instance can add one completion
  /// option. A finish is only a completion when it is an exact option for the
  /// card; cards without printing rows use their parent fallback option.
  int directAddCompletionDelta({
    required String cardPrintId,
    String? cardPrintingId,
  }) {
    final normalizedCardPrintId = cardPrintId.trim();
    if (normalizedCardPrintId.isEmpty) {
      return 0;
    }
    final normalizedPrintingId = cardPrintingId?.trim();
    final exactKey =
        normalizedPrintingId == null || normalizedPrintingId.isEmpty
        ? null
        : '$normalizedCardPrintId:$normalizedPrintingId';
    final fallbackKey = '$normalizedCardPrintId:_';
    final optionKey = exactKey != null && optionKeys.contains(exactKey)
        ? exactKey
        : optionKeys.contains(fallbackKey)
        ? fallbackKey
        : null;
    return optionKey != null && !ownedOptionKeys.contains(optionKey) ? 1 : 0;
  }
}

/// Owner-scoped exact-copy truth for a bounded canonical card-print set.
/// Slab-only rows are resolved through their certificate; dual anchors are
/// represented only by the direct card_print_id row.
class VaultOwnedCardTruth {
  const VaultOwnedCardTruth({
    this.countsByCardPrintId = const <String, int>{},
    this.countsByPrintingId = const <String, int>{},
    this.unassignedByCardPrintId = const <String, int>{},
  });

  final Map<String, int> countsByCardPrintId;
  final Map<String, int> countsByPrintingId;
  final Map<String, int> unassignedByCardPrintId;
}

@visibleForTesting
class VaultSetCompletionOption {
  const VaultSetCompletionOption({
    required this.cardPrintId,
    this.cardPrintingId,
  });

  final String cardPrintId;
  final String? cardPrintingId;
}

class VaultSetCompletionCopy {
  const VaultSetCompletionCopy({
    required this.instanceId,
    this.directCardPrintId,
    this.slabCardPrintId,
    this.cardPrintingId,
  });

  final String instanceId;
  final String? directCardPrintId;
  final String? slabCardPrintId;
  final String? cardPrintingId;
}

@visibleForTesting
VaultSetCompletionSnapshot calculateVaultSetCompletionSnapshot({
  required Iterable<VaultSetCompletionOption> options,
  required Iterable<VaultSetCompletionCopy> copies,
}) {
  final optionsByCardPrintId = <String, List<VaultSetCompletionOption>>{};
  final optionKeys = <String>{};
  for (final option in options) {
    final cardPrintId = option.cardPrintId.trim();
    if (cardPrintId.isEmpty) {
      continue;
    }
    final printingId = option.cardPrintingId?.trim();
    final key =
        '$cardPrintId:${printingId?.isNotEmpty == true ? printingId : '_'}';
    if (!optionKeys.add(key)) {
      continue;
    }
    (optionsByCardPrintId[cardPrintId] ??= <VaultSetCompletionOption>[]).add(
      VaultSetCompletionOption(
        cardPrintId: cardPrintId,
        cardPrintingId: printingId?.isEmpty == true ? null : printingId,
      ),
    );
  }

  final ownedOptionKeys = <String>{};
  final seenInstanceIds = <String>{};
  for (final copy in copies) {
    final instanceId = copy.instanceId.trim();
    if (instanceId.isEmpty || !seenInstanceIds.add(instanceId)) {
      continue;
    }
    final cardPrintId = (copy.directCardPrintId ?? '').trim().isNotEmpty
        ? copy.directCardPrintId!.trim()
        : (copy.slabCardPrintId ?? '').trim();
    final cardOptions = optionsByCardPrintId[cardPrintId];
    if (cardOptions == null || cardOptions.isEmpty) {
      continue;
    }
    final hasPrintingOptions = cardOptions.any(
      (option) => (option.cardPrintingId ?? '').trim().isNotEmpty,
    );
    if (!hasPrintingOptions) {
      ownedOptionKeys.add('$cardPrintId:_');
      continue;
    }
    final printingId = (copy.cardPrintingId ?? '').trim();
    if (printingId.isNotEmpty &&
        cardOptions.any((option) => option.cardPrintingId == printingId)) {
      ownedOptionKeys.add('$cardPrintId:$printingId');
    }
  }

  return VaultSetCompletionSnapshot(
    variantOptionCount: optionKeys.length,
    ownedVariantOptionCount: ownedOptionKeys.length,
    optionKeys: Set.unmodifiable(optionKeys),
    ownedOptionKeys: Set.unmodifiable(ownedOptionKeys),
  );
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

    return _parseOwnedCounts(response);
  }

  static Future<Map<String, int>> getAllOwnedCounts({
    required SupabaseClient client,
  }) async {
    const pageSize = 1000;
    final counts = <String, int>{};
    for (var offset = 0; ; offset += pageSize) {
      final response = await client
          .rpc(
            'vault_owned_counts_v1',
            params: const {'p_card_print_ids': null},
          )
          .order('card_print_id', ascending: true)
          .range(offset, offset + pageSize - 1);
      final page = _parseOwnedCounts(response);
      counts.addAll(page);
      if (page.length < pageSize) {
        break;
      }
    }
    return counts;
  }

  /// Counts active owner instances by canonical card print, including slab-only
  /// instances. A row with both anchors is counted through its direct card
  /// anchor only.
  static Future<Map<String, int>> getOwnedCountsIncludingSlabs({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final userId = (client.auth.currentUser?.id ?? '').trim();
    if (normalizedIds.isEmpty || userId.isEmpty) {
      return const <String, int>{};
    }

    final counts = <String, int>{};
    for (final chunk in _idChunks(normalizedIds)) {
      for (var offset = 0; ; offset += 1000) {
        final direct = await client
            .from('vault_item_instances')
            .select('card_print_id')
            .eq('user_id', userId)
            .filter('archived_at', 'is', null)
            .inFilter('card_print_id', chunk)
            .order('id', ascending: true)
            .range(offset, offset + 999);
        final rows = direct as List<dynamic>;
        for (final raw in rows) {
          final cardPrintId = _trimmedOrNull((raw as Map)['card_print_id']);
          if (cardPrintId != null) {
            counts[cardPrintId] = (counts[cardPrintId] ?? 0) + 1;
          }
        }
        if (rows.length < 1000) {
          break;
        }
      }
    }

    // Read the owner's slab-only anchors first. Looking up certificates by
    // card print would scan a potentially unbounded public certificate set.
    final slabInstanceCounts = <String, int>{};
    for (var offset = 0; ; offset += 1000) {
      final slabOnly = await client
          .from('vault_item_instances')
          .select('slab_cert_id')
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .filter('card_print_id', 'is', null)
          .order('id', ascending: true)
          .range(offset, offset + 999);
      final rows = slabOnly as List<dynamic>;
      for (final raw in rows) {
        final certId = _trimmedOrNull((raw as Map)['slab_cert_id']);
        if (certId != null) {
          slabInstanceCounts[certId] = (slabInstanceCounts[certId] ?? 0) + 1;
        }
      }
      if (rows.length < 1000) {
        break;
      }
    }
    for (final chunk in _idChunks(slabInstanceCounts.keys)) {
      final slabCerts = await client
          .from('slab_certs')
          .select('id,card_print_id')
          .inFilter('id', chunk);
      for (final raw in slabCerts as List<dynamic>) {
        final row = raw as Map;
        final certId = _trimmedOrNull(row['id']);
        final cardPrintId = _trimmedOrNull(row['card_print_id']);
        if (certId != null &&
            cardPrintId != null &&
            normalizedIds.contains(cardPrintId)) {
          counts[cardPrintId] =
              (counts[cardPrintId] ?? 0) + (slabInstanceCounts[certId] ?? 0);
        }
      }
    }
    return counts;
  }

  static Future<VaultOwnedCardTruth> getOwnedCardTruthIncludingSlabs({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet();
    final userId = (client.auth.currentUser?.id ?? '').trim();
    if (normalizedIds.isEmpty || userId.isEmpty) {
      return const VaultOwnedCardTruth();
    }

    final countsByCardPrintId = <String, int>{};
    final countsByPrintingId = <String, int>{};
    final unassignedByCardPrintId = <String, int>{};
    void recordCopy({
      required String? cardPrintId,
      required String? cardPrintingId,
    }) {
      final normalizedCardPrintId = (cardPrintId ?? '').trim();
      if (!normalizedIds.contains(normalizedCardPrintId)) {
        return;
      }
      countsByCardPrintId[normalizedCardPrintId] =
          (countsByCardPrintId[normalizedCardPrintId] ?? 0) + 1;
      final normalizedCardPrintingId = (cardPrintingId ?? '').trim();
      if (normalizedCardPrintingId.isEmpty) {
        unassignedByCardPrintId[normalizedCardPrintId] =
            (unassignedByCardPrintId[normalizedCardPrintId] ?? 0) + 1;
      } else {
        countsByPrintingId[normalizedCardPrintingId] =
            (countsByPrintingId[normalizedCardPrintingId] ?? 0) + 1;
      }
    }

    for (final chunk in _idChunks(normalizedIds)) {
      for (var offset = 0; ; offset += 1000) {
        final directRows = await client
            .from('vault_item_instances')
            .select('card_print_id,card_printing_id')
            .eq('user_id', userId)
            .filter('archived_at', 'is', null)
            .inFilter('card_print_id', chunk)
            .order('id', ascending: true)
            .range(offset, offset + 999);
        final rows = directRows as List<dynamic>;
        for (final raw in rows) {
          final row = raw as Map;
          recordCopy(
            cardPrintId: _trimmedOrNull(row['card_print_id']),
            cardPrintingId: _trimmedOrNull(row['card_printing_id']),
          );
        }
        if (rows.length < 1000) {
          break;
        }
      }
    }

    final slabRows = <Map<String, dynamic>>[];
    for (var offset = 0; ; offset += 1000) {
      final response = await client
          .from('vault_item_instances')
          .select('slab_cert_id,card_printing_id')
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .filter('card_print_id', 'is', null)
          .order('id', ascending: true)
          .range(offset, offset + 999);
      final rows = response as List<dynamic>;
      slabRows.addAll(rows.map((raw) => Map<String, dynamic>.from(raw as Map)));
      if (rows.length < 1000) {
        break;
      }
    }

    final cardPrintIdBySlabCertId = <String, String>{};
    for (final chunk in _idChunks(
      slabRows
          .map((row) => _trimmedOrNull(row['slab_cert_id']))
          .whereType<String>(),
    )) {
      final slabCerts = await client
          .from('slab_certs')
          .select('id,card_print_id')
          .inFilter('id', chunk);
      for (final raw in slabCerts as List<dynamic>) {
        final row = raw as Map;
        final certId = _trimmedOrNull(row['id']);
        final cardPrintId = _trimmedOrNull(row['card_print_id']);
        if (certId != null && cardPrintId != null) {
          cardPrintIdBySlabCertId[certId] = cardPrintId;
        }
      }
    }
    for (final row in slabRows) {
      final slabCertId = _trimmedOrNull(row['slab_cert_id']);
      recordCopy(
        cardPrintId: slabCertId == null
            ? null
            : cardPrintIdBySlabCertId[slabCertId],
        cardPrintingId: _trimmedOrNull(row['card_printing_id']),
      );
    }

    return VaultOwnedCardTruth(
      countsByCardPrintId: Map.unmodifiable(countsByCardPrintId),
      countsByPrintingId: Map.unmodifiable(countsByPrintingId),
      unassignedByCardPrintId: Map.unmodifiable(unassignedByCardPrintId),
    );
  }

  /// Reads slab-only completion copies once for callers that need to evaluate
  /// several sets in one dashboard pass. The owner-first certificate lookup
  /// stays bounded and dual-anchored rows remain excluded.
  static Future<List<VaultSetCompletionCopy>>
  fetchOwnedSlabOnlyCompletionCopies({
    required SupabaseClient client,
    required String userId,
  }) async {
    const pageSize = 1000;
    final normalizedUserId = userId.trim();
    if (normalizedUserId.isEmpty) {
      return const <VaultSetCompletionCopy>[];
    }
    final slabRows = <Map<String, dynamic>>[];
    for (var offset = 0; ; offset += pageSize) {
      final response = await client
          .from('vault_item_instances')
          .select('id,slab_cert_id,card_printing_id')
          .eq('user_id', normalizedUserId)
          .filter('archived_at', 'is', null)
          .filter('card_print_id', 'is', null)
          .order('id', ascending: true)
          .range(offset, offset + pageSize - 1);
      final rows = response as List<dynamic>;
      slabRows.addAll(rows.map((raw) => Map<String, dynamic>.from(raw as Map)));
      if (rows.length < pageSize) {
        break;
      }
    }
    final cardPrintIdByCertId = <String, String>{};
    for (final chunk in _idChunks(
      slabRows
          .map((row) => _trimmedOrNull(row['slab_cert_id']))
          .whereType<String>(),
    )) {
      final certRows = await client
          .from('slab_certs')
          .select('id,card_print_id')
          .inFilter('id', chunk);
      for (final raw in certRows as List<dynamic>) {
        final row = raw as Map;
        final certId = _trimmedOrNull(row['id']);
        final cardPrintId = _trimmedOrNull(row['card_print_id']);
        if (certId != null && cardPrintId != null) {
          cardPrintIdByCertId[certId] = cardPrintId;
        }
      }
    }
    return List.unmodifiable(
      slabRows
          .map((row) {
            final certId = _trimmedOrNull(row['slab_cert_id']);
            return VaultSetCompletionCopy(
              instanceId: (row['id'] ?? '').toString(),
              slabCardPrintId: certId == null
                  ? null
                  : cardPrintIdByCertId[certId],
              cardPrintingId: _trimmedOrNull(row['card_printing_id']),
            );
          })
          .where((copy) => (copy.slabCardPrintId ?? '').isNotEmpty),
    );
  }

  static Future<VaultSetCompletionSnapshot> fetchSetCompletionSnapshot({
    required SupabaseClient client,
    required String userId,
    required String setId,
    Iterable<VaultSetCompletionCopy>? ownerSlabOnlyCopies,
  }) async {
    final normalizedUserId = userId.trim();
    final normalizedSetId = setId.trim();
    if (normalizedUserId.isEmpty || normalizedSetId.isEmpty) {
      return const VaultSetCompletionSnapshot(
        variantOptionCount: 0,
        ownedVariantOptionCount: 0,
      );
    }

    const pageSize = 1000;
    final cardPrintIds = <String>{};
    for (var offset = 0; ; offset += pageSize) {
      final parentRows = await client
          .from('card_prints')
          .select('id')
          .eq('set_id', normalizedSetId)
          .order('id', ascending: true)
          .range(offset, offset + pageSize - 1);
      final rows = parentRows as List<dynamic>;
      cardPrintIds.addAll(
        rows
            .map((raw) => _trimmedOrNull((raw as Map)['id']))
            .whereType<String>(),
      );
      if (rows.length < pageSize) {
        break;
      }
    }
    if (cardPrintIds.isEmpty) {
      return const VaultSetCompletionSnapshot(
        variantOptionCount: 0,
        ownedVariantOptionCount: 0,
      );
    }

    final options = <VaultSetCompletionOption>[];
    final printingIdsByCardPrintId = <String, Set<String>>{};
    for (final chunk in _idChunks(cardPrintIds)) {
      for (var offset = 0; ; offset += pageSize) {
        final printingRows = await client
            .from('card_printings')
            .select('id,card_print_id')
            .inFilter('card_print_id', chunk)
            .order('id', ascending: true)
            .range(offset, offset + pageSize - 1);
        final rows = printingRows as List<dynamic>;
        for (final raw in rows) {
          final row = raw as Map;
          final printingId = _trimmedOrNull(row['id']);
          final cardPrintId = _trimmedOrNull(row['card_print_id']);
          if (printingId == null || cardPrintId == null) {
            continue;
          }
          (printingIdsByCardPrintId[cardPrintId] ??= <String>{}).add(
            printingId,
          );
        }
        if (rows.length < pageSize) {
          break;
        }
      }
    }
    for (final cardPrintId in cardPrintIds) {
      final printingIds = printingIdsByCardPrintId[cardPrintId];
      if (printingIds == null || printingIds.isEmpty) {
        options.add(VaultSetCompletionOption(cardPrintId: cardPrintId));
      } else {
        options.addAll(
          printingIds.map(
            (printingId) => VaultSetCompletionOption(
              cardPrintId: cardPrintId,
              cardPrintingId: printingId,
            ),
          ),
        );
      }
    }

    final copies = <VaultSetCompletionCopy>[];
    for (final chunk in _idChunks(cardPrintIds)) {
      for (var offset = 0; ; offset += pageSize) {
        final directRows = await client
            .from('vault_item_instances')
            .select('id,card_print_id,card_printing_id')
            .eq('user_id', normalizedUserId)
            .filter('archived_at', 'is', null)
            .inFilter('card_print_id', chunk)
            .order('id', ascending: true)
            .range(offset, offset + pageSize - 1);
        final rows = directRows as List<dynamic>;
        copies.addAll(
          rows.map((raw) {
            final row = raw as Map;
            return VaultSetCompletionCopy(
              instanceId: (row['id'] ?? '').toString(),
              directCardPrintId: _trimmedOrNull(row['card_print_id']),
              cardPrintingId: _trimmedOrNull(row['card_printing_id']),
            );
          }),
        );
        if (rows.length < pageSize) {
          break;
        }
      }
    }

    final slabCopies =
        ownerSlabOnlyCopies ??
        await fetchOwnedSlabOnlyCompletionCopies(
          client: client,
          userId: normalizedUserId,
        );
    copies.addAll(
      slabCopies.where((copy) => cardPrintIds.contains(copy.slabCardPrintId)),
    );

    return calculateVaultSetCompletionSnapshot(
      options: options,
      copies: copies,
    );
  }

  static Map<String, int> _parseOwnedCounts(dynamic response) {
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

  static Iterable<List<String>> _idChunks(
    Iterable<String> source, {
    int size = 250,
  }) sync* {
    var chunk = <String>[];
    for (final value
        in source.map((id) => id.trim()).where((id) => id.isNotEmpty).toSet()) {
      chunk.add(value);
      if (chunk.length == size) {
        yield chunk;
        chunk = <String>[];
      }
    }
    if (chunk.isNotEmpty) {
      yield chunk;
    }
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
      cardPrintingId: cardPrintingId,
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
          cardPrintingId: cardPrintingId,
          previous: completionBefore,
        );
        return gvviId;
      }
    }

    await _emitInterestGraphCompletionCrossings(
      client: client,
      userId: userId,
      cardPrintId: cardId,
      cardPrintingId: cardPrintingId,
      previous: completionBefore,
    );
    return '';
  }

  static Future<Map<String, _InterestGraphCompletionSnapshot>>
  _fetchInterestGraphCompletionSnapshot({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    String? cardPrintingId,
  }) async {
    try {
      final snapshots = <String, _InterestGraphCompletionSnapshot>{};
      final lookupResults = await Future.wait<dynamic>([
        client
            .from('card_prints')
            .select('set_id')
            .eq('id', cardPrintId)
            .maybeSingle(),
        client
            .from('v_grookai_dex_card_prints_v1')
            .select('species_id')
            .eq('card_print_id', cardPrintId)
            .eq('mapping_active', true)
            .eq('counts_for_completion', true),
      ]);
      final cardRow = lookupResults[0] as Map<String, dynamic>?;
      final setId = _trimmedOrNull(cardRow?['set_id']);
      final touchedRows = lookupResults[1] as List<dynamic>;
      final speciesIds = touchedRows
          .map((raw) => _trimmedOrNull((raw as Map)['species_id']))
          .whereType<String>()
          .toSet()
          .toList(growable: false);
      final futures = await Future.wait<dynamic>([
        if (setId != null)
          fetchSetCompletionSnapshot(
            client: client,
            userId: userId,
            setId: setId,
          )
        else
          Future<VaultSetCompletionSnapshot?>.value(null),
        _fetchInterestGraphSpeciesSnapshots(
          client: client,
          cardPrintId: cardPrintId,
          speciesIds: speciesIds,
        ),
      ]);
      final setProgress = futures[0] as VaultSetCompletionSnapshot?;
      if (setId != null && setProgress != null) {
        snapshots['set:$setId'] = _InterestGraphCompletionSnapshot(
          subjectType: 'set',
          subjectId: setId,
          totalCount: setProgress.variantOptionCount,
          completedCount: setProgress.ownedVariantOptionCount,
          directAddCompletionDelta: setProgress.directAddCompletionDelta(
            cardPrintId: cardPrintId,
            cardPrintingId: cardPrintingId,
          ),
        );
      }
      snapshots.addAll(
        futures[1] as Map<String, _InterestGraphCompletionSnapshot>,
      );
      return snapshots;
    } catch (error) {
      debugPrint('interest_graph.completion_snapshot.failed: $error');
      return const <String, _InterestGraphCompletionSnapshot>{};
    }
  }

  static Future<Map<String, _InterestGraphCompletionSnapshot>>
  _fetchInterestGraphSpeciesSnapshots({
    required SupabaseClient client,
    required String cardPrintId,
    required Iterable<String> speciesIds,
  }) async {
    final normalizedSpeciesIds = speciesIds.toSet();
    if (normalizedSpeciesIds.isEmpty) {
      return const <String, _InterestGraphCompletionSnapshot>{};
    }
    final cardPrintIdsBySpeciesId = <String, Set<String>>{};
    for (final chunk in _idChunks(normalizedSpeciesIds)) {
      for (var offset = 0; ; offset += 1000) {
        final mappingRows = await client
            .from('v_grookai_dex_card_prints_v1')
            .select('species_id,card_print_id')
            .eq('mapping_active', true)
            .eq('counts_for_completion', true)
            .inFilter('species_id', chunk)
            .order('species_id', ascending: true)
            .order('card_print_id', ascending: true)
            .range(offset, offset + 999);
        final rows = mappingRows as List<dynamic>;
        for (final raw in rows) {
          final row = raw as Map;
          final speciesId = _trimmedOrNull(row['species_id']);
          final mappedCardPrintId = _trimmedOrNull(row['card_print_id']);
          if (speciesId != null && mappedCardPrintId != null) {
            (cardPrintIdsBySpeciesId[speciesId] ??= <String>{}).add(
              mappedCardPrintId,
            );
          }
        }
        if (rows.length < 1000) {
          break;
        }
      }
    }
    final ownedCounts = await getOwnedCountsIncludingSlabs(
      client: client,
      cardPrintIds: cardPrintIdsBySpeciesId.values.expand((ids) => ids),
    );
    return Map.unmodifiable({
      for (final entry in cardPrintIdsBySpeciesId.entries)
        'character:${entry.key}': _InterestGraphCompletionSnapshot(
          subjectType: 'character',
          subjectId: entry.key,
          totalCount: entry.value.length,
          completedCount: entry.value
              .where((id) => (ownedCounts[id] ?? 0) > 0)
              .length,
          directAddCompletionDelta:
              (ownedCounts[cardPrintId] ?? 0) > 0 ||
                  !entry.value.contains(cardPrintId)
              ? 0
              : 1,
        ),
    });
  }

  static Future<void> _emitInterestGraphCompletionCrossings({
    required SupabaseClient client,
    required String userId,
    required String cardPrintId,
    String? cardPrintingId,
    required Map<String, _InterestGraphCompletionSnapshot> previous,
  }) async {
    try {
      // The add endpoint always creates a direct instance for this exact card.
      // The pre-snapshot retains the target's completion delta, so a second
      // full owner/slab scan after the write is unnecessary.
      final next = <String, _InterestGraphCompletionSnapshot>{
        for (final entry in previous.entries)
          entry.key: entry.value.afterDirectAdd(),
      };
      final crossedEntries = next.entries
          .where(
            (entry) =>
                entry.value.completionPercent >
                (previous[entry.key]?.completionPercent ?? 0),
          )
          .toList(growable: false);
      if (crossedEntries.isEmpty) {
        return;
      }

      final metadataResults =
          await Future.wait<Map<String, Map<String, dynamic>>>([
            _loadInterestGraphCompletionMetadata(
              client: client,
              table: 'pokemon_species',
              columns: 'id,slug,display_name',
              subjectIds: crossedEntries
                  .where((entry) => entry.value.subjectType == 'character')
                  .map((entry) => entry.value.subjectId),
            ),
            _loadInterestGraphCompletionMetadata(
              client: client,
              table: 'sets',
              columns: 'id,code,name',
              subjectIds: crossedEntries
                  .where((entry) => entry.value.subjectType == 'set')
                  .map((entry) => entry.value.subjectId),
            ),
          ]);
      final speciesById = metadataResults[0];
      final setsById = metadataResults[1];

      for (final entry in crossedEntries) {
        final priorPercent = previous[entry.key]?.completionPercent ?? 0;
        final nextSnapshot = entry.value;
        await client.rpc(
          'card_events_emit_completion_crossings_v1',
          params: {
            'p_user_id': userId,
            'p_subject_type': nextSnapshot.subjectType,
            'p_subject_id': nextSnapshot.subjectId,
            'p_previous_percent': priorPercent,
            'p_next_percent': nextSnapshot.completionPercent,
            'p_payload': _interestGraphCompletionPayload(
              snapshot: nextSnapshot,
              cardPrintId: cardPrintId,
              speciesById: speciesById,
              setsById: setsById,
            ),
          },
        );
      }
    } catch (error) {
      debugPrint('interest_graph.completion_crossing.failed: $error');
    }
  }

  static Future<Map<String, Map<String, dynamic>>>
  _loadInterestGraphCompletionMetadata({
    required SupabaseClient client,
    required String table,
    required String columns,
    required Iterable<String> subjectIds,
  }) async {
    final ids = subjectIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (ids.isEmpty) {
      return const <String, Map<String, dynamic>>{};
    }

    try {
      final response = await client
          .from(table)
          .select(columns)
          .inFilter('id', ids);
      final byId = <String, Map<String, dynamic>>{};
      for (final value in response) {
        final row = Map<String, dynamic>.from(value);
        final id = _trimmedOrNull(row['id']);
        if (id != null) {
          byId[id] = row;
        }
      }
      return byId;
    } catch (error) {
      debugPrint('interest_graph.completion_metadata.failed: $error');
      return const <String, Map<String, dynamic>>{};
    }
  }

  static Map<String, dynamic> _interestGraphCompletionPayload({
    required _InterestGraphCompletionSnapshot snapshot,
    required String cardPrintId,
    required Map<String, Map<String, dynamic>> speciesById,
    required Map<String, Map<String, dynamic>> setsById,
  }) {
    final payload = <String, dynamic>{
      'card_print_id': cardPrintId,
      'source': 'vault_add',
    };

    if (snapshot.subjectType == 'character') {
      final species = speciesById[snapshot.subjectId];
      final slug = _trimmedOrNull(species?['slug'])?.toLowerCase();
      final displayName = _trimmedOrNull(species?['display_name']);
      payload['species_id'] = snapshot.subjectId;
      payload['character_id'] = snapshot.subjectId;
      if (displayName != null) {
        payload['character_name'] = displayName;
        payload['subject_label'] = displayName;
      }
      if (slug != null) {
        payload['species_slug'] = slug;
        payload['completion_route'] = '/dex/${Uri.encodeComponent(slug)}';
      }
      return payload;
    }

    if (snapshot.subjectType == 'set') {
      final set = setsById[snapshot.subjectId];
      final code = _trimmedOrNull(set?['code']);
      final name = _trimmedOrNull(set?['name']);
      payload['set_id'] = snapshot.subjectId;
      if (code != null) {
        payload['set_code'] = code;
        payload['completion_route'] = '/set/${Uri.encodeComponent(code)}';
      }
      if (name != null) {
        payload['set_name'] = name;
        payload['subject_label'] = name;
      }
    }
    return payload;
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
      fallbackOwnedCount: 0,
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
      fallbackOwnedCount: fallbackOwnedCount,
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

    // LOCK: Grouped card row section assignment is exact-copy only.
    // LOCK: Do not write shared_cards or grouped vault_items.
    await client.rpc(
      'vault_set_copy_section_memberships_v1',
      params: {
        'p_instance_ids': [normalizedInstanceId],
        'p_section_id': normalizedSectionId,
        'p_add': true,
      },
    );
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
    await client.rpc(
      'vault_set_copy_section_memberships_v1',
      params: {
        'p_instance_ids': [normalizedInstanceId],
        'p_section_id': normalizedSectionId,
        'p_add': false,
      },
    );
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

    // LOCK: Bulk grouped-card section assignment is exact-copy only.
    // LOCK: Bulk grouped-card section removal is exact-copy only.
    // LOCK: Do not write shared_cards or grouped vault_items.
    await client.rpc(
      'vault_set_copy_section_memberships_v1',
      params: {
        'p_instance_ids': normalizedInstanceIds,
        'p_section_id': normalizedSectionId,
        'p_add': add,
      },
    );
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
    required int fallbackOwnedCount,
  }) async {
    try {
      final rawRows = await client.rpc(
        'vault_mobile_card_copies_v1',
        params: {
          'p_card_print_id': cardPrintId,
          'p_vault_item_id': _trimmedOrNull(vaultItemId),
        },
      );
      if (rawRows is List && rawRows.isNotEmpty) {
        final copies = rawRows
            .whereType<Map>()
            .map(
              (row) =>
                  VaultManageCardCopy.fromJson(Map<String, dynamic>.from(row)),
            )
            .where((copy) => copy.instanceId.isNotEmpty)
            .toList();
        if (fallbackOwnedCount <= 0 || copies.length >= fallbackOwnedCount) {
          return copies;
        }
      }
    } catch (_) {
      // The RPC is a convenience read model. The authoritative copy rows live
      // in vault_item_instances, so stale grouped anchors must not make the
      // mobile Copies tab look empty.
    }

    return _loadManageCardCopiesFromInstances(
      client: client,
      cardPrintId: cardPrintId,
    );
  }

  static Future<List<VaultManageCardCopy>> _loadManageCardCopiesFromInstances({
    required SupabaseClient client,
    required String cardPrintId,
  }) async {
    final userId = client.auth.currentUser?.id;
    final normalizedCardPrintId = _trimmedOrNull(cardPrintId);
    if (userId == null || userId.isEmpty || normalizedCardPrintId == null) {
      return const <VaultManageCardCopy>[];
    }

    // LOCK: Manage card Copies tab falls back to exact-copy instance rows by
    // card_print_id. Do not require legacy vault_items anchors for editing.
    final rawRows = await client
        .from('vault_item_instances')
        .select(
          'id,gv_vi_id,condition_label,intent,notes,created_at,grade_company,grade_value,grade_label,slab_cert_id',
        )
        .eq('user_id', userId)
        .eq('card_print_id', normalizedCardPrintId)
        .filter('archived_at', 'is', null)
        .order('created_at', ascending: false);

    if (rawRows.isEmpty) {
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
