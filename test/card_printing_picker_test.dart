import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/widgets/cards/card_printing_picker.dart';

const choices = [
  CardPrintingChoice(id: 'normal', label: 'Normal', publicId: 'GV-PK-LOCAL-7'),
  CardPrintingChoice(
    id: 'reverse',
    label: 'Reverse Holo',
    publicId: 'GV-PK-LOCAL-7-RH',
  ),
  CardPrintingChoice(id: 'cosmos', label: 'Cosmos Holo'),
];

void main() {
  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      for (final size in [const Size(360, 640), const Size(1100, 800)]) {
        testWidgets('printing picker fits $brightness $scale $size', (
          tester,
        ) async {
          await tester.binding.setSurfaceSize(size);
          addTearDown(() => tester.binding.setSurfaceSize(null));
          String? selected;
          var marketOpens = 0;
          final semantics = tester.ensureSemantics();

          await tester.pumpWidget(
            MaterialApp(
              theme: buildGrookaiTheme(brightness),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: child!,
              ),
              home: Scaffold(
                body: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: StatefulBuilder(
                    builder: (context, setState) => CardPrintingPicker(
                      choices: choices,
                      selectedId: selected,
                      onSelected: (id) => setState(() => selected = id),
                      onRetry: () {},
                      onViewMarket: () => marketOpens++,
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          final row = find.byKey(const ValueKey('printing-choice-reverse'));
          expect(tester.getSize(row).height, greaterThanOrEqualTo(64));
          expect(
            tester.getSemantics(row).flagsCollection.isSelected,
            ui.Tristate.isFalse,
          );
          await tester.tap(find.text('Reverse Holo'));
          await tester.pumpAndSettle();
          expect(selected, 'reverse');
          expect(
            tester.getSemantics(row).flagsCollection.isSelected,
            ui.Tristate.isTrue,
          );
          expect(find.text('GV-PK-LOCAL-7-RH'), findsOneWidget);
          final market = find.text('View selected market');
          await tester.ensureVisible(market);
          await tester.tap(market);
          expect(marketOpens, 1);
          expect(tester.takeException(), isNull);
          semantics.dispose();
        });
      }
    }
  }
  testWidgets('missing printings offer retry without a selected default', (
    tester,
  ) async {
    var retries = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CardPrintingPicker(
            choices: const [],
            selectedId: null,
            onSelected: (_) => fail('No printing may be invented'),
            onRetry: () => retries++,
            onViewMarket: () => fail('No market selection'),
          ),
        ),
      ),
    );
    expect(
      find.text('Printings are unavailable for this card.'),
      findsOneWidget,
    );
    expect(find.text('View selected market'), findsNothing);
    await tester.tap(find.text('Retry printings'));
    expect(retries, 1);
  });
  testWidgets('loading exposes no stale printing controls', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CardPrintingPicker(
            choices: choices,
            selectedId: 'normal',
            loading: true,
            onSelected: (_) => fail('Loading'),
            onRetry: () {},
            onViewMarket: () {},
          ),
        ),
      ),
    );
    expect(find.text('Normal'), findsNothing);
    expect(find.text('View selected market'), findsNothing);
    expect(find.bySemanticsLabel('Loading printings'), findsOneWidget);
  });
}
