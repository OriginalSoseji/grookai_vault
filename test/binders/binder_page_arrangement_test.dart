import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/widgets/binders/binder_page_arrangement.dart';

void main() {
  testWidgets('moves an exact finish across pages and preserves every slot', (
    tester,
  ) async {
    final slots = List.generate(
      10,
      (index) => BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: 'card-$index',
          name: 'Eevee ${index + 1}',
          setLabel: 'Test set',
        ),
        finish: BinderFinishOption(
          label: 'Holo',
          cardPrintingId: 'printing-$index',
        ),
      ),
    );
    final moves = <List<int>>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (context, set) => BinderPageArrangement(
                slots: slots,
                onMove: (from, to) {
                  moves.add([from, to]);
                  set(() {
                    final item = slots.removeAt(from);
                    slots.insert(to, item);
                  });
                },
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const ValueKey('binder-pocket-0')));
    await tester.tap(find.byTooltip('Next binder page'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('binder-pocket-9')));
    await tester.pump();
    expect(moves, [
      [0, 9],
    ]);
    expect(slots.length, 10);
    expect(slots.last.finish.cardPrintingId, 'printing-0');
    expect(find.text('Empty pocket'), findsNWidgets(8));
    expect(tester.takeException(), isNull);
  });

  testWidgets('cancel move does not reorder and empty pockets are inert', (
    tester,
  ) async {
    var moved = false;
    final slots = [
      const BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: 'eevee',
          name: 'Eevee',
          setLabel: 'Promos',
        ),
        finish: BinderFinishOption(label: 'Holo', cardPrintingId: 'exact-holo'),
      ),
    ];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: BinderPageArrangement(
              slots: slots,
              onMove: (_, _) => moved = true,
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const ValueKey('binder-pocket-0')));
    await tester.pump();
    await tester.tap(find.text('Cancel move'));
    await tester.pump();
    expect(moved, false);
    expect(tester.takeException(), isNull);
  });
}
