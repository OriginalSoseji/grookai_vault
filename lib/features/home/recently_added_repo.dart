import 'package:supabase_flutter/supabase_flutter.dart';

class RecentlyAddedRepo {
  final _client = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> fetch({int limit = 50}) async {
    final rows = await _client
        .from('v_recently_added')
        .select('''
          id, created_at,
          name, set_code, number,
          qty, market_price, total,
          image_best, image_url, image_alt_url
        ''')
        .limit(limit);
    return (rows as List).cast<Map<String, dynamic>>();
  }
}
