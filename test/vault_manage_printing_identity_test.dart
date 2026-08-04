import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';

VaultManageCardCopy copy({
  required String id,
  String? cardPrintingId,
  String? printingGvId,
  String? finishLabel,
}) {
  return VaultManageCardCopy(
    instanceId: id,
    cardPrintingId: cardPrintingId,
    printingGvId: printingGvId,
    finishLabel: finishLabel,
    conditionLabel: 'NM',
    intent: 'hold',
  );
}

VaultManageCardData data(List<VaultManageCardCopy> copies) {
  return VaultManageCardData(
    vaultItemId: 'vault-item-1',
    cardPrintId: 'card-1',
    name: 'Pikachu',
    setName: 'Test Set',
    totalCopies: copies.length,
    rawCount: copies.length,
    slabCount: 0,
    inPlayCount: 0,
    intent: 'hold',
    isShared: false,
    publicProfileEnabled: false,
    vaultSharingEnabled: false,
    copies: copies,
  );
}

void main() {
  test('copy JSON preserves canonical child finish evidence', () {
    final parsed = VaultManageCardCopy.fromJson({
      'id': 'copy-1',
      'card_printing_id': 'printing-1',
      'printing_gv_id': 'GV-PK-TEST-001-RH',
      'finish_key': 'reverse_holo',
      'finish_keys': {'label': 'Reverse Holo'},
    });

    expect(parsed.cardPrintingId, 'printing-1');
    expect(parsed.printingGvId, 'GV-PK-TEST-001-RH');
    expect(parsed.finishKey, 'reverse_holo');
    expect(parsed.finishLabel, 'Reverse Holo');
    expect(parsed.printingIdentityLabel, 'Printing: Reverse Holo');
  });

  test('unassigned copy never receives an inferred finish', () {
    expect(copy(id: 'copy-1').printingIdentityLabel, 'Printing unassigned');
  });

  test('single-printing copy groups show their exact finish', () {
    final card = data([
      copy(id: 'copy-1', cardPrintingId: 'printing-1', finishLabel: 'Holo'),
      copy(id: 'copy-2', cardPrintingId: 'printing-1', finishLabel: 'Holo'),
    ]);

    expect(card.printingIdentityLabel, 'Printing: Holo');
  });

  test('mixed and partially unassigned groups cannot claim one finish', () {
    expect(
      data([
        copy(id: 'copy-1', cardPrintingId: 'printing-1'),
        copy(id: 'copy-2', cardPrintingId: 'printing-2'),
      ]).printingIdentityLabel,
      'Mixed printings',
    );
    expect(
      data([
        copy(id: 'copy-1', cardPrintingId: 'printing-1'),
        copy(id: 'copy-2'),
      ]).printingIdentityLabel,
      'Printing partially unassigned',
    );
  });
}
