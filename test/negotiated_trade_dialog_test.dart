import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_purchase_dialog.dart';
import 'sales_purchase_screen_test.dart' show PurchaseDeskFixture, tapVisible;

void main() {
  testWidgets(
    'native agreed credit uses whole-line rounding and retains manual override',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1194, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final service = PurchaseDeskFixture();
      Map<String, dynamic>? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                child: const Text('Open trade'),
                onPressed: () async {
                  saved = await showDialog<Map<String, dynamic>>(
                    context: context,
                    builder: (_) => SalesPurchaseDialog(
                      service: service,
                      negotiated: true,
                      quick: true,
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open trade'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Trade item description'),
        'Incoming bundle',
      );
      await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '3');
      await tapVisible(tester, find.text('Calculate an offer · optional'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Reference value per item (USD)'),
        '10.01',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Trade percentage'),
        '60',
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Use suggested credit'));
      final agreed = find.widgetWithText(
        TextField,
        'Agreed credit for this whole line (USD)',
      );
      expect(tester.widget<TextField>(agreed).controller!.text, '18.02');
      await tester.enterText(agreed, '6.50');
      await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '2');
      await tester.enterText(
        find.widgetWithText(TextField, 'Reference value per item (USD)'),
        '20.00',
      );
      expect(tester.widget<TextField>(agreed).controller!.text, '6.50');
      await tapVisible(tester, find.text('Add to trade'));
      expect(saved, containsPair('creditMinor', 650));
      expect(saved, containsPair('quantity', 2));
      expect(saved, containsPair('valueMinor', 2000));
      expect(saved!.containsKey('unitMinor'), false);
      expect(service.calls, isEmpty);
      expect(service.submits, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpAndSettle();
    },
  );
  testWidgets(
    'native trade can agree zero without reference and reopen exact terms',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1194, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final service = PurchaseDeskFixture();
      final line = <String, dynamic>{
        'description': 'Included bundle',
        'quantity': 3,
        'creditMinor': 0,
        'valueMinor': null,
        'rateBps': null,
        'cardId': null,
        'printingId': null,
        'condition': null,
        'addToVault': false,
      };
      Map<String, dynamic>? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                child: const Text('Open trade'),
                onPressed: () async {
                  saved = await showDialog<Map<String, dynamic>>(
                    context: context,
                    builder: (_) => SalesPurchaseDialog(
                      service: service,
                      negotiated: true,
                      line: line,
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open trade'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(
              find.widgetWithText(
                TextField,
                'Agreed credit for this whole line (USD)',
              ),
            )
            .controller!
            .text,
        '0.00',
      );
      await tapVisible(tester, find.text('Save trade item'));
      expect(saved, line);
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpAndSettle();
    },
  );
}
