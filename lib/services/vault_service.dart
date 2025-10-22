import 'package:supabase_flutter/supabase_flutter.dart';

class VaultService {
  final SupabaseClient _client;
  VaultService(this._client);
  static bool _loggedViewFallback = false;

  /// Adds a card or increments quantity.
  /// Always uses enriched client upsert + qty update (no RPC).
  Future<Map<String, dynamic>?> addOrIncrement({
    required String cardId,
    int deltaQty = 1,
    String conditionLabel = 'NM',
    String? notes,
  }) async {
    final session = _client.auth.currentSession;
    final userId = session?.user.id;
    if (userId == null) {
      // ignore: avoid_print
      print('[UPsert ERR] No user session');
      throw Exception('Not signed in');
    }

    // Enrich with name (and set) to satisfy DBs that enforce NOT NULL on name.
    Map<String, dynamic>? meta;
    try {
      final m = await _client
          .from('card_prints')
          .select('name,set_code')
          .eq('id', cardId)
          .maybeSingle();
      if (m != null) meta = Map<String, dynamic>.from(m);
    } catch (_) {
      try {
        final m = await _client
            .from('v_card_prints')
            .select('name,set_code')
            .eq('id', cardId)
            .maybeSingle();
        if (m != null) meta = Map<String, dynamic>.from(m);
      } catch (_) {
        if (!_loggedViewFallback) {
          // ignore: avoid_print
          print('[VIEW] v_card_prints missing → using card_prints');
          _loggedViewFallback = true;
        }
      }
    }
    final name = (meta?['name'] ?? 'Card').toString();
    final setCode = (meta?['set_code'] ?? '').toString();

    // Ensure row exists or is updated with qty/name
    final payload = {
      'user_id': userId,
      'card_id': cardId,
      'qty': deltaQty > 0 ? deltaQty : 1,
      'condition_label': conditionLabel,
      'name': name,
      if (setCode.isNotEmpty) 'set_name': setCode,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };
    // ignore: avoid_print
    print('[UPSERT] vault_items $payload');
    await _client.from('vault_items').upsert(payload, onConflict: 'user_id,card_id');

    // Load current qty and increment
    final existing = await _client
        .from('vault_items')
        .select('id, qty')
        .eq('user_id', userId)
        .eq('card_id', cardId)
        .maybeSingle();

    final id = existing?['id']?.toString();
    final cur = (existing?['qty'] ?? 0) as int;
    final next = cur + (deltaQty > 0 ? deltaQty : 1);

    if (id == null || id.isEmpty) {
      // ignore: avoid_print
      print('[FALLBACK ERR] Row not found after upsert');
      return null;
    }

    await _client.from('vault_items').update({'qty': next}).eq('id', id);

    final after = await _client.from('vault_items').select('*').eq('id', id).single();

    // ignore: avoid_print
    print('[UPSERT OK] id=$id qty $cur -> $next');
    return Map<String, dynamic>.from(after);
  }

  Future<Map<String, dynamic>?> addItem({
    required String cardId,
    int qty = 1,
    String conditionLabel = 'NM',
    String? notes,
  }) async {
    final session = _client.auth.currentSession;
    final userId = session?.user.id;
    if (userId == null) {
      // ignore: avoid_print
      print('[INSERT ERR] No user session');
      throw Exception('Not signed in');
    }

    // Enrich with name
    Map<String, dynamic>? meta;
    try {
      final m = await _client
          .from('card_prints')
          .select('name,set_code')
          .eq('id', cardId)
          .maybeSingle();
      if (m != null) meta = Map<String, dynamic>.from(m);
    } catch (_) {
      try {
        final m = await _client
            .from('v_card_prints')
            .select('name,set_code')
            .eq('id', cardId)
            .maybeSingle();
        if (m != null) meta = Map<String, dynamic>.from(m);
      } catch (_) {
        if (!_loggedViewFallback) {
          // ignore: avoid_print
          print('[VIEW] v_card_prints missing → using card_prints');
          _loggedViewFallback = true;
        }
      }
    }
    final name = (meta?['name'] ?? 'Card').toString();
    final setCode = (meta?['set_code'] ?? '').toString();

    final payload = {
      'user_id': userId,
      'card_id': cardId,
      'qty': qty,
      'condition_label': conditionLabel,
      'name': name,
      if (setCode.isNotEmpty) 'set_name': setCode,
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };
    // ignore: avoid_print
    print('[INSERT] vault_items $payload');
    final res = await _client.from('vault_items').insert(payload).select().single();
    // ignore: avoid_print
    print('[INSERT OK] $res');
    return Map<String, dynamic>.from(res);
  }

  Future<int> updateQty({required String id, required int next}) async {
    await _client.from('vault_items').update({'qty': next}).eq('id', id);
    // ignore: avoid_print
    print('[UPDATE OK] id=$id next=$next');
    return 1;
  }

  Future<int> deleteItem({required String id}) async {
    await _client.from('vault_items').delete().eq('id', id);
    // ignore: avoid_print
    print('[DELETE OK] id=$id');
    return 1;
  }
}
