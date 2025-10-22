import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

class WishlistService {
  final SupabaseClient _client;
  WishlistService([SupabaseClient? client]) : _client = client ?? Supabase.instance.client;

  Future<bool> isWishlisted(String cardId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final row = await _client
          .from('wishlist_items')
          .select('id')
          .eq('user_id', uid)
          .eq('card_id', cardId)
          .maybeSingle();
      return row != null;
    } catch (_) {
      return false;
    }
  }

  Future<bool> toggle(String cardId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw Exception('Not signed in');
    try {
      final existing = await _client
          .from('wishlist_items')
          .select('id')
          .eq('user_id', uid)
          .eq('card_id', cardId)
          .maybeSingle();
      if (existing != null) {
        await _client.from('wishlist_items').delete().eq('id', existing['id']);
        if (kDebugMode) debugPrint('[WISHLIST] removed card_id=$cardId');
        return false;
      } else {
        await _client.from('wishlist_items').insert({'user_id': uid, 'card_id': cardId});
        if (kDebugMode) debugPrint('[WISHLIST] added card_id=$cardId');
        return true;
      }
    } catch (_) {
      // Soft-fail without crash
      return await isWishlisted(cardId);
    }
  }
}

