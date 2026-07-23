import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/public_collector_service.dart';
import 'package:grookai_vault/services/vault/vault_gvvi_service.dart';

void main() {
  test('Wall catalog artwork is hosted first with provider fallback', () {
    const card = PublicCollectorCard(
      cardPrintId: 'card-1',
      gvId: 'GV-PK-CEL-1',
      name: 'Ho-Oh',
      number: '1',
      imageUrl: 'https://display.test/ho-oh.webp',
      providerImageUrl: 'https://provider.test/ho-oh.webp',
      imageDisplayMode: 'canonical',
    );

    expect(
      card.primaryImageUrl,
      endsWith('/api/canon/cards/GV-PK-CEL-1/image'),
    );
    expect(card.fallbackImageUrl, 'https://provider.test/ho-oh.webp');
  });

  test('Wall keeps an uploaded copy photo ahead of hosted catalog art', () {
    const card = PublicCollectorCard(
      cardPrintId: 'card-1',
      gvId: 'GV-PK-CEL-1',
      name: 'Ho-Oh',
      number: '1',
      imageUrl: 'https://collector.test/exact-copy-front.webp',
      providerImageUrl: 'https://provider.test/ho-oh.webp',
      imageDisplayMode: 'uploaded',
    );

    expect(card.usesUploadedCopyImage, isTrue);
    expect(
      card.primaryImageUrl,
      'https://collector.test/exact-copy-front.webp',
    );
    expect(
      card.fallbackImageUrl,
      endsWith('/api/canon/cards/GV-PK-CEL-1/image'),
    );
    expect(card.catalogArtwork.fallbackImageUrl, isNull);
  });

  test('public and private GVVI catalog modes use hosted-first artwork', () {
    final publicData = _publicGvviData();
    final privateData = _vaultGvviData();

    for (final data in <dynamic>[publicData, privateData]) {
      expect(
        data.primaryImageUrl as String?,
        endsWith('/api/canon/cards/GV-PK-CEL-1/image'),
      );
      expect(
        data.fallbackImageUrl as String?,
        'https://provider.test/ho-oh.webp',
      );
    }
  });

  test('public and private GVVI preserve uploaded front-photo priority', () {
    final publicData = _publicGvviData(
      imageDisplayMode: GvviImageDisplayMode.uploaded,
      frontImageUrl: 'https://collector.test/public-front.webp',
    );
    final privateData = _vaultGvviData(
      imageDisplayMode: GvviImageDisplayMode.uploaded,
      frontImageUrl: 'https://collector.test/private-front.webp',
    );

    expect(publicData.usesUploadedFrontImage, isTrue);
    expect(
      publicData.primaryImageUrl,
      'https://collector.test/public-front.webp',
    );
    expect(
      publicData.fallbackImageUrl,
      endsWith('/api/canon/cards/GV-PK-CEL-1/image'),
    );
    expect(privateData.usesUploadedFrontImage, isTrue);
    expect(
      privateData.primaryImageUrl,
      'https://collector.test/private-front.webp',
    );
    expect(
      privateData.fallbackImageUrl,
      endsWith('/api/canon/cards/GV-PK-CEL-1/image'),
    );
  });

  test('Wall and GVVI widgets retain explicit fallback wiring', () {
    final collectorService = File(
      'lib/services/public/public_collector_service.dart',
    ).readAsStringSync();
    final wall = File(
      'lib/screens/public_collector/public_collector_screen.dart',
    ).readAsStringSync();
    final publicGvvi = File(
      'lib/screens/gvvi/public_gvvi_screen.dart',
    ).readAsStringSync();
    final privateGvvi = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();

    expect(collectorService, contains('image_display_mode'));
    expect(collectorService, contains('usesUploadedCopyImage'));
    expect(collectorService, contains('providerImageUrl'));
    expect(collectorService, contains('_providerImageUrlFromWallRow(row)'));

    final wallTile = RegExp(
      r'class _PublicCardTile[\s\S]*?class _PublicViewerOwnershipHint',
    ).firstMatch(wall)!.group(0)!;
    expect(wallTile, contains('imageUrl: primaryImageUrl'));
    expect(wallTile, contains('fallbackImageUrl: fallbackImageUrl'));

    final publicHero = RegExp(
      r'class _PublicGvviHero[\s\S]*?ResolvedImagePresentation _publicGvviImagePresentation',
    ).firstMatch(publicGvvi)!.group(0)!;
    expect(publicHero, contains('imageUrl: data.primaryImageUrl'));
    expect(publicHero, contains('fallbackImageUrl: data.fallbackImageUrl'));

    final privateHero = RegExp(
      r'class _VaultGvviOverviewSurface[\s\S]*?class _VaultIntentQuickSurface',
    ).firstMatch(privateGvvi)!.group(0)!;
    expect(privateHero, contains('imageUrl: data.primaryImageUrl'));
    expect(privateHero, contains('fallbackImageUrl: data.fallbackImageUrl'));

    final relatedTile = RegExp(
      r'class _VaultRelatedPrintTile[\s\S]*?class _GvviRelatedPrint',
    ).firstMatch(privateGvvi)!.group(0)!;
    expect(relatedTile, contains('resolveCatalogArtwork('));
    expect(relatedTile, contains('imageUrl: artwork.primaryImageUrl'));
    expect(relatedTile, contains('fallbackImageUrl: artwork.fallbackImageUrl'));

    expect(publicGvvi, contains('imageUrl: photos[index].url'));
  });
}

PublicGvviData _publicGvviData({
  GvviImageDisplayMode imageDisplayMode = GvviImageDisplayMode.canonical,
  String? frontImageUrl,
}) {
  return PublicGvviData(
    instanceId: 'instance-1',
    gvviId: 'GV-VI-1',
    vaultItemId: 'vault-item-1',
    ownerUserId: 'owner-1',
    ownerSlug: 'collector',
    ownerDisplayName: 'Collector',
    cardPrintId: 'card-1',
    gvId: 'GV-PK-CEL-1',
    cardName: 'Ho-Oh',
    setCode: 'CEL',
    setName: 'Celebrations',
    number: '1',
    intent: 'showcase',
    isDiscoverable: true,
    isGraded: false,
    pricingMode: GvviPricingMode.market,
    imageUrl: 'https://provider.test/ho-oh.webp',
    frontImageUrl: frontImageUrl,
    imageDisplayMode: imageDisplayMode,
  );
}

VaultGvviData _vaultGvviData({
  GvviImageDisplayMode imageDisplayMode = GvviImageDisplayMode.canonical,
  String? frontImageUrl,
}) {
  return VaultGvviData(
    instanceId: 'instance-1',
    gvviId: 'GV-VI-1',
    vaultItemId: 'vault-item-1',
    activeCopyCount: 1,
    cardPrintId: 'card-1',
    gvId: 'GV-PK-CEL-1',
    cardName: 'Ho-Oh',
    setCode: 'CEL',
    setName: 'Celebrations',
    number: '1',
    intent: 'showcase',
    isGraded: false,
    isArchived: false,
    pricingMode: GvviPricingMode.market,
    isSharedOnWall: true,
    publicProfileEnabled: true,
    vaultSharingEnabled: true,
    outcomes: const <VaultGvviOutcome>[],
    imageUrl: 'https://provider.test/ho-oh.webp',
    frontImageUrl: frontImageUrl,
    imageDisplayMode: imageDisplayMode,
  );
}
