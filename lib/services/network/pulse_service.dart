import 'package:supabase_flutter/supabase_flutter.dart';

import '../../utils/display_image_contract.dart';

const bool kPulseSurfaceEnabled = bool.fromEnvironment(
  'PULSE_SURFACE_ENABLED',
  defaultValue: true,
);

class PulseUnreadSnapshot {
  const PulseUnreadSnapshot({
    required this.unreadCount,
    this.latestEventCreatedAt,
    this.latestEventId,
  });

  final int unreadCount;
  final DateTime? latestEventCreatedAt;
  final String? latestEventId;

  bool get hasCursor =>
      latestEventCreatedAt != null && (latestEventId ?? '').trim().isNotEmpty;

  static const empty = PulseUnreadSnapshot(unreadCount: 0);

  static PulseUnreadSnapshot fromJson(Map<String, dynamic> json) {
    return PulseUnreadSnapshot(
      unreadCount: _int(json['unread_count']),
      latestEventCreatedAt: _date(json['latest_event_created_at']),
      latestEventId: _text(json['latest_event_id']),
    );
  }
}

class PulsePage {
  const PulsePage({
    required this.items,
    this.nextCursorCreatedAt,
    this.nextCursorEventId,
  });

  final List<PulseItem> items;
  final DateTime? nextCursorCreatedAt;
  final String? nextCursorEventId;

  bool get hasNextCursor =>
      nextCursorCreatedAt != null &&
      (nextCursorEventId ?? '').trim().isNotEmpty;
}

class PulseItem {
  const PulseItem({
    required this.pulseItemId,
    required this.cardEventId,
    required this.eventType,
    required this.rankBucket,
    required this.createdAt,
    required this.actorUserId,
    required this.actorSlug,
    required this.actorDisplayName,
    required this.cardPrintId,
    required this.gvId,
    required this.cardName,
    required this.setCode,
    required this.setName,
    required this.cardNumber,
    required this.displayImageUrl,
    required this.ownershipContext,
    required this.distanceBucket,
    required this.localityLabel,
    required this.completionSubjectType,
    required this.completionSubjectLabel,
    required this.completionThreshold,
    required this.primaryActionLabel,
    required this.primaryActionRoute,
    required this.payload,
    required this.nextCursorCreatedAt,
    required this.nextCursorEventId,
  });

  final String pulseItemId;
  final String cardEventId;
  final String eventType;
  final String rankBucket;
  final DateTime? createdAt;
  final String actorUserId;
  final String actorSlug;
  final String actorDisplayName;
  final String cardPrintId;
  final String gvId;
  final String cardName;
  final String setCode;
  final String setName;
  final String cardNumber;
  final String? displayImageUrl;
  final String ownershipContext;
  final String distanceBucket;
  final String localityLabel;
  final String completionSubjectType;
  final String completionSubjectLabel;
  final double? completionThreshold;
  final String primaryActionLabel;
  final String primaryActionRoute;
  final Map<String, dynamic> payload;
  final DateTime? nextCursorCreatedAt;
  final String? nextCursorEventId;

  bool get isWantMatch => rankBucket == 'want_match';
  bool get isCompletion => rankBucket == 'completion';
  bool get isCollectorActivity => rankBucket == 'collector_activity';

  String get displayCardName {
    final payloadName = _text(payload['card_name']);
    if (payloadName.isNotEmpty) return payloadName;
    return cardName.isEmpty ? 'Card' : cardName;
  }

  String get displayActorName {
    final payloadName = _text(payload['owner_display_name']);
    if (payloadName.isNotEmpty) return payloadName;
    if (actorDisplayName.isNotEmpty) return actorDisplayName;
    if (actorSlug.isNotEmpty) return actorSlug;
    return 'A collector';
  }

  String get contactVaultItemId => _text(payload['vault_item_id']);

  String get intent {
    final payloadIntent = _text(payload['intent']);
    if (payloadIntent.isNotEmpty) return payloadIntent;
    return ownershipContext;
  }

  static PulseItem? fromJson(Map<String, dynamic> json) {
    final pulseItemId = _text(json['pulse_item_id']);
    final cardEventId = _text(json['card_event_id']);
    if (pulseItemId.isEmpty || cardEventId.isEmpty) {
      return null;
    }

    final payloadValue = json['payload'];
    final payload = payloadValue is Map
        ? Map<String, dynamic>.from(payloadValue)
        : const <String, dynamic>{};

    return PulseItem(
      pulseItemId: pulseItemId,
      cardEventId: cardEventId,
      eventType: _text(json['event_type']),
      rankBucket: _text(json['rank_bucket']),
      createdAt: _date(json['created_at']),
      actorUserId: _text(json['actor_user_id']),
      actorSlug: _text(json['actor_slug']).toLowerCase(),
      actorDisplayName: _text(json['actor_display_name']),
      cardPrintId: _text(json['card_print_id']),
      gvId: _text(json['gv_id']),
      cardName: _text(json['card_name']),
      setCode: _text(json['set_code']),
      setName: _text(json['set_name']),
      cardNumber: _text(json['card_number']),
      displayImageUrl: normalizeDisplayImageUrl(json['display_image_url']),
      ownershipContext: _text(json['ownership_context']),
      distanceBucket: _text(json['distance_bucket']),
      localityLabel: _text(json['locality_label']),
      completionSubjectType: _text(json['completion_subject_type']),
      completionSubjectLabel: _text(json['completion_subject_label']),
      completionThreshold: _double(json['completion_threshold']),
      primaryActionLabel: _text(json['primary_action_label']),
      primaryActionRoute: _text(json['primary_action_route']),
      payload: payload,
      nextCursorCreatedAt: _date(json['next_cursor_created_at']),
      nextCursorEventId: _text(json['next_cursor_event_id']),
    );
  }
}

class PulseService {
  const PulseService({required SupabaseClient client}) : _client = client;

  final SupabaseClient _client;

  Future<PulseUnreadSnapshot> fetchUnread() async {
    if (_client.auth.currentUser == null) {
      return PulseUnreadSnapshot.empty;
    }

    final response = await _client.rpc('pulse_unread_count_v1');
    final row = _firstMap(response);
    return row == null
        ? PulseUnreadSnapshot.empty
        : PulseUnreadSnapshot.fromJson(row);
  }

  Future<PulsePage> fetchItems({
    int limit = 30,
    DateTime? afterCreatedAt,
    String? afterEventId,
  }) async {
    if (_client.auth.currentUser == null) {
      return const PulsePage(items: <PulseItem>[]);
    }

    final response = await _client.rpc(
      'pulse_items_v1',
      params: <String, dynamic>{
        'p_limit': limit.clamp(1, 50).toInt(),
        'p_after_created_at': afterCreatedAt?.toUtc().toIso8601String(),
        'p_after_event_id': _nullableText(afterEventId),
      },
    );

    final rows = response is List ? response : const <dynamic>[];
    final items = rows
        .whereType<Map>()
        .map((row) => PulseItem.fromJson(Map<String, dynamic>.from(row)))
        .whereType<PulseItem>()
        .toList(growable: false);
    final tail = items.isEmpty ? null : items.last;
    return PulsePage(
      items: items,
      nextCursorCreatedAt: tail?.nextCursorCreatedAt,
      nextCursorEventId: tail?.nextCursorEventId,
    );
  }

  Future<void> markSeen(PulseUnreadSnapshot snapshot) async {
    if (_client.auth.currentUser == null) {
      return;
    }

    await _client.rpc(
      'pulse_mark_seen_v1',
      params: <String, dynamic>{
        'p_seen_through_created_at': snapshot.latestEventCreatedAt
            ?.toUtc()
            .toIso8601String(),
        'p_seen_through_event_id': _nullableText(snapshot.latestEventId),
      },
    );
  }
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

String _text(dynamic value) => (value ?? '').toString().trim();

String? _nullableText(dynamic value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : normalized;
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(_text(value)) ?? 0;
}

double? _double(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(_text(value));
}

DateTime? _date(dynamic value) {
  final normalized = _text(value);
  if (normalized.isEmpty) return null;
  return DateTime.tryParse(normalized);
}
