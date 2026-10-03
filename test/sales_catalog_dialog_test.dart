import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/screens/sales/sales_catalog_dialog.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService, open;

class CatalogService extends FakeSalesService {
  Map<String, dynamic>? draft;
  bool loseCatalogReply = false;
  int created = 0;
  final submits = <Map<String, dynamic>>[];
  final changes = StreamController<void>.broadcast();
  @override
  Stream<void> get accountChanges => changes.stream;
  @override
  Future<Map<String, dynamic>?> pendingCatalogAdd() async => draft;
  @override
  Future<void> stageCatalogAdd(Map<String, dynamic> request) async {
    draft = request;
  }

  @override
  Future<void> clearCatalogAdd(String requestId) async {
    draft = null;
  }

  @override
  Future<List<CardPrint>> searchCatalog(String query, String game) async => [
    CardPrint(
      id: 'canonical',
      name: 'Catalog Charizard',
      gvId: 'GV-PK-TEST-001',
      setCode: 'TEST',
    ),
  ];
  @override
  Future<List<Map<String, dynamic>>> catalogPrintings(String cardId) async => [
    {
      'id': 'printing',
      'card_print_id': cardId,
      'finish_label': 'Holo',
      'printing_gv_id': 'GV-PK-TEST-001-HOLO',
    },
  ];
  @override
  Future<Map<String, dynamic>> completeCatalogAdd(
    Map<String, dynamic> request,
  ) async {
    submits.add(request);
    if (created == 0) created++;
    if (loseCatalogReply && submits.length == 1) throw StateError('lost reply');
    return {
      'requestId': request['id'],
      'instanceId': 'created-copy',
      'gvviId': 'GVVI-NEW-000001',
      'cardId': 'canonical',
      'printingId': 'printing',
    };
  }
}

void main() {
  testWidgets(
    'catalog search requires a printing; lost reply reopens and recovers the same copy into cart',
    (tester) async {
      final service = CatalogService()..loseCatalogReply = true;
      addTearDown(service.changes.close);
      await open(tester, service, const Size(1194, 834));
      await tester.tap(find.text('Search catalog & add a card'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Name, card number or GV-ID'),
        'Charizard',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Catalog Charizard'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Add copy to Vault & cart'),
            )
            .onPressed,
        isNull,
      );
      await tester.tap(find.descendant(of: find.byType(SalesCatalogDialog), matching: find.byType(DropdownButtonFormField<String>)).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Holo · GV-PK-TEST-001-HOLO').last);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(TextField, 'Actual sale price (USD)'),
        150,
        scrollable: find.byType(Scrollable).last,
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Actual sale price (USD)'),
        '25',
      );
      await tester.tap(find.text('Add copy to Vault & cart'));
      await tester.pumpAndSettle();
      expect(service.created, 1);
      expect(service.draft, isNotNull);
      expect(find.text('Recover saved add'), findsOneWidget);
      await tester.tap(find.byTooltip('Close catalog'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Search catalog & add a card'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Recover saved add'));
      await tester.pumpAndSettle();
      expect(service.submits, hasLength(2));
      expect(service.submits[0], service.submits[1]);
      expect(service.created, 1);
      expect(service.draft, isNull);
      expect(find.byType(SalesCatalogDialog), findsNothing);
      expect(find.text('Catalog Charizard'), findsWidgets);
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'changing account dismisses catalog and hides pending customer/card data',
    (tester) async {
      final service = CatalogService();
      addTearDown(service.changes.close);
      await open(tester, service, const Size(768, 1024));
      await tester.tap(find.text('Search catalog & add a card'));
      await tester.pumpAndSettle();
      service.changes.add(null);
      await tester.pumpAndSettle();
      expect(find.byType(SalesCatalogDialog), findsNothing);
      expect(
        find.text('Your account changed. Close and reopen the sales desk.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
