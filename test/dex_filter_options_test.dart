import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/utils/dex_filter_options.dart';

void main() {
  const productionCasePairs = <(String, String)>[
    ('Double rare', 'Double Rare'),
    ('Hyper rare', 'Hyper Rare'),
    ('Illustration rare', 'Illustration Rare'),
    ('Rare Ace', 'Rare ACE'),
    ('Rare Holo ex', 'Rare Holo EX'),
    ('Shiny rare', 'Shiny Rare'),
    ('Special illustration rare', 'Special Illustration Rare'),
  ];

  test('collapses production rarity case variants deterministically', () {
    final forward = buildDexFilterOptions(
      productionCasePairs.expand((pair) => <String>[pair.$1, pair.$2]),
    );
    final reverse = buildDexFilterOptions(
      productionCasePairs.reversed.expand((pair) => <String>[pair.$2, pair.$1]),
    );

    expect(forward, <String>[
      'Double Rare',
      'Hyper Rare',
      'Illustration Rare',
      'Rare ACE',
      'Rare Holo EX',
      'Shiny Rare',
      'Special Illustration Rare',
    ]);
    expect(reverse, forward);
  });

  test('normalizes surrounding and repeated whitespace', () {
    expect(
      buildDexFilterOptions(<String?>[
        null,
        '',
        '   ',
        '  Rare   Holo EX ',
        'Rare Holo ex',
      ]),
      <String>['Rare Holo EX'],
    );
    expect(normalizeDexFilterValue('  Rare   Holo EX '), 'rare holo ex');
  });

  test('matches selections without case or whitespace sensitivity', () {
    for (final pair in productionCasePairs) {
      expect(matchesDexFilterValue(pair.$1, pair.$2), isTrue);
      expect(matchesDexFilterValue(pair.$2, pair.$1), isTrue);
    }

    expect(matchesDexFilterValue('  reverse   holo ', 'Reverse Holo'), isTrue);
    expect(matchesDexFilterValue('Holo', 'Reverse Holo'), isFalse);
    expect(matchesDexFilterValue('Holo', null), isTrue);
  });
}
