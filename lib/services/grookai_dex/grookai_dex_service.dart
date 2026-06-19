import 'package:supabase_flutter/supabase_flutter.dart';

import '../vault/vault_card_service.dart';

class GrookaiDexSpeciesSummary {
  const GrookaiDexSpeciesSummary({
    required this.speciesId,
    required this.nationalDexNumber,
    required this.displayName,
    required this.slug,
    required this.types,
    required this.totalPrintCount,
    required this.ownedPrintCount,
    required this.ownedCopyCount,
  });

  final String speciesId;
  final int nationalDexNumber;
  final String displayName;
  final String slug;
  final List<String> types;
  final int totalPrintCount;
  final int ownedPrintCount;
  final int ownedCopyCount;

  String? get spriteUrl =>
      GrookaiDexService.spriteUrlForNationalDexNumber(nationalDexNumber);

  int get completionPercent => totalPrintCount <= 0
      ? 0
      : ((ownedPrintCount / totalPrintCount) * 100).round().clamp(0, 100);
}

class GrookaiDexSpeciesPage {
  const GrookaiDexSpeciesPage({
    required this.species,
    required this.page,
    required this.pageSize,
    required this.hasNextPage,
  });

  final List<GrookaiDexSpeciesSummary> species;
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
    this.gvId,
    this.setCode,
    this.setName,
    this.number,
    this.rarity,
    this.variantKey,
    this.printedIdentityModifier,
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
  final String? imageUrl;
  final String role;
  final bool countsForCompletion;
  final int ownedCount;
  final List<GrookaiDexPrintingOption> printings;

  bool get isOwned => ownedCount > 0;
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
  static const String _spriteBaseUrl =
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

  static String? spriteUrlForNationalDexNumber(int nationalDexNumber) {
    if (nationalDexNumber <= 0) {
      return null;
    }
    return '$_spriteBaseUrl/$nationalDexNumber.png';
  }

  static Future<GrookaiDexSpeciesPage> fetchSpeciesPage({
    required SupabaseClient client,
    int page = 1,
    int pageSize = defaultPageSize,
  }) async {
    final safePage = page < 1 ? 1 : page;
    final safePageSize = pageSize.clamp(24, 120);
    final from = (safePage - 1) * safePageSize;
    final to = from + safePageSize;
    final rows = await client
        .from('v_grookai_dex_species_v1')
        .select(
          'species_id,national_dex_number,display_name,slug,types,total_print_count,active',
        )
        .eq('active', true)
        .order('national_dex_number', ascending: true)
        .range(from, to);

    final rawRows = (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    final visibleRows = rawRows.take(safePageSize).toList(growable: false);
    final species = visibleRows
        .map(_speciesFromRow)
        .where((row) => row.speciesId.isNotEmpty && row.slug.isNotEmpty)
        .toList(growable: false);

    if (species.isEmpty || _clean(client.auth.currentUser?.id).isEmpty) {
      return GrookaiDexSpeciesPage(
        species: species,
        page: safePage,
        pageSize: safePageSize,
        hasNextPage: rawRows.length > safePageSize,
      );
    }

    final mappings = await _fetchSpeciesMappings(
      client: client,
      speciesIds: species.map((row) => row.speciesId),
    );
    final cardPrintIds = mappings
        .map((row) => _clean(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final ownedCounts = await VaultCardService.getOwnedCountsByCardPrintIds(
      client: client,
      cardPrintIds: cardPrintIds,
    );
    final ownedPrintsBySpecies = <String, Set<String>>{};
    final ownedCopiesBySpecies = <String, int>{};
    for (final row in mappings) {
      final speciesId = _clean(row['species_id']);
      final cardPrintId = _clean(row['card_print_id']);
      final ownedCount = ownedCounts[cardPrintId] ?? 0;
      if (speciesId.isEmpty || cardPrintId.isEmpty || ownedCount <= 0) {
        continue;
      }
      (ownedPrintsBySpecies[speciesId] ??= <String>{}).add(cardPrintId);
      ownedCopiesBySpecies[speciesId] =
          (ownedCopiesBySpecies[speciesId] ?? 0) + ownedCount;
    }

    return GrookaiDexSpeciesPage(
      species: species
          .map(
            (row) => GrookaiDexSpeciesSummary(
              speciesId: row.speciesId,
              nationalDexNumber: row.nationalDexNumber,
              displayName: row.displayName,
              slug: row.slug,
              types: row.types,
              totalPrintCount: row.totalPrintCount,
              ownedPrintCount: ownedPrintsBySpecies[row.speciesId]?.length ?? 0,
              ownedCopyCount: ownedCopiesBySpecies[row.speciesId] ?? 0,
            ),
          )
          .toList(growable: false),
      page: safePage,
      pageSize: safePageSize,
      hasNextPage: rawRows.length > safePageSize,
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

    final rows = await client
        .from('v_grookai_dex_card_prints_v1')
        .select(
          'species_id,species_slug,species_display_name,national_dex_number,card_print_id,gv_id,name,set_code,set_name,number,rarity,variant_key,image_url,image_alt_url,representative_image_url,role,counts_for_completion,mapping_active',
        )
        .eq('species_slug', slug)
        .eq('mapping_active', true)
        .order('set_name', ascending: true)
        .order('number', ascending: true);

    final rawRows = (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .where((row) => _clean(row['card_print_id']).isNotEmpty)
        .toList();
    if (rawRows.isEmpty) {
      return null;
    }

    final cardPrintIds = rawRows
        .map((row) => _clean(row['card_print_id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final identityModifiers = await _fetchPrintedIdentityModifiers(
      client: client,
      cardPrintIds: cardPrintIds,
    );
    final ownedCounts = _clean(client.auth.currentUser?.id).isEmpty
        ? const <String, int>{}
        : await VaultCardService.getOwnedCountsByCardPrintIds(
            client: client,
            cardPrintIds: cardPrintIds,
          );
    final ownedPrintingCounts = await _fetchOwnedPrintingCounts(
      client: client,
      cardPrintIds: cardPrintIds,
    );
    final printingsByCardPrintId = await _fetchPrintingOptions(
      client: client,
      cardPrintIds: cardPrintIds,
      ownedCountsByPrintingId: ownedPrintingCounts,
    );

    final cards = rawRows
        .map((row) {
          final cardPrintId = _clean(row['card_print_id']);
          return GrookaiDexCardPrint(
            cardPrintId: cardPrintId,
            gvId: _optional(row['gv_id']),
            name: _optional(row['name']) ?? 'Unknown card',
            setCode: _optional(row['set_code']),
            setName: _optional(row['set_name']),
            number: _optional(row['number']),
            rarity: _optional(row['rarity']),
            variantKey: _optional(row['variant_key']),
            printedIdentityModifier: identityModifiers[cardPrintId],
            imageUrl:
                _httpUrl(row['image_url']) ??
                _httpUrl(row['image_alt_url']) ??
                _httpUrl(row['representative_image_url']),
            role: _optional(row['role']) ?? 'primary',
            countsForCompletion: row['counts_for_completion'] == true,
            ownedCount: ownedCounts[cardPrintId] ?? 0,
            printings: printingsByCardPrintId[cardPrintId] ?? const [],
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
      totalPrintCount: _intValue(row['total_print_count']),
      ownedPrintCount: 0,
      ownedCopyCount: 0,
    );
  }

  static Future<List<Map<String, dynamic>>> _fetchSpeciesMappings({
    required SupabaseClient client,
    required Iterable<String> speciesIds,
  }) async {
    final rows = <Map<String, dynamic>>[];
    for (final chunk in _chunks(speciesIds, 250)) {
      final data = await client
          .from('card_print_species')
          .select('species_id,card_print_id')
          .eq('active', true)
          .eq('counts_for_completion', true)
          .inFilter('species_id', chunk);
      rows.addAll(
        (data as List<dynamic>).map(
          (row) => Map<String, dynamic>.from(row as Map),
        ),
      );
    }
    return rows;
  }

  static Future<Map<String, String?>> _fetchPrintedIdentityModifiers({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final values = <String, String?>{};
    for (final chunk in _chunks(cardPrintIds, 250)) {
      final data = await client
          .from('card_prints')
          .select('id,printed_identity_modifier')
          .inFilter('id', chunk);
      for (final raw in data) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = _clean(row['id']);
        if (id.isNotEmpty) {
          values[id] = _optional(row['printed_identity_modifier']);
        }
      }
    }
    return values;
  }

  static Future<Map<String, int>> _fetchOwnedPrintingCounts({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final userId = _clean(client.auth.currentUser?.id);
    if (userId.isEmpty) {
      return const <String, int>{};
    }

    final counts = <String, int>{};
    for (final chunk in _chunks(cardPrintIds, 250)) {
      late final List<dynamic> data;
      try {
        data =
            await client
                    .from('vault_item_instances')
                    .select('card_printing_id')
                    .eq('user_id', userId)
                    .filter('archived_at', 'is', null)
                    .inFilter('card_print_id', chunk)
                as List<dynamic>;
      } catch (_) {
        return counts;
      }
      for (final raw in data) {
        final row = Map<String, dynamic>.from(raw as Map);
        final printingId = _clean(row['card_printing_id']);
        if (printingId.isNotEmpty) {
          counts[printingId] = (counts[printingId] ?? 0) + 1;
        }
      }
    }
    return counts;
  }

  static Future<Map<String, List<GrookaiDexPrintingOption>>>
  _fetchPrintingOptions({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
    required Map<String, int> ownedCountsByPrintingId,
  }) async {
    final values = <String, List<_SortablePrintingOption>>{};
    for (final chunk in _chunks(cardPrintIds, 250)) {
      late final List<dynamic> data;
      try {
        data =
            await client
                    .from('card_printings')
                    .select(
                      'id,card_print_id,printing_gv_id,finish_key,finish_keys(label,sort_order)',
                    )
                    .inFilter('card_print_id', chunk)
                as List<dynamic>;
      } catch (_) {
        try {
          data =
              await client
                      .from('card_printings')
                      .select('id,card_print_id,printing_gv_id,finish_key')
                      .inFilter('card_print_id', chunk)
                  as List<dynamic>;
        } catch (_) {
          return values.map((cardPrintId, options) {
            return MapEntry(
              cardPrintId,
              options.map((value) => value.option).toList(growable: false),
            );
          });
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
        (values[cardPrintId] ??= <_SortablePrintingOption>[]).add(
          _SortablePrintingOption(
            option: GrookaiDexPrintingOption(
              id: id,
              printingGvId: _optional(row['printing_gv_id']),
              finishKey: _optional(row['finish_key']),
              finishName: finishName,
              ownedCount: ownedCountsByPrintingId[id] ?? 0,
            ),
            sortOrder: _intValue(finishRecord?['sort_order'], fallback: 9999),
          ),
        );
      }
    }

    return values.map((cardPrintId, options) {
      options.sort((left, right) {
        if (left.sortOrder != right.sortOrder) {
          return left.sortOrder.compareTo(right.sortOrder);
        }
        return left.option.finishName.compareTo(right.option.finishName);
      });
      return MapEntry(
        cardPrintId,
        options.map((value) => value.option).toList(growable: false),
      );
    });
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

  static String? _optional(dynamic value) {
    final cleaned = _clean(value);
    return cleaned.isEmpty ? null : cleaned;
  }

  static String? _httpUrl(dynamic value) {
    final url = _clean(value);
    final parsed = Uri.tryParse(url);
    if (parsed == null ||
        (parsed.scheme != 'http' && parsed.scheme != 'https')) {
      return null;
    }
    return url;
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
