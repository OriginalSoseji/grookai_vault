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
