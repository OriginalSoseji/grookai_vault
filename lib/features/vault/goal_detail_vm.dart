import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/load_state.dart';
import '../../core/ui_contracts.dart';
import '../../core/adapters.dart';
import '../../core/telemetry.dart';

class GoalDetailVm with ChangeNotifier {
  final String masterSetId;
  GoalDetailVm(this.masterSetId);

  final ValueNotifier<LoadState<List<CardPrintView>>> owned = ValueNotifier(
    LoadState.idle(),
  );
  final ValueNotifier<LoadState<List<CardPrintView>>> missing = ValueNotifier(
    LoadState.idle(),
  );

  Future<void> load() async {
    final client = Supabase.instance.client;
    try {
      owned.value = LoadState.loading();
      missing.value = LoadState.loading();
      // Fetch the prints defined for this master set
      final prints = await client
          .from('master_set_prints')
          .select('set_code, number, lang')
          .eq('master_set_id', masterSetId);
      final list = List<Map<String, dynamic>>.from(
        (prints as List?) ?? const [],
      );
      if (list.isEmpty) {
        owned.value = LoadState.data(const <CardPrintView>[]);
        missing.value = LoadState.data(const <CardPrintView>[]);
        return;
      }

      // Build OR filter to resolve card_print ids
      final pairs = list
          .map(
            (p) => {
              'set': (p['set_code'] ?? '').toString(),
              'num': (p['number'] ?? '').toString(),
            },
          )
          .where((p) => p['set']!.isNotEmpty && p['num']!.isNotEmpty)
          .toList();
      final orParts = pairs
          .map((p) => 'and(set_code.eq.${p['set']},number.eq.${p['num']})')
          .join(',');
      final cpRows = await client
          .from('card_prints')
          .select('id,set_code,number,image_url,image_alt_url,name,lang')
          .or(orParts);
      final cps = List<Map<String, dynamic>>.from(
        (cpRows as List?) ?? const [],
      );
      final ids = cps.map((r) => (r['id'] ?? '').toString()).toList();

      // Owned set from vault_items (use canonical card_id)
      List<String> ownedIds = <String>[];
      if (ids.isNotEmpty) {
        final vi = await client
            .from('vault_items')
            .select('card_id')
            .inFilter('card_id', ids);
        final vilist = List<Map<String, dynamic>>.from(
          (vi as List?) ?? const [],
        );
        ownedIds = vilist
            .map((r) => (r['card_id'] ?? '').toString())
            .toList();
      }

      final ownedViews = cps
          .where((r) => ownedIds.contains((r['id'] ?? '').toString()))
          .map<CardPrintView>((r) => cardPrintFromDb(r))
          .toList();
      final missingViews = cps
          .where((r) => !ownedIds.contains((r['id'] ?? '').toString()))
          .map<CardPrintView>((r) => cardPrintFromDb(r))
          .toList();

      owned.value = LoadState.data(ownedViews);
      missing.value = LoadState.data(missingViews);
      Telemetry.log('goal_detail_load', {
        'owned': ownedViews.length,
        'missing': missingViews.length,
      });
    } catch (e) {
      owned.value = LoadState.error('$e');
      missing.value = LoadState.error('$e');
      Telemetry.log('error', {'where': 'goal_detail_vm.load', 'msg': '$e'});
    }
  }
}
