import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('visual system uses neutral surfaces and three semantic accents', () {
    final tokens = File('lib/theme/gv_tokens.dart').readAsStringSync();
    final theme = File('lib/main.dart').readAsStringSync();

    expect(tokens, contains('class GvPalette'));
    expect(tokens, contains('static const Color blue'));
    expect(tokens, contains('static const Color mint'));
    expect(tokens, contains('static const Color gold'));
    expect(tokens, contains("surface: const Color(0xFF090C10)"));
    expect(theme, contains('GvPalette.scheme(brightness)'));
    expect(theme, contains('surfaceContainerLowest'));
    expect(theme, contains('filledButtonTheme: FilledButtonThemeData'));
    expect(theme, contains('minimumSize: const Size(0, 46)'));
  });

  test('mobile shell preserves pillars with stable compact selection', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final dock = RegExp(
      r'Widget _buildMobileBottomDock\([\s\S]*?\n\s*Widget _buildDockButton',
    ).firstMatch(shell)!.group(0)!;

    var cursor = -1;
    for (final label in ['Pulse', 'Wall', 'Scan', 'Vault', 'Search']) {
      final next = dock.indexOf("label: '$label'", cursor + 1);
      expect(next, greaterThan(cursor));
      cursor = next;
    }

    expect(dock, contains('maxWidth: 390'));
    expect(dock, contains('variant: GvSurfaceVariant.floating'));
    expect(shell, contains('class _ShellPageTitle'));
    expect(shell, contains('width: selected ? 18 : 0'));
    expect(shell, contains('colorScheme.primary.withValues(alpha: 0.12)'));
  });

  test('search and Vault retain factual card hierarchy', () {
    final main = File('lib/main.dart').readAsStringSync();
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final grid = File('lib/theme/gv_grid_constants.dart').readAsStringSync();

    expect(main, contains("hintText: 'Search in a sentence'"));
    expect(main, contains('height: 52'));
    expect(grid, contains('gridChildAspectRatio = 0.52'));
    expect(grid, contains('ownershipSlotHeight = 44'));
    expect(grid, contains('catalogTileMainAxisExtent(double tileWidth)'));
    expect(main, contains('SliverLayoutBuilder('));
    expect(
      main,
      contains('mainAxisExtent: GvGridConstants.catalogTileMainAxisExtent'),
    );
    expect(vault, contains("'YOUR COLLECTION'"));
    expect(vault, contains('variant: GvSurfaceVariant.grouped'));
    expect(vault, contains('resolveVaultPrintingIdentityPresentation(row)'));
    expect(vault, contains('artwork.primaryImageUrl'));
    expect(vault, contains('artwork.fallbackImageUrl'));
  });
}
