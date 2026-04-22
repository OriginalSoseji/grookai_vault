import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';

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
}
