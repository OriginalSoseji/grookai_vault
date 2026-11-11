import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/vault_manage_artwork.dart';

void main() {
  test('only exact child printing artwork is eligible for the copy hero', () {
    expect(
      exactManagePrintingImageUrl({
        'image_status': 'exact',
        'display_image_url': 'https://images.example/exact-holo.webp',
      }),
      'https://images.example/exact-holo.webp',
    );
    expect(
      exactManagePrintingImageUrl({
        'image_status': 'missing_variant_visual',
        'display_image_url': 'https://images.example/base.webp',
      }),
      isNull,
    );
  });

  test('exact child image is primary and canonical parent art is fallback', () {
    final artwork = resolveVaultManageArtwork(
      cardGvId: 'GV-PK-MEP-081',
      parentProviderImageUrl: 'https://images.example/parent.webp',
      exactPrintingImageUrl: 'https://images.example/exact-holo.webp',
    );

    expect(artwork.primaryImageUrl, 'https://images.example/exact-holo.webp');
    expect(
      artwork.fallbackImageUrl,
      'https://grookaivault.com/api/canon/cards/GV-PK-MEP-081/image',
    );
  });

  test('missing child image retains the canonical parent artwork path', () {
    final artwork = resolveVaultManageArtwork(
      cardGvId: 'GV-PK-MEP-081',
      parentProviderImageUrl: 'https://images.example/parent.webp',
    );

    expect(
      artwork.primaryImageUrl,
      'https://grookaivault.com/api/canon/cards/GV-PK-MEP-081/image',
    );
    expect(artwork.fallbackImageUrl, 'https://images.example/parent.webp');
  });
}
