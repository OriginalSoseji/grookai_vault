import 'package:supabase_flutter/supabase_flutter.dart';

const bool kCardJourneysEnabled = bool.fromEnvironment(
  'CARD_JOURNEYS_ENABLED',
  defaultValue: true,
);

typedef CardJourneyRpc =
    Future<dynamic> Function(
      String functionName, {
      Map<String, dynamic>? params,
    });

class CardJourneyServiceException implements Exception {
  const CardJourneyServiceException(this.rpcName, this.cause);

  final String rpcName;
  final Object cause;

  @override
  String toString() => 'CardJourneyServiceException($rpcName): $cause';
}

class CardJourneySnapshot {
  const CardJourneySnapshot({
    required this.cardPrintId,
    required this.ownerCollectorCount,
    required this.tradeCollectorCount,
    required this.saleCollectorCount,
    required this.wantCollectorCount,
    required this.momentCount,
    required this.geographyAreaCount,
    required this.hasPublicActivity,
  });

  final String cardPrintId;
  final int ownerCollectorCount;
  final int tradeCollectorCount;
  final int saleCollectorCount;
  final int wantCollectorCount;
  final int momentCount;
  final int geographyAreaCount;
  final bool hasPublicActivity;

  bool get isEmpty => !hasPublicActivity;

  String get ownershipSummary {
    final ownerVerb = ownerCollectorCount == 1 ? 'owns' : 'own';
    final segments = <String>[
      '${_plural(ownerCollectorCount, 'collector')} $ownerVerb this',
      if (tradeCollectorCount > 0) '$tradeCollectorCount for trade',
      if (saleCollectorCount > 0) '$saleCollectorCount for sale',
      if (wantCollectorCount == 1)
        '1 collector wants a copy'
      else if (wantCollectorCount > 1)
        '$wantCollectorCount want a copy',
    ];
    return segments.join(' · ');
  }

  static CardJourneySnapshot empty(String cardPrintId) {
    return CardJourneySnapshot(
      cardPrintId: cardPrintId,
      ownerCollectorCount: 0,
      tradeCollectorCount: 0,
      saleCollectorCount: 0,
      wantCollectorCount: 0,
      momentCount: 0,
      geographyAreaCount: 0,
      hasPublicActivity: false,
    );
  }

  static CardJourneySnapshot fromJson(Map<String, dynamic> json) {
    final cardPrintId = _text(json['card_print_id']);
    return CardJourneySnapshot(
      cardPrintId: cardPrintId,
      ownerCollectorCount: _int(json['owner_collector_count']),
      tradeCollectorCount: _int(json['trade_collector_count']),
      saleCollectorCount: _int(json['sale_collector_count']),
      wantCollectorCount: _int(json['want_collector_count']),
      momentCount: _int(json['moment_count']),
      geographyAreaCount: _int(json['geography_area_count']),
      hasPublicActivity: json['has_public_activity'] == true,
    );
  }
}

enum CardJourneyCollectorFilter {
  owners('owners'),
  trade('trade'),
  sale('sale');

  const CardJourneyCollectorFilter(this.rpcKind);

  final String rpcKind;
}

class CardJourneyCollector {
  const CardJourneyCollector({
    required this.ownerUserId,
    required this.ownerSlug,
    required this.ownerDisplayName,
    required this.ownerAvatarPath,
    required this.intent,
    required this.copyCount,
    required this.contactAvailable,
    required this.createdAt,
    required this.nextCursorCreatedAt,
    required this.nextCursorUserId,
  });

  final String ownerUserId;
  final String ownerSlug;
  final String ownerDisplayName;
  final String ownerAvatarPath;
  final String intent;
  final int copyCount;
  final bool contactAvailable;
  final DateTime? createdAt;
  final DateTime? nextCursorCreatedAt;
  final String nextCursorUserId;

  bool get canMessage => contactAvailable && (isTrade || isSale);
  bool get isTrade => intent == 'trade';
  bool get isSale => intent == 'sell';
  bool get isShowcase => intent == 'showcase';

  static CardJourneyCollector? fromJson(Map<String, dynamic> json) {
    final ownerUserId = _text(json['owner_user_id']);
    if (ownerUserId.isEmpty) return null;

    final slug = _text(json['owner_slug']).toLowerCase();
    final displayName = _text(json['owner_display_name']);
    return CardJourneyCollector(
      ownerUserId: ownerUserId,
      ownerSlug: slug,
      ownerDisplayName: displayName.isEmpty ? slug : displayName,
      ownerAvatarPath: _text(json['owner_avatar_path']),
      intent: _text(json['intent']).toLowerCase(),
      copyCount: _int(json['copy_count']),
      contactAvailable: json['contact_available'] == true,
      createdAt: _date(json['created_at']),
      nextCursorCreatedAt: _date(json['next_cursor_created_at']),
      nextCursorUserId: _text(json['next_cursor_user_id']),
    );
  }
}

class CardJourneyCollectorsPage {
  const CardJourneyCollectorsPage({
    required this.collectors,
    this.nextCursorCreatedAt,
    this.nextCursorUserId,
  });

  final List<CardJourneyCollector> collectors;
  final DateTime? nextCursorCreatedAt;
  final String? nextCursorUserId;

  bool get hasNextCursor =>
      nextCursorCreatedAt != null && _text(nextCursorUserId).isNotEmpty;
}

class CardJourneyMoment {
  const CardJourneyMoment({
    required this.eventId,
    required this.eventType,
    required this.createdAt,
    required this.actorSlug,
    required this.actorDisplayName,
    required this.actorAvatarPath,
    required this.cardPrintId,
    required this.momentLine,
    required this.nextCursorCreatedAt,
    required this.nextCursorEventId,
  });

  final String eventId;
  final String eventType;
  final DateTime? createdAt;
  final String actorSlug;
  final String actorDisplayName;
  final String actorAvatarPath;
  final String cardPrintId;
  final String momentLine;
  final DateTime? nextCursorCreatedAt;
  final String nextCursorEventId;

  bool get isAdd => eventType == 'vault_added';
  bool get isCompletion =>
      eventType == 'set_completion_crossed' ||
      eventType == 'dex_completion_crossed';

  static CardJourneyMoment? fromJson(Map<String, dynamic> json) {
    final eventId = _text(json['event_id']);
    if (eventId.isEmpty) return null;

    final actorSlug = _text(json['actor_slug']).toLowerCase();
    final actorName = _text(json['actor_display_name']);
    return CardJourneyMoment(
      eventId: eventId,
      eventType: _text(json['event_type']),
      createdAt: _date(json['created_at']),
      actorSlug: actorSlug,
      actorDisplayName: actorName.isEmpty ? actorSlug : actorName,
      actorAvatarPath: _text(json['actor_avatar_path']),
      cardPrintId: _text(json['card_print_id']),
      momentLine: _text(json['moment_line']),
      nextCursorCreatedAt: _date(json['next_cursor_created_at']),
      nextCursorEventId: _text(json['next_cursor_event_id']),
    );
  }
}

class CardJourneyMomentsPage {
  const CardJourneyMomentsPage({
    required this.moments,
    this.nextCursorCreatedAt,
    this.nextCursorEventId,
  });

  final List<CardJourneyMoment> moments;
  final DateTime? nextCursorCreatedAt;
  final String? nextCursorEventId;

  bool get hasNextCursor =>
      nextCursorCreatedAt != null && _text(nextCursorEventId).isNotEmpty;
}

class CardJourneyGeographyArea {
  const CardJourneyGeographyArea({
    required this.areaLabel,
    required this.collectorCount,
    required this.lastPublicActivityAt,
    required this.rank,
  });

  final String areaLabel;
  final int collectorCount;
  final DateTime? lastPublicActivityAt;
  final int rank;

  static CardJourneyGeographyArea? fromJson(Map<String, dynamic> json) {
    final areaLabel = _text(json['area_label']);
    if (areaLabel.isEmpty) return null;

    return CardJourneyGeographyArea(
      areaLabel: areaLabel,
      collectorCount: _int(json['collector_count']),
      lastPublicActivityAt: _date(json['last_public_activity_at']),
      rank: _int(json['rank']),
    );
  }
}

class CardJourneyOverview {
  const CardJourneyOverview({
    required this.snapshot,
    required this.collectorPreview,
    required this.moments,
    required this.geography,
  });

  final CardJourneySnapshot snapshot;
  final List<CardJourneyCollector> collectorPreview;
  final List<CardJourneyMoment> moments;
  final List<CardJourneyGeographyArea> geography;
}

class CardJourneyService {
  CardJourneyService({SupabaseClient? client, CardJourneyRpc? rpc})
    : _client = client ?? (rpc == null ? Supabase.instance.client : null),
      _rpc = rpc;

  final SupabaseClient? _client;
  final CardJourneyRpc? _rpc;

  bool get isFeatureEnabled => kCardJourneysEnabled;

  Future<CardJourneyOverview> fetchOverview(String cardPrintId) async {
    final snapshot = await fetchSnapshot(cardPrintId);
    if (snapshot.isEmpty) {
      return CardJourneyOverview(
        snapshot: snapshot,
        collectorPreview: const <CardJourneyCollector>[],
        moments: const <CardJourneyMoment>[],
        geography: const <CardJourneyGeographyArea>[],
      );
    }

    final collectorPreview = await fetchCollectors(
      cardPrintId: cardPrintId,
      limit: 3,
    );
    final moments = await fetchMoments(cardPrintId: cardPrintId, limit: 5);
    final geography = await fetchGeography(cardPrintId);
    return CardJourneyOverview(
      snapshot: snapshot,
      collectorPreview: collectorPreview.collectors,
      moments: moments.moments,
      geography: geography,
    );
  }

  Future<CardJourneySnapshot> fetchSnapshot(String cardPrintId) async {
    final response = await _callRpc(
      'card_journey_snapshot_v1',
      params: <String, dynamic>{'p_card_print_id': cardPrintId},
    );
    final row = _firstMap(response);
    return row == null
        ? CardJourneySnapshot.empty(cardPrintId)
        : CardJourneySnapshot.fromJson(row);
  }

  Future<CardJourneyCollectorsPage> fetchCollectors({
    required String cardPrintId,
    CardJourneyCollectorFilter filter = CardJourneyCollectorFilter.owners,
    int limit = 20,
    DateTime? afterCreatedAt,
    String? afterUserId,
  }) async {
    final response = await _callRpc(
      'card_journey_collectors_v1',
      params: _withoutNulls(<String, dynamic>{
        'p_card_print_id': cardPrintId,
        'p_kind': filter.rpcKind,
        'p_limit': limit.clamp(1, 50).toInt(),
        'p_after_created_at': afterCreatedAt?.toUtc().toIso8601String(),
        'p_after_user_id': _nullableText(afterUserId),
      }),
    );

    final collectors = _maps(response)
        .map(CardJourneyCollector.fromJson)
        .whereType<CardJourneyCollector>()
        .toList(growable: false);
    final tail = collectors.isEmpty ? null : collectors.last;
    return CardJourneyCollectorsPage(
      collectors: collectors,
      nextCursorCreatedAt: tail?.nextCursorCreatedAt,
      nextCursorUserId: tail?.nextCursorUserId,
    );
  }

  Future<CardJourneyMomentsPage> fetchMoments({
    required String cardPrintId,
    int limit = 5,
    DateTime? afterCreatedAt,
    String? afterEventId,
  }) async {
    final response = await _callRpc(
      'card_journey_moments_v1',
      params: _withoutNulls(<String, dynamic>{
        'p_card_print_id': cardPrintId,
        'p_limit': limit.clamp(1, 50).toInt(),
        'p_after_created_at': afterCreatedAt?.toUtc().toIso8601String(),
        'p_after_event_id': _nullableText(afterEventId),
      }),
    );

    final moments = _maps(response)
        .map(CardJourneyMoment.fromJson)
        .whereType<CardJourneyMoment>()
        .toList(growable: false);
    final tail = moments.isEmpty ? null : moments.last;
    return CardJourneyMomentsPage(
      moments: moments,
      nextCursorCreatedAt: tail?.nextCursorCreatedAt,
      nextCursorEventId: tail?.nextCursorEventId,
    );
  }

  Future<List<CardJourneyGeographyArea>> fetchGeography(
    String cardPrintId,
  ) async {
    final response = await _callRpc(
      'card_journey_geography_v1',
      params: <String, dynamic>{'p_card_print_id': cardPrintId},
    );

    return _maps(response)
        .map(CardJourneyGeographyArea.fromJson)
        .whereType<CardJourneyGeographyArea>()
        .toList(growable: false);
  }

  Future<String?> fetchContactVaultItemId({
    required String cardPrintId,
    required String ownerUserId,
  }) async {
    final normalizedCardPrintId = _text(cardPrintId);
    final normalizedOwnerUserId = _text(ownerUserId);
    if (normalizedCardPrintId.isEmpty || normalizedOwnerUserId.isEmpty) {
      return null;
    }

    try {
      final injected = _rpc;
      if (injected != null) {
        final response = await injected(
          'v_card_contact_targets_v1',
          params: <String, dynamic>{
            'card_print_id': normalizedCardPrintId,
            'owner_user_id': normalizedOwnerUserId,
          },
        );
        return _nullableText(_firstMap(response)?['vault_item_id']);
      }

      final client = _client;
      if (client == null) {
        throw StateError('CardJourneyService requires a Supabase client.');
      }

      final response = await client
          .from('v_card_contact_targets_v1')
          .select('vault_item_id,created_at')
          .eq('card_print_id', normalizedCardPrintId)
          .eq('owner_user_id', normalizedOwnerUserId)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();
      return _nullableText(response?['vault_item_id']);
    } catch (error, stackTrace) {
      Error.throwWithStackTrace(
        CardJourneyServiceException('v_card_contact_targets_v1', error),
        stackTrace,
      );
    }
  }

  Future<dynamic> _callRpc(
    String functionName, {
    Map<String, dynamic>? params,
  }) async {
    try {
      final injected = _rpc;
      if (injected != null) {
        return await injected(functionName, params: params);
      }

      final client = _client;
      if (client == null) {
        throw StateError('CardJourneyService requires a Supabase client.');
      }

      return await client.rpc(functionName, params: params ?? const {});
    } catch (error, stackTrace) {
      Error.throwWithStackTrace(
        CardJourneyServiceException(functionName, error),
        stackTrace,
      );
    }
  }
}

List<Map<String, dynamic>> _maps(dynamic response) {
  if (response is List) {
    return response
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }
  final first = _firstMap(response);
  return first == null
      ? const <Map<String, dynamic>>[]
      : <Map<String, dynamic>>[first];
}

Map<String, dynamic>? _firstMap(dynamic response) {
  if (response is Map) {
    return Map<String, dynamic>.from(response);
  }
  if (response is List && response.isNotEmpty && response.first is Map) {
    return Map<String, dynamic>.from(response.first as Map);
  }
  return null;
}

Map<String, dynamic> _withoutNulls(Map<String, dynamic> value) {
  return Map<String, dynamic>.from(value)
    ..removeWhere((_, dynamic item) => item == null);
}

String _text(dynamic value) => (value ?? '').toString().trim();

String? _nullableText(dynamic value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : normalized;
}

DateTime? _date(dynamic value) {
  final normalized = _text(value);
  if (normalized.isEmpty) return null;
  return DateTime.tryParse(normalized);
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(_text(value)) ?? 0;
}

String _plural(int count, String singular, {String? plural}) {
  final label = count == 1 ? singular : (plural ?? '${singular}s');
  return '$count $label';
}
