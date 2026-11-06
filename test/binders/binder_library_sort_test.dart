import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_library_preferences.dart';
import 'package:grookai_vault/widgets/binders/binder_widgets.dart';
import 'binder_library_find_test.dart' as f;
import 'binder_page_picker_test.dart' as picker;

BinderSummary summary(
  String id,
  String title, {
  int completed = 0,
  int total = 12,
  String? updated,
}) => BinderSummary.fromJson({
  'id': id,
  'public_id': id,
  'title': title,
  'viewer_role': 'owner',
  'completed_slots': completed,
  'total_slots': total,
  'updated_at': updated,
});

List<String> titles(WidgetTester tester) => tester
    .widgetList<BinderSummaryCard>(find.byType(BinderSummaryCard))
    .map((card) => card.binder.title)
    .toList();

Future<void> sort(WidgetTester tester, BinderLibrarySort value) async {
  final button = find.byKey(const ValueKey('binder-library-sort'));
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
  await tester.tap(
    find.widgetWithText(CheckedPopupMenuItem<BinderLibrarySort>, value.label),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'recent sorts timestamps across timezones with missing last and stable ties',
    () {
      final rows = [
        summary('missing', 'No timestamp'),
        summary('old', 'Old', updated: '1960-01-01T00:00:00Z'),
        summary('a', 'Same first', updated: '2026-10-27T10:00:00-06:00'),
        summary('b', 'Same second', updated: '2026-10-27T16:00:00Z'),
      ];
      expect(BinderLibrarySort.recent.ordered(rows).map((r) => r.id), [
        'a',
        'b',
        'old',
        'missing',
      ]);
      expect(rows.first.id, 'missing');
      expect(
        BinderLibrarySort.recent
            .ordered([rows.first, summary('next', 'Next')])
            .first
            .id,
        'missing',
      );
    },
  );
  test(
    'name is case insensitive and ties preserve authorized source order',
    () {
      final rows = [
        summary('z', 'Zubat'),
        summary('b', 'eevee'),
        summary('a', 'Eevee'),
        summary('c', 'Alakazam'),
      ];
      expect(BinderLibrarySort.name.ordered(rows).map((r) => r.id), [
        'c',
        'b',
        'a',
        'z',
      ]);
      expect(rows.first.id, 'z');
    },
  );
  test(
    'completion uses exact fractions rather than rounded percentages or raw counts',
    () {
      final rows = [
        summary('a', '100 of 201', completed: 100, total: 201),
        summary('b', '1 of 2', completed: 1, total: 2),
        summary('c', '2 of 4', completed: 2, total: 4),
        summary('empty', 'Empty', total: 0),
        summary('negative', 'Unknown', total: -1),
      ];
      expect(rows.first.completionPercent, 50);
      expect(BinderLibrarySort.completion.ordered(rows).map((r) => r.id), [
        'b',
        'c',
        'a',
        'empty',
        'negative',
      ]);
    },
  );
  test(
    'completion clamps malformed server counters without mutating summaries',
    () {
      final rows = [
        summary('neg', 'Negative', completed: -3),
        summary('over', 'Over', completed: 20),
        summary('half', 'Half', completed: 6),
      ];
      expect(BinderLibrarySort.completion.ordered(rows).map((r) => r.id), [
        'over',
        'half',
        'neg',
      ]);
      expect(rows.first.completedSlots, -3);
    },
  );
  test(
    'unknown stored sort defaults safely; the device stores only the sort key',
    () async {
      SharedPreferences.setMockInitialValues({
        BinderLibraryPreferences.preferenceKey: 'future-sort',
      });
      final prefs = BinderLibraryPreferences();
      await prefs.ensureLoaded();
      expect(prefs.value, BinderLibrarySort.recent);
      expect(await prefs.select(BinderLibrarySort.name), isTrue);
      expect((await SharedPreferences.getInstance()).getKeys(), {
        BinderLibraryPreferences.preferenceKey,
      });
      final next = BinderLibraryPreferences();
      await next.ensureLoaded();
      expect(next.value, BinderLibrarySort.name);
      next.dispose();
      prefs.dispose();
    },
  );
  test('late stored choice cannot replace a newer explicit choice', () async {
    for (final choice in [
      BinderLibrarySort.recent,
      BinderLibrarySort.completion,
    ]) {
      final read = Completer<String?>();
      final prefs = BinderLibraryPreferences(
        read: () => read.future,
        write: (_) async => true,
      );
      final loading = prefs.ensureLoaded();
      await prefs.select(choice);
      read.complete('name');
      await loading;
      expect(prefs.value, choice);
      prefs.dispose();
    }
  });
  test('writes serialize so an older slow choice cannot win', () async {
    final pending = Completer<bool>();
    final writes = <String>[];
    final prefs = BinderLibraryPreferences(
      write: (s) {
        writes.add(s);
        return writes.length == 1 ? pending.future : Future.value(true);
      },
    );
    final a = prefs.select(BinderLibrarySort.name);
    final b = prefs.select(BinderLibrarySort.completion);
    await Future<void>.delayed(Duration.zero);
    expect(writes, ['name']);
    pending.complete(true);
    expect(await a, isTrue);
    expect(await b, isTrue);
    expect(writes, ['name', 'completion']);
    expect(prefs.value, BinderLibrarySort.completion);
    prefs.dispose();
  });
  test(
    'store failure leaves session choice usable and later writes recover',
    () async {
      var fail = true;
      final prefs = BinderLibraryPreferences(
        read: () async => throw StateError('read'),
        write: (_) async {
          if (fail) throw StateError('write');
          return true;
        },
      );
      await prefs.ensureLoaded();
      expect(await prefs.select(BinderLibrarySort.name), isFalse);
      expect(prefs.value, BinderLibrarySort.name);
      fail = false;
      expect(await prefs.select(BinderLibrarySort.completion), isTrue);
      prefs.dispose();
    },
  );
  test(
    'disposing while reading a stored choice never notifies a disposed screen',
    () async {
      final read = Completer<String?>();
      final prefs = BinderLibraryPreferences(read: () => read.future);
      final loading = prefs.ensureLoaded();
      prefs.dispose();
      read.complete('name');
      await loading;
    },
  );
  testWidgets(
    'sort works with search and Mine without changing summaries or sections',
    (tester) async {
      final repo = f.LibraryRepository();
      repo.rows
        ..clear()
        ..addAll([
          summary('z', 'Zubat goal', completed: 2),
          summary('a', 'Alakazam goal', completed: 9),
          f.row('s', 'Shared goal', role: 'viewer'),
        ]);
      await f.mount(tester, repo);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Mine'));
      await f.search(tester, 'goal');
      await sort(tester, BinderLibrarySort.name);
      expect(titles(tester), ['Alakazam goal', 'Zubat goal']);
      await sort(tester, BinderLibrarySort.completion);
      expect(titles(tester), ['Alakazam goal', 'Zubat goal']);
      expect(find.text('2 Binders shown'), findsOneWidget);
      expect(repo.rows.first.title, 'Zubat goal');
      expect(repo.reads, 1);
    },
  );
  testWidgets('choice restores after leaving and reopening the library', (
    tester,
  ) async {
    final repo = f.LibraryRepository();
    repo.rows
      ..clear()
      ..addAll([summary('z', 'Zubat'), summary('a', 'Alakazam')]);
    await f.mount(tester, repo);
    await sort(tester, BinderLibrarySort.name);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await f.mount(tester, repo);
    expect(find.text('Name A–Z'), findsOneWidget);
    expect(titles(tester), ['Alakazam', 'Zubat']);
  });
  testWidgets(
    'loading more applies the active sort while retaining query and scope',
    (tester) async {
      final repo = f.LibraryRepository()..paginated = true;
      repo.rows[0] = summary('z', 'Zubat goal');
      repo.rows[1] = summary('a', 'Alakazam goal');
      await f.mount(tester, repo);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Mine'));
      await f.search(tester, 'goal');
      await sort(tester, BinderLibrarySort.name);
      await f.reveal(tester, find.text('Load more'));
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      expect(titles(tester), ['Alakazam goal', 'Zubat goal']);
      expect(repo.reads, 2);
    },
  );
  testWidgets('changing sort labels keeps the library content in place', (
    tester,
  ) async {
    picker.viewport(tester, const Size(384, 820));
    await f.mount(tester, f.LibraryRepository());
    double contentOffset() =>
        tester.getTopLeft(find.byType(BinderSummaryCard).first).dy -
        tester.getTopLeft(find.byKey(const ValueKey('binder-library-sort'))).dy;
    final before = contentOffset();
    for (final value in [
      BinderLibrarySort.name,
      BinderLibrarySort.completion,
      BinderLibrarySort.recent,
    ]) {
      await sort(tester, value);
      expect(contentOffset(), before);
    }
  });
  for (final mode in Brightness.values) {
    for (final size in [const Size(320, 640), const Size(1280, 900)]) {
      testWidgets('sort menu and selected label fit $mode at $size enlarged', (
        tester,
      ) async {
        picker.viewport(tester, size);
        await f.mount(tester, f.LibraryRepository(), mode: mode, scale: 1.6);
        await sort(tester, BinderLibrarySort.completion);
        expect(find.text('Closest to completion'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  }
}
