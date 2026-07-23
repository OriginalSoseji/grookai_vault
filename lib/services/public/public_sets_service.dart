import 'package:supabase_flutter/supabase_flutter.dart';

import 'card_surface_pricing_service.dart';
import '../vault/vault_card_service.dart';
import '../../utils/display_image_contract.dart';

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

  String? get hostedHeroImageUrl => buildHostedSetLogoUrl(code);
  String? get providerHeroFallbackImageUrl {
    final fallback = normalizeDisplayImageUrl(heroImageUrl);
    return fallback == hostedHeroImageUrl ? null : fallback;
  }
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
    this.providerImageUrl,
    this.representativeImageUrl,
    this.hostedImagePath,
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
  final String? providerImageUrl;
  final String? representativeImageUrl;
  final String? hostedImagePath;
  final String? imageStatus;
  final String? imageNote;
  final String? displayImageUrl;
  final String? displayImageKind;
  final List<PublicSetPrintingOption> printings;
  final CardSurfacePricingData? pricing;

  String? get hostedImageUrl =>
      normalizeWarehouseDisplayImagePath(hostedImagePath) ??
      buildCanonicalCardImageUrl(gvId);

  String? get providerFallbackImageUrl {
    final fallback =
        normalizeDisplayImageUrl(providerImageUrl) ??
        normalizeDisplayImageUrl(representativeImageUrl);
    return fallback == hostedImageUrl ? null : fallback;
  }

  String? get catalogImageUrl => hostedImageUrl ?? providerFallbackImageUrl;
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

class PublicWorldChampionshipDecklistEntry {
  const PublicWorldChampionshipDecklistEntry({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.number,
    this.quantity,
    this.sourceSetName,
    this.sourceCardNumber,
    this.rarity,
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String number;
  final int? quantity;
  final String? sourceSetName;
  final String? sourceCardNumber;
  final String? rarity;
}

class PublicWorldChampionshipDecklist {
  const PublicWorldChampionshipDecklist({
    required this.setCode,
    required this.totalQuantity,
    required this.uniqueCardCount,
    required this.entries,
    this.deckName,
    this.deckYear,
    this.playerName,
  });

  final String setCode;
  final String? deckName;
  final int? deckYear;
  final String? playerName;
  final int totalQuantity;
  final int uniqueCardCount;
  final List<PublicWorldChampionshipDecklistEntry> entries;
}

class PublicSetDetail {
  const PublicSetDetail({
    required this.summary,
    required this.cards,
    required this.masterSetStats,
    this.worldChampionshipDecklist,
  });

  final PublicSetSummary summary;
  final List<PublicSetCard> cards;
  final PublicSetMasterSetStats masterSetStats;
  final PublicWorldChampionshipDecklist? worldChampionshipDecklist;
}

enum PublicSetFilter { all, modern, special, alphabetical, newest, oldest }

enum PublicSetEra {
  all,
  scarletViolet,
  swordShield,
  sunMoon,
  xy,
  blackWhite,
  dpHgss,
  exEcard,
  classic,
  datePending,
}

enum PublicSetLane { all, main, special, promo, deck, world }

class PublicSetEraOption {
  const PublicSetEraOption({
    required this.value,
    required this.label,
    required this.shortLabel,
  });

  final PublicSetEra value;
  final String label;
  final String shortLabel;
}

class PublicSetLaneOption {
  const PublicSetLaneOption({required this.value, required this.label});

  final PublicSetLane value;
  final String label;
}

class PublicSetsService {
  static const _publicSetRouteAliases = <String, String>{
    'shiny vault': 'sma',
    'shiny-vault': 'sma',
    '2021swsh': 'mcd21',
    'base set shadowless': 'base1-shadowless',
    'base-set-shadowless': 'base1-shadowless',
    'base shadowless': 'base1-shadowless',
    'base1 shadowless': 'base1-shadowless',
    'shadowless base set': 'base1-shadowless',
    'shadowless base': 'base1-shadowless',
    'no shadow base set': 'base1-shadowless',
    'base set no shadow': 'base1-shadowless',
    'base set first edition': 'base1-first-edition',
    'base-set-first-edition': 'base1-first-edition',
    'base first edition': 'base1-first-edition',
    'base first ed': 'base1-first-edition',
    'base 1st edition': 'base1-first-edition',
    'base 1st ed': 'base1-first-edition',
    'first edition base set': 'base1-first-edition',
    'first edition base': 'base1-first-edition',
    'base set 1st edition': 'base1-first-edition',
    '1st edition base set': 'base1-first-edition',
    '1st edition base': 'base1-first-edition',
    'base1 first edition': 'base1-first-edition',
    'base1 1st edition': 'base1-first-edition',
    'base set 1999-2000': 'base1-1999-2000',
    'base-set-1999-2000': 'base1-1999-2000',
    'base set 1999 2000': 'base1-1999-2000',
    'base 1999-2000': 'base1-1999-2000',
    'base1 1999-2000': 'base1-1999-2000',
    '1999-2000 base set': 'base1-1999-2000',
    '1999-2000 base': 'base1-1999-2000',
    'base set 2000': 'base1-1999-2000',
    'base set fourth print': 'base1-1999-2000',
    'base set 4th print': 'base1-1999-2000',
    'base fourth print': 'base1-1999-2000',
    'base 4th print': 'base1-1999-2000',
    'uk base set': 'base1-1999-2000',
    'base set uk print': 'base1-1999-2000',
    'rm': 'ru1',
    'sv3pt5': 'sv03.5',
    'sm35': 'sm3.5',
  };

  static const eraOptions = <PublicSetEraOption>[
    PublicSetEraOption(
      value: PublicSetEra.all,
      label: 'All eras',
      shortLabel: 'All',
    ),
    PublicSetEraOption(
      value: PublicSetEra.scarletViolet,
      label: 'Scarlet & Violet',
      shortLabel: 'SV',
    ),
    PublicSetEraOption(
      value: PublicSetEra.swordShield,
      label: 'Sword & Shield',
      shortLabel: 'SWSH',
    ),
    PublicSetEraOption(
      value: PublicSetEra.sunMoon,
      label: 'Sun & Moon',
      shortLabel: 'SM',
    ),
    PublicSetEraOption(value: PublicSetEra.xy, label: 'XY', shortLabel: 'XY'),
    PublicSetEraOption(
      value: PublicSetEra.blackWhite,
      label: 'Black & White',
      shortLabel: 'BW',
    ),
    PublicSetEraOption(
      value: PublicSetEra.dpHgss,
      label: 'DP / HGSS',
      shortLabel: 'DP',
    ),
    PublicSetEraOption(
      value: PublicSetEra.exEcard,
      label: 'EX / e-Card',
      shortLabel: 'EX',
    ),
    PublicSetEraOption(
      value: PublicSetEra.classic,
      label: 'Classic',
      shortLabel: 'Classic',
    ),
    PublicSetEraOption(
      value: PublicSetEra.datePending,
      label: 'Date pending',
      shortLabel: 'Pending',
    ),
  ];

  static const laneOptions = <PublicSetLaneOption>[
    PublicSetLaneOption(value: PublicSetLane.all, label: 'All set types'),
    PublicSetLaneOption(value: PublicSetLane.main, label: 'Main sets'),
    PublicSetLaneOption(value: PublicSetLane.special, label: 'Special sets'),
    PublicSetLaneOption(value: PublicSetLane.promo, label: 'Promos'),
    PublicSetLaneOption(value: PublicSetLane.deck, label: 'Decks & kits'),
    PublicSetLaneOption(value: PublicSetLane.world, label: 'Worlds decks'),
  ];

  static Future<List<PublicSetSummary>> fetchSets({
    required SupabaseClient client,
  }) async {
    final rawRows = await client
        .from('sets')
        .select(
          'code,name,hero_image_url,printed_set_abbrev,printed_total,release_date,created_at,card_prints(count)',
        )
        .not('card_prints.gv_id', 'is', null)
        .not('card_prints.set_code', 'is', null);
    final setRows = (rawRows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();

    final canonicalByName = <String, PublicSetSummary>{};
    for (final row in setRows) {
      final code = _normalizeCode(row['code']);
      final name = _cleanText(row['name']);
      if (code.isEmpty || name.isEmpty) {
        continue;
      }

      final candidate = _mapSetRowToSummary(
        row,
        cardCount: _embeddedCount(row['card_prints']),
      );
      if (candidate == null) {
        continue;
      }

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
    final normalizedCode = resolveSetRouteCode(setCode);
    if (normalizedCode.isEmpty) {
      return null;
    }

    final rawRow = await client
        .from('sets')
        .select(
          'code,name,hero_image_url,printed_set_abbrev,printed_total,release_date,created_at,card_prints(count)',
        )
        .eq('code', normalizedCode)
        .not('card_prints.gv_id', 'is', null)
        .not('card_prints.set_code', 'is', null)
        .limit(1)
        .maybeSingle();
    if (rawRow == null) {
      return null;
    }

    final row = Map<String, dynamic>.from(rawRow);
    final cardCount = _embeddedCount(row['card_prints']);
    if (cardCount <= 0) {
      return null;
    }

    return _mapSetRowToSummary(row, cardCount: cardCount);
  }

  static String resolveSetRouteCode(String? value) {
    final normalized = _cleanText(
      value,
    ).toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    return _publicSetRouteAliases[normalized] ?? normalized;
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
          'id,gv_id,name,number,number_plain,variant_key,printed_identity_modifier,rarity,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(identity_model)',
        )
        .eq('set_code', normalizedCode)
        .not('gv_id', 'is', null)
        .order('number_plain', ascending: true, nullsFirst: false)
        .order('number', ascending: true)
        .range(offset, offset + limit - 1);

    // The set query already returns the immutable Grookai warehouse path.
    // Rendering through that first-party path avoids a blocking
    // /api/canon/images round trip and lets the image CDN keep derivatives
    // warm for their full immutable lifetime. The provider URL remains an
    // error-only fallback on the artwork widget.
    final rawRows = (rows as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    final cardPrintIds = rawRows
        .map((row) => _cleanText(row['id']))
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    final pricingFuture = CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: cardPrintIds,
    );
    final ownershipTruthFuture = _cleanText(client.auth.currentUser?.id).isEmpty
        ? Future<VaultOwnedCardTruth>.value(const VaultOwnedCardTruth())
        : VaultCardService.getOwnedCardTruthIncludingSlabs(
            client: client,
            cardPrintIds: cardPrintIds,
          );
    final printingsFuture = ownershipTruthFuture.then(
      (truth) => _fetchPrintingOptions(
        client: client,
        cardPrintIds: cardPrintIds,
        ownedCountsByPrintingId: truth.countsByPrintingId,
      ),
    );

    final enrichmentResults = await Future.wait<Object>([
      pricingFuture,
      ownershipTruthFuture,
      printingsFuture,
    ]);
    final pricingById =
        enrichmentResults[0] as Map<String, CardSurfacePricingData>;
    final ownershipTruth = enrichmentResults[1] as VaultOwnedCardTruth;
    final ownedCountsById = ownershipTruth.countsByCardPrintId;
    final printingsByCardPrintId =
        enrichmentResults[2] as Map<String, List<PublicSetPrintingOption>>;

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
          final providerImageUrl =
              _bestImageUrl(
                primary: row['image_url'],
                fallback: row['image_alt_url'],
              ) ??
              _normalizeHttpUrl(row['representative_image_url']);
          final exactImageUrl =
              _bestImageUrl(
                primary: row['display_image_url'],
                fallback: row['image_url'],
              ) ??
              _normalizeHttpUrl(row['image_alt_url']);
          final representativeImageUrl = _normalizeHttpUrl(
            row['representative_image_url'],
          );
          final hostedImagePath =
              _cleanText(row['image_source']).toLowerCase() == 'identity'
              ? _normalizeOptionalText(row['image_path'])
              : null;
          final hostedDisplayImageUrl = normalizeWarehouseDisplayImagePath(
            hostedImagePath,
          );
          final displayImageUrl =
              hostedDisplayImageUrl ?? exactImageUrl ?? representativeImageUrl;

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
            imageUrl: providerImageUrl,
            providerImageUrl: providerImageUrl,
            representativeImageUrl: representativeImageUrl,
            hostedImagePath: hostedImagePath,
            imageStatus: _normalizeOptionalText(row['image_status']),
            imageNote: _normalizeOptionalText(row['image_note']),
            displayImageUrl: displayImageUrl,
            displayImageKind:
                hostedDisplayImageUrl != null || exactImageUrl != null
                ? 'exact'
                : representativeImageUrl != null
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
    final worldChampionshipDecklist = await fetchWorldChampionshipDecklist(
      client: client,
      setCode: summary.code,
    );

    return PublicSetDetail(
      summary: summary,
      cards: cards,
      masterSetStats: _buildMasterSetStats(
        cards: cards,
        signedIn: _cleanText(client.auth.currentUser?.id).isNotEmpty,
      ),
      worldChampionshipDecklist: worldChampionshipDecklist,
    );
  }

  static Future<PublicWorldChampionshipDecklist?>
  fetchWorldChampionshipDecklist({
    required SupabaseClient client,
    required String setCode,
  }) async {
    final normalizedCode = _normalizeCode(setCode);
    if (normalizedCode.isEmpty || !normalizedCode.startsWith('wcd')) {
      return null;
    }

    final rows = await client
        .from('card_prints')
        .select('id,gv_id,name,number,number_plain,rarity,external_ids')
        .eq('set_code', normalizedCode)
        .eq('variant_key', 'world_championship_deck_replica')
        .not('gv_id', 'is', null)
        .order('number_plain', ascending: true, nullsFirst: false)
        .order('number', ascending: true)
        .order('name', ascending: true);

    final entries = <PublicWorldChampionshipDecklistEntry>[];
    String? deckName;
    int? deckYear;
    String? playerName;

    for (final raw in rows as List<dynamic>) {
      final row = Map<String, dynamic>.from(raw as Map);
      final cardPrintId = _cleanText(row['id']);
      final gvId = _cleanText(row['gv_id']);
      if (cardPrintId.isEmpty || gvId.isEmpty) {
        continue;
      }

      final grookai = _nestedRecord(
        _nestedRecord(row['external_ids'])?['grookai'],
      );
      deckName ??= _normalizeOptionalText(grookai?['deck_name']);
      deckYear ??= _nullableInt(grookai?['deck_year']);
      playerName ??= _normalizeOptionalText(grookai?['player_name']);

      final number = _cleanText(row['number_plain']).isNotEmpty
          ? _cleanText(row['number_plain'])
          : _cleanText(row['number']);
      entries.add(
        PublicWorldChampionshipDecklistEntry(
          cardPrintId: cardPrintId,
          gvId: gvId,
          name: _cleanText(row['name']).isEmpty
              ? 'Unknown card'
              : _cleanText(row['name']),
          number: number.isEmpty ? '—' : number,
          quantity: _nullableInt(grookai?['deck_quantity']),
          sourceSetName: _normalizeOptionalText(grookai?['source_set_name']),
          sourceCardNumber: _normalizeOptionalText(
            grookai?['source_card_number'],
          ),
          rarity: _normalizeOptionalText(row['rarity']),
        ),
      );
    }

    if (entries.isEmpty) {
      return null;
    }

    return PublicWorldChampionshipDecklist(
      setCode: normalizedCode,
      deckName: deckName,
      deckYear: deckYear,
      playerName: playerName,
      totalQuantity: entries.fold<int>(
        0,
        (sum, entry) => sum + (entry.quantity ?? 0),
      ),
      uniqueCardCount: entries.length,
      entries: entries,
    );
  }

  static List<PublicSetSummary> filterAndSortSets({
    required List<PublicSetSummary> sets,
    required String query,
    required PublicSetFilter filter,
    PublicSetEra era = PublicSetEra.all,
    PublicSetLane lane = PublicSetLane.all,
  }) {
    final queryTokens = _normalizeSearchTokens(query);
    var filtered = sets
        .where((setInfo) => _matchesSearchTokens(setInfo, queryTokens))
        .where(
          (setInfo) => era == PublicSetEra.all || getSetEra(setInfo) == era,
        )
        .where(
          (setInfo) => lane == PublicSetLane.all || getSetLane(setInfo) == lane,
        )
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
        filtered = filtered.where(isSpecialSet).toList();
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

  static PublicSetEra getSetEra(PublicSetSummary setInfo) {
    final year = setInfo.releaseYear;
    if (year == null) {
      return PublicSetEra.datePending;
    }

    if (year >= 2023) return PublicSetEra.scarletViolet;
    if (year >= 2020) return PublicSetEra.swordShield;
    if (year >= 2017) return PublicSetEra.sunMoon;
    if (year >= 2013) return PublicSetEra.xy;
    if (year >= 2011) return PublicSetEra.blackWhite;
    if (year >= 2007) return PublicSetEra.dpHgss;
    if (year >= 2003) return PublicSetEra.exEcard;
    return PublicSetEra.classic;
  }

  static PublicSetLane getSetLane(PublicSetSummary setInfo) {
    final code = _normalizeName(setInfo.code);
    final name = _normalizeName(setInfo.name);
    final haystack = '$code $name';

    if (code.startsWith('wcd') || haystack.contains('world championship')) {
      return PublicSetLane.world;
    }

    if (haystack.contains('promo') ||
        haystack.contains('promotional') ||
        haystack.contains('black star') ||
        haystack.contains('pokemon center')) {
      return PublicSetLane.promo;
    }

    if (haystack.contains('deck') ||
        haystack.contains('trainer kit') ||
        haystack.contains('battle academy') ||
        haystack.contains('league battle') ||
        haystack.contains('starter set')) {
      return PublicSetLane.deck;
    }

    if (isSpecialSet(setInfo)) {
      return PublicSetLane.special;
    }

    return PublicSetLane.main;
  }

  static bool isSpecialSet(PublicSetSummary setInfo) {
    final code = _normalizeName(setInfo.code);
    final name = _normalizeName(setInfo.name);

    if (code.contains('pt5') || code.contains('.5')) {
      return true;
    }

    return const [
      'trainer gallery',
      'radiant collection',
      'shiny',
      'fates',
      'crown zenith',
      'prismatic',
    ].any(name.contains);
  }

  static String eraLabel(PublicSetEra era) {
    return eraOptions
        .firstWhere(
          (option) => option.value == era,
          orElse: () => eraOptions.first,
        )
        .label;
  }

  static String laneLabel(PublicSetLane lane) {
    return laneOptions
        .firstWhere(
          (option) => option.value == lane,
          orElse: () => laneOptions.first,
        )
        .label;
  }

  static Map<PublicSetEra, int> countSetsByEra(List<PublicSetSummary> sets) {
    final counts = <PublicSetEra, int>{};
    for (final setInfo in sets) {
      final era = getSetEra(setInfo);
      counts[era] = (counts[era] ?? 0) + 1;
    }
    return counts;
  }

  static Map<PublicSetLane, int> countSetsByLane(List<PublicSetSummary> sets) {
    final counts = <PublicSetLane, int>{};
    for (final setInfo in sets) {
      final lane = getSetLane(setInfo);
      counts[lane] = (counts[lane] ?? 0) + 1;
    }
    return counts;
  }

  static Map<PublicSetEra, List<PublicSetSummary>> groupSetsByEra(
    List<PublicSetSummary> sets,
  ) {
    final groups = <PublicSetEra, List<PublicSetSummary>>{};
    for (final setInfo in sets) {
      (groups[getSetEra(setInfo)] ??= <PublicSetSummary>[]).add(setInfo);
    }
    return groups;
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

  static Future<Map<String, List<PublicSetPrintingOption>>>
  _fetchPrintingOptions({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
    required Map<String, int> ownedCountsByPrintingId,
  }) async {
    const pageSize = 1000;
    final values = <String, List<_SortablePublicSetPrintingOption>>{};
    for (final chunk in _chunks(cardPrintIds, 250)) {
      for (var offset = 0; ; offset += pageSize) {
        late final List<dynamic> data;
        try {
          data =
              await client
                      .from('card_printings')
                      .select(
                        'id,card_print_id,printing_gv_id,finish_key,finish_keys(label,sort_order)',
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
        if (data.length < pageSize) {
          break;
        }
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

  static Map<String, dynamic>? _nestedRecord(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
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

  static int? _nullableInt(dynamic value) {
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(_cleanText(value));
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

  static PublicSetSummary? _mapSetRowToSummary(
    Map<String, dynamic> row, {
    required int cardCount,
  }) {
    final code = _normalizeCode(row['code']);
    final name = _cleanText(row['name']);
    if (code.isEmpty || name.isEmpty) {
      return null;
    }

    return PublicSetSummary(
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
      cardCount: cardCount,
    );
  }

  static int _embeddedCount(dynamic value) {
    if (value is num) {
      return value.toInt();
    }

    final record = _firstNestedRecord(value);
    return _intValue(record?['count']);
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
