import 'package:supabase_flutter/supabase_flutter.dart';

/// Calls your Edge Functions:
///  - search_cards (returns stub results; hydrates on tap)
///  - hydrate_card (fills in full details when needed)
class CardsService {
  final _client = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> search(String query, {int limit = 20}) async {
    final res = await _client.functions.invoke('search_cards', body: {
      'query': query,
      'limit': limit,
    });

    final data = res.data;
    if (data is! Map<String, dynamic>) return <Map<String, dynamic>>[];
    final list = (data['results'] as List?)?.cast<Map<String, dynamic>>() ?? <Map<String, dynamic>>[];
    return list;
  }

  Future<Map<String, dynamic>> hydrate(String printId) async {
    final res = await _client.functions.invoke('hydrate_card', body: {
      'print_id': printId,
    });
    final data = res.data;
    if (data is Map<String, dynamic>) return data;
    return <String, dynamic>{};
  }
}
