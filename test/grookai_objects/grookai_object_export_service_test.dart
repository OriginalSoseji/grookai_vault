import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_flattened_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_frame.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

import 'grookai_object_fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('fileNameFor builds stable png names', () {
    expect(
      GrookaiObjectExportService.fileNameFor(
        type: 'memory',
        title: 'Pikachu & Friends!',
      ),
      'grookai-memory-pikachu-friends.png',
    );
    expect(
      GrookaiObjectExportService.fileNameFor(type: 'for sale', title: '   '),
      'grookai-for-sale-card.png',
    );
  });

  testWidgets('flattened renderer exposes a fixed export boundary', (
    tester,
  ) async {
    final key = GlobalKey();
    await tester.binding.setSurfaceSize(const Size(440, 600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: const Color(0xFF101114),
          body: Center(
            child: GrookaiObjectFlattenedRenderer(
              repaintBoundaryKey: key,
              object: memoryCardFixture(GrookaiObjectSkin.onyx),
              showFront: true,
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

    expect(find.byKey(key), findsOneWidget);
  });

  test('shareable screens use the shared flattened export path', () {
    for (final path in const [
      'lib/screens/grookai_objects/memory_card_capture_screen.dart',
      'lib/screens/grookai_objects/for_sale_terms_screen.dart',
      'lib/screens/grookai_objects/lot_pricing_screen.dart',
    ]) {
      final source = File(path).readAsStringSync();
      expect(source, contains('GrookaiObjectExportService'));
      expect(source, contains('GrookaiObjectFlattenedRenderer'));
      expect(source, contains('capturePng(_exportBoundaryKey)'));
      expect(source, contains('sharePng('));
    }
  });
}
