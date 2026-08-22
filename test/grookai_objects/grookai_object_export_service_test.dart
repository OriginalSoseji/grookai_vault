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
import 'package:grookai_vault/widgets/grookai_objects/lot_card_widgets.dart';

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
    expect(
      GrookaiObjectExportService.sidedFileNameFor(
        type: 'lot',
        title: 'Pikachu Lot',
        side: 'front',
      ),
      'grookai-lot-pikachu-lot-front.png',
    );
  });

  test('odd lot sizes use balanced symmetric rows', () {
    expect(lotBalancedRowPattern(5), [3, 2]);
    expect(lotBalancedRowPattern(7), [2, 3, 2]);
    expect(lotBalancedRowPattern(10), [3, 4, 3]);
    expect(lotBalancedRowPattern(11), [4, 3, 4]);
    for (var count = 1; count <= 12; count += 1) {
      expect(lotBalancedRowPattern(count).fold<int>(0, (a, b) => a + b), count);
    }
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

  testWidgets('share origin is non-zero and inside the rendered surface', (
    tester,
  ) async {
    final key = GlobalKey();
    await tester.binding.setSurfaceSize(const Size(440, 600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(child: SizedBox(key: key, width: 220, height: 300)),
        ),
      ),
    );

    final context = tester.element(find.byKey(key));
    final origin = GrookaiObjectExportService.sharePositionOriginFor(context);

    expect(origin.width, greaterThan(0));
    expect(origin.height, greaterThan(0));
    expect(origin.left, greaterThanOrEqualTo(0));
    expect(origin.top, greaterThanOrEqualTo(0));
    expect(origin.right, lessThanOrEqualTo(440));
    expect(origin.bottom, lessThanOrEqualTo(600));
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

  testWidgets('ebay five-card export uses centered three-plus-two rows', (
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
              object: fiveImageLotFixture(GrookaiObjectSkin.onyx),
              destination: GrookaiObjectExportDestination.ebayListing,
              showFront: true,
            ),
          ),
        ),
      ),
    );

    final images = find.byType(GrookaiObjectNetworkImage);
    expect(images, findsNWidgets(5));
    final positions = images
        .evaluate()
        .map((element) => tester.getTopLeft(find.byWidget(element.widget)))
        .toList(growable: false);
    final rowYs =
        positions.map((position) => position.dy.round()).toSet().toList()
          ..sort();
    expect(rowYs, hasLength(2));
    expect(
      positions.where((position) => position.dy.round() == rowYs.first),
      hasLength(3),
    );
    expect(
      positions.where((position) => position.dy.round() == rowYs.last),
      hasLength(2),
    );
    final topRowLeft = positions
        .where((position) => position.dy.round() == rowYs.first)
        .map((position) => position.dx)
        .reduce((left, right) => left < right ? left : right);
    final bottomRowLeft = positions
        .where((position) => position.dy.round() == rowYs.last)
        .map((position) => position.dx)
        .reduce((left, right) => left < right ? left : right);
    expect(bottomRowLeft, greaterThan(topRowLeft));
  });

  testWidgets('ebay back export renders lot details instead of front collage', (
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
              object: fourImageLotFixture(GrookaiObjectSkin.onyx),
              destination: GrookaiObjectExportDestination.ebayListing,
              showFront: false,
            ),
          ),
        ),
      ),
    );

    final renderer = tester.widget<GrookaiObjectRenderer>(
      find.byType(GrookaiObjectRenderer),
    );
    expect(renderer.showFront, isFalse);
    expect(find.byType(GrookaiObjectNetworkImage), findsNothing);
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
      expect(source, contains(RegExp(r'sharePng(?:s)?\(')));
      expect(source, contains('sharePositionOriginFor('));
      expect(source, contains('recordNonFatalError('));
    }
  });
}
