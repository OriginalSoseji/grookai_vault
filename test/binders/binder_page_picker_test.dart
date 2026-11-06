import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'package:grookai_vault/widgets/binders/binder_page_picker_sheet.dart';
import 'package:grookai_vault/widgets/binders/binder_widgets.dart';
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_draft_exit_test.dart' as exit;
import 'binder_editor_navigation_test.dart' as navigation;
import 'binder_grid_size_test.dart' as grid;
import 'binder_move_history_test.dart' as history;
import 'binder_refinement_test.dart' as fixtures;

Future<void> open(WidgetTester tester) async {
  final button = find.byKey(const ValueKey('binder-page-picker'));
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, int page) async {
  final row = find.byKey(ValueKey('binder-page-choice-$page'));
  final list = tester.widget<ListView>(
    find.byKey(const ValueKey('binder-page-list')),
  );
  list.controller!.jumpTo(
    (page * list.itemExtent!).clamp(
      0,
      list.controller!.position.maxScrollExtent,
    ),
  );
  await tester.pumpAndSettle();
  await tester.ensureVisible(row);
  await tester.pumpAndSettle();
  await tester.tap(row);
  await tester.pumpAndSettle();
}

void viewport(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  for (final layout in BinderGridLayout.values) {
    for (final mode in Brightness.values) {
      for (final scale in [1.0, 1.6]) {
        testWidgets('preview and jump ${layout.storageKey} $mode $scale', (
          tester,
        ) async {
          viewport(tester, const Size(390, 844));
          final semantics = tester.ensureSemantics();
          try {
            final preferences = grid.localPreferences();
            addTearDown(preferences.dispose);
            await preferences.select(layout);
            final slots = drag.sampleSlots(layout.pockets + 1);
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
            await open(tester);
            expect(find.text('Binder pages'), findsOneWidget);
            expect(find.text('Pockets 1–${layout.pockets}'), findsOneWidget);
            expect(
              find.text('${layout.pockets} slots · 0 empty'),
              findsOneWidget,
            );
            expect(
              find.text('1 slot · ${layout.pockets - 1} empty'),
              findsOneWidget,
            );
            expect(
              tester
                  .getSemantics(
                    find.byKey(const ValueKey('binder-page-state-0')),
                  )
                  .getSemanticsData()
                  .flagsCollection
                  .isSelected,
              ui.Tristate.isTrue,
            );
            await choose(tester, 1);
            expect(find.text('2 / 2'), findsOneWidget);
            expect(
              find.byKey(ValueKey('binder-pocket-${layout.pockets}')),
              findsOneWidget,
            );
            expect(slots.map((slot) => slot.toWireJson()).toList(), original);
            expect(moves, isEmpty);
            await open(tester);
            expect(
              tester
                  .getSemantics(
                    find.byKey(const ValueKey('binder-page-state-1')),
                  )
                  .getSemanticsData()
                  .flagsCollection
                  .isSelected,
              ui.Tristate.isTrue,
            );
            await tester.tap(find.byTooltip('Close binder pages'));
            await tester.pumpAndSettle();
            expect(find.text('2 / 2'), findsOneWidget);
            expect(tester.takeException(), isNull);
          } finally {
            semantics.dispose();
          }
        });
      }
    }
  }

  for (final mode in Brightness.values) {
    for (final size in [
      const Size(320, 640),
      const Size(390, 844),
      const Size(700, 420),
      const Size(1100, 700),
    ]) {
      testWidgets('page picker fits $size $mode enlarged text', (tester) async {
        viewport(tester, size);
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
        await open(tester);
        await choose(tester, 2);
        expect(find.text('3 / 3'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'large Binder builds pages lazily and reopens at the current page',
    (tester) async {
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      await preferences.select(BinderGridLayout.twoByTwo);
      final moves = <List<int>>[];
      await grid.showGrid(tester, preferences, drag.sampleSlots(1000), moves);
      await open(tester);
      expect(
        find
            .descendant(
              of: find.byType(BinderPagePickerSheet),
              matching: find.byType(BinderArtwork),
            )
            .evaluate()
            .length,
        lessThan(50),
      );
      await choose(tester, 249);
      expect(find.text('250 / 250'), findsOneWidget);
      await open(tester);
      expect(
        find.byKey(const ValueKey('binder-page-choice-249')).hitTestable(),
        findsOneWidget,
      );
      expect(find.text('Pockets 997–1000'), findsOneWidget);
      await tester.tap(find.byTooltip('Close binder pages'));
      await tester.pumpAndSettle();
      expect(moves, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'selected exact requirement survives page jump and can be moved then undone',
    (tester) async {
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      final slots = drag.sampleSlots(20);
      final original = slots.map((slot) => slot.toWireJson()).toList();
      final moves = <List<int>>[];
      await grid.showGrid(tester, preferences, slots, moves);
      await tester.tapAt(
        tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-0'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
      await open(tester);
      expect(
        find.textContaining('Your selected card stays ready to move'),
        findsOneWidget,
      );
      await choose(tester, 1);
      expect(find.text('Moving from pocket 1'), findsOneWidget);
      await tester.tapAt(
        tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-9'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
      expect(moves, [
        [0, 9],
      ]);
      expect(slots[9].finish.cardPrintingId, 'finish-0');
      await open(tester);
      await choose(tester, 2);
      await history.action(tester, 'undo');
      expect(slots.map((slot) => slot.toWireJson()).toList(), original);
      expect(find.text('1 / 3'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  for (final changedLayout in [false, true]) {
    testWidgets(
      'changed ${changedLayout ? 'layout' : 'requirements'} rejects a stale picker result',
      (tester) async {
        final preferences = grid.localPreferences();
        addTearDown(preferences.dispose);
        final slots = drag.sampleSlots(20);
        late StateSetter update;
        await tester.pumpWidget(
          fixtures.app(
            Scaffold(
              body: SingleChildScrollView(
                child: StatefulBuilder(
                  builder: (_, set) {
                    update = set;
                    return BinderPageArrangement(
                      slots: slots,
                      gridPreferences: preferences,
                      onMove: (_, _) {},
                    );
                  },
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await open(tester);
        if (changedLayout) {
          await preferences.select(BinderGridLayout.twoByTwo);
        } else {
          update(() => slots.removeLast());
        }
        await tester.pumpAndSettle();
        await choose(tester, 1);
        expect(find.text(changedLayout ? '1 / 5' : '1 / 3'), findsOneWidget);
        expect(find.textContaining('Open pages again'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('active drag disables picker; cancelling keeps order intact', (
    tester,
  ) async {
    final slots = drag.sampleSlots();
    final moves = <List<int>>[];
    await drag.mount(tester, slots, moves);
    final gesture = await drag.lift(tester);
    expect(
      tester
          .widget<TextButton>(find.byKey(const ValueKey('binder-page-picker')))
          .onPressed,
      isNull,
    );
    await gesture.cancel();
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<TextButton>(find.byKey(const ValueKey('binder-page-picker')))
          .onPressed,
      isNotNull,
    );
    expect(moves, isEmpty);
  });

  testWidgets('page selection and dismissal leave editor clean', (
    tester,
  ) async {
    var returned = false;
    await exit.openEditor(tester, result: (_) => returned = true);
    await navigation.switchView(tester, 'arrange');
    await open(tester);
    await choose(tester, 0);
    await open(tester);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(returned, true);
    expect(find.text('Discard checklist changes?'), findsNothing);
  });
}
