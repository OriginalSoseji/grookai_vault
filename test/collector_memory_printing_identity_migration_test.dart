import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Memory read RPCs expose only linked vault printing evidence', () {
    final migration = File(
      'supabase/migrations/'
      '20260812183000_collector_memory_printing_identity_v1.sql',
    ).readAsStringSync();

    expect(migration, contains('vii.card_printing_id'));
    expect(migration, contains('cpn.id = vii.card_printing_id'));
    expect(migration, contains('cpn.card_print_id = vii.card_print_id'));
    expect(migration, contains("then 'unassigned'"));
    expect(migration, contains("else 'exact'"));
    expect(migration, contains('cm.user_id = auth.uid()'));
    expect(
      migration,
      contains('interest_graph_collectors_visible_to_viewer_v1'),
    );
    expect(
      migration,
      contains('revoke all on function public.collector_memories_for_owner_v1'),
    );
    expect(migration, contains('from public, anon'));
    expect(migration, isNot(contains('insert into')));
    expect(migration, isNot(contains('update public.')));
    expect(migration, isNot(contains('delete from')));
  });
}
