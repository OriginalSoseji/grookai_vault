import 'package:supabase_flutter/supabase_flutter.dart';

class FounderNotificationUnreadSnapshot {
  const FounderNotificationUnreadSnapshot({
    required this.unreadCount,
    this.latestReceivedAt,
    this.latestEventId,
  });

  final int unreadCount;
  final DateTime? latestReceivedAt;
  final String? latestEventId;

  bool get hasCursor =>
      latestReceivedAt != null && (latestEventId ?? '').trim().isNotEmpty;

  static const empty = FounderNotificationUnreadSnapshot(unreadCount: 0);

  factory FounderNotificationUnreadSnapshot.fromJson(
    Map<String, dynamic> json,
  ) {
    return FounderNotificationUnreadSnapshot(
      unreadCount: _int(json['unread_count']),
      latestReceivedAt: _date(json['latest_received_at']),
      latestEventId: _text(json['latest_event_id']),
    );
  }
}

class FounderNotificationItem {
  const FounderNotificationItem({
    required this.id,
    required this.notificationId,
    required this.eventType,
    required this.severity,
    required this.sourceHost,
    required this.sourceUnit,
    required this.sourceCommitSha,
    required this.payload,
    required this.receivedAt,
    required this.isUnread,
  });

  final String id;
  final String notificationId;
  final String eventType;
  final String severity;
  final String sourceHost;
  final String sourceUnit;
  final String sourceCommitSha;
  final Map<String, dynamic> payload;
  final DateTime? receivedAt;
  final bool isUnread;

  bool get needsAction => severity == 'critical' || severity == 'high';

  String get title {
    final explicit = _firstText(payload, const <String>[
      'title',
      'notification_title',
    ]);
    if (explicit.isNotEmpty) return explicit;

    final unit = sourceUnit.isEmpty
        ? 'Grookai system'
        : _displayToken(sourceUnit);
    return '$unit - ${_displayToken(eventType)}';
  }

  String get summary {
    final explicit = _firstText(payload, const <String>[
      'summary',
      'message',
      'detail',
      'description',
    ]);
    if (explicit.isNotEmpty) return explicit;

    final host = sourceHost.isEmpty ? 'production' : sourceHost;
    return '$host reported ${_displayToken(eventType).toLowerCase()}.';
  }

  String get unitState => _text(payload['unit_state']);
  String get journalTail => _text(payload['journal_tail']);

  FounderNotificationItem copyWith({bool? isUnread}) {
    return FounderNotificationItem(
      id: id,
      notificationId: notificationId,
      eventType: eventType,
      severity: severity,
      sourceHost: sourceHost,
      sourceUnit: sourceUnit,
      sourceCommitSha: sourceCommitSha,
      payload: payload,
      receivedAt: receivedAt,
      isUnread: isUnread ?? this.isUnread,
    );
  }

  static FounderNotificationItem? fromJson(Map<String, dynamic> json) {
    final id = _text(json['id']);
    final notificationId = _text(json['notification_id']);
    if (id.isEmpty || notificationId.isEmpty) return null;

    final rawPayload = json['payload'];
    return FounderNotificationItem(
      id: id,
      notificationId: notificationId,
      eventType: _text(json['event_type']),
      severity: _text(json['severity']).toLowerCase(),
      sourceHost: _text(json['source_host']),
      sourceUnit: _text(json['source_unit']),
      sourceCommitSha: _text(json['source_commit_sha']),
      payload: rawPayload is Map
          ? Map<String, dynamic>.from(rawPayload)
          : const <String, dynamic>{},
      receivedAt: _date(json['received_at']),
      isUnread: json['is_unread'] == true,
    );
  }
}

class FounderNotificationOverview {
  const FounderNotificationOverview({
    required this.items,
    required this.unread,
  });

  final List<FounderNotificationItem> items;
  final FounderNotificationUnreadSnapshot unread;
}

class FounderNotificationService {
  const FounderNotificationService({required SupabaseClient client})
    : _client = client;

  final SupabaseClient _client;

  Future<bool> hasAccess() async {
    if (_client.auth.currentUser == null) return false;
    final response = await _client.rpc(
      'current_user_has_founder_entitlement_v1',
    );
    return response == true || response?.toString().toLowerCase() == 'true';
  }

  Future<FounderNotificationOverview> fetchOverview({int limit = 5}) async {
    final results = await Future.wait<dynamic>([
      fetchItems(limit: limit),
      fetchUnread(),
    ]);
    return FounderNotificationOverview(
      items: results[0] as List<FounderNotificationItem>,
      unread: results[1] as FounderNotificationUnreadSnapshot,
    );
  }

  Future<List<FounderNotificationItem>> fetchItems({
    int limit = 50,
    DateTime? beforeReceivedAt,
    String? beforeEventId,
    bool unreadOnly = false,
  }) async {
    if (_client.auth.currentUser == null) {
      return const <FounderNotificationItem>[];
    }

    final response = await _client.rpc(
      'founder_notification_items_v1',
      params: <String, dynamic>{
        'p_limit': limit.clamp(1, 100).toInt(),
        'p_before_received_at': beforeReceivedAt?.toUtc().toIso8601String(),
        'p_before_event_id': _nullableText(beforeEventId),
        'p_unread_only': unreadOnly,
      },
    );

    return (response is List ? response : const <dynamic>[])
        .whereType<Map>()
        .map(
          (row) =>
              FounderNotificationItem.fromJson(Map<String, dynamic>.from(row)),
        )
        .whereType<FounderNotificationItem>()
        .toList(growable: false);
  }

  Future<FounderNotificationItem?> fetchItem(String notificationId) async {
    if (_client.auth.currentUser == null || notificationId.trim().isEmpty) {
      return null;
    }

    final response = await _client.rpc(
      'founder_notification_item_v1',
      params: <String, dynamic>{'p_notification_id': notificationId.trim()},
    );
    final row = _firstMap(response);
    return row == null ? null : FounderNotificationItem.fromJson(row);
  }

  Future<FounderNotificationUnreadSnapshot> fetchUnread() async {
    if (_client.auth.currentUser == null) {
      return FounderNotificationUnreadSnapshot.empty;
    }

    final response = await _client.rpc('founder_notification_unread_count_v1');
    final row = _firstMap(response);
    return row == null
        ? FounderNotificationUnreadSnapshot.empty
        : FounderNotificationUnreadSnapshot.fromJson(row);
  }

  Future<void> markSeen(FounderNotificationUnreadSnapshot snapshot) async {
    if (_client.auth.currentUser == null) return;

    await _client.rpc(
      'founder_notification_mark_seen_v1',
      params: <String, dynamic>{
        'p_seen_through_received_at': snapshot.latestReceivedAt
            ?.toUtc()
            .toIso8601String(),
        'p_seen_through_event_id': _nullableText(snapshot.latestEventId),
      },
    );
  }
}

Map<String, dynamic>? _firstMap(dynamic value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  if (value is List && value.isNotEmpty && value.first is Map) {
    return Map<String, dynamic>.from(value.first as Map);
  }
  return null;
}

String _firstText(Map<String, dynamic> json, Iterable<String> keys) {
  for (final key in keys) {
    final value = _text(json[key]);
    if (value.isNotEmpty) return value;
  }
  return '';
}

String _displayToken(String value) {
  final normalized = value
      .trim()
      .replaceAll(RegExp(r'\.(service|timer)$', caseSensitive: false), '')
      .replaceAll(RegExp(r'[_\-.]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ');
  if (normalized.isEmpty) return 'Operations alert';
  return normalized
      .split(' ')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

String _text(dynamic value) => value?.toString().trim() ?? '';

String? _nullableText(dynamic value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : normalized;
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(_text(value)) ?? 0;
}

DateTime? _date(dynamic value) {
  if (value is DateTime) return value;
  return DateTime.tryParse(_text(value));
}
