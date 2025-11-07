import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/core/result.dart';

class AddResult {
  final String vaultItemId;
  const AddResult(this.vaultItemId);
}

class VaultService {
  final SupabaseClient client;
  VaultService(this.client);

  Future<AddResult> addToVault({required String cardId, required String condition, required int qty, String? grade, String? notes}) async {
    final uid = client.auth.currentUser?.id;
    if (uid == null) throw Exception('Not signed in');
    final row = {
      'user_id': uid,
      'card_id': cardId,
      'qty': qty <= 0 ? 1 : qty,
      'condition_label': condition.toUpperCase(),
      if (grade != null && grade.isNotEmpty) 'grade_label': grade,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    final res = await client.from('vault_items').insert(row).select('id').maybeSingle();
    final id = (res is Map ? (res as Map)['id'] : '').toString();
    return AddResult(id);
  }

  Future<bool> toggleWishlist(String cardId) async {
    final uid = client.auth.currentUser?.id;
    if (uid == null) throw Exception('Not signed in');
    final existing = await client
        .from('wishlist_items')
        .select('id')
        .eq('user_id', uid)
        .eq('card_id', cardId)
        .maybeSingle();
    if (existing != null) {
      await client.from('wishlist_items').delete().eq('id', existing['id']);
      return false;
    } else {
      await client.from('wishlist_items').insert({'user_id': uid, 'card_id': cardId});
      return true;
    }
  }

  Future<void> undoAdd({required String vaultItemId}) async {
    await client.from('vault_items').delete().eq('id', vaultItemId);
  }

  Future<Result<bool>> addOrIncrementResult({required String cardId, required int deltaQty}) async {
    final uid = client.auth.currentUser?.id;
    if (uid == null) return const Err('Not signed in');
    // Try to find existing row
    final row = await client
        .from('vault_items')
        .select('id, qty')
        .eq('user_id', uid)
        .eq('card_id', cardId)
        .maybeSingle();
    if (row != null) {
      final id = (row['id'] ?? '').toString();
      final q = (row['qty'] as num?)?.toInt() ?? 0;
      final next = (q + (deltaQty <= 0 ? 1 : deltaQty)).clamp(1, 9999);
      await client.from('vault_items').update({'qty': next}).eq('id', id);
      return const Ok(true);
    } else {
      await addToVault(cardId: cardId, condition: 'NM', qty: deltaQty <= 0 ? 1 : deltaQty);
      return const Ok(true);
    }
  }

  Future<void> addOrIncrement({required String cardId, required int deltaQty, String? conditionLabel}) async {
    final res = await addOrIncrementResult(cardId: cardId, deltaQty: deltaQty);
    if (res is Err) throw Exception(res.message);
  }
}
