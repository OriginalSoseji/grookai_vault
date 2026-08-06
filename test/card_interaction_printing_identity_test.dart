import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/card_interaction_service.dart';

void main() {
  test('message thread discloses that an exact printing was not captured', () {
    final thread = CardInteractionThreadSummary(
      groupKey: 'card-1:owner-1',
      cardPrintId: 'card-1',
      gvId: 'GV-PK-TEST-001',
      cardName: 'Pikachu',
      setName: 'Test Set',
      number: '001',
      latestMessage: 'Hello',
      messageCount: 1,
      counterpartDisplayName: 'Collector',
      counterpartUserId: 'owner-1',
      startedByCurrentUser: true,
      hasUnread: false,
      isClosed: false,
      isArchived: false,
    );

    expect(
      thread.printingIdentityLabel,
      'Exact printing unavailable for this legacy thread',
    );
  });
}
