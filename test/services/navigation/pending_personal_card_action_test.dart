import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/navigation/pending_personal_card_action.dart';

void main() {
  setUp(PendingPersonalCardActionCoordinator.clearForTesting);
  tearDown(PendingPersonalCardActionCoordinator.clearForTesting);

  test('staged action survives until the matching exact card consumes it', () {
    final request = PendingPersonalCardActionCoordinator.stage(
      kind: PendingPersonalCardActionKind.addToVault,
      cardPrintId: 'card-print-1',
      gvId: 'gv-pk-mew-025',
      cardPrintingId: ' card-printing-1 ',
      printingGvId: 'gv-pk-mew-025-rh',
      finishLabel: ' Reverse Holo ',
    );

    expect(PendingPersonalCardActionCoordinator.pending, same(request));
    expect(
      PendingPersonalCardActionCoordinator.takeForCard(
        cardPrintId: 'other-card',
        gvId: 'GV-PK-OTHER-001',
      ),
      isNull,
    );
    expect(PendingPersonalCardActionCoordinator.pending, same(request));

    final consumed = PendingPersonalCardActionCoordinator.takeForCard(
      cardPrintId: 'card-print-1',
      gvId: 'GV-PK-MEW-025',
    );
    expect(consumed?.kind, PendingPersonalCardActionKind.addToVault);
    expect(consumed?.cardPrintingId, 'card-printing-1');
    expect(consumed?.printingGvId, 'GV-PK-MEW-025-RH');
    expect(consumed?.finishLabel, 'Reverse Holo');
    expect(PendingPersonalCardActionCoordinator.pending, isNull);
    expect(PendingPersonalCardActionCoordinator.hasUnsettledAction, isTrue);
    PendingPersonalCardActionCoordinator.complete(request.id);
    expect(PendingPersonalCardActionCoordinator.hasUnsettledAction, isFalse);
  });

  test('normalized GV-ID can consume the staged action after root swap', () {
    PendingPersonalCardActionCoordinator.stage(
      kind: PendingPersonalCardActionKind.want,
      cardPrintId: 'card-print-1',
      gvId: 'gv-pk-mew-025',
    );

    final consumed = PendingPersonalCardActionCoordinator.takeForCard(
      cardPrintId: 'resolved-card-print',
      gvId: 'gv-pk-mew-025',
    );
    expect(consumed?.kind, PendingPersonalCardActionKind.want);
    PendingPersonalCardActionCoordinator.complete(consumed!.id);
    expect(PendingPersonalCardActionCoordinator.hasUnsettledAction, isFalse);
  });

  test('cancelling one request cannot clear a newer request', () {
    final older = PendingPersonalCardActionCoordinator.stage(
      kind: PendingPersonalCardActionKind.addToVault,
      cardPrintId: 'card-print-1',
      gvId: 'GV-PK-MEW-025',
    );
    final newer = PendingPersonalCardActionCoordinator.stage(
      kind: PendingPersonalCardActionKind.want,
      cardPrintId: 'card-print-2',
      gvId: 'GV-PK-MEW-026',
    );

    PendingPersonalCardActionCoordinator.cancel(older.id);
    expect(PendingPersonalCardActionCoordinator.pending, same(newer));
    PendingPersonalCardActionCoordinator.cancel(newer.id);
    expect(PendingPersonalCardActionCoordinator.pending, isNull);
    expect(PendingPersonalCardActionCoordinator.hasUnsettledAction, isFalse);
  });

  test('completed older action cannot settle a newer active action', () {
    final older = PendingPersonalCardActionCoordinator.stage(
      kind: PendingPersonalCardActionKind.addToVault,
      cardPrintId: 'card-print-1',
      gvId: 'GV-PK-MEW-025',
    );
    PendingPersonalCardActionCoordinator.takeForCard(
      cardPrintId: 'card-print-1',
      gvId: 'GV-PK-MEW-025',
    );
    final newer = PendingPersonalCardActionCoordinator.stage(
      kind: PendingPersonalCardActionKind.want,
      cardPrintId: 'card-print-2',
      gvId: 'GV-PK-MEW-026',
    );
    PendingPersonalCardActionCoordinator.takeForCard(
      cardPrintId: 'card-print-2',
      gvId: 'GV-PK-MEW-026',
    );

    PendingPersonalCardActionCoordinator.complete(older.id);
    expect(PendingPersonalCardActionCoordinator.hasUnsettledAction, isTrue);
    PendingPersonalCardActionCoordinator.complete(newer.id);
    expect(PendingPersonalCardActionCoordinator.hasUnsettledAction, isFalse);
  });
}
