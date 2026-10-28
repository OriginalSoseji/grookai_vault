import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'package:grookai_vault/widgets/binders/binder_page_picker_sheet.dart';
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_grid_size_test.dart' as grid;
import 'binder_move_history_test.dart' as history;
import 'binder_page_picker_test.dart' as picker;
import 'binder_refinement_test.dart' as fixtures;

final number = find.byKey(const ValueKey('binder-page-number'));
final go = find.byKey(const ValueKey('binder-page-go'));

Future<void> enter(
  WidgetTester tester,
  String value, {
  bool keyboardGo = false,
}) async {
  await tester.enterText(number, value);
  if (keyboardGo) {
    await tester.testTextInput.receiveAction(TextInputAction.go);
  } else {
    await tester.ensureVisible(go);
    await tester.pumpAndSettle();
    await tester.tap(go);
  }
  await tester.pumpAndSettle();
}

void main() {
  for (final keyboardGo in [false, true]) {
    testWidgets(
      'jump directly to page 250 with ${keyboardGo ? 'keyboard' : 'button'} Go',
      (tester) async {
        final preferences = grid.localPreferences();
        addTearDown(preferences.dispose);
        await preferences.select(BinderGridLayout.twoByTwo);
        final slots = drag.sampleSlots(1000);
        final original = slots.map((slot) => slot.toWireJson()).toList();
        final moves = <List<int>>[];
        await grid.showGrid(tester, preferences, slots, moves);
        await picker.open(tester);
        await enter(tester, ' 250 ', keyboardGo: keyboardGo);
        expect(find.text('250 / 250'), findsOneWidget);
        expect(slots.map((slot) => slot.toWireJson()).toList(), original);
        expect(moves, isEmpty);
        await picker.open(tester);
        await enter(tester, '1', keyboardGo: keyboardGo);
        expect(find.text('1 / 250'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final invalid in [
    '',
    '0',
    '-1',
    '4',
    '1.5',
    'abc',
    '999999999999999999999999999999',
  ]) {
    testWidgets('invalid page "$invalid" stays put and can be corrected', (
      tester,
    ) async {
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      final moves = <List<int>>[];
      await grid.showGrid(tester, preferences, drag.sampleSlots(20), moves);
      await picker.open(tester);
      await enter(tester, invalid);
      expect(find.text('Enter a page from 1 to 3.'), findsOneWidget);
      expect(find.byType(BinderPagePickerSheet), findsOneWidget);
      await tester.enterText(number, '2');
      await tester.pumpAndSettle();
      expect(find.text('Enter a page from 1 to 3.'), findsNothing);
      await tester.tap(go);
      await tester.pumpAndSettle();
      expect(find.text('2 / 3'), findsOneWidget);
      expect(moves, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }

  for (final mode in Brightness.values) {
    for (final size in [const Size(320, 640), const Size(700, 420)]) {
      testWidgets('keyboard-safe Go and validation $mode $size enlarged text', (
        tester,
      ) async {
        picker.viewport(tester, size);
        final preferences = grid.localPreferences();
        addTearDown(preferences.dispose);
        var keyboard = 0.0;
        late StateSetter update;
        await tester.pumpWidget(
          StatefulBuilder(
            builder: (_, set) {
              update = set;
              return fixtures.app(
                Scaffold(
                  body: SingleChildScrollView(
                    child: BinderPageArrangement(
                      slots: drag.sampleSlots(20),
                      gridPreferences: preferences,
                      onMove: (_, _) {},
                    ),
                  ),
                ),
                mode: mode,
                scale: 1.6,
                keyboard: keyboard,
              );
            },
          ),
        );
        await tester.pumpAndSettle();
        await picker.open(tester);
        await tester.enterText(number, '0');
        final before = tester.widget<TextField>(number).controller;
        update(() => keyboard = size.width < 400 ? 280 : 170);
        await tester.pumpAndSettle();
        expect(
          identical(tester.widget<TextField>(number).controller, before),
          true,
        );
        expect(tester.widget<TextField>(number).focusNode!.hasFocus, true);
        expect(find.byKey(const ValueKey('binder-page-list')), findsNothing);
        await tester.ensureVisible(go);
        await tester.pumpAndSettle();
        await tester.tap(go);
        await tester.pumpAndSettle();
        expect(find.text('Enter a page from 1 to 3.'), findsOneWidget);
        await enter(tester, '3', keyboardGo: true);
        update(() => keyboard = 0);
        await tester.pumpAndSettle();
        expect(find.text('3 / 3'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'keyboard dismissal restores previews and typed input without jumping',
    (tester) async {
      final preferences = grid.localPreferences();
      addTearDown(preferences.dispose);
      var keyboard = 0.0;
      late StateSetter update;
      final slots = drag.sampleSlots(30);
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (_, set) {
            update = set;
            return fixtures.app(
              Scaffold(
                body: SingleChildScrollView(
                  child: BinderPageArrangement(
                    slots: slots,
                    gridPreferences: preferences,
                    onMove: (_, _) {},
                  ),
                ),
              ),
              keyboard: keyboard,
            );
          },
        ),
      );
      await tester.pumpAndSettle();
      await picker.open(tester);
      await tester.enterText(number, '3');
      update(() => keyboard = 250);
      await tester.pumpAndSettle();
      update(() => keyboard = 0);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('binder-page-list')), findsOneWidget);
      expect(tester.widget<TextField>(number).controller!.text, '3');
      await tester.tap(find.byTooltip('Close binder pages'));
      await tester.pumpAndSettle();
      expect(find.text('1 / 4'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'direct page jump keeps a selected exact requirement and Undo history',
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
      await picker.open(tester);
      await enter(tester, '3');
      expect(find.text('Moving from pocket 1'), findsOneWidget);
      await tester.tapAt(
        tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-18'))) +
            const Offset(30, 30),
      );
      await tester.pumpAndSettle();
      expect(slots[18].finish.cardPrintingId, 'finish-0');
      await picker.open(tester);
      await enter(tester, '2');
      await history.action(tester, 'undo');
      expect(slots.map((slot) => slot.toWireJson()).toList(), original);
      expect(find.text('1 / 3'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('typed page uses the same stale-layout guard as a preview row', (
    tester,
  ) async {
    final preferences = grid.localPreferences();
    addTearDown(preferences.dispose);
    await grid.showGrid(tester, preferences, drag.sampleSlots(20), []);
    await picker.open(tester);
    await tester.enterText(number, '2');
    await preferences.select(BinderGridLayout.twoByTwo);
    await tester.pumpAndSettle();
    await tester.testTextInput.receiveAction(TextInputAction.go);
    await tester.pumpAndSettle();
    expect(find.text('1 / 5'), findsOneWidget);
    expect(find.textContaining('Open pages again'), findsOneWidget);
  });

  testWidgets('double submission closes only the picker', (tester) async {
    final preferences = grid.localPreferences();
    addTearDown(preferences.dispose);
    await grid.showGrid(tester, preferences, drag.sampleSlots(20), []);
    await picker.open(tester);
    await tester.enterText(number, '2');
    final submit = tester.widget<TextField>(number).onSubmitted!;
    submit('2');
    submit('2');
    await tester.pumpAndSettle();
    expect(find.byType(BinderPageArrangement), findsOneWidget);
    expect(find.text('2 / 3'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
