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
    final identity = await resolveCanonicalCard(client: client, cardId: cardId);
    final qtyDelta = deltaQty < 1 ? 1 : deltaQty;

    final existing = await client
        .from('vault_items')
        .select('id,qty,condition_label')
        .eq('user_id', userId)
        .eq('gv_id', identity.gvId)
        .maybeSingle();

    if (existing != null) {
      final row = Map<String, dynamic>.from(existing);
      final currentQty = (row['qty'] as num?)?.toInt() ?? 0;
      final payload = <String, dynamic>{
        'qty': currentQty + qtyDelta,
        'gv_id': identity.gvId,
        'card_id': identity.cardId,
      };
      await client.from('vault_items').update(payload).eq('id', row['id']);
      return (row['id'] ?? '').toString();
    }

    final payload = <String, dynamic>{
      'user_id': userId,
      'gv_id': identity.gvId,
      'card_id': identity.cardId,
      'name': identity.name.isNotEmpty
          ? identity.name
          : (fallbackName ?? 'Card'),
      'set_name': identity.setName.isNotEmpty
          ? identity.setName
          : (fallbackSetName ?? ''),
      'photo_url': identity.imageUrl ?? fallbackImageUrl,
      'qty': qtyDelta,
      'condition_label': conditionLabel,
    };

    if (notes != null && notes.isNotEmpty) {
      payload['notes'] = notes;
    }

    final inserted = await client
        .from('vault_items')
        .insert(payload)
        .select('id')
        .single();
    return (inserted['id'] ?? '').toString();
  }
}
