import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/scanner/perceptual_image_hash.dart';
import 'package:grookai_vault/services/scanner/recent_scan_cache.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const fixtureRoot = 'test/fixtures/scanner_cache';
  const generatedRoot = '$fixtureRoot/generated';
  const ruffletNormal = 'rufflet_normal.jpg';
  const ruffletVariants = <String>[
    'rufflet_brightness.jpg',
    'rufflet_closer_crop.jpg',
    'rufflet_farther_padded.jpg',
    'rufflet_shifted_left.jpg',
    'rufflet_shifted_right.jpg',
    'rufflet_slight_rotation.jpg',
  ];

  Future<Uint8List> readFixture(String path) {
    return File(path).readAsBytes();
  }

  Future<String> normalizedHash(String path) async {
    final bytes = await readFixture(path);
    return PerceptualImageHash.hashNormalizedCardRegion(bytes);
  }

  Future<String> rawHash(String path) async {
    final bytes = await readFixture(path);
    return PerceptualImageHash.computeDHash(Uint8List.fromList(bytes));
  }

  Future<int> normalizedDistanceFromRufflet(String name) async {
    final rufflet = await normalizedHash('$generatedRoot/$ruffletNormal');
    final variant = await normalizedHash('$generatedRoot/$name');
    return PerceptualImageHash.hammingDistance(rufflet, variant);
  }

  test('same exact image hashes equal', () async {
    final first = await normalizedHash('$generatedRoot/$ruffletNormal');
    final second = await normalizedHash('$generatedRoot/$ruffletNormal');

    expect(first, second);
  });

  test('normalized Rufflet variants are within cache threshold', () async {
    final distances = <String, int>{};
    for (final variant in ruffletVariants) {
      distances[variant] = await normalizedDistanceFromRufflet(variant);
    }
    // ignore: avoid_print
    print('normalized distances: $distances');

    for (final entry in distances.entries) {
      expect(
        entry.value,
        lessThanOrEqualTo(RecentScanCache.defaultMaxHammingDistance),
        reason: '${entry.key} normalized distance=${entry.value}',
      );
    }
  });

  test('raw hash may miss crop and shift variants', () async {
    final base = await rawHash('$generatedRoot/$ruffletNormal');
    final rawDistances = <String, int>{};
    for (final variant in [
      'rufflet_closer_crop.jpg',
      'rufflet_farther_padded.jpg',
      'rufflet_shifted_left.jpg',
      'rufflet_shifted_right.jpg',
    ]) {
      final variantHash = await rawHash('$generatedRoot/$variant');
      rawDistances[variant] = PerceptualImageHash.hammingDistance(
        base,
        variantHash,
      );
    }
    // ignore: avoid_print
    print('raw distances: $rawDistances');

    expect(
      rawDistances.values.any(
        (distance) => distance > RecentScanCache.defaultMaxHammingDistance,
      ),
      isTrue,
      reason: 'raw dHash should not be trusted for shifted/cropped captures',
    );
  });

  test('different card is above cache threshold', () async {
    final rufflet = await normalizedHash('$generatedRoot/$ruffletNormal');
    final tynamo = await normalizedHash('$fixtureRoot/tynamo_1.jpg');
    final distance = PerceptualImageHash.hammingDistance(rufflet, tynamo);
    // ignore: avoid_print
    print('tynamo normalized distance: $distance');

    expect(distance, greaterThan(RecentScanCache.defaultMaxHammingDistance));
  });

  test(
    'RecentScanCache returns cached Rufflet for generated variants',
    () async {
      final rufflet = await normalizedHash('$generatedRoot/$ruffletNormal');
      final cachedCard = CachedCard(
        name: "Larry's Rufflet",
        setCode: 'J',
        number: '173/217',
        confidence: 0.99,
        lastSeen: DateTime(2026, 4, 25),
      );

      RecentScanCache.put(rufflet, cachedCard);

      for (final variant in ruffletVariants) {
        final hash = await normalizedHash('$generatedRoot/$variant');
        final hit = RecentScanCache.findByFingerprint(hash);
        expect(hit, isNotNull, reason: '$variant should hit Rufflet cache');
        expect(hit!.card, same(cachedCard));
        expect(
          hit.distance,
          lessThanOrEqualTo(RecentScanCache.defaultMaxHammingDistance),
          reason: '$variant cache distance=${hit.distance}',
        );
      }
    },
  );

  test('RecentScanCache does not return Rufflet for Tynamo', () async {
    final rufflet = await normalizedHash('$generatedRoot/$ruffletNormal');
    final tynamo = await normalizedHash('$fixtureRoot/tynamo_1.jpg');
    final cachedCard = CachedCard(
      name: "Larry's Rufflet",
      setCode: 'J',
      number: '173/217',
      confidence: 0.99,
      lastSeen: DateTime(2026, 4, 25),
    );

    RecentScanCache.put(rufflet, cachedCard);

    expect(RecentScanCache.get(tynamo), isNull);
  });
}
