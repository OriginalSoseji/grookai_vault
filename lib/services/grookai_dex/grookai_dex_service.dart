import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../utils/display_image_contract.dart';
import '../vault/vault_card_service.dart';

@visibleForTesting
Future<List<T>> retryNonEmptyDexCatalogRead<T>({
  required Future<List<T>> Function() read,
  int maxAttempts = 2,
  Duration retryDelay = const Duration(milliseconds: 250),
}) async {
  final attempts = maxAttempts < 1 ? 1 : maxAttempts;
  for (var attempt = 0; attempt < attempts; attempt += 1) {
    final rows = await read();
    if (rows.isNotEmpty) {
      return rows;
    }
    if (attempt + 1 < attempts && retryDelay > Duration.zero) {
      await Future<void>.delayed(retryDelay);
    }
  }
  throw StateError('Grookai Dex species catalog returned no rows.');
}

@visibleForTesting
Future<List<T>> fetchDexPagedRowsInWindows<T>({
  required Future<List<T>> Function(int offset, int pageSize) readPage,
  int pageSize = 1000,
  int windowSize = 2,
}) async {
  if (pageSize < 1) {
    throw ArgumentError.value(pageSize, 'pageSize', 'Must be positive.');
  }
  if (windowSize < 1) {
    throw ArgumentError.value(windowSize, 'windowSize', 'Must be positive.');
  }

  final rows = <T>[];
  var windowOffset = 0;
  while (true) {
    final pages = await Future.wait<List<T>>([
      for (var index = 0; index < windowSize; index += 1)
        readPage(windowOffset + (index * pageSize), pageSize),
    ]);

    var reachedEnd = false;
    for (final page in pages) {
      rows.addAll(page);
      if (page.length < pageSize) {
        reachedEnd = true;
        break;
      }
    }
    if (reachedEnd) {
      return rows;
    }
    windowOffset += pageSize * windowSize;
  }
}

class GrookaiDexSpeciesSummary {
  const GrookaiDexSpeciesSummary({
    required this.speciesId,
    required this.nationalDexNumber,
    required this.displayName,
    required this.slug,
    required this.types,
    required this.generation,
    required this.totalPrintCount,
    required this.ownedPrintCount,
    required this.ownedCopyCount,
  });

  final String speciesId;
  final int nationalDexNumber;
  final String displayName;
  final String slug;
  final List<String> types;
  final int? generation;
  final int totalPrintCount;
  final int ownedPrintCount;
  final int ownedCopyCount;

  int get completionPercent => totalPrintCount <= 0
      ? 0
      : ((ownedPrintCount / totalPrintCount) * 100).round().clamp(0, 100);
}

class GrookaiDexSpeciesPage {
  const GrookaiDexSpeciesPage({
    required this.species,
    required this.allSpecies,
    required this.page,
    required this.pageSize,
    required this.hasNextPage,
  });

  final List<GrookaiDexSpeciesSummary> species;
  final List<GrookaiDexSpeciesSummary> allSpecies;
  final int page;
  final int pageSize;
  final bool hasNextPage;
}

class GrookaiDexPrintingOption {
  const GrookaiDexPrintingOption({
    required this.id,
    required this.finishName,
    this.printingGvId,
    this.finishKey,
    this.ownedCount = 0,
  });

  final String id;
  final String finishName;
  final String? printingGvId;
  final String? finishKey;
  final int ownedCount;
}

class GrookaiDexCardPrint {
  const GrookaiDexCardPrint({
    required this.cardPrintId,
    required this.name,
    required this.role,
    required this.countsForCompletion,
    required this.ownedCount,
    required this.printings,
    this.unassignedPrintingCount = 0,
    this.gvId,
    this.setCode,
    this.setName,
    this.number,
    this.rarity,
    this.variantKey,
    this.printedIdentityModifier,
    this.exactImageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
    this.imageUrl,
  });

  final String cardPrintId;
  final String? gvId;
  final String name;
  final String? setCode;
  final String? setName;
  final String? number;
  final String? rarity;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? exactImageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
  final String? imageUrl;
  final String role;
  final bool countsForCompletion;
  final int ownedCount;
  final int unassignedPrintingCount;
  final List<GrookaiDexPrintingOption> printings;

  String? get hostedImageUrl => buildCanonicalCardImageUrl(gvId);

  String? get providerFallbackImageUrl {
    final fallback = normalizeDisplayImageUrl(imageUrl);
    return fallback == hostedImageUrl ? null : fallback;
  }

  bool get isOwned => ownedCount > 0;
  int get assignedPrintingCopyCount =>
      printings.fold<int>(0, (sum, option) => sum + option.ownedCount);
  bool get needsPrintingSelection => unassignedPrintingCount > 0;
  int get totalOptionCount => printings.isEmpty ? 1 : printings.length;
  int get ownedOptionCount => printings.isEmpty
      ? (isOwned ? 1 : 0)
      : printings.where((option) => option.ownedCount > 0).length;
  int get missingOptionCount =>
      (totalOptionCount - ownedOptionCount).clamp(0, totalOptionCount);
}

class GrookaiDexSpeciesDetail {
  const GrookaiDexSpeciesDetail({
    required this.speciesId,
    required this.slug,
    required this.displayName,
    required this.nationalDexNumber,
    required this.cards,
  });

  final String speciesId;
  final String slug;
  final String displayName;
  final int nationalDexNumber;
  final List<GrookaiDexCardPrint> cards;

  List<GrookaiDexCardPrint> get completionCards =>
      cards.where((card) => card.countsForCompletion).toList(growable: false);
  List<GrookaiDexCardPrint> get cameoCards => cards
      .where(
        (card) =>
            !card.countsForCompletion &&
            card.role.trim().toLowerCase() == 'cameo',
      )
      .toList(growable: false);
  List<GrookaiDexCardPrint> get additionalCards => cards
      .where(
        (card) =>
            !card.countsForCompletion &&
            card.role.trim().toLowerCase() != 'cameo',
      )
      .toList(growable: false);

  int get totalPrintCount => completionCards.length;
  int get ownedPrintCount =>
      completionCards.where((card) => card.isOwned).length;
  int get ownedCopyCount =>
      completionCards.fold<int>(0, (sum, card) => sum + card.ownedCount);
  int get completionPercent => totalPrintCount <= 0
      ? 0
      : ((ownedPrintCount / totalPrintCount) * 100).round().clamp(0, 100);
  int get variantOptionCount =>
      completionCards.fold<int>(0, (sum, card) => sum + card.totalOptionCount);
  int get ownedVariantOptionCount =>
      completionCards.fold<int>(0, (sum, card) => sum + card.ownedOptionCount);
  int get missingVariantOptionCount =>
      (variantOptionCount - ownedVariantOptionCount).clamp(
        0,
        variantOptionCount,
      );
}

class GrookaiDexService {
  static const int defaultPageSize = 100;
  static const String _legendaryTreasuresRc5CardPrintId =
      'efa15a49-a1f9-46b0-bd69-85111388328e';
  static const List<String> _legendaryTreasuresRc5BlockedImagePatterns = [
    '00484a4e28a235d9f4a8edcc',
    'images.pokemontcg.io/bw11/5_hires.png',
  ];

  static Future<GrookaiDexSpeciesPage> fetchSpeciesPage({
    required SupabaseClient client,
    int page = 1,
    int pageSize = defaultPageSize,
  }) async {
    final safePage = page < 1 ? 1 : page;
    final safePageSize = pageSize.clamp(24, 120);
    final from = (safePage - 1) * safePageSize;
    final userId = _clean(client.auth.currentUser?.id);
    late List<Map<String, dynamic>> rawRows;
    late Map<String, int> ownedCounts;
    await Future.wait<void>([
      _fetchAllSpeciesRows(client).then((value) => rawRows = value),
      (userId.isEmpty
              ? Future<Map<String, int>>.value(const <String, int>{})
              : _fetchAllOwnedCounts(client))
          .then((value) => ownedCounts = value),
    ]);
    final baseSpecies = rawRows
        .map(_speciesFromRow)
        .where((row) => row.speciesId.isNotEmpty && row.slug.isNotEmpty)
        .toList(growable: false);

    if (baseSpecies.isEmpty || userId.isEmpty) {
      final visibleSpecies = baseSpecies
          .skip(from)
          .take(safePageSize)
          .toList(growable: false);
      return GrookaiDexSpeciesPage(
        species: visibleSpecies,
        allSpecies: baseSpecies,
        page: safePage,
        pageSize: safePageSize,
        hasNextPage: from + safePageSize < baseSpecies.length,
      );
    }

    // The species view already owns the full-Dex denominator. Start from the
    // collector's small owned set, then fetch only mappings that can affect
    // their progress instead of scanning every completion mapping on entry.
    final completionRows = await _fetchDexCompletionRows(
      client,
      cardPrintIds: ownedCounts.keys,
    );
    final ownedPrintsBySpecies = <String, Set<String>>{};
    final ownedCopiesBySpecies = <String, int>{};
    final seenCompletionPairs = <String>{};
    for (final row in completionRows) {
      final speciesId = _clean(row['species_id']);
      final cardPrintId = _clean(row['card_print_id']);
      final ownedCount = ownedCounts[cardPrintId] ?? 0;
      if (speciesId.isEmpty || cardPrintId.isEmpty || ownedCount <= 0) {
        continue;
      }
      if (!seenCompletionPairs.add('$speciesId:$cardPrintId')) {
        continue;
      }
      (ownedPrintsBySpecies[speciesId] ??= <String>{}).add(cardPrintId);
      ownedCopiesBySpecies[speciesId] =
          (ownedCopiesBySpecies[speciesId] ?? 0) + ownedCount;
    }

    final allSpecies = baseSpecies
        .map(
          (row) => GrookaiDexSpeciesSummary(
            speciesId: row.speciesId,
            nationalDexNumber: row.nationalDexNumber,
            displayName: row.displayName,
            slug: row.slug,
            types: row.types,
            generation: row.generation,
            totalPrintCount: row.totalPrintCount,
            ownedPrintCount: ownedPrintsBySpecies[row.speciesId]?.length ?? 0,
            ownedCopyCount: ownedCopiesBySpecies[row.speciesId] ?? 0,
          ),
        )
        .toList(growable: false);
    final visibleSpecies = allSpecies
        .skip(from)
        .take(safePageSize)
        .toList(growable: false);

    return GrookaiDexSpeciesPage(
      species: visibleSpecies,
      allSpecies: allSpecies,
      page: safePage,
      pageSize: safePageSize,
      hasNextPage: from + safePageSize < allSpecies.length,
    );
  }

  static Future<Set<String>> fetchCardPrintIdsForSpecies({
    required SupabaseClient client,
    required String speciesSlug,
  }) async {
    final slug = speciesSlug.trim().toLowerCase();
    if (slug.isEmpty) {
      return const <String>{};
    }

    const pageSize = 1000;
    final cardPrintIds = <String>{};
    for (var offset = 0; ; offset += pageSize) {
      final data = await client
          .from('v_grookai_dex_card_prints_v1')
          .select('card_print_id')
          .eq('species_slug', slug)
          .eq('mapping_active', true)
          .order('card_print_id', ascending: true)
          .range(offset, offset + pageSize - 1);
      final rows = (data as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(growable: false);
      for (final row in rows) {
        final cardPrintId = _clean(row['card_print_id']);
        if (cardPrintId.isNotEmpty) {
          cardPrintIds.add(cardPrintId);
        }
      }
      if (rows.length < pageSize) {
        break;
      }
    }
    return cardPrintIds;
  }

  static Future<Map<String, int>> _fetchAllOwnedCounts(
    SupabaseClient client,
  ) async {
    late Map<String, int> counts;
    late Map<String, int> slabCounts;
    await Future.wait<void>([
      VaultCardService.getAllOwnedCounts(
        client: client,
      ).then((value) => counts = value),
      _fetchOwnedSlabCounts(client: client).then((value) => slabCounts = value),
    ]);
    for (final entry in slabCounts.entries) {
      counts[entry.key] = (counts[entry.key] ?? 0) + entry.value;
    }
    return counts;
  }

  static Future<Map<String, int>> _fetchOwnedSlabCounts({
    required SupabaseClient client,
    Iterable<String>? cardPrintIds,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    if (userId.isEmpty) {
      return const <String, int>{};
    }

    const pageSize = 1000;
    final slabInstanceCounts = <String, int>{};
    for (var offset = 0; ; offset += pageSize) {
      final data = await client
          .from('vault_item_instances')
          .select('card_print_id,slab_cert_id')
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .filter('card_print_id', 'is', null)
          .order('id', ascending: true)
          .range(offset, offset + pageSize - 1);
      final rows = (data as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(growable: false);
      for (final row in rows) {
        if (_clean(row['card_print_id']).isNotEmpty) {
          continue;
        }
        final slabCertId = _clean(row['slab_cert_id']);
        if (slabCertId.isNotEmpty) {
          slabInstanceCounts[slabCertId] =
              (slabInstanceCounts[slabCertId] ?? 0) + 1;
        }
      }
      if (rows.length < pageSize) {
        break;
      }
    }
    if (slabInstanceCounts.isEmpty) {
      return const <String, int>{};
    }

    final allowedCardPrintIds = cardPrintIds
        ?.map(_clean)
        .where((value) => value.isNotEmpty)
        .toSet();
    final counts = <String, int>{};
    for (final chunk in _chunks(slabInstanceCounts.keys, 250)) {
      final data = await client
          .from('slab_certs')
          .select('id,card_print_id')
          .inFilter('id', chunk);
      for (final raw in data as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final slabCertId = _clean(row['id']);
        final cardPrintId = _clean(row['card_print_id']);
        if (cardPrintId.isEmpty ||
            (allowedCardPrintIds != null &&
                !allowedCardPrintIds.contains(cardPrintId))) {
          continue;
        }
        counts[cardPrintId] =
            (counts[cardPrintId] ?? 0) + (slabInstanceCounts[slabCertId] ?? 0);
      }
    }
    return counts;
  }

  static Future<List<Map<String, dynamic>>> _fetchAllSpeciesRows(
    SupabaseClient client,
  ) {
    return retryNonEmptyDexCatalogRead(
      read: () => _fetchAllSpeciesRowsOnce(client),
    );
  }

  static Future<List<Map<String, dynamic>>> _fetchAllSpeciesRowsOnce(
    SupabaseClient client,
  ) async {
    const chunkSize = 1000;
    return fetchDexPagedRowsInWindows<Map<String, dynamic>>(
      pageSize: chunkSize,
      windowSize: 2,
      readPage: (offset, pageSize) async {
        final data = await client
            .from('v_grookai_dex_species_v1')
            .select(
              'species_id,national_dex_number,display_name,slug,types,generation,total_print_count,active',
            )
            .eq('active', true)
            .order('national_dex_number', ascending: true)
            .range(offset, offset + pageSize - 1);
        return (data as List<dynamic>)
            .map((row) => Map<String, dynamic>.from(row as Map))
            .toList(growable: false);
      },
    );
  }

  static Future<GrookaiDexSpeciesDetail?> fetchSpeciesDetail({
    required SupabaseClient client,
    required String speciesSlug,
  }) async {
    final slug = speciesSlug.trim().toLowerCase();
    if (slug.isEmpty) {
      return null;
    }

    final rawRows = _dedupeSpeciesCardPrintRows(
      await _fetchSpeciesDetailRows(client: client, speciesSlug: slug),
    );
    if (rawRows.isEmpty) {
      return null;
    }

    final cardPrintIds = rawRows
        .map((row) => _clean(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    late Map<String, _CardPrintImageMetadata> imageMetadata;
    late Map<String, int> ownedCounts;
    late Map<String, int> ownedPrintingCounts;
    late Map<String, int> unassignedPrintingCounts;
    late _CardPrintingReadResult cardPrintingData;
    await Future.wait<void>([
      _fetchCardPrintImageMetadata(
        client: client,
        cardPrintIds: cardPrintIds,
      ).then((value) => imageMetadata = value),
      (_clean(client.auth.currentUser?.id).isEmpty
              ? Future<VaultOwnedCardTruth>.value(const VaultOwnedCardTruth())
              : VaultCardService.getOwnedCardTruthIncludingSlabs(
                  client: client,
                  cardPrintIds: cardPrintIds,
                ))
          .then((truth) {
            ownedCounts = truth.countsByCardPrintId;
            ownedPrintingCounts = truth.countsByPrintingId;
            unassignedPrintingCounts = truth.unassignedByCardPrintId;
          }),
      _fetchCardPrintingData(
        client: client,
        cardPrintIds: cardPrintIds,
      ).then((value) => cardPrintingData = value),
    ]);
    final printingsByCardPrintId = cardPrintingData.buildPrintingOptions(
      ownedPrintingCounts,
    );
    final childImageMetadata = cardPrintingData.childImageMetadata;
    final aliasImageFallbacks = _buildAliasImageFallbacks(
      rawRows: rawRows,
      parentImageMetadata: imageMetadata,
      childImageMetadata: childImageMetadata,
    );

    final cards = rawRows
        .map((row) {
          final cardPrintId = _clean(row['card_print_id']);
          final parentImage = imageMetadata[cardPrintId];
          final childImage = childImageMetadata[cardPrintId];
          final aliasImage = aliasImageFallbacks[cardPrintId];
          final sourceBackedFallback = _sourceBackedImageFallback(row);
          final childExactImageUrl =
              _isExactImageStatus(childImage?.imageStatus)
              ? childImage?.imageUrl
              : null;
          final childRepresentativeImageUrl =
              _isRepresentativeImageStatus(childImage?.imageStatus)
              ? childImage?.imageUrl
              : null;
          final resolvedDisplayImage =
              _resolveNonBrokenDisplayImageUrl(row) ??
              aliasImage?.imageUrl ??
              sourceBackedFallback?.imageUrl ??
              normalizeDisplayImageUrl(childImage?.imageUrl);
          final printings =
              printingsByCardPrintId[cardPrintId] ??
              const <GrookaiDexPrintingOption>[];
          return GrookaiDexCardPrint(
            cardPrintId: cardPrintId,
            gvId: _optional(row['gv_id']),
            name: _optional(row['name']) ?? 'Unknown card',
            setCode: _optional(row['set_code']),
            setName: _optional(row['set_name']),
            number: _optional(row['number']),
            rarity: _optional(row['rarity']),
            variantKey: _optional(row['variant_key']),
            printedIdentityModifier: parentImage?.printedIdentityModifier,
            exactImageUrl:
                _resolveNonBrokenImageUrl(parentImage?.imageUrl) ??
                _resolveNonBrokenImageUrl(_optional(row['image_url'])) ??
                aliasImage?.exactImageUrl ??
                sourceBackedFallback?.exactImageUrl ??
                childExactImageUrl,
            representativeImageUrl:
                parentImage?.representativeImageUrl ??
                _optional(row['representative_image_url']) ??
                aliasImage?.representativeImageUrl ??
                sourceBackedFallback?.representativeImageUrl ??
                childRepresentativeImageUrl,
            imageStatus:
                parentImage?.imageStatus ??
                aliasImage?.imageStatus ??
                sourceBackedFallback?.imageStatus ??
                childImage?.imageStatus,
            imageNote:
                parentImage?.imageNote ??
                sourceBackedFallback?.imageNote ??
                childImage?.imageNote,
            imageUrl: resolvedDisplayImage,
            role: _optional(row['role']) ?? 'primary',
            countsForCompletion: row['counts_for_completion'] == true,
            ownedCount: ownedCounts[cardPrintId] ?? 0,
            unassignedPrintingCount: printings.isEmpty
                ? 0
                : unassignedPrintingCounts[cardPrintId] ?? 0,
            printings: printings,
          );
        })
        .toList(growable: false);

    return GrookaiDexSpeciesDetail(
      speciesId: _clean(rawRows.first['species_id']),
      slug: slug,
      displayName: _optional(rawRows.first['species_display_name']) ?? slug,
      nationalDexNumber: _intValue(rawRows.first['national_dex_number']),
      cards: cards,
    );
  }

  static Future<List<Map<String, dynamic>>> _fetchSpeciesDetailRows({
    required SupabaseClient client,
    required String speciesSlug,
  }) async {
    const pageSize = 1000;
    final rows = <Map<String, dynamic>>[];
    for (var offset = 0; ; offset += pageSize) {
      final data = await client
          .from('v_grookai_dex_card_prints_v1')
          .select(
            'species_id,species_slug,species_display_name,national_dex_number,card_print_id,gv_id,name,set_code,set_name,number,rarity,variant_key,image_url,image_alt_url,representative_image_url,role,counts_for_completion,mapping_active',
          )
          .eq('species_slug', speciesSlug)
          .eq('mapping_active', true)
          .order('set_name', ascending: true)
          .order('number', ascending: true)
          .order('card_print_id', ascending: true)
          .order('role', ascending: true)
          .range(offset, offset + pageSize - 1);
      final page = (data as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList(growable: false);
      rows.addAll(page);
      if (page.length < pageSize) {
        break;
      }
    }
    return rows;
  }

  static List<Map<String, dynamic>> _dedupeSpeciesCardPrintRows(
    Iterable<Map<String, dynamic>> rows,
  ) {
    final selectedByCardPrintId = <String, Map<String, dynamic>>{};
    for (final row in rows) {
      final cardPrintId = _clean(row['card_print_id']);
      if (cardPrintId.isEmpty) {
        continue;
      }
      final current = selectedByCardPrintId[cardPrintId];
      if (current == null ||
          _dexRolePriority(_optional(row['role'])) <
              _dexRolePriority(_optional(current['role']))) {
        selectedByCardPrintId[cardPrintId] = Map<String, dynamic>.from(row)
          ..['counts_for_completion'] =
              row['counts_for_completion'] == true ||
              current?['counts_for_completion'] == true;
      } else if (row['counts_for_completion'] == true) {
        current['counts_for_completion'] = true;
      }
    }
    return selectedByCardPrintId.values.toList(growable: false)
      ..sort((left, right) {
        final setOrder = _clean(
          left['set_name'],
        ).compareTo(_clean(right['set_name']));
        if (setOrder != 0) {
          return setOrder;
        }
        final numberOrder = _clean(
          left['number'],
        ).compareTo(_clean(right['number']));
        return numberOrder != 0
            ? numberOrder
            : _clean(
                left['card_print_id'],
              ).compareTo(_clean(right['card_print_id']));
      });
  }

  static int _dexRolePriority(String? role) {
    switch ((role ?? '').trim().toLowerCase()) {
      case 'primary':
        return 0;
      case 'form_subject':
        return 1;
      case 'tag_team':
        return 2;
      case 'multi_subject':
        return 3;
      case 'trainer_owned':
        return 4;
      case 'manual_override':
        return 5;
      case 'cameo':
        return 6;
      default:
        return 7;
    }
  }

  static GrookaiDexSpeciesSummary _speciesFromRow(Map<String, dynamic> row) {
    final rawTypes = row['types'];
    return GrookaiDexSpeciesSummary(
      speciesId: _clean(row['species_id']),
      nationalDexNumber: _intValue(row['national_dex_number']),
      displayName: _optional(row['display_name']) ?? 'Unknown Pokemon',
      slug: _clean(row['slug']),
      types: rawTypes is List
          ? rawTypes
                .map((value) => _clean(value))
                .where((value) => value.isNotEmpty)
                .toList(growable: false)
          : const <String>[],
      generation: _nullableIntValue(row['generation']),
      totalPrintCount: _intValue(row['total_print_count']),
      ownedPrintCount: 0,
      ownedCopyCount: 0,
    );
  }

  static Future<List<Map<String, dynamic>>> _fetchDexCompletionRows(
    SupabaseClient client, {
    required Iterable<String> cardPrintIds,
  }) async {
    const chunkSize = 1000;
    final rows = <Map<String, dynamic>>[];
    for (final cardPrintIdChunk in _chunks(cardPrintIds, 250)) {
      for (var offset = 0; ; offset += chunkSize) {
        final data = await client
            .from('card_print_species')
            .select('id,species_id,card_print_id')
            .eq('active', true)
            .eq('counts_for_completion', true)
            .inFilter('card_print_id', cardPrintIdChunk)
            .order('id', ascending: true)
            .range(offset, offset + chunkSize - 1);
        final chunk = (data as List<dynamic>)
            .map((row) => Map<String, dynamic>.from(row as Map))
            .toList(growable: false);
        rows.addAll(chunk);
        if (chunk.length < chunkSize) {
          break;
        }
      }
    }
    return rows;
  }

  static Future<Map<String, _CardPrintImageMetadata>>
  _fetchCardPrintImageMetadata({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final values = <String, _CardPrintImageMetadata>{};
    for (final chunk in _chunks(cardPrintIds, 250)) {
      final data = await client
          .from('card_prints')
          .select(
            'id,printed_identity_modifier,image_url,representative_image_url,image_status,image_note',
          )
          .inFilter('id', chunk);
      for (final raw in data) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = _clean(row['id']);
        if (id.isNotEmpty) {
          values[id] = _CardPrintImageMetadata(
            printedIdentityModifier: _optional(
              row['printed_identity_modifier'],
            ),
            imageUrl: _optional(row['image_url']),
            representativeImageUrl: _optional(row['representative_image_url']),
            imageStatus: _optional(row['image_status']),
            imageNote: _optional(row['image_note']),
          );
        }
      }
    }
    return values;
  }

  static Future<_CardPrintingReadResult> _fetchCardPrintingData({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    const pageSize = 1000;
    final optionsByCardPrintId = <String, List<_SortablePrintingOption>>{};
    final childImageMetadata = <String, _CardPrintChildImageMetadata>{};
    for (final chunk in _chunks(cardPrintIds, 250)) {
      for (var offset = 0; ; offset += pageSize) {
        late final List<dynamic> data;
        try {
          data =
              await client
                      .from('card_printings')
                      .select(
                        'id,card_print_id,printing_gv_id,finish_key,finish_keys(label,sort_order),image_path,image_url,image_alt_url,image_status,image_note',
                      )
                      .inFilter('card_print_id', chunk)
                      .order('id', ascending: true)
                      .range(offset, offset + pageSize - 1)
                  as List<dynamic>;
        } catch (_) {
          try {
            data =
                await client
                        .from('card_printings')
                        .select(
                          'id,card_print_id,printing_gv_id,finish_key,image_path,image_url,image_alt_url,image_status,image_note',
                        )
                        .inFilter('card_print_id', chunk)
                        .order('id', ascending: true)
                        .range(offset, offset + pageSize - 1)
                    as List<dynamic>;
          } catch (_) {
            try {
              data =
                  await client
                          .from('card_printings')
                          .select('id,card_print_id,printing_gv_id,finish_key')
                          .inFilter('card_print_id', chunk)
                          .order('id', ascending: true)
                          .range(offset, offset + pageSize - 1)
                      as List<dynamic>;
            } catch (_) {
              return _CardPrintingReadResult(
                optionsByCardPrintId: optionsByCardPrintId,
                childImageMetadata: childImageMetadata,
              );
            }
          }
        }
        for (final raw in data) {
          final row = Map<String, dynamic>.from(raw as Map);
          final id = _clean(row['id']);
          final cardPrintId = _clean(row['card_print_id']);
          if (id.isEmpty || cardPrintId.isEmpty) {
            continue;
          }

          final finishRecord = _firstNestedRecord(row['finish_keys']);
          final finishName =
              _finishLabel(
                finishKey: _optional(row['finish_key']),
                finishLabel: _optional(finishRecord?['label']),
              ) ??
              'Standard';
          (optionsByCardPrintId[cardPrintId] ??= <_SortablePrintingOption>[])
              .add(
                _SortablePrintingOption(
                  option: GrookaiDexPrintingOption(
                    id: id,
                    printingGvId: _optional(row['printing_gv_id']),
                    finishKey: _optional(row['finish_key']),
                    finishName: finishName,
                  ),
                  sortOrder: _intValue(
                    finishRecord?['sort_order'],
                    fallback: 9999,
                  ),
                ),
              );
          if (_isKnownWrongLegendaryTreasuresRc5ChildImage(row)) {
            continue;
          }

          final metadata = _CardPrintChildImageMetadata(
            finishKey: _optional(row['finish_key']),
            imageUrl:
                normalizeWarehouseDisplayImagePath(row['image_path']) ??
                normalizeDisplayImageUrl(row['image_url']) ??
                normalizeDisplayImageUrl(row['image_alt_url']),
            imageStatus: _optional(row['image_status']),
            imageNote: _optional(row['image_note']),
          );
          if ((metadata.imageUrl ?? '').isEmpty) {
            continue;
          }

          final current = childImageMetadata[cardPrintId];
          if (current == null ||
              _childImagePreference(metadata) >
                  _childImagePreference(current)) {
            childImageMetadata[cardPrintId] = metadata;
          }
        }
        if (data.length < pageSize) {
          break;
        }
      }
    }
    return _CardPrintingReadResult(
      optionsByCardPrintId: optionsByCardPrintId,
      childImageMetadata: childImageMetadata,
    );
  }

  static bool _isKnownWrongLegendaryTreasuresRc5ChildImage(
    Map<String, dynamic> row,
  ) {
    final cardPrintId = _clean(row['card_print_id']).toLowerCase();
    final printingGvId = _clean(row['printing_gv_id']).toLowerCase();
    final isRc5Torchic =
        cardPrintId == _legendaryTreasuresRc5CardPrintId ||
        printingGvId.startsWith('gv-pk-ltr-rc5-');
    if (!isRc5Torchic) {
      return false;
    }

    return _legendaryTreasuresRc5BlockedImagePatterns.any((pattern) {
      final normalizedPattern = pattern.toLowerCase();
      return _clean(
            row['image_path'],
          ).toLowerCase().contains(normalizedPattern) ||
          _clean(row['image_url']).toLowerCase().contains(normalizedPattern) ||
          _clean(
            row['image_alt_url'],
          ).toLowerCase().contains(normalizedPattern);
    });
  }

  static Map<String, _CardPrintAliasImageFallback> _buildAliasImageFallbacks({
    required Iterable<Map<String, dynamic>> rawRows,
    required Map<String, _CardPrintImageMetadata> parentImageMetadata,
    required Map<String, _CardPrintChildImageMetadata> childImageMetadata,
  }) {
    final candidatesByAlias = <String, _CardPrintAliasImageFallback>{};
    final cardAliasKeys = <String, String>{};
    final cardCurrentUrls = <String, String?>{};

    for (final row in rawRows) {
      final cardPrintId = _clean(row['card_print_id']);
      final aliasKey = _imageAliasKey(row);
      if (cardPrintId.isEmpty || aliasKey == null) {
        continue;
      }

      cardAliasKeys[cardPrintId] = aliasKey;
      final parentImage = parentImageMetadata[cardPrintId];
      final childImage = childImageMetadata[cardPrintId];
      final displayUrl =
          _resolveNonBrokenDisplayImageUrl(row) ??
          normalizeDisplayImageUrl(childImage?.imageUrl);
      cardCurrentUrls[cardPrintId] = displayUrl;
      if (displayUrl == null) {
        continue;
      }

      final fallback = _CardPrintAliasImageFallback(
        imageUrl: displayUrl,
        exactImageUrl: _isExactImageStatus(parentImage?.imageStatus)
            ? displayUrl
            : null,
        representativeImageUrl:
            _isRepresentativeImageStatus(parentImage?.imageStatus)
            ? displayUrl
            : null,
        imageStatus: parentImage?.imageStatus,
      );
      candidatesByAlias.putIfAbsent(aliasKey, () => fallback);
    }

    final fallbacks = <String, _CardPrintAliasImageFallback>{};
    for (final entry in cardAliasKeys.entries) {
      final currentUrl = cardCurrentUrls[entry.key];
      if (currentUrl != null && !_isKnownBrokenImageUrl(currentUrl)) {
        continue;
      }
      final fallback = candidatesByAlias[entry.value];
      if (fallback != null) {
        fallbacks[entry.key] = fallback;
      }
    }
    return fallbacks;
  }

  static String? _imageAliasKey(Map<String, dynamic> row) {
    final setCode = _clean(row['set_code']).toLowerCase();
    final name = _clean(row['name']).toLowerCase();
    final number = _clean(row['number']).toLowerCase();
    if (name.isEmpty || number.isEmpty) {
      return null;
    }

    if (setCode == 'tk-ex-latia' || setCode == 'tk1a') {
      return 'trainer-kit-latias|$name|$number';
    }
    if (setCode == '2021swsh' || setCode == 'mcd21') {
      return 'mcdonalds-2021|$name|$number';
    }
    return null;
  }

  static _CardPrintAliasImageFallback? _sourceBackedImageFallback(
    Map<String, dynamic> row,
  ) {
    final setCode = _clean(row['set_code']).toLowerCase();
    final number = _clean(row['number']).toLowerCase();
    final name = _clean(row['name']).toLowerCase();

    if (setCode == 'ex5.5' && number == '3' && name == 'torchic') {
      const imageUrl =
          'https://archives.bulbagarden.net/media/upload/5/57/TorchicCreatorContest3.png';
      return const _CardPrintAliasImageFallback(
        imageUrl: imageUrl,
        exactImageUrl: imageUrl,
        imageStatus: 'exact',
        imageNote:
            'Source-backed fallback: Bulbagarden Archives Torchic Creator Contest 3 image.',
      );
    }

    if (setCode == '2021swsh') {
      final numericNumber = int.tryParse(number);
      if (numericNumber != null && numericNumber >= 1 && numericNumber <= 25) {
        final imageUrl =
            'https://images.pokemontcg.io/mcd21/$numericNumber'
            '_hires.png';
        return _CardPrintAliasImageFallback(
          imageUrl: imageUrl,
          exactImageUrl: imageUrl,
          imageStatus: 'exact',
          imageNote:
              "Source-backed replacement: PokemonTCG mcd21 image used for McDonald's Collection 2021 because the TCGdex 2021swsh asset URL returns 404.",
        );
      }
    }

    const pokemonTcgTrainerKitAliases = <String, String>{
      'tk-ex-latia': 'tk1a',
      'tk-ex-m': 'tk2b',
      'tk-ex-p': 'tk2a',
      'tk2b': 'tk2b',
    };
    final trainerKitPokemonTcgSetCode = pokemonTcgTrainerKitAliases[setCode];
    if (trainerKitPokemonTcgSetCode != null) {
      final numericNumber = int.tryParse(number);
      if (numericNumber != null) {
        final imageUrl =
            'https://images.pokemontcg.io/$trainerKitPokemonTcgSetCode/$numericNumber'
            '_hires.png';
        return _CardPrintAliasImageFallback(
          imageUrl: imageUrl,
          exactImageUrl: imageUrl,
          imageStatus: 'exact',
          imageNote:
              'Source-backed replacement: PokemonTCG image used because the TCGdex asset URL returns 404.',
        );
      }
    }

    return null;
  }

  static String? _resolveNonBrokenDisplayImageUrl(Map<String, dynamic> row) {
    return _resolveNonBrokenImageUrl(resolveDisplayImageUrlFromRow(row));
  }

  static String? _resolveNonBrokenImageUrl(String? url) {
    final normalized = normalizeDisplayImageUrl(url);
    if (normalized == null || _isKnownBrokenImageUrl(normalized)) {
      return null;
    }
    return normalized;
  }

  static bool _isKnownBrokenImageUrl(String? url) {
    final normalized = _clean(url).toLowerCase();
    if (normalized.isEmpty) {
      return false;
    }

    return normalized.contains('assets.tcgdex.net/en/tk/') ||
        normalized.contains('assets.tcgdex.net/en/mc/2021swsh/') ||
        normalized.contains('assets.tcgdex.net/en/ex/ex5.5/');
  }

  static bool _isExactImageStatus(String? status) {
    final normalized = _clean(status).toLowerCase();
    return normalized == 'exact' || normalized == 'exact_parent_image';
  }

  static bool _isRepresentativeImageStatus(String? status) {
    return _clean(status).toLowerCase().startsWith('representative_');
  }

  static int _childImagePreference(_CardPrintChildImageMetadata metadata) {
    var score = 0;
    final status = _clean(metadata.imageStatus).toLowerCase();
    final finishKey = _clean(metadata.finishKey).toLowerCase();
    if (status == 'exact' || status == 'exact_parent_image') {
      score += 40;
    } else if (status.startsWith('representative_')) {
      score += 20;
    }
    if (finishKey == 'normal') {
      score += 8;
    } else if (finishKey == 'holo') {
      score += 6;
    } else if (finishKey == 'reverse') {
      score += 4;
    }
    return score;
  }

  static Map<String, dynamic>? _firstNestedRecord(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    if (value is List && value.isNotEmpty && value.first is Map) {
      return Map<String, dynamic>.from(value.first as Map);
    }
    return null;
  }

  static String? _finishLabel({String? finishKey, String? finishLabel}) {
    switch (_clean(finishKey).toLowerCase()) {
      case 'normal':
        return 'Normal';
      case 'holo':
        return 'Holo';
      case 'reverse':
        return 'Reverse Holo';
      case 'pokeball':
        return 'Poke Ball';
      case 'masterball':
        return 'Master Ball';
    }
    return _optional(finishLabel);
  }

  static List<List<String>> _chunks(Iterable<String> values, int size) {
    final normalized = values
        .map(_clean)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final chunks = <List<String>>[];
    for (var index = 0; index < normalized.length; index += size) {
      chunks.add(
        normalized.sublist(
          index,
          index + size > normalized.length ? normalized.length : index + size,
        ),
      );
    }
    return chunks;
  }

  static int _intValue(dynamic value, {int fallback = 0}) {
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(_clean(value)) ?? fallback;
  }

  static int? _nullableIntValue(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(_clean(value));
  }

  static String? _optional(dynamic value) {
    final cleaned = _clean(value);
    return cleaned.isEmpty ? null : cleaned;
  }

  static String _clean(dynamic value) => (value ?? '').toString().trim();
}

class _SortablePrintingOption {
  const _SortablePrintingOption({
    required this.option,
    required this.sortOrder,
  });

  final GrookaiDexPrintingOption option;
  final int sortOrder;
}

class _CardPrintingReadResult {
  const _CardPrintingReadResult({
    required this.optionsByCardPrintId,
    required this.childImageMetadata,
  });

  final Map<String, List<_SortablePrintingOption>> optionsByCardPrintId;
  final Map<String, _CardPrintChildImageMetadata> childImageMetadata;

  Map<String, List<GrookaiDexPrintingOption>> buildPrintingOptions(
    Map<String, int> ownedCountsByPrintingId,
  ) {
    return optionsByCardPrintId.map((cardPrintId, options) {
      options.sort((left, right) {
        if (left.sortOrder != right.sortOrder) {
          return left.sortOrder.compareTo(right.sortOrder);
        }
        return left.option.finishName.compareTo(right.option.finishName);
      });
      return MapEntry(
        cardPrintId,
        options
            .map((value) {
              final option = value.option;
              return GrookaiDexPrintingOption(
                id: option.id,
                printingGvId: option.printingGvId,
                finishKey: option.finishKey,
                finishName: option.finishName,
                ownedCount: ownedCountsByPrintingId[option.id] ?? 0,
              );
            })
            .toList(growable: false),
      );
    });
  }
}

class _CardPrintImageMetadata {
  const _CardPrintImageMetadata({
    this.printedIdentityModifier,
    this.imageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
  });

  final String? printedIdentityModifier;
  final String? imageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
}

class _CardPrintChildImageMetadata {
  const _CardPrintChildImageMetadata({
    this.finishKey,
    this.imageUrl,
    this.imageStatus,
    this.imageNote,
  });

  final String? finishKey;
  final String? imageUrl;
  final String? imageStatus;
  final String? imageNote;
}

class _CardPrintAliasImageFallback {
  const _CardPrintAliasImageFallback({
    required this.imageUrl,
    this.exactImageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
  });

  final String imageUrl;
  final String? exactImageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
}
