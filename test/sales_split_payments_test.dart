import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_payments.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/sales_report.dart';
import 'package:grookai_vault/screens/sales/sales_payment_editor.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService, open;

class SplitDeskService extends FakeSalesService {
  @override
  Future<SalesDeskData> load() async {
    final d = await super.load();
    return SalesDeskData(
      available: d.available,
      rows: d.rows,
      storeName: d.storeName,
      customers: d.customers,
      pending: pending,
      paymentsAvailable: true,
    );
  }

  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    final r = await super.complete(request);
    return {
      ...r,
      'payments': salesPaymentSnapshot(
        (request['cart']['payments'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
        r['totalMinor'] as int,
      ),
    };
  }
}

void main() {
  testWidgets(
    'native split checkout retains the exact v3 request after a lost reply',
    (tester) async {
      final service = SplitDeskService()..loseReply = true;
      await open(tester, service, const Size(1194, 834));
      await tester.tap(find.text('Add to sale'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Split payment / cash change'));
      await tester.tap(find.text('Split payment / cash change'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.widgetWithText(TextFormField, 'Amount applied (USD)'),
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Amount applied (USD)'),
        '4',
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Cash handed to you (USD)'),
        '5',
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Add payment method'));
      await tester.tap(find.text('Add payment method'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Review & record sale'),
        200,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('sales-cart-scroll')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tester.tap(find.text('Review & record sale'));
      await tester.pumpAndSettle();
      expect(find.text('Cash change: USD 1.00'), findsOneWidget);
      await tester.tap(find.text('Payment received · Record sale'));
      await tester.pumpAndSettle();
      expect(service.calls.single['cart']['version'], 3);
      expect(service.calls.single['cart']['method'], 'Split payment');
      expect(service.pending, isNotNull);
      await tester.ensureVisible(find.text('Retry / recover this sale'));
    await tester.pumpAndSettle();
      await tester.tap(find.text('Retry / recover this sale'));
      await tester.pumpAndSettle();
      expect(service.calls, hasLength(2));
      expect(service.calls[0], service.calls[1]);
      expect(find.text('Sale recorded'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  final vectors =
      jsonDecode(
            File('test/fixtures/sales/payment_vectors.json').readAsStringSync(),
          )
          as List;
  for (final v in vectors) {
    test('shared payment cents: ${v['name']}', () {
      Map<String, dynamic> compute() => salesPaymentSnapshot(
        (v['entries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
        v['balance'] as int,
      );
      if (v['valid'] == true) {
        expect(compute()['changeMinor'], v['change']);
      } else {
        expect(compute, throwsA(anything));
      }
    });
  }
  final entries = <Map<String, dynamic>>[
    {'method': 'Cash', 'amountMinor': 4000, 'tenderedMinor': 5000},
    {
      'method': 'Card (external terminal)',
      'amountMinor': 6000,
      'tenderedMinor': 6000,
    },
  ];
  test('held payment amounts survive draft reload', () {
    final d = blankSalesDraft('draft', 'Shop')..['payments'] = entries;
    final b = {
      'version': 1,
      'revision': 0,
      'active': 'draft',
      'drafts': [d],
    };
    expect(
      (readSalesDrafts(jsonEncode(b))['drafts'] as List).single['payments'],
      entries,
    );
  });
  test('receipt and reports retain allocation; change is not income', () {
    final r = <String, dynamic>{
      'id': 'receipt',
      'number': 'R1',
      'createdAt': '2026-10-06T12:00:00Z',
      'customerName': 'Buyer',
      'method': 'Split payment',
      'totalMinor': 10000,
      'subtotalMinor': 10000,
      'taxMinor': 0,
      'items': [
        {'description': 'Card', 'quantity': 1},
      ],
      'payments': salesPaymentSnapshot(entries, 10000),
    };
    final report = SalesReport(
      [r, r],
      start: DateTime.utc(2026, 10, 6),
      end: DateTime.utc(2026, 10, 7),
      method: 'Cash',
    );
    expect(report.transactions, 1);
    expect(report.payments, {'Cash': 4000, 'Card (external terminal)': 6000});
    expect(report.totalMinor, 10000);
    expect(report.csv(), contains('"50.00","10.00"'));
    expect(salesPaymentLines(r, (n) => '$n'), contains('Cash change: 1000'));
    expect(
      () => receiptTenders({
        ...r,
        'payments': {...(r['payments'] as Map), 'changeMinor': 0},
      }),
      throwsStateError,
    );
  });
  for (final width in [390.0, 1194.0]) {
    testWidgets('split editor works at width $width and recomputes change', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var current = <Map<String, dynamic>>[
        {'method': 'Cash', 'amountMinor': 10000, 'tenderedMinor': 10000},
      ];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: StatefulBuilder(
                builder: (context, setState) => SalesPaymentEditor(
                  entries: current,
                  balance: 10000,
                  disabled: false,
                  onChanged: (e) => setState(() => current = e),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Amount applied (USD)'),
        '40',
      );
      await tester.pump();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Cash handed to you (USD)'),
        '50',
      );
      await tester.pump();
      await tester.tap(find.text('Add payment method'));
      await tester.pump();
      expect(current, entries);
      expect(find.text('Give USD 10.00 cash change'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
