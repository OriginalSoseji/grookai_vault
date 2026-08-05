import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/card_surface_pricing_service.dart';
import 'package:grookai_vault/widgets/card_surface_price.dart';

void main() {
  testWidgets('shared price widget exposes stable source-to-render evidence', (
    tester,
  ) async {
    final pricing = CardSurfacePricingData(
      cardPrintId: 'parent-1',
      pricingScope: 'card_printing',
      cardPrintingId: 'printing-1',
      printingGvId: 'GV-PK-TEST-001-PRINT',
      marketClose: 12.34,
      primarySource: 'tcgplayer',
      sourceLabel: 'TCGPlayer Market',
      observedAt: DateTime.utc(2026, 7, 28, 8, 15),
      publishedAt: DateTime.utc(2026, 7, 28, 8, 20),
      provenanceId: 'provenance-1',
      proofPricedCopyCount: 1,
      proofUnpricedCopyCount: 0,
    );
    final proofKey = cardSurfacePricingProofKey(pricing);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: CardSurfacePriceText(pricing: pricing)),
      ),
    );

    expect(find.byKey(ValueKey<String>(proofKey)), findsOneWidget);
    expect(find.text(r'$12.34'), findsOneWidget);
    final semantics = tester.getSemantics(
      find.byKey(ValueKey<String>(proofKey)),
    );
    expect(semantics.identifier, proofKey);
    expect(semantics.label, contains('TCGPlayer Market'));
    expect(semantics.label, contains(r'$12.34'));
  });

  test('proof key preserves exact printing and provenance evidence', () {
    final proofKey = cardSurfacePricingProofKey(
      CardSurfacePricingData(
        cardPrintId: 'parent-1',
        pricingScope: 'card_printing',
        cardPrintingId: 'printing-1',
        printingGvId: 'GV-PK-TEST-001-PRINT',
        marketClose: 12.34,
        sourceLabel: 'TCGPlayer Market',
        observedAt: DateTime.utc(2026, 7, 28, 8, 15),
        publishedAt: DateTime.utc(2026, 7, 28, 8, 20),
        provenanceId: 'provenance-1',
        proofPricedCopyCount: 1,
        proofUnpricedCopyCount: 0,
      ),
    );

    expect(proofKey, contains('card_printing'));
    expect(proofKey, contains('printing-1'));
    expect(proofKey, contains('GV-PK-TEST-001-PRINT'));
    expect(proofKey, contains('12.34'));
    expect(proofKey, contains('provenance-1'));
    expect(proofKey, endsWith('|TCGPlayer Market|exact|1|0'));
  });

  testWidgets('multi-printing parent summaries render an explicit From label', (
    tester,
  ) async {
    const pricing = CardSurfacePricingData(
      cardPrintId: 'parent-1',
      pricingScope: 'parent',
      marketClose: 12.34,
      primarySource: 'tcgplayer',
      sourceLabel: 'From TCGPlayer Market',
      isFromPrice: true,
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: CardSurfacePriceText(pricing: pricing)),
      ),
    );

    expect(find.text(r'From $12.34'), findsOneWidget);
    expect(
      cardSurfacePricingProofKey(pricing),
      contains('|From TCGPlayer Market|from|'),
    );
  });

  testWidgets('manual prices never carry TCGPlayer market proof', (
    tester,
  ) async {
    const pricing = CardSurfacePricingData(
      cardPrintId: 'parent-1',
      pricingScope: 'parent',
      marketClose: 12.34,
      primarySource: 'tcgplayer',
      sourceLabel: 'TCGPlayer Market',
    );
    final proofKey = cardSurfacePricingProofKey(pricing);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: CardSurfacePriceText(
            pricing: pricing,
            mode: CardSurfacePriceMode.manual,
            manualPrice: 8.5,
          ),
        ),
      ),
    );

    expect(find.text(r'$8.50'), findsOneWidget);
    expect(find.byKey(ValueKey<String>(proofKey)), findsNothing);
    final semantics = tester.getSemantics(find.text(r'$8.50'));
    expect(semantics.identifier, isEmpty);
    expect(semantics.label, contains('Collector asking price'));
    expect(semantics.label, isNot(contains('TCGPlayer Market')));
  });

  test('read-model adapter accepts only complete governed rows', () {
    final row = <String, dynamic>{
      'pricing_scope': 'card_printing',
      'card_print_id': 'parent-1',
      'card_printing_id': 'printing-1',
      'printing_gv_id': 'GV-PK-TEST-001-PRINT',
      'finish_key': 'normal',
      'status': 'available',
      'currency': 'USD',
      'market_close': 12.34,
      'source_name': 'tcgplayer',
      'source_label': 'TCGPlayer Market',
      'observed_at': '2026-07-28T08:15:00.000Z',
      'published_at': '2026-07-28T08:20:00.000Z',
      'freshness': 'fresh',
      'is_from_price': false,
      'provenance_id': 'provenance-1',
    };

    final pricing = cardSurfacePricingDataFromReadModelRow(row);
    expect(pricing, isNotNull);
    expect(pricing?.marketClose, 12.34);
    expect(pricing?.provenanceId, 'provenance-1');

    for (final field in <String>[
      'card_printing_id',
      'status',
      'currency',
      'source_name',
      'source_label',
      'observed_at',
      'published_at',
      'freshness',
      'provenance_id',
    ]) {
      final invalid = Map<String, dynamic>.from(row)..remove(field);
      expect(
        cardSurfacePricingDataFromReadModelRow(invalid),
        isNull,
        reason: 'missing $field must fail closed',
      );
    }
  });

  test('read-model adapter rejects unsupported pricing states', () {
    final valid = <String, dynamic>{
      'pricing_scope': 'card_printing',
      'card_print_id': 'parent-1',
      'card_printing_id': 'printing-1',
      'printing_gv_id': 'GV-PK-TEST-001-PRINT',
      'finish_key': 'normal',
      'status': 'available',
      'currency': 'USD',
      'market_close': 12.34,
      'source_name': 'tcgplayer',
      'source_label': 'TCGPlayer Market',
      'observed_at': '2026-07-28T08:15:00.000Z',
      'published_at': '2026-07-28T08:20:00.000Z',
      'freshness': 'fresh',
      'is_from_price': false,
      'provenance_id': 'provenance-1',
    };
    final mutations = <String, dynamic>{
      'status': 'unavailable',
      'currency': 'EUR',
      'market_close': 0,
      'source_name': 'other',
      'source_label': 'Other Market',
      'freshness': 'stale',
      'observed_at': 'not-a-timestamp',
      'published_at': 'not-a-timestamp',
      'provenance_id': '',
      'is_from_price': true,
    };

    for (final entry in mutations.entries) {
      final invalid = Map<String, dynamic>.from(valid)
        ..[entry.key] = entry.value;
      expect(
        cardSurfacePricingDataFromReadModelRow(invalid),
        isNull,
        reason: '${entry.key}=${entry.value} must fail closed',
      );
    }
  });

  test('duplicate governed rows are excluded as ambiguous', () {
    final row = <String, dynamic>{
      'pricing_scope': 'card_printing',
      'card_print_id': 'parent-1',
      'card_printing_id': 'printing-1',
      'printing_gv_id': 'GV-PK-TEST-001-PRINT',
      'finish_key': 'normal',
      'status': 'available',
      'currency': 'USD',
      'market_close': 12.34,
      'source_name': 'tcgplayer',
      'source_label': 'TCGPlayer Market',
      'observed_at': '2026-07-28T08:15:00.000Z',
      'published_at': '2026-07-28T08:20:00.000Z',
      'freshness': 'fresh',
      'is_from_price': false,
      'provenance_id': 'provenance-1',
    };

    expect(
      indexCardSurfacePricingRows(
        rows: [row],
        pricingScope: 'card_printing',
        requestedIds: const ['printing-1'],
      ).keys,
      ['printing-1'],
    );
    expect(
      indexCardSurfacePricingRows(
        rows: [row, Map<String, dynamic>.from(row)],
        pricingScope: 'card_printing',
        requestedIds: const ['printing-1'],
      ),
      isEmpty,
    );
  });

  testWidgets('unavailable pricing renders no governed proof marker', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: CardSurfacePriceText(pricing: null)),
      ),
    );

    expect(find.text('—'), findsOneWidget);
    final semantics = tester.getSemantics(find.text('—'));
    expect(semantics.identifier, isEmpty);
    expect(semantics.label, contains('Price unavailable'));
    expect(semantics.label, isNot(contains('TCGPlayer Market')));
  });
}
