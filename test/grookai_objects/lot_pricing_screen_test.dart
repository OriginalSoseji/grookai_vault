import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('lot pricing validates bundle price', (tester) async {
    _useTallViewport(tester);
    await tester.pumpWidget(
      const MaterialApp(
        home: LotPricingScreen(
          source: GrookaiLotListingSource(
            title: 'Test Lot',
            items: [
              GrookaiLotListingItemSource(
                cardName: 'Card A',
                condition: 'Raw NM',
                price: 0,
              ),
              GrookaiLotListingItemSource(
                cardName: 'Card B',
                condition: 'Raw NM',
                price: 0,
              ),
            ],
          ),
          metadata: <String, dynamic>{},
        ),
      ),
    );

    await tester.tap(find.text('Ready lot card'));
    await tester.pump();

    expect(find.text('Enter a bundle price greater than 0.'), findsOneWidget);
  });

  testWidgets('lot pricing accepts bundle price and shows ready state', (
    tester,
  ) async {
    _useTallViewport(tester);
    await tester.pumpWidget(
      const MaterialApp(
        home: LotPricingScreen(
          source: GrookaiLotListingSource(
            title: 'Test Lot',
            items: [
              GrookaiLotListingItemSource(
                cardName: 'Card A',
                condition: 'Raw NM',
                price: 10,
              ),
              GrookaiLotListingItemSource(
                cardName: 'Card B',
                condition: 'Raw LP',
                price: 15,
              ),
            ],
          ),
          metadata: <String, dynamic>{},
        ),
      ),
    );

    await tester.tap(find.text('Ready lot card'));
    await tester.pumpAndSettle();

    expect(find.text('Lot card ready.'), findsOneWidget);
  });
}

void _useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(900, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}
