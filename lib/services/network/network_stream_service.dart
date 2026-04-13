import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../public/card_surface_pricing_service.dart';
import '../public/following_service.dart';

const List<String> kDiscoverableVaultIntents = <String>[
  'trade',
  'sell',
  'showcase',
];

enum NetworkStreamSourceType {
  collectorWall,
  collectorInPlay,
  dbHighEnd,
  dbRandomExplore,
}

enum NetworkFeedMode { collectors, following }

enum NetworkStreamEmptyState { none, noFollowedCollectors, noFollowedCards }

class NetworkStreamCopy {
  const NetworkStreamCopy({
    required this.instanceId,
    required this.vaultItemId,
    required this.intent,
    this.gvviId,
    this.conditionLabel,
    this.isGraded = false,
    this.gradeCompany,
    this.gradeValue,
    this.gradeLabel,
    this.certNumber,
    this.createdAt,
  });

  final String instanceId;
  final String vaultItemId;
  final String intent;
  final String? gvviId;
  final String? conditionLabel;
  final bool isGraded;
  final String? gradeCompany;
  final String? gradeValue;
  final String? gradeLabel;
  final String? certNumber;
  final String? createdAt;
}

class NetworkStreamRow {
  const NetworkStreamRow({
    required this.sourceType,
    required this.vaultItemId,
    required this.ownerUserId,
    required this.ownerSlug,
    required this.ownerDisplayName,
    required this.cardPrintId,
    required this.quantity,
    required this.inPlayCount,
    required this.tradeCount,
    required this.sellCount,
    required this.showcaseCount,
    required this.rawCount,
    required this.slabCount,
    required this.gvId,
    required this.name,
    required this.setCode,
    required this.setName,
    required this.number,
    this.sourceLabel,
    this.rarity,
    this.intent,
    this.conditionLabel,
    this.isGraded = false,
    this.gradeCompany,
    this.gradeValue,
    this.gradeLabel,
    this.createdAt,
    this.imageUrl,
    this.inPlayCopies = const <NetworkStreamCopy>[],
    this.pricing,
    this.listingCount,
    this.rankingScore = 0,
  });

  final NetworkStreamSourceType sourceType;
  final String vaultItemId;
  final String ownerUserId;
  final String ownerSlug;
  final String ownerDisplayName;
  final String cardPrintId;
  final String? intent;
  final int quantity;
  final int inPlayCount;
  final int tradeCount;
  final int sellCount;
  final int showcaseCount;
  final int rawCount;
  final int slabCount;
  final String? conditionLabel;
  final bool isGraded;
  final String? gradeCompany;
  final String? gradeValue;
  final String? gradeLabel;
  final String? createdAt;
  final String gvId;
  final String name;
  final String setCode;
  final String setName;
  final String number;
  final String? sourceLabel;
  final String? rarity;
  final String? imageUrl;
  final List<NetworkStreamCopy> inPlayCopies;
  final CardSurfacePricingData? pricing;
  final int? listingCount;
  final int rankingScore;

  bool get isCollectorSource =>
      sourceType == NetworkStreamSourceType.collectorWall ||
      sourceType == NetworkStreamSourceType.collectorInPlay;

  bool get isDiscoverySource =>
      sourceType == NetworkStreamSourceType.dbHighEnd ||
      sourceType == NetworkStreamSourceType.dbRandomExplore;

  NetworkStreamRow copyWith({
    NetworkStreamSourceType? sourceType,
    String? sourceLabel,
    String? rarity,
    List<NetworkStreamCopy>? inPlayCopies,
    CardSurfacePricingData? pricing,
    int? listingCount,
    int? rankingScore,
  }) {
    return NetworkStreamRow(
      sourceType: sourceType ?? this.sourceType,
      vaultItemId: vaultItemId,
      ownerUserId: ownerUserId,
      ownerSlug: ownerSlug,
      ownerDisplayName: ownerDisplayName,
      cardPrintId: cardPrintId,
      intent: intent,
      quantity: quantity,
      inPlayCount: inPlayCount,
      tradeCount: tradeCount,
      sellCount: sellCount,
      showcaseCount: showcaseCount,
      rawCount: rawCount,
      slabCount: slabCount,
      conditionLabel: conditionLabel,
      isGraded: isGraded,
      gradeCompany: gradeCompany,
      gradeValue: gradeValue,
      gradeLabel: gradeLabel,
      createdAt: createdAt,
      gvId: gvId,
      name: name,
      setCode: setCode,
      setName: setName,
      number: number,
      sourceLabel: sourceLabel ?? this.sourceLabel,
      rarity: rarity ?? this.rarity,
      imageUrl: imageUrl,
      inPlayCopies: inPlayCopies ?? this.inPlayCopies,
      pricing: pricing ?? this.pricing,
      listingCount: listingCount ?? this.listingCount,
      rankingScore: rankingScore ?? this.rankingScore,
    );
  }
}

class NetworkStreamPage {
  const NetworkStreamPage({
    required this.rows,
    required this.hasMore,
    required this.collectorExhausted,
    required this.dbOnlyMode,
    required this.sessionId,
    this.emptyState = NetworkStreamEmptyState.none,
  });

  final List<NetworkStreamRow> rows;
  final bool hasMore;
  final bool collectorExhausted;
  final bool dbOnlyMode;
  final int sessionId;
  final NetworkStreamEmptyState emptyState;
}

class _NetworkTasteSignal {
  const _NetworkTasteSignal({
    required this.cardPrintId,
    required this.nameFamilyKey,
    required this.setCode,
    required this.rarity,
    required this.priceBand,
    required this.sourceType,
    required this.event,
  });

  final String cardPrintId;
  final String nameFamilyKey;
  final String setCode;
  final String rarity;
  final String priceBand;
  final NetworkStreamSourceType sourceType;
  final String event;
}

class _NetworkFeedSession {
  _NetworkFeedSession({
    required this.sessionId,
    required this.seed,
    required this.scopeKey,
  });

  final int sessionId;
  final int seed;
  final String scopeKey;
  final List<String> recentCardPrintIds = <String>[];
  final List<String> recentSourceKeys = <String>[];
  final Set<String> emittedSourceKeys = <String>{};
  final Set<String> emittedCollectorSourceKeys = <String>{};
  final Set<String> emittedDiscoverySourceKeys = <String>{};
  final Set<String> emittedDiscoveryCardPrintIds = <String>{};
  final List<_NetworkTasteSignal> recentSignals = <_NetworkTasteSignal>[];
  List<String>? followedOwnerUserIds;
  bool collectorExhausted = false;
  bool dbOnlyMode = false;
  int pageCount = 0;
}

class NetworkStreamService {
  static const bool _kNetworkFeedDiagnostics = false;
  static const int _sessionExposureMemory = 72;
  static const int _firstViewportFreshnessCount = 8;
  static const int _heroCollectorSlotCount = 3;
  static const int _heroCollectorPoolLimit = 6;
  static const int _heroCollectorScoreDelta = 18;
  static const int _recentHardCardWindow = 10;
  static const int _recentSoftCardWindow = 28;
  static const int _recentHardSourceWindow = 14;
  static const int _recentSoftSourceWindow = 40;
  static const int _tasteSignalMemory = 8;
  static _NetworkFeedSession? _activeSession;
  static int _sessionCounter = 0;

  static Future<NetworkStreamPage> fetchRows({
    required SupabaseClient client,
    required NetworkFeedMode mode,
    String? intent,
    String? excludeUserId,
    String? viewerUserId,
    int limit = 24,
    bool resetSession = false,
  }) async {
    final normalizedIntent = normalizeDiscoverableVaultIntent(intent);
    final normalizedExcludeUserId = _clean(excludeUserId);
    final normalizedViewerUserId = _clean(viewerUserId);
    final normalizedLimit = _clampedInt(limit, 8, 60);
    final session = _ensureSession(
      scopeKey: _sessionScopeKey(
        mode: mode,
        intent: normalizedIntent,
        excludeUserId: normalizedExcludeUserId,
        viewerUserId: normalizedViewerUserId,
      ),
      reset: resetSession,
    )..pageCount += 1;

    if (mode == NetworkFeedMode.following) {
      final followedOwnerUserIds = await _loadFollowedOwnerUserIds(
        client: client,
        session: session,
        viewerUserId: normalizedViewerUserId,
      );
      if (followedOwnerUserIds.isEmpty) {
        return NetworkStreamPage(
          rows: const <NetworkStreamRow>[],
          hasMore: false,
          collectorExhausted: true,
          dbOnlyMode: false,
          sessionId: session.sessionId,
          emptyState: NetworkStreamEmptyState.noFollowedCollectors,
        );
      }

      return _fetchCollectorOnlyPage(
        client: client,
        session: session,
        intent: normalizedIntent,
        excludeUserId: normalizedExcludeUserId,
        limit: normalizedLimit,
        ownerUserIds: followedOwnerUserIds,
        emptyStateWhenNoRows: NetworkStreamEmptyState.noFollowedCards,
        context: normalizedIntent == null ? 'following' : 'following_intent',
      );
    }

    if (normalizedIntent != null) {
      return _fetchCollectorOnlyPage(
        client: client,
        session: session,
        intent: normalizedIntent,
        excludeUserId: normalizedExcludeUserId,
        limit: normalizedLimit,
        context: 'collector_only',
      );
    }

    if (session.collectorExhausted) {
      session.dbOnlyMode = true;
      _debugFreshness(
        'db_only_page session=${session.sessionId} page=${session.pageCount}',
      );
      return _fetchDiscoveryOnlyPage(
        client: client,
        session: session,
        limit: normalizedLimit,
      );
    }

    return _fetchMixedPage(
      client: client,
      session: session,
      excludeUserId: normalizedExcludeUserId,
      limit: normalizedLimit,
    );
  }

  static void recordInteraction(NetworkStreamRow row, {String event = 'open'}) {
    final session = _activeSession;
    if (session == null) {
      return;
    }

    final signal = _NetworkTasteSignal(
      cardPrintId: row.cardPrintId,
      nameFamilyKey: _nameFamilyKey(row.name),
      setCode: row.setCode.trim().toLowerCase(),
      rarity: _clean(row.rarity).toLowerCase(),
      priceBand: _priceBandKey(row.pricing?.visibleValue),
      sourceType: row.sourceType,
      event: event,
    );

    session.recentSignals.removeWhere(
      (existing) =>
          existing.event == signal.event &&
          existing.cardPrintId == signal.cardPrintId,
    );
    session.recentSignals.add(signal);
    if (session.recentSignals.length > _tasteSignalMemory) {
      session.recentSignals.removeAt(0);
    }
  }

  static _NetworkFeedSession _ensureSession({
    required String scopeKey,
    required bool reset,
  }) {
    final current = _activeSession;
    final shouldReset =
        reset || current == null || current.scopeKey != scopeKey;
    if (!shouldReset) {
      return current;
    }

    final session = _NetworkFeedSession(
      sessionId: ++_sessionCounter,
      seed: _buildSessionSeed(scopeKey, _sessionCounter),
      scopeKey: scopeKey,
    );
    _activeSession = session;
    _debugFreshness(
      'session_reset session=${session.sessionId} seed=${session.seed} scope=$scopeKey',
    );
    return session;
  }

  static Future<List<String>> _loadFollowedOwnerUserIds({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required String viewerUserId,
  }) async {
    final cachedIds = session.followedOwnerUserIds;
    if (cachedIds != null) {
      return cachedIds;
    }

    if (viewerUserId.isEmpty) {
      session.followedOwnerUserIds = const <String>[];
      return session.followedOwnerUserIds!;
    }

    final followedCollectors = await FollowingService.fetchFollowingCollectors(
      client: client,
      userId: viewerUserId,
    );
    final followedOwnerUserIds = followedCollectors
        .map((collector) => collector.userId.trim())
        .where((userId) => userId.isNotEmpty)
        .toSet()
        .toList(growable: false);
    session.followedOwnerUserIds = followedOwnerUserIds;
    return followedOwnerUserIds;
  }

  static Future<NetworkStreamPage> _fetchMixedPage({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required String excludeUserId,
    required int limit,
  }) async {
    final collectorCandidates = await _fetchCollectorCandidates(
      client: client,
      session: session,
      intent: null,
      excludeUserId: excludeUserId,
      limit: limit,
    );
    final eligibleCollectors = collectorCandidates
        .where((row) => !_hasEmittedCollectorRow(session, row))
        .toList();

    if (eligibleCollectors.isEmpty) {
      session.collectorExhausted = true;
      session.dbOnlyMode = true;
      _debugFreshness(
        'collector_exhausted session=${session.sessionId} page=${session.pageCount}',
      );
      return _fetchDiscoveryOnlyPage(
        client: client,
        session: session,
        limit: limit,
      );
    }

    final targetDiscoveryCount = _targetDiscoveryCount(
      collectorCount: eligibleCollectors.length,
      limit: limit,
    );
    final collectorBudget = _clampedInt(limit - targetDiscoveryCount, 1, limit);
    final collectorRows = _selectCollectorRowsForPage(
      eligibleCollectors: eligibleCollectors,
      budget: collectorBudget,
      session: session,
      context: 'mixed',
    );
    final remainingCollectorCount =
        eligibleCollectors.length - collectorRows.length;

    if (remainingCollectorCount <= 0) {
      session.collectorExhausted = true;
      _debugFreshness(
        'collector_exhausted session=${session.sessionId} page=${session.pageCount} after_emit=true',
      );
    }

    final discoveryRows = await _fetchDiscoveryPage(
      client: client,
      session: session,
      limit: limit - collectorRows.length,
      excludeCardPrintIds: collectorRows.map((row) => row.cardPrintId).toSet(),
    );
    final mergedRows = _injectDiscoveryRows(
      collectors: collectorRows,
      discovery: discoveryRows,
      limit: limit,
      targetDiscoveryCount: discoveryRows.length,
    );
    final pageRows = _diversifyFirstViewportRows(mergedRows, session: session);
    _commitSessionRows(session, pageRows);
    _debugPageSnapshot(session, pageRows);

    return NetworkStreamPage(
      rows: pageRows,
      hasMore: pageRows.isNotEmpty,
      collectorExhausted: session.collectorExhausted,
      dbOnlyMode: false,
      sessionId: session.sessionId,
    );
  }

  static String _sessionScopeKey({
    required NetworkFeedMode mode,
    required String? intent,
    required String excludeUserId,
    required String viewerUserId,
  }) =>
      '${mode.name}:${intent ?? 'all'}:'
      '${excludeUserId.isEmpty ? 'viewer' : 'self'}:'
      '${viewerUserId.isEmpty ? 'anon' : viewerUserId}';

  static int _buildSessionSeed(String scopeKey, int sessionId) {
    final millis = DateTime.now().toUtc().millisecondsSinceEpoch;
    return _stableDiscoveryHash('$scopeKey:$millis:$sessionId', sessionId + 97);
  }

  static void _debugFreshness(String message) {
    if (!kDebugMode || !_kNetworkFeedDiagnostics) {
      return;
    }
    debugPrint('NETWORK_FRESHNESS_V2 $message');
  }

  static void _debugPageSnapshot(
    _NetworkFeedSession session,
    List<NetworkStreamRow> rows,
  ) {
    if (!kDebugMode || !_kNetworkFeedDiagnostics) {
      return;
    }
    final preview = rows
        .take(10)
        .map(
          (row) => '${row.sourceType.name}:${row.cardPrintId.substring(0, 4)}',
        )
        .join(',');
    debugPrint(
      'NETWORK_FRESHNESS_V2 page session=${session.sessionId} '
      'page=${session.pageCount} count=${rows.length} '
      'collectorExhausted=${session.collectorExhausted} '
      'dbOnly=${session.dbOnlyMode} preview=[$preview]',
    );
  }

  static Future<List<NetworkStreamRow>> _fetchCollectorCandidates({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required String? intent,
    required String excludeUserId,
    required int limit,
    Iterable<String>? ownerUserIds,
  }) async {
    final normalizedOwnerUserIds = ownerUserIds
        ?.map(_clean)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (ownerUserIds != null &&
        (normalizedOwnerUserIds == null || normalizedOwnerUserIds.isEmpty)) {
      return const <NetworkStreamRow>[];
    }

    final collectorQueryLimit = _clampedInt(limit * 8, 48, 240);

    dynamic query = client
        .from('v_card_stream_v1')
        .select(
          'vault_item_id,owner_user_id,owner_slug,owner_display_name,card_print_id,intent,quantity,in_play_count,trade_count,sell_count,showcase_count,raw_count,slab_count,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url',
        );

    if (intent != null) {
      query = query.gt('${intent}_count', 0);
    }

    if (excludeUserId.isNotEmpty) {
      query = query.neq('owner_user_id', excludeUserId);
    }

    if (normalizedOwnerUserIds != null && normalizedOwnerUserIds.isNotEmpty) {
      query = query.inFilter('owner_user_id', normalizedOwnerUserIds);
    }

    final response = await query
        .order('created_at', ascending: false)
        .order('vault_item_id', ascending: false)
        .limit(collectorQueryLimit);
    final baseRows = (response as List<dynamic>)
        .map((raw) => _normalizeRow(Map<String, dynamic>.from(raw as Map)))
        .whereType<NetworkStreamRow>()
        .toList();

    final collectorRows = await _enrichCollectorRows(
      client: client,
      rows: baseRows,
    );
    return _rankRows(collectorRows, session: session);
  }

  static Future<List<NetworkStreamRow>> _fetchDiscoveryPage({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required int limit,
    required Set<String> excludeCardPrintIds,
  }) async {
    if (limit <= 0) {
      return const <NetworkStreamRow>[];
    }

    final discoveryCandidates = await _fetchDiscoveryRows(
      client: client,
      session: session,
      excludeCardPrintIds: excludeCardPrintIds,
      targetCount: _clampedInt(limit * 3, limit, 36),
    );
    final rankedDiscovery = _rankRows(discoveryCandidates, session: session);
    return _selectDiscoveryRowsForSession(
      rankedDiscovery,
      session: session,
      limit: limit,
    );
  }

  static List<NetworkStreamRow> _selectDiscoveryRowsForSession(
    List<NetworkStreamRow> rows, {
    required _NetworkFeedSession session,
    required int limit,
  }) {
    if (rows.isEmpty || limit <= 0) {
      return const <NetworkStreamRow>[];
    }

    final selected = <NetworkStreamRow>[];
    void appendRows(Iterable<NetworkStreamRow> source) {
      for (final row in source) {
        if (selected.length >= limit) {
          return;
        }
        final sourceKey = _sessionSourceKey(row);
        final alreadySelected = selected.any(
          (existing) => _sessionSourceKey(existing) == sourceKey,
        );
        if (alreadySelected) {
          continue;
        }
        selected.add(row);
      }
    }

    final unseenRows = rows.where(
      (row) => !session.emittedDiscoveryCardPrintIds.contains(row.cardPrintId),
    );
    appendRows(unseenRows.where((row) => !_isHardSuppressed(session, row)));
    appendRows(unseenRows);

    final seenRows = rows.where(
      (row) => session.emittedDiscoveryCardPrintIds.contains(row.cardPrintId),
    );
    final relaxedSeenRows = [...seenRows]
      ..sort(
        (left, right) => _recencyPenalty(
          session,
          left,
        ).compareTo(_recencyPenalty(session, right)),
      );
    appendRows(
      relaxedSeenRows.where((row) => !_isHardSuppressed(session, row)),
    );
    appendRows(relaxedSeenRows);

    return selected.take(limit).toList();
  }

  static void _commitSessionRows(
    _NetworkFeedSession session,
    List<NetworkStreamRow> rows,
  ) {
    _rememberSessionExposure(session, rows);
    for (final row in rows) {
      final sourceKey = _sessionSourceKey(row);
      session.emittedSourceKeys.add(sourceKey);
      if (row.isCollectorSource) {
        session.emittedCollectorSourceKeys.add(sourceKey);
      }
      if (row.isDiscoverySource) {
        session.emittedDiscoverySourceKeys.add(sourceKey);
        session.emittedDiscoveryCardPrintIds.add(row.cardPrintId);
      }
    }
  }

  static bool _hasEmittedCollectorRow(
    _NetworkFeedSession session,
    NetworkStreamRow row,
  ) => session.emittedCollectorSourceKeys.contains(_sessionSourceKey(row));

  static bool _isHardSuppressed(
    _NetworkFeedSession session,
    NetworkStreamRow row,
  ) {
    final cardDistance = _recentDistanceFromEnd(
      session.recentCardPrintIds,
      row.cardPrintId,
    );
    if (cardDistance >= 0 && cardDistance < _recentHardCardWindow) {
      return true;
    }

    final sourceDistance = _recentDistanceFromEnd(
      session.recentSourceKeys,
      _sessionSourceKey(row),
    );
    return sourceDistance >= 0 && sourceDistance < _recentHardSourceWindow;
  }

  static int _recencyPenalty(
    _NetworkFeedSession session,
    NetworkStreamRow row,
  ) {
    var penalty = 0;
    final cardDistance = _recentDistanceFromEnd(
      session.recentCardPrintIds,
      row.cardPrintId,
    );
    if (cardDistance >= 0) {
      if (cardDistance < _recentHardCardWindow) {
        penalty += 300;
      } else if (cardDistance < _recentSoftCardWindow) {
        penalty += 120;
      } else {
        penalty += 48;
      }
    }

    final sourceDistance = _recentDistanceFromEnd(
      session.recentSourceKeys,
      _sessionSourceKey(row),
    );
    if (sourceDistance >= 0) {
      if (sourceDistance < _recentHardSourceWindow) {
        penalty += 380;
      } else if (sourceDistance < _recentSoftSourceWindow) {
        penalty += 180;
      } else {
        penalty += 72;
      }
    }

    return penalty;
  }

  static int _recentDistanceFromEnd(List<String> values, String target) {
    for (var index = values.length - 1; index >= 0; index -= 1) {
      if (values[index] == target) {
        return values.length - 1 - index;
      }
    }
    return -1;
  }

  static Future<NetworkStreamPage> _fetchCollectorOnlyPage({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required String? intent,
    required String excludeUserId,
    required int limit,
    Iterable<String>? ownerUserIds,
    NetworkStreamEmptyState emptyStateWhenNoRows = NetworkStreamEmptyState.none,
    required String context,
  }) async {
    final collectorCandidates = await _fetchCollectorCandidates(
      client: client,
      session: session,
      intent: intent,
      excludeUserId: excludeUserId,
      limit: limit,
      ownerUserIds: ownerUserIds,
    );
    final eligibleCollectors = collectorCandidates
        .where((row) => !_hasEmittedCollectorRow(session, row))
        .toList();
    final pageRows = _diversifyFirstViewportRows(
      _selectCollectorRowsForPage(
        eligibleCollectors: eligibleCollectors,
        budget: limit,
        session: session,
        context: context,
      ),
      session: session,
    );
    _commitSessionRows(session, pageRows);
    _debugPageSnapshot(session, pageRows);

    return NetworkStreamPage(
      rows: pageRows,
      hasMore: eligibleCollectors.length > pageRows.length,
      collectorExhausted: eligibleCollectors.length <= pageRows.length,
      dbOnlyMode: false,
      sessionId: session.sessionId,
      emptyState: pageRows.isEmpty
          ? emptyStateWhenNoRows
          : NetworkStreamEmptyState.none,
    );
  }

  static Future<NetworkStreamPage> _fetchDiscoveryOnlyPage({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required int limit,
  }) async {
    session.dbOnlyMode = true;
    final rows = await _fetchDiscoveryPage(
      client: client,
      session: session,
      limit: limit,
      excludeCardPrintIds: const <String>{},
    );
    final pageRows = _diversifyFirstViewportRows(rows, session: session);
    _commitSessionRows(session, pageRows);
    _debugPageSnapshot(session, pageRows);

    return NetworkStreamPage(
      rows: pageRows,
      hasMore: pageRows.isNotEmpty,
      collectorExhausted: true,
      dbOnlyMode: true,
      sessionId: session.sessionId,
    );
  }

  static String? normalizeDiscoverableVaultIntent(String? value) {
    final normalized = _clean(value).toLowerCase();
    if (normalized == 'trade' ||
        normalized == 'sell' ||
        normalized == 'showcase') {
      return normalized;
    }
    return null;
  }

  static String getVaultIntentLabel(String? intent) {
    switch (normalizeDiscoverableVaultIntent(intent)) {
      case 'trade':
        return 'Trade';
      case 'sell':
        return 'Sell';
      case 'showcase':
        return 'Showcase';
      default:
        return 'Hold';
    }
  }

  static String getOwnershipSummary(NetworkStreamRow row) {
    if (row.inPlayCount > 1) {
      return '${row.inPlayCount} copies in play';
    }

    if (row.isGraded) {
      final gradedLabel = _nullable(row.gradeLabel);
      if (gradedLabel != null) {
        return gradedLabel;
      }

      final gradeParts = <String?>[
        _nullable(row.gradeCompany),
        _nullable(row.gradeValue),
      ].whereType<String>().toList();
      if (gradeParts.isNotEmpty) {
        return gradeParts.join(' ');
      }

      return 'Graded';
    }

    return _nullable(row.conditionLabel) ?? 'Raw';
  }

  static List<String> getIntentSummary(NetworkStreamRow row) {
    return <String>[
      if (row.sellCount > 0) 'Sell ${row.sellCount}',
      if (row.tradeCount > 0) 'Trade ${row.tradeCount}',
      if (row.showcaseCount > 0) 'Showcase ${row.showcaseCount}',
    ];
  }

  static String getPrimaryIntentLabel(NetworkStreamRow row) {
    final selectedIntent = getPrimaryIntent(row);
    final count = switch (selectedIntent) {
      'sell' => row.sellCount,
      'trade' => row.tradeCount,
      'showcase' => row.showcaseCount,
      _ => 0,
    };
    final baseLabel = getVaultIntentLabel(selectedIntent);
    return count > 1 ? '$baseLabel $count' : baseLabel;
  }

  static String getPrimaryIntent(NetworkStreamRow row) {
    return normalizeDiscoverableVaultIntent(row.intent) ??
        _dominantIntentFromCounts(row);
  }

  static String getPrimaryContactLabel(NetworkStreamRow row) {
    if (row.isDiscoverySource) {
      return 'Open card';
    }
    final selectedIntent = getPrimaryIntent(row);
    switch (selectedIntent) {
      case 'sell':
        // NETWORK_FIRST_PAINT_AND_FRESHNESS_V1
        // Removed the redundant buy CTA because sell inquiries and generic
        // card questions both route into the same conversation path.
        return 'Ask about this card';
      case 'trade':
        return 'Ask to trade';
      case 'showcase':
        return 'Contact owner';
      default:
        return 'Contact owner';
    }
  }

  static String? getListingsLabel(NetworkStreamRow row) {
    final count = row.listingCount;
    if (count == null || count <= 0) {
      return null;
    }
    return '$count listing${count == 1 ? '' : 's'}';
  }

  static String formatCreatedAtShort(String? value) {
    final parsed = DateTime.tryParse(_clean(value));
    if (parsed == null) {
      return 'Recently listed';
    }

    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final local = parsed.toLocal();
    final month = months[local.month - 1];
    return '$month ${local.day}, ${local.year}';
  }

  static Future<Map<String, List<NetworkStreamCopy>>> _fetchInPlayCopies({
    required SupabaseClient client,
    required List<NetworkStreamRow> rows,
  }) async {
    final requestedGroupKeys = rows
        .map((row) => _groupKey(row.ownerUserId, row.cardPrintId))
        .toSet();
    final ownerUserIds = rows
        .map((row) => row.ownerUserId)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (requestedGroupKeys.isEmpty || ownerUserIds.isEmpty) {
      return const <String, List<NetworkStreamCopy>>{};
    }

    try {
      final instanceRows = await client.rpc(
        'public_discoverable_card_copies_v1',
        params: {
          'p_owner_user_ids': ownerUserIds,
          'p_card_print_ids': rows
              .map((row) => row.cardPrintId)
              .toSet()
              .toList(),
        },
      );

      final copiesByGroupKey = <String, List<NetworkStreamCopy>>{};
      for (final raw in instanceRows as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final ownerUserId = _nullable(row['owner_user_id']);
        final vaultItemId = _nullable(row['legacy_vault_item_id']);
        final cardPrintId = _nullable(row['card_print_id']);
        final intent = normalizeDiscoverableVaultIntent(_clean(row['intent']));

        if (ownerUserId == null ||
            vaultItemId == null ||
            cardPrintId == null ||
            intent == null) {
          continue;
        }

        final groupKey = _groupKey(ownerUserId, cardPrintId);
        if (!requestedGroupKeys.contains(groupKey)) {
          continue;
        }

        final copies = copiesByGroupKey[groupKey] ?? <NetworkStreamCopy>[];
        copies.add(
          NetworkStreamCopy(
            instanceId: _clean(row['instance_id']),
            gvviId: _nullable(row['gv_vi_id']),
            vaultItemId: vaultItemId,
            intent: intent,
            conditionLabel: _nullable(row['condition_label']),
            isGraded: row['is_graded'] == true,
            gradeCompany: _nullable(row['grade_company']),
            gradeValue: _nullable(row['grade_value']),
            gradeLabel: _nullable(row['grade_label']),
            certNumber: _nullable(row['cert_number']),
            createdAt: _nullable(row['created_at']),
          ),
        );
        copiesByGroupKey[groupKey] = copies;
      }

      for (final entry in copiesByGroupKey.entries) {
        entry.value.sort(
          (left, right) =>
              _compareCreatedAtDescending(left.createdAt, right.createdAt),
        );
      }

      return copiesByGroupKey;
    } catch (_) {
      return const <String, List<NetworkStreamCopy>>{};
    }
  }

  static Future<Map<String, int>> _fetchListingCounts({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedIds.isEmpty) {
      return const <String, int>{};
    }

    try {
      final rows = await client
          .from('v_card_pricing_ui_v1')
          .select('card_print_id,ebay_listing_count')
          .inFilter('card_print_id', normalizedIds);

      final listingCounts = <String, int>{};
      for (final rawRow in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(rawRow as Map);
        final cardPrintId = _nullable(row['card_print_id']);
        if (cardPrintId == null) {
          continue;
        }
        final listingCount = _positiveCount(row['ebay_listing_count']);
        if (listingCount != null) {
          listingCounts[cardPrintId] = listingCount;
        }
      }
      return listingCounts;
    } catch (_) {
      return const <String, int>{};
    }
  }

  static NetworkStreamRow? _normalizeRow(Map<String, dynamic> row) {
    final vaultItemId = _nullable(row['vault_item_id']);
    final ownerUserId = _nullable(row['owner_user_id']);
    final ownerSlug = _nullable(row['owner_slug']);
    final ownerDisplayName = _nullable(row['owner_display_name']);
    final cardPrintId = _nullable(row['card_print_id']);
    final gvId = _nullable(row['gv_id']);

    if (vaultItemId == null ||
        ownerUserId == null ||
        ownerSlug == null ||
        ownerDisplayName == null ||
        cardPrintId == null ||
        gvId == null) {
      return null;
    }

    final inPlayCount =
        _positiveCount(row['in_play_count']) ??
        _positiveCount(row['quantity']) ??
        1;

    return NetworkStreamRow(
      sourceType: inPlayCount > 0
          ? NetworkStreamSourceType.collectorInPlay
          : NetworkStreamSourceType.collectorWall,
      vaultItemId: vaultItemId,
      ownerUserId: ownerUserId,
      ownerSlug: ownerSlug,
      ownerDisplayName: ownerDisplayName,
      cardPrintId: cardPrintId,
      intent: normalizeDiscoverableVaultIntent(_clean(row['intent'])),
      quantity: inPlayCount,
      inPlayCount: inPlayCount,
      tradeCount: _nonNegativeCount(row['trade_count']),
      sellCount: _nonNegativeCount(row['sell_count']),
      showcaseCount: _nonNegativeCount(row['showcase_count']),
      rawCount: _nonNegativeCount(row['raw_count']),
      slabCount: _nonNegativeCount(row['slab_count']),
      conditionLabel: _nullable(row['condition_label']),
      isGraded: row['is_graded'] == true,
      gradeCompany: _nullable(row['grade_company']),
      gradeValue: _nullable(row['grade_value']),
      gradeLabel: _nullable(row['grade_label']),
      createdAt: _nullable(row['created_at']),
      gvId: gvId,
      name: _nullable(row['name']) ?? 'Unknown card',
      setCode: _nullable(row['set_code']) ?? 'Unknown set',
      setName:
          _nullable(row['set_name']) ??
          _nullable(row['set_code']) ??
          'Unknown set',
      number: _nullable(row['number']) ?? '—',
      imageUrl: _httpUrl(row['image_url']),
    );
  }

  static Future<List<NetworkStreamRow>> _enrichCollectorRows({
    required SupabaseClient client,
    required List<NetworkStreamRow> rows,
  }) async {
    if (rows.isEmpty) {
      return const <NetworkStreamRow>[];
    }

    final results = await Future.wait<dynamic>([
      _fetchInPlayCopies(client: client, rows: rows),
      CardSurfacePricingService.fetchByCardPrintIds(
        client: client,
        cardPrintIds: rows.map((row) => row.cardPrintId),
      ),
      _fetchListingCounts(
        client: client,
        cardPrintIds: rows.map((row) => row.cardPrintId),
      ),
    ]);

    final copiesByGroup = results[0] as Map<String, List<NetworkStreamCopy>>;
    final pricingById = results[1] as Map<String, CardSurfacePricingData>;
    final listingCountById = results[2] as Map<String, int>;

    return rows
        .map(
          (row) => row.copyWith(
            inPlayCopies:
                copiesByGroup[_groupKey(row.ownerUserId, row.cardPrintId)] ??
                const <NetworkStreamCopy>[],
            pricing: pricingById[row.cardPrintId],
            listingCount: listingCountById[row.cardPrintId],
          ),
        )
        .toList();
  }

  static Future<List<NetworkStreamRow>> _fetchDiscoveryRows({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required Iterable<String> excludeCardPrintIds,
    required int targetCount,
  }) async {
    final excludedIds = excludeCardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet();
    final normalizedTargetCount = _clampedInt(targetCount, 1, 16);

    final highEndRows = await _fetchHighEndDiscoveryRows(
      client: client,
      session: session,
      excludeCardPrintIds: excludedIds,
      limit: _clampedInt(normalizedTargetCount * 2, 8, 36),
    );

    final randomRows = await _fetchRandomExploreRows(
      client: client,
      session: session,
      excludeCardPrintIds: {
        ...excludedIds,
        ...highEndRows.map((row) => row.cardPrintId),
      },
      limit: _clampedInt(normalizedTargetCount, 4, 12),
    );

    return [...highEndRows, ...randomRows];
  }

  static Future<List<NetworkStreamRow>> _fetchHighEndDiscoveryRows({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required Set<String> excludeCardPrintIds,
    required int limit,
  }) async {
    final pricingRows = await client
        .from('v_card_pricing_ui_v1')
        .select(
          'card_print_id,grookai_value,primary_price,primary_source,ebay_listing_count',
        )
        .order('grookai_value', ascending: false, nullsFirst: false)
        .order('primary_price', ascending: false, nullsFirst: false)
        .limit(_clampedInt(limit * 5, 32, 180));

    final pricingById = <String, Map<String, dynamic>>{};
    final orderedIds = <String>[];
    for (final raw in pricingRows as List<dynamic>) {
      final row = Map<String, dynamic>.from(raw as Map);
      final cardPrintId = _nullable(row['card_print_id']);
      if (cardPrintId == null || excludeCardPrintIds.contains(cardPrintId)) {
        continue;
      }
      if (_toDouble(row['grookai_value']) == null &&
          _toDouble(row['primary_price']) == null) {
        continue;
      }
      if (pricingById.containsKey(cardPrintId)) {
        continue;
      }
      pricingById[cardPrintId] = row;
      orderedIds.add(cardPrintId);
      if (orderedIds.length >= limit * 3) {
        break;
      }
    }

    if (orderedIds.isEmpty) {
      return const <NetworkStreamRow>[];
    }

    final rotatedIds = _rotateList(
      orderedIds,
      _sessionRotationOffset(
        length: orderedIds.length,
        session: session,
        salt: 11 + session.emittedDiscoveryCardPrintIds.length,
      ),
    );

    final cardRows = await client
        .from('card_prints')
        .select(
          'id,gv_id,name,set_code,number,rarity,image_url,image_alt_url,sets(name)',
        )
        .inFilter('id', rotatedIds);

    final cardsById = <String, Map<String, dynamic>>{};
    for (final raw in cardRows as List<dynamic>) {
      final row = Map<String, dynamic>.from(raw as Map);
      final id = _nullable(row['id']);
      if (id != null) {
        cardsById[id] = row;
      }
    }

    final rows = <NetworkStreamRow>[];
    for (final cardPrintId in rotatedIds) {
      final cardRow = cardsById[cardPrintId];
      final pricingRow = pricingById[cardPrintId];
      if (cardRow == null || pricingRow == null) {
        continue;
      }

      final discoveryRow = _buildDiscoveryRow(
        cardRow: cardRow,
        pricingRow: pricingRow,
        sourceType: NetworkStreamSourceType.dbHighEnd,
        sourceLabel: 'High-end canonical DB',
      );
      if (discoveryRow != null) {
        rows.add(discoveryRow);
      }
    }

    return rows;
  }

  static Future<List<NetworkStreamRow>> _fetchRandomExploreRows({
    required SupabaseClient client,
    required _NetworkFeedSession session,
    required Set<String> excludeCardPrintIds,
    required int limit,
  }) async {
    final rawRows = await client
        .from('card_prints')
        .select(
          'id,gv_id,name,set_code,number,rarity,image_url,image_alt_url,sets(name)',
        )
        .order('name', ascending: true)
        .limit(240);

    final catalogRows = (rawRows as List<dynamic>)
        .map((raw) => Map<String, dynamic>.from(raw as Map))
        .where((row) {
          final cardPrintId = _nullable(row['id']);
          final gvId = _nullable(row['gv_id']);
          final imageUrl =
              _httpUrl(row['image_url']) ?? _httpUrl(row['image_alt_url']);
          return cardPrintId != null &&
              gvId != null &&
              !excludeCardPrintIds.contains(cardPrintId) &&
              imageUrl != null;
        })
        .toList();

    if (catalogRows.isEmpty) {
      return const <NetworkStreamRow>[];
    }

    final salt = session.seed;
    catalogRows.sort((left, right) {
      final leftId = _nullable(left['id']) ?? '';
      final rightId = _nullable(right['id']) ?? '';
      final hashCompare = _stableDiscoveryHash(
        leftId,
        salt,
      ).compareTo(_stableDiscoveryHash(rightId, salt));
      if (hashCompare != 0) {
        return hashCompare;
      }
      final rarityCompare = _rarityDiscoveryBonus(
        _nullable(right['rarity']),
      ).compareTo(_rarityDiscoveryBonus(_nullable(left['rarity'])));
      if (rarityCompare != 0) {
        return rarityCompare;
      }
      return leftId.compareTo(rightId);
    });

    final rotatedCatalogRows = _rotateList(
      catalogRows,
      _sessionRotationOffset(
        length: catalogRows.length,
        session: session,
        salt: 29 + session.emittedDiscoveryCardPrintIds.length,
      ),
    );

    final selectedRows = rotatedCatalogRows.take(limit * 3).toList();
    if (selectedRows.isEmpty) {
      return const <NetworkStreamRow>[];
    }

    final selectedIds = selectedRows
        .map((row) => _nullable(row['id']))
        .whereType<String>()
        .toList();
    final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
      client: client,
      cardPrintIds: selectedIds,
    );

    final rows = <NetworkStreamRow>[];
    for (final cardRow in selectedRows) {
      final discoveryRow = _buildDiscoveryRow(
        cardRow: cardRow,
        pricingRow: null,
        sourceType: NetworkStreamSourceType.dbRandomExplore,
        sourceLabel: 'Canonical explore',
        pricing: pricingById[_nullable(cardRow['id']) ?? ''],
      );
      if (discoveryRow != null) {
        rows.add(discoveryRow);
      }
    }

    return rows.take(limit).toList();
  }

  static NetworkStreamRow? _buildDiscoveryRow({
    required Map<String, dynamic> cardRow,
    required NetworkStreamSourceType sourceType,
    required String sourceLabel,
    Map<String, dynamic>? pricingRow,
    CardSurfacePricingData? pricing,
  }) {
    final cardPrintId = _nullable(cardRow['id']);
    final gvId = _nullable(cardRow['gv_id']);
    if (cardPrintId == null || gvId == null) {
      return null;
    }

    final setRecord = _recordFrom(cardRow['sets']);
    final resolvedPricing =
        pricing ?? (pricingRow == null ? null : _pricingFromRow(pricingRow));

    return NetworkStreamRow(
      sourceType: sourceType,
      sourceLabel: sourceLabel,
      vaultItemId: 'db:$cardPrintId',
      ownerUserId: '',
      ownerSlug: '',
      ownerDisplayName: 'Grookai Discovery',
      cardPrintId: cardPrintId,
      quantity: 1,
      inPlayCount: 0,
      tradeCount: 0,
      sellCount: 0,
      showcaseCount: 0,
      rawCount: 0,
      slabCount: 0,
      gvId: gvId,
      name: _nullable(cardRow['name']) ?? 'Unknown card',
      setCode: _nullable(cardRow['set_code']) ?? 'Unknown set',
      setName:
          _nullable(setRecord?['name']) ??
          _nullable(cardRow['set_code']) ??
          'Unknown set',
      number: _nullable(cardRow['number']) ?? '—',
      rarity: _nullable(cardRow['rarity']),
      imageUrl:
          _httpUrl(cardRow['image_url']) ?? _httpUrl(cardRow['image_alt_url']),
      pricing: resolvedPricing,
      listingCount: _positiveCount(pricingRow?['ebay_listing_count']),
    );
  }

  static CardSurfacePricingData? _pricingFromRow(Map<String, dynamic> row) {
    final cardPrintId = _nullable(row['card_print_id']);
    if (cardPrintId == null) {
      return null;
    }

    return CardSurfacePricingData(
      cardPrintId: cardPrintId,
      grookaiValue: _toDouble(row['grookai_value']),
      primaryPrice: _toDouble(row['primary_price']),
      primarySource: _nullable(row['primary_source']),
    );
  }

  static String _groupKey(String ownerUserId, String cardPrintId) =>
      '$ownerUserId:$cardPrintId';

  static String _clean(dynamic value) => (value ?? '').toString().trim();

  static String? _nullable(dynamic value) {
    final normalized = _clean(value);
    return normalized.isEmpty ? null : normalized;
  }

  static String? _httpUrl(dynamic value) {
    final normalized = _nullable(value);
    if (normalized == null) {
      return null;
    }

    final uri = Uri.tryParse(normalized);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      return null;
    }

    return normalized;
  }

  static Map<String, dynamic>? _recordFrom(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is List &&
        value.isNotEmpty &&
        value.first is Map<String, dynamic>) {
      return Map<String, dynamic>.from(value.first as Map<String, dynamic>);
    }
    return null;
  }

  static double? _toDouble(dynamic value) {
    if (value is num) {
      final normalized = value.toDouble();
      return normalized.isFinite ? normalized : null;
    }
    return null;
  }

  static int _nonNegativeCount(dynamic value) {
    if (value is num) {
      return value.toInt() < 0 ? 0 : value.toInt();
    }

    final parsed = int.tryParse(_clean(value));
    if (parsed == null) {
      return 0;
    }
    return parsed < 0 ? 0 : parsed;
  }

  static int? _positiveCount(dynamic value) {
    if (value is num) {
      return value.toInt() > 0 ? value.toInt() : null;
    }

    final parsed = int.tryParse(_clean(value));
    if (parsed == null || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  static int _clampedInt(int value, int min, int max) => value.clamp(min, max);

  static int _compareCreatedAtDescending(String? left, String? right) {
    final leftTime = DateTime.tryParse(_clean(left));
    final rightTime = DateTime.tryParse(_clean(right));
    final leftMillis = leftTime?.millisecondsSinceEpoch ?? 0;
    final rightMillis = rightTime?.millisecondsSinceEpoch ?? 0;
    return rightMillis.compareTo(leftMillis);
  }

  static List<NetworkStreamRow> _rankRows(
    List<NetworkStreamRow> rows, {
    required _NetworkFeedSession session,
  }) {
    final scoredRows = rows
        .map(
          (row) =>
              row.copyWith(rankingScore: _signalScore(row, session: session)),
        )
        .toList();
    if (scoredRows.length < 2) {
      return scoredRows;
    }

    final rowsByBand = <int, List<NetworkStreamRow>>{};
    for (final row in scoredRows) {
      final band = _scoreBand(row.rankingScore);
      final bandRows = rowsByBand[band] ?? <NetworkStreamRow>[];
      bandRows.add(row);
      rowsByBand[band] = bandRows;
    }

    final sortedBands = rowsByBand.keys.toList()
      ..sort((left, right) => right.compareTo(left));
    final rankedRows = <NetworkStreamRow>[];
    for (final band in sortedBands) {
      final bandRows = rowsByBand[band] ?? const <NetworkStreamRow>[];
      bandRows.sort((left, right) {
        final signal = right.rankingScore.compareTo(left.rankingScore);
        if (signal != 0) {
          return signal;
        }

        final createdAt = _compareCreatedAtDescending(
          left.createdAt,
          right.createdAt,
        );
        if (createdAt != 0) {
          return createdAt;
        }

        return left.name.toLowerCase().compareTo(right.name.toLowerCase());
      });
      rankedRows.addAll(
        _sessionShuffleWithinBand(bandRows, session: session, band: band),
      );
    }

    return _diversifyWindow(rankedRows, session: session);
  }

  static List<NetworkStreamRow> _injectDiscoveryRows({
    required List<NetworkStreamRow> collectors,
    required List<NetworkStreamRow> discovery,
    required int limit,
    required int targetDiscoveryCount,
  }) {
    final collectorQueue = [...collectors];
    // NETWORK_FEED_DISCOVERY_CRASH_FIX_V1
    // Fixed proven launch hang caused by carrying discovery rows beyond the
    // allowed injection target, which left the merge loop spinning after the
    // collector queue was exhausted.
    final discoveryQueue = [...discovery.take(targetDiscoveryCount)];
    final rows = <NetworkStreamRow>[];
    var insertedDiscovery = 0;

    while (rows.length < limit &&
        (collectorQueue.isNotEmpty || discoveryQueue.isNotEmpty)) {
      var collectorBurst = 0;
      while (collectorBurst < 3 &&
          collectorQueue.isNotEmpty &&
          rows.length < limit) {
        rows.add(collectorQueue.removeAt(0));
        collectorBurst += 1;
      }

      final shouldInsertDiscovery =
          discoveryQueue.isNotEmpty &&
          insertedDiscovery < targetDiscoveryCount &&
          rows.length < limit &&
          (rows.isNotEmpty || collectorQueue.isEmpty);

      if (shouldInsertDiscovery) {
        rows.add(discoveryQueue.removeAt(0));
        insertedDiscovery += 1;
      }

      if (collectorQueue.isEmpty &&
          discoveryQueue.isNotEmpty &&
          rows.length < limit &&
          insertedDiscovery < targetDiscoveryCount) {
        rows.add(discoveryQueue.removeAt(0));
        insertedDiscovery += 1;
      }
    }

    return rows.take(limit).toList();
  }

  static List<NetworkStreamRow> _diversifyWindow(
    List<NetworkStreamRow> rows, {
    required _NetworkFeedSession session,
  }) {
    final pool = [...rows];
    final ordered = <NetworkStreamRow>[];
    final recentNameKeys = <String>[];
    final recentOwnerKeys = <String>[];

    while (pool.isNotEmpty) {
      var bestIndex = 0;
      var bestPenalty = 1 << 20;

      for (var index = 0; index < pool.length; index++) {
        final candidate = pool[index];
        final penalty = _repetitionPenalty(
          candidate,
          recentNameKeys: recentNameKeys,
          recentOwnerKeys: recentOwnerKeys,
        );
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestIndex = index;
          continue;
        }

        if (penalty != bestPenalty) {
          continue;
        }

        final currentBest = pool[bestIndex];
        final signalCompare = _signalScore(
          candidate,
          session: session,
        ).compareTo(_signalScore(currentBest, session: session));
        if (signalCompare > 0) {
          bestIndex = index;
          continue;
        }

        if (signalCompare != 0) {
          continue;
        }

        final createdAtCompare = _compareCreatedAtDescending(
          candidate.createdAt,
          currentBest.createdAt,
        );
        if (createdAtCompare < 0) {
          bestIndex = index;
        }
      }

      final nextRow = pool.removeAt(bestIndex);
      ordered.add(nextRow);
      recentNameKeys.add(_nameKey(nextRow));
      recentOwnerKeys.add(_ownerKey(nextRow));
      if (recentNameKeys.length > 2) {
        recentNameKeys.removeAt(0);
      }
      if (recentOwnerKeys.length > 2) {
        recentOwnerKeys.removeAt(0);
      }
    }

    return ordered;
  }

  static List<NetworkStreamRow> _diversifyFirstViewportRows(
    List<NetworkStreamRow> rows, {
    required _NetworkFeedSession session,
  }) {
    if (rows.length < 3 || session.pageCount != 1) {
      return rows;
    }

    final headCount = rows.length < _firstViewportFreshnessCount
        ? rows.length
        : _firstViewportFreshnessCount;
    final head = rows.take(headCount).toList(growable: false);
    final tail = rows.skip(headCount).toList(growable: false);
    final diversifiedHead = <NetworkStreamRow>[];
    var start = 0;

    if (head.isNotEmpty && head.first.isCollectorSource) {
      final leadingCollectorCount = _leadingCollectorCount(head);
      final preservedHeroCount = leadingCollectorCount < _heroCollectorSlotCount
          ? leadingCollectorCount
          : _heroCollectorSlotCount;
      diversifiedHead.addAll(head.take(preservedHeroCount));
      start = preservedHeroCount;
    }

    while (start < head.length) {
      final runIsCollector = head[start].isCollectorSource;
      var end = start + 1;
      while (end < head.length &&
          head[end].isCollectorSource == runIsCollector) {
        end += 1;
      }

      diversifiedHead.addAll(
        _freshenFirstViewportRun(
          head.sublist(start, end),
          session: session,
          salt: runIsCollector ? 17 + start : 71 + start,
        ),
      );
      start = end;
    }

    // NETWORK_FIRST_PAINT_AND_FRESHNESS_V1
    // Diversifies the first viewport so Network feels fresh without
    // sacrificing collector-first source ordering or card quality.
    return <NetworkStreamRow>[...diversifiedHead, ...tail];
  }

  static List<NetworkStreamRow> _freshenFirstViewportRun(
    List<NetworkStreamRow> rows, {
    required _NetworkFeedSession session,
    required int salt,
  }) {
    if (rows.length < 3) {
      return rows;
    }

    final rowsByBand = <int, List<NetworkStreamRow>>{};
    for (final row in rows) {
      final band = _scoreBand(row.rankingScore);
      final bandRows = rowsByBand[band] ?? <NetworkStreamRow>[];
      bandRows.add(row);
      rowsByBand[band] = bandRows;
    }

    final sortedBands = rowsByBand.keys.toList()
      ..sort((left, right) => right.compareTo(left));
    final ordered = <NetworkStreamRow>[];
    for (final band in sortedBands) {
      final bandRows = rowsByBand[band] ?? const <NetworkStreamRow>[];
      final shuffledBand = _sessionShuffleWithinBand(
        bandRows,
        session: session,
        band: band + salt,
      );
      final rotatedBand = _rotateList(
        shuffledBand,
        _sessionRotationOffset(
          length: shuffledBand.length,
          session: session,
          salt: salt + band + rows.length,
        ),
      );
      ordered.addAll(rotatedBand);
    }

    return ordered;
  }

  static List<NetworkStreamRow> _selectCollectorRowsForPage({
    required List<NetworkStreamRow> eligibleCollectors,
    required int budget,
    required _NetworkFeedSession session,
    required String context,
  }) {
    if (eligibleCollectors.isEmpty || budget <= 0) {
      return const <NetworkStreamRow>[];
    }

    final limitedBudget = budget < eligibleCollectors.length
        ? budget
        : eligibleCollectors.length;
    if (limitedBudget <= 1 || session.pageCount != 1) {
      return eligibleCollectors.take(limitedBudget).toList(growable: false);
    }

    final remaining = [...eligibleCollectors];
    final selected = <NetworkStreamRow>[];
    final selectedHeroKeys = <String>{};
    final heroPools = <String>[];
    final heroSlots = limitedBudget < _heroCollectorSlotCount
        ? limitedBudget
        : _heroCollectorSlotCount;

    for (var slot = 0; slot < heroSlots && remaining.isNotEmpty; slot += 1) {
      final rawCandidatePool = _rawHeroCollectorPoolForSlot(
        remaining,
        selectedHeroKeys,
      );
      final candidatePool = _dedupeHeroCollectorPool(
        rawCandidatePool,
        selectedHeroKeys,
      );
      heroPools.add(
        'slot${slot + 1}[raw:${rawCandidatePool.map(_debugHeroRow).join(',')}=>deduped:${candidatePool.map(_debugHeroRow).join(',')}]',
      );
      final selectedRow = _selectHeroCollectorForSlot(
        remaining,
        candidatePool: candidatePool,
        session: session,
        slot: slot,
      );
      selected.add(selectedRow);
      selectedHeroKeys.add(_heroCollectorDedupeKey(selectedRow));
      remaining.remove(selectedRow);
    }

    if (selected.length < limitedBudget) {
      selected.addAll(remaining.take(limitedBudget - selected.length));
    }

    _debugHeroSelection(
      session: session,
      context: context,
      eligibleCollectors: eligibleCollectors,
      selectedCollectors: selected,
      heroPools: heroPools,
    );

    return selected.take(limitedBudget).toList(growable: false);
  }

  static List<NetworkStreamRow> _rawHeroCollectorPoolForSlot(
    List<NetworkStreamRow> remainingCollectors,
    Set<String> excludedKeys,
  ) {
    if (remainingCollectors.isEmpty) {
      return const <NetworkStreamRow>[];
    }

    final leaderScore = remainingCollectors.first.rankingScore;
    final boundedPool = <NetworkStreamRow>[];
    for (final row in remainingCollectors.take(_heroCollectorPoolLimit)) {
      if ((leaderScore - row.rankingScore) > _heroCollectorScoreDelta) {
        break;
      }
      boundedPool.add(row);
    }

    if (boundedPool.isEmpty) {
      return [remainingCollectors.first];
    }

    final availablePool = boundedPool
        .where((row) => !excludedKeys.contains(_heroCollectorDedupeKey(row)))
        .toList(growable: false);
    return availablePool.isEmpty ? boundedPool : availablePool;
  }

  static List<NetworkStreamRow> _dedupeHeroCollectorPool(
    List<NetworkStreamRow> candidatePool,
    Set<String> excludedKeys,
  ) {
    final dedupedPool = <NetworkStreamRow>[];
    final seenKeys = <String>{...excludedKeys};
    for (final row in candidatePool) {
      final dedupeKey = _heroCollectorDedupeKey(row);
      if (seenKeys.add(dedupeKey)) {
        dedupedPool.add(row);
      }
    }

    // NETWORK_HERO_POOL_DEDUPE_V1
    // Deduplicates the bounded hero collector pool before rotation so the top
    // slots can vary across more unique premium cards.
    return dedupedPool.isEmpty ? candidatePool : dedupedPool;
  }

  static String _heroCollectorDedupeKey(NetworkStreamRow row) {
    final cardPrintId = row.cardPrintId.trim();
    return cardPrintId.isNotEmpty
        ? cardPrintId
        : '${row.sourceType.name}:${row.ownerUserId}:${row.gvId}';
  }

  static NetworkStreamRow _selectHeroCollectorForSlot(
    List<NetworkStreamRow> remainingCollectors, {
    required List<NetworkStreamRow> candidatePool,
    required _NetworkFeedSession session,
    required int slot,
  }) {
    if (candidatePool.length < 2) {
      return candidatePool.isEmpty
          ? remainingCollectors.first
          : candidatePool.first;
    }

    final rotatedPool = _rotateList(
      candidatePool,
      _sessionRotationOffset(
        length: candidatePool.length,
        session: session,
        salt: 401 + slot + remainingCollectors.length,
      ),
    );
    return rotatedPool.first;
  }

  static int _leadingCollectorCount(List<NetworkStreamRow> rows) {
    var count = 0;
    for (final row in rows) {
      if (!row.isCollectorSource) {
        break;
      }
      count += 1;
    }
    return count;
  }

  static String _debugHeroRow(NetworkStreamRow row) {
    final shortId = row.cardPrintId.length >= 4
        ? row.cardPrintId.substring(0, 4)
        : row.cardPrintId;
    return '$shortId:${row.rankingScore}:b${_scoreBand(row.rankingScore)}';
  }

  static void _debugHeroSelection({
    required _NetworkFeedSession session,
    required String context,
    required List<NetworkStreamRow> eligibleCollectors,
    required List<NetworkStreamRow> selectedCollectors,
    required List<String> heroPools,
  }) {
    if (!kDebugMode || !_kNetworkFeedDiagnostics || session.pageCount != 1) {
      return;
    }

    final before = eligibleCollectors
        .take(_heroCollectorSlotCount)
        .map(_debugHeroRow)
        .join(',');
    final after = selectedCollectors
        .take(_heroCollectorSlotCount)
        .map(_debugHeroRow)
        .join(',');
    final topPool = eligibleCollectors
        .take(_heroCollectorPoolLimit)
        .map(_debugHeroRow)
        .join(',');

    debugPrint(
      'NETWORK_HERO_DIVERSIFICATION_V1 session=${session.sessionId} '
      'seed=${session.seed} context=$context '
      'top_pool=[$topPool] '
      'hero_pools=${heroPools.join(';')} '
      'first3_before=[$before] '
      'first3_after=[$after]',
    );
  }

  static int _signalScore(
    NetworkStreamRow row, {
    required _NetworkFeedSession session,
  }) {
    var score = switch (row.sourceType) {
      NetworkStreamSourceType.collectorInPlay => 100,
      NetworkStreamSourceType.collectorWall => 92,
      NetworkStreamSourceType.dbHighEnd => 65,
      NetworkStreamSourceType.dbRandomExplore => 45,
    };

    if (!session.emittedSourceKeys.contains(_sessionSourceKey(row))) {
      score += 20;
    }
    score -= _recencyPenalty(session, row);

    if (row.isDiscoverySource) {
      score += _discoveryQualityScore(row);
      score += _futureTasteScore(row, session: session);
      return score;
    }

    if (row.pricing?.hasVisibleValue == true) {
      score += 40;
    }
    score += switch (_dominantIntentFromCounts(row)) {
      'sell' => 18,
      'trade' => 12,
      'showcase' => 4,
      _ => 0,
    };
    if (row.inPlayCount > 0) {
      score += 12;
    }

    final listingCount = row.listingCount ?? 0;
    score += listingCount.clamp(0, 12);
    if (listingCount > 0) {
      score += 2;
    }

    final copyCount = row.inPlayCopies.length > 1
        ? row.inPlayCopies.length
        : row.inPlayCount;
    score += copyCount.clamp(1, 5);

    if (row.isGraded) {
      score += 2;
    }

    score += _futureTasteScore(row, session: session);
    return score;
  }

  static int _discoveryQualityScore(NetworkStreamRow row) {
    var score = 0;
    final value = row.pricing?.visibleValue;
    if (value != null) {
      if (value >= 1000) {
        score += 36;
      } else if (value >= 500) {
        score += 30;
      } else if (value >= 250) {
        score += 24;
      } else if (value >= 100) {
        score += 18;
      } else if (value >= 50) {
        score += 12;
      } else if (value >= 20) {
        score += 6;
      }
    }

    if ((row.imageUrl ?? '').trim().isNotEmpty) {
      score += 10;
    }

    score += _rarityDiscoveryBonus(row.rarity);

    final listingCount = row.listingCount ?? 0;
    if (listingCount > 0) {
      score += listingCount.clamp(1, 8);
    }

    return score;
  }

  static int _rarityDiscoveryBonus(String? rarity) {
    final normalized = _clean(rarity).toLowerCase();
    if (normalized.isEmpty) {
      return 0;
    }
    if (normalized.contains('special illustration') ||
        normalized.contains('illustration rare') ||
        normalized.contains('alt art') ||
        normalized.contains('gold star') ||
        normalized.contains('secret rare')) {
      return 16;
    }
    if (normalized.contains('hyper rare') ||
        normalized.contains('ultra rare') ||
        normalized.contains('secret') ||
        normalized.contains('legendary collection')) {
      return 12;
    }
    if (normalized.contains('rare holo') ||
        normalized.contains('rare') ||
        normalized.contains('promo')) {
      return 6;
    }
    return 0;
  }

  static int _futureTasteScore(
    NetworkStreamRow row, {
    required _NetworkFeedSession session,
  }) {
    // TASTE_FUNCTION_HOOK_V2:
    // live inputs currently used:
    // - recent Network feed opens / taps recorded in-session
    // placeholder inputs left for later:
    // - recent vault adds
    // - recent inquiries/messages
    // - recent searches
    if (session.recentSignals.isEmpty || !row.isDiscoverySource) {
      return 0;
    }

    final rowFamilyKey = _nameFamilyKey(row.name);
    final rowSetCode = row.setCode.trim().toLowerCase();
    final rowRarity = _clean(row.rarity).toLowerCase();
    final rowPriceBand = _priceBandKey(row.pricing?.visibleValue);

    var score = 0;
    for (var index = session.recentSignals.length - 1; index >= 0; index -= 1) {
      final signal = session.recentSignals[index];
      final recencyWeight = session.recentSignals.length - index;
      final weight = 7 - recencyWeight;
      if (weight <= 0) {
        continue;
      }

      if (signal.cardPrintId == row.cardPrintId) {
        score -= 16;
      }
      if (rowFamilyKey.isNotEmpty && rowFamilyKey == signal.nameFamilyKey) {
        score += 2 * weight;
      }
      if (rowSetCode.isNotEmpty && rowSetCode == signal.setCode) {
        score += 2 * weight;
      }
      if (rowRarity.isNotEmpty && rowRarity == signal.rarity) {
        score += weight;
      }
      if (rowPriceBand.isNotEmpty && rowPriceBand == signal.priceBand) {
        score += weight;
      }
    }

    return score.clamp(-24, 28);
  }

  static int _repetitionPenalty(
    NetworkStreamRow row, {
    required List<String> recentNameKeys,
    required List<String> recentOwnerKeys,
  }) {
    var penalty = 0;
    final nameKey = _nameKey(row);
    final ownerKey = _ownerKey(row);

    if (recentNameKeys.isNotEmpty && recentNameKeys.last == nameKey) {
      penalty += 10;
    } else if (recentNameKeys.contains(nameKey)) {
      penalty += 4;
    }

    if (recentOwnerKeys.isNotEmpty && recentOwnerKeys.last == ownerKey) {
      penalty += 8;
    } else if (recentOwnerKeys.contains(ownerKey)) {
      penalty += 3;
    }

    return penalty;
  }

  static String _dominantIntentFromCounts(NetworkStreamRow row) {
    final candidates =
        <({String intent, int count, int priority})>[
          (intent: 'sell', count: row.sellCount, priority: 3),
          (intent: 'trade', count: row.tradeCount, priority: 2),
          (intent: 'showcase', count: row.showcaseCount, priority: 1),
        ]..sort((left, right) {
          final countCompare = right.count.compareTo(left.count);
          if (countCompare != 0) {
            return countCompare;
          }
          return right.priority.compareTo(left.priority);
        });

    final winner = candidates.firstWhere(
      (candidate) => candidate.count > 0,
      orElse: () => (intent: row.intent ?? 'showcase', count: 0, priority: 0),
    );
    return normalizeDiscoverableVaultIntent(winner.intent) ?? 'showcase';
  }

  static String _nameKey(NetworkStreamRow row) {
    return row.name.trim().toLowerCase();
  }

  static String _ownerKey(NetworkStreamRow row) {
    if (row.isDiscoverySource) {
      return row.sourceType.name;
    }
    return row.ownerUserId.trim().toLowerCase();
  }

  static int _targetDiscoveryCount({
    required int collectorCount,
    required int limit,
  }) {
    if (limit <= 0) {
      return 0;
    }
    if (collectorCount <= 0) {
      return _clampedInt(limit, 1, 8);
    }

    final cadenceTarget = (limit / 4).floor();
    final collectorTarget = (collectorCount / 3).floor();
    final normalizedCadenceTarget = _clampedInt(cadenceTarget, 1, 10);
    final normalizedCollectorTarget = _clampedInt(collectorTarget, 1, 10);
    return normalizedCadenceTarget < normalizedCollectorTarget
        ? normalizedCadenceTarget
        : normalizedCollectorTarget;
  }

  static void _rememberSessionExposure(
    _NetworkFeedSession session,
    List<NetworkStreamRow> rows,
  ) {
    final exposureSlice = rows.take(18);
    for (final row in exposureSlice) {
      session.recentCardPrintIds.remove(row.cardPrintId);
      session.recentCardPrintIds.add(row.cardPrintId);
      if (session.recentCardPrintIds.length > _sessionExposureMemory) {
        session.recentCardPrintIds.removeAt(0);
      }

      final sourceKey = _sessionSourceKey(row);
      session.recentSourceKeys.remove(sourceKey);
      session.recentSourceKeys.add(sourceKey);
      if (session.recentSourceKeys.length > _sessionExposureMemory) {
        session.recentSourceKeys.removeAt(0);
      }
    }
  }

  static String _sessionSourceKey(NetworkStreamRow row) {
    if (row.isDiscoverySource) {
      return '${row.sourceType.name}:${row.cardPrintId}';
    }
    return '${row.sourceType.name}:${row.ownerUserId}:${row.cardPrintId}';
  }

  static int _stableDiscoveryHash(String value, int salt) {
    var hash = 2166136261 ^ salt;
    for (final codeUnit in value.codeUnits) {
      hash ^= codeUnit;
      hash = (hash * 16777619) & 0x7fffffff;
    }
    return hash & 0x7fffffff;
  }

  static int _scoreBand(int score) => score ~/ 12;

  static List<NetworkStreamRow> _sessionShuffleWithinBand(
    List<NetworkStreamRow> rows, {
    required _NetworkFeedSession session,
    required int band,
  }) {
    if (rows.length < 3) {
      return rows;
    }

    const chunkSize = 6;
    final ordered = <NetworkStreamRow>[];
    for (var start = 0; start < rows.length; start += chunkSize) {
      final end = (start + chunkSize) > rows.length
          ? rows.length
          : start + chunkSize;
      final chunk = [...rows.sublist(start, end)]
        ..sort((left, right) {
          final leftHash = _stableDiscoveryHash(
            '${_sessionSourceKey(left)}:${session.seed}:$band:$start',
            session.seed + band + start,
          );
          final rightHash = _stableDiscoveryHash(
            '${_sessionSourceKey(right)}:${session.seed}:$band:$start',
            session.seed + band + start,
          );
          return leftHash.compareTo(rightHash);
        });
      ordered.addAll(chunk);
    }
    return ordered;
  }

  static List<T> _rotateList<T>(List<T> values, int offset) {
    if (values.length < 2) {
      return [...values];
    }
    final normalizedOffset = offset % values.length;
    if (normalizedOffset == 0) {
      return [...values];
    }
    return [...values.skip(normalizedOffset), ...values.take(normalizedOffset)];
  }

  static int _sessionRotationOffset({
    required int length,
    required _NetworkFeedSession session,
    required int salt,
  }) {
    if (length <= 1) {
      return 0;
    }
    return _stableDiscoveryHash(
          '${session.seed}:${session.pageCount}:$salt:$length',
          session.seed + salt,
        ) %
        length;
  }

  static String _nameFamilyKey(String value) {
    final normalized = value.toLowerCase().replaceAll(
      RegExp(r'[^a-z0-9 ]+'),
      ' ',
    );
    final ignored = <String>{'ex', 'gx', 'v', 'vmax', 'vstar', 'tag', 'team'};
    for (final part in normalized.split(RegExp(r'\s+'))) {
      final trimmed = part.trim();
      if (trimmed.isEmpty || ignored.contains(trimmed)) {
        continue;
      }
      return trimmed;
    }
    return '';
  }

  static String _priceBandKey(double? value) {
    if (value == null) {
      return '';
    }
    if (value >= 1000) {
      return 'grail';
    }
    if (value >= 250) {
      return 'high';
    }
    if (value >= 75) {
      return 'mid';
    }
    if (value >= 20) {
      return 'entry';
    }
    return 'budget';
  }
}
