import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sets/public_set_detail_screen.dart';
import 'package:grookai_vault/services/public/card_surface_pricing_service.dart';
import 'package:grookai_vault/widgets/card_surface_price.dart';

void main() {
  testWidgets('set grid shows the TCGPlayer source and governed From price', (
    tester,
  ) async {
    const pricing = CardSurfacePricingData(
      cardPrintId: 'parent-1',
      pricingScope: 'parent',
      marketClose: 0.28,
      sourceLabel: 'From TCGPlayer Market',
      isFromPrice: true,
    );
    final proofKey = cardSurfacePricingProofKey(pricing);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: SetGridMarketPrice(pricing: pricing)),
      ),
    );

    expect(find.text('TCGPlayer Market'), findsOneWidget);
    expect(find.text(r'From $0.28'), findsOneWidget);
    expect(find.byKey(ValueKey<String>(proofKey)), findsOneWidget);
  });

  testWidgets('set grid omits a price proof when no governed price exists', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: SetGridMarketPrice(pricing: null)),
      ),
    );

    expect(find.text('TCGPlayer Market'), findsNothing);
    expect(find.byType(CardSurfacePriceText), findsNothing);
  });

  testWidgets('set grid price footer grows with accessibility text scaling', (
    tester,
  ) async {
    const pricing = CardSurfacePricingData(
      cardPrintId: 'parent-1',
      pricingScope: 'parent',
      marketClose: 0.28,
      sourceLabel: 'From TCGPlayer Market',
      isFromPrice: true,
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(2)),
          child: Scaffold(body: SetGridMarketPrice(pricing: pricing)),
        ),
      ),
    );

    expect(tester.getSize(find.byType(SetGridMarketPrice)).height, 51.25);
    expect(find.text('TCGPlayer Market'), findsOneWidget);
    expect(find.text(r'From $0.28'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
