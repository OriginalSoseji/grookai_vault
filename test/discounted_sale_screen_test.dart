import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/discounted_draft.dart';
import 'package:grookai_vault/services/sales/discounted_sale.dart';
import 'package:grookai_vault/services/sales/negotiated_draft.dart';
import 'package:grookai_vault/services/sales/sales_payments.dart';
import 'sales_purchase_screen_test.dart'
    show PurchaseDeskFixture, copied, openPurchase, tapVisible;
import 'sales_purchase_drafts_test.dart' show samplePurchaseDraft;
import 'negotiated_trade_screen_test.dart' show cart;

const draftId = '11111111-1111-4111-8111-000000000096';
Map<String, dynamic> saleDraft() => {
  ...newDiscountedDraft(draftId, 'Sample shop'),
  'discountMinor': 200,
  'items': [
    {
      'instanceId': null,
      'description': 'Outgoing bundle',
      'quantity': 1,
      'unitMinor': 1000,
    },
  ],
};

class DiscountDeskFixture extends PurchaseDeskFixture {
  bool discountsEnabled = true, rejected = false, cancelFails = false;
  int cancellations = 0, clears = 0;
  Map<String, dynamic>? committed, cancelled;
  void seedDiscount([Map<String, dynamic>? draft]) {
    final d = draft ?? saleDraft();
    saved = {
      'version': 4,
      'revision': 0,
      'active': d['id'],
      'drafts': [
        blankSalesDraft('held-sale', 'Shop'),
        samplePurchaseDraft(),
        newNegotiatedDraft('33333333-3333-4333-8333-333333333333', 'Shop'),
        d,
      ],
    };
  }

  @override
  Future<SalesDeskData> load() async => SalesDeskData(
    available: enabled,
    purchasesAvailable: enabled,
    tradesAvailable: enabled,
    paymentsAvailable: enabled,
    negotiatedTradesAvailable: enabled,
    discountsAvailable: discountsEnabled,
    rows: const [],
    storeName: 'Sample shop',
    customers: const [],
    pending: pending,
    localDrafts: corruptDraft ? null : copied(saved),
  );
  @override
  Map<String, dynamic> receipt(Map<String, dynamic> request) {
    final c = request['cart'] as Map,
        items = (c['items'] as List)
            .map(
              (i) => {
                'description': i['description'],
                'quantity': i['quantity'],
                'unitMinor': i['unitMinor'],
                'lineMinor': i['quantity'] * i['unitMinor'],
              },
            )
            .toList();
    final subtotal = items.fold<int>(0, (n, i) => n + (i['lineMinor'] as int)),
        total = subtotal - (c['discountMinor'] as int) + (c['taxMinor'] as int);
    return validateDiscountedSaleReceipt({
      'version': 1,
      'id': request['id'],
      'number':
          'GV-20261008-${(request['id'] as String).substring(0, 8).toUpperCase()}',
      'createdAt': '2026-10-08T12:00:00.000Z',
      'storeName': c['storeName'],
      'customerName': c['customer']['name'],
      'method': c['method'],
      'items': items,
      'subtotalMinor': subtotal,
      'discountMinor': c['discountMinor'],
      'taxMinor': c['taxMinor'],
      'totalMinor': total,
      'note': c['note'],
      'sourceDispositionId': null,
      'payments': salesPaymentSnapshot(
        (c['payments'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
        total,
      ),
    });
  }

  Map<String, dynamic> bound() => confirmedDiscountedSale(
    {
      'version': 1,
      'request': {'id': committed!['id'], 'cart': committed!['cart']},
      'receipt': recorded,
    },
    {'id': pending!['id'], 'cart': pending!['cart']},
  );
  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    calls.add(copied(request));
    if (rejected) {
      throw const PostgrestException(
        message: 'Stock unavailable',
        code: 'PT409',
      );
    }
    committed ??= copied(request);
    recorded ??= receipt(request);
    if (loseReply && calls.length == 1) throw StateError('Lost reply');
    return bound();
  }

  @override
  Future<Map<String, dynamic>?> recover(String id) async =>
      cancelled ?? (recorded == null ? null : bound());
  @override
  Future<Map<String, dynamic>> cancelDiscounted(String id) async {
    cancellations++;
    if (cancelFails) throw StateError('Lost cancellation reply');
    if (recorded != null) return bound();
    cancelled = confirmedDiscountedSaleCancellation(
      {
        'version': 1,
        'status': 'cancelled',
        'request': {'id': pending!['id'], 'cart': pending!['cart']},
      },
      {'id': pending!['id'], 'cart': pending!['cart']},
    );
    return cancelled!;
  }

  @override
  Future<void> clearPending(String id) async {
    clears++;
    if (cancelled != null) {
      confirmedDiscountedSaleCancellation(cancelled, {
        'id': pending!['id'],
        'cart': pending!['cart'],
      });
    } else {
      bound();
    }
    pending = null;
  }
}

Future<void> reopenDiscount(WidgetTester tester, DiscountDeskFixture s) async {
  await tester.pumpWidget(const SizedBox());
  await tester.pumpAndSettle();
  await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: s)));
  await tester.pumpAndSettle();
}

Future<void> reviewDiscount(WidgetTester tester) async {
  await cart(tester);
  await tapVisible(tester, find.text('Review & record sale'));
  expect(find.text('Record discounted sale?'), findsOneWidget);
  await tapVisible(tester, find.text('Exchange completed · Record sale'));
}

void main() {
  testWidgets(
    'explicit discount conversion keeps old held kinds and new version at zero',
    (tester) async {
      final d = {
        ...blankSalesDraft(draftId, 'Sample shop'),
        'items': saleDraft()['items'],
      };
      final s = DiscountDeskFixture()..seedDiscount(d);
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Add discount'));
      expect(s.saved['version'], 4);
      expect((s.saved['drafts'] as List).length, 4);
      expect((s.saved['drafts'] as List).last['kind'], 'discounted-sale');
      expect((s.saved['drafts'] as List).last['discountMinor'], 0);
      await reopenDiscount(tester, s);
      await cart(tester);
      expect(find.text('Add trade-in'), findsNothing);
      await tapVisible(tester, find.text('Review & record sale'));
      expect(find.text('Record discounted sale?'), findsOneWidget);
      await tapVisible(tester, find.text('Back'));
      expect(s.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'discount edits preserve entered split and require renewed reconciliation',
    (tester) async {
      final d = saleDraft()
        ..['payments'] = [
          {'method': 'Cash', 'amountMinor': 800, 'tenderedMinor': 1000},
        ];
      final s = DiscountDeskFixture()..seedDiscount(d);
      await openPurchase(tester, s);
      await cart(tester);
      final field = find.widgetWithText(TextField, 'Sale discount (USD)');
      await tester.ensureVisible(field);
      await tester.enterText(field, '3.00');
      await tester.pumpAndSettle();
      expect((s.saved['drafts'] as List).last['discountMinor'], 300);
      expect((s.saved['drafts'] as List).last['payments'], d['payments']);
      await tapVisible(tester, find.text('Review & record sale'));
      expect(find.text('Record discounted sale?'), findsNothing);
      expect(s.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'customer preview contains discount and excludes private notes and contacts',
    (tester) async {
      final d = saleDraft()..['note'] = 'PRIVATE_NOTE';
      d['customer'] = {
        'name': 'PRIVATE_NAME',
        'email': 'private@example.invalid',
        'phone': '',
        'wants': 'PRIVATE_WANTS',
        'notes': 'PRIVATE_CONTEXT',
      };
      final s = DiscountDeskFixture()..seedDiscount(d);
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Customer view'));
      final dialog = find.byType(AlertDialog);
      expect(
        find.descendant(
          of: dialog,
          matching: find.text('Discount: − USD 2.00'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: dialog, matching: find.text('You pay USD 8.00')),
        findsOneWidget,
      );
      for (final value in [
        'PRIVATE_NOTE',
        'PRIVATE_NAME',
        'private@example.invalid',
        'PRIVATE_WANTS',
        'PRIVATE_CONTEXT',
      ]) {
        expect(
          find.descendant(of: dialog, matching: find.textContaining(value)),
          findsNothing,
        );
      }
      expect(s.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('explicit review records v6 and exact discounted settlement', (
    tester,
  ) async {
    final s = DiscountDeskFixture()..seedDiscount();
    await openPurchase(tester, s);
    await reviewDiscount(tester);
    expect(
      s.calls,
      predicate(
        (List calls) =>
            calls.length == 1 && calls.first['cart']['version'] == 6,
      ),
    );
    expect(s.recorded!['discountMinor'], 200);
    expect(s.recorded!['totalMinor'], 800);
    expect(find.text('Sale recorded'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'dropped reply recovers across reopen with entry off without duplicate',
    (tester) async {
      final s = DiscountDeskFixture()
        ..seedDiscount()
        ..loseReply = true;
      await openPurchase(tester, s);
      await reviewDiscount(tester);
      final before = jsonEncode(s.pending);
      expect(s.pending, isNotNull);
      s.enabled = false;
      s.discountsEnabled = false;
      await reopenDiscount(tester, s);
      await cart(tester);
      expect(find.text('Sale recorded'), findsOneWidget);
      expect(s.calls, hasLength(1));
      expect(jsonEncode(s.pending), before);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'stock rejection remains pending until durable cancellation saves the editable draft',
    (tester) async {
      final s = DiscountDeskFixture()
        ..seedDiscount()
        ..rejected = true;
      await openPurchase(tester, s);
      await reviewDiscount(tester);
      expect(s.pending, isNotNull);
      expect(s.clears, 0);
      final id = s.pending!['id'];
      await tapVisible(tester, find.text('Return to editing'));
      await tapVisible(tester, find.text('Confirm cancellation'));
      expect(s.cancellations, 1);
      expect(s.clears, 1);
      expect(s.pending, null);
      expect((s.saved['drafts'] as List).last['discountMinor'], 200);
      s.rejected = false;
      s.cancelled = null;
      await reviewDiscount(tester);
      expect(s.calls.last['id'], isNot(id));
      expect(s.recorded!['totalMinor'], 800);
      expect(tester.takeException(), isNull);
    },
  );
  for (final lostReply in [false, true]) {
    testWidgets(
      'failed draft save or lost cancellation reply retains pending: $lostReply',
      (tester) async {
        final s = DiscountDeskFixture()
          ..seedDiscount()
          ..rejected = true;
        await openPurchase(tester, s);
        await reviewDiscount(tester);
        final before = jsonEncode(s.pending);
        s.cancelFails = lostReply;
        s.draftFails = !lostReply;
        await tapVisible(tester, find.text('Return to editing'));
        await tapVisible(tester, find.text('Confirm cancellation'));
        expect(jsonEncode(s.pending), before);
        expect(s.clears, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('cancellation recovers completion that won the race', (
    tester,
  ) async {
    final s = DiscountDeskFixture()
      ..seedDiscount()
      ..loseReply = true;
    await openPurchase(tester, s);
    await reviewDiscount(tester);
    await tapVisible(tester, find.text('Return to editing'));
    await tapVisible(tester, find.text('Confirm cancellation'));
    expect(find.text('Sale recorded'), findsOneWidget);
    expect(s.clears, 0);
    expect(s.calls, hasLength(1));
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'discount greater than remaining items stays saved and blocks recording',
    (tester) async {
      final d = saleDraft()..['discountMinor'] = 1001;
      final s = DiscountDeskFixture()..seedDiscount(d);
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Review & record sale'));
      expect(s.calls, isEmpty);
      expect(find.text('Record discounted sale?'), findsNothing);
      expect((s.saved['drafts'] as List).last['discountMinor'], 1001);
      expect(tester.takeException(), isNull);
    },
  );
}
