import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'cards_service.dart';         // lazy (Edge Functions)
import 'legacy_search_service.dart'; // fallback (Supabase SQL/view)

/// Tries lazy-import search first; if it returns nothing or errors,
/// silently falls back to the legacy search.
class SearchGateway {
  final _lazy = CardsService();
  final _legacy = LegacySearchService();

  bool get _useLazy =>
      (dotenv.env['GV_USE_LAZY_SEARCH'] ?? 'true').toLowerCase() == 'true';

  Future<List<Map<String, dynamic>>> search(String query) async {
    if (_useLazy) {
      try {
        final r = await _lazy.search(query);
        if (r.isNotEmpty) {
          _telemetry(hit: true);
          return _normalize(r);
        }
      } catch (e) {
        if (kDebugMode) print('Lazy search error; fallback: $e');
      }
      _telemetry(hit: false);
      final f = await _legacy.search(query);
      return _normalize(f);
    } else {
      final f = await _legacy.search(query);
      return _normalize(f);
    }
  }

  /// Ensure a consistent shape for UI:
  /// { id, set_code, name, number, image_url, lang? }
  List<Map<String, dynamic>> _normalize(List<Map<String, dynamic>> rows) {
    return rows.map<Map<String, dynamic>>((r) {
      return {
        'id'       : r['id'] ?? r['card_id'] ?? r['print_id'],
        'set_code' : r['set_code'] ?? r['set'] ?? r['set_name'] ?? '',
        'name'     : r['name_local'] ?? r['name'] ?? 'Card',
        'number'   : r['number'] ?? '',
        'image_url': r['image_url'] ?? r['photo_url'] ?? '',
        'lang'     : r['lang'] ?? 'en',
      };
    }).toList();
  }

  void _telemetry({required bool hit}) {
    if (kDebugMode) {
      print(hit ? 'telemetry: lazy_hit' : 'telemetry: lazy_miss');
    }
    // Later: send to Supabase (metrics table) if you want.
  }
}
