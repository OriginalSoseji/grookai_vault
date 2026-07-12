import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final shell = File('lib/main_shell.dart').readAsStringSync();

  test('compare selected cards is no longer hidden in Explore actions', () {
    expect(shell, contains('enum _ExploreHeaderAction { dex, sets }'));
    expect(shell, isNot(contains('_ExploreHeaderAction.compare')));
    expect(shell, contains("tooltip: 'Explore actions'"));
    expect(shell, contains('_ExploreHeaderAction.dex'));
    expect(shell, contains('_ExploreHeaderAction.sets'));
    expect(shell, contains("child: Text('Grookai Dex')"));
    expect(shell, contains("child: Text('Sets')"));
    expect(shell, isNot(contains('Compare 1 selected card')));
    expect(shell, isNot(contains('Compare \$compareCount selected cards')));
  });

  test('search selected-card state renders a floating compare pill', () {
    final chrome = RegExp(
      r'Widget _buildMobileBottomChrome[\s\S]*?\n  Widget _buildMobileBottomDock',
    ).firstMatch(shell)!.group(0)!;

    expect(
      chrome,
      contains('CompareCardSelectionController.instance.listenable'),
    );
    expect(chrome, contains('_destination == _ShellDestination.search'));
    expect(chrome, contains('compareCount == 0'));
    expect(chrome, contains('return const SizedBox.shrink()'));
    expect(chrome, contains('Positioned('));
    expect(chrome, contains('bottom: dockHeight +'));
    expect(chrome, contains('_CompareSelectionPill('));
    expect(chrome, contains('count: compareCount'));
    expect(chrome, contains('onPressed: () => unawaited(_openCompare())'));
  });

  test('floating compare pill uses shell glass vocabulary and count badge', () {
    final pill = RegExp(
      r'class _CompareSelectionPill extends StatelessWidget[\s\S]*?class _DockUnreadBadge',
    ).firstMatch(shell)!.group(0)!;

    expect(pill, contains('GvSurface('));
    expect(pill, contains('variant: GvSurfaceVariant.glass'));
    expect(pill, contains('constraints: const BoxConstraints(maxWidth: 390)'));
    expect(pill, contains("count == 1 ? 'Compare 1 selected'"));
    expect(pill, contains("'Compare \$count selected'"));
    expect(pill, contains('Icons.compare_arrows_rounded'));
    expect(pill, contains('class _CompareSelectionCountBadge'));
    expect(pill, contains('colorScheme.primary'));
    expect(pill, contains('colorScheme.onPrimary'));
  });
}
