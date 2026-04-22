import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../secrets.dart';
import 'provisional_card.dart';

enum RarityOption { all, common, uncommon, rare, ultra, secret }

class CardSearchOptions {
  const CardSearchOptions({
    this.query = '',
    this.rarity = RarityOption.all,
    this.limit = 50,
    this.sort = 'name',
    this.setCode,
    this.number,
    this.identityFilter,
  });

  final String query;
  final RarityOption rarity;
  final int limit;
  final String sort;
  final String? setCode;
  final String? number;
  final String? identityFilter;

  CardSearchOptions copyWith({
    String? query,
    RarityOption? rarity,
    int? limit,
    String? sort,
    String? setCode,
    String? number,
    String? identityFilter,
  }) {
    return CardSearchOptions(
      query: query ?? this.query,
      rarity: rarity ?? this.rarity,
      limit: limit ?? this.limit,
      sort: sort ?? this.sort,
      setCode: setCode ?? this.setCode,
      number: number ?? this.number,
      identityFilter: identityFilter ?? this.identityFilter,
    );
  }
}

class CardPrint {
  CardPrint({
    required this.id,
    required this.name,
    this.gvId,
    required this.setCode,
    this.setName,
    this.number,
    this.numberPlain,
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
    this.rarity,
    this.imageUrl,
    this.representativeImageUrl,
    this.imageStatus,
    this.imageNote,
    this.imageSource,
    this.displayImageUrl,
    this.displayImageKind,
    this.externalIds,
  });

  final String id;
  final String name;
  final String? gvId;
  final String setCode;
  final String? setName;
  final String? number;
  final String? numberPlain;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final String? rarity;
  final String? imageUrl;
  final String? representativeImageUrl;
  final String? imageStatus;
  final String? imageNote;
  final String? imageSource;
  final String? displayImageUrl;
  final String? displayImageKind;
  final Map<String, String?>? externalIds;

  String get displaySet => (setName ?? '').isNotEmpty ? setName! : setCode;
  String get displayNumber =>
      (numberPlain ?? '').isNotEmpty ? numberPlain! : (number ?? '');
  String? get displayImage => (imageUrl ?? '').isNotEmpty ? imageUrl : null;

  factory CardPrint.fromJson(Map<String, dynamic> json) {
    final set = json['set'] as Map<String, dynamic>?;
    final rawExternalIds = json['external_ids'];
    final externalIds = rawExternalIds is Map
        ? rawExternalIds.map(
            (key, value) => MapEntry(key.toString(), value?.toString()),
          )
        : null;
    return CardPrint(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      gvId: json['gv_id']?.toString(),
      setCode: (json['set_code'] ?? '').toString(),
      setName: set != null
          ? (set['name'] ?? '').toString()
          : json['set_name']?.toString(),
      number: json['number']?.toString(),
      numberPlain: json['number_plain']?.toString(),
      variantKey: json['variant_key']?.toString(),
      printedIdentityModifier: json['printed_identity_modifier']?.toString(),
      setIdentityModel: set != null
          ? set['identity_model']?.toString()
          : json['set_identity_model']?.toString(),
      rarity: json['rarity']?.toString(),
      imageUrl: json['image_url']?.toString(),
      representativeImageUrl: json['representative_image_url']?.toString(),
      imageStatus: json['image_status']?.toString(),
      imageNote: json['image_note']?.toString(),
      imageSource: json['image_source']?.toString(),
      displayImageUrl: json['display_image_url']?.toString(),
      displayImageKind: json['display_image_kind']?.toString(),
      externalIds: externalIds,
    );
  }
}

enum ResolverSearchState { strongMatch, ambiguousMatch, weakMatch, noMatch }

ResolverSearchState? _parseResolverSearchState(String? value) {
  switch (value) {
    case 'STRONG_MATCH':
      return ResolverSearchState.strongMatch;
    case 'AMBIGUOUS_MATCH':
      return ResolverSearchState.ambiguousMatch;
    case 'WEAK_MATCH':
      return ResolverSearchState.weakMatch;
    case 'NO_MATCH':
      return ResolverSearchState.noMatch;
    default:
      return null;
  }
}

class CardSearchResolverMeta {
  const CardSearchResolverMeta({
    required this.resolverState,
    required this.topScore,
    required this.candidateCount,
    required this.autoResolved,
    required this.structuredEvidenceFlags,
  });

  final ResolverSearchState resolverState;
  final double? topScore;
  final int candidateCount;
  final bool autoResolved;
  final ResolverStructuredEvidenceFlags? structuredEvidenceFlags;

  factory CardSearchResolverMeta.fromJson(Map<String, dynamic> json) {
    return CardSearchResolverMeta(
      resolverState:
          _parseResolverSearchState(json['resolverState']?.toString()) ??
          ResolverSearchState.noMatch,
      topScore: json['topScore'] is num
          ? (json['topScore'] as num).toDouble()
          : double.tryParse((json['topScore'] ?? '').toString()),
      candidateCount: json['candidateCount'] is int
          ? json['candidateCount'] as int
          : int.tryParse((json['candidateCount'] ?? '').toString()) ?? 0,
      autoResolved: json['autoResolved'] == true,
      structuredEvidenceFlags:
          json['structuredEvidenceFlags'] is Map<String, dynamic>
          ? ResolverStructuredEvidenceFlags.fromJson(
              json['structuredEvidenceFlags'] as Map<String, dynamic>,
            )
          : null,
    );
  }
}

class ResolverStructuredEvidenceFlags {
  const ResolverStructuredEvidenceFlags({
    required this.expectedSet,
    required this.number,
    required this.fraction,
    required this.promo,
    required this.variants,
  });

  final bool expectedSet;
  final bool number;
  final bool fraction;
  final bool promo;
  final List<String> variants;

  factory ResolverStructuredEvidenceFlags.fromJson(Map<String, dynamic> json) {
    final variants = json['variants'];
    return ResolverStructuredEvidenceFlags(
      expectedSet: json['expectedSet'] == true,
      number: json['number'] == true,
      fraction: json['fraction'] == true,
      promo: json['promo'] == true,
      variants: variants is List
          ? variants.map((value) => value.toString()).toList()
          : const [],
    );
  }
}

class CardPrintSearchResult {
  const CardPrintSearchResult({
    required this.rows,
    this.provisionalRows = const <PublicProvisionalCard>[],
    required this.meta,
    required this.source,
  });

  final List<CardPrint> rows;
  final List<PublicProvisionalCard> provisionalRows;
  final CardSearchResolverMeta? meta;
  final String source;
}

const _cardPrintSelect =
    'id,gv_id,name,number,number_plain,variant_key,printed_identity_modifier,rarity,set_code,image_url,image_alt_url,image_source,representative_image_url,image_status,image_note,external_ids,set:sets(name,code,identity_model)';

class CardPrintRepository {
  static Future<CardPrintSearchResult> searchCardPrintsResolved({
    required SupabaseClient client,
    required CardSearchOptions options,
    int defaultLimit = 200,
    int searchLimit = 500,
  }) async {
    final trimmed = options.query.trim();
    final identityFilter = _normalizeIdentityFilter(options.identityFilter);

    if (trimmed.isEmpty && identityFilter == null) {
      final rows = await searchCardPrints(
        client: client,
        options: options,
        defaultLimit: defaultLimit,
        searchLimit: searchLimit,
      );

      return CardPrintSearchResult(
        rows: rows,
        provisionalRows: const <PublicProvisionalCard>[],
        meta: null,
        source: 'local_browse',
      );
    }

    final resolverUri = Uri.parse(grookaiWebBaseUrl)
        .resolve('/api/resolver/search')
        .replace(
          queryParameters: {
            'limit': options.limit.clamp(1, searchLimit).toString(),
            if (trimmed.isNotEmpty) 'q': trimmed,
            if (identityFilter != null && trimmed.isEmpty)
              'identity': identityFilter,
          },
        );

    final response = await http
        .get(resolverUri, headers: const {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 10));

    final decoded = jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? (decoded['error'] ?? 'Resolver request failed.').toString()
          : 'Resolver request failed.';
      throw StateError(message);
    }

    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Resolver returned an invalid payload.');
    }

    final rowsJson = decoded['rows'];
    final provisionalJson = decoded['provisional'];
    final metaJson = decoded['meta'];
    var rows = rowsJson is List
        ? rowsJson
              .whereType<Map<String, dynamic>>()
              .map(CardPrint.fromJson)
              .toList()
        : <CardPrint>[];

    rows = _filterByRarity(rows, options.rarity);
    final provisionalRows = provisionalJson is List
        ? provisionalJson
              .whereType<Map<String, dynamic>>()
              .map((row) {
                try {
                  return PublicProvisionalCard.fromJson(row);
                } catch (_) {
                  return null;
                }
              })
              .whereType<PublicProvisionalCard>()
              .toList(growable: false)
        : const <PublicProvisionalCard>[];

    final meta = trimmed.isEmpty
        ? null
        : metaJson is Map<String, dynamic>
        ? CardSearchResolverMeta.fromJson(metaJson)
        : null;

    if (kDebugMode) {
      debugPrint(
        'search:web_resolver ${meta?.resolverState.name ?? 'browse'} '
        'count=${rows.length} source=${decoded['source'] ?? 'unknown'}',
      );
    }

    return CardPrintSearchResult(
      rows: rows,
      provisionalRows: provisionalRows,
      meta: meta,
      source: (decoded['source'] ?? 'web_ranked_resolver_v1').toString(),
    );
  }

  static Future<CardPrint?> getCardPrintByGvId({
    required SupabaseClient client,
    required String gvId,
  }) async {
    final normalized = gvId.trim();
    if (!normalized.startsWith('GV-')) {
      return null;
    }

    final row = await client
        .from('card_prints')
        .select(_cardPrintSelect)
        .eq('gv_id', normalized)
        .maybeSingle();

    return row == null ? null : CardPrint.fromJson(row);
  }

  static Future<List<CardPrint>> searchCardPrints({
    required SupabaseClient client,
    required CardSearchOptions options,
    int defaultLimit = 200,
    int searchLimit = 500,
  }) async {
    // SEARCH_CONTRACT_V1 enforced here:
    // 1) set_code/printed_set_abbrev + number
    // 2) set-name-resolved + number
    // 3) name + number (order-insensitive)
    // 4) number-only
    // 5) name-only

    final trimmed = options.query.trim();
    final isNumberWithTotal = RegExp(r'^\d+/\d+$').hasMatch(trimmed);

    if (trimmed.isEmpty) {
      final List<dynamic> data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .order(options.sort, ascending: true)
          .limit(options.limit.clamp(1, defaultLimit));

      return data
          .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
          .toList();
    }

    final tokens = _tokenize(trimmed);
    final numberInfo = _extractNumberCandidate(
      tokens,
      isNumberWithTotal: isNumberWithTotal,
      rawQuery: trimmed,
    );
    final setIndex = _extractSetIndex(tokens);
    final maybeSet = setIndex != null ? tokens.lowerTokens[setIndex] : '';
    final nameTokens = _extractNameTokens(
      tokens,
      numberIndex: numberInfo.index,
      setIndex: setIndex,
    );

    final hasSetToken = setIndex != null;
    final isSetPlusNumber = hasSetToken && numberInfo.hasNumber;
    final isSetOnly =
        hasSetToken && !numberInfo.hasNumber && tokens.rawTokens.length == 1;

    List<dynamic> data;
    String mode;

    final resolvedSet = await _resolveSetByName(
      client,
      tokens.rawTokens,
      shouldAttempt:
          !isSetPlusNumber &&
          !isSetOnly &&
          !numberInfo.hasNumber &&
          tokens.rawTokens.length >= 2 &&
          !_looksLikeCode(maybeSet),
    );
    final setNameRemainder = resolvedSet?['remainder'];

    // Legacy search path was the default (below). New RPC first, then fallback to preserve behavior.
    Future<List<CardPrint>> legacySearch() async {
      if (isSetPlusNumber) {
        mode = 'set+number';
        final qb = _buildSetNumberQuery(
          client: client,
          setCode: maybeSet,
          normNum: numberInfo.norm!,
          pad3: numberInfo.pad3,
          sort: options.sort,
        );
        final limited = _applyRarity(
          qb,
          options.rarity,
        ).limit(options.limit.clamp(1, 25));
        data = await limited;
      } else if (isSetOnly) {
        mode = 'set';
        final qb = _buildSetOnlyQuery(
          client: client,
          setCode: maybeSet,
          sort: options.sort,
        );
        final limited = _applyRarity(
          qb,
          options.rarity,
        ).limit(options.limit.clamp(1, searchLimit));
        data = await limited;
      } else if (numberInfo.hasNumber) {
        final numPart = numberInfo.norm!;
        if (nameTokens.isEmpty) {
          mode = 'number';
          final qb = _buildNumberOnlyQuery(
            client: client,
            normNum: numPart,
            pad3: numberInfo.pad3,
          );
          final limited = _applyRarity(
            qb,
            options.rarity,
          ).limit(options.limit.clamp(1, isNumberWithTotal ? 25 : 50));
          data = await limited;
          return data
              .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
              .toList();
        } else {
          mode = 'name+number';
          final nameQuery = nameTokens.join(' ').trim();
          final pattern = nameQuery.isNotEmpty ? '%$nameQuery%' : '%$trimmed%';

          final qb = _buildNameNumberQuery(
            client: client,
            normNum: numPart,
            pad3: numberInfo.pad3,
            namePattern: pattern,
          );
          final limited = _applyRarity(
            qb,
            options.rarity,
          ).limit(options.limit.clamp(1, 50));
          data = await limited;
          return data
              .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
              .toList();
        }
      } else if (resolvedSet != null) {
        mode = 'set+name';
        final setCode = (resolvedSet['code'] ?? '').toString();
        final nameRemainder = (setNameRemainder ?? '').trim();

        if (setCode.isEmpty) {
          mode = 'name';
        }

        if (mode == 'set+name') {
          final pattern = nameRemainder.isNotEmpty
              ? '%$nameRemainder%'
              : '%$trimmed%';
          final qb = _buildSetNameQuery(
            client: client,
            setCode: setCode,
            namePattern: pattern,
            sort: options.sort,
          );
          final limited = _applyRarity(
            qb,
            options.rarity,
          ).limit(options.limit.clamp(1, 100));
          data = await limited;
        } else {
          final qb = _buildNameOnlyQuery(
            client: client,
            namePattern: '%$trimmed%',
            sort: options.sort,
          );
          final limited = _applyRarity(
            qb,
            options.rarity,
          ).limit(options.limit.clamp(1, searchLimit));
          data = await limited;
        }
      } else {
        mode = 'name';
        final qb = _buildNameOnlyQuery(
          client: client,
          namePattern: '%$trimmed%',
          sort: options.sort,
        );
        final limited = _applyRarity(
          qb,
          options.rarity,
        ).limit(options.limit.clamp(1, searchLimit));
        data = await limited;
      }

      var results = data
          .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
          .toList();

      if (results.isEmpty && mode == 'name') {
        final tokens = trimmed.split(' ');
        if (tokens.length > 1) {
          final first = tokens.first;
          final relaxedPattern = '%$first%';

          final List<dynamic> data2 = await client
              .from('card_prints')
              .select(_cardPrintSelect)
              .ilike('name', relaxedPattern)
              .order('name', ascending: true)
              .limit(searchLimit);

          results = data2
              .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
              .toList();
        }
      }

      return results;
    }

    // Prefer deterministic SEARCH_CONTRACT_V1; fall back to legacy query path on error/empty.
    if (trimmed.isNotEmpty) {
      try {
        final rpcResp = await client.rpc(
          'search_card_prints_v1',
          params: {
            'q': trimmed,
            'set_code_in': null,
            'number_in': numberInfo.hasNumber ? numberInfo.norm : null,
            'limit_in': options.limit.clamp(1, searchLimit),
            'offset_in': 0,
          },
        );
        if (rpcResp is List && rpcResp.isNotEmpty) {
          if (kDebugMode) debugPrint('search:v1');
          return rpcResp
              .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
              .toList();
        }
      } catch (_) {
        // fall through to legacy
      }
    }

    final legacy = await legacySearch();
    if (kDebugMode && trimmed.isNotEmpty) debugPrint('search:legacy');
    return legacy;
  }

  static List<CardPrint> _filterByRarity(
    List<CardPrint> rows,
    RarityOption rarity,
  ) {
    bool matchesRarity(String? value) {
      final raw = (value ?? '').toLowerCase();
      if (raw.isEmpty) return false;

      switch (rarity) {
        case RarityOption.common:
          return raw.contains('common');
        case RarityOption.uncommon:
          return raw.contains('uncommon');
        case RarityOption.rare:
          return raw.contains('rare') &&
              !raw.contains('ultra') &&
              !raw.contains('secret');
        case RarityOption.ultra:
          return raw.contains('ultra') || raw.contains('secret');
        case RarityOption.secret:
          return raw.contains('secret');
        case RarityOption.all:
          return true;
      }
    }

    if (rarity == RarityOption.all) {
      return rows;
    }

    return rows.where((row) => matchesRarity(row.rarity)).toList();
  }

  static _TokenizedQuery _tokenize(String raw) {
    final lower = raw.toLowerCase();
    List<String> rawTokens = raw
        .split(RegExp(r'\s+|-'))
        .where((p) => p.isNotEmpty)
        .toList();
    List<String> lowerTokens = lower
        .split(RegExp(r'\s+|-'))
        .where((p) => p.isNotEmpty)
        .toList();

    final gluedMatch = RegExp(r'^(\d+)(?:/\d+)?([A-Za-z].+)$').firstMatch(raw);
    if (gluedMatch != null) {
      final gluedNum = gluedMatch.group(1)?.trim() ?? '';
      final gluedName = gluedMatch.group(2)?.trim() ?? '';
      if (gluedNum.isNotEmpty) {
        rawTokens = [gluedNum];
        lowerTokens = [gluedNum.toLowerCase()];
        if (gluedName.isNotEmpty) {
          rawTokens.add(gluedName);
          lowerTokens.add(gluedName.toLowerCase());
        }
      }
    }

    return _TokenizedQuery(rawTokens: rawTokens, lowerTokens: lowerTokens);
  }

  static String? _normalizeIdentityFilter(String? value) {
    final normalized = (value ?? '').trim().toLowerCase().replaceAll(
      RegExp(r'[_\s-]+'),
      '_',
    );
    if (normalized.isEmpty || normalized == 'all') {
      return null;
    }

    const supported = <String>{
      'alternate_art',
      'classic_collection',
      'pokemon_together_stamp',
      'trainer_gallery',
      'radiant_collection',
      'prerelease',
      'staff',
    };

    return supported.contains(normalized) ? normalized : null;
  }

  static String _rawNumberDigits(String input) {
    final prefix = input.split('/').first.trim();
    final match = RegExp(r'^(\d+)').firstMatch(prefix);
    return match?.group(1) ?? '';
  }

  static String _normalizeCardNumber(String raw) {
    final digits = _rawNumberDigits(raw);
    if (digits.isEmpty) return '';
    final normalized = digits.replaceFirst(RegExp(r'^0+'), '');
    if (normalized.isEmpty && digits.isNotEmpty) {
      return '0';
    }
    return normalized;
  }

  static _NumberCandidateInfo _extractNumberCandidate(
    _TokenizedQuery tokens, {
    required bool isNumberWithTotal,
    required String rawQuery,
  }) {
    for (var i = 0; i < tokens.rawTokens.length; i++) {
      final norm = _normalizeCardNumber(tokens.rawTokens[i]);
      if (norm.isNotEmpty) {
        final pad3 = norm.padLeft(3, '0');
        final rawDigits = _rawNumberDigits(tokens.rawTokens[i]);
        return _NumberCandidateInfo(
          index: i,
          norm: norm,
          pad3: pad3,
          rawDigits: rawDigits,
        );
      }
    }
    if (isNumberWithTotal) {
      final norm = _normalizeCardNumber(rawQuery);
      final pad3 = norm.isNotEmpty ? norm.padLeft(3, '0') : '';
      final rawDigits = _rawNumberDigits(rawQuery);
      return _NumberCandidateInfo(
        index: null,
        norm: norm,
        pad3: pad3,
        rawDigits: rawDigits,
      );
    }
    return const _NumberCandidateInfo(
      index: null,
      norm: null,
      pad3: '',
      rawDigits: '',
    );
  }

  static bool _looksLikeCode(String s) =>
      RegExp(r'^[a-z]{2,4}\d*$').hasMatch(s);

  static int? _extractSetIndex(_TokenizedQuery tokens) {
    if (tokens.lowerTokens.isEmpty) return null;
    return _looksLikeCode(tokens.lowerTokens.first) ? 0 : null;
  }

  static List<String> _extractNameTokens(
    _TokenizedQuery tokens, {
    int? numberIndex,
    int? setIndex,
  }) {
    final names = <String>[];
    for (var i = 0; i < tokens.rawTokens.length; i++) {
      if (numberIndex != null && i == numberIndex) continue;
      if (setIndex != null && i == setIndex) continue;
      names.add(tokens.rawTokens[i]);
    }
    return names;
  }

  static Future<Map<String, String>?> _resolveSetByName(
    SupabaseClient client,
    List<String> tokens, {
    required bool shouldAttempt,
  }) async {
    if (!shouldAttempt) return null;
    final maxPrefix = tokens.length > 4 ? 4 : tokens.length;
    for (var len = maxPrefix; len >= 1; len--) {
      final prefix = tokens.take(len).join(' ').trim();
      if (prefix.isEmpty) continue;
      final matches = await client
          .from('sets')
          .select('name,code')
          .ilike('name', '%$prefix%')
          .limit(5);
      if (matches.length == 1) {
        final row = matches.first;
        return {
          'code': (row['code'] ?? '').toString(),
          'name': (row['name'] ?? '').toString(),
          'remainder': tokens.skip(len).join(' ').trim(),
        };
      }
      if (matches.length > 1) {
        return null;
      }
    }
    return null;
  }

  static dynamic _applyRarity(dynamic qb, RarityOption rarity) {
    switch (rarity) {
      case RarityOption.common:
        return qb.ilike('rarity', '%common%');
      case RarityOption.uncommon:
        return qb.ilike('rarity', '%uncommon%');
      case RarityOption.rare:
        return qb
            .ilike('rarity', '%rare%')
            .not('rarity', 'ilike', '%ultra%')
            .not('rarity', 'ilike', '%secret%');
      case RarityOption.ultra:
        return qb.or('rarity.ilike.%ultra%,rarity.ilike.%secret%');
      case RarityOption.secret:
        return qb.ilike('rarity', '%secret%');
      case RarityOption.all:
        return qb;
    }
  }

  static dynamic _buildSetNumberQuery({
    required SupabaseClient client,
    required String setCode,
    required String normNum,
    required String pad3,
    required String sort,
  }) {
    return client
        .from('card_prints')
        .select(_cardPrintSelect)
        .eq('set_code', setCode)
        .or(
          'number_plain.eq.$normNum,number_plain.eq.$pad3,number.eq.$normNum,number.eq.$pad3',
        )
        .order(sort, ascending: true);
  }

  static dynamic _buildSetOnlyQuery({
    required SupabaseClient client,
    required String setCode,
    required String sort,
  }) {
    return client
        .from('card_prints')
        .select(_cardPrintSelect)
        .eq('set_code', setCode)
        .order(sort, ascending: true);
  }

  static dynamic _buildNumberOnlyQuery({
    required SupabaseClient client,
    required String normNum,
    required String pad3,
  }) {
    return client
        .from('card_prints')
        .select(_cardPrintSelect)
        .or(
          'number_plain.eq.$normNum,number_plain.eq.$pad3,number.eq.$normNum,number.eq.$pad3',
        )
        .order('set_code', ascending: true)
        .order('number_plain', ascending: true);
  }

  static dynamic _buildNameNumberQuery({
    required SupabaseClient client,
    required String normNum,
    required String pad3,
    required String namePattern,
  }) {
    return client
        .from('card_prints')
        .select(_cardPrintSelect)
        .ilike('name', namePattern)
        .or(
          'number_plain.eq.$normNum,number_plain.eq.$pad3,number.eq.$normNum,number.eq.$pad3',
        )
        .order('name', ascending: true);
  }

  static dynamic _buildSetNameQuery({
    required SupabaseClient client,
    required String setCode,
    required String namePattern,
    required String sort,
  }) {
    return client
        .from('card_prints')
        .select(_cardPrintSelect)
        .eq('set_code', setCode)
        .ilike('name', namePattern)
        .order(sort, ascending: true);
  }

  static dynamic _buildNameOnlyQuery({
    required SupabaseClient client,
    required String namePattern,
    required String sort,
  }) {
    return client
        .from('card_prints')
        .select(_cardPrintSelect)
        .ilike('name', namePattern)
        .order(sort, ascending: true);
  }

  /// Dev-only parser harness: call manually when debugging search parsing.
  static void debugPrintSearchParsingSamples() {
    const samples = [
      '43',
      '043',
      '043/198',
      'slowbro 43',
      '43 slowbro',
      '043slow',
      'SVI 043',
    ];
    for (final sample in samples) {
      final trimmed = sample.trim();
      final tokenized = _tokenize(trimmed);
      final numInfo = _extractNumberCandidate(
        tokenized,
        isNumberWithTotal: RegExp(r'^\d+/\d+$').hasMatch(trimmed),
        rawQuery: trimmed,
      );
      final setIndex = _extractSetIndex(tokenized);
      final setToken = setIndex != null ? tokenized.rawTokens[setIndex] : '';
      final names = _extractNameTokens(
        tokenized,
        numberIndex: numInfo.index,
        setIndex: setIndex,
      );
      debugPrint(
        '[search-parse] "$sample" -> number=${numInfo.norm ?? ''}/${numInfo.pad3} '
        'set=$setToken names=${names.join(' ')} tokens=${tokenized.rawTokens.join('|')}',
      );
    }
  }

  static Future<List<CardPrint>> fetchTrending({
    required SupabaseClient client,
    int limitPerName = 8,
  }) async {
    const popularNames = [
      'Charizard',
      'Pikachu',
      'Gardevoir',
      'Mewtwo',
      'Lugia',
      'Umbreon',
      'Rayquaza',
      'Eevee',
    ];

    final List<CardPrint> trending = [];

    for (final name in popularNames) {
      final List<dynamic> data = await client
          .from('card_prints')
          .select(_cardPrintSelect)
          .ilike('name', '%$name%')
          .order('name', ascending: true)
          .limit(limitPerName);

      trending.addAll(
        data
            .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
            .toList(),
      );
    }

    return trending;
  }

  static Future<List<CardPrint>> fetchByIds({
    required SupabaseClient client,
    required Iterable<String> ids,
  }) async {
    final normalizedIds = ids
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (normalizedIds.isEmpty) {
      return const <CardPrint>[];
    }

    final data = await client
        .from('card_prints')
        .select(_cardPrintSelect)
        .inFilter('id', normalizedIds);

    final cardsById = <String, CardPrint>{};
    for (final row in data as List<dynamic>) {
      final card = CardPrint.fromJson(row as Map<String, dynamic>);
      if (card.id.isNotEmpty) {
        cardsById[card.id] = card;
      }
    }

    return normalizedIds
        .map((id) => cardsById[id])
        .whereType<CardPrint>()
        .toList(growable: false);
  }

  static Future<List<CardPrint>> fetchByNameLike({
    required SupabaseClient client,
    required String name,
    int limit = 12,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      return const <CardPrint>[];
    }

    final data = await client
        .from('card_prints')
        .select(_cardPrintSelect)
        .ilike('name', '%$trimmed%')
        .order('name', ascending: true)
        .limit(limit.clamp(1, 200));

    return (data as List<dynamic>)
        .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
        .toList(growable: false);
  }

  static Future<List<CardPrint>> fetchBySetCode({
    required SupabaseClient client,
    required String setCode,
    int limit = 12,
  }) async {
    final normalizedSetCode = setCode.trim();
    if (normalizedSetCode.isEmpty) {
      return const <CardPrint>[];
    }

    final data = await client
        .from('card_prints')
        .select(_cardPrintSelect)
        .eq('set_code', normalizedSetCode)
        .order('name', ascending: true)
        .limit(limit.clamp(1, 200));

    return (data as List<dynamic>)
        .map((row) => CardPrint.fromJson(row as Map<String, dynamic>))
        .toList(growable: false);
  }
}

class _TokenizedQuery {
  const _TokenizedQuery({required this.rawTokens, required this.lowerTokens});
  final List<String> rawTokens;
  final List<String> lowerTokens;
}

class _NumberCandidateInfo {
  const _NumberCandidateInfo({
    this.index,
    this.norm,
    this.pad3 = '',
    this.rawDigits = '',
  });
  final int? index;
  final String? norm;
  final String pad3;
  final String rawDigits;
  bool get hasNumber => norm != null && norm!.isNotEmpty;
}
