import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';
import 'binder_refinement_test.dart' as fixtures;

List<BinderCustomSlotDraft> sampleSlots([int count = 12]) => [
  for (var i = 0; i < count; i++)
    BinderCustomSlotDraft(
      card: BinderCatalogCard(
        cardPrintId: 'card-$i',
        name: 'Card $i',
        setLabel: 'Set',
        number: '$i',
      ),
      finish: BinderFinishOption(
        label: i.isEven ? 'Holofoil' : 'Reverse Holo',
        cardPrintingId: 'finish-$i',
      ),
      requiredQuantity: i + 1,
    ),
];

Future<void> mount(
  WidgetTester tester,
  List<BinderCustomSlotDraft> slots,
  List<List<int>> moves, {
  Brightness mode = Brightness.dark,
  double scale = 1,
  ScrollController? controller,
}) async {
  await tester.pumpWidget(
    fixtures.app(
      Scaffold(
        body: SingleChildScrollView(
          controller: controller,
          child: StatefulBuilder(
            builder: (_, set) => BinderPageArrangement(
              slots: slots,
              onMove: (from, to) {
                moves.add([from, to]);
                set(() => slots.insert(to, slots.removeAt(from)));
              },
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

Future<TestGesture> lift(WidgetTester tester, [int index = 0]) async {
  final start =
      tester.getTopLeft(find.byKey(ValueKey('binder-pocket-$index'))) +
      const Offset(30, 30);
  final gesture = await tester.startGesture(start);
  await tester.pump(const Duration(milliseconds: 400));
  return gesture;
}

Future<void> hover(WidgetTester tester, TestGesture gesture, int index) async {
  final target =
      tester.getTopLeft(find.byKey(ValueKey('binder-drop-$index'))) +
      const Offset(45, 50);
  await gesture.moveTo(target);
  await tester.pump(const Duration(milliseconds: 200));
  await gesture.moveBy(const Offset(1, 1));
  await tester.pump(const Duration(milliseconds: 200));
}

void main() {
  testWidgets(
    'release after stationary edge scrolling uses the current pocket',
    (tester) async {
      tester.view.physicalSize = const Size(390, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = ScrollController();
      addTearDown(controller.dispose);
      final slots = sampleSlots();
      final moves = <List<int>>[];
      await mount(tester, slots, moves, controller: controller);
      final gesture = await lift(tester);
      const point = Offset(180, 680);
      await gesture.moveTo(point);
      for (var i = 0; i < 15; i++) {
        await tester.pump(const Duration(milliseconds: 40));
      }
      expect(controller.offset, greaterThan(0));
      final underFinger = [
        for (var i = 0; i < 9; i++)
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
    },
  );
  testWidgets('a second pointer cannot cancel the held drag', (tester) async {
    final slots = sampleSlots(3);
    final moves = <List<int>>[];
    await mount(tester, slots, moves);
    final gesture = await lift(tester);
    final other = await tester.startGesture(const Offset(790, 10), pointer: 99);
    await other.up();
    await tester.pump();
    expect(find.textContaining('Release over a pocket'), findsOneWidget);
    await hover(tester, gesture, 2);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(moves, [
      [0, 2],
    ]);
  });
  for (final mode in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      testWidgets(
        'long press previews and drops once with identity intact $mode $scale',
        (tester) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final slots = sampleSlots();
          final moves = <List<int>>[];
          final original = slots.map((slot) => slot.toWireJson()).toList();
          await mount(tester, slots, moves, mode: mode, scale: scale);
          final gesture = await lift(tester);
          await hover(tester, gesture, 2);
          expect(moves, isEmpty);
          expect(slots.map((slot) => slot.toWireJson()).toList(), original);
          expect(find.textContaining('Release over a pocket'), findsOneWidget);
          await gesture.up();
          await tester.pumpAndSettle();
          expect(moves, [
            [0, 2],
          ]);
          expect(slots[2].finish.cardPrintingId, 'finish-0');
          expect(slots[2].requiredQuantity, 1);
          expect(slots.map((slot) => slot.displayKey).toSet(), hasLength(12));
          expect(find.textContaining('moved to pocket 3.'), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets('cancel after preview leaves all draft data unchanged', (
    tester,
  ) async {
    final slots = sampleSlots();
    final moves = <List<int>>[];
    final original = slots.map((slot) => slot.toWireJson()).toList();
    await mount(tester, slots, moves);
    final gesture = await lift(tester);
    await hover(tester, gesture, 2);
    await gesture.cancel();
    await tester.pumpAndSettle();
    expect(moves, isEmpty);
    expect(slots.map((slot) => slot.toWireJson()).toList(), original);
    expect(find.textContaining('Release over a pocket'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('same-pocket release and outside release do not reorder', (
    tester,
  ) async {
    final slots = sampleSlots();
    final moves = <List<int>>[];
    await mount(tester, slots, moves);
    var gesture = await lift(tester);
    await hover(tester, gesture, 0);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(moves, isEmpty);
    gesture = await lift(tester);
    await gesture.moveTo(const Offset(790, 10));
    await gesture.up();
    await tester.pumpAndSettle();
    expect(moves, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('held drag turns page and commits exact child on release', (
    tester,
  ) async {
    final slots = sampleSlots();
    final moves = <List<int>>[];
    await mount(tester, slots, moves);
    final gesture = await lift(tester);
    await gesture.moveTo(tester.getCenter(find.byTooltip('Next binder page')));
    await gesture.moveBy(const Offset(1, 1));
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.text('2 / 2'), findsOneWidget);
    await hover(tester, gesture, 11);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(moves, [
      [0, 11],
    ]);
    expect(slots.last.finish.cardPrintingId, 'finish-0');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'last-page empty drop appends without manufacturing sparse slots',
    (tester) async {
      tester.view.physicalSize = const Size(800, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final slots = sampleSlots(3);
      final moves = <List<int>>[];
      await mount(tester, slots, moves);
      final gesture = await lift(tester);
      await hover(tester, gesture, 3);
      await gesture.up();
      await tester.pumpAndSettle();
      expect(moves, [
        [0, 2],
      ]);
      expect(slots.length, 3);
      expect(slots.last.finish.cardPrintingId, 'finish-0');
    },
  );

  testWidgets('bottom edge scrolls while holding, then cancel stops timers', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final controller = ScrollController();
    addTearDown(controller.dispose);
    final slots = sampleSlots();
    final moves = <List<int>>[];
    await mount(tester, slots, moves, controller: controller);
    final gesture = await lift(tester);
    await gesture.moveTo(const Offset(180, 680));
    await tester.pump(const Duration(milliseconds: 600));
    expect(controller.offset, greaterThan(0));
    await gesture.cancel();
    await tester.pumpAndSettle();
    final stopped = controller.offset;
    await tester.pump(const Duration(seconds: 1));
    expect(controller.offset, stopped);
    expect(moves, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('another Binder cannot accept this drag', (tester) async {
    final left = sampleSlots(3);
    final right = sampleSlots(3);
    var writes = 0;
    await tester.pumpWidget(
      fixtures.app(
        Scaffold(
          body: Row(
            children: [
              for (final slots in [left, right])
                Expanded(
                  child: SingleChildScrollView(
                    child: BinderPageArrangement(
                      slots: slots,
                      onMove: (_, _) => writes++,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final gesture = await tester.startGesture(
      tester.getTopLeft(find.byKey(const ValueKey('binder-pocket-0')).first) +
          const Offset(30, 30),
    );
    await tester.pump(const Duration(milliseconds: 400));
    await gesture.moveTo(
      tester.getTopLeft(find.byKey(const ValueKey('binder-drop-2')).last) +
          const Offset(30, 30),
    );
    await tester.pump(const Duration(milliseconds: 200));
    await gesture.up();
    await tester.pumpAndSettle();
    expect(writes, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('an external draft edit invalidates an in-flight drag', (
    tester,
  ) async {
    final slots = sampleSlots(3);
    var writes = 0;
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
                  onMove: (_, _) => writes++,
                );
              },
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final gesture = await lift(tester);
    update(() => slots.removeAt(0));
    await tester.pump();
    await hover(tester, gesture, 1);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(writes, 0);
    expect(slots.first.finish.cardPrintingId, 'finish-1');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'leaving the arrangement during drag removes global routing and timers',
    (tester) async {
      var visible = true;
      late StateSetter update;
      await tester.pumpWidget(
        fixtures.app(
          Scaffold(
            body: StatefulBuilder(
              builder: (_, set) {
                update = set;
                return visible
                    ? SingleChildScrollView(
                        child: BinderPageArrangement(
                          slots: sampleSlots(3),
                          onMove: (_, _) {},
                        ),
                      )
                    : const SizedBox();
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final gesture = await lift(tester);
      update(() => visible = false);
      await tester.pump();
      await gesture.cancel();
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 1));
      expect(tester.takeException(), isNull);
    },
  );
}
