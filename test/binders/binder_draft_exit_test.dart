import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_custom_checklist_screen.dart';

import 'binder_refinement_test.dart' as fixtures;
import 'binder_editor_navigation_test.dart' as navigation;

const slots = [
  navigation.exactSlot,
  BinderCustomSlotDraft(card: fixtures.card, finish: fixtures.holoFinish),
];

Future<void> openEditor(
  WidgetTester tester, {
  Brightness mode = Brightness.dark,
  double scale = 1,
  void Function(List<BinderCustomSlotDraft>?)? result,
}) async {
  await tester.pumpWidget(
    fixtures.app(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              final draft = await Navigator.of(context)
                  .push<List<BinderCustomSlotDraft>>(
                    MaterialPageRoute<List<BinderCustomSlotDraft>>(
                      builder: (_) => BinderCustomChecklistEditorScreen(
                        repository: fixtures.TestRepository(),
                        initialSlots: slots,
                      ),
                    ),
                  );
              result?.call(draft);
            },
            child: const Text('Open editor'),
          ),
        ),
      ),
      mode: mode,
      scale: scale,
    ),
  );
  await tester.tap(find.text('Open editor'));
  await tester.pumpAndSettle();
}

Future<void> removeFirst(WidgetTester tester) async {
  await navigation.openOptions(tester);
  await tester.tap(find.text('Remove slot'));
  await tester.pumpAndSettle();
}

void main() {
  for (final mode in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      testWidgets(
        'dirty Back preserves edits until explicit discard $mode $scale',
        (tester) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          var returned = false;
          List<BinderCustomSlotDraft>? result;
          await openEditor(
            tester,
            mode: mode,
            scale: scale,
            result: (value) {
              returned = true;
              result = value;
            },
          );
          await removeFirst(tester);
          await tester.pageBack();
          await tester.pumpAndSettle();
          expect(find.text('Discard checklist changes?'), findsOneWidget);
          expect(returned, false);
          await tester.tap(find.text('Keep editing'));
          await tester.pumpAndSettle();
          expect(find.text('1 slot · 1 copy'), findsOneWidget);
          await tester.pageBack();
          await tester.pumpAndSettle();
          await tester.tap(find.text('Discard changes'));
          await tester.pumpAndSettle();
          expect(returned, true);
          expect(result, isNull);
          expect(find.text('Open editor'), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'Done returns edited exact requirements without discard confirmation',
    (tester) async {
      List<BinderCustomSlotDraft>? result;
      await openEditor(tester, result: (value) => result = value);
      await removeFirst(tester);
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(find.text('Discard checklist changes?'), findsNothing);
      expect(result?.single.finish.cardPrintingId, 'exact-holo');
      expect(result?.single.requiredQuantity, 1);
    },
  );

  testWidgets('unchanged draft and an exactly undone removal exit directly', (
    tester,
  ) async {
    var returns = 0;
    await openEditor(tester, result: (_) => returns++);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(returns, 1);
    expect(find.text('Discard checklist changes?'), findsNothing);
    await tester.tap(find.text('Open editor'));
    await tester.pumpAndSettle();
    await removeFirst(tester);
    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(returns, 2);
    expect(find.text('Discard checklist changes?'), findsNothing);
  });

  testWidgets('dragged order is protected and Keep editing retains it', (
    tester,
  ) async {
    await openEditor(tester);
    await navigation.switchView(tester, 'arrange');
    final gesture = await tester.startGesture(
      tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-0'))) +
          const Offset(30, 30),
    );
    await tester.pump(const Duration(milliseconds: 400));
    await gesture.moveTo(
      tester.getTopLeft(find.byKey(const ValueKey('binder-drop-1'))) +
          const Offset(40, 45),
    );
    await gesture.moveBy(const Offset(1, 1));
    await tester.pump(const Duration(milliseconds: 200));
    await gesture.up();
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Discard checklist changes?'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    await navigation.switchView(tester, 'checklist');
    expect(find.textContaining('Holofoil · 1 copy'), findsOneWidget);
    final titles = tester
        .widgetList<ListTile>(find.byType(ListTile))
        .map((tile) => (tile.subtitle as Text).data)
        .toList();
    expect(titles.first, contains('Holofoil'));
    expect(titles.last, contains('Reverse Holo'));
  });
}
