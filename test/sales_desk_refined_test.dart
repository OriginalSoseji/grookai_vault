import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_trade_dialog.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService;
import 'sales_catalog_dialog_test.dart' show CatalogService;

class SlowDesk extends FakeSalesService {
  final inventory = Completer<List<VendorPricingWorkspaceRow>>();
  final book = Completer<Map<String, dynamic>>();
  @override
  Future<SalesDeskData> load() async => const SalesDeskData(
    available: true,
    rows: [],
    storeName: '',
    customers: [],
    needsHydration: true,
  );
  @override
  Future<List<VendorPricingWorkspaceRow>> loadInventory() => inventory.future;
  @override
  Future<Map<String, dynamic>> loadBook() => book.future;
}

class PagedTrades extends CatalogService {
  final offsets = <int>[];
  @override
  Future<SalesCatalogPage> searchCatalogPage(
    String query,
    String game, {
    int offset = 0,
  }) async {
    offsets.add(offset);
    return SalesCatalogPage(
      [
        CardPrint(
          id: 'card-$offset',
          name: 'Trade card $offset',
          gvId: 'GV-PK-TEST-00$offset',
          setCode: 'TEST',
        ),
      ],
      pagination: CardSearchPagination(
        total: 2,
        offset: offset,
        nextOffset: offset == 0 ? 1 : null,
      ),
    );
  }

  @override
  Future<List<CardPrint>> searchCatalog(String query, String game) =>
      throw StateError('Must not load every page');
}

class DraftDesk extends CatalogService {
  Map<String, dynamic> saved = readSalesDrafts(null);
  @override
  Future<SalesDeskData> load() async {
    final d = await super.load();
    return SalesDeskData(
      available: true,
      rows: d.rows,
      storeName: d.storeName,
      customers: d.customers,
      localDrafts: readSalesDrafts(jsonEncode(saved)),
      pending: pending,
    );
  }

  @override
  Future<void> saveDrafts(Map<String, dynamic> book) async {
    saved = readSalesDrafts(jsonEncode(book));
  }
}

void main() {
  test(
    'malformed and unsupported native drafts fail without replacing saved bytes',
    () {
      expect(
        () => readSalesDrafts('{"version":1,"revision":0,"drafts":[{}]}'),
        throwsStateError,
      );
      final d = blankSalesDraft(newSaleId(), 'Store');
      d['method'] = 'Invented method';
      expect(
        () => readSalesDrafts(
          jsonEncode({
            'version': 1,
            'revision': 0,
            'active': d['id'],
            'drafts': [d],
          }),
        ),
        throwsStateError,
      );
    },
  );
  testWidgets(
    'native held carts autosave, switch, and restore after reopening',
    (tester) async {
      final service = DraftDesk();
      addTearDown(service.changes.close);
      tester.view.physicalSize = const Size(1194, 834);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(home: SalesDeskScreen(service: service)),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add to sale'));
      await tester.pumpAndSettle();
      expect((service.saved['drafts'] as List).single['items'], hasLength(1));
      await tester.tap(find.byTooltip('Held deals'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('New deal'));
      await tester.pumpAndSettle();
      expect(service.saved['drafts'], hasLength(2));
      expect(find.text('Checkout: 1 × USD 12.34'), findsNothing);
      await tester.tap(find.byTooltip('Held deals'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('1 sale lines · 0 trade lines'));
      await tester.pumpAndSettle();
      expect(find.text('Checkout: 1 × USD 12.34'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpAndSettle();
      await tester.pumpWidget(
        MaterialApp(home: SalesDeskScreen(service: service)),
      );
      await tester.pumpAndSettle();
      expect(find.text('Checkout: 1 × USD 12.34'), findsOneWidget);
      await tester.ensureVisible(find.text('Customer view'));
      await tester.tap(find.text('Customer view'));
      await tester.pumpAndSettle();
      expect(find.text('You pay USD 12.34'), findsOneWidget);
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'quick entry is usable while stock/history load and after a stock failure',
    (tester) async {
      final service = SlowDesk();
      tester.view.physicalSize = const Size(1194, 834);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(home: SalesDeskScreen(service: service)),
      );
      await tester.pump();
      await tester.pump();
      final quick = find.widgetWithText(
        FilledButton,
        'Quick-add unlisted item',
      );
      expect(tester.widget<FilledButton>(quick).onPressed, isNotNull);
      expect(find.textContaining('Loading your stock'), findsOneWidget);
      service.inventory.completeError(StateError('synthetic outage'));
      service.book.complete({
        'storeName': 'Loaded shop',
        'customers': [],
        'receipts': [],
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('Stock could not load'), findsOneWidget);
      expect(tester.widget<FilledButton>(quick).onPressed, isNotNull);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'trade search shows first page without fetching the next; Load more is explicit',
    (tester) async {
      final service = PagedTrades();
      addTearDown(service.changes.close);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: SalesTradeDialog(service: service)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Search canonical card'),
        'Pikachu',
      );
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pumpAndSettle();
      expect(service.offsets, [0]);
      expect(find.text('Trade card 0'), findsOneWidget);
      await tester.ensureVisible(find.text('Load more'));
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      expect(service.offsets, [0, 1]);
      expect(find.text('Trade card 1'), findsOneWidget);
      expect(find.text('Load more'), findsNothing);
    },
  );
}
