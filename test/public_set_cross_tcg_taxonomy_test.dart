import 'package:flutter_test/flutter_test.dart';

import 'package:grookai_vault/services/public/public_sets_service.dart';

void main() {
  const onePieceSets = <PublicSetSummary>[
    PublicSetSummary(
      code: 'op-17',
      name: 'OP-17 Booster Set',
      cardCount: 126,
      game: PublicCatalogGame.onePiece,
      releaseYear: 2026,
    ),
    PublicSetSummary(
      code: 'st-01',
      name: 'Starter Deck ST-01',
      cardCount: 17,
      game: PublicCatalogGame.onePiece,
      releaseYear: 2022,
    ),
    PublicSetSummary(
      code: 'prb-02',
      name: 'Premium Booster PRB-02',
      cardCount: 120,
      game: PublicCatalogGame.onePiece,
      releaseYear: 2025,
    ),
    PublicSetSummary(
      code: 'op-pending',
      name: 'Upcoming One Piece Product',
      cardCount: 10,
      game: PublicCatalogGame.onePiece,
    ),
  ];

  test('non-Pokemon catalogs expose release years instead of Pokemon eras', () {
    final options = PublicSetsService.releaseYearOptions(onePieceSets);

    expect(options.map((option) => option.value), <String>[
      'all',
      '2026',
      '2025',
      '2022',
      'date_pending',
    ]);
    expect(
      PublicSetsService.countSetsByReleaseYear(onePieceSets),
      <String, int>{'2026': 1, '2025': 1, '2022': 1, 'date_pending': 1},
    );
  });

  test('release-year filtering remains scoped to the selected TCG', () {
    final results = PublicSetsService.filterAndSortSets(
      sets: <PublicSetSummary>[
        ...onePieceSets,
        const PublicSetSummary(
          code: 'mtg-2025',
          name: 'MTG 2025 Set',
          cardCount: 200,
          game: PublicCatalogGame.mtg,
          releaseYear: 2025,
        ),
      ],
      query: '',
      filter: PublicSetFilter.all,
      game: PublicCatalogGame.onePiece,
      releaseYear: '2025',
    );

    expect(results.map((setInfo) => setInfo.code), <String>['prb-02']);
  });

  test('One Piece and MTG use collector-facing lane vocabulary', () {
    expect(
      PublicSetsService.laneOptionsForGame(
        PublicCatalogGame.onePiece,
      ).map((option) => option.label),
      <String>[
        'All products',
        'Booster sets',
        'Special products',
        'Promos',
        'Starter decks',
      ],
    );
    expect(
      PublicSetsService.laneOptionsForGame(
        PublicCatalogGame.mtg,
      ).map((option) => option.label),
      <String>[
        'All products',
        'Card sets',
        'Special products',
        'Promos',
        'Decks & kits',
      ],
    );
  });

  test('One Piece starter decks and premium boosters use distinct lanes', () {
    expect(PublicSetsService.getSetLane(onePieceSets[1]), PublicSetLane.deck);
    expect(
      PublicSetsService.getSetLane(onePieceSets[2]),
      PublicSetLane.special,
    );
  });
}
