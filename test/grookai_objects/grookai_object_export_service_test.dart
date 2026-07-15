import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_destination_export_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_flattened_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_atoms.dart';
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

  test('destination availability matches object type rules', () {
    final memory = memoryCardFixture(GrookaiObjectSkin.onyx);
    final sale = saleCardFixture(GrookaiObjectSkin.onyx);
    final lot = lotCardFixture(GrookaiObjectSkin.onyx);

    expect(
      GrookaiObjectExportService.destinationsFor(memory),
      isNot(contains(GrookaiObjectExportDestination.ebayListing)),
    );
    expect(
      GrookaiObjectExportService.destinationsFor(memory),
      containsAll([
        GrookaiObjectExportDestination.instagramFeed,
        GrookaiObjectExportDestination.story,
        GrookaiObjectExportDestination.saveImage,
      ]),
    );
    expect(
      GrookaiObjectExportService.destinationsFor(sale),
      contains(GrookaiObjectExportDestination.ebayListing),
    );
    expect(
      GrookaiObjectExportService.destinationsFor(lot),
      contains(GrookaiObjectExportDestination.ebayListing),
    );
    expect(
      () => GrookaiObjectExportService.validateDestination(
        memory,
        GrookaiObjectExportDestination.ebayListing,
      ),
      throwsArgumentError,
    );
  });

  testWidgets('destination renderer exposes fixed export frame sizes', (
    tester,
  ) async {
    final key = GlobalKey();
    await tester.binding.setSurfaceSize(const Size(420, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    for (final entry in const {
      GrookaiObjectExportDestination.instagramFeed: Size(360, 450),
      GrookaiObjectExportDestination.story: Size(360, 640),
      GrookaiObjectExportDestination.ebayListing: Size(360, 360),
      GrookaiObjectExportDestination.saveImage: Size(
        GrookaiObjectFrame.width,
        GrookaiObjectFrame.height,
      ),
    }.entries) {
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Scaffold(
            body: Center(
              child: GrookaiObjectDestinationExportRenderer(
                repaintBoundaryKey: key,
                object: saleCardFixture(GrookaiObjectSkin.onyx),
                destination: entry.key,
                showFront: true,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final renderBox = tester.renderObject<RenderBox>(find.byKey(key));
      expect(renderBox.size, entry.value);
    }
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

  testWidgets('ebay lot export shows multiple lot card images', (tester) async {
    final key = GlobalKey();
    await tester.binding.setSurfaceSize(const Size(420, 420));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: Center(
            child: GrookaiObjectDestinationExportRenderer(
              repaintBoundaryKey: key,
              object: fourImageLotFixture(GrookaiObjectSkin.onyx),
              destination: GrookaiObjectExportDestination.ebayListing,
              showFront: true,
            ),
          ),
        ),
      ),
    );

    expect(find.byType(GrookaiObjectNetworkImage), findsNWidgets(4));
    expect(find.text('4 card lot'), findsOneWidget);
  });

  testWidgets('ebay lot export represents all 12 capped lot cards', (
    tester,
  ) async {
    final key = GlobalKey();
    await tester.binding.setSurfaceSize(const Size(420, 420));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: Center(
            child: GrookaiObjectDestinationExportRenderer(
              repaintBoundaryKey: key,
              object: twelveImageLotFixture(GrookaiObjectSkin.onyx),
              destination: GrookaiObjectExportDestination.ebayListing,
              showFront: true,
            ),
          ),
        ),
      ),
    );

    expect(find.byType(GrookaiObjectNetworkImage), findsNWidgets(12));
    expect(find.text('12 card lot'), findsOneWidget);
  });

  test('shareable screens use the shared flattened export path', () {
    for (final path in const [
      'lib/screens/grookai_objects/memory_card_capture_screen.dart',
      'lib/screens/grookai_objects/for_sale_terms_screen.dart',
      'lib/screens/grookai_objects/lot_pricing_screen.dart',
    ]) {
      final source = File(path).readAsStringSync();
      expect(source, contains('GrookaiObjectExportService'));
      expect(source, contains('GrookaiObjectDestinationExportRenderer'));
      expect(source, contains('showGrookaiObjectShareDestinationSheet'));
      expect(source, contains('exportObjectPng('));
      expect(source, contains('sharePng('));
    }
  });
}
