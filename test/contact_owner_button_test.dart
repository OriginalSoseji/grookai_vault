import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/card_interaction_service.dart';
import 'package:grookai_vault/widgets/contact_owner_button.dart';

void main() {
  testWidgets('direct contact send opens the conversation', (tester) async {
    var opened = 0;
    CardInteractionSendResult? observedResult;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: ContactOwnerButton(
              vaultItemId: 'vault-1',
              cardPrintId: 'card-1',
              ownerUserId: 'owner-1',
              ownerDisplayName: 'Ari',
              cardName: 'Pikachu',
              buttonLabel: 'Contact collector',
              currentUserIdOverride: 'viewer-1',
              sendMessageOverride:
                  ({
                    required vaultItemId,
                    required cardPrintId,
                    required message,
                  }) async {
                    return const CardInteractionSendResult(
                      ok: true,
                      status: CardInteractionSendStatus.created,
                      message: 'Message sent to Ari.',
                      cardPrintId: 'card-1',
                      vaultItemId: 'vault-1',
                      counterpartUserId: 'owner-1',
                    );
                  },
              resolveThreadOverride: (result) async {
                observedResult = result;
                return _thread();
              },
              openConversationOverride: (navigator, thread) async {
                opened += 1;
              },
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Contact collector'));
    await tester.pumpAndSettle();
    expect(find.text('Message Ari'), findsOneWidget);

    await tester.tap(find.text('Send message'));
    await tester.pumpAndSettle();

    expect(opened, 1);
    expect(observedResult?.counterpartUserId, 'owner-1');
    expect(find.text('Message Ari'), findsNothing);
  });

  testWidgets('choose-copy contact send closes sheet and opens conversation', (
    tester,
  ) async {
    var opened = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: FilledButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    builder: (_) => ContactOwnerButton(
                      vaultItemId: 'vault-1',
                      cardPrintId: 'card-1',
                      ownerUserId: 'owner-1',
                      ownerDisplayName: 'Ari',
                      cardName: 'Pikachu',
                      buttonLabel: 'Message copy',
                      currentUserIdOverride: 'viewer-1',
                      closeParentOnSuccess: true,
                      sendMessageOverride:
                          ({
                            required vaultItemId,
                            required cardPrintId,
                            required message,
                          }) async {
                            return const CardInteractionSendResult(
                              ok: true,
                              status: CardInteractionSendStatus.created,
                              message: 'Message sent to Ari.',
                              cardPrintId: 'card-1',
                              vaultItemId: 'vault-1',
                              counterpartUserId: 'owner-1',
                            );
                          },
                      resolveThreadOverride: (_) async => _thread(),
                      openConversationOverride: (navigator, thread) async {
                        opened += 1;
                      },
                    ),
                  );
                },
                child: const Text('Choose copy'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Choose copy'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Message copy'));
    await tester.pumpAndSettle();
    expect(find.text('Message Ari'), findsOneWidget);

    await tester.tap(find.text('Send message'));
    await tester.pumpAndSettle();

    expect(opened, 1);
    expect(find.text('Message copy'), findsNothing);
    expect(find.text('Message Ari'), findsNothing);
  });

  testWidgets('send failures stay visible in the composer', (tester) async {
    var opened = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ContactOwnerButton(
            vaultItemId: '',
            cardPrintId: 'card-1',
            ownerUserId: 'owner-1',
            ownerDisplayName: 'Ari',
            cardName: 'Pikachu',
            buttonLabel: 'Contact collector',
            currentUserIdOverride: 'viewer-1',
            sendMessageOverride:
                ({
                  required vaultItemId,
                  required cardPrintId,
                  required message,
                }) async {
                  return const CardInteractionSendResult(
                    ok: false,
                    status: CardInteractionSendStatus.validationError,
                    message: 'A card and message are required.',
                  );
                },
            resolveThreadOverride: (_) async => _thread(),
            openConversationOverride: (navigator, thread) async {
              opened += 1;
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('Contact collector'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Send message'));
    await tester.pumpAndSettle();

    expect(opened, 0);
    expect(find.text('A card and message are required.'), findsOneWidget);
    expect(find.text('Message Ari'), findsOneWidget);
  });
}

CardInteractionThreadSummary _thread() {
  return CardInteractionThreadSummary(
    groupKey: 'card-1:owner-1',
    cardPrintId: 'card-1',
    gvId: 'GV-PK-TEST-001',
    cardName: 'Pikachu',
    setName: 'Test Set',
    number: '#001',
    latestMessage: 'Hi Ari, I saw your Pikachu.',
    messageCount: 1,
    counterpartDisplayName: 'Ari',
    counterpartUserId: 'owner-1',
    startedByCurrentUser: true,
    hasUnread: false,
    isClosed: false,
    isArchived: false,
    vaultItemId: 'vault-1',
    counterpartSlug: 'ari',
    latestCreatedAt: DateTime(2026),
  );
}
