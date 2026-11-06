import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_custom_checklist_screen.dart';

import 'binder_refinement_test.dart' as fixtures;

const exactSlot = BinderCustomSlotDraft(
  card: fixtures.card,
  finish: fixtures.reverseFinish,
  requiredQuantity: 3,
);

Future<void> switchView(WidgetTester tester, String view) async {
  await tester.tap(find.byKey(ValueKey('binder-view-$view')));
  await tester.pumpAndSettle();
}

Future<void> openOptions(WidgetTester tester) async {
  await tester.tap(find.byTooltip('Options for Eevee').first);
  await tester.pumpAndSettle();
}

void main() {
  for (final mode in Brightness.values) {
    testWidgets('Undo action has readable contrast in $mode', (tester) async {
      await tester.pumpWidget(
        fixtures.app(
          BinderCustomChecklistEditorScreen(
            repository: fixtures.TestRepository(),
            initialSlots: const [exactSlot],
          ),
          mode: mode,
        ),
      );
      await tester.pumpAndSettle();
      await openOptions(tester);
      await tester.tap(find.text('Remove slot'));
      await tester.pumpAndSettle();
      final action = tester.widget<SnackBarAction>(find.byType(SnackBarAction));
      final theme = Theme.of(tester.element(find.byType(SnackBarAction)));
      final background =
          tester.widget<SnackBar>(find.byType(SnackBar)).backgroundColor ??
          theme.snackBarTheme.backgroundColor!;
      final luminances = [
        action.textColor!.computeLuminance(),
        background.computeLuminance(),
      ]..sort();
      expect(
        (luminances.last + .05) / (luminances.first + .05),
        greaterThanOrEqualTo(4.5),
      );
    });
  }
  testWidgets('compact keyboard viewport keeps tabs and search usable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(700, 420);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      fixtures.app(
        BinderCustomChecklistEditorScreen(
          repository: fixtures.TestRepository(),
        ),
        scale: 1.6,
        keyboard: 170,
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('binder-custom-card-search')),
      'Eevee',
    );
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();
    await switchView(tester, 'checklist');
    expect(find.text('No checklist slots yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await switchView(tester, 'find');
    await tester.tap(find.byTooltip('Clear card search'));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<TextField>(
            find.byKey(const ValueKey('binder-custom-card-search')),
          )
          .controller
          ?.text,
      '',
    );
    expect(tester.takeException(), isNull);
  });
  for (final mode in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      for (final size in [
        const Size(390, 844),
        const Size(1100, 700),
        const Size(700, 420),
      ]) {
        testWidgets('editor tabs retain draft/search $mode $scale $size', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final repository = fixtures.TestRepository();
          await tester.pumpWidget(
            fixtures.app(
              BinderCustomChecklistEditorScreen(
                repository: repository,
                initialSlots: const [exactSlot],
              ),
              mode: mode,
              scale: scale,
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('1. Eevee'), findsOneWidget);
          expect(find.text('1 slot · 3 copies'), findsOneWidget);
          expect(
            find.byKey(const ValueKey('binder-custom-card-search')),
            findsNothing,
          );
          await switchView(tester, 'arrange');
          final pocket = find.byKey(const ValueKey('binder-pocket-0'));
          await tester.ensureVisible(pocket);
          await tester.pumpAndSettle();
          await tester.tapAt(tester.getTopLeft(pocket) + const Offset(20, 20));
          await tester.pumpAndSettle();
          expect(find.text('Eevee · Reverse Holo'), findsOneWidget);
          await switchView(tester, 'find');
          await tester.enterText(
            find.byKey(const ValueKey('binder-custom-card-search')),
            'Eevee 173',
          );
          await tester.pump(const Duration(milliseconds: 350));
          await tester.pumpAndSettle();
          await switchView(tester, 'checklist');
          expect(tester.testTextInput.isVisible, isFalse);
          await switchView(tester, 'find');
          expect(
            tester
                .widget<TextField>(
                  find.byKey(const ValueKey('binder-custom-card-search')),
                )
                .controller
                ?.text,
            'Eevee 173',
          );
          expect(repository.queries, ['', 'Eevee 173']);
          await switchView(tester, 'arrange');
          expect(find.text('Eevee · Reverse Holo'), findsOneWidget);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }

  testWidgets('removal Undo restores exact finish, quantity and position', (
    tester,
  ) async {
    await tester.pumpWidget(
      fixtures.app(
        BinderCustomChecklistEditorScreen(
          repository: fixtures.TestRepository(),
          initialSlots: const [exactSlot],
        ),
      ),
    );
    await tester.pumpAndSettle();
    await openOptions(tester);
    await tester.tap(find.text('Remove slot'));
    await tester.pumpAndSettle();
    expect(find.text('0 slots · 0 copies'), findsOneWidget);
    expect(find.text('No checklist slots yet'), findsOneWidget);
    expect(
      tester
          .widget<TextButton>(find.widgetWithText(TextButton, 'Done'))
          .onPressed,
      isNull,
    );
    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(find.text('1 slot · 3 copies'), findsOneWidget);
    expect(find.text('1. Eevee'), findsOneWidget);
    expect(find.textContaining('Reverse Holo · 3 copies'), findsOneWidget);
    await switchView(tester, 'arrange');
    expect(find.text('Reverse Holo · ×3'), findsOneWidget);
  });

  testWidgets(
    'new checklist has actionable empty views and returns to review after add',
    (tester) async {
      await tester.pumpWidget(
        fixtures.app(
          BinderCustomChecklistEditorScreen(
            repository: fixtures.TestRepository(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('binder-custom-card-search')),
        findsOneWidget,
      );
      await switchView(tester, 'arrange');
      expect(find.text('No checklist slots yet'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Find cards'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(ListTile).first);
      await tester.pumpAndSettle();
      await fixtures.reveal(
        tester,
        find.byKey(const ValueKey('custom-finish-exact-holo')),
      );
      await tester.tap(find.byKey(const ValueKey('custom-finish-exact-holo')));
      await fixtures.reveal(
        tester,
        find.byKey(const ValueKey('binder-slot-confirm')),
      );
      await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.pumpAndSettle();
      expect(find.text('1. Eevee'), findsOneWidget);
      expect(find.textContaining('Holofoil · 1 copy'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('binder-custom-card-search')),
        findsNothing,
      );
    },
  );

  testWidgets('arrangement page and chosen finish survive other editor tabs', (
    tester,
  ) async {
    final slots = [
      for (var i = 0; i < 10; i++)
        BinderCustomSlotDraft(
          card: BinderCatalogCard(
            cardPrintId: 'card-$i',
            name: 'Card $i',
            setLabel: 'Set',
          ),
          finish: BinderFinishOption(
            label: 'Holo',
            cardPrintingId: 'finish-$i',
          ),
        ),
    ];
    await tester.pumpWidget(
      fixtures.app(
        BinderCustomChecklistEditorScreen(
          repository: fixtures.TestRepository(),
          initialSlots: slots,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await switchView(tester, 'arrange');
    await tester.tapAt(
      tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-0'))) +
          const Offset(20, 20),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Next binder page'));
    await tester.pumpAndSettle();
    await switchView(tester, 'find');
    await switchView(tester, 'checklist');
    await switchView(tester, 'arrange');
    expect(find.text('2 / 2'), findsOneWidget);
    expect(find.text('Card 0 · Holo'), findsOneWidget);
    await tester.tapAt(
      tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-9'))) +
          const Offset(20, 20),
    );
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Card 0 · Holo moved to pocket 10'),
      findsOneWidget,
    );
    await switchView(tester, 'checklist');
    await switchView(tester, 'arrange');
    expect(
      find.textContaining('Card 0 · Holo moved to pocket 10'),
      findsOneWidget,
    );
  });

  testWidgets('removing a selected slot clears the obsolete move selection', (
    tester,
  ) async {
    await tester.pumpWidget(
      fixtures.app(
        BinderCustomChecklistEditorScreen(
          repository: fixtures.TestRepository(),
          initialSlots: const [
            exactSlot,
            BinderCustomSlotDraft(
              card: fixtures.card,
              finish: fixtures.holoFinish,
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    await switchView(tester, 'arrange');
    await tester.tapAt(
      tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-0'))) +
          const Offset(20, 20),
    );
    await tester.pumpAndSettle();
    await switchView(tester, 'checklist');
    await openOptions(tester);
    await tester.tap(find.text('Remove slot'));
    await tester.pumpAndSettle();
    await switchView(tester, 'arrange');
    expect(find.text('Eevee · Reverse Holo'), findsNothing);
    expect(find.text('Cancel move'), findsNothing);
    expect(find.text('Holofoil · ×1'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('preview stays read-only and returns to the same view', (
    tester,
  ) async {
    await tester.pumpWidget(
      fixtures.app(
        BinderCustomChecklistEditorScreen(
          repository: fixtures.TestRepository(),
          initialSlots: const [exactSlot],
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Preview'));
    await tester.pumpAndSettle();
    expect(find.text('Review checklist'), findsOneWidget);
    expect(find.text('3 required copies'), findsNothing);
    expect(find.textContaining('1 slot · 3 required copies'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(find.text('1. Eevee'), findsOneWidget);
    expect(find.text('1 slot · 3 copies'), findsOneWidget);
  });
}
