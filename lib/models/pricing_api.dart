import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/price_option.dart';

class PricingApi {
  final SupabaseClient _sb;
  PricingApi(this._sb);

  Future<bool> allowClientConditionEdits() async {
    final rows =
        await _sb
                .from('app_settings')
                .select('allow_client_condition_edits')
                .limit(1)
            as List;
    if (rows.isNotEmpty) {
      return rows.first['allow_client_condition_edits'] == true;
    }
    return false;
  }

  Future<List<PriceOption>> getAllPricesForCard(String cardId) async {
    final res = await _sb.rpc(
      'get_all_prices_for_card',
      params: {'p_card_id': cardId},
    );
    final list = (res as List).cast<Map<String, dynamic>>();
    return list.map((m) => PriceOption.fromJson(m)).toList();
  }

  Future<void> setItemCondition({
    required String vaultItemId,
    required String conditionLabel, // e.g., 'LP'
    required String cardId,
    double? marketPrice, // optional: user-entered override
  }) async {
    await _sb.rpc(
      'rpc_set_item_condition',
      params: {
        'p_vault_item_id': vaultItemId,
        'p_condition_label': conditionLabel,
        'p_card_id': cardId,
        'p_market_price': marketPrice,
      },
    );
  }
}
