import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/widgets/vault/vault_quick_action_sheet.dart';

void main() {
  testWidgets('vault quick-action sheet renders and invokes actions', (
    tester,
  ) async {
    var invoked = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () {
                  showVaultQuickActionSheet(
                    context: context,
                    title: 'Pikachu',
                    subtitle: 'Black & White',
                    actions: [
                      VaultQuickAction(
                        icon: Icons.visibility_outlined,
                        label: 'View',
                        onPressed: () {
                          invoked = true;
                        },
                      ),
                      const VaultQuickAction(
                        icon: Icons.ios_share_outlined,
                        label: 'Share link',
                        onPressed: null,
                      ),
                    ],
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(find.text('Pikachu'), findsOneWidget);
    expect(find.text('Black & White'), findsOneWidget);
    expect(find.text('View'), findsOneWidget);
    expect(find.text('Share link'), findsOneWidget);

    await tester.tap(find.text('View'));
    await tester.pumpAndSettle();

    expect(invoked, isTrue);
    expect(find.text('Pikachu'), findsNothing);
  });

  testWidgets('vault quick-action sheet scrolls on a short viewport', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 520));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () {
                  showVaultQuickActionSheet(
                    context: context,
                    title: 'Pikachu',
                    subtitle: '11th Movie Commemoration Set · #003',
                    actions: [
                      for (var index = 1; index <= 8; index += 1)
                        VaultQuickAction(
                          icon: Icons.bolt_outlined,
                          label: 'Action $index',
                          onPressed: () {},
                        ),
                    ],
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.text('Action 1'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Action 8'),
      180,
      scrollable: find.byType(Scrollable).last,
    );

    expect(find.text('Action 8'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('vault quick-action sheet is wired to both ownership call sites', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final manage = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();
    final network = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();
    final publicCollector = File(
      'lib/screens/public_collector/public_collector_screen.dart',
    ).readAsStringSync();

    expect(vault, contains('Future<void> _showVaultRowQuickActions'));
    expect(vault, contains(': () => _showVaultRowQuickActions(row)'));
    expect(vault, contains("label: 'Set intent'"));
    expect(vault, contains("label: 'Share link'"));
    expect(vault, contains("label: 'Remove'"));

    expect(manage, contains('Future<void> _showCopyQuickActions'));
    expect(manage, contains('_showCopyQuickActions(data, data.copies[index])'));
    expect(manage, contains("label: 'View public page'"));
    expect(manage, contains("label: 'Slab upgrade'"));
    expect(manage, contains("label: 'Remove copy'"));

    expect(network, contains('onLongPress: () => _showQuickActions(context)'));
    expect(network, contains('showVaultQuickActionSheet'));
    expect(network, contains("label: 'View collector Wall'"));
    expect(network, contains("label: 'Message collector'"));

    expect(publicCollector, contains('onLongPress: showQuickActions'));
    expect(publicCollector, contains('showVaultQuickActionSheet'));
    expect(publicCollector, contains("label: 'Share link'"));
    expect(publicCollector, contains("label: 'Message'"));
  });
}
