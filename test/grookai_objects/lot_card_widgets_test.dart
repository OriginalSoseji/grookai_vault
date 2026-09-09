import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_atoms.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

import 'grookai_object_fixtures.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('seller row keeps a long handle inside the export width', (
    tester,
  ) async {
    const handle = '80185b1b-ddbc-4baf-94c2-b99b97d0e252';
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 342,
              child: CardSellerRow(
                tokens: onyxTokens,
                handle: handle,
                rating: 0,
                tradeCount: 0,
              ),
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
    final row = tester.getRect(find.byType(CardSellerRow));
    final name = tester.getRect(find.text('@$handle'));
    expect(name.left, greaterThanOrEqualTo(row.left));
    expect(name.right, lessThanOrEqualTo(row.right + 0.01));
  });

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
