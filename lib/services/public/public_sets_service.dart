import 'package:supabase_flutter/supabase_flutter.dart';

import 'card_surface_pricing_service.dart';

class PublicSetSummary {
  const PublicSetSummary({
    required this.code,
    required this.name,
    required this.cardCount,
    this.heroImageUrl,
    this.printedSetAbbrev,
    this.printedTotal,
    this.releaseDate,
    this.releaseYear,
  });

  final String code;
  final String name;
  final int cardCount;
  final String? heroImageUrl;
  final String? printedSetAbbrev;
  final int? printedTotal;
  final String? releaseDate;
  final int? releaseYear;
}

class PublicSetCard {
  const PublicSetCard({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.number,
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
    this.rarity,
    this.imageUrl,
    this.pricing,
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String number;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final String? rarity;
  final String? imageUrl;
  final CardSurfacePricingData? pricing;
}

class PublicSetDetail {
  const PublicSetDetail({required this.summary, required this.cards});

  final PublicSetSummary summary;
  final List<PublicSetCard> cards;
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
            'code,name,hero_image_url,printed_set_abbrev,printed_total,release_date',
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
      final leftDate = left.releaseDate != null
          ? DateTime.tryParse(left.releaseDate!)
          : null;
      final rightDate = right.releaseDate != null
          ? DateTime.tryParse(right.releaseDate!)
          : null;

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
          'id,gv_id,name,number,number_plain,variant_key,printed_identity_modifier,rarity,image_url,image_alt_url,sets(identity_model)',
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
            pricing: pricingById[cardPrintId],
          );
        })
        .whereType<PublicSetCard>()
        .toList();
  }

  static Future<PublicSetDetail?> fetchSetDetail({
    required SupabaseClient client,
    required String setCode,
    int cardLimit = 72,
  }) async {
    final summary = await fetchSetByCode(client: client, setCode: setCode);
    if (summary == null) {
      return null;
    }

    final cards = await fetchSetCards(
      client: client,
      setCode: summary.code,
      limit: cardLimit,
    );
    return PublicSetDetail(summary: summary, cards: cards);
  }

  static List<PublicSetSummary> filterAndSortSets({
    required List<PublicSetSummary> sets,
    required String query,
    required PublicSetFilter filter,
  }) {
    final normalizedQuery = _normalizeName(query);
    var filtered = sets.where((setInfo) {
      if (normalizedQuery.isEmpty) {
        return true;
      }

      final haystack = [
        _normalizeName(setInfo.name),
        setInfo.code.toLowerCase(),
        (setInfo.printedSetAbbrev ?? '').toLowerCase(),
      ].join(' ');
      return haystack.contains(normalizedQuery);
    }).toList();

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
          final leftDate = left.releaseDate != null
              ? DateTime.tryParse(left.releaseDate!)
              : null;
          final rightDate = right.releaseDate != null
              ? DateTime.tryParse(right.releaseDate!)
              : null;
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
          final leftDate = left.releaseDate != null
              ? DateTime.tryParse(left.releaseDate!)
              : null;
          final rightDate = right.releaseDate != null
              ? DateTime.tryParse(right.releaseDate!)
              : null;
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
