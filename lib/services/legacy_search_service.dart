import 'package:supabase_flutter/supabase_flutter.dart';

/// Minimal legacy search that queries your existing view/table.
/// Adjust the FROM/SELECT to match your current schema if needed.
class LegacySearchService {
  final _client = Supabase.instance.client;

  /// Returns rows shaped like:
  /// [{ id, set_code, name, number, image_url, ... }]
  Future<List<Map<String, dynamic>>> search(String query, {int limit = 50}) async {
    final s = query.trim();
    if (s.length < 2) return <Map<String, dynamic>>[];

    // Try your search view first if it exists
    // Fallback: use a generic cards view/table
    try {
      final data = await _client
          .from('v_card_search') // <-- if you have this view
          .select('id, set_code, name, number, image_url')
          .or('name.ilike.%$s%,set_code.ilike.%$s%')
          .limit(limit);
      return List<Map<String, dynamic>>.from(data as List);
    } catch (_) {
      // Fallback path: try card_prints directly (if present)
      try {
        final data = await _client
            .from('card_prints')
            .select('id, set_code, name, number, image_url, name_local, lang')
            .or('name.ilike.%$s%,name_local.ilike.%$s%,set_code.ilike.%$s%')
            .limit(limit);
        return List<Map<String, dynamic>>.from(data as List);
      } catch (_) {
        return <Map<String, dynamic>>[];
      }
    }
  }
}
