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
    final semantics = tester.getSemantics(find.byKey(ValueKey<String>(proofKey)));
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
}
