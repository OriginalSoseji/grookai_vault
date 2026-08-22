import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
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

  testWidgets(
    'lot pricing shares front and back without an intermediate gate',
    (tester) async {
      _useTallViewport(tester);
      final exportService = _FakeLotExportService();
      await tester.pumpWidget(
        MaterialApp(
          home: LotPricingScreen(
            source: const GrookaiLotListingSource(
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
            metadata: const <String, dynamic>{},
            exportService: exportService,
          ),
        ),
      );

      await tester.tap(find.text('Share lot'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save Image'));
      await tester.pumpAndSettle();

      expect(exportService.exportCalls, 2);
      expect(exportService.shareCalls, 1);
      expect(exportService.fileNames, hasLength(2));
      expect(exportService.fileNames.first, endsWith('-front.png'));
      expect(exportService.fileNames.last, endsWith('-back.png'));
    },
  );

  testWidgets('market reference remains visible beside editable seller price', (
    tester,
  ) async {
    _useTallViewport(tester);
    await tester.pumpWidget(
      const MaterialApp(
        home: LotPricingScreen(
          source: GrookaiLotListingSource(
            title: 'Market Lot',
            items: [
              GrookaiLotListingItemSource(
                cardName: 'Pikachu',
                setName: 'Ascended Heroes',
                collectorNumber: '101/100',
                variantLabel: 'Illustration Rare',
                condition: 'Raw NM',
                marketPrice: 12.34,
                price: 12.34,
              ),
            ],
          ),
          metadata: <String, dynamic>{},
        ),
      ),
    );

    expect(find.text(r'Market $12.34'), findsOneWidget);
    expect(find.text('My price'), findsOneWidget);
    expect(find.text('Ascended Heroes · 101/100'), findsWidgets);
    expect(find.text('Illustration Rare'), findsWidgets);
    final sellerPriceField = tester.widget<TextField>(
      find.widgetWithText(TextField, 'My price'),
    );
    expect(sellerPriceField.controller?.text, '12.34');
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
}

class _FakeLotExportService extends GrookaiObjectExportService {
  int exportCalls = 0;
  int shareCalls = 0;
  List<String> fileNames = const [];

  @override
  Future<Uint8List> exportObjectPng({
    required dynamic object,
    required GrookaiObjectExportDestination destination,
    required GlobalKey repaintBoundaryKey,
    double pixelRatio = 3,
  }) async {
    exportCalls += 1;
    return Uint8List.fromList(const [137, 80, 78, 71]);
  }

  @override
  Future<ShareResult> sharePngs({
    required List<Uint8List> bytes,
    required List<String> fileNames,
    String? text,
    String? subject,
    Rect? sharePositionOrigin,
  }) async {
    shareCalls += 1;
    this.fileNames = fileNames;
    return ShareResult.unavailable;
  }
}

void _useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(900, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}
