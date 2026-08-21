import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_atoms.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';
import 'package:grookai_vault/widgets/grookai_objects/lot_card_widgets.dart';

import 'grookai_object_fixtures.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test(
    'balanced lot layouts center incomplete rows for every supported count',
    () {
      expect(lotBalancedRowPattern(1), [1]);
      expect(lotBalancedRowPattern(5), [3, 2]);
      expect(lotBalancedRowPattern(7), [2, 3, 2]);
      expect(lotBalancedRowPattern(10), [3, 4, 3]);
      expect(lotBalancedRowPattern(11), [4, 3, 4]);
      expect(lotBalancedRowPattern(12), [4, 4, 4]);

      for (var count = 1; count <= 12; count += 1) {
        final pattern = lotBalancedRowPattern(count);
        expect(pattern.fold<int>(0, (sum, row) => sum + row), count);
        expect(pattern.every((row) => row >= 1 && row <= 4), isTrue);
      }
    },
  );

  testWidgets('lot front renders every selected card image', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GrookaiObjectRenderer(
            object: fourImageLotFixture(GrookaiObjectSkin.onyx),
            showFront: true,
          ),
        ),
      ),
    );

    expect(find.byType(GrookaiObjectNetworkImage), findsNWidgets(4));
  });

  testWidgets('lot back shows set number total and meaningful variant', (
    tester,
  ) async {
    final object = GrookaiLotListingAdapter.fromTerms(
      source: const GrookaiLotListingSource(
        title: 'Pikachu Lot',
        items: [
          GrookaiLotListingItemSource(
            cardName: 'Pikachu',
            setName: 'Ascended Heroes',
            collectorNumber: '25',
            printedTotal: 198,
            variantLabel: 'Pokémon Center Stamp',
            condition: 'Raw NM',
            price: 20,
          ),
        ],
      ),
      skin: GrookaiObjectSkin.onyx,
      bundlePrice: 20,
      metadata: const <String, dynamic>{},
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GrookaiObjectRenderer(object: object, showFront: false),
        ),
      ),
    );

    expect(find.text('Pikachu'), findsOneWidget);
    expect(
      find.text('Ascended Heroes · 25/198 · Pokémon Center Stamp'),
      findsOneWidget,
    );
  });

  testWidgets('lot front renders a clean 12 card share grid', (tester) async {
    await tester.binding.setSurfaceSize(const Size(440, 620));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GrookaiObjectRenderer(
            object: twelveImageLotFixture(GrookaiObjectSkin.onyx),
            showFront: true,
          ),
        ),
      ),
    );

    expect(find.byType(GrookaiObjectNetworkImage), findsNWidgets(12));
    expect(find.textContaining('more'), findsNothing);
    expect(find.text('LOT · 12 CARDS'), findsOneWidget);
  });
}
