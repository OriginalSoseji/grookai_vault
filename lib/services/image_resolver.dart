import "dart:async";
import "package:http/http.dart" as http;
import 'package:supabase_flutter/supabase_flutter.dart';

/// Resolves a working image URL for a card, trying multiple CDNs/paths.
/// Caches successes to avoid repeated network checks.
class CardImageResolver {
  static final _cache = <String, String>{};

  static Future<String?> resolve({
    required String setCode,
    required String number,
    String? tcgplayerId,
    Duration timeout = const Duration(seconds: 4),
  }) async {
    final sc = CardImageResolver._normalizeSet(setCode);
    final num = CardImageResolver._numSlug(number);
    final key = '$sc|$num|${tcgplayerId ?? ""}';
    if (_cache.containsKey(key)) return _cache[key];

    // Special-case flags
    final isTk2 = (sc == 'ex5pt5' || sc == 'ex5.5');
    final isSLG = (sc == 'sm3.5' || sc == 'sm3pt5');

    final candidates = <String>[
      // --- TCGdex (series-aware) ---
      if (!sc.endsWith('p'))
        if (isTk2)
          'https://assets.tcgdex.net/en/ex/tk2/$num/high.png'
        else
          tcgdexFromSetAndNumber(setCode: sc, number: num),
      if (!sc.endsWith('p'))
        if (isTk2)
          'https://assets.tcgdex.net/en/ex/tk2/$num/high.webp'
        else
          ensureTcgdexImageUrl(
            tcgdexFromSetAndNumber(
              setCode: sc,
              number: num,
            ).replaceAll('/high.png', ''),
          ),

      // --- PokemonTCG.io (aliases + case-flex) ---
      if (isTk2) 'https://images.pokemontcg.io/tk2/${num}_hires.png',
      if (isTk2) 'https://images.pokemontcg.io/tk2/.png',
      if (isSLG) 'https://images.pokemontcg.io/slg/${num}_hires.png',
      if (isSLG) 'https://images.pokemontcg.io/slg/.png',
      'https://images.pokemontcg.io/$sc/${num}_hires.png',
      'https://images.pokemontcg.io/$sc/.png',

      if (tcgplayerId != null && tcgplayerId.isNotEmpty)
        'https://tcgplayer-cdn.tcgplayer.com/product/_in_500x500.jpg',
    ];

    for (final url in candidates) {
      if (await _isReachable(url, timeout)) {
        _cache[key] = url;
        return url;
      }
    }
    return null;
  }

  static Future<bool> _isReachable(String url, Duration timeout) async {
    try {
      final res = await http.head(Uri.parse(url)).timeout(timeout);
      if (res.statusCode == 200) return true;
      if (res.statusCode == 405) {
        final g = await http.get(Uri.parse(url)).timeout(timeout);
        return g.statusCode == 200;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  // --- helpers ---

  static String _normalizeSet(String setCode) {
    final raw = setCode.trim().toLowerCase();
    return raw.replaceAll('.5', 'pt5');
  }

  static String _numSlug(String number) {
    final m = RegExp(r'^0*([0-9]+)([A-Za-z]*)$').firstMatch(number.trim());
    if (m == null) return number.trim();
    final numeric = m.group(1)!;
    final suffix = m.group(2)!;
    final stripped = int.tryParse(numeric)?.toString() ?? numeric;
    return '$stripped$suffix';
  }
}

/// --- Centralized helpers (no network) ---

/// Append quality suffix for tcgdex assets if missing.
String ensureTcgdexImageUrl(String url) {
  final u = url.trim();
  if (u.isEmpty) return u;
  try {
    final uri = Uri.parse(u);
    final host = uri.host.toLowerCase();
    final hasExt = RegExp(
      r"\.(png|jpg|jpeg|webp)$",
      caseSensitive: false,
    ).hasMatch(uri.path);
    if (host.contains('tcgdex.net') && !hasExt) {
      var path = uri.path;
      if (!path.endsWith('/')) path = '$path/';
      return uri
          .replace(
            path:
                '$path'
                'high.png',
          )
          .toString();
    }
  } catch (_) {}
  return u;
}

/// Heuristic tcgdex asset URL from set_code/number.
String tcgdexFromSetAndNumber({
  String lang = 'en',
  required String setCode,
  required String number,
}) {
  final sc = setCode.trim().toLowerCase();
  final num = number.trim().toLowerCase();
  if (RegExp(r'^g\d+$').hasMatch(sc)) {
    return 'https://assets.tcgdex.net/$lang/xy/$sc/$num/high.png';
  }
  if (sc == 'ex5.5' || sc == 'ex5pt5' || sc == 'tk2') {
    return 'https://assets.tcgdex.net/$lang/ex/tk2/$num/high.png';
  }
  if (sc.startsWith('me')) {
    return '';
  }
  String series = 'base';
  if (sc.startsWith('sv')) {
    series = 'sv';
  } else if (sc.startsWith('sm')) {
    series = 'sm';
  } else if (sc.startsWith('bw')) {
    series = 'bw';
  } else if (sc.startsWith('xy')) {
    series = 'xy';
  } else if (sc.startsWith('base')) {
    series = 'base';
  } else {
    series = sc.replaceAll(RegExp(r'[^a-z]'), '');
  }
  return 'https://assets.tcgdex.net/$lang/$series/$sc/$num/high.png';
}

/// Normalizes a raw image URL or storage path into a usable URL.
String toImageUrl(dynamic raw) {
  if (raw == null) return '';
  String s = raw.toString().trim();
  if (s.isEmpty) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) {
    // Rewrite tcgdex URLs to images.pokemontcg.io
    try {
      final u = Uri.parse(s);
      if (u.host.contains('tcgdex.net')) {
        final mapped = _mapTcgdexToPtcg(u);
        if (mapped.isNotEmpty) return mapped;
      }
    } catch (_) {}
    return ensureTcgdexImageUrl(s);
  }
  try {
    // Try common buckets
    final client = Supabase.instance.client;
    // 1) public bucket
    final fromPublic = client.storage.from('public').getPublicUrl(s);
    if (fromPublic.isNotEmpty) return fromPublic;
    // 2) listing-photos bucket
    final fromListing = client.storage.from('listing-photos').getPublicUrl(s);
    if (fromListing.isNotEmpty) return fromListing;
    return '';
  } catch (_) {
    return '';
  }
}

/// Builds best-effort image URL from a DB row.
String imageUrlFromRow(Map row, {String lang = 'en'}) {
  final direct = (row['image_url'] ?? row['photo_url'] ?? row['image'] ?? '')
      .toString()
      .trim();
  if (direct.isNotEmpty) return toImageUrl(direct);
  final path = (row['image_path'] ?? '').toString().trim();
  if (path.isNotEmpty) return toImageUrl(path);
  final setCode = (row['set_code'] ?? row['set'] ?? row['set_name'] ?? '')
      .toString()
      .trim();
  final number = (row['number'] ?? row['collector_number'] ?? '')
      .toString()
      .trim();
  if (setCode.isNotEmpty && number.isNotEmpty) {
    // Prefer images.pokemontcg.io directly
    final sc = _normalizeSet(setCode);
    final num = _numSlug(number);
    final slug = _mapKnownSet(sc);
    return 'https://images.pokemontcg.io/$slug/$num.png';
  }
  return '';
}

// --- Mapping helpers for tcgdex -> images.pokemontcg.io ---
String _mapKnownSet(String setCode) {
  final s = setCode.toLowerCase();
  if (s == 'lc') return 'base6';
  if (s == 'bs' || s == 'base') return 'base1';
  return s;
}

String _mapTcgdexToPtcg(Uri url) {
  try {
    final segs = url.pathSegments.where((e) => e.isNotEmpty).toList();
    if (segs.length < 4) return '';
    // ex: /en/ex/ex2/72 -> set=ex2, num=72
    final setCode = segs[2].toLowerCase();
    final numRaw = segs[3].toLowerCase();
    final slug = _mapKnownSet(setCode);
    final m = RegExp(r'^0*([0-9]+)([a-z]*)$').firstMatch(numRaw);
    final numSlug = (m != null) ? '${int.parse(m.group(1)!)}${m.group(2)!}' : numRaw;
    return 'https://images.pokemontcg.io/$slug/$numSlug.png';
  } catch (_) {
    return '';
  }
}
