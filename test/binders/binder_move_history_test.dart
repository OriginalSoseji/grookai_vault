import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_grid_size_test.dart' as grid;
import 'binder_refinement_test.dart' as fixtures;
import 'binder_draft_exit_test.dart' as exit;
import 'binder_editor_navigation_test.dart' as navigation;

Future<void> move(WidgetTester tester, int from, int to) async {
  final gesture = await drag.lift(tester, from);
  await drag.hover(tester, gesture, to);
  await gesture.up();
  await tester.pumpAndSettle();
}

Future<void> action(WidgetTester tester, String name) async {
  final button = find.byKey(ValueKey('binder-$name-move'));
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
}

bool enabled(WidgetTester tester, String name) =>
    tester
        .widget<TextButton>(find.byKey(ValueKey('binder-$name-move')))
        .onPressed !=
    null;

void main() {
  for (final mode in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      testWidgets(
        'multiple moves undo and redo exact requirements $mode $scale',
        (tester) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final preferences = grid.localPreferences();
          addTearDown(preferences.dispose);
          final slots = drag.sampleSlots(3);
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
          expect(find.text('Undo move'), findsNothing);
          await move(tester, 0, 2);
          final firstOrder = slots.map((slot) => slot.toWireJson()).toList();
          await move(tester, 0, 1);
          final secondOrder = slots.map((slot) => slot.toWireJson()).toList();
          expect(enabled(tester, 'undo'), true);
          expect(enabled(tester, 'redo'), false);
          await action(tester, 'undo');
          expect(slots.map((slot) => slot.toWireJson()).toList(), firstOrder);
          await action(tester, 'undo');
          expect(slots.map((slot) => slot.toWireJson()).toList(), original);
          expect(enabled(tester, 'undo'), false);
          await action(tester, 'redo');
          await action(tester, 'redo');
          expect(slots.map((slot) => slot.toWireJson()).toList(), secondOrder);
          expect(enabled(tester, 'redo'), false);
          expect(moves, [
            [0, 2],
            [0, 1],
            [1, 0],
            [2, 0],
            [0, 2],
            [0, 1],
          ]);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  for (final layout in BinderGridLayout.values) {
    testWidgets(
      'cross-page history survives resizing from ${layout.storageKey}',
      (tester) async {
        final preferences = grid.localPreferences();
        addTearDown(preferences.dispose);
        await preferences.select(layout);
        final slots = drag.sampleSlots(20);
        final original = slots.map((slot) => slot.toWireJson()).toList();
        final moves = <List<int>>[];
        await grid.showGrid(tester, preferences, slots, moves);
        final gesture = await drag.lift(tester);
        await gesture.moveTo(
          tester.getCenter(find.byTooltip('Next binder page')),
        );
        await gesture.moveBy(const Offset(1, 1));
        await tester.pump(const Duration(milliseconds: 800));
        await drag.hover(tester, gesture, layout.pockets);
        await gesture.up();
        await tester.pumpAndSettle();
        expect(slots[layout.pockets].finish.cardPrintingId, 'finish-0');
        await preferences.select(BinderGridLayout.twoByTwo);
        await tester.pumpAndSettle();
        await action(tester, 'undo');
        expect(slots.map((slot) => slot.toWireJson()).toList(), original);
        expect(find.text('1 / 5'), findsOneWidget);
        await action(tester, 'redo');
        expect(slots[layout.pockets].finish.cardPrintingId, 'finish-0');
        expect(find.text('${layout.pockets ~/ 4 + 1} / 5'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('new move branches history and cancelled drag preserves redo', (
    tester,
  ) async {
    final slots = drag.sampleSlots(3);
    final moves = <List<int>>[];
    await drag.mount(tester, slots, moves);
    await move(tester, 0, 2);
    await action(tester, 'undo');
    final gesture = await drag.lift(tester);
    expect(enabled(tester, 'redo'), false);
    await gesture.cancel();
    await tester.pumpAndSettle();
    expect(enabled(tester, 'redo'), true);
    await move(tester, 0, 1);
    expect(enabled(tester, 'redo'), false);
    await action(tester, 'undo');
    expect(slots.first.finish.cardPrintingId, 'finish-0');
    expect(enabled(tester, 'undo'), false);
  });

  for (final change in ['remove', 'finish', 'quantity', 'order']) {
    testWidgets('external $change invalidates move history', (tester) async {
      final slots = drag.sampleSlots(3);
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
                    onMove: (from, to) {
                      set(() => slots.insert(to, slots.removeAt(from)));
                    },
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await move(tester, 0, 2);
      update(() {
        final slot = slots.first;
        switch (change) {
          case 'remove':
            slots.removeLast();
          case 'finish':
            slots[0] = BinderCustomSlotDraft(
              card: slot.card,
              finish: const BinderFinishOption(
                label: 'Normal',
                cardPrintingId: 'new-finish',
              ),
              requiredQuantity: slot.requiredQuantity,
            );
          case 'quantity':
            slots[0] = BinderCustomSlotDraft(
              card: slot.card,
              finish: slot.finish,
              requiredQuantity: 99,
            );
          case 'order':
            slots.insert(1, slots.removeAt(0));
        }
      });
      await tester.pumpAndSettle();
      expect(find.text('Undo move'), findsNothing);
      expect(find.text('Redo move'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('immutable caller replacement retains accepted move history', (
    tester,
  ) async {
    var slots = drag.sampleSlots(3);
    final original = slots.map((slot) => slot.toWireJson()).toList();
    await tester.pumpWidget(
      fixtures.app(
        Scaffold(
          body: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (_, set) => BinderPageArrangement(
                slots: List.unmodifiable(slots),
                onMove: (from, to) => set(() {
                  final next = List<BinderCustomSlotDraft>.of(slots);
                  next.insert(to, next.removeAt(from));
                  slots = next;
                }),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await move(tester, 0, 2);
    await action(tester, 'undo');
    expect(slots.map((slot) => slot.toWireJson()).toList(), original);
    await action(tester, 'redo');
    expect(slots.last.finish.cardPrintingId, 'finish-0');
  });

  testWidgets('unaccepted move cannot replay over the caller draft', (
    tester,
  ) async {
    final slots = drag.sampleSlots(3);
    final original = slots.map((slot) => slot.toWireJson()).toList();
    var calls = 0;
    await tester.pumpWidget(
      fixtures.app(
        Scaffold(
          body: SingleChildScrollView(
            child: BinderPageArrangement(
              slots: slots,
              onMove: (_, _) => calls++,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await move(tester, 0, 2);
    await action(tester, 'undo');
    expect(calls, 1);
    expect(slots.map((slot) => slot.toWireJson()).toList(), original);
    expect(find.text('Undo move'), findsNothing);
    expect(
      find.textContaining('Move history has been cleared'),
      findsOneWidget,
    );
  });

  testWidgets('Done returns the redone exact requirements', (tester) async {
    List<BinderCustomSlotDraft>? result;
    await exit.openEditor(tester, result: (value) => result = value);
    await navigation.switchView(tester, 'arrange');
    await move(tester, 0, 1);
    await action(tester, 'undo');
    await action(tester, 'redo');
    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(
      result?.map((slot) => slot.toWireJson()).toList(),
      exit.slots.reversed.map((slot) => slot.toWireJson()).toList(),
    );
    expect(find.text('Discard checklist changes?'), findsNothing);
  });

  testWidgets('tap moves share history and undo restores clean editor exit', (
    tester,
  ) async {
    var returned = false;
    await exit.openEditor(tester, result: (_) => returned = true);
    await navigation.switchView(tester, 'arrange');
    for (final index in [0, 1]) {
      await tester.tapAt(
        tester.getTopLeft(find.byKey(ValueKey('binder-pocket-$index'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
    }
    expect(enabled(tester, 'undo'), true);
    await navigation.switchView(tester, 'checklist');
    await navigation.switchView(tester, 'arrange');
    await action(tester, 'undo');
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(returned, true);
    expect(find.text('Discard checklist changes?'), findsNothing);
  });
}
