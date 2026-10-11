import '../integration_test/support/trade_controls.dart';
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_purchase_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/negotiated_draft.dart';
import 'package:grookai_vault/services/sales/negotiated_trade.dart';
import 'package:grookai_vault/services/sales/sales_payments.dart';
import 'sales_purchase_screen_test.dart'
    show PurchaseDeskFixture, copied, openPurchase, tapVisible;
import 'sales_purchase_drafts_test.dart' show samplePurchaseDraft;

const tradeDraftId = '11111111-1111-4111-8111-000000000090';
Map<String, dynamic> tradeDraft({int credit = 650, int outgoing = 1000}) => {
  ...newNegotiatedDraft(tradeDraftId, 'Sample shop'),
  'items': [
    {
      'instanceId': null,
      'description': 'Outgoing bundle',
      'quantity': 1,
      'unitMinor': outgoing,
    },
  ],
  'trades': [
    {
      'description': 'Incoming bundle',
      'quantity': 3,
      'creditMinor': credit,
      'valueMinor': null,
      'rateBps': null,
      'cardId': null,
      'printingId': null,
      'condition': null,
      'addToVault': false,
    },
  ],
};

class TradeDeskFixture extends PurchaseDeskFixture {
  bool tradeEnabled = true, rejected = false;
  int recoveries = 0, clears = 0;
  Map<String, dynamic>? committed;
  void seedTrade([Map<String, dynamic>? trade]) {
    final d = trade ?? tradeDraft();
    saved = {
      'version': 3,
      'revision': 0,
      'active': d['id'],
      'drafts': [
        blankSalesDraft('held-sale', 'Shop'),
        samplePurchaseDraft(),
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
    negotiatedTradesAvailable: tradeEnabled,
    rows: const [],
    storeName: 'Sample shop',
    customers: const [],
    pending: pending,
    localDrafts: corruptDraft ? null : copied(saved),
  );
  @override
  Map<String, dynamic> receipt(Map<String, dynamic> request) {
    final cart = request['cart'] as Map;
    final items = (cart['items'] as List)
        .map(
          (i) => {
            'description': i['description'],
            'quantity': i['quantity'],
            'unitMinor': i['unitMinor'],
            'lineMinor': i['quantity'] * i['unitMinor'],
          },
        )
        .toList();
    final subtotal = items.fold<int>(0, (n, i) => n + (i['lineMinor'] as int));
    final total = subtotal + (cart['taxMinor'] as int);
    final trades = negotiatedTradeTotals(
      (cart['trades'] as List)
          .asMap()
          .entries
          .map(
            (e) => {
              ...e.value as Map,
              'printingGvId': e.value['cardId'] == null
                  ? null
                  : 'GV-PK-TEST-001-HOLO',
              'instanceId': e.value['addToVault'] == true
                  ? '11111111-1111-4111-8111-${(100 + e.key).toString().padLeft(12, '0')}'
                  : null,
              'gvviId': e.value['addToVault'] == true
                  ? 'GVVI-TRADE-${e.key}'
                  : null,
            },
          )
          .toList(),
      true,
    );
    final balance = total - (trades['totalCreditMinor'] as int);
    return validateNegotiatedSaleReceipt({
      'version': 1,
      'id': request['id'],
      'number':
          'GV-20261008-${(request['id'] as String).substring(0, 8).toUpperCase()}',
      'createdAt': '2026-10-08T12:00:00.000Z',
      'storeName': cart['storeName'],
      'customerName': cart['customer']['name'],
      'method': cart['method'],
      'items': items,
      'subtotalMinor': subtotal,
      'discountMinor': 0,
      'taxMinor': cart['taxMinor'],
      'totalMinor': total,
      'note': cart['note'],
      'sourceDispositionId':
          (cart['items'] as List).any((i) => i['instanceId'] != null)
          ? '11111111-1111-4111-8111-000000000200'
          : null,
      'tradeIn': {'version': 2, ...trades, 'balanceMinor': balance},
      'payments': salesPaymentSnapshot(
        (cart['payments'] as List)
            .map((p) => Map<String, dynamic>.from(p as Map))
            .toList(),
        balance,
      ),
    });
  }

  Map<String, dynamic> bound() {
    final echoed = copied(committed!);
    if (badReply) echoed['cart']['note'] = 'Changed acknowledgement';
    return confirmedNegotiatedTrade(
      {
        'version': 1,
        'request': {'id': echoed['id'], 'cart': echoed['cart']},
        'receipt': recorded,
      },
      {'id': pending!['id'], 'cart': pending!['cart']},
    );
  }

  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    calls.add(copied(request));
    if (rejected) {
      throw const PostgrestException(
        message: 'fixture rejection',
        code: '22023',
      );
    }
    committed ??= copied(request);
    recorded ??= receipt(request);
    if (delayed != null) await delayed!.future;
    if (loseReply && calls.length == 1) throw StateError('lost response');
    return bound();
  }

  @override
  Future<Map<String, dynamic>?> recover(String requestId) async {
    recoveries++;
    return recorded == null ? null : bound();
  }

  @override
  Future<void> clearPending(String requestId) async {
    clears++;
    bound();
    pending = null;
  }
}

Future<void> cart(WidgetTester tester) async {
  final tab = find.textContaining('Cart (');
  if (tab.evaluate().isNotEmpty) await tapVisible(tester, tab);
}

Future<void> reopen(WidgetTester tester, TradeDeskFixture s) async {
  await tester.pumpWidget(const SizedBox());
  await tester.pumpAndSettle();
  await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: s)));
  await tester.pumpAndSettle();
}

Future<void> reviewTrade(WidgetTester tester) async {
  await cart(tester);
  await tapVisible(tester, find.text('Review & record trade'));
  expect(find.text('Record this trade?'), findsOneWidget);
  await tapVisible(tester, find.text('Exchange completed · Record trade'));
}

void main() {
  testWidgets(
    'device control helper returns from private details to lazy quick-add',
    (tester) async {
      final s = TradeDeskFixture()
        ..seedTrade(newNegotiatedDraft(tradeDraftId, 'Shop'));
      await openPurchase(tester, s);
      await cart(tester);
      Future<void> tap(Finder finder) async {
        await revealTradeControl(tester, finder);
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      await tap(find.text('Customer & receipt details'));
      final note = find.widgetWithText(TextField, 'Private trade note');
      await revealTradeControl(tester, note);
      await tester.enterText(note, 'PRIVATE DEVICE TRADE');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tap(find.text('Customer & receipt details'));
      await tap(find.text('Quick-add item'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Card / item name'),
        'Outgoing bundle',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Actual sale price (USD)'),
        '10.00',
      );
      await tap(find.text('Add to cart'));
      expect((s.saved['drafts'] as List).last['items'][0]['unitMinor'], 1000);
      expect((s.saved['drafts'] as List).last['note'], 'PRIVATE DEVICE TRADE');
      expect(s.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('back navigation waits for incoming-only held trade storage', (
    tester,
  ) async {
    final d = tradeDraft()..['items'] = [];
    final s = TradeDeskFixture()..seedTrade(d);
    addTearDown(s.changes.close);
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => SalesDeskScreen(service: s),
                ),
              ),
              child: const Text('Open desk'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open desk'));
    await tester.pumpAndSettle();
    s.draftFails = true;
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Trade desk'), findsOneWidget);
    expect(find.textContaining('Keep this desk open'), findsOneWidget);
    s.draftFails = false;
    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Open desk'), findsOneWidget);
    expect((s.saved['drafts'] as List).last['trades'][0]['creditMinor'], 650);
    expect(s.calls, isEmpty);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'canonical zero-credit intake keeps exact printing and no inventory write before confirmation',
    (tester) async {
      final d = tradeDraft()..['trades'] = [];
      final s = TradeDeskFixture()..seedTrade(d);
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Add trade-in'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Find incoming card'),
        'Charizard',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Catalog Charizard'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(
          TextField,
          'Agreed credit for this whole line (USD)',
        ),
        '0.00',
      );
      await tapVisible(tester, find.text('Add to trade'));
      expect(find.byType(SalesPurchaseDialog), findsOneWidget);
      final printing = find
          .descendant(
            of: find.byType(SalesPurchaseDialog),
            matching: find.byType(DropdownButtonFormField<String>),
          )
          .first;
      await tester.ensureVisible(printing);
      await tester.tap(printing);
      await tester.pumpAndSettle();
      await tester.tap(find.text('GV-PK-TEST-001-HOLO').last);
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Add this copy to my Vault'));
      await tapVisible(tester, find.text('Add to trade'));
      final incoming = (s.saved['drafts'] as List).last['trades'][0];
      expect(incoming['printingId'], '11111111-1111-4111-8111-000000000002');
      expect(incoming['condition'], 'NM');
      expect(incoming['quantity'], 1);
      expect(incoming['creditMinor'], 0);
      expect(incoming['addToVault'], true);
      expect(s.calls, isEmpty);
      expect(s.submits, isEmpty);
      await reviewTrade(tester);
      expect(find.text('Trade recorded'), findsOneWidget);
      expect(s.recorded!['tradeIn']['items'][0]['creditMinor'], 0);
      expect(s.recorded!['tradeIn']['items'][0]['instanceId'], isNotNull);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'quick outgoing edits persist and change balance without repricing incoming credit',
    (tester) async {
      final d = tradeDraft()..['items'] = [];
      final s = TradeDeskFixture()..seedTrade(d);
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Quick-add item'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Card / item name'),
        'Outgoing sleeves',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Actual sale price (USD)'),
        '4.00',
      );
      await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '2');
      await tapVisible(tester, find.text('Add to cart'));
      await reopen(tester, s);
      await cart(tester);
      expect(find.text('Checkout: 2 × USD 4.00'), findsOneWidget);
      final saved = (s.saved['drafts'] as List).last;
      expect(saved['items'][0]['unitMinor'], 400);
      expect(saved['trades'][0]['creditMinor'], 650);
      await reviewTrade(tester);
      expect(s.recorded!['tradeIn']['balanceMinor'], 150);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'disabled new trades preserve held agreement and allow switching to old sale',
    (tester) async {
      final s = TradeDeskFixture()
        ..seedTrade()
        ..tradeEnabled = false;
      final before = copied((s.saved['drafts'] as List).last as Map);
      await openPurchase(tester, s);
      await cart(tester);
      expect(find.textContaining('Your held trade is kept'), findsOneWidget);
      expect(
        tester
            .widget<OutlinedButton>(
              find.widgetWithText(OutlinedButton, 'Add trade-in'),
            )
            .onPressed,
        isNull,
      );
      await tester.tap(find.byTooltip('Held deals'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('0 sale lines · 0 trade lines'));
      await tester.pumpAndSettle();
      expect(find.text('Trade desk'), findsNothing);
      expect((s.saved['drafts'] as List).last, before);
      expect(s.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'new trade preserves Sale and Buy and whole-line credit through hold and restart',
    (tester) async {
      final s = TradeDeskFixture()..seed();
      final prior = copied(s.saved)['drafts'];
      await openPurchase(tester, s);
      await tester.tap(find.byTooltip('New trade'));
      await tester.pumpAndSettle();
      expect(find.text('Trade desk'), findsOneWidget);
      expect(find.text('Catalog'), findsNothing);
      await cart(tester);
      await tapVisible(tester, find.text('Add trade-in'));
      await tapVisible(tester, find.text('Quick trade'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Trade item description'),
        'Included bundle',
      );
      await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '3');
      await tester.enterText(
        find.widgetWithText(
          TextField,
          'Agreed credit for this whole line (USD)',
        ),
        '6.50',
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Add to trade'));
      expect(s.saved['version'], 3);
      expect((s.saved['drafts'] as List).take(2), prior);
      final incoming = (s.saved['drafts'] as List).last['trades'][0];
      expect(incoming['quantity'], 3);
      expect(incoming['creditMinor'], 650);
      expect(incoming['valueMinor'], isNull);
      await reopen(tester, s);
      await cart(tester);
      expect(find.text('Included bundle'), findsOneWidget);
      await tester.tap(find.byTooltip('Held deals'));
      await tester.pumpAndSettle();
      expect(find.text('Trade · 0 sale lines · 1 trade lines'), findsOneWidget);
      await tester.tap(find.text('0 sale lines · 0 trade lines'));
      await tester.pumpAndSettle();
      expect(find.text('Trade desk'), findsNothing);
      expect(s.saved['drafts'], hasLength(3));
      expect(s.calls, isEmpty);
      expect(s.submits, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  for (final size in [const Size(384, 854), const Size(1194, 834)]) {
    testWidgets(
      'customer view is opaque and hides private trade details at $size',
      (tester) async {
        final d = tradeDraft();
        d['note'] = 'Private desk memo';
        d['customer']['email'] = 'private@example.test';
        d['customer']['notes'] = 'Private contact note';
        d['trades'][0]['valueMinor'] = 1001;
        d['trades'][0]['rateBps'] = 6000;
        final s = TradeDeskFixture()..seedTrade(d);
        await openPurchase(tester, s, size: size);
        await cart(tester);
        await tapVisible(tester, find.text('Customer view'));
        final dialog = find.byType(AlertDialog);
        expect(ModalRoute.of(tester.element(dialog))!.barrierColor!.a, 1);
        for (final secret in [
          'Private',
          'private@example',
          '10.01',
          '60%',
          tradeDraftId,
        ]) {
          expect(
            find.descendant(of: dialog, matching: find.textContaining(secret)),
            findsNothing,
          );
        }
        expect(
          find.descendant(of: dialog, matching: find.textContaining('6.50')),
          findsOneWidget,
        );
        expect(find.text('You pay USD 3.50'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final credit in [0, 650, 1000, 1500]) {
    testWidgets(
      'trade records exact whole-line credit $credit and settles once',
      (tester) async {
        final s = TradeDeskFixture()..seedTrade(tradeDraft(credit: credit));
        await openPurchase(tester, s);
        await reviewTrade(tester);
        expect(find.text('Trade recorded'), findsOneWidget);
        expect(s.calls, hasLength(1));
        expect(s.pending!['cart']['version'], 5);
        expect(s.pending!['cart']['trades'][0]['creditMinor'], credit);
        expect(s.recorded!['tradeIn']['balanceMinor'], 1000 - credit);
        expect(s.recorded!['tradeIn']['totalValueMinor'], isNull);
        expect(
          s.pending!['cart']['payments'],
          credit == 1000 ? isEmpty : hasLength(1),
        );
        await tapVisible(tester, find.text('Continue to deals'));
        expect(s.pending, isNull);
        expect(s.clears, 1);
        expect(s.saved['drafts'], hasLength(2));
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets(
    'split cash change survives lost reply and feature-off restart without second completion',
    (tester) async {
      final d = tradeDraft();
      d['payments'] = [
        {'method': 'Cash', 'amountMinor': 150, 'tenderedMinor': 500},
        {
          'method': 'Card (external terminal)',
          'amountMinor': 200,
          'tenderedMinor': 200,
        },
      ];
      final s = TradeDeskFixture()
        ..seedTrade(d)
        ..loseReply = true;
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Review & record trade'));
      expect(find.text('Cash change: USD 3.50'), findsOneWidget);
      await tapVisible(tester, find.text('Exchange completed · Record trade'));
      final exact = jsonEncode(s.pending);
      expect(find.text('Trade recorded'), findsNothing);
      s.enabled = false;
      s.tradeEnabled = false;
      s.corruptDraft = true;
      await reopen(tester, s);
      expect(find.text('Trade recorded'), findsOneWidget);
      expect(jsonEncode(s.pending), exact);
      expect(s.calls, hasLength(1));
      expect(s.recoveries, 1);
      expect(s.recorded!['payments']['changeMinor'], 350);
      expect(tester.takeException(), isNull);
    },
  );
  for (final failure in ['storage', 'draft', 'rejected', 'mismatch']) {
    testWidgets('$failure cannot clear or replace the trade request', (
      tester,
    ) async {
      final s = TradeDeskFixture()..seedTrade();
      await openPurchase(tester, s);
      s.stageFails = failure == 'storage';
      s.draftFails = failure == 'draft';
      s.rejected = failure == 'rejected';
      s.badReply = failure == 'mismatch';
      await cart(tester);
      await tapVisible(tester, find.text('Review & record trade'));
      if (failure != 'draft') {
        await tapVisible(
          tester,
          find.text('Exchange completed · Record trade'),
        );
      }
      expect(find.text('Trade recorded'), findsNothing);
      expect(s.clears, 0);
      if (failure == 'storage' || failure == 'draft') {
        expect(s.calls, isEmpty);
        expect(s.pending, isNull);
      } else {
        final exact = jsonEncode(s.pending);
        await tapVisible(tester, find.text('Retry / recover this trade'));
        expect(s.calls, hasLength(2));
        expect(s.calls[0], s.calls[1]);
        expect(jsonEncode(s.pending), exact);
        expect(s.clears, 0);
      }
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets('invalid tax blocks switching and recording until corrected', (
    tester,
  ) async {
    final s = TradeDeskFixture()..seedTrade();
    await openPurchase(tester, s);
    await cart(tester);
    final tax = find.widgetWithText(TextField, 'Tax collected (USD)');
    await tester.ensureVisible(tax);
    await tester.enterText(tax, '1.234');
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Held deals'));
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsNothing);
    await tapVisible(tester, find.text('Review & record trade'));
    expect(find.text('Record this trade?'), findsNothing);
    expect(s.calls, isEmpty);
    await tester.ensureVisible(tax);
    await tester.enterText(tax, '0.00');
    await tester.pumpAndSettle();
    await reviewTrade(tester);
    expect(find.text('Trade recorded'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'sign-out during completion conceals the receipt and preserves request',
    (tester) async {
      final s = TradeDeskFixture()..seedTrade();
      s.delayed = Completer<Map<String, dynamic>>();
      await openPurchase(tester, s);
      await cart(tester);
      await tapVisible(tester, find.text('Review & record trade'));
      await tester.tap(find.text('Exchange completed · Record trade'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      s.changes.add(null);
      await tester.pump();
      s.delayed!.complete({});
      await tester.pumpAndSettle();
      expect(
        find.text('Your account changed. Close and reopen the sales desk.'),
        findsOneWidget,
      );
      expect(find.text('Trade recorded'), findsNothing);
      expect(s.pending, isNotNull);
      expect(s.clears, 0);
      expect(tester.takeException(), isNull);
    },
  );
}
