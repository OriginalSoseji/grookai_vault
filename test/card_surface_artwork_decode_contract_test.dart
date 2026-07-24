import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'card thumbnails preserve source aspect ratio while capping decode width',
    () {
      final source = File(
        'lib/widgets/card_surface_artwork.dart',
      ).readAsStringSync();

      expect(source, contains('memCacheWidth: cacheWidth'));
      expect(source, contains('maxWidthDiskCache: cacheWidth'));
      expect(source, isNot(contains('memCacheHeight:')));
      expect(source, isNot(contains('maxHeightDiskCache:')));
    },
  );

  test('card artwork supports a provider fallback after hosted failure', () {
    final source = File(
      'lib/widgets/card_surface_artwork.dart',
    ).readAsStringSync();

    expect(source, contains('this.fallbackImageUrl'));
    expect(source, contains('final fallback = (fallbackImageUrl ??'));
    expect(source, contains('imageUrl: fallback'));
  });
}
