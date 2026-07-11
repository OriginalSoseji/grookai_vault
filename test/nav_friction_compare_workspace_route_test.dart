import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('compare workspace is floating instead of inline after results', () {
    final search = File('lib/main.dart').readAsStringSync();
    final build = RegExp(
      r'@override\s+Widget build\(BuildContext context\)[\s\S]*?\n  }\n}',
    ).allMatches(search).last.group(0)!;

    expect(build, contains('Expanded('));
    expect(build, contains('child: Stack('));
    expect(build, contains('Positioned('));
    expect(build, contains('bottom: 18'));
    expect(build, contains('child: _buildCompareWorkspaceEntry(theme)'));
    expect(build, contains('ValueListenableBuilder<List<String>>'));
    expect(build, contains('extra: selectedIds.isEmpty ? 8 : 92'));

    final loadMoreIndex = build.indexOf("label: const Text('Load more')");
    final floatingIndex = build.indexOf(
      'child: _buildCompareWorkspaceEntry(theme)',
    );
    expect(loadMoreIndex, isNonNegative);
    expect(floatingIndex, isNonNegative);
    expect(floatingIndex, greaterThan(loadMoreIndex));

    expect(
      RegExp(
        r'child: _buildCompareWorkspaceEntry\(theme\)',
      ).allMatches(build).length,
      1,
    );
    expect(
      build,
      isNot(
        contains(
          'SliverToBoxAdapter(\n'
          '                    child: _buildCompareWorkspaceEntry(theme)',
        ),
      ),
    );
  });

  test('compare workspace uses the shared glass surface vocabulary', () {
    final search = File('lib/main.dart').readAsStringSync();
    final workspace = RegExp(
      r'Widget _buildCompareWorkspaceEntry[\s\S]*?\n  Widget _buildResultsLeadIn',
    ).firstMatch(search)!.group(0)!;

    expect(workspace, contains('GvSurface('));
    expect(workspace, contains('variant: GvSurfaceVariant.glass'));
    expect(
      workspace,
      contains('constraints: const BoxConstraints(maxWidth: 390)'),
    );
    expect(
      workspace,
      contains('CompareCardSelectionController.instance.clear'),
    );
    expect(workspace, contains('onPressed: _openCompareScreen'));
  });
}
