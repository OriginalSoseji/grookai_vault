import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_draft_exit_test.dart' as exit;
import 'binder_editor_navigation_test.dart' as navigation;
import 'binder_grid_size_test.dart' as grid;
import 'binder_move_history_test.dart' as history;
import 'binder_page_jump_test.dart' as jump;
import 'binder_page_picker_test.dart' as picker;

Future<void> artwork(WidgetTester tester, {bool details = false}) async {
  final label = find.text(details ? 'Details' : 'Artwork');
  await tester.ensureVisible(label);
  await tester.pumpAndSettle();
  await tester.tap(label);
  await tester.pumpAndSettle();
}

Future<void> resize(WidgetTester tester, BinderGridLayout layout) async {
  await tester.ensureVisible(find.byKey(const ValueKey('binder-grid-size')));
  await tester.pumpAndSettle();
  await grid.choose(tester, layout);
}

void main() {
  for (final layout in BinderGridLayout.values) {
    for (final mode in Brightness.values) {
      for (final scale in [1.0, 1.6]) {
        testWidgets(
          'artwork ${layout.storageKey} $mode $scale preserves exact drag and history',
          (tester) async {
            picker.viewport(tester, const Size(390, 844));
            final preferences = grid.localPreferences();
            addTearDown(preferences.dispose);
            await preferences.select(layout);
            final slots = drag.sampleSlots(20);
            final original = slots.map((slot) => slot.toWireJson()).toList();
            final moves = <List<int>>[];
            await grid.showGrid(
              tester,
              preferences,
              slots,
              moves,
              mode: mode,
              scale: scale,
            );
            final detailHeight = tester
                .getSize(find.byKey(const ValueKey('binder-pocket-0')))
                .height;
            await artwork(tester);
            final artHeight = tester
                .getSize(find.byKey(const ValueKey('binder-pocket-0')))
                .height;
            expect(detailHeight - artHeight, closeTo(72 * scale, .1));
            expect(
              tester
                  .widget<SegmentedButton<bool>>(
                    find.byKey(const ValueKey('binder-page-display')),
                  )
                  .selected,
              {false},
            );
            expect(find.text('1 · ×1'), findsOneWidget);
            expect(slots.map((slot) => slot.toWireJson()).toList(), original);
            expect(moves, isEmpty);
            await history.move(tester, 0, layout.columns - 1);
            expect(slots[layout.columns - 1].finish.cardPrintingId, 'finish-0');
            await artwork(tester, details: true);
            await history.action(tester, 'undo');
            expect(slots.map((slot) => slot.toWireJson()).toList(), original);
            await artwork(tester);
            await history.action(tester, 'redo');
            expect(slots[layout.columns - 1].finish.cardPrintingId, 'finish-0');
            expect(slots[layout.columns - 1].requiredQuantity, 1);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
    testWidgets('artwork held drag turns a ${layout.storageKey} page', (
      tester,
    ) async {
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      await preferences.select(layout);
      final slots = drag.sampleSlots(20);
      final moves = <List<int>>[];
      await grid.showGrid(tester, preferences, slots, moves);
      await artwork(tester);
      final gesture = await drag.lift(tester);
      expect(
        tester
            .widget<SegmentedButton<bool>>(
              find.byKey(const ValueKey('binder-page-display')),
            )
            .onSelectionChanged,
        isNull,
      );
      await gesture.moveTo(
        tester.getCenter(find.byTooltip('Next binder page')),
      );
      await gesture.moveBy(const Offset(1, 1));
      await tester.pump(const Duration(milliseconds: 800));
      await drag.hover(tester, gesture, layout.pockets);
      await gesture.up();
      await tester.pumpAndSettle();
      expect(moves, [
        [0, layout.pockets],
      ]);
      expect(slots[layout.pockets].finish.cardPrintingId, 'finish-0');
      expect(
        tester
            .widget<SegmentedButton<bool>>(
              find.byKey(const ValueKey('binder-page-display')),
            )
            .selected,
        {false},
      );
      expect(tester.takeException(), isNull);
    });
  }

  for (final mode in Brightness.values) {
    for (final size in [
      const Size(320, 640),
      const Size(700, 420),
      const Size(1100, 700),
    ]) {
      testWidgets('artwork controls fit $size $mode enlarged text', (
        tester,
      ) async {
        picker.viewport(tester, size);
        final preferences = grid.localPreferences();
        addTearDown(preferences.dispose);
        await grid.showGrid(
          tester,
          preferences,
          drag.sampleSlots(20),
          [],
          mode: mode,
          scale: 1.6,
        );
        await artwork(tester);
        await resize(tester, BinderGridLayout.fourByFour);
        await artwork(tester, details: true);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'artwork semantics and selected identity retain full exact requirement',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        final slots = drag.sampleSlots(3);
        final moves = <List<int>>[];
        await drag.mount(tester, slots, moves);
        await artwork(tester);
        final node = tester.getSemantics(
          find.byKey(const ValueKey('binder-pocket-1')),
        );
        expect(
          node.getSemanticsData().label,
          contains('Card 1, Set, 1, Reverse Holo, 2 required copies'),
        );
        node.owner!.performAction(node.id, ui.SemanticsAction.tap);
        await tester.pumpAndSettle();
        expect(find.text('Card 1 · Reverse Holo'), findsOneWidget);
        expect(find.text('2 copies required'), findsOneWidget);
        expect(find.text('Moving from pocket 2'), findsOneWidget);
        await artwork(tester, details: true);
        expect(find.text('Moving from pocket 2'), findsOneWidget);
        expect(moves, isEmpty);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets(
    'artwork selected card survives grid resize and a typed page jump',
    (tester) async {
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      final moves = <List<int>>[];
      final slots = drag.sampleSlots(20);
      await grid.showGrid(tester, preferences, slots, moves);
      await artwork(tester);
      await tester.tapAt(
        tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-0'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
      await resize(tester, BinderGridLayout.twoByTwo);
      await picker.open(tester);
      await jump.enter(tester, '3');
      expect(find.text('Moving from pocket 1'), findsOneWidget);
      expect(find.text('3 / 5'), findsOneWidget);
      await tester.tapAt(
        tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-8'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
      expect(moves, [
        [0, 8],
      ]);
      expect(slots[8].finish.cardPrintingId, 'finish-0');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('artwork empty drop appends without adding sparse requirements', (
    tester,
  ) async {
    picker.viewport(tester, const Size(390, 844));
    final preferences = grid.localPreferences();
    addTearDown(preferences.dispose);
    await preferences.select(BinderGridLayout.twoByTwo);
    final slots = drag.sampleSlots(3);
    final moves = <List<int>>[];
    await grid.showGrid(tester, preferences, slots, moves);
    await artwork(tester);
    await history.move(tester, 0, 3);
    expect(moves, [
      [0, 2],
    ]);
    expect(slots.length, 3);
    expect(slots.last.finish.cardPrintingId, 'finish-0');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'artwork stationary edge-scroll release resolves the visible pocket',
    (tester) async {
      picker.viewport(tester, const Size(390, 480));
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      await preferences.select(BinderGridLayout.fourByFour);
      final slots = drag.sampleSlots(20);
      final moves = <List<int>>[];
      await grid.showGrid(tester, preferences, slots, moves);
      await artwork(tester);
      final gesture = await drag.lift(tester);
      const point = Offset(180, 460);
      await gesture.moveTo(point);
      for (var i = 0; i < 15; i++) {
        await tester.pump(const Duration(milliseconds: 40));
      }
      final underFinger = [
        for (var i = 0; i < 16; i++)
          if (tester
              .getRect(find.byKey(ValueKey('binder-drop-$i')))
              .contains(point))
            i,
      ];
      expect(underFinger, hasLength(1));
      await gesture.up();
      await tester.pumpAndSettle();
      expect(moves, [
        [0, underFinger.single],
      ]);
      expect(slots[underFinger.single].finish.cardPrintingId, 'finish-0');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('mode survives editor tabs and never dirties the checklist', (
    tester,
  ) async {
    var returned = false;
    await exit.openEditor(tester, result: (_) => returned = true);
    await navigation.switchView(tester, 'arrange');
    await artwork(tester);
    await navigation.switchView(tester, 'checklist');
    await navigation.switchView(tester, 'arrange');
    expect(
      tester
          .widget<SegmentedButton<bool>>(
            find.byKey(const ValueKey('binder-page-display')),
          )
          .selected,
      {false},
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(returned, true);
    expect(find.text('Discard checklist changes?'), findsNothing);
  });
}
