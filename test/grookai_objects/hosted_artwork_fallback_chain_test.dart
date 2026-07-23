import 'dart:convert';
import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_memory_card.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_atoms.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_destination_export_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_models.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';

const _primaryUrl =
    'https://grookaivault.com/api/canon/cards/GV-PK-TEST-1/image';
const _fallbackUrl = 'https://provider.test/card.webp';
const _renderedLotItems = <GrookaiLotListingItemSource>[
  GrookaiLotListingItemSource(
    cardName: 'Pikachu',
    condition: 'Raw NM',
    price: 20,
    imageUrl: _primaryUrl,
    fallbackImageUrl: _fallbackUrl,
  ),
  GrookaiLotListingItemSource(
    cardName: 'Mew',
    condition: 'Raw NM',
    price: 20,
    imageUrl: _primaryUrl,
    fallbackImageUrl: _fallbackUrl,
  ),
  GrookaiLotListingItemSource(
    cardName: 'Charizard',
    condition: 'Raw NM',
    price: 20,
    imageUrl: _primaryUrl,
    fallbackImageUrl: _fallbackUrl,
  ),
  GrookaiLotListingItemSource(
    cardName: 'Blastoise',
    condition: 'Raw NM',
    price: 20,
    imageUrl: _primaryUrl,
    fallbackImageUrl: _fallbackUrl,
  ),
];

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('memory, sale, and lot adapters retain provider fallbacks', () {
    final memory = GrookaiMemoryCardAdapter.fromDraft(
      source: const GrookaiMemoryCardSource(
        cardName: 'Pikachu',
        setLine: 'Test Set #1',
        cardImageUrl: _primaryUrl,
        cardImageFallbackUrl: '  $_fallbackUrl  ',
      ),
      skin: GrookaiObjectSkin.onyx,
      memoryType: CollectorMemoryType.note,
    );
    final sale = GrookaiSaleListingAdapter.fromTerms(
      source: const GrookaiSaleListingSource(
        cardName: 'Pikachu',
        setLine: 'Test Set #1',
        cardImageUrl: _primaryUrl,
        cardImageFallbackUrl: '  $_fallbackUrl  ',
      ),
      skin: GrookaiObjectSkin.ivory,
      price: 20,
      condition: 'Raw NM',
      quantity: 1,
      firm: true,
      allowDms: true,
      metadata: const <String, dynamic>{},
    );
    final lot = GrookaiLotListingAdapter.fromTerms(
      source: const GrookaiLotListingSource(
        title: 'Hosted artwork lot',
        items: <GrookaiLotListingItemSource>[
          GrookaiLotListingItemSource(
            cardName: 'Pikachu',
            condition: 'Raw NM',
            price: 20,
            imageUrl: _primaryUrl,
            fallbackImageUrl: '  $_fallbackUrl  ',
          ),
        ],
      ),
      skin: GrookaiObjectSkin.kraft,
      bundlePrice: 20,
      metadata: const <String, dynamic>{},
    );

    expect(memory.fields['cardImageUrl'], _primaryUrl);
    expect(memory.fields['cardImageFallbackUrl'], _fallbackUrl);
    expect(sale.fields['cardImageUrl'], _primaryUrl);
    expect(sale.fields['cardImageFallbackUrl'], _fallbackUrl);
    expect(
      (lot.fields['items'] as List).single,
      containsPair('fallbackImageUrl', _fallbackUrl),
    );
  });

  test('fallback fields survive JSON and older objects remain readable', () {
    final original = GrookaiLotListingAdapter.fromTerms(
      source: const GrookaiLotListingSource(
        title: 'Hosted artwork lot',
        items: <GrookaiLotListingItemSource>[
          GrookaiLotListingItemSource(
            cardName: 'Pikachu',
            condition: 'Raw NM',
            price: 20,
            imageUrl: _primaryUrl,
            fallbackImageUrl: _fallbackUrl,
          ),
        ],
      ),
      skin: GrookaiObjectSkin.onyx,
      bundlePrice: 20,
      metadata: const <String, dynamic>{},
    );
    final decoded = jsonDecode(jsonEncode(original.toJson()));
    final restored = GrookaiObject.fromJson(
      Map<String, dynamic>.from(decoded as Map),
    );
    final restoredLot = LotListingData.fromFields(
      restored.skin,
      restored.fields,
    );
    expect(restoredLot.items.single.imageUrl, _primaryUrl);
    expect(restoredLot.items.single.fallbackImageUrl, _fallbackUrl);

    final oldMemoryFields = <String, dynamic>{
      'cardName': 'Pikachu',
      'setLine': 'Test Set #1',
      'cardImageUrl': _primaryUrl,
      'listingNo': '001',
      'date': DateTime.utc(2026, 7, 22).toIso8601String(),
      'location': 'Denver',
      'photoUrl': null,
      'storyText': 'A memory.',
      'authorName': 'Collector',
    };
    final oldSaleFields = <String, dynamic>{
      'cardName': 'Pikachu',
      'setLine': 'Test Set #1',
      'cardImageUrl': _primaryUrl,
      'listingNo': '001',
      'price': 20,
      'firm': true,
      'condition': 'Raw NM',
      'quantity': 1,
      'sellerHandle': 'Collector',
      'sellerRating': 0,
      'sellerTradeCount': 0,
      'allowDms': true,
    };
    final oldLotFields = Map<String, dynamic>.from(original.fields);
    oldLotFields['items'] = <Map<String, dynamic>>[
      <String, dynamic>{
        'cardName': 'Pikachu',
        'condition': 'Raw NM',
        'price': 20,
        'imageUrl': _primaryUrl,
      },
    ];

    expect(
      MemoryCardData.fromFields(
        GrookaiObjectSkin.onyx,
        oldMemoryFields,
      ).card.cardImageFallbackUrl,
      isNull,
    );
    expect(
      SaleListingData.fromFields(
        GrookaiObjectSkin.onyx,
        oldSaleFields,
      ).card.cardImageFallbackUrl,
      isNull,
    );
    expect(
      LotListingData.fromFields(
        GrookaiObjectSkin.onyx,
        oldLotFields,
      ).items.single.fallbackImageUrl,
      isNull,
    );
  });

  testWidgets('network image creates its fallback only after primary error', (
    tester,
  ) async {
    late BuildContext context;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (value) {
            context = value;
            return const SizedBox.shrink();
          },
        ),
      ),
    );

    const image = GrookaiObjectNetworkImage(
      imageUrl: _primaryUrl,
      fallbackImageUrl: _fallbackUrl,
      width: 200,
    );
    final clipped = image.build(context) as ClipRRect;
    final primary = clipped.child! as CachedNetworkImage;
    expect(primary.imageUrl, _primaryUrl);

    final fallback = primary.errorWidget!(
      context,
      _primaryUrl,
      StateError('primary failed'),
    );
    expect(fallback, isA<CachedNetworkImage>());
    expect((fallback as CachedNetworkImage).imageUrl, _fallbackUrl);
    expect(
      fallback.errorWidget!(
        context,
        _fallbackUrl,
        StateError('fallback failed'),
      ),
      isA<CardArtPlaceholder>(),
    );

    const duplicate = GrookaiObjectNetworkImage(
      imageUrl: _primaryUrl,
      fallbackImageUrl: _primaryUrl,
      width: 200,
    );
    final duplicatePrimary =
        (duplicate.build(context) as ClipRRect).child! as CachedNetworkImage;
    expect(
      duplicatePrimary.errorWidget!(
        context,
        _primaryUrl,
        StateError('primary failed'),
      ),
      isA<CardArtPlaceholder>(),
    );
  });

  testWidgets('object fronts and eBay exports forward provider fallbacks', (
    tester,
  ) async {
    final objects = <GrookaiObject>[
      GrookaiMemoryCardAdapter.fromDraft(
        source: const GrookaiMemoryCardSource(
          cardName: 'Pikachu',
          setLine: 'Test Set #1',
          cardImageUrl: _primaryUrl,
          cardImageFallbackUrl: _fallbackUrl,
        ),
        skin: GrookaiObjectSkin.onyx,
        memoryType: CollectorMemoryType.note,
      ),
      GrookaiSaleListingAdapter.fromTerms(
        source: const GrookaiSaleListingSource(
          cardName: 'Pikachu',
          setLine: 'Test Set #1',
          cardImageUrl: _primaryUrl,
          cardImageFallbackUrl: _fallbackUrl,
        ),
        skin: GrookaiObjectSkin.onyx,
        price: 20,
        condition: 'Raw NM',
        quantity: 1,
        firm: true,
        allowDms: true,
        metadata: const <String, dynamic>{},
      ),
      GrookaiLotListingAdapter.fromTerms(
        source: const GrookaiLotListingSource(
          title: 'Hosted artwork lot',
          items: _renderedLotItems,
        ),
        skin: GrookaiObjectSkin.onyx,
        bundlePrice: 20,
        metadata: const <String, dynamic>{},
      ),
    ];

    for (final object in objects) {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: GrookaiObjectRenderer(object: object, showFront: true),
            ),
          ),
        ),
      );
      final artwork = tester.widget<GrookaiObjectNetworkImage>(
        find.byType(GrookaiObjectNetworkImage).first,
      );
      expect(artwork.imageUrl, _primaryUrl, reason: object.type);
      expect(artwork.fallbackImageUrl, _fallbackUrl, reason: object.type);
    }

    await tester.binding.setSurfaceSize(const Size(420, 420));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    for (final object in objects.skip(1)) {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GrookaiObjectDestinationExportRenderer(
              repaintBoundaryKey: GlobalKey(),
              object: object,
              destination: GrookaiObjectExportDestination.ebayListing,
              showFront: true,
            ),
          ),
        ),
      );
      final artwork = tester.widget<GrookaiObjectNetworkImage>(
        find.byType(GrookaiObjectNetworkImage).first,
      );
      expect(artwork.imageUrl, _primaryUrl, reason: object.type);
      expect(artwork.fallbackImageUrl, _fallbackUrl, reason: object.type);
    }
  });

  testWidgets('personal memory photo stays primary without catalog fallback', (
    tester,
  ) async {
    final object = GrookaiMemoryCardAdapter.fromDraft(
      source: const GrookaiMemoryCardSource(
        cardName: 'Pikachu',
        setLine: 'Test Set #1',
        cardImageUrl: _primaryUrl,
        cardImageFallbackUrl: _fallbackUrl,
      ),
      skin: GrookaiObjectSkin.onyx,
      memoryType: CollectorMemoryType.note,
      photoUrl: 'https://collector.test/my-memory-photo.webp',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: GrookaiObjectRenderer(object: object, showFront: false),
          ),
        ),
      ),
    );
    final photo = tester.widget<GrookaiObjectNetworkImage>(
      find.byType(GrookaiObjectNetworkImage),
    );
    expect(photo.imageUrl, 'https://collector.test/my-memory-photo.webp');
    expect(photo.fallbackImageUrl, isNull);
  });

  testWidgets('lot pricing preview retains the same artwork pair', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: LotPricingScreen(
          source: GrookaiLotListingSource(
            title: 'Hosted artwork lot',
            items: _renderedLotItems,
          ),
          metadata: <String, dynamic>{},
        ),
      ),
    );
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pump();

    final artwork = tester.widget<CardSurfaceArtwork>(
      find.byType(CardSurfaceArtwork).first,
    );
    expect(artwork.imageUrl, _primaryUrl);
    expect(artwork.fallbackImageUrl, _fallbackUrl);
  });

  test('hub populates every downstream source from one artwork resolution', () {
    final source = File(
      'lib/screens/grookai_objects/grookai_objects_hub_screen.dart',
    ).readAsStringSync();

    expect(source, contains('final artwork = _objectRowArtwork('));
    expect(source, contains('cardImageUrl: artwork.primaryImageUrl'));
    expect(source, contains('cardImageFallbackUrl: artwork.fallbackImageUrl'));
    expect(source, contains('imageUrl: artwork.primaryImageUrl'));
    expect(source, contains('fallbackImageUrl: artwork.fallbackImageUrl'));
    expect(source, contains("imageUrl: row['image_url']"));
    expect(source, contains("imageAltUrl: row['image_alt_url']"));
    expect(
      source,
      contains("representativeImageUrl: row['representative_image_url']"),
    );
    expect(
      source,
      contains('isCollectorUploadedCardImage(normalizedSourceImageUrl)'),
    );
  });
}
