import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_frame.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

import 'grookai_object_fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  final fixtures = <String, GrookaiObject Function(GrookaiObjectSkin)>{
    'memory': memoryCardFixture,
    'sale': saleCardFixture,
    'lot': lotCardFixture,
  };

  for (final fixture in fixtures.entries) {
    for (final skin in GrookaiObjectSkin.values) {
      for (final side in const [true, false]) {
        final sideName = side ? 'front' : 'back';
        testWidgets(
          '${fixture.key} ${skin.name} $sideName renders and matches golden',
          (tester) async {
            final object = fixture.value(skin);
            final key = ValueKey('${fixture.key}-${skin.name}-$sideName');
            await tester.binding.setSurfaceSize(const Size(440, 600));
            addTearDown(() => tester.binding.setSurfaceSize(null));

            await tester.pumpWidget(
              MaterialApp(
                debugShowCheckedModeBanner: false,
                home: Scaffold(
                  backgroundColor: const Color(0xFF101114),
                  body: Center(
                    child: RepaintBoundary(
                      key: key,
                      child: GrookaiObjectRenderer(
                        object: object,
                        showFront: side,
                        onPrimaryAction: () {},
                      ),
                    ),
                  ),
                ),
              ),
            );
            await tester.pumpAndSettle();

            expect(find.byType(GrookaiObjectRenderer), findsOneWidget);
            final renderBox = tester.renderObject<RenderBox>(find.byKey(key));
            expect(
              renderBox.size,
              const Size(GrookaiObjectFrame.width, GrookaiObjectFrame.height),
            );
            await expectLater(
              find.byKey(key),
              matchesGoldenFile(
                'goldens/${fixture.key}_${skin.name}_$sideName.png',
              ),
            );
          },
        );
      }
    }
  }

  testWidgets('unknown layouts render a forward-compatible placeholder', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: GrookaiObjectRenderer(
          object: GrookaiObject(
            type: 'future',
            skin: GrookaiObjectSkin.onyx,
            layout: 'trade.v99',
            fields: {},
          ),
          showFront: true,
        ),
      ),
    );

    expect(find.text('Unsupported card layout: trade.v99'), findsOneWidget);
  });
}
