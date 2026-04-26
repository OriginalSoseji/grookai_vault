import 'perceptual_image_hash.dart';

class CachedCard {
  const CachedCard({
    required this.name,
    required this.setCode,
    required this.number,
    required this.confidence,
    required this.lastSeen,
  });

  final String name;
  final String setCode;
  final String number;
  final double confidence;
  final DateTime lastSeen;

  String get identityKey => '${setCode.trim()}-${number.trim()}:${name.trim()}';

  String get displayLabel {
    final identity = [
      setCode,
      number,
    ].where((part) => part.trim().isNotEmpty).join('-');
    return identity.isEmpty ? name : '$identity: $name';
  }
}

class RecentScanCacheHit {
  const RecentScanCacheHit({
    required this.fingerprint,
    required this.card,
    required this.distance,
  });

  final String fingerprint;
  final CachedCard card;
  final int distance;
}

class RecentScanCache {
  RecentScanCache._();

  static const int defaultMaxHammingDistance = 9;

  static final Map<String, CachedCard> _fingerprintCache = {};

  static void put(String fingerprint, CachedCard value) {
    _fingerprintCache[fingerprint] = value;
  }

  static CachedCard? get(String fingerprint) {
    return findByFingerprint(fingerprint)?.card;
  }

  static RecentScanCacheHit? findByFingerprint(
    String fingerprint, {
    int maxDistance = defaultMaxHammingDistance,
  }) {
    RecentScanCacheHit? bestHit;
    for (final entry in _fingerprintCache.entries) {
      final distance = PerceptualImageHash.hammingDistance(
        fingerprint,
        entry.key,
      );
      if (distance > maxDistance) {
        continue;
      }
      if (bestHit == null || distance < bestHit.distance) {
        bestHit = RecentScanCacheHit(
          fingerprint: entry.key,
          card: entry.value,
          distance: distance,
        );
      }
    }
    return bestHit;
  }
}
