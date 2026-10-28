import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/models/binders/binder_grid_layout.dart';
import 'package:grookai_vault/services/binders/binder_grid_preferences.dart';
import 'package:grookai_vault/screens/binders/binder_custom_checklist_screen.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'package:grookai_vault/widgets/binders/binder_slot_choice_sheet.dart';
import 'binder_refinement_test.dart' as f;
import 'binder_editor_navigation_test.dart' as nav;
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_grid_size_test.dart' as grid;
import 'binder_draft_exit_test.dart' as exit;
import 'binder_move_history_test.dart' as history;

final searchField = find.byKey(const ValueKey('binder-checklist-search'));

Future<void> search(WidgetTester tester, String query) async {
  await tester.ensureVisible(searchField);
  await tester.enterText(searchField, query);
  await tester.pumpAndSettle();
}

Future<void> locate(WidgetTester tester, String name) async {
  await tester.tap(find.byTooltip('Options for $name').first);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Show in Arrange'));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await BinderGridPreferences.shared.select(BinderGridLayout.threeByThree);
  });

  testWidgets(
    'local multi-term search preserves true indices and exact finish on remove/Undo',
    (tester) async {
      final repository = f.TestRepository();
      final slots = [
        const BinderCustomSlotDraft(card: f.card, finish: f.holoFinish),
        nav.exactSlot,
      ];
      await tester.pumpWidget(
        f.app(
          BinderCustomChecklistEditorScreen(
            repository: repository,
            initialSlots: slots,
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (final query in [
        '  EEvee  reverse 173 ',
        'violet reverse',
        '173 reverse',
        '#173 reverse',
      ]) {
        await search(tester, query);
        expect(find.text('2. Eevee'), findsOneWidget);
        expect(find.text('1. Eevee'), findsNothing);
        expect(
          find.text('1 of 2 slots · Original pocket numbers'),
          findsOneWidget,
        );
      }
      expect(repository.queries, ['']);
      expect(repository.finishLoads, 0);
      final listener = tester.widget<ReorderableDelayedDragStartListener>(
        find.byType(ReorderableDelayedDragStartListener),
      );
      expect(listener.enabled, false);
      await nav.openOptions(tester);
      await tester.tap(find.text('Remove slot'));
      await tester.pumpAndSettle();
      expect(find.text('1 slot · 1 copy'), findsOneWidget);
      expect(find.textContaining('No checklist slots match.'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(find.text('2. Eevee'), findsOneWidget);
      expect(find.textContaining('Reverse Holo · 3 copies'), findsOneWidget);
      await tester.tap(find.byTooltip('Clear checklist search'));
      await tester.pumpAndSettle();
      expect(find.text('1. Eevee'), findsOneWidget);
      expect(find.text('2. Eevee'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'filtered edit targets original requirement and local/catalog queries remain independent',
    (tester) async {
      final repository = f.TestRepository();
      await tester.pumpWidget(
        f.app(
          BinderCustomChecklistEditorScreen(
            repository: repository,
            initialSlots: const [
              BinderCustomSlotDraft(card: f.card, finish: f.holoFinish),
              nav.exactSlot,
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      await search(tester, 'reverse');
      await tester.tap(find.text('2. Eevee'));
      await tester.pumpAndSettle();
      final qty = find.byKey(const ValueKey('binder-slot-quantity'));
      // Inspect the requirement passed to the sheet before its lazy footer mounts.
      final sheet = tester.widget<BinderSlotChoiceSheet>(
        find.byType(BinderSlotChoiceSheet),
      );
      expect(sheet.existing!.finish.cardPrintingId, 'exact-reverse');
      expect(sheet.existing!.requiredQuantity, 3);
      expect(repository.finishLoads, 1);
      await f.reveal(tester, qty);
      await tester.enterText(qty, '4');
      await f.reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.pumpAndSettle();
      expect(find.text('2. Eevee'), findsOneWidget);
      expect(find.textContaining('Reverse Holo · 4 copies'), findsOneWidget);
      expect(find.text('2 slots · 5 copies'), findsOneWidget);
      await nav.switchView(tester, 'find');
      await tester.enterText(
        find.byKey(const ValueKey('binder-custom-card-search')),
        'catalog',
      );
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();
      await nav.switchView(tester, 'checklist');
      expect(tester.widget<TextField>(searchField).controller!.text, 'reverse');
      expect(find.text('2. Eevee'), findsOneWidget);
      expect(repository.queries, ['', 'catalog']);
    },
  );

  for (final mode in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      testWidgets(
        'locate exact off-page requirement is view-only, repeatable and clean $mode $scale',
        (tester) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            f.app(
              Scaffold(
                body: Builder(
                  builder: (context) => TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => BinderCustomChecklistEditorScreen(
                          repository: f.TestRepository(),
                          initialSlots: drag.sampleSlots(18),
                        ),
                      ),
                    ),
                    child: const Text('Open'),
                  ),
                ),
              ),
              mode: mode,
              scale: scale,
            ),
          );
          await tester.tap(find.text('Open'));
          await tester.pumpAndSettle();
          for (var attempt = 0; attempt < 2; attempt++) {
            if (attempt == 1) {
              await nav.switchView(tester, 'arrange');
              await tester.ensureVisible(find.text('Artwork'));
              await tester.pumpAndSettle();
              await tester.tap(find.text('Artwork'));
              await tester.pumpAndSettle();
              await nav.switchView(tester, 'checklist');
            }
            await search(tester, 'Card 17');
            await locate(tester, 'Card 17');
            expect(tester.testTextInput.isVisible, false);
            expect(find.text('2 / 2'), findsOneWidget);
            expect(
              find.textContaining('Located pocket 18: Card 17 · Reverse Holo'),
              findsOneWidget,
            );
            expect(find.textContaining('Moving from pocket'), findsNothing);
            final pocket = find.byKey(const ValueKey('binder-pocket-17'));
            final rect = tester.getRect(pocket);
            expect(rect.bottom, lessThanOrEqualTo(844));
            expect(rect.top, greaterThan(180));
            // A fresh tap selects a move; it must never move the located card.
            final other = find.byKey(const ValueKey('binder-pocket-16'));
            await tester.ensureVisible(other);
            await tester.pumpAndSettle();
            await tester.tapAt(tester.getTopLeft(other) + const Offset(20, 20));
            await tester.pumpAndSettle();
            expect(find.text('Moving from pocket 17'), findsOneWidget);
            expect(
              find.byKey(const ValueKey('binder-undo-move')),
              findsNothing,
            );
            await nav.switchView(tester, 'checklist');
          }
          await tester.pageBack();
          await tester.pumpAndSettle();
          expect(find.text('Open'), findsOneWidget);
          expect(find.text('Discard checklist changes?'), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  for (final size in [
    const Size(320, 640),
    const Size(700, 420),
    const Size(1100, 700),
  ]) {
    for (final mode in Brightness.values) {
      testWidgets(
        'checklist search, no-match and clear fit at enlarged text $size $mode',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            f.app(
              BinderCustomChecklistEditorScreen(
                repository: f.TestRepository(),
                initialSlots: const [nav.exactSlot],
              ),
              mode: mode,
              scale: 1.6,
            ),
          );
          await tester.pumpAndSettle();
          await search(tester, 'no such card');
          expect(
            find.textContaining('No checklist slots match.'),
            findsOneWidget,
          );
          await tester.tap(find.byTooltip('Clear checklist search'));
          await tester.pumpAndSettle();
          expect(find.text('1. Eevee'), findsOneWidget);
          await tester.ensureVisible(find.byTooltip('Options for Eevee'));
          await tester.pumpAndSettle();
          await locate(tester, 'Eevee');
          expect(
            find.text('Located pocket 1: Eevee · Reverse Holo'),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'locating same parent highlights exact finish, never arms a move or dirties editor',
    (tester) async {
      await exit.openEditor(tester);
      await search(tester, 'holofoil');
      await locate(tester, 'Eevee');
      expect(find.text('Located pocket 2: Eevee · Holofoil'), findsOneWidget);
      expect(find.textContaining('Moving from pocket'), findsNothing);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open editor'), findsOneWidget);
    },
  );

  testWidgets(
    'reveal preserves Undo, anchors grid resize and clears safely after external removal',
    (tester) async {
      final slots = drag.sampleSlots(18);
      final moves = <List<int>>[];
      final preferences = grid.localPreferences();
      String? key;
      var version = 0;
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
                    revealSlotKey: key,
                    revealVersion: version,
                    onMove: (from, to) => set(() {
                      moves.add([from, to]);
                      slots.insert(to, slots.removeAt(from));
                    }),
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await history.move(tester, 0, 1);
      update(() {
        key = slots[17].displayKey;
        version++;
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('Located pocket 18:'), findsOneWidget);
      expect(find.byKey(const ValueKey('binder-undo-move')), findsOneWidget);
      await preferences.select(BinderGridLayout.twoByTwo);
      await tester.pumpAndSettle();
      expect(find.text('5 / 5'), findsOneWidget);
      expect(find.byKey(const ValueKey('binder-pocket-17')), findsOneWidget);
      await history.action(tester, 'undo');
      expect(moves, [
        [0, 1],
        [1, 0],
      ]);
      expect(find.textContaining('Located pocket'), findsNothing);
      update(() {
        version++;
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('Located pocket 18:'), findsOneWidget);
      update(() {
        slots.removeLast();
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('Located pocket'), findsNothing);
      update(() {
        version++;
      }); // Missing exact key is ignored; no substitute.
      await tester.pumpAndSettle();
      expect(find.textContaining('Located pocket'), findsNothing);
      expect(moves.length, 2);
      expect(tester.takeException(), isNull);
    },
  );
}
