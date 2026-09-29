import 'package:supabase_flutter/supabase_flutter.dart';

/// Owner-only exact-copy reads. Never creates or reconciles legacy anchors.
class OwnedCopyReadService {
  static Future<List<Map<String, dynamic>>> load({
    required SupabaseClient client,
    required String cardPrintId,
  }) async {
    final userId = client.auth.currentUser?.id;
    final cardId = cardPrintId.trim();
    if (userId == null || userId.isEmpty || cardId.isEmpty) return const [];
    const pageSize = 200;
    final copies = <String, Map<String, dynamic>>{};
    for (var offset = 0; ;) {
      final response = await client
          .rpc(
            'vault_mobile_card_copies_v1',
            params: {
              'p_card_print_id': cardId,
              // The RPC combines these predicates with OR. Only the canonical parent
              // may select copies; a stale grouped anchor must not broaden the result.
              'p_vault_item_id': null,
            },
          )
          .order('created_at', ascending: false)
          .order('instance_id', ascending: false)
          .range(offset, offset + pageSize - 1);
      if (client.auth.currentUser?.id != userId) {
        throw StateError('Account changed while loading owned copies.');
      }
      if (response is! List) {
        throw StateError('Owned copy read was incomplete.');
      }
      if (response.isEmpty) break;
      final previousCount = copies.length;
      for (final value in response) {
        if (value is! Map ||
            (value['instance_id'] ?? '').toString().trim().isEmpty) {
          throw StateError('Owned copy read returned an invalid identity.');
        }
        final row = Map<String, dynamic>.from(value);
        copies.putIfAbsent(row['instance_id'].toString(), () => row);
      }
      if (copies.length == previousCount) {
        throw StateError('Owned copy pagination did not advance.');
      }
      // A server row cap can be smaller than the requested page. Only an empty
      // page confirms completion; advance by the rows actually returned.
      offset += response.length;
    }
    return copies.values.toList(growable: false);
  }
}
