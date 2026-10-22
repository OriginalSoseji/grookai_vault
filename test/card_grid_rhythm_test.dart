import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/theme/gv_grid_constants.dart';

void main() {
  test('card grids use the shared compact rhythm', () {
    expect(GvGridConstants.gridOuterPadding, 10);
    expect(GvGridConstants.gridSpacing, 9);
    expect(GvGridConstants.tileWidth(availableWidth: 350, columns: 2), 170.5);
  });

  test('every grid surface delegates spacing to the shared rhythm', () {
    const gridSurfacePaths = <String>[
      'lib/main.dart',
      'lib/main_vault.dart',
      'lib/screens/compare/compare_screen.dart',
      'lib/screens/dex/grookai_dex_screen.dart',
      'lib/screens/dex/grookai_dex_species_screen.dart',
      'lib/screens/public_collector/public_collector_screen.dart',
      'lib/screens/sales/sales_desk_screen.dart',
      'lib/screens/sets/mtg_sealed_catalog_screen.dart',
      'lib/screens/sets/public_set_detail_screen.dart',
      'lib/screens/sets/public_sets_screen.dart',
    ];
    final hardcodedGridSpacing = RegExp(
      r'(?:main|cross)AxisSpacing\s*:\s*(?:6|8|10|12|14|20)(?:\.0)?\s*,',
    );

    for (final path in gridSurfacePaths) {
      final source = File(path).readAsStringSync();
      expect(
        source,
        contains('GvGridConstants.gridSpacing'),
        reason: '$path must use the shared card-grid rhythm.',
      );
      expect(
        source,
        isNot(matches(hardcodedGridSpacing)),
        reason: '$path contains a hardcoded grid gap.',
      );
    }
  });
}
