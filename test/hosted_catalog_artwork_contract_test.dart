import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/services/grookai_dex/grookai_dex_service.dart';
import 'package:grookai_vault/services/public/compare_service.dart';
import 'package:grookai_vault/services/public/public_sets_service.dart';
import 'package:grookai_vault/widgets/card_zoom_viewer.dart';

void main() {
  test('Dex card art uses a hosted primary and provider fallback', () {
    const card = GrookaiDexCardPrint(
      cardPrintId: 'card-1',
      gvId: 'GV-PK-ME04-120',
      name: 'Mega Gardevoir ex',
      role: 'primary',
      countsForCompletion: true,
      ownedCount: 0,
      printings: <GrookaiDexPrintingOption>[],
      imageUrl: 'https://assets.tcgdex.net/en/me/me04/120',
    );

    expect(
      card.hostedImageUrl,
      endsWith('/api/canon/cards/GV-PK-ME04-120/image'),
    );
    expect(card.providerFallbackImageUrl, contains('/_next/image?'));
    expect(
      card.providerFallbackImageUrl,
      contains('assets.tcgdex.net%2Fen%2Fme%2Fme04%2F120%2Fhigh.webp'),
    );
  });

  test('Compare card art uses a hosted primary and provider fallback', () {
    const card = ComparePublicCard(
      id: 'card-2',
      gvId: 'GV-PK-CEL-1',
      name: 'Ho-Oh',
      number: '1',
      imageUrl: 'https://images.pokemontcg.io/cel25/1_hires.png',
    );

    expect(card.hostedImageUrl, endsWith('/api/canon/cards/GV-PK-CEL-1/image'));
    expect(card.providerFallbackImageUrl, contains('/_next/image?'));
    expect(
      card.providerFallbackImageUrl,
      contains('images.pokemontcg.io%2Fcel25%2F1_hires.png'),
    );
  });

  test(
    'catalog and set models expose hosted primary plus provider fallback',
    () {
      final catalogCard = CardPrint.fromJson(<String, dynamic>{
        'id': 'card-3',
        'gv_id': 'GV-PK-CRI-120',
        'name': 'AZ’s Tranquility',
        'set_code': 'me04',
        'image_url': 'https://assets.tcgdex.net/en/me/me04/120',
        'display_image_url':
            'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
      });
      const setCard = PublicSetCard(
        cardPrintId: 'card-3',
        gvId: 'GV-PK-CRI-120',
        name: 'AZ’s Tranquility',
        number: '120',
        imageUrl: 'https://assets.tcgdex.net/en/me/me04/120',
        providerImageUrl: 'https://assets.tcgdex.net/en/me/me04/120',
        displayImageUrl:
            'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
      );

      for (final values in <List<String?>>[
        <String?>[
          catalogCard.catalogImageUrl,
          catalogCard.providerFallbackImageUrl,
        ],
        <String?>[setCard.catalogImageUrl, setCard.providerFallbackImageUrl],
      ]) {
        expect(
          values.first,
          'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
        );
        expect(values.last, contains('assets.tcgdex.net'));
        expect(values.last, contains('high.webp'));
        expect(values.last, isNot(contains('/api/canon/cards/')));
      }
    },
  );

  test('set summaries use Grookai-hosted logos before provider logos', () {
    const set = PublicSetSummary(
      code: 'me04',
      name: 'Chaos Rising',
      cardCount: 182,
      heroImageUrl: 'https://assets.tcgdex.net/en/me/me04/logo.png',
    );

    expect(
      set.hostedHeroImageUrl,
      'https://grookaivault.com/set-logos/me04.png',
    );
    expect(set.providerHeroFallbackImageUrl, contains('assets.tcgdex.net'));
    expect(set.providerHeroFallbackImageUrl, isNot(contains('high.webp')));
  });

  test('zoom gallery keeps provider art dormant behind hosted primary', () {
    const item = CardZoomGalleryItem(
      label: 'AZ’s Tranquility',
      imageUrl: 'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
      fallbackImageUrl: 'https://assets.tcgdex.net/en/me/me04/120',
    );

    expect(item.resolvedImageUrl, contains('grookaivault.com/api/canon/cards'));
    expect(item.resolvedFallbackImageUrl, contains('assets.tcgdex.net'));
  });

  test('Dex and Compare surfaces wire provider art only as fallback', () {
    final dex = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();
    final compare = File(
      'lib/screens/compare/compare_screen.dart',
    ).readAsStringSync();
    final dexCardTile = RegExp(
      r'class _DexCardTile[\s\S]*?class _OwnedPrintBadge',
    ).firstMatch(dex)!.group(0)!;
    final comparePreview = RegExp(
      r'class _CompareCardPreviewGrid[\s\S]*?class _CompareSectionCard',
    ).firstMatch(compare)!.group(0)!;

    for (final surface in <String>[dexCardTile, comparePreview]) {
      expect(surface, contains('CardSurfaceArtwork('));
      expect(surface, contains('imageUrl: card.hostedImageUrl'));
      expect(
        surface,
        contains('fallbackImageUrl: card.providerFallbackImageUrl'),
      );
    }

    expect(comparePreview, isNot(contains('BoxFit.cover')));
    expect(comparePreview, isNot(contains('Image.network(')));
  });

  test(
    'Card detail child art stays schema-safe and inherits hosted parent art',
    () {
      final detail = File('lib/card_detail_screen.dart').readAsStringSync();
      final printingLoader = RegExp(
        r'Future<List<_CardDetailPrintingOption>> _fetchPrintingOptions[\s\S]*?String\? _resolveInitialPrintingSelection',
      ).firstMatch(detail)!.group(0)!;
      final artworkResolver = RegExp(
        r'CatalogArtworkResolution get _cardArtworkResolution[\s\S]*?String get _resolvedSetName',
      ).firstMatch(detail)!.group(0)!;

      expect(printingLoader, contains('image_url,image_alt_url'));
      expect(printingLoader, isNot(contains('representative_image_url')));
      expect(
        artworkResolver,
        contains('final parentArtwork = resolveCatalogArtwork'),
      );
      expect(artworkResolver, contains('parentArtwork.primaryImageUrl'));
    },
  );
}
