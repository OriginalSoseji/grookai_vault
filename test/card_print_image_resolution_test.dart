import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/services/identity/image_presentation.dart';
import 'package:grookai_vault/utils/display_image_contract.dart';

void main() {
  test('display_image_url is preferred over legacy image fields', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-1',
      'name': 'Pikachu',
      'set_code': 'base1',
      'image_url': 'https://example.com/legacy.webp',
      'image_alt_url': 'https://example.com/alt.webp',
      'representative_image_url': 'https://example.com/rep.webp',
      'display_image_url': 'https://example.com/display.webp',
      'display_image_kind': 'exact',
    });

    expect(card.displayImage, 'https://example.com/display.webp');
  });

  test('representative image is used when exact image fields are missing', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-2',
      'name': 'Aerodactyl',
      'set_code': 'fo',
      'image_url': null,
      'image_alt_url': null,
      'representative_image_url': 'https://example.com/representative.webp',
      'display_image_kind': 'representative',
    });

    expect(card.displayImage, 'https://example.com/representative.webp');
  });

  test('legacy image_url remains a fallback when display field is absent', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-3',
      'name': 'Mewtwo',
      'set_code': 'base',
      'image_url': 'https://example.com/exact.webp',
      'image_alt_url': 'https://example.com/alt.webp',
    });

    expect(card.displayImage, 'https://example.com/exact.webp');
  });

  test('image_alt_url remains a fallback after image_url', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-5',
      'name': 'Bulbasaur',
      'set_code': 'base',
      'display_image_url': null,
      'image_url': null,
      'image_alt_url': 'https://example.com/alt.webp',
      'representative_image_url': 'https://example.com/representative.webp',
    });

    expect(card.displayImage, 'https://example.com/alt.webp');
  });

  test('relative Grookai canon image URLs are accepted by the app', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-7',
      'name': 'Pikachu',
      'set_code': 'jpn-sv8',
      'display_image_url':
          '/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fjpn%2Fsv8%2F033.webp',
    });

    expect(
      card.displayImage,
      'https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fjpn%2Fsv8%2F033.webp',
    );
  });

  test('warehouse image_path is preferred over stale legacy storage URLs', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-8',
      'name': 'Pikachu',
      'set_code': 'jpn-sv8',
      'image_path': 'warehouse-derived/self-hosted-images-v1/jpn/sv8/033.webp',
      'image_url':
          'https://example.supabase.co/storage/v1/object/public/user-card-images/jpn/sv8/033.webp',
    });

    expect(
      card.displayImage,
      'https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fjpn%2Fsv8%2F033.webp',
    );
  });

  test('canonical GV-ID image URLs use the Grookai hosted image boundary', () {
    expect(
      buildCanonicalCardImageUrl(' gv-pk-cri-120 '),
      'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
    );
    expect(buildCanonicalCardImageUrl('not-a-gv-id'), isNull);
  });

  test(
    'hosted card thumbnails use Grookai derivatives while full art stays raw',
    () {
      const hosted =
          'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image';

      expect(normalizeDisplayImageUrl(hosted), hosted);

      final thumbnail = normalizeDisplayImageUrl(hosted, width: 220);
      expect(thumbnail, startsWith('https://grookaivault.com/_next/image?'));
      expect(
        thumbnail,
        contains('url=%2Fapi%2Fcanon%2Fcards%2FGV-PK-CRI-120%2Fimage'),
      );
      expect(thumbnail, contains('w=220'));
    },
  );

  test('immutable warehouse thumbnails also use Grookai derivatives', () {
    const hosted =
        'https://grookaivault.com/api/canon/image?'
        'path=warehouse-derived%2Fself-hosted-images-v1%2Fcard_prints%2F'
        'mcd14%2Fgv-pk-mcd-2014-1%2Ff55b1308c350fab96b27bdcd.png';

    expect(normalizeDisplayImageUrl(hosted), hosted);

    final thumbnail = normalizeDisplayImageUrl(hosted, width: 220);
    expect(thumbnail, startsWith('https://grookaivault.com/_next/image?'));
    expect(thumbnail, contains('url=%2Fapi%2Fcanon%2Fimage%3Fpath%3D'));
    expect(thumbnail, contains('w=220'));
  });

  test('invalid and missing image fields resolve to null', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-4',
      'name': 'No Image',
      'set_code': 'test',
      'display_image_url': 'storage/private/path.webp',
      'image_url': '',
      'image_alt_url': null,
      'representative_image_url': null,
    });

    expect(card.displayImage, isNull);
  });

  test('public Supabase storage images are routed through Grookai optimizer', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'card-6',
      'name': 'Pikachu',
      'set_code': 'sv',
      'display_image_url':
          'https://example.supabase.co/storage/v1/object/public/public-card-images/jpn/pikachu.webp',
    });

    expect(
      card.displayImage,
      startsWith('https://grookaivault.com/_next/image?'),
    );
    expect(card.displayImage, contains('w=828'));
  });

  test('optimized image URLs snap thumbnail widths to supported web sizes', () {
    const original =
        'https://example.supabase.co/storage/v1/object/public/public-card-images/jpn/pikachu.webp';
    final large = normalizeDisplayImageUrl(original);
    final thumbnail = normalizeDisplayImageUrl(large, width: 256);

    expect(large, contains('w=828'));
    expect(thumbnail, contains('w=320'));
    expect(thumbnail, contains(Uri.encodeQueryComponent(original)));
  });

  test('TCGdex base image URLs resolve to the high WebP asset', () {
    const original = 'https://assets.tcgdex.net/en/me/me04/120';
    final resolved = normalizeDisplayImageUrl(original);

    expect(resolved, startsWith('https://grookaivault.com/_next/image?'));
    expect(
      resolved,
      contains(
        Uri.encodeQueryComponent(
          'https://assets.tcgdex.net/en/me/me04/120/high.webp',
        ),
      ),
    );
  });

  test('TCGdex high image suffix is not duplicated', () {
    const original = 'https://assets.tcgdex.net/en/me/me04/120/high.webp';
    final resolved = normalizeDisplayImageUrl(original);

    expect(resolved, isNot(contains('high.webp/high.webp')));
  });

  test('TCGdex set logos are not rewritten as card artwork', () {
    const original = 'https://assets.tcgdex.net/en/me/me04/logo.png';
    final resolved = normalizeDisplayImageUrl(original);

    expect(resolved, contains(Uri.encodeQueryComponent(original)));
    expect(resolved, isNot(contains('logo.png%2Fhigh.webp')));
  });

  test('set logo URLs use Grookai static hosting', () {
    expect(
      buildHostedSetLogoUrl(' ME04 '),
      'https://grookaivault.com/set-logos/me04.png',
    );
    expect(buildHostedSetLogoUrl('../me04'), isNull);
  });

  test('private catalog public URLs use the secure Grookai proxy', () {
    const original =
        'https://example.supabase.co/storage/v1/object/public/user-card-images/warehouse-derived/self-hosted-images-v1/jpn/pikachu.webp';

    expect(
      normalizeDisplayImageUrl(original),
      'https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fjpn%2Fpikachu.webp',
    );
  });

  test('image-truth catalog URLs use the secure Grookai proxy', () {
    const original =
        'https://example.supabase.co/storage/v1/object/public/user-card-images/warehouse-derived/image-truth-v1/exact/pikachu.webp';

    expect(
      normalizeDisplayImageUrl(original),
      'https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fimage-truth-v1%2Fexact%2Fpikachu.webp',
    );
  });

  test('private non-catalog public URLs remain rejected', () {
    const original =
        'https://example.supabase.co/storage/v1/object/public/user-card-images/users/user-1/vault-instances/item-1/front/current';

    expect(normalizeDisplayImageUrl(original), isNull);
  });

  test('nested optimized private catalog URLs still use the secure proxy', () {
    const privateCatalogUrl =
        'https://example.supabase.co/storage/v1/object/public/user-card-images/warehouse-derived/self-hosted-images-v1/jpn/pikachu.webp';
    final optimizedUrl = Uri.https(
      'grookaivault.com',
      '/_next/image',
      <String, String>{'url': privateCatalogUrl, 'w': '828', 'q': '85'},
    ).toString();

    expect(
      normalizeDisplayImageUrl(optimizedUrl),
      'https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fjpn%2Fpikachu.webp',
    );
  });

  test('nested optimized private personal URLs remain rejected', () {
    const privatePersonalUrl =
        'https://example.supabase.co/storage/v1/object/public/user-card-images/users/user-1/vault-instances/item-1/front/current';
    final optimizedUrl = Uri.https(
      'grookaivault.com',
      '/_next/image',
      <String, String>{'url': privatePersonalUrl, 'w': '828', 'q': '85'},
    ).toString();

    expect(normalizeDisplayImageUrl(optimizedUrl), isNull);
  });

  test('signed catalog URLs become stable proxy URLs before expiry checks', () {
    final expiredPayload = base64Url
        .encode(utf8.encode('{"exp":1}'))
        .replaceAll('=', '');
    final original =
        'https://example.supabase.co/storage/v1/object/sign/user-card-images/warehouse-derived/self-hosted-images-v1/jpn/pikachu.webp?token=header.$expiredPayload.signature';

    expect(
      normalizeDisplayImageUrl(original),
      'https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fjpn%2Fpikachu.webp',
    );
  });

  test('expired signed Supabase image URLs are rejected', () {
    final expiredPayload = base64Url
        .encode(utf8.encode('{"exp":1}'))
        .replaceAll('=', '');
    final original =
        'https://example.supabase.co/storage/v1/object/sign/user-card-images/jpn/pikachu.webp?token=header.$expiredPayload.signature';

    expect(normalizeDisplayImageUrl(original), isNull);
  });

  test('representative image presentation is explicit and honest', () {
    final presentation = resolveImagePresentationFromFields(
      representativeImageUrl: 'https://example.com/representative.webp',
      displayImageKind: 'representative',
      imageStatus: 'representative_same_card',
    );

    expect(presentation.compactBadgeLabel, 'Representative Image');
    expect(presentation.detailBadgeLabel, 'Representative Image');
    expect(
      presentation.detailNote,
      'Correct printing. Image may not show exact finish, stamp, or parallel.',
    );
  });

  test('missing variant visual image presentation is explicit', () {
    final presentation = resolveImagePresentationFromFields(
      representativeImageUrl: 'https://example.com/base.webp',
      displayImageKind: 'missing_variant_visual',
    );

    expect(presentation.isRepresentative, isTrue);
    expect(presentation.isMissingVariantVisual, isTrue);
    expect(presentation.compactBadgeLabel, 'Variant Image Pending');
    expect(presentation.detailBadgeLabel, 'Variant Image Pending');
    expect(
      presentation.detailNote,
      'This is the printing, but not the correct variant image.',
    );
  });

  test('blocked image presentation is not treated as exact', () {
    final presentation = resolveImagePresentationFromFields(
      representativeImageUrl: 'https://example.com/review.webp',
      imageStatus: 'blocked_source_identity_conflict',
    );

    expect(presentation.isBlocked, isTrue);
    expect(presentation.isRepresentative, isFalse);
    expect(presentation.compactBadgeLabel, 'Image Under Review');
    expect(presentation.detailBadgeLabel, 'Image Under Review');
  });
}
