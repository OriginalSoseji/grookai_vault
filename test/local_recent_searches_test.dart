import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/search/local_recent_searches.dart';

void main() {
  test('recent search history trims, deduplicates, and caps at five', () {
    expect(
      normalizeLocalRecentSearches([
        '  Charizard from 151 ',
        'charizard FROM 151',
        'Japanese Pikachu promo',
        'Umbreon alt art',
        'Lugia secret rare',
        'Pikachu promo',
        'Old search',
      ]),
      [
        'Charizard from 151',
        'Japanese Pikachu promo',
        'Umbreon alt art',
        'Lugia secret rare',
        'Pikachu promo',
      ],
    );
  });

  test(
    'recording promotes an existing search and ignores one-character input',
    () {
      const current = [
        'Pikachu promo',
        'Charizard from 151',
        'Umbreon alt art',
      ];

      expect(recordLocalRecentSearch(current, '  CHARIZARD FROM 151 '), [
        'CHARIZARD FROM 151',
        'Pikachu promo',
        'Umbreon alt art',
      ]);
      expect(recordLocalRecentSearch(current, ' x '), current);
    },
  );

  test('removal is local and Clear All persists an empty list', () {
    expect(
      removeLocalRecentSearch([
        'Pikachu promo',
        'Charizard from 151',
      ], 'Pikachu promo'),
      ['Charizard from 151'],
    );

    final main = File('lib/main.dart').readAsStringSync();
    expect(
      main,
      contains(
        "static const _recentSearchesKey = 'catalog_recent_searches_v1'",
      ),
    );
    expect(
      main,
      contains('preferences.setStringList(_recentSearchesKey, searches)'),
    );
    expect(main, contains('void _clearRecentSearches()'));
    expect(main, contains('_saveRecentSearches(const [])'));
  });
}
