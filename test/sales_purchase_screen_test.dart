import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_purchase_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/purchase_drafts.dart';
import 'package:grookai_vault/services/sales/sales_payments.dart';
import 'package:grookai_vault/services/sales/sales_purchase.dart';
import 'sales_catalog_dialog_test.dart' show CatalogService;
import 'sales_purchase_drafts_test.dart'
    show samplePurchaseDraft, purchaseDraftId;

Map<String, dynamic> copied(Map value) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(value)) as Map);

class PurchaseDeskFixture extends CatalogService {
  bool enabled = true, stageFails = false, draftFails = false, badReply = false;
  bool corruptDraft = false;
  Completer<Map<String, dynamic>>? delayed;
  Map<String, dynamic>? recorded;
  Map<String, dynamic> saved = readSalesDrafts(null);
  void seed([Map<String, dynamic>? purchase]) {
    final buy = purchase ?? samplePurchaseDraft();
    saved = {
      'version': 2,
      'revision': 0,
      'active': buy['id'],
      'drafts': [blankSalesDraft('held-sale', 'Shop'), buy],
    };
  }

  @override
  Future<SalesDeskData> load() async => SalesDeskData(
    available: enabled,
    purchasesAvailable: enabled,
    rows: const [],
    storeName: 'Sample shop',
    customers: const [],
    pending: pending,
    localDrafts: corruptDraft ? null : copied(saved),
  );
  @override
  Future<void> saveDrafts(Map<String, dynamic> value) async {
    if (draftFails) throw StateError('fixture storage failure');
    saved = readSalesDrafts(jsonEncode(value));
  }

  @override
  Future<void> stage(Map<String, dynamic> request) async {
    if (stageFails) throw StateError('fixture stage failed');
    if (pending != null && jsonEncode(pending) != jsonEncode(request)) {
      throw StateError('changed retry');
    }
    pending = copied(request);
  }

  Map<String, dynamic> receipt(Map<String, dynamic> request) {
    final cart = request['cart'] as Map;
    final items = (cart['items'] as List)
        .map(
          (dynamic item) => {
            ...item as Map,
            'lineMinor': item['quantity'] * item['unitMinor'],
            'printingGvId': item['cardId'] == null ? null : 'governed-printing',
            'instanceId': item['addToVault'] == true
                ? '11111111-1111-4111-8111-000000000100'
                : null,
            'gvviId': item['addToVault'] == true ? 'GVVI-PURCHASE-1' : null,
          },
        )
        .toList();
    final total = items.fold<int>(
      0,
      (sum, item) => sum + item['lineMinor'] as int,
    );
    final entries = (cart['payments'] as List)
        .map((dynamic e) => Map<String, dynamic>.from(e as Map))
        .toList();
    return validatePurchaseReceipt({
      'version': 2,
      'kind': 'purchase',
      'id': request['id'],
      'number':
          'GVB-20261007-${(request['id'] as String).substring(0, 8).toUpperCase()}',
      'createdAt': '2026-10-07T12:00:00.000Z',
      'storeName': cart['storeName'],
      'customerName': cart['customer']['name'],
      'currency': 'USD',
      'items': items,
      'purchaseMinor': total,
      'method': salesPaymentMethod(entries),
      'payments': salesPaymentSnapshot(entries, -total),
      'note': cart['note'],
    });
  }

  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    calls.add(copied(request));
    recorded ??= receipt(request);
    if (delayed != null) return delayed!.future;
    if (loseReply && calls.length == 1) throw StateError('lost response');
    return badReply ? {...recorded!, 'purchaseMinor': 651} : recorded!;
  }

  @override
  Future<Map<String, dynamic>?> recover(String requestId) async =>
      badReply && recorded != null ? {...recorded!, 'kind': 'sale'} : recorded;
  @override
  Future<List<CardPrint>> searchCatalog(String query, String game) async => [
    CardPrint(
      id: '11111111-1111-4111-8111-000000000001',
      name: 'Catalog Charizard',
      gvId: 'GV-PK-TEST-001',
      setCode: 'TEST',
    ),
  ];
  @override
  Future<List<Map<String, dynamic>>> catalogPrintings(String cardId) async => [
    {
      'id': '11111111-1111-4111-8111-000000000002',
      'card_print_id': cardId,
      'finish_label': 'Holo',
      'printing_gv_id': 'GV-PK-TEST-001-HOLO',
    },
  ];
}

Future<void> openPurchase(
  WidgetTester tester,
  PurchaseDeskFixture service, {
  Size size = const Size(430, 932),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(service.changes.close);
  await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: service)));
  await tester.pumpAndSettle();
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      250,
      scrollable: find
          .descendant(
            of: find.byType(ListView).first,
            matching: find.byType(Scrollable),
          )
          .first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> reviewPurchase(WidgetTester tester) async {
  await tapVisible(tester, find.text('Review purchase'));
  expect(find.text('Record this purchase?'), findsOneWidget);
  await tapVisible(tester, find.text('Exchange completed · Record purchase'));
}

void main() {
  testWidgets(
    'new buy and quick offer preserve the held sale through reopen and switch',
    (tester) async {
      final s = PurchaseDeskFixture();
      await openPurchase(tester, s);
      await tester.tap(find.byTooltip('New buy'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Quick purchase'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Purchase item description'),
        'Bulk bundle',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Agreed price per item (USD)'),
        '6.50',
      );
      await tapVisible(tester, find.text('Add to purchase'));
      expect(s.saved['drafts'], hasLength(2));
      expect(s.saved['version'], 2);
      expect(s.calls, isEmpty);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpAndSettle();
      await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: s)));
      await tester.pumpAndSettle();
      expect(find.text('Bulk bundle'), findsOneWidget);
      await tester.tap(find.byTooltip('Held deals'));
      await tester.pumpAndSettle();
      expect(find.text('Buy · 1 incoming lines · USD 6.50'), findsOneWidget);
      await tester.tap(find.text('0 sale lines · 0 trade lines'));
      await tester.pumpAndSettle();
      expect(find.text('Your purchase'), findsNothing);
      expect(s.saved['drafts'], hasLength(2));
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('seller view excludes contacts, notes and reference evidence', (
    tester,
  ) async {
    final s = PurchaseDeskFixture();
    final draft = samplePurchaseDraft();
    s.seed({
      ...draft,
      'note': 'Private purchase memo',
      'customer': {
        ...draft['customer'] as Map,
        'name': 'Private seller',
        'email': 'private@example.test',
      },
    });
    await openPurchase(tester, s);
    await tester.tap(find.text('Seller view'));
    await tester.pumpAndSettle();
    final dialog = find.byType(AlertDialog);
    expect(ModalRoute.of(tester.element(dialog))!.barrierColor!.a, 1.0);
    expect(
      find.descendant(of: dialog, matching: find.textContaining('6.50')),
      findsWidgets,
    );
    for (final text in [
      'Private purchase memo',
      'Private seller',
      'private@example.test',
      'Reference',
    ]) {
      expect(
        find.descendant(of: dialog, matching: find.textContaining(text)),
        findsNothing,
      );
    }
    expect(s.calls, isEmpty);
  });
  testWidgets(
    'lost reply reopens with features off and preserves the exact request',
    (tester) async {
      final s = PurchaseDeskFixture()
        ..seed()
        ..loseReply = true;
      await openPurchase(tester, s);
      await reviewPurchase(tester);
      expect(
        find.textContaining('Purchase status is unconfirmed.'),
        findsOneWidget,
      );
      final sent = copied(s.pending!);
      s.enabled = false;
      await tester.pumpWidget(const SizedBox());
      await tester.pumpAndSettle();
      await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: s)));
      await tester.pumpAndSettle();
      expect(find.text('Purchase recorded'), findsOneWidget);
      expect(s.calls, hasLength(1));
      expect(s.pending, sent);
      expect(find.textContaining('Email receipt'), findsNothing);
      await tapVisible(tester, find.text('Continue to deals'));
      expect(s.pending, isNull);
      expect((s.saved['drafts'] as List).single['id'], 'held-sale');
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'failed local staging makes no completion call; retry uses original request',
    (tester) async {
      final s = PurchaseDeskFixture()
        ..seed()
        ..stageFails = true;
      await openPurchase(tester, s);
      await reviewPurchase(tester);
      expect(s.calls, isEmpty);
      expect(s.pending, isNull);
      s.stageFails = false;
      await tapVisible(tester, find.text('Recover this purchase'));
      expect(s.calls, hasLength(1));
      expect(find.text('Purchase recorded'), findsOneWidget);
    },
  );
  testWidgets('unbound acknowledgement leaves pending locked across reload', (
    tester,
  ) async {
    final s = PurchaseDeskFixture()
      ..seed()
      ..badReply = true;
    await openPurchase(tester, s);
    await reviewPurchase(tester);
    final pending = copied(s.pending!);
    expect(find.text('Purchase recorded'), findsNothing);
    expect(
      tester
          .widget<IconButton>(
            find
                .ancestor(
                  of: find.byTooltip('Held deals'),
                  matching: find.byType(IconButton),
                )
                .first,
          )
          .onPressed,
      isNull,
    );
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
    await tester.pumpWidget(MaterialApp(home: SalesDeskScreen(service: s)));
    await tester.pumpAndSettle();
    expect(find.text('Purchase recorded'), findsNothing);
    expect(s.pending, pending);
    s.badReply = false;
    await tapVisible(tester, find.text('Recover this purchase'));
    expect(find.text('Purchase recorded'), findsOneWidget);
    expect(s.calls[0], s.calls[1]);
  });
  testWidgets('corrupt unrelated drafts do not block bound pending recovery', (
    tester,
  ) async {
    final s = PurchaseDeskFixture()
      ..seed()
      ..corruptDraft = true;
    s.pending = {
      ...purchaseDraftRequest(
        samplePurchaseDraft(),
        newSaleId(),
        confirmed: true,
      ),
      'draftId': purchaseDraftId,
    };
    s.recorded = s.receipt(s.pending!);
    s.enabled = false;
    await openPurchase(tester, s);
    expect(find.text('Purchase recorded'), findsOneWidget);
    expect(s.calls, isEmpty);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'account change hides private offer and rejects a late UI response',
    (tester) async {
      final s = PurchaseDeskFixture()
        ..seed()
        ..delayed = Completer<Map<String, dynamic>>();
      await openPurchase(tester, s);
      await tapVisible(tester, find.text('Review purchase'));
      await tester.tap(find.text('Exchange completed · Record purchase'));
      await tester.pump();
      await tester.pump();
      expect(s.calls, hasLength(1));
      s.changes.add(null);
      await tester.pump();
      s.delayed!.complete(s.recorded!);
      await tester.pumpAndSettle();
      expect(find.textContaining('Your account changed.'), findsOneWidget);
      expect(find.text('Quick card'), findsNothing);
      expect(find.text('Purchase recorded'), findsNothing);
      expect(s.pending, isNotNull);
    },
  );
  testWidgets('failed draft save prevents confirmation and completion', (
    tester,
  ) async {
    final s = PurchaseDeskFixture()..seed();
    await openPurchase(tester, s);
    s.draftFails = true;
    await tapVisible(tester, find.text('Review purchase'));
    expect(find.text('Record this purchase?'), findsNothing);
    expect(s.calls, isEmpty);
    expect(s.pending, isNull);
  });
  testWidgets(
    'canonical incoming line requires printing and explicit intake without an early writer',
    (tester) async {
      final s = PurchaseDeskFixture()
        ..seed(blankPurchaseDraft(purchaseDraftId, 'Shop'));
      await openPurchase(tester, s, size: const Size(1194, 834));
      await tester.tap(find.text('Find incoming card'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Find incoming card'),
        'Charizard',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Catalog Charizard'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Agreed price per item (USD)'),
        '0.00',
      );
      await tapVisible(tester, find.text('Add to purchase'));
      expect(find.byType(SalesPurchaseDialog), findsOneWidget);
      final printing = find
          .descendant(
            of: find.byType(SalesPurchaseDialog),
            matching: find.byType(DropdownButtonFormField<String>),
          )
          .first;
      await tester.tap(printing);
      await tester.pumpAndSettle();
      await tester.tap(find.text('GV-PK-TEST-001-HOLO').last);
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Add this copy to my Vault'));
      await tapVisible(tester, find.text('Add to purchase'));
      final active = (s.saved['drafts'] as List).firstWhere(
        (dynamic d) => d['id'] == purchaseDraftId,
      );
      expect(active['items'][0]['addToVault'], true);
      expect(active['items'][0]['unitMinor'], 0);
      expect(s.calls, isEmpty);
      expect(s.submits, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
}
