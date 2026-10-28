import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/services/binders/binder_grid_preferences.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'binder_refinement_test.dart' as fixtures;
import 'binder_drag_arrangement_test.dart' as drag;

BinderGridPreferences localPreferences() =>
    BinderGridPreferences(read: () async => null, write: (_) async => true);

Future<void> showGrid(
  WidgetTester tester,
  BinderGridPreferences preferences,
  List<BinderCustomSlotDraft> slots,
  List<List<int>> moves, {
  Brightness mode = Brightness.dark,
  double scale = 1,
}) async {
  await tester.pumpWidget(
    fixtures.app(
      Scaffold(
        body: SingleChildScrollView(
          child: StatefulBuilder(
            builder: (_, set) => BinderPageArrangement(
              gridPreferences: preferences,
              slots: slots,
              onMove: (from, to) => set(() {
                moves.add([from, to]);
                slots.insert(to, slots.removeAt(from));
              }),
            ),
          ),
        ),
      ),
      mode: mode,
      scale: scale,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, BinderGridLayout layout) async {
  await tester.tap(find.byKey(const ValueKey('binder-grid-size')).first);
  await tester.pumpAndSettle();
  final row = find.byKey(ValueKey('binder-grid-${layout.storageKey}'));
  await tester.scrollUntilVisible(
    row,
    100,
    scrollable: find
        .byWidgetPredicate(
          (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
        )
        .last,
  );
  await tester.pumpAndSettle();
  await tester.tap(row);
  await tester.pumpAndSettle();
}

void main() {
  test(
    'device preference is restored and unknown saved values fall back safely',
    () async {
      SharedPreferences.setMockInitialValues({
        BinderGridPreferences.preferenceKey: '4x3',
      });
      final preferences = BinderGridPreferences();
      addTearDown(preferences.dispose);
      await preferences.ensureLoaded();
      expect(preferences.value, BinderGridLayout.fourByThree);
      expect(await preferences.select(BinderGridLayout.twoByTwo), true);
      final restored = BinderGridPreferences();
      addTearDown(restored.dispose);
      await restored.ensureLoaded();
      expect(restored.value, BinderGridLayout.twoByTwo);
      expect(
        (await SharedPreferences.getInstance()).getString(
          BinderGridPreferences.preferenceKey,
        ),
        '2x2',
      );
      expect(
        BinderGridLayout.fromStorage('unrecognized'),
        BinderGridLayout.threeByThree,
      );
    },
  );

  test(
    'late reads and queued writes cannot override the latest selection',
    () async {
      final read = Completer<String?>();
      final firstWrite = Completer<bool>();
      final writes = <String>[];
      final preferences = BinderGridPreferences(
        read: () => read.future,
        write: (value) async {
          writes.add(value);
          return writes.length == 1 ? firstWrite.future : true;
        },
      );
      addTearDown(preferences.dispose);
      final loading = preferences.ensureLoaded();
      final first = preferences.select(BinderGridLayout.twoByTwo);
      final latest = preferences.select(BinderGridLayout.fourByFour);
      await Future<void>.delayed(Duration.zero);
      expect(writes, ['2x2']);
      read.complete('3x3');
      await loading;
      expect(preferences.value, BinderGridLayout.fourByFour);
      firstWrite.complete(true);
      await first;
      await latest;
      expect(writes, ['2x2', '4x4']);
      expect(preferences.value, BinderGridLayout.fourByFour);
    },
  );

  for (final layout in BinderGridLayout.values) {
    for (final mode in Brightness.values) {
      for (final scale in [1.0, 1.6]) {
        testWidgets('choose and drag ${layout.storageKey} $mode $scale', (
          tester,
        ) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final preferences = localPreferences();
          addTearDown(preferences.dispose);
          final slots = drag.sampleSlots(20);
          final moves = <List<int>>[];
          final original = slots.map((slot) => slot.toWireJson()).toList();
          await showGrid(
            tester,
            preferences,
            slots,
            moves,
            mode: mode,
            scale: scale,
          );
          await choose(tester, layout);
          expect(preferences.value, layout);
          expect(find.text('Grid size · ${layout.label}'), findsOneWidget);
          expect(
            find.byWidgetPredicate(
              (w) =>
                  w is DragTarget &&
                  w.key is ValueKey &&
                  (w.key as ValueKey).value.toString().startsWith(
                    'binder-drop-',
                  ),
            ),
            findsNWidgets(layout.pockets),
          );
          expect(slots.map((slot) => slot.toWireJson()).toList(), original);
          expect(moves, isEmpty);
          final gesture = await drag.lift(tester);
          await drag.hover(tester, gesture, layout.columns - 1);
          await gesture.up();
          await tester.pumpAndSettle();
          expect(moves, [
            [0, layout.columns - 1],
          ]);
          expect(slots[layout.columns - 1].finish.cardPrintingId, 'finish-0');
          expect(slots[layout.columns - 1].requiredQuantity, 1);
          expect(slots.map((slot) => slot.displayKey).toSet(), hasLength(20));
          expect(tester.takeException(), isNull);
        });
      }
    }
    testWidgets('held drag crosses a ${layout.storageKey} page boundary', (
      tester,
    ) async {
      final preferences = localPreferences();
      addTearDown(preferences.dispose);
      await preferences.select(layout);
      final slots = drag.sampleSlots(20);
      final moves = <List<int>>[];
      await showGrid(tester, preferences, slots, moves);
      final gesture = await drag.lift(tester);
      await gesture.moveTo(
        tester.getCenter(find.byTooltip('Next binder page')),
      );
      await gesture.moveBy(const Offset(1, 1));
      await tester.pump(const Duration(milliseconds: 800));
      expect(find.text('2 / ${(20 / layout.pockets).ceil()}'), findsOneWidget);
      await drag.hover(tester, gesture, layout.pockets);
      await gesture.up();
      await tester.pumpAndSettle();
      expect(moves, [
        [0, layout.pockets],
      ]);
      expect(slots[layout.pockets].finish.cardPrintingId, 'finish-0');
      expect(tester.takeException(), isNull);
    });
  }

  for (final mode in Brightness.values) {
    for (final size in [const Size(1100, 700), const Size(700, 420)]) {
      testWidgets('grid-size chooser scrolls at $size $mode enlarged text', (
        tester,
      ) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final preferences = localPreferences();
        addTearDown(preferences.dispose);
        await showGrid(
          tester,
          preferences,
          drag.sampleSlots(20),
          [],
          mode: mode,
          scale: 1.6,
        );
        await choose(tester, BinderGridLayout.fourByFour);
        expect(find.text('Grid size · 4 × 4'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'resize keeps the selected exact finish visible and shared views synchronized',
    (tester) async {
      final preferences = localPreferences();
      addTearDown(preferences.dispose);
      final slots = drag.sampleSlots(20);
      final moves = <List<int>>[];
      await showGrid(tester, preferences, slots, moves);
      await tester.tap(find.byTooltip('Next binder page'));
      await tester.pumpAndSettle();
      await tester.tapAt(
        tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-10'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
      await choose(tester, BinderGridLayout.twoByTwo);
      expect(find.text('3 / 5'), findsOneWidget);
      expect(find.text('Moving from pocket 11'), findsOneWidget);
      expect(find.byKey(const ValueKey('binder-pocket-10')), findsOneWidget);
      expect(moves, isEmpty);
      await tester.pumpWidget(
        fixtures.app(
          Scaffold(
            body: Row(
              children: [
                for (var i = 0; i < 2; i++)
                  Expanded(
                    child: SingleChildScrollView(
                      child: BinderPageArrangement(
                        gridPreferences: preferences,
                        slots: slots,
                        onMove: (_, _) {},
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await choose(tester, BinderGridLayout.fourByThree);
      expect(find.text('Grid size · 4 × 3'), findsNWidgets(2));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('changing layout cancels an active preview without reordering', (
    tester,
  ) async {
    final preferences = localPreferences();
    addTearDown(preferences.dispose);
    final slots = drag.sampleSlots(20);
    final moves = <List<int>>[];
    await showGrid(tester, preferences, slots, moves);
    final gesture = await drag.lift(tester);
    expect(
      tester
          .widget<OutlinedButton>(
            find.byKey(const ValueKey('binder-grid-size')),
          )
          .onPressed,
      isNull,
    );
    await preferences.select(BinderGridLayout.fourByFour);
    await tester.pump();
    await drag.hover(tester, gesture, 2);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(moves, isEmpty);
    expect(slots.first.finish.cardPrintingId, 'finish-0');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'failed preference write keeps the session layout with clear feedback',
    (tester) async {
      final preferences = BinderGridPreferences(
        read: () async => throw StateError('store unavailable'),
        write: (_) async => false,
      );
      addTearDown(preferences.dispose);
      await showGrid(tester, preferences, drag.sampleSlots(20), []);
      await choose(tester, BinderGridLayout.fourByFour);
      expect(find.text('Grid size · 4 × 4'), findsOneWidget);
      expect(find.textContaining('could not be remembered'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
