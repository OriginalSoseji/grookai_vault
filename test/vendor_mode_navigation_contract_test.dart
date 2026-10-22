import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final shell = File('lib/main_shell.dart').readAsStringSync();

  test('mobile header moves Vendor Mode into the drawer', () {
    final appBarActions = RegExp(
      r'List<Widget> _buildAppBarActions\([\s\S]*?\n  @override',
    ).firstMatch(shell)!.group(0)!;

    expect(appBarActions, contains('_GrookaiNotificationButton('));
    expect(appBarActions, isNot(contains('Icons.storefront_outlined')));
    expect(appBarActions, isNot(contains("tooltip: 'Vendor Mode'")));
    expect(
      appBarActions,
      isNot(contains('onPressed: _openVendorPricingWorkspace')),
    );
  });

  test('Vendor Mode remains reachable from desktop rail and app drawer', () {
    expect(shell, contains('onOpenVendorMode: _openVendorMode'));
    expect(shell, contains('unawaited(_openVendorPricingWorkspace())'));
    expect(shell, contains('label: \'Vendor Mode\''));
    expect(shell, contains('_closeThenAsync(context, onOpenVendorMode)'));

    final workspaceEntry = RegExp(
      r'Future<void> _openVendorPricingWorkspace\(\) async \{[\s\S]*?\n  \}',
    ).firstMatch(shell)!.group(0)!;
    expect(workspaceEntry, contains('await _openVendorMode();'));
    expect(workspaceEntry, isNot(contains('_pushPage<void>')));

    final vendorEntry = RegExp(
      r'Future<void> _openVendorMode\(\) async \{[\s\S]*?\n  \}',
    ).firstMatch(shell)!.group(0)!;
    expect(vendorEntry, contains('_wallKey.currentState?.reload()'));
    expect(vendorEntry, contains('_vaultKey.currentState?.reload()'));
  });
}
