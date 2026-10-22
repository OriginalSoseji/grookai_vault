import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/network_stream_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:grookai_vault/models/card_print.dart';

void main() {
  test('vault writes reject an unassigned printing before any write', () {
    expect(
      () => requireVaultPrintingSelection(null),
      throwsA(isA<StateError>()),
    );
    expect(
      () => requireVaultPrintingSelection('  '),
      throwsA(isA<StateError>()),
    );
    expect(requireVaultPrintingSelection(' printing-1 '), 'printing-1');
  });

  test('discovery catalog windows rotate between pages', () {
    final starts = <int>{
      for (var page = 1; page <= 12; page += 1)
        NetworkStreamService.discoveryCatalogWindowStart(
          seed: 731,
          pageCount: page,
        ),
    };

    expect(starts.length, 12);
    expect(starts.every((value) => value >= 0 && value < 12000), isTrue);
    expect(starts.every((value) => value % 96 == 0), isTrue);
  });

  test('search capability copy and filters match each game', () {
    final main = File('lib/main.dart').readAsStringSync();
    expect(main, contains("gameScope == 'pokemon'"));
    expect(
      main,
      contains("if (normalized != 'pokemon') _languageScope = 'all'"),
    );
    expect(
      main,
      contains(
        "'Name, artist, set, rarity, number, and finish words all work.'",
      ),
    );
    expect(main, contains('if (trimmed.isEmpty && !widget.signedOutBrowse)'));
    expect(main, contains("FocusNode(debugLabel: 'catalog-search')"));
    expect(main, contains('focusNode: _searchFocusNode'));
  });

  test(
    'mobile retries ambiguous structured searches as an exact card name',
    () {
      expect(resolverExactNameRetryQuery('Pikachu rare'), '"Pikachu" rare');
      expect(
        resolverExactNameRetryQuery('Charizard 199/165'),
        '"Charizard" 199/165',
      );
      expect(
        resolverExactNameRetryQuery('Charizard from 151'),
        'Charizard from 151',
      );
    },
  );

  test('vault grid no longer reserves an empty price row', () {
    final source = File('lib/main_vault.dart').readAsStringSync();
    final tileStart = source.indexOf('class _VaultGridTile');
    final tileEnd = source.indexOf('class _VaultGridArtwork');
    final tile = source.substring(tileStart, tileEnd);
    expect(tile, contains('CardSurfacePricePill'));
    expect(tile, isNot(contains('maintainSize: true')));
  });

  test('sets keeps filters compact until requested', () {
    final source = File(
      'lib/screens/sets/public_sets_screen.dart',
    ).readAsStringSync();
    expect(source, contains('height: 44'));
    expect(source, contains('if (_showFilters)'));
  });

  test('drawer remains reachable above system navigation', () {
    final source = File('lib/main_shell.dart').readAsStringSync();
    expect(source, contains('SafeArea('));
    expect(source, contains('minTileHeight: 52'));
  });

  test('catalog-heavy screens bound waits and use content-shaped loading', () {
    final dex = File(
      'lib/screens/dex/grookai_dex_screen.dart',
    ).readAsStringSync();
    final objects = File(
      'lib/screens/grookai_objects/grookai_objects_hub_screen.dart',
    ).readAsStringSync();
    expect(dex, contains('const Duration(seconds: 15)'));
    expect(objects, contains('const Duration(seconds: 12)'));
    expect(objects, contains('class _ObjectsHubLoadingState'));
  });

  test('user-facing brand copy stays lowercase', () {
    const roots = <String>[
      'lib/screens/dex/grookai_dex_screen.dart',
      'lib/screens/account/submit_missing_card_screen.dart',
      'lib/widgets/grookai_objects/grookai_object_share_destination_sheet.dart',
    ];
    for (final path in roots) {
      expect(File(path).readAsStringSync(), isNot(contains("'Grookai")));
    }
  });
}
