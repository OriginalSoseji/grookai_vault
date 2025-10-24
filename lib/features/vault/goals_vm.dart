import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/load_state.dart';
import '../../core/telemetry.dart';

class GoalProgress {
  final String id;
  final String name;
  final String lang;
  final int have;
  final int total;
  double get percent => total == 0 ? 0 : (have * 100.0 / total);

  GoalProgress({
    required this.id,
    required this.name,
    required this.lang,
    required this.have,
    required this.total,
  });
}

class GoalsVm with ChangeNotifier {
  final ValueNotifier<LoadState<List<GoalProgress>>> goals = ValueNotifier(
    LoadState.idle(),
  );

  Future<void> load() async {
    goals.value = LoadState.loading();
    final client = Supabase.instance.client;
    try {
      final rows = await client
          .from('v_master_set_progress')
          .select('master_set_id,name,lang,have,total')
          .order('name');
      final list = List<Map<String, dynamic>>.from((rows as List?) ?? const []);
      final data = list
          .map<GoalProgress>(
            (r) => GoalProgress(
              id: (r['master_set_id'] ?? '').toString(),
              name: (r['name'] ?? '').toString(),
              lang: (r['lang'] ?? 'en').toString(),
              have: (r['have'] ?? 0) as int,
              total: (r['total'] ?? 0) as int,
            ),
          )
          .toList();
      goals.value = LoadState.data(data);
      Telemetry.log('goals_load_success', {'count': data.length});
    } catch (e) {
      goals.value = LoadState.error('$e');
      Telemetry.log('error', {'where': 'goals_vm.load', 'msg': '$e'});
    }
  }
}
