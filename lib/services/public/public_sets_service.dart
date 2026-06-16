import 'package:supabase_flutter/supabase_flutter.dart';

import 'card_surface_pricing_service.dart';
import '../vault/vault_card_service.dart';

class PublicSetSummary {
  const PublicSetSummary({
    required this.code,
    required this.name,
    required this.cardCount,
    this.heroImageUrl,
    this.printedSetAbbrev,
    this.printedTotal,
    this.releaseDate,
    this.sortDate,
    this.releaseYear,
  });

  final String code;
  final String name;
  final int cardCount;
  final String? heroImageUrl;
  final String? printedSetAbbrev;
  final int? printedTotal;
  final String? releaseDate;
  final String? sortDate;
  final int? releaseYear;
}

class PublicSetCard {
  const PublicSetCard({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.number,
    this.ownedCount = 0,
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
    this.rarity,
    this.imageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
    this.displayImageUrl,
    this.displayImageKind,
    this.printings = const <PublicSetPrintingOption>[],
    this.pricing,
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String number;
  final int ownedCount;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final String? rarity;
  final String? imageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
  final String? displayImageUrl;
  final String? displayImageKind;
  final List<PublicSetPrintingOption> printings;
  final CardSurfacePricingData? pricing;
}

class PublicSetPrintingOption {
  const PublicSetPrintingOption({
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

class PublicSetMasterSetStats {
  const PublicSetMasterSetStats({
    required this.parentPrintCount,
    required this.variantOptionCount,
    this.ownedVariantOptionCount,
    this.unclassifiedOwnedCount = 0,
  });

  final int parentPrintCount;
  final int variantOptionCount;
  final int? ownedVariantOptionCount;
  final int unclassifiedOwnedCount;

  int? get completionPercent {
    final owned = ownedVariantOptionCount;
    if (owned == null || variantOptionCount <= 0) {
      return null;
    }
    return ((owned / variantOptionCount) * 100).round().clamp(0, 100);
  }
}

class PublicSetDetail {
  const PublicSetDetail({
    required this.summary,
    required this.cards,
    required this.masterSetStats,
  });

  final PublicSetSummary summary;
  final List<PublicSetCard> cards;
  final PublicSetMasterSetStats masterSetStats;
}

enum PublicSetFilter { all, modern, special, alphabetical, newest, oldest }

class PublicSetsService {
  static Future<List<PublicSetSummary>> fetchSets({
    required SupabaseClient client,
  }) async {
    final results = await Future.wait<dynamic>([
      client
          .from('sets')
          .select(
            'code,name,hero_image_url,printed_set_abbrev,printed_total,release_date,created_at',
          ),
      _fetchAllCanonicalSetCodes(client),
    ]);

    final setRows = (results[0] as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    final setCodeRows = (results[1] as List<Map<String, dynamic>>);

    final cardCountByCode = <String, int>{};
    for (final row in setCodeRows) {
      final setCode = _normalizeCode(row['set_code']);
      if (setCode.isEmpty) {
        continue;
      }

      cardCountByCode[setCode] = (cardCountByCode[setCode] ?? 0) + 1;
    }

    final canonicalByName = <String, PublicSetSummary>{};
    for (final row in setRows) {
      final code = _normalizeCode(row['code']);
      final name = _cleanText(row['name']);
      if (code.isEmpty || name.isEmpty) {
        continue;
      }

      final candidate = PublicSetSummary(
        code: code,
        name: name,
        heroImageUrl: _normalizeHttpUrl(row['hero_image_url']),
        printedSetAbbrev: _normalizeOptionalText(
          row['printed_set_abbrev'],
        )?.toUpperCase(),
        printedTotal: row['printed_total'] is num
            ? (row['printed_total'] as num).toInt()
            : null,
        releaseDate: _normalizeOptionalText(row['release_date']),
        sortDate: _setSortDate(row),
        releaseYear: _parseReleaseYear(row['release_date']),
        cardCount: cardCountByCode[code] ?? 0,
      );

      final key = _normalizeName(name);
      final existing = canonicalByName[key];
      canonicalByName[key] = existing == null
          ? candidate
          : _chooseCanonicalSet(existing, candidate);
    }

    final sets = canonicalByName.values
        .where((setInfo) => setInfo.cardCount > 0)
        .toList();

    sets.sort((left, right) {
      final leftDate = _parseSortDate(left.sortDate);
      final rightDate = _parseSortDate(right.sortDate);

      if (leftDate != null && rightDate != null && leftDate != rightDate) {
        return rightDate.compareTo(leftDate);
      }

      if (leftDate != null && rightDate == null) {
        return -1;
      }

      if (leftDate == null && rightDate != null) {
        return 1;
      }

      return left.name.toLowerCase().compareTo(right.name.toLowerCase());
    });

    return sets;
  }

  static Future<List<PublicSetSummary>> fetchFeaturedSets({
    required SupabaseClient client,
    int limit = 8,
  }) async {
    final sets = await fetchSets(client: client);
    return sets.take(limit).toList();
  }

  static Future<PublicSetSummary?> fetchSetByCode({
    required SupabaseClient client,
    required String setCode,
  }) async {
    final normalizedCode = _normalizeCode(setCode);
    if (normalizedCode.isEmpty) {
      return null;
    }

    final sets = await fetchSets(client: client);
    for (final setInfo in sets) {
      if (setInfo.code == normalizedCode) {
        return setInfo;
      }
    }

    return null;
  }

  static Future<List<PublicSetCard>> fetchSetCards({
    required SupabaseClient client,
    required String setCode,
    int offset = 0,
    int limit = 36,
  }) async {
    final normalizedCode = _normalizeCode(setCode);
    if (normalizedCode.isEmpty || limit <= 0) {
      return const [];
    }

    final rows = await client
        .from('card_prints')
        .select(
          'id,gv_id,name,number,number_plain,variant_key,printed_identity_modifier,rarity,image_url,image_alt_url,image_source,representative_image_url,image_status,image_note,sets(identity_model)',
        )
        .eq('set_code', normalizedCode)
        .not('gv_id', 'is', null)
        .order('number_plain', ascending: true, nullsFirst: false)
        .order('number', ascending: true)
        .range(offset, offset + limit - 1);

    final rawRows = (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    final cardPrintIds = rawRows
        .map((row) => _cleanText(row['id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: cardPrintIds,
    );
    final ownedCountsById = _cleanText(client.auth.currentUser?.id).isEmpty
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

    return rawRows
        .map((row) {
          final gvId = _cleanText(row['gv_id']);
          final cardPrintId = _cleanText(row['id']);
          if (gvId.isEmpty || cardPrintId.isEmpty) {
            return null;
          }

          final displayNumber = _cleanText(row['number_plain']).isNotEmpty
              ? _cleanText(row['number_plain'])
              : (_cleanText(row['number']).isNotEmpty
                    ? _cleanText(row['number'])
                    : '—');

          final setRecord =
              row['sets'] is List && (row['sets'] as List).isNotEmpty
              ? Map<String, dynamic>.from((row['sets'] as List).first as Map)
              : row['sets'] is Map
              ? Map<String, dynamic>.from(row['sets'] as Map)
              : null;

          return PublicSetCard(
            cardPrintId: cardPrintId,
            gvId: gvId,
            name: _cleanText(row['name']).isEmpty
                ? 'Unknown card'
                : _cleanText(row['name']),
            number: displayNumber,
            ownedCount: ownedCountsById[cardPrintId] ?? 0,
            variantKey: _normalizeOptionalText(row['variant_key']),
            printedIdentityModifier: _normalizeOptionalText(
              row['printed_identity_modifier'],
            ),
            setIdentityModel: _normalizeOptionalText(
              setRecord?['identity_model'],
            ),
            rarity: _normalizeOptionalText(row['rarity']),
            imageUrl: _bestImageUrl(
              primary: row['image_url'],
              fallback: row['image_alt_url'],
            ),
            representativeImageUrl: _normalizeHttpUrl(
              row['representative_image_url'],
            ),
            imageStatus: _normalizeOptionalText(row['image_status']),
            imageNote: _normalizeOptionalText(row['image_note']),
            displayImageUrl:
                _bestImageUrl(
                  primary: row['image_url'],
                  fallback: row['image_alt_url'],
                ) ??
                _normalizeHttpUrl(row['representative_image_url']),
            displayImageKind:
                _bestImageUrl(
                      primary: row['image_url'],
                      fallback: row['image_alt_url'],
                    ) !=
                    null
                ? 'exact'
                : _normalizeHttpUrl(row['representative_image_url']) != null
                ? 'representative'
                : 'missing',
            printings: printingsByCardPrintId[cardPrintId] ?? const [],
            pricing: pricingById[cardPrintId],
          );
        })
        .whereType<PublicSetCard>()
        .toList();
  }

  static Future<PublicSetDetail?> fetchSetDetail({
    required SupabaseClient client,
    required String setCode,
    int? cardLimit,
  }) async {
    final summary = await fetchSetByCode(client: client, setCode: setCode);
    if (summary == null) {
      return null;
    }

    final cards = await _fetchSetCardsForDetail(
      client: client,
      setCode: summary.code,
      cardLimit: cardLimit,
    );
    return PublicSetDetail(
      summary: summary,
      cards: cards,
      masterSetStats: _buildMasterSetStats(
        cards: cards,
        signedIn: _cleanText(client.auth.currentUser?.id).isNotEmpty,
      ),
    );
  }

  static List<PublicSetSummary> filterAndSortSets({
    required List<PublicSetSummary> sets,
    required String query,
    required PublicSetFilter filter,
  }) {
    final queryTokens = _normalizeSearchTokens(query);
    var filtered = sets
        .where((setInfo) => _matchesSearchTokens(setInfo, queryTokens))
        .toList();

    switch (filter) {
      case PublicSetFilter.all:
        break;
      case PublicSetFilter.modern:
        filtered = filtered
            .where((setInfo) => (setInfo.releaseYear ?? 0) >= 2019)
            .toList();
        break;
      case PublicSetFilter.special:
        filtered = filtered
            .where(
              (setInfo) =>
                  setInfo.code.contains('pt') ||
                  setInfo.name.toLowerCase().contains('trainer gallery') ||
                  setInfo.name.toLowerCase().contains('promo'),
            )
            .toList();
        break;
      case PublicSetFilter.alphabetical:
        filtered.sort(
          (left, right) =>
              left.name.toLowerCase().compareTo(right.name.toLowerCase()),
        );
        break;
      case PublicSetFilter.newest:
        filtered.sort((left, right) {
          final leftDate = _parseSortDate(left.sortDate);
          final rightDate = _parseSortDate(right.sortDate);
          if (leftDate == null && rightDate == null) {
            return 0;
          }
          if (leftDate == null) {
            return 1;
          }
          if (rightDate == null) {
            return -1;
          }
          return rightDate.compareTo(leftDate);
        });
        break;
      case PublicSetFilter.oldest:
        filtered.sort((left, right) {
          final leftDate = _parseSortDate(left.sortDate);
          final rightDate = _parseSortDate(right.sortDate);
          if (leftDate == null && rightDate == null) {
            return 0;
          }
          if (leftDate == null) {
            return 1;
          }
          if (rightDate == null) {
            return -1;
          }
          return leftDate.compareTo(rightDate);
        });
        break;
    }

    return filtered;
  }

  static Future<List<PublicSetCard>> _fetchSetCardsForDetail({
    required SupabaseClient client,
    required String setCode,
    int? cardLimit,
  }) async {
    const pageSize = 250;
    final cards = <PublicSetCard>[];
    while (cardLimit == null || cards.length < cardLimit) {
      final remaining = cardLimit == null ? pageSize : cardLimit - cards.length;
      final batchSize = remaining < pageSize ? remaining : pageSize;
      if (batchSize <= 0) {
        break;
      }

      final batch = await fetchSetCards(
        client: client,
        setCode: setCode,
        offset: cards.length,
        limit: batchSize,
      );
      cards.addAll(batch);

      if (batch.length < batchSize) {
        break;
      }
    }
    return cards;
  }

  static Future<List<Map<String, dynamic>>> _fetchAllCanonicalSetCodes(
    SupabaseClient client,
  ) async {
    final rows = <Map<String, dynamic>>[];
    const pageSize = 1000;
    var offset = 0;

    while (true) {
      final page = await client
          .from('card_prints')
          .select('set_code')
          .not('gv_id', 'is', null)
          .range(offset, offset + pageSize - 1);

      final batch = (page as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
      rows.addAll(batch);

      if (batch.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return rows;
  }

  static PublicSetMasterSetStats _buildMasterSetStats({
    required List<PublicSetCard> cards,
    required bool signedIn,
  }) {
    var variantOptionCount = 0;
    var ownedVariantOptionCount = 0;
    var unclassifiedOwnedCount = 0;

    for (final card in cards) {
      if (card.printings.isEmpty) {
        variantOptionCount += 1;
        if (card.ownedCount > 0) {
          ownedVariantOptionCount += 1;
        }
        continue;
      }

      variantOptionCount += card.printings.length;
      final ownedPrintingCount = card.printings.fold<int>(
        0,
        (sum, option) => sum + option.ownedCount,
      );
      ownedVariantOptionCount += card.printings
          .where((option) => option.ownedCount > 0)
          .length;
      unclassifiedOwnedCount += (card.ownedCount - ownedPrintingCount).clamp(
        0,
        card.ownedCount,
      );
    }

    return PublicSetMasterSetStats(
      parentPrintCount: cards.length,
      variantOptionCount: variantOptionCount,
      ownedVariantOptionCount: signedIn ? ownedVariantOptionCount : null,
      unclassifiedOwnedCount: signedIn ? unclassifiedOwnedCount : 0,
    );
  }

  static Future<Map<String, int>> _fetchOwnedPrintingCounts({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final userId = _cleanText(client.auth.currentUser?.id);
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
        final printingId = _cleanText(row['card_printing_id']);
        if (printingId.isNotEmpty) {
          counts[printingId] = (counts[printingId] ?? 0) + 1;
        }
      }
    }

    return counts;
  }

  static Future<Map<String, List<PublicSetPrintingOption>>>
  _fetchPrintingOptions({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
    required Map<String, int> ownedCountsByPrintingId,
  }) async {
    final values = <String, List<_SortablePublicSetPrintingOption>>{};
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
        final id = _cleanText(row['id']);
        final cardPrintId = _cleanText(row['card_print_id']);
        if (id.isEmpty || cardPrintId.isEmpty) {
          continue;
        }

        final finishRecord = _firstNestedRecord(row['finish_keys']);
        final finishName =
            _finishLabel(
              finishKey: _normalizeOptionalText(row['finish_key']),
              finishLabel: _normalizeOptionalText(finishRecord?['label']),
            ) ??
            'Standard';
        (values[cardPrintId] ??= <_SortablePublicSetPrintingOption>[]).add(
          _SortablePublicSetPrintingOption(
            option: PublicSetPrintingOption(
              id: id,
              printingGvId: _normalizeOptionalText(row['printing_gv_id']),
              finishKey: _normalizeOptionalText(row['finish_key']),
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
    switch (_cleanText(finishKey).toLowerCase()) {
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
      case 'cosmos':
        return 'Cosmos Holo';
      case 'cracked_ice':
        return 'Cracked Ice Holo';
      case 'rocket_reverse':
        return 'Rocket Reverse Holo';
    }
    return _normalizeOptionalText(finishLabel);
  }

  static List<List<String>> _chunks(Iterable<String> values, int size) {
    final normalized = values
        .map(_cleanText)
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
    return int.tryParse(_cleanText(value)) ?? fallback;
  }

  static PublicSetSummary _chooseCanonicalSet(
    PublicSetSummary existing,
    PublicSetSummary candidate,
  ) {
    if (candidate.cardCount != existing.cardCount) {
      return candidate.cardCount > existing.cardCount ? candidate : existing;
    }

    if ((candidate.releaseDate != null) != (existing.releaseDate != null)) {
      return candidate.releaseDate != null ? candidate : existing;
    }

    return candidate.code.length < existing.code.length ? candidate : existing;
  }

  static String _normalizeCode(dynamic value) {
    return _cleanText(value).toLowerCase();
  }

  static String _normalizeName(String value) {
    return value
        .trim()
        .toLowerCase()
        .replaceAll('&', ' and ')
        .replaceAll(RegExp(r'[^a-z0-9\s.-]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static int? _parseReleaseYear(dynamic rawDate) {
    final match = RegExp(r'^(\d{4})').firstMatch(_cleanText(rawDate));
    if (match == null) {
      return null;
    }

    return int.tryParse(match.group(1)!);
  }

  static String? _setSortDate(Map<String, dynamic> row) {
    return _normalizeOptionalText(row['release_date']) ??
        _normalizeOptionalText(row['created_at']);
  }

  static List<String> _normalizeSearchTokens(String query) {
    final normalizedQuery = _normalizeName(query);
    if (normalizedQuery.isEmpty) {
      return const <String>[];
    }

    return normalizedQuery
        .split(RegExp(r'\s+'))
        .map((token) => token.trim())
        .where((token) => token.isNotEmpty)
        .toList(growable: false);
  }

  static bool _matchesSearchTokens(
    PublicSetSummary setInfo,
    List<String> tokens,
  ) {
    if (tokens.isEmpty) {
      return true;
    }

    final haystacks = <String>[
      _normalizeName(setInfo.name),
      _normalizeCode(setInfo.code),
    ];

    return tokens.every(
      (token) => haystacks.any((value) => value.contains(token)),
    );
  }

  static DateTime? _parseSortDate(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    return DateTime.tryParse(value.trim());
  }

  static String? _bestImageUrl({
    required dynamic primary,
    required dynamic fallback,
  }) {
    final primaryUrl = _normalizeHttpUrl(primary);
    if (primaryUrl != null) {
      return primaryUrl;
    }

    return _normalizeHttpUrl(fallback);
  }

  static String? _normalizeOptionalText(dynamic value) {
    final cleaned = _cleanText(value);
    return cleaned.isEmpty ? null : cleaned;
  }

  static String _cleanText(dynamic value) {
    return (value ?? '').toString().trim();
  }

  static String? _normalizeHttpUrl(dynamic value) {
    final url = _cleanText(value);
    if (url.isEmpty) {
      return null;
    }

    final parsed = Uri.tryParse(url);
    if (parsed == null) {
      return null;
    }

    if (parsed.scheme != 'http' && parsed.scheme != 'https') {
      return null;
    }

    return url;
  }
}

class _SortablePublicSetPrintingOption {
  const _SortablePublicSetPrintingOption({
    required this.option,
    required this.sortOrder,
  });

  final PublicSetPrintingOption option;
  final int sortOrder;
}
