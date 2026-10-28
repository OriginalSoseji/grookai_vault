import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_custom_checklist_screen.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'package:grookai_vault/widgets/binders/binder_slot_choice_sheet.dart';

const card = BinderCatalogCard(
  cardPrintId: 'parent-eevee',
  name: 'Eevee',
  setLabel: 'Scarlet & Violet Promos',
  number: '173',
);
const anyFinish = BinderFinishOption(label: 'Any governed finish');
const holoFinish = BinderFinishOption(
  label: 'Holofoil',
  cardPrintingId: 'exact-holo',
);
const reverseFinish = BinderFinishOption(
  label: 'Reverse Holo',
  cardPrintingId: 'exact-reverse',
);
const finishes = [anyFinish, holoFinish, reverseFinish];

class TestRepository implements BinderRepository {
  Future<List<BinderCatalogCard>> Function(String)? search;
  final queries = <String>[];
  int finishLoads = 0;
  @override
  String? get currentUserId => null;
  @override
  Future<List<BinderCatalogCard>> searchCustomCards({
    required String query,
    int limit = 30,
  }) async {
    queries.add(query);
    return search == null ? [card] : search!(query);
  }

  @override
  Future<List<BinderFinishOption>> loadCardFinishOptions(String id) async {
    finishLoads++;
    return finishes;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw StateError('Unexpected repository call');
}

Future<void> reveal(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    150,
    scrollable: find
        .byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              widget.axisDirection == AxisDirection.down,
        )
        .last,
  );
  await tester.pumpAndSettle();
}

Widget app(
  Widget home, {
  Brightness mode = Brightness.dark,
  double scale = 1,
  double keyboard = 0,
}) => MaterialApp(
  theme: buildGrookaiTheme(mode),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      textScaler: TextScaler.linear(scale),
      viewInsets: EdgeInsets.only(bottom: keyboard),
    ),
    child: child!,
  ),
  home: home,
);

Future<void> openSheet(
  WidgetTester tester, {
  Brightness mode = Brightness.dark,
  double scale = 1,
  double keyboard = 0,
  List<BinderFinishOption> options = finishes,
  BinderCatalogCard targetCard = card,
  BinderCustomSlotDraft? existing,
  void Function(BinderCustomSlotDraft?)? result,
}) async {
  await tester.pumpWidget(
    app(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              final choice = await showModalBottomSheet<BinderCustomSlotDraft>(
                context: context,
                isScrollControlled: true,
                useSafeArea: true,
                constraints: const BoxConstraints(maxWidth: 640),
                builder: (_) => BinderSlotChoiceSheet(
                  card: targetCard,
                  finishes: options,
                  existing: existing,
                ),
              );
              result?.call(choice);
            },
            child: const Text('Open'),
          ),
        ),
      ),
      mode: mode,
      scale: scale,
      keyboard: keyboard,
    ),
  );
  await tester.tap(find.text('Open'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('screen-reader pocket action selects the exact finish', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      app(
        Scaffold(
          body: SingleChildScrollView(
            child: BinderPageArrangement(
              slots: const [
                BinderCustomSlotDraft(card: card, finish: reverseFinish),
              ],
              onMove: (_, _) {},
            ),
          ),
        ),
      ),
    );
    final node = tester.getSemantics(
      find.byKey(const ValueKey('binder-pocket-0')),
    );
    node.owner!.performAction(node.id, ui.SemanticsAction.tap);
    await tester.pump();
    expect(find.text('Eevee · Reverse Holo'), findsOneWidget);
    expect(find.text('Cancel move'), findsOneWidget);
    semantics.dispose();
  });
  for (final mode in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      for (final size in [const Size(390, 844), const Size(1100, 700)]) {
        testWidgets('finish sheet $mode $scale $size wraps and scrolls', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await openSheet(tester, mode: mode, scale: scale);
          expect(find.text('Scarlet & Violet Promos · #173'), findsOneWidget);
          await reveal(
            tester,
            find.byKey(const ValueKey('custom-finish-exact-reverse')),
          );
          await tester.tap(
            find.byKey(const ValueKey('custom-finish-exact-reverse')),
          );
          await reveal(
            tester,
            find.byKey(const ValueKey('binder-slot-confirm')),
          );
          expect(tester.takeException(), isNull);
          await tester.tap(find.byTooltip('Close slot choices'));
          await tester.pumpAndSettle();
          expect(find.byType(BinderSlotChoiceSheet), findsNothing);
        });
        testWidgets('arrangement $mode $scale $size keeps finish identity', (
          tester,
        ) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final slots = [
            const BinderCustomSlotDraft(card: card, finish: holoFinish),
            const BinderCustomSlotDraft(
              card: card,
              finish: reverseFinish,
              requiredQuantity: 2,
            ),
          ];
          final moves = <List<int>>[];
          await tester.pumpWidget(
            app(
              Scaffold(
                body: SingleChildScrollView(
                  child: StatefulBuilder(
                    builder: (_, set) => BinderPageArrangement(
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
          await tester.tap(find.byKey(const ValueKey('binder-pocket-1')));
          await tester.pump();
          expect(find.text('Eevee · Reverse Holo'), findsOneWidget);
          await tester.tap(find.byKey(const ValueKey('binder-pocket-0')));
          await tester.pump();
          expect(moves, [
            [1, 0],
          ]);
          expect(slots.first.finish.cardPrintingId, 'exact-reverse');
          expect(slots.first.requiredQuantity, 2);
          expect(
            find.textContaining('moved to pocket 1. Order is not saved yet.'),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  }

  testWidgets(
    'choice returns exact finish and quantity; validation preserves draft',
    (tester) async {
      BinderCustomSlotDraft? result;
      await openSheet(tester, result: (value) => result = value);
      await reveal(
        tester,
        find.byKey(const ValueKey('custom-finish-exact-reverse')),
      );
      await tester.tap(
        find.byKey(const ValueKey('custom-finish-exact-reverse')),
      );
      await reveal(tester, find.byKey(const ValueKey('binder-slot-quantity')));
      await tester.enterText(
        find.byKey(const ValueKey('binder-slot-quantity')),
        '101',
      );
      await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.pumpAndSettle();
      expect(find.text('Enter a quantity from 1 to 100.'), findsOneWidget);
      expect(result, isNull);
      await tester.enterText(
        find.byKey(const ValueKey('binder-slot-quantity')),
        '3',
      );
      await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.pumpAndSettle();
      expect(result?.finish.cardPrintingId, 'exact-reverse');
      expect(result?.requiredQuantity, 3);
      expect(result?.card.cardPrintId, card.cardPrintId);
    },
  );

  testWidgets('editing retains exact finish; closing returns no draft', (
    tester,
  ) async {
    BinderCustomSlotDraft? result;
    var returned = false;
    await openSheet(
      tester,
      existing: const BinderCustomSlotDraft(
        card: card,
        finish: reverseFinish,
        requiredQuantity: 4,
      ),
      result: (value) {
        result = value;
        returned = true;
      },
    );
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    expect(
      tester
          .widget<TextField>(find.byKey(const ValueKey('binder-slot-quantity')))
          .controller
          ?.text,
      '4',
    );
    await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
    await tester.pumpAndSettle();
    expect(result?.finish.cardPrintingId, 'exact-reverse');
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Close slot choices'));
    await tester.pumpAndSettle();
    expect(returned, isTrue);
    expect(result, isNull);
  });

  testWidgets('missing finish choices cannot submit a guessed requirement', (
    tester,
  ) async {
    await openSheet(tester, options: []);
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const ValueKey('binder-slot-confirm')),
          )
          .onPressed,
      isNull,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('existing any-finish goal overrides a search preferred finish', (
    tester,
  ) async {
    BinderCustomSlotDraft? result;
    await openSheet(
      tester,
      targetCard: const BinderCatalogCard(
        cardPrintId: 'parent-eevee',
        name: 'Eevee',
        setLabel: 'Promos',
        preferredCardPrintingId: 'exact-reverse',
      ),
      existing: const BinderCustomSlotDraft(card: card, finish: anyFinish),
      result: (value) => result = value,
    );
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
    await tester.pumpAndSettle();
    expect(result, isNotNull);
    expect(result?.finish.cardPrintingId, isNull);
  });

  testWidgets(
    'editor Done returns the chosen draft without repository mutations',
    (tester) async {
      final repository = TestRepository();
      List<BinderCustomSlotDraft>? result;
      await tester.pumpWidget(
        app(
          Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async {
                  result = await Navigator.of(context)
                      .push<List<BinderCustomSlotDraft>>(
                        MaterialPageRoute(
                          builder: (_) => BinderCustomChecklistEditorScreen(
                            repository: repository,
                          ),
                        ),
                      );
                },
                child: const Text('Edit'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(ListTile).first);
      await tester.pumpAndSettle();
      await reveal(
        tester,
        find.byKey(const ValueKey('custom-finish-exact-holo')),
      );
      await tester.tap(find.byKey(const ValueKey('custom-finish-exact-holo')));
      await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(result?.single.finish.cardPrintingId, 'exact-holo');
      expect(result?.single.card.cardPrintId, 'parent-eevee');
      expect(result?.single.requiredQuantity, 1);
      expect(repository.finishLoads, 1);
    },
  );

  testWidgets('removed exact finish requires an explicit replacement', (
    tester,
  ) async {
    await openSheet(
      tester,
      options: [anyFinish],
      existing: const BinderCustomSlotDraft(card: card, finish: reverseFinish),
    );
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const ValueKey('binder-slot-confirm')),
          )
          .onPressed,
      isNull,
    );
    expect(
      find.textContaining('previous finish is unavailable'),
      findsOneWidget,
    );
    await reveal(tester, find.byKey(const ValueKey('custom-finish-any')));
    await tester.tap(find.byKey(const ValueKey('custom-finish-any')));
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const ValueKey('binder-slot-confirm')),
          )
          .onPressed,
      isNotNull,
    );
  });

  testWidgets('keyboard and enlarged text retain a scrollable submit action', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(700, 420);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await openSheet(tester, scale: 1.6, keyboard: 170);
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    final button = tester.getRect(
      find.byKey(const ValueKey('binder-slot-confirm')),
    );
    expect(button.bottom, lessThanOrEqualTo(250));
    expect(tester.takeException(), isNull);
  });

  testWidgets('new query invalidates previous response before debounce', (
    tester,
  ) async {
    final stale = Completer<List<BinderCatalogCard>>();
    final repository = TestRepository()
      ..search = (query) => query == '' ? stale.future : Future.value([]);
    await tester.pumpWidget(
      app(BinderCustomChecklistEditorScreen(repository: repository)),
    );
    await tester.enterText(
      find.byKey(const ValueKey('binder-custom-card-search')),
      'different card',
    );
    stale.complete([card]);
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Eevee'), findsNothing);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();
    expect(repository.queries, ['', 'different card']);
    expect(
      find.text('No canonical cards matched that search.'),
      findsOneWidget,
    );
  });

  testWidgets('search failure offers retry without claiming empty results', (
    tester,
  ) async {
    final repository = TestRepository()
      ..search = (_) async => throw const BinderException(
        BinderFailureKind.offline,
        'Search is offline.',
      );
    await tester.pumpWidget(
      app(BinderCustomChecklistEditorScreen(repository: repository)),
    );
    await tester.pumpAndSettle();
    expect(find.text('Search is offline.'), findsOneWidget);
    expect(find.text('No canonical cards matched that search.'), findsNothing);
    repository.search = (_) async => [card];
    await tester.tap(find.text('Retry card search'));
    await tester.pumpAndSettle();
    expect(find.text('Eevee'), findsOneWidget);
  });

  testWidgets('editor rejects any-finish overlap after exact choice', (
    tester,
  ) async {
    final repository = TestRepository();
    await tester.pumpWidget(
      app(
        BinderCustomChecklistEditorScreen(
          repository: repository,
          initialSlots: const [
            BinderCustomSlotDraft(card: card, finish: anyFinish),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('binder-view-find')));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    await reveal(
      tester,
      find.byKey(const ValueKey('custom-finish-exact-holo')),
    );
    await tester.tap(find.byKey(const ValueKey('custom-finish-exact-holo')));
    await reveal(tester, find.byKey(const ValueKey('binder-slot-confirm')));
    await tester.tap(find.byKey(const ValueKey('binder-slot-confirm')));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('cannot overlap a finish-specific slot'),
      findsOneWidget,
    );
    expect(find.text('1 slot · 1 copy'), findsOneWidget);
    expect(repository.finishLoads, 1);
    expect(tester.takeException(), isNull);
  });
}
