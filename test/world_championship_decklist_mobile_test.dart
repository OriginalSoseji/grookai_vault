import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/public_sets_service.dart';

void main() {
  test('mobile set organization classifies eras and lanes', () {
    const svSet = PublicSetSummary(
      code: 'sv03.5',
      name: 'Pokemon 151',
      cardCount: 207,
      releaseYear: 2023,
    );
    const wcdSet = PublicSetSummary(
      code: 'wcd2004-magma-spirit',
      name: '2004 World Championships Deck: Magma Spirit',
      cardCount: 60,
      releaseYear: 2004,
    );
    const pendingPromo = PublicSetSummary(
      code: 'jpn-promo-example',
      name: 'Japanese Promo Example',
      cardCount: 12,
    );

    expect(PublicSetsService.getSetEra(svSet), PublicSetEra.scarletViolet);
    expect(PublicSetsService.getSetLane(svSet), PublicSetLane.special);
    expect(PublicSetsService.getSetLane(wcdSet), PublicSetLane.world);
    expect(PublicSetsService.getSetEra(pendingPromo), PublicSetEra.datePending);
    expect(PublicSetsService.getSetLane(pendingPromo), PublicSetLane.promo);
  });

  test('mobile WCD decklist model reconstructs internal deck quantities', () {
    const decklist = PublicWorldChampionshipDecklist(
      setCode: 'wcd2004-magma-spirit',
      deckName: 'Magma Spirit',
      deckYear: 2004,
      playerName: 'Example Player',
      totalQuantity: 4,
      uniqueCardCount: 2,
      entries: [
        PublicWorldChampionshipDecklistEntry(
          cardPrintId: 'cp-1',
          gvId: 'GV-PK-WCD2004-MAGMA-SPIRIT-001',
          name: 'Example Card',
          number: '001',
          quantity: 3,
          sourceSetName: 'EX Ruby & Sapphire',
          sourceCardNumber: '1',
        ),
        PublicWorldChampionshipDecklistEntry(
          cardPrintId: 'cp-2',
          gvId: 'GV-PK-WCD2004-MAGMA-SPIRIT-002',
          name: 'Second Card',
          number: '002',
          quantity: 1,
          sourceSetName: 'EX Ruby & Sapphire',
          sourceCardNumber: '2',
        ),
      ],
    );

    expect(decklist.totalQuantity, 4);
    expect(decklist.uniqueCardCount, 2);
    expect(
      decklist.entries.fold<int>(
        0,
        (sum, entry) => sum + (entry.quantity ?? 0),
      ),
      decklist.totalQuantity,
    );
    expect(decklist.entries.first.sourceSetName, 'EX Ruby & Sapphire');
    expect(decklist.entries.first.sourceCardNumber, '1');
  });
}
