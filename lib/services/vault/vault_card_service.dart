import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class VaultCardIdentity {
  const VaultCardIdentity({
    required this.cardId,
    required this.gvId,
    required this.name,
    required this.setName,
    this.number,
    this.imageUrl,
  });

  final String cardId;
  final String gvId;
  final String name;
  final String setName;
  final String? number;
  final String? imageUrl;

  factory VaultCardIdentity.fromJson(Map<String, dynamic> json) {
    final set = json['set'] as Map<String, dynamic>?;
    final setName = (set?['name'] ?? json['set_name'] ?? json['set_code'] ?? '')
        .toString();
    final imageUrl = (json['image_url'] ?? json['image_alt_url'])?.toString();
    return VaultCardIdentity(
      cardId: (json['id'] ?? '').toString(),
      gvId: (json['gv_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      setName: setName,
      number: json['number_plain']?.toString() ?? json['number']?.toString(),
      imageUrl: imageUrl == null || imageUrl.isEmpty ? null : imageUrl,
    );
  }
}

class VaultCardService {
  static const _canonicalSelect =
      'id,gv_id,name,set_code,number,number_plain,image_url,image_alt_url,set:sets(name,code)';

  static Future<VaultCardIdentity> resolveCanonicalCard({
    required SupabaseClient client,
    required String cardId,
  }) async {
    final row = await client
        .from('card_prints')
        .select(_canonicalSelect)
        .eq('id', cardId)
        .maybeSingle();

    if (row == null) {
      throw Exception('Canonical card row not found for card_id=$cardId');
    }

    final identity = VaultCardIdentity.fromJson(Map<String, dynamic>.from(row));
    if (identity.gvId.isEmpty) {
      throw Exception('Canonical card row missing gv_id for card_id=$cardId');
    }

    return identity;
  }

  static Future<Map<String, int>> getOwnedCountsByCardPrintIds({
    required SupabaseClient client,
    required List<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedIds.isEmpty) {
      return const <String, int>{};
    }

    final response = await client.rpc(
      'vault_owned_counts_v1',
      params: {'p_card_print_ids': normalizedIds},
    );

    final counts = <String, int>{};
    if (response is! List) {
      return counts;
    }

    for (final row in response) {
      if (row is! Map<String, dynamic>) {
        continue;
      }

      final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
      final ownedCountRaw = row['owned_count'];
      final ownedCount = ownedCountRaw is num
          ? ownedCountRaw.toInt()
          : int.tryParse(ownedCountRaw?.toString() ?? '');

      if (cardPrintId.isEmpty || ownedCount == null) {
        continue;
      }

      counts[cardPrintId] = ownedCount;
    }

    return counts;
  }

  static Future<List<Map<String, dynamic>>> getCanonicalCollectorRows({
    required SupabaseClient client,
  }) async {
    final response = await client.rpc('vault_mobile_collector_rows_v1');

    if (response is! List) {
      return const <Map<String, dynamic>>[];
    }

    return response
        .whereType<Map<String, dynamic>>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  static Future<String> addOrIncrementVaultItem({
    required SupabaseClient client,
    required String userId,
    required String cardId,
    int deltaQty = 1,
    String conditionLabel = 'NM',
    String? notes,
    String? fallbackName,
    String? fallbackSetName,
    String? fallbackImageUrl,
  }) async {
    final qtyDelta = deltaQty < 1 ? 1 : deltaQty;
    debugPrint('vault.mobile.add.begin: $cardId');

    final result = await client.rpc(
      'vault_add_card_instance_v1',
      params: {
        'p_card_print_id': cardId,
        'p_quantity': qtyDelta,
        'p_condition_label': conditionLabel,
        'p_notes': notes,
        'p_name': fallbackName,
        'p_set_name': fallbackSetName,
        'p_photo_url': fallbackImageUrl,
      },
    );

    if (result is Map<String, dynamic>) {
      final gvviId = (result['gv_vi_id'] ?? '').toString();
      if (gvviId.isNotEmpty) {
        return gvviId;
      }
    }

    return '';
  }

  static Future<void> archiveOneVaultItem({
    required SupabaseClient client,
    required String userId,
    required String vaultItemId,
    required String cardId,
  }) async {
    debugPrint('vault.mobile.archive.begin: $cardId');
    await client.rpc(
      'vault_archive_one_instance_v1',
      params: {'p_vault_item_id': vaultItemId, 'p_card_print_id': cardId},
    );
  }

  static Future<void> archiveAllVaultItems({
    required SupabaseClient client,
    required String userId,
    required String vaultItemId,
    required String cardId,
  }) async {
    debugPrint('vault.mobile.archive.begin: $cardId');
    await client.rpc(
      'vault_archive_all_instances_v1',
      params: {'p_vault_item_id': vaultItemId, 'p_card_print_id': cardId},
    );
  }
}
