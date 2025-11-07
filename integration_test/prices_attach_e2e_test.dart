import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<bool> _viewReachable(SupabaseClient client) async {
  try {
    await client
        .from('latest_card_prices_v')
        .select('card_print_id')
        .limit(1);
    // If no exception thrown, view is reachable
    return true;
  } catch (_) {
    return false;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('prices: view exists + repo attach pipeline works (smoke)', () async {
    final url = Platform.environment['SUPABASE_URL'] ?? '';
    final anon = Platform.environment['SUPABASE_PUBLISHABLE_KEY'] ?? Platform.environment['SUPABASE_ANON_KEY'] ?? '';
    expect(url.isNotEmpty && anon.isNotEmpty, true,
        reason: 'Missing SUPABASE_URL / ANON KEY env for test');

    // Init client directly (no app boot required)
    final client = SupabaseClient(url, anon);

    // 1) View reachable
    final ok = await _viewReachable(client);
    expect(ok, true, reason: 'latest_card_prices_v not reachable');

    // 2) Query 20 sample print IDs from your search SQL RPC (or fallback)
    //    Adjust this to your actual source of card_print_ids
    dynamic sample;
    try {
      sample = await client
          .rpc('list_sample_card_print_ids', params: {'n': 20});
    } catch (_) {
      sample = [];
    }
    List<String> ids = [];
    if (sample is List) {
      ids = sample
          .map((e) => ((e as Map)['card_print_id']).toString())
          .toList();
    }

    // If no RPC exists, fall back to reading any IDs from the view
    if (ids.isEmpty) {
      final rows = await client
          .from('latest_card_prices_v')
          .select('card_print_id')
          .limit(20);
      ids = (rows as List)
          .map((e) => ((e as Map)['card_print_id']).toString())
          .toList();
    }
    expect(ids, isNotEmpty, reason: 'No sample card_print_ids to test');

    // 3) Fetch prices for those IDs (mimics repo attach core)
    final prices = await client
        .from('latest_card_prices_v')
        .select('card_print_id, low, mid, high, grookai_index, gi_confidence')
        .inFilter('card_print_id', ids);

    expect(prices, isA<List>(), reason: 'Prices not a list');
    // Require at least one row to have any price populated
    final hasAnyPrice = (prices as List).any((row) {
      final m = row as Map<String, dynamic>;
      return m['low'] != null || m['mid'] != null || m['high'] != null;
    });
    expect(hasAnyPrice, true,
        reason: 'No price fields populated in sample set');
  });
}
