import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/vault/add_to_vault_sheet.dart';

void main() {
  testWidgets('open and confirm add to vault', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      return Scaffold(
        body: Center(
          child: ElevatedButton(
            onPressed: () => showAddToVaultSheet(context, cardId: 'x'),
            child: const Text('Open'),
          ),
        ),
      );
    })));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
  });
}

