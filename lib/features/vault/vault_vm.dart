import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/core/ui_contracts.dart';
import 'package:grookai_vault/core/adapters.dart';
import 'package:grookai_vault/core/telemetry.dart';

class VaultVm {
  final SupabaseClient client;
  final ValueNotifier<LoadState<List<VaultItemView>>> items =
      ValueNotifier<LoadState<List<VaultItemView>>>(LoadState.idle());
  List<Map<String, Object>> progress = const [];

  VaultVm(this.client);

  Future<void> load() async {
    items.value = LoadState.loading();
    try {
      final uid = client.auth.currentUser?.id;
      if (uid == null) {
        items.value = LoadState.data(const []);
        return;
      }
      final data = await client
          .from('v_vault_items')
          .select('id,card_id,qty,name,set_code,number,image_url,market_price')
          .eq('user_id', uid)
          .order('created_at', ascending: false);
      final list = List<Map<String, dynamic>>.from((data as List?) ?? const []);
      final views = list.map(vaultItemFromDb).toList();
      // Load per-set totals (view may not exist in dev env; handle safely)
      Map<String, int> totals = {};
      try {
        final rows = await client
            .from('v_set_print_counts')
            .select('set_code,total_prints');
        final list = List<Map<String, dynamic>>.from(
          (rows as List?) ?? const [],
        );
        totals = {
          for (final r in list)
            (r['set_code'] ?? '').toString(): (r['total_prints'] ?? 0) as int,
        };
      } catch (_) {
        totals = {};
      }
      progress = _buildProgress(views, totals);
      items.value = LoadState.data(views);
      Telemetry.log('vault_view', {
        'count': views.length,
        'sets': progress.length,
      });
    } catch (e) {
      items.value = LoadState.error('Failed to load vault');
      Telemetry.log('error', {'at': 'vault.load', 'msg': e.toString()});
    }
  }

  Future<void> reload() => load();

  List<Map<String, Object>> _buildProgress(
    List<VaultItemView> items,
    Map<String, int> totals,
  ) {
    final haveBySet = <String, Set<String>>{};
    for (final it in items) {
      if (it.setCode.isEmpty) continue;
      haveBySet.putIfAbsent(it.setCode, () => <String>{}).add(it.cardId);
    }
    final out = <Map<String, Object>>[];
    totals.forEach((set, total) {
      final have = haveBySet[set]?.length ?? 0;
      final pct = total == 0 ? 0.0 : (have * 100.0 / total);
      out.add({'setCode': set, 'percent': pct, 'have': have, 'total': total});
    });
    out.sort(
      (a, b) => (b['percent'] as double).compareTo(a['percent'] as double),
    );
    return out;
  }
}
