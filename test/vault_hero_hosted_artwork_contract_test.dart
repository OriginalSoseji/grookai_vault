import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'Manage Card hero uses hosted-first artwork with upload preservation',
    () {
      final source = File(
        'lib/screens/vault/vault_manage_card_screen.dart',
      ).readAsStringSync();
      final thumb = RegExp(
        r'class _CardThumb[\s\S]*?class _ManageImageStatusBadge',
      ).firstMatch(source)!.group(0)!;

      expect(source, contains('resolveCatalogArtwork('));
      expect(source, contains('isCollectorUploadedCardImage('));
      expect(source, contains('_preferredExactCopyImageUrl'));
      expect(source, contains('fallbackImageUrl: artwork.fallbackImageUrl'));
      expect(thumb, contains('CardSurfaceArtwork('));
      expect(thumb, contains('fallbackImageUrl: fallbackImageUrl'));
      expect(thumb, isNot(contains('Image.network(')));
    },
  );

  test('Slab Upgrade hero uses hosted-first artwork with error fallback', () {
    final source = File(
      'lib/screens/vault/slab_upgrade_screen.dart',
    ).readAsStringSync();
    final hero = RegExp(
      r'class _HeroCard[\s\S]*?class _SectionCard',
    ).firstMatch(source)!.group(0)!;

    expect(source, contains('_slabUpgradeArtwork('));
    expect(source, contains('resolveCatalogArtwork('));
    expect(source, contains('isCollectorUploadedCardImage('));
    expect(source, contains('fallbackImageUrl: artwork.fallbackImageUrl'));
    expect(hero, contains('CardSurfaceArtwork('));
    expect(hero, contains('fallbackImageUrl: fallbackImageUrl'));
    expect(hero, isNot(contains('Image.network(')));
  });
}
