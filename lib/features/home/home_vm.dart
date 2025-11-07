import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/core/ui_contracts.dart';
import 'package:grookai_vault/core/telemetry.dart';

class HomeVm {
  final SupabaseClient client;
  final ValueNotifier<LoadState<List<PriceMoveView>>> priceMovers =
      ValueNotifier<LoadState<List<PriceMoveView>>>(LoadState.idle());
  final ValueNotifier<LoadState<List<Map<String, dynamic>>>> wallItems =
      ValueNotifier<LoadState<List<Map<String, dynamic>>>>(LoadState.idle());

  HomeVm(this.client);

  Future<void> load() async {
    await Future.wait([_loadMovers(), _loadWall()]);
  }

  Future<void> _loadMovers() async {
    priceMovers.value = LoadState.loading();
    try {
      final data = await client
          .from('v_price_movers')
          .select('card_id,name,set_code,delta_pct,current')
          .limit(20)
          .timeout(const Duration(seconds: 8));
      final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      if (list.isEmpty) throw Exception('fallback');
      final mapped = list
          .map((r) => PriceMoveView(
                cardId: (r['card_id'] ?? '').toString(),
                name: (r['name'] ?? 'Card').toString(),
                setCode: (r['set_code'] ?? '').toString(),
                deltaPct: ((r['delta_pct'] ?? 0) as num).toDouble(),
                current: (r['current'] ?? 0) as num,
              ))
          .toList();
      priceMovers.value = LoadState.data(mapped);
      Telemetry.log('movers_success', {'count': mapped.length});
    } catch (_) {
      // Debug fallback: synthesize from recent vault items
      try {
        final uid = client.auth.currentUser?.id;
        final data = uid == null
            ? const []
            : await client
                .from('v_vault_items')
                .select('card_id,name,set_code,market_price')
                .eq('user_id', uid)
                .order('created_at', ascending: false)
                .limit(10)
                .timeout(const Duration(seconds: 8));
        final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
        final rnd = Random();
        final mapped = list
            .map((r) => PriceMoveView(
                  cardId: (r['card_id'] ?? '').toString(),
                  name: (r['name'] ?? 'Card').toString(),
                  setCode: (r['set_code'] ?? '').toString(),
                  deltaPct: (rnd.nextInt(5) - 2).toDouble(),
                  current: (r['market_price'] ?? 0) as num,
                ))
            .toList();
        priceMovers.value = LoadState.data(mapped);
      } catch (_) {
        priceMovers.value = LoadState.data(const <PriceMoveView>[]);
      }
    }
  }

  Future<void> _loadWall() async {
    wallItems.value = LoadState.loading();
    try {
      final data = await client
          .from('wall_feed_view')
          .select('listing_id, card_id, title, price_cents, thumb_url, created_at')
          .limit(20)
          .timeout(const Duration(seconds: 8));
      final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      wallItems.value = LoadState.data(list);
    } catch (_) {
      wallItems.value = LoadState.data(const <Map<String, dynamic>>[]);
    }
  }
}
