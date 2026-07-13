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

  test('vault quick-action sheet is wired to both ownership call sites', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final manage = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
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
  });
}
