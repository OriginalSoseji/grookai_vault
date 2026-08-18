import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';

void main() {
  test('market comparison is exact, deterministic, and triage ordered', () {
    final below = _row(instanceId: 'below', askingPrice: 15, marketPrice: 20);
    final above = _row(instanceId: 'above', askingPrice: 24, marketPrice: 20);
    final unpriced = _row(instanceId: 'unpriced', marketPrice: 20);
    final noMarket = _row(instanceId: 'no-market', askingPrice: 12);

    expect(below.marketPosition, VendorMarketPosition.below);
    expect(below.varianceAmount, -5);
    expect(below.variancePercent, -25);
    expect(above.marketPosition, VendorMarketPosition.above);
    expect(unpriced.marketPosition, VendorMarketPosition.unpriced);
    expect(noMarket.marketPosition, VendorMarketPosition.noExactMarket);

    final rows = [noMarket, unpriced, above, below]
      ..sort(compareVendorWorkspaceRows);
    expect(rows.map((row) => row.instanceId), [
      'below',
      'above',
      'unpriced',
      'no-market',
    ]);
  });

  testWidgets('Vendor Mode edits an exact copy without leaving the screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 3600);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [
          _row(
            instanceId: 'copy-1',
            gvviId: 'GVVI-ONE',
            name: 'Charizard ex',
            askingPrice: 15,
            marketPrice: 20,
            intent: 'sell',
          ),
          _row(
            instanceId: 'copy-2',
            gvviId: 'GVVI-TWO',
            name: 'Pikachu',
            marketPrice: 10,
          ),
        ],
        sections: const [
          VendorWorkspaceSection(id: 'sir', name: 'High-end SIR', position: 0),
        ],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(home: VendorPricingWorkspaceScreen(service: service)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Vendor Mode'), findsOneWidget);
    expect(find.text('2 exact copies'), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-1')), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsOneWidget);
    expect(find.textContaining('25% below market'), findsOneWidget);

    final printingField = find.byKey(const Key('vendor_printing_copy-2')).last;
    await tester.ensureVisible(printingField);
    await tester.tap(printingField);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reverse Holo').last);
    await tester.pumpAndSettle();
    expect(service.printingSaves, [('copy-2', 'printing-reverse-copy-2')]);

    await tester.tap(find.byKey(const Key('vendor_filter_belowMarket')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('vendor_row_copy-1')), findsOneWidget);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsNothing);

    await tester.tap(find.byKey(const Key('vendor_filter_all')));
    await tester.pumpAndSettle();
    final priceField = find.byKey(const Key('vendor_price_copy-2')).last;
    await tester.ensureVisible(priceField);
    await tester.enterText(priceField, '9.00');
    await tester.pump(const Duration(milliseconds: 950));
    await tester.pumpAndSettle();

    expect(service.priceSaves, [('copy-2', 9.0)]);
    expect(
      tester
          .widget<Checkbox>(find.byKey(const Key('vendor_wall_copy-2')))
          .value,
      isTrue,
    );

    final conditionField = find
        .byKey(const Key('vendor_condition_copy-2'))
        .last;
    await tester.ensureVisible(conditionField);
    await tester.tap(conditionField);
    await tester.pumpAndSettle();
    await tester.tap(find.text('LP').last);
    await tester.pumpAndSettle();
    expect(service.conditionSaves, [('copy-2', 'LP')]);

    final sectionsButton = find.byKey(const Key('vendor_sections_copy-2')).last;
    await tester.ensureVisible(sectionsButton);
    await tester.pumpAndSettle();
    await tester.tap(sectionsButton);
    await tester.pumpAndSettle();
    await tester.tap(find.text('High-end SIR'));
    await tester.pumpAndSettle();
    expect(service.sectionSaves, [('copy-2', 'sir', true)]);
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();

    final soldDismissible = find.byKey(const Key('vendor_dismiss_copy-1'));
    await tester.ensureVisible(soldDismissible);
    await tester.drag(soldDismissible, const Offset(700, 0));
    await tester.pumpAndSettle();
    expect(find.text('Sold'), findsOneWidget);
    expect(find.text('Traded'), findsOneWidget);
    expect(
      tester
          .widget<TextField>(
            find.byKey(const Key('vendor_disposition_sale_price')),
          )
          .controller!
          .text,
      '15.00',
    );
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_counterparty')),
      'Local collector',
    );
    await tester.tap(find.byKey(const Key('vendor_disposition_record')));
    await tester.pumpAndSettle();
    expect(service.dispositions.single.$1, 'copy-1');
    expect(
      service.dispositions.single.$2.disposition,
      VendorCopyDisposition.sold,
    );
    expect(service.dispositions.single.$2.salePrice, 15);
    expect(service.dispositions.single.$2.counterparty, 'Local collector');
    expect(find.byKey(const Key('vendor_row_copy-1')), findsNothing);
    expect(find.text('1 exact copy'), findsOneWidget);

    final dismissible = find.byKey(const Key('vendor_dismiss_copy-2'));
    await tester.ensureVisible(dismissible);
    await tester.drag(dismissible, const Offset(-700, 0));
    await tester.pumpAndSettle();
    expect(find.text('Remove this copy?'), findsOneWidget);
    expect(
      find.textContaining(
        'Pikachu\nGVVI-TWO\n\nThis archives only this exact copy.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Remove from Vault'));
    await tester.pumpAndSettle();
    expect(service.archivedCopies, ['copy-2']);
    expect(find.byKey(const Key('vendor_row_copy-2')), findsNothing);
    expect(find.text('No vendor inventory yet'), findsOneWidget);
  });

  testWidgets('trade records received items and a cash adjustment', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 3000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final service = _FakeVendorService(
      VendorPricingWorkspaceData(
        rows: [_row(instanceId: 'trade-copy', name: 'Trade card')],
        sections: const [],
      ),
    );
    await tester.pumpWidget(
      MaterialApp(home: VendorPricingWorkspaceScreen(service: service)),
    );
    await tester.pumpAndSettle();

    final dismissible = find.byKey(const Key('vendor_dismiss_trade-copy'));
    await tester.drag(dismissible, const Offset(700, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Traded'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_counterparty')),
      '@PokeJavi',
    );
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_trade_received')),
      'Two vintage cards',
    );
    final cashMode = find.byKey(
      const Key('vendor_disposition_trade_cash_mode'),
    );
    await tester.ensureVisible(cashMode);
    await tester.tap(cashMode);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cash received').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('vendor_disposition_trade_cash_amount')),
      '25.00',
    );
    await tester.ensureVisible(
      find.byKey(const Key('vendor_disposition_record')),
    );
    await tester.tap(find.byKey(const Key('vendor_disposition_record')));
    await tester.pumpAndSettle();

    final submission = service.dispositions.single.$2;
    expect(submission.disposition, VendorCopyDisposition.traded);
    expect(submission.counterparty, '@PokeJavi');
    expect(submission.tradeReceived, 'Two vintage cards');
    expect(submission.tradeCashDirection, VendorTradeCashDirection.received);
    expect(submission.tradeCashAmount, 25);
    expect(find.byKey(const Key('vendor_row_trade-copy')), findsNothing);
  });
}

class _FakeVendorService extends VendorPricingWorkspaceService {
  _FakeVendorService(this.data);

  final VendorPricingWorkspaceData data;
  final List<(String, double)> priceSaves = [];
  final List<(String, String)> conditionSaves = [];
  final List<(String, String)> printingSaves = [];
  final List<(String, String, bool)> sectionSaves = [];
  final List<String> archivedCopies = [];
  final List<(String, VendorDispositionSubmission)> dispositions = [];

  @override
  Future<VendorPricingWorkspaceData> load() async => data;

  @override
  Future<VendorPricingWorkspaceRow> savePrice({
    required VendorPricingWorkspaceRow row,
    required double price,
  }) async {
    priceSaves.add((row.instanceId, price));
    return row.copyWith(askingPrice: price, intent: 'sell');
  }

  @override
  Future<VendorPricingWorkspaceRow> saveCondition({
    required VendorPricingWorkspaceRow row,
    required String condition,
  }) async {
    conditionSaves.add((row.instanceId, condition));
    return row.copyWith(conditionLabel: condition);
  }

  @override
  Future<VendorPricingWorkspaceRow> savePrinting({
    required VendorPricingWorkspaceRow row,
    required String cardPrintingId,
  }) async {
    printingSaves.add((row.instanceId, cardPrintingId));
    final option = row.printingOptions.firstWhere(
      (value) => value.id == cardPrintingId,
    );
    return row.copyWith(
      cardPrintingId: option.id,
      printingLabel: option.label,
      marketPrice: 12,
      marketObservedAt: DateTime.utc(2026, 8, 17),
      marketProvenanceId: 'proof-${row.instanceId}',
      clearMarketEvidence: true,
    );
  }

  @override
  Future<VendorPricingWorkspaceRow> saveSectionMembership({
    required VendorPricingWorkspaceRow row,
    required String sectionId,
    required bool selected,
  }) async {
    sectionSaves.add((row.instanceId, sectionId, selected));
    final next = row.sectionIds.toSet();
    selected ? next.add(sectionId) : next.remove(sectionId);
    return row.copyWith(sectionIds: next);
  }

  @override
  Future<void> archiveCopy({required VendorPricingWorkspaceRow row}) async {
    archivedCopies.add(row.instanceId);
  }

  @override
  Future<void> disposeCopy({
    required VendorPricingWorkspaceRow row,
    required VendorDispositionSubmission submission,
  }) async {
    dispositions.add((row.instanceId, submission));
  }
}

VendorPricingWorkspaceRow _row({
  required String instanceId,
  String? gvviId,
  String name = 'Test card',
  double? askingPrice,
  double? marketPrice,
  String intent = 'hold',
}) {
  return VendorPricingWorkspaceRow(
    instanceId: instanceId,
    gvviId: gvviId ?? 'GVVI-$instanceId',
    vaultItemId: 'vault-$instanceId',
    cardPrintId: 'card-$instanceId',
    cardPrintingId: 'printing-$instanceId',
    gvId: 'GV-PK-TEST-$instanceId',
    name: name,
    displayName: name,
    setName: 'Test Set',
    setCode: 'tst',
    number: '1',
    printingLabel: 'Holo',
    conditionLabel: 'NM',
    intent: intent,
    isGraded: false,
    marketPrice: marketPrice,
    marketObservedAt: DateTime.utc(2026, 8, 17),
    marketProvenanceId: marketPrice == null ? null : 'proof-$instanceId',
    askingPrice: askingPrice,
    currency: 'USD',
    sectionIds: const {},
    printingOptions: [
      VendorPrintingOption(
        id: 'printing-$instanceId',
        cardPrintId: 'card-$instanceId',
        label: 'Holo',
        sortOrder: 0,
      ),
      VendorPrintingOption(
        id: 'printing-reverse-$instanceId',
        cardPrintId: 'card-$instanceId',
        label: 'Reverse Holo',
        sortOrder: 1,
      ),
    ],
  );
}
