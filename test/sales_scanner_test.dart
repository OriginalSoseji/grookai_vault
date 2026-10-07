import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_scanner_input.dart';
import 'package:grookai_vault/services/sales/sales_scanner.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService, open;

class ScanDesk extends FakeSalesService {
  int reads = 0;
  @override
  Future<VendorPricingWorkspaceRow?> loadScannedCopy(String id) async {
    reads++;
    final row = (await load()).rows.single;
    return row.gvviId == id ? row : null;
  }
}

void main() {
  for (final row
      in jsonDecode(File('test/fixtures/sales_scanner.json').readAsStringSync())
          as List) {
    test(
      'scanner payload: ${row['input']}',
      () => expect(scannedCopyId(row['input'] as String), row['expected']),
    );
  }
  test(
    'scanner payload bound',
    () => expect(scannedCopyId('x' * 1025), isNull),
  );
  testWidgets(
    'scanner adds the exact saved-price copy, rejects duplicates and unknown labels',
    (tester) async {
      final service = ScanDesk();
      await open(tester, service, const Size(1194, 1000));
      await tester.tap(find.text('Scan cards'));
      await tester.pumpAndSettle();
      final input = find.widgetWithText(TextField, 'Scanner input');
      Future<void> scan(String value) async {
        await tester.enterText(input, value);
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pumpAndSettle();
      }

      await scan('https://grookaivault.com/q/GVVI-FIXTURE-000001');
      expect(find.textContaining('Pikachu added · \$12.34'), findsOneWidget);
      await scan('GVVI-FIXTURE-000001');
      expect(find.text('Pikachu is already in this cart.'), findsOneWidget);
      await scan('GVVI-FIXTURE-000099');
      expect(
        find.textContaining('not in your active inventory'),
        findsOneWidget,
      );
      await scan('GV-PK-FIXTURE-001');
      expect(service.reads, 3);
      expect(service.calls, isEmpty); // Scanning is not completing a sale.
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'rapid scans serialize and Stop cancels queued work and late results',
    (tester) async {
      final first = Completer<String>();
      final reads = <String>[];
      var pending = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SalesScannerInput(
              disabled: false,
              target: 'owner:deal',
              pending: (v) => pending += v,
              add: (id, current) async {
                reads.add(id);
                final value = await first.future;
                return current() ? value : 'cancelled';
              },
            ),
          ),
        ),
      );
      await tester.tap(find.text('Scan cards'));
      await tester.pump();
      final input = find.widgetWithText(TextField, 'Scanner input');
      for (final id in ['GVVI-FIXTURE-000001', 'GVVI-FIXTURE-000002']) {
        await tester.enterText(input, id);
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pump();
      }
      expect(reads.length, 1);
      expect(pending, 2);
      await tester.tap(find.text('Stop scanning'));
      await tester.pump();
      first.complete('must not display');
      await tester.pumpAndSettle();
      expect(reads.length, 1);
      expect(pending, 0);
      expect(find.text('must not display'), findsNothing);
    },
  );

  testWidgets(
    'temporary disable cancels a lookup even after scanning restarts',
    (tester) async {
      final response = Completer<String>();
      var accepted = false, disabled = false, pending = 0;
      late StateSetter rebuild;
      await tester.pumpWidget(
        MaterialApp(
          home: StatefulBuilder(
            builder: (context, update) {
              rebuild = update;
              return Scaffold(
                body: SalesScannerInput(
                  disabled: disabled,
                  target: 'owner:deal',
                  pending: (v) => pending += v,
                  add: (id, current) async {
                    await response.future;
                    accepted = current();
                    return 'stale result';
                  },
                ),
              );
            },
          ),
        ),
      );
      await tester.tap(find.text('Scan cards'));
      await tester.pump();
      await tester.enterText(
        find.widgetWithText(TextField, 'Scanner input'),
        'GVVI-FIXTURE-000001',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
      expect(pending, 1);
      rebuild(() => disabled = true);
      await tester.pump();
      rebuild(() => disabled = false);
      await tester.pump();
      expect(find.text('Scan cards'), findsOneWidget);
      await tester.tap(find.text('Scan cards'));
      await tester.pump();
      response.complete('late');
      await tester.pumpAndSettle();
      expect(accepted, isFalse);
      expect(pending, 0);
      expect(find.text('stale result'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
