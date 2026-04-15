import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/card_print.dart';

class SmartFeedLoadResult {
  const SmartFeedLoadResult({required this.cards, required this.usedFallback});

  final List<CardPrint> cards;
  final bool usedFallback;
}

class SmartFeedService {
  static const int _kDefaultFinalLimit = 36;
  static const int _kFallbackLimitPerName = 4;
  static const int _kMaxCandidateCards = 180;
  static const int _kWantLimit = 48;
  static const int _kRecentEventLimit = 160;
  static const int _kHydratedSignalCardLimit = 36;
  static const int _kNameSeedLimit = 4;
  static const int _kSetSeedLimit = 3;
  static const int _kNameCandidateLimit = 16;
  static const int _kSetCandidateLimit = 12;

  static const Set<String> _positiveEventTypes = <String>{
    'open_detail',
    'share',
    'add_to_vault',
    'want_on',
  };
  static const Set<String> _trackedEventTypes = <String>{
    'open_detail',
    'share',
    'add_to_vault',
    'want_on',
    'want_off',
  };

  static Future<SmartFeedLoadResult> load({
    required SupabaseClient client,
    int finalLimit = _kDefaultFinalLimit,
  }) async {
    final normalizedLimit = finalLimit.clamp(1, _kDefaultFinalLimit);
    final fallbackCards = _dedupeCards(
      await CardPrintRepository.fetchTrending(
        client: client,
        limitPerName: _kFallbackLimitPerName,
      ),
    );
    final fallbackResult = SmartFeedLoadResult(
      cards: _takeCards(fallbackCards, normalizedLimit),
      usedFallback: true,
    );

    final userId = _clean(client.auth.currentUser?.id);
    if (userId.isEmpty) {
      _debugSummary(
        usedFallback: true,
        candidateCount: fallbackCards.length,
        wantedCount: 0,
        positiveEventCount: 0,
        suppressionCount: 0,
        selectedCards: fallbackResult.cards,
      );
      return fallbackResult;
    }

    try {
      final responses = await Future.wait<dynamic>([
        client
            .from('user_card_intents')
            .select('card_print_id')
            .eq('user_id', userId)
            .eq('want', true)
            .order('updated_at', ascending: false)
            .limit(_kWantLimit),
        client
            .from('card_feed_events')
            .select('card_print_id,event_type,created_at')
            .eq('user_id', userId)
            .inFilter('event_type', _trackedEventTypes.toList(growable: false))
            .order('created_at', ascending: false)
            .limit(_kRecentEventLimit),
      ]);

      final wantRows = (responses[0] as List<dynamic>)
          .map((row) => _WantIntentRow.fromRow(row as Map))
          .where((row) => row.cardPrintId.isNotEmpty)
          .toList(growable: false);
      final eventRows = (responses[1] as List<dynamic>)
          .map((row) => _SmartFeedEventRow.fromRow(row as Map))
          .where(
            (row) => row.cardPrintId.isNotEmpty && row.eventType.isNotEmpty,
          )
          .toList(growable: false);

      final context = await _buildContext(
        client: client,
        wantRows: wantRows,
        eventRows: eventRows,
      );
      if (!context.hasSignals) {
        _debugSummary(
          usedFallback: true,
          candidateCount: fallbackCards.length,
          wantedCount: context.wantedCardIds.length,
          positiveEventCount: context.positiveEventCardIds.length,
          suppressionCount: context.recentlyOpenedCardIds.length,
          selectedCards: fallbackResult.cards,
        );
        return fallbackResult;
      }

      final candidates = await _buildCandidates(
        client: client,
        context: context,
        fallbackCards: fallbackCards,
      );
      final rankedCandidates = _rankCandidates(candidates, context);
      final selectedCandidates = _selectDiverseCandidates(
        rankedCandidates,
        normalizedLimit,
      );
      if (selectedCandidates.isEmpty) {
        _debugSummary(
          usedFallback: true,
          candidateCount: fallbackCards.length,
          wantedCount: context.wantedCardIds.length,
          positiveEventCount: context.positiveEventCardIds.length,
          suppressionCount: context.recentlyOpenedCardIds.length,
          selectedCards: fallbackResult.cards,
        );
        return fallbackResult;
      }

      final selectedCards = selectedCandidates
          .map((candidate) => candidate.card)
          .toList(growable: false);
      _debugSummary(
        usedFallback: false,
        candidateCount: rankedCandidates.length,
        wantedCount: context.wantedCardIds.length,
        positiveEventCount: context.positiveEventCardIds.length,
        suppressionCount: context.recentlyOpenedCardIds.length,
        selectedCards: selectedCards,
      );
      return SmartFeedLoadResult(cards: selectedCards, usedFallback: false);
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[smart-feed] falling back to static feed: $error');
      }
      return fallbackResult;
    }
  }

  static Future<_SmartFeedContext> _buildContext({
    required SupabaseClient client,
    required List<_WantIntentRow> wantRows,
    required List<_SmartFeedEventRow> eventRows,
  }) async {
    final wantedCardIds = wantRows
        .map((row) => row.cardPrintId)
        .toSet()
        .toList(growable: false);
    final positiveEventRows = eventRows
        .where((row) => _positiveEventTypes.contains(row.eventType))
        .toList(growable: false);
    final positiveEventCardIds = positiveEventRows
        .map((row) => row.cardPrintId)
        .toSet()
        .toList(growable: false);
    final wantOffCardIds = eventRows
        .where((row) => row.eventType == 'want_off')
        .map((row) => row.cardPrintId)
        .toSet();

    final eventCountByCardId = <String, int>{};
    final positiveEventCountByCardId = <String, int>{};
    final openCountByCardId = <String, int>{};
    final recentOpenRankByCardId = <String, int>{};
    final recentlyOpenedCardIds = <String>[];

    var openRank = 0;
    for (final row in eventRows) {
      eventCountByCardId.update(
        row.cardPrintId,
        (count) => count + 1,
        ifAbsent: () => 1,
      );
      if (_positiveEventTypes.contains(row.eventType)) {
        positiveEventCountByCardId.update(
          row.cardPrintId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      }
      if (row.eventType == 'open_detail') {
        openCountByCardId.update(
          row.cardPrintId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
        if (!recentOpenRankByCardId.containsKey(row.cardPrintId)) {
          recentOpenRankByCardId[row.cardPrintId] = openRank++;
          recentlyOpenedCardIds.add(row.cardPrintId);
        }
      }
    }

    final hydratedCards = await Future.wait<dynamic>([
      wantedCardIds.isEmpty
          ? Future<List<CardPrint>>.value(const <CardPrint>[])
          : CardPrintRepository.fetchByIds(
              client: client,
              ids: wantedCardIds.take(_kHydratedSignalCardLimit),
            ),
      positiveEventCardIds.isEmpty
          ? Future<List<CardPrint>>.value(const <CardPrint>[])
          : CardPrintRepository.fetchByIds(
              client: client,
              ids: positiveEventCardIds.take(_kHydratedSignalCardLimit),
            ),
    ]);

    final wantedCards = hydratedCards[0] as List<CardPrint>;
    final positiveCards = hydratedCards[1] as List<CardPrint>;

    return _SmartFeedContext(
      wantedCards: wantedCards,
      positiveCards: positiveCards,
      wantedCardIds: wantedCardIds.toSet(),
      wantedNames: _normalizedCardNames(wantedCards),
      wantedSetCodes: _normalizedSetCodes(wantedCards),
      positiveEventCardIds: positiveEventCardIds.toSet(),
      positiveEventNames: _normalizedCardNames(positiveCards),
      positiveEventSetCodes: _normalizedSetCodes(positiveCards),
      wantOffCardIds: wantOffCardIds,
      recentlyOpenedCardIds: recentlyOpenedCardIds.toSet(),
      recentOpenRankByCardId: recentOpenRankByCardId,
      eventCountByCardId: eventCountByCardId,
      positiveEventCountByCardId: positiveEventCountByCardId,
      openCountByCardId: openCountByCardId,
    );
  }

  static Future<List<_SmartFeedCandidate>> _buildCandidates({
    required SupabaseClient client,
    required _SmartFeedContext context,
    required List<CardPrint> fallbackCards,
  }) async {
    final candidateById = <String, _SmartFeedCandidate>{};

    void addCards(Iterable<CardPrint> cards, _SmartFeedCandidateSource source) {
      for (final card in cards) {
        final normalizedId = card.id.trim();
        if (normalizedId.isEmpty) {
          continue;
        }
        final existing = candidateById[normalizedId];
        if (existing != null) {
          existing.sources.add(source);
          continue;
        }
        if (candidateById.length >= _kMaxCandidateCards) {
          continue;
        }
        candidateById[normalizedId] = _SmartFeedCandidate(
          card: card,
          sources: <_SmartFeedCandidateSource>{source},
        );
      }
    }

    addCards(context.wantedCards, _SmartFeedCandidateSource.exactWanted);
    addCards(context.positiveCards, _SmartFeedCandidateSource.exactPositive);

    final wantedNameSeeds = _pickNameSeeds(
      context.wantedCards.map((card) => card.name),
    );
    final positiveNameSeeds = _pickNameSeeds(
      context.positiveCards.map((card) => card.name),
      exclude: wantedNameSeeds.map(_normalizeName).toSet(),
    );
    final setAffinitySeeds = _pickSetSeeds(<String>[
      ...context.wantedCards.map((card) => card.setCode),
      ...context.positiveCards.map((card) => card.setCode),
    ]);

    final wantedNameMatches = await Future.wait<List<CardPrint>>(
      wantedNameSeeds.map(
        (seed) => CardPrintRepository.fetchByNameLike(
          client: client,
          name: seed,
          limit: _kNameCandidateLimit,
        ),
      ),
    );
    for (final cards in wantedNameMatches) {
      addCards(cards, _SmartFeedCandidateSource.wantedName);
    }

    final positiveNameMatches = await Future.wait<List<CardPrint>>(
      positiveNameSeeds.map(
        (seed) => CardPrintRepository.fetchByNameLike(
          client: client,
          name: seed,
          limit: _kNameCandidateLimit,
        ),
      ),
    );
    for (final cards in positiveNameMatches) {
      addCards(cards, _SmartFeedCandidateSource.positiveName);
    }

    final setAffinityMatches = await Future.wait<List<CardPrint>>(
      setAffinitySeeds.map(
        (setCode) => CardPrintRepository.fetchBySetCode(
          client: client,
          setCode: setCode,
          limit: _kSetCandidateLimit,
        ),
      ),
    );
    for (final cards in setAffinityMatches) {
      addCards(cards, _SmartFeedCandidateSource.setAffinity);
    }

    addCards(fallbackCards, _SmartFeedCandidateSource.fallback);

    return candidateById.values.toList(growable: false);
  }

  static List<_SmartFeedCandidate> _rankCandidates(
    List<_SmartFeedCandidate> candidates,
    _SmartFeedContext context,
  ) {
    for (final candidate in candidates) {
      candidate.score = _scoreCandidate(candidate, context);
    }

    candidates.sort((a, b) {
      final scoreCompare = b.score.compareTo(a.score);
      if (scoreCompare != 0) {
        return scoreCompare;
      }
      final nameCompare = a.card.name.toLowerCase().compareTo(
        b.card.name.toLowerCase(),
      );
      if (nameCompare != 0) {
        return nameCompare;
      }
      final setCompare = a.card.setCode.toLowerCase().compareTo(
        b.card.setCode.toLowerCase(),
      );
      if (setCompare != 0) {
        return setCompare;
      }
      return a.card.id.compareTo(b.card.id);
    });

    return candidates;
  }

  static double _scoreCandidate(
    _SmartFeedCandidate candidate,
    _SmartFeedContext context,
  ) {
    final breakdown = candidate.scoreBreakdown;
    void addScore(String reason, double delta) {
      if (delta == 0) {
        return;
      }
      breakdown.update(reason, (value) => value + delta, ifAbsent: () => delta);
    }

    for (final source in candidate.sources) {
      addScore(source.name, _baseWeightForSource(source));
    }

    final card = candidate.card;
    final normalizedId = card.id.trim();
    final normalizedName = _normalizeName(card.name);
    final normalizedSetCode = _normalizeSetCode(card.setCode);

    final exactWanted =
        context.wantedCardIds.contains(normalizedId) &&
        !context.wantOffCardIds.contains(normalizedId);
    if (exactWanted) {
      addScore('wanted-id', 64);
    }
    if (context.wantedNames.contains(normalizedName)) {
      addScore('wanted-name', 28);
    }
    if (context.wantedSetCodes.contains(normalizedSetCode)) {
      addScore('wanted-set', 12);
    }

    if (context.positiveEventCardIds.contains(normalizedId)) {
      addScore('positive-id', 18);
    }
    if (context.positiveEventNames.contains(normalizedName)) {
      addScore('positive-name', 14);
    }
    if (context.positiveEventSetCodes.contains(normalizedSetCode)) {
      addScore('positive-set', 6);
    }

    final positiveEventCount = context.positiveEventCountByCardId[normalizedId];
    if (positiveEventCount != null && positiveEventCount > 0) {
      addScore('positive-repeat', positiveEventCount.clamp(1, 3) * 3);
    }

    final rarityBoost = _rarityBoost(card.rarity);
    if (rarityBoost > 0) {
      addScore('rarity', rarityBoost);
    }

    final openRank = context.recentOpenRankByCardId[normalizedId];
    if (openRank == null) {
      addScore('freshness', 4);
    } else {
      addScore('recent-open', -30);
      final recencyPenalty = openRank < 12 ? (12 - openRank).toDouble() : 0.0;
      if (recencyPenalty > 0) {
        addScore('recent-open-recency', -recencyPenalty);
      }
    }

    final openCount = context.openCountByCardId[normalizedId] ?? 0;
    if (openCount > 1) {
      addScore('repeat-open', -8 * (openCount - 1).toDouble());
    }

    if (context.wantOffCardIds.contains(normalizedId)) {
      addScore('want-off', -90);
    }

    return breakdown.values.fold<double>(0, (sum, value) => sum + value);
  }

  static List<_SmartFeedCandidate> _selectDiverseCandidates(
    List<_SmartFeedCandidate> rankedCandidates,
    int limit,
  ) {
    final selected = <_SmartFeedCandidate>[];
    final selectedIds = <String>{};
    final firstTwelveNameCounts = <String, int>{};
    final firstTwelveSetCounts = <String, int>{};

    for (final candidate in rankedCandidates) {
      if (selected.length >= limit) {
        break;
      }
      final normalizedId = candidate.card.id.trim();
      if (normalizedId.isEmpty || selectedIds.contains(normalizedId)) {
        continue;
      }

      final withinDiversityWindow = selected.length < 12;
      if (withinDiversityWindow) {
        final normalizedName = _normalizeName(candidate.card.name);
        final normalizedSetCode = _normalizeSetCode(candidate.card.setCode);
        if ((firstTwelveNameCounts[normalizedName] ?? 0) >= 2) {
          continue;
        }
        if ((firstTwelveSetCounts[normalizedSetCode] ?? 0) >= 3) {
          continue;
        }
        firstTwelveNameCounts.update(
          normalizedName,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
        firstTwelveSetCounts.update(
          normalizedSetCode,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      }

      selected.add(candidate);
      selectedIds.add(normalizedId);
    }

    if (selected.length >= limit) {
      return selected;
    }

    for (final candidate in rankedCandidates) {
      if (selected.length >= limit) {
        break;
      }
      final normalizedId = candidate.card.id.trim();
      if (normalizedId.isEmpty || selectedIds.contains(normalizedId)) {
        continue;
      }
      selected.add(candidate);
      selectedIds.add(normalizedId);
    }

    return selected;
  }

  static double _baseWeightForSource(_SmartFeedCandidateSource source) {
    switch (source) {
      case _SmartFeedCandidateSource.exactWanted:
        return 24;
      case _SmartFeedCandidateSource.exactPositive:
        return 18;
      case _SmartFeedCandidateSource.wantedName:
        return 14;
      case _SmartFeedCandidateSource.positiveName:
        return 11;
      case _SmartFeedCandidateSource.setAffinity:
        return 8;
      case _SmartFeedCandidateSource.fallback:
        return 4;
    }
  }

  static double _rarityBoost(String? rarity) {
    final normalized = _clean(rarity).toLowerCase();
    if (normalized.contains('secret')) {
      return 5;
    }
    if (normalized.contains('ultra')) {
      return 4;
    }
    if (normalized.contains('rare')) {
      return 2;
    }
    return 0;
  }

  static List<CardPrint> _dedupeCards(Iterable<CardPrint> cards) {
    final cardsById = <String, CardPrint>{};
    for (final card in cards) {
      final normalizedId = card.id.trim();
      if (normalizedId.isEmpty || cardsById.containsKey(normalizedId)) {
        continue;
      }
      cardsById[normalizedId] = card;
    }
    return cardsById.values.toList(growable: false);
  }

  static List<CardPrint> _takeCards(List<CardPrint> cards, int limit) {
    if (cards.length <= limit) {
      return List<CardPrint>.of(cards, growable: false);
    }
    return cards.sublist(0, limit);
  }

  static Set<String> _normalizedCardNames(Iterable<CardPrint> cards) {
    return cards
        .map((card) => _normalizeName(card.name))
        .where((value) => value.isNotEmpty)
        .toSet();
  }

  static Set<String> _normalizedSetCodes(Iterable<CardPrint> cards) {
    return cards
        .map((card) => _normalizeSetCode(card.setCode))
        .where((value) => value.isNotEmpty)
        .toSet();
  }

  static List<String> _pickNameSeeds(
    Iterable<String> names, {
    Set<String> exclude = const <String>{},
  }) {
    final seeds = <String>[];
    final seen = <String>{...exclude};
    for (final rawName in names) {
      final trimmed = rawName.trim();
      final normalized = _normalizeName(trimmed);
      if (normalized.length < 2 || !seen.add(normalized)) {
        continue;
      }
      seeds.add(trimmed);
      if (seeds.length >= _kNameSeedLimit) {
        break;
      }
    }
    return seeds;
  }

  static List<String> _pickSetSeeds(Iterable<String> setCodes) {
    final seeds = <String>[];
    final seen = <String>{};
    for (final rawSetCode in setCodes) {
      final trimmed = rawSetCode.trim();
      final normalized = _normalizeSetCode(trimmed);
      if (normalized.isEmpty || !seen.add(normalized)) {
        continue;
      }
      seeds.add(trimmed);
      if (seeds.length >= _kSetSeedLimit) {
        break;
      }
    }
    return seeds;
  }

  static void _debugSummary({
    required bool usedFallback,
    required int candidateCount,
    required int wantedCount,
    required int positiveEventCount,
    required int suppressionCount,
    required List<CardPrint> selectedCards,
  }) {
    if (!kDebugMode) {
      return;
    }

    final topNames = selectedCards
        .take(6)
        .map((card) => card.name.trim())
        .where((name) => name.isNotEmpty)
        .join(' | ');
    debugPrint(
      '[smart-feed] fallback=$usedFallback '
      'wanted=$wantedCount '
      'positive=$positiveEventCount '
      'suppressed=$suppressionCount '
      'candidates=$candidateCount '
      'final=${selectedCards.length} '
      'top=$topNames',
    );
  }
}

class _SmartFeedContext {
  const _SmartFeedContext({
    required this.wantedCards,
    required this.positiveCards,
    required this.wantedCardIds,
    required this.wantedNames,
    required this.wantedSetCodes,
    required this.positiveEventCardIds,
    required this.positiveEventNames,
    required this.positiveEventSetCodes,
    required this.wantOffCardIds,
    required this.recentlyOpenedCardIds,
    required this.recentOpenRankByCardId,
    required this.eventCountByCardId,
    required this.positiveEventCountByCardId,
    required this.openCountByCardId,
  });

  final List<CardPrint> wantedCards;
  final List<CardPrint> positiveCards;
  final Set<String> wantedCardIds;
  final Set<String> wantedNames;
  final Set<String> wantedSetCodes;
  final Set<String> positiveEventCardIds;
  final Set<String> positiveEventNames;
  final Set<String> positiveEventSetCodes;
  final Set<String> wantOffCardIds;
  final Set<String> recentlyOpenedCardIds;
  final Map<String, int> recentOpenRankByCardId;
  final Map<String, int> eventCountByCardId;
  final Map<String, int> positiveEventCountByCardId;
  final Map<String, int> openCountByCardId;

  bool get hasSignals =>
      wantedCardIds.isNotEmpty ||
      positiveEventCardIds.isNotEmpty ||
      recentlyOpenedCardIds.isNotEmpty;
}

enum _SmartFeedCandidateSource {
  exactWanted,
  exactPositive,
  wantedName,
  positiveName,
  setAffinity,
  fallback,
}

class _SmartFeedCandidate {
  _SmartFeedCandidate({
    required this.card,
    required Set<_SmartFeedCandidateSource> sources,
  }) : sources = Set<_SmartFeedCandidateSource>.from(sources);

  final CardPrint card;
  final Set<_SmartFeedCandidateSource> sources;
  final Map<String, double> scoreBreakdown = <String, double>{};
  double score = 0;
}

class _WantIntentRow {
  const _WantIntentRow({required this.cardPrintId});

  final String cardPrintId;

  factory _WantIntentRow.fromRow(Map<dynamic, dynamic> row) {
    return _WantIntentRow(cardPrintId: _clean(row['card_print_id']));
  }
}

class _SmartFeedEventRow {
  const _SmartFeedEventRow({
    required this.cardPrintId,
    required this.eventType,
    this.createdAt,
  });

  final String cardPrintId;
  final String eventType;
  final DateTime? createdAt;

  factory _SmartFeedEventRow.fromRow(Map<dynamic, dynamic> row) {
    return _SmartFeedEventRow(
      cardPrintId: _clean(row['card_print_id']),
      eventType: _clean(row['event_type']).toLowerCase(),
      createdAt: DateTime.tryParse(_clean(row['created_at'])),
    );
  }
}

String _clean(dynamic value) => (value ?? '').toString().trim();

String _normalizeName(String value) => value.trim().toLowerCase();

String _normalizeSetCode(String value) => value.trim().toLowerCase();
