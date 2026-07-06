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

  test('optimized image URLs can be resized for thumbnail surfaces', () {
    const original =
        'https://example.supabase.co/storage/v1/object/public/public-card-images/jpn/pikachu.webp';
    final large = normalizeDisplayImageUrl(original);
    final thumbnail = normalizeDisplayImageUrl(large, width: 256);

    expect(large, contains('w=828'));
    expect(thumbnail, contains('w=256'));
    expect(thumbnail, contains(Uri.encodeQueryComponent(original)));
  });

  test('private user-card-images public URLs are rejected', () {
    const original =
        'https://example.supabase.co/storage/v1/object/public/user-card-images/jpn/pikachu.webp';

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
