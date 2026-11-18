import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/pricing/condition_price_service.dart';
import 'package:grookai_vault/widgets/pricing/condition_price_panel.dart';

class _Reader implements ConditionPriceReader {
  final result = Completer<ConditionPriceReference>();
  String? printing, condition;
  bool disposed = false;
  @override
  Future<ConditionPriceReference> read(String printingId, String value) {
    printing = printingId;
    condition = value;
    return result.future;
  }

  void complete(double? amount, {String? printingId}) => result.complete(
    ConditionPriceReference(
      printingId: printingId ?? printing!,
      condition: condition!,
      amount: amount,
      updatedAt: DateTime.utc(2026, 11, 17),
    ),
  );
  @override
  void dispose() => disposed = true;
}

void main() {
  testWidgets(
    'rapid selection clears old amounts, cancels reads and ignores late results',
    (tester) async {
      final reads = <_Reader>[];
      ConditionPriceReader factory() {
        final reader = _Reader();
        reads.add(reader);
        return reader;
      }

      Future<void> render(String? printing, String? condition) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ConditionPricePanel(
                printingId: printing,
                condition: condition,
                createReader: factory,
              ),
            ),
          ),
        );
      }

      await render('normal', 'NM');
      reads.last.complete(2.51);
      await tester.pump();
      expect(find.text('2.51'), findsOneWidget);
      await render('normal', 'LP');
      expect(find.text('2.51'), findsNothing);
      expect(find.text('Loading condition price…'), findsOneWidget);
      final old = reads.last;
      await render('reverse', 'LP');
      expect(old.disposed, true);
      old.complete(1.16);
      await tester.pumpAndSettle();
      expect(find.text('1.16'), findsNothing);
      reads.last.complete(3.34);
      await tester.pumpAndSettle();
      expect(
        find.text('3.34'),
        findsOneWidget,
        reason: tester
            .widgetList<Text>(find.byType(Text))
            .map((w) => w.data)
            .join('|'),
      );
      expect(find.text('Reported amount · USD assumed'), findsOneWidget);
      expect(find.text('TCGplayer via TCGTracking'), findsOneWidget);
      await render('reverse', 'DMG');
      reads.last.complete(null);
      await tester.pumpAndSettle();
      expect(find.text('DMG price unavailable'), findsOneWidget);
      expect(find.text('3.34'), findsNothing);
      await render('reverse', 'Unknown');
      expect(find.text('Choose a condition to see its price.'), findsOneWidget);
      final count = reads.length;
      await render(null, 'NM');
      expect(reads.length, count);
      expect(
        find.text('Choose an exact printing to see its condition price.'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'failed and mismatched responses hide prices, retry uses current selection',
    (tester) async {
      final reads = <_Reader>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConditionPricePanel(
              printingId: 'normal',
              condition: 'NM',
              createReader: () {
                final r = _Reader();
                reads.add(r);
                return r;
              },
            ),
          ),
        ),
      );
      reads.last.complete(99, printingId: 'wrong');
      await tester.pump();
      expect(find.text('99.00'), findsNothing);
      expect(find.text('Condition price could not load.'), findsOneWidget);
      await tester.tap(find.text('Retry condition price'));
      await tester.pump();
      reads.last.result.completeError(StateError('offline'));
      await tester.pump();
      await tester.tap(find.text('Retry condition price'));
      await tester.pump();
      reads.last.complete(2.51);
      await tester.pump();
      expect(find.text('2.51'), findsOneWidget);
      expect(reads.length, 3);
      await tester.pumpWidget(const SizedBox());
      expect(reads.every((r) => r.disposed), true);
      expect(tester.takeException(), isNull);
    },
  );
}
