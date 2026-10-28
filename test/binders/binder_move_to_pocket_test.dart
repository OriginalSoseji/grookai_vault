import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'package:grookai_vault/widgets/binders/binder_move_to_pocket_sheet.dart';
import 'binder_refinement_test.dart' as f;
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_grid_size_test.dart' as grid;
import 'binder_move_history_test.dart' as history;
import 'binder_page_picker_test.dart' as picker;
import 'binder_editor_navigation_test.dart' as nav;
import 'binder_draft_exit_test.dart' as exit;

final number = find.byKey(const ValueKey('binder-move-pocket-number'));
final confirm = find.byKey(const ValueKey('binder-move-pocket-confirm'));
final sheet = find.byType(BinderMoveToPocketSheet);

Future<void> select(WidgetTester tester, int index) async {
  final pocket = find.byKey(ValueKey('binder-pocket-$index'));
  await tester.ensureVisible(pocket);
  await tester.pumpAndSettle();
  await tester.tapAt(tester.getTopLeft(pocket) + const Offset(20, 20));
  await tester.pumpAndSettle();
}

Future<void> open(WidgetTester tester) async {
  final button = find.byKey(const ValueKey('binder-move-to-pocket'));
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
}

Future<void> enter(WidgetTester tester, String value) async {
  await tester.ensureVisible(number);
  await tester.pumpAndSettle();
  await tester.enterText(number, value);
  await tester.pumpAndSettle();
}

Future<void> commit(WidgetTester tester) async {
  await tester.tap(confirm);
  await tester.pumpAndSettle();
}

void main() {
  for (final invalid in [
    '',
    '0',
    '-1',
    '13',
    '1.5',
    'abc',
    '99999999999999999999999999999',
    '1',
  ]) {
    testWidgets(
      'invalid destination $invalid cannot change order and can be corrected',
      (tester) async {
        final slots = drag.sampleSlots(12);
        final original = slots.map((s) => s.toWireJson()).toList();
        final moves = <List<int>>[];
        await grid.showGrid(tester, grid.localPreferences(), slots, moves);
        await select(tester, 0);
        await open(tester);
        await enter(tester, invalid);
        await commit(tester);
        expect(sheet, findsOneWidget);
        expect(
          find.text(
            invalid == '1'
                ? 'Choose a different pocket.'
                : 'Enter a pocket from 1 to 12.',
          ),
          findsOneWidget,
        );
        expect(moves, isEmpty);
        expect(slots.map((s) => s.toWireJson()).toList(), original);
        await enter(tester, '12');
        expect(find.text('Destination: pocket 12'), findsOneWidget);
        expect(find.text('Page 2 · row 1 · column 3'), findsOneWidget);
        expect(find.text('Card 11'), findsOneWidget);
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pumpAndSettle();
        expect(sheet, findsOneWidget);
        expect(moves, isEmpty);
        expect(tester.testTextInput.isVisible, isFalse);
        await commit(tester);
        expect(moves, [
          [0, 11],
        ]);
        expect(slots.last.card.name, 'Card 0');
        expect(find.text('2 / 2'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final layout in BinderGridLayout.values) {
    for (final mode in Brightness.values) {
      testWidgets(
        'direct cross-page move and exact Undo/Redo ${layout.storageKey} $mode',
        (tester) async {
          final slots = drag.sampleSlots(layout.pockets * 2 + 1);
          final original = slots.map((s) => s.toWireJson()).toList();
          final moves = <List<int>>[];
          final preferences = grid.localPreferences();
          await preferences.select(layout);
          addTearDown(preferences.dispose);
          await grid.showGrid(tester, preferences, slots, moves, mode: mode);
          await select(tester, 0);
          await open(tester);
          await enter(tester, '${slots.length}');
          expect(find.text('Page 3 · row 1 · column 1'), findsOneWidget);
          final before = slots.map((s) => s.toWireJson()).toList();
          expect(before, original);
          expect(moves, isEmpty);
          await commit(tester);
          final moved = slots.map((s) => s.toWireJson()).toList();
          expect(slots.last.card.cardPrintId, 'card-0');
          expect(slots.last.finish.cardPrintingId, 'finish-0');
          expect(slots.last.requiredQuantity, 1);
          expect(find.text('3 / 3'), findsOneWidget);
          await history.action(tester, 'undo');
          expect(slots.map((s) => s.toWireJson()).toList(), original);
          await history.action(tester, 'redo');
          expect(slots.map((s) => s.toWireJson()).toList(), moved);
          expect(moves, [
            [0, slots.length - 1],
            [slots.length - 1, 0],
            [0, slots.length - 1],
          ]);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
  for (final mode in Brightness.values) {
    testWidgets(
      'move sheet fits content and grows for the destination preview $mode',
      (tester) async {
        picker.viewport(tester, const Size(390, 844));
        await grid.showGrid(
          tester,
          grid.localPreferences(),
          drag.sampleSlots(12),
          <List<int>>[],
          mode: mode,
        );
        await select(tester, 0);
        await open(tester);
        final emptyHeight = tester.getSize(sheet).height;
        await enter(tester, '12');
        final previewHeight = tester.getSize(sheet).height;
        expect(previewHeight, greaterThan(emptyHeight));
        expect(previewHeight, lessThan(600));
        expect(find.text('Destination: pocket 12'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'backward insertion shifts the intervening requirements without removing any',
    (tester) async {
      final slots = drag.sampleSlots(12);
      final moves = <List<int>>[];
      await grid.showGrid(tester, grid.localPreferences(), slots, moves);
      await tester.tap(find.byTooltip('Next binder page'));
      await tester.pumpAndSettle();
      await select(tester, 11);
      await open(tester);
      await enter(tester, '1');
      await commit(tester);
      expect(moves, [
        [11, 0],
      ]);
      expect(slots.first.card.name, 'Card 11');
      expect(slots.length, 12);
      expect(slots.skip(1).map((s) => s.card.name), [
        for (var i = 0; i < 11; i++) 'Card $i',
      ]);
      expect(find.text('1 / 2'), findsOneWidget);
    },
  );
  testWidgets('cancel retains selected requirement and existing Undo history', (
    tester,
  ) async {
    final slots = drag.sampleSlots(12);
    final moves = <List<int>>[];
    await grid.showGrid(tester, grid.localPreferences(), slots, moves);
    await history.move(tester, 0, 1);
    final before = slots.map((s) => s.toWireJson()).toList();
    await select(tester, 2);
    await open(tester);
    await enter(tester, '12');
    await tester.tap(find.byTooltip('Close move to pocket'));
    await tester.pumpAndSettle();
    expect(find.text('Moving from pocket 3'), findsOneWidget);
    expect(slots.map((s) => s.toWireJson()).toList(), before);
    expect(moves, [
      [0, 1],
    ]);
    await history.action(tester, 'undo');
    expect(moves, [
      [0, 1],
      [1, 0],
    ]);
  });
  for (final change in ['remove', 'quantity', 'grid']) {
    testWidgets(
      '$change while choosing rejects stale destination with immutable preview',
      (tester) async {
        final slots = drag.sampleSlots(12);
        final moves = <List<int>>[];
        final preferences = grid.localPreferences();
        late StateSetter update;
        await tester.pumpWidget(
          f.app(
            Scaffold(
              body: SingleChildScrollView(
                child: StatefulBuilder(
                  builder: (_, set) {
                    update = set;
                    return BinderPageArrangement(
                      slots: slots,
                      gridPreferences: preferences,
                      onMove: (from, to) {
                        moves.add([from, to]);
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
        await select(tester, 0);
        await open(tester);
        await enter(tester, '12');
        if (change == 'grid') {
          await preferences.select(BinderGridLayout.fourByFour);
        } else {
          update(() {
            if (change == 'remove') {
              slots.removeAt(0);
            } else {
              final old = slots.first;
              slots[0] = BinderCustomSlotDraft(
                card: old.card,
                finish: old.finish,
                requiredQuantity: 99,
              );
            }
          });
        }
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<BinderMoveToPocketSheet>(sheet)
              .slots
              .first
              .requiredQuantity,
          1,
        );
        expect(tester.widget<BinderMoveToPocketSheet>(sheet).slots.length, 12);
        await commit(tester);
        expect(moves, isEmpty);
        expect(
          find.text(
            'The checklist or grid changed. Choose a pocket again to see the updated layout.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final mode in Brightness.values) {
    for (final size in [
      const Size(320, 640),
      const Size(390, 844),
      const Size(700, 420),
      const Size(1100, 700),
    ]) {
      testWidgets('keyboard-safe direct move $mode $size enlarged text', (
        tester,
      ) async {
        picker.viewport(tester, size);
        int? result;
        await tester.pumpWidget(
          f.app(
            Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async {
                    result = await showModalBottomSheet<int>(
                      context: context,
                      isScrollControlled: true,
                      useSafeArea: true,
                      constraints: const BoxConstraints(maxWidth: 560),
                      builder: (_) => BinderMoveToPocketSheet(
                        slots: drag.sampleSlots(12),
                        from: 0,
                        layout: BinderGridLayout.threeByThree,
                      ),
                    );
                  },
                  child: const Text('Open'),
                ),
              ),
            ),
            mode: mode,
            scale: 1.6,
            keyboard: 170,
          ),
        );
        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();
        await enter(tester, '12');
        expect(
          tester.getRect(confirm).bottom,
          lessThanOrEqualTo(size.height - 170),
        );
        expect(tester.getSize(confirm).height, greaterThanOrEqualTo(48));
        expect(
          tester.getRect(find.byTooltip('Close move to pocket')).top,
          greaterThanOrEqualTo(0),
        );
        expect(find.text('Destination: pocket 12'), findsOneWidget);
        await commit(tester);
        expect(result, 11);
        expect(tester.takeException(), isNull);
      });
    }
  }
  testWidgets(
    'exact sibling finishes remain separate, dirty guard and Undo restore a clean editor',
    (tester) async {
      await exit.openEditor(tester);
      await nav.switchView(tester, 'arrange');
      await select(tester, 0);
      await open(tester);
      await enter(tester, '2');
      await commit(tester);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Discard checklist changes?'), findsOneWidget);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      await history.action(tester, 'undo');
      await nav.switchView(tester, 'checklist');
      expect(find.text('1. Eevee'), findsOneWidget);
      expect(find.textContaining('Reverse Holo · 3 copies'), findsOneWidget);
      expect(find.textContaining('Holofoil · 1 copy'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open editor'), findsOneWidget);
    },
  );
  testWidgets(
    'duplicate confirm commits only once and does not pop the arrangement',
    (tester) async {
      final slots = drag.sampleSlots(12);
      final moves = <List<int>>[];
      await grid.showGrid(tester, grid.localPreferences(), slots, moves);
      await select(tester, 0);
      await open(tester);
      await enter(tester, '12');
      await tester.tap(confirm);
      await tester.tap(confirm, warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(moves, [
        [0, 11],
      ]);
      expect(find.byType(BinderPageArrangement), findsOneWidget);
    },
  );
  testWidgets('single-slot arrangement has no destination to move to', (
    tester,
  ) async {
    await grid.showGrid(
      tester,
      grid.localPreferences(),
      drag.sampleSlots(1),
      <List<int>>[],
    );
    await select(tester, 0);
    final button = tester.widget<TextButton>(
      find.byKey(const ValueKey('binder-move-to-pocket')),
    );
    expect(button.onPressed, isNull);
  });
  testWidgets(
    'large checklist moves directly to pocket 1000 without opening hundreds of pages',
    (tester) async {
      final slots = [
        for (final slot in drag.sampleSlots(1000))
          BinderCustomSlotDraft(card: slot.card, finish: slot.finish),
      ];
      final moves = <List<int>>[];
      final preferences = grid.localPreferences();
      await preferences.select(BinderGridLayout.twoByTwo);
      await grid.showGrid(tester, preferences, slots, moves);
      await select(tester, 0);
      await open(tester);
      await enter(tester, '1000');
      expect(find.text('Page 250 · row 2 · column 2'), findsOneWidget);
      await commit(tester);
      expect(moves, [
        [0, 999],
      ]);
      expect(find.text('250 / 250'), findsOneWidget);
      expect(slots.last.card.cardPrintId, 'card-0');
    },
  );
}
