import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object.dart';
import 'package:share_plus/share_plus.dart';

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

    await tester.tap(find.text('Share lot'));
    await tester.pump();

    expect(find.text('Enter a bundle price greater than 0.'), findsOneWidget);
  });

  testWidgets('lot pricing opens sharing without an intermediate ready step', (
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

    expect(find.text('Ready lot card'), findsNothing);
    await tester.tap(find.text('Share lot'));
    await tester.pumpAndSettle();

    expect(find.text('Share destination'), findsOneWidget);
    expect(find.text('Save Image'), findsOneWidget);
  });

  testWidgets('lot pricing shows every selected card with artwork rows', (
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
                cardName: 'Dunsparce',
                condition: 'Raw NM',
                price: 5,
                imageUrl: 'https://example.test/dunsparce.webp',
              ),
              GrookaiLotListingItemSource(
                cardName: 'Pikachu',
                condition: 'Raw NM',
                price: 12,
                imageUrl: 'https://example.test/pikachu.webp',
              ),
              GrookaiLotListingItemSource(
                cardName: 'Charizard ex',
                condition: 'Raw NM',
                price: 20,
                imageUrl: 'https://example.test/charizard.webp',
              ),
              GrookaiLotListingItemSource(
                cardName: 'Cosmic Eclipse Pikachu',
                condition: 'Raw LP',
                price: 18,
                imageUrl: 'https://example.test/cosmic-pikachu.webp',
              ),
            ],
          ),
          metadata: <String, dynamic>{},
        ),
      ),
    );

    expect(find.text('4 cards'), findsOneWidget);
    expect(find.text('Dunsparce'), findsWidgets);
    expect(find.text('Pikachu'), findsWidgets);
    expect(find.text('Charizard ex'), findsWidgets);
    expect(find.text('Cosmic Eclipse Pikachu'), findsWidgets);
    expect(find.byType(CardSurfaceArtwork), findsNWidgets(4));
  });

  testWidgets('sharing generates and shares front and back PNGs together', (
    tester,
  ) async {
    _useTallViewport(tester);
    final exportService = _RecordingExportService();
    await tester.pumpWidget(
      MaterialApp(
        home: LotPricingScreen(
          exportService: exportService,
          source: const GrookaiLotListingSource(
            title: 'Two Card Lot',
            items: [
              GrookaiLotListingItemSource(
                cardName: 'Pikachu',
                condition: 'Raw NM',
                price: 10,
              ),
              GrookaiLotListingItemSource(
                cardName: 'Raichu',
                condition: 'Raw NM',
                price: 12,
              ),
            ],
          ),
          metadata: const <String, dynamic>{},
        ),
      ),
    );

    await tester.tap(find.text('Share lot'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save Image'));
    await tester.pumpAndSettle();

    expect(exportService.exportCalls, 2);
    expect(exportService.sharedBytes, hasLength(2));
    expect(
      exportService.sharedFileNames,
      containsAll([
        'grookai-lot-save-image-two-card-lot-front.png',
        'grookai-lot-save-image-two-card-lot-back.png',
      ]),
    );
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

class _RecordingExportService extends GrookaiObjectExportService {
  int exportCalls = 0;
  List<Uint8List> sharedBytes = const [];
  List<String> sharedFileNames = const [];

  @override
  Future<Uint8List> exportObjectPng({
    required GrookaiObject object,
    required GrookaiObjectExportDestination destination,
    required GlobalKey repaintBoundaryKey,
    double pixelRatio = 3,
  }) async {
    exportCalls += 1;
    return Uint8List.fromList([137, 80, 78, 71, exportCalls]);
  }

  @override
  Future<ShareResult> sharePngs({
    required List<Uint8List> bytes,
    required List<String> fileNames,
    String? text,
    String? subject,
  }) async {
    sharedBytes = bytes;
    sharedFileNames = fileNames;
    return ShareResult.unavailable;
  }
}
