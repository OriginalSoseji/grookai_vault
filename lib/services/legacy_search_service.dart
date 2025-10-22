import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

/// Minimal legacy search that queries your existing view/table.
/// Adjust the FROM/SELECT to match your current schema if needed.
class LegacySearchService {
  final _client = Supabase.instance.client;

  /// Returns rows shaped like:
  /// [{ id, set_code, name, number, image_url, ... }]
  Future<List<Map<String, dynamic>>> search(
    String query, {
    int limit = 50,
  }) async {
    final s = query.trim();
    if (s.length < 2) return <Map<String, dynamic>>[];

    // Try your search view first if it exists
    // Fallback: use a generic cards view/table
    try {
      if (kDebugMode)
        debugPrint('[HTTP] SQL v_card_search q="$s" limit=$limit');
      final data = await _client
          .from('v_card_search') // view provides image_best
          .select('id, set_code, name, number, rarity, image_best')
          .or('name.ilike.%$s%,set_code.ilike.%$s%')
          .limit(limit);
      return List<Map<String, dynamic>>.from(data as List);
    } catch (e) {
      if (kDebugMode) debugPrint('[LAZY] v_card_search error: $e');
      // Fallback path: try card_prints directly (if present)
      try {
        if (kDebugMode)
          debugPrint('[HTTP] SQL card_prints q="$s" limit=$limit');
        final data = await _client
            .from('card_prints')
            .select(
              'id, set_code, name, number, image_url, image_alt_url, name_local, lang',
            )
            .or('name.ilike.%$s%,name_local.ilike.%$s%,set_code.ilike.%$s%')
            .limit(limit);
        final list = List<Map<String, dynamic>>.from(data as List);
        // synthesize image_best from url/alt_url
        return list
            .map(
              (r) => {
                ...r,
                'image_best': (r['image_url'] ?? r['image_alt_url'] ?? ''),
              },
            )
            .toList();
      } catch (e2) {
        if (kDebugMode) debugPrint('[LAZY] card_prints error: $e2');
        return <Map<String, dynamic>>[];
      }
    }
  }
}
