import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/public_sets_service.dart';
import 'package:grookai_vault/utils/display_image_contract.dart';

void main() {
  test('verified canonical cover is primary, not behind a missing legacy logo', () {
    for (final entry in {
      '30c': 'GV-PK-30C-152',
      '30c-classic': 'GV-PK-30C-CLASSIC-004-102',
    }.entries) {
      final cover = buildCanonicalCardImageUrl(entry.value)!;
      final set = PublicSetSummary(
        code: entry.key,
        name: 'Anniversary',
        cardCount: 30,
        heroImageUrl: cover,
      );
      expect(set.hostedHeroImageUrl, cover);
      expect(set.providerHeroFallbackImageUrl, buildHostedSetLogoUrl(entry.key));
    }
  });

  test('legacy and noncanonical provider covers retain hosted-first behavior', () {
    for (final cover in [null, 'https://example.test/provider.png']) {
      final set = PublicSetSummary(
        code: 'base1', name: 'Base', cardCount: 102, heroImageUrl: cover,
      );
      expect(set.hostedHeroImageUrl, buildHostedSetLogoUrl('base1'));
      expect(set.providerHeroFallbackImageUrl, cover);
    }
  });

  test('same-origin lookalike paths are not promoted to canonical covers', () {
    final cover = buildCanonicalCardImageUrl('GV-PK-MEW-001')!
        .replaceFirst('/api/canon/cards/', '/api/other/cards/');
    final set = PublicSetSummary(code: 'mew', name: '151', cardCount: 151, heroImageUrl: cover);
    expect(set.hostedHeroImageUrl, buildHostedSetLogoUrl('mew'));
  });
}
