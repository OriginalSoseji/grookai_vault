import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/notifications/founder_notification_service.dart';

void main() {
  test('founder notification item preserves operational evidence', () {
    final item = FounderNotificationItem.fromJson(<String, dynamic>{
      'id': 'event-1',
      'notification_id': 'notification-1',
      'event_type': 'pipeline_failed',
      'severity': 'CRITICAL',
      'source_host': 'mee-worker-1',
      'source_unit': 'tcgplayer-market.service',
      'source_commit_sha': 'abc123',
      'received_at': '2026-08-30T20:00:00Z',
      'is_unread': true,
      'payload': <String, dynamic>{
        'message': 'Pricing publication failed.',
        'unit_state': 'failed',
        'journal_tail': 'timeout while publishing',
      },
    });

    expect(item, isNotNull);
    expect(item!.title, 'Tcgplayer Market - Pipeline Failed');
    expect(item.summary, 'Pricing publication failed.');
    expect(item.severity, 'critical');
    expect(item.needsAction, isTrue);
    expect(item.isUnread, isTrue);
    expect(item.unitState, 'failed');
    expect(item.journalTail, 'timeout while publishing');
    expect(item.sourceCommitSha, 'abc123');
  });

  test('founder notification item requires durable identities', () {
    expect(
      FounderNotificationItem.fromJson(<String, dynamic>{
        'notification_id': 'notification-1',
      }),
      isNull,
    );
    expect(
      FounderNotificationItem.fromJson(<String, dynamic>{'id': 'event-1'}),
      isNull,
    );
  });

  test('unread snapshot only exposes a usable complete cursor', () {
    final complete =
        FounderNotificationUnreadSnapshot.fromJson(<String, dynamic>{
          'unread_count': 8,
          'latest_received_at': '2026-08-30T20:00:00Z',
          'latest_event_id': 'event-8',
        });
    expect(complete.unreadCount, 8);
    expect(complete.hasCursor, isTrue);

    final incomplete = FounderNotificationUnreadSnapshot.fromJson(
      <String, dynamic>{'unread_count': '2'},
    );
    expect(incomplete.unreadCount, 2);
    expect(incomplete.hasCursor, isFalse);
  });
}
