import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/offer_policies.dart';
import 'sales_purchase_screen_test.dart'
    show PurchaseDeskFixture, openPurchase, tapVisible;

class PresetFixture extends PurchaseDeskFixture {
  Map<String, dynamic> presets = readOfferPolicies(null);
  bool fail = false;
  Completer<Map<String, dynamic>>? gate;
  @override
  Future<Map<String, dynamic>> loadOfferPolicies() async => presets;
  @override
  Future<Map<String, dynamic>> saveOfferPolicies(
    int revision,
    List<Map<String, dynamic>> values,
    Map<String, dynamic> defaults,
  ) async {
    if (fail) throw StateError('fixture storage failure');
    if (gate != null) return gate!.future;
    presets = validateOfferPolicies({
      'version': 2,
      'revision': revision + 1,
      'presets': values,
      'defaults': defaults,
    });
    return presets;
  }
}

Future<void> expand(WidgetTester tester) async {
  await tapVisible(tester, find.text('Quick purchase'));
  await tapVisible(tester, find.text('Calculate an offer · optional'));
  await tapVisible(tester, find.text('Offer policies'));
}

Future<void> enter(WidgetTester tester, String label, String value) async {
  final field = find.widgetWithText(TextField, label);
  await tester.ensureVisible(field);
  await tester.enterText(field, value);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'preset selection preserves agreed amount and saved lines survive deletion',
    (tester) async {
      final s = PresetFixture();
      s.seed();
      await openPurchase(tester, s);
      await expand(tester);
      await enter(tester, 'Agreed price per item (USD)', '6.50');
      await enter(tester, 'Reference value per item (USD)', '10.00');
      await enter(tester, 'Policy name', 'Standard cash');
      await enter(tester, 'Policy percentage', '60');
      await tapVisible(tester, find.text('Save new policy'));
      await tapVisible(tester, find.text('Use Standard cash'));
      expect(find.text('Using Standard cash'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(
              find.widgetWithText(TextField, 'Agreed price per item (USD)'),
            )
            .controller!
            .text,
        '6.50',
      );
      await enter(tester, 'Purchase item description', 'Preset card');
      await tapVisible(tester, find.text('Add to purchase'));
      final retained = jsonEncode(s.saved);
      await expand(tester);
      await tapVisible(tester, find.text('Edit Standard cash'));
      await enter(tester, 'Policy percentage', '70');
      await tapVisible(tester, find.text('Save policy changes'));
      await tapVisible(tester, find.text('Delete Standard cash'));
      expect(find.text('No saved policies yet.'), findsOneWidget);
      expect(jsonEncode(s.saved), retained);
      expect(s.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'failed preset save remains visible and does not claim it is saved',
    (tester) async {
      final s = PresetFixture()..fail = true;
      s.seed();
      await openPurchase(tester, s);
      await expand(tester);
      await enter(tester, 'Policy name', 'Unstored');
      await enter(tester, 'Policy percentage', '60');
      await tapVisible(tester, find.text('Save new policy'));
      expect(
        find.textContaining('Offer policies could not save'),
        findsOneWidget,
      );
      expect(find.text('Use Unstored'), findsNothing);
      expect(s.presets['presets'], isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'account change hides preset names and ignores delayed save reply',
    (tester) async {
      final s = PresetFixture();
      s.seed();
      await openPurchase(tester, s);
      await expand(tester);
      await enter(tester, 'Policy name', 'Private rule');
      await enter(tester, 'Policy percentage', '60');
      s.gate = Completer();
      await tester.ensureVisible(find.text('Save new policy'));
      await tester.tap(find.text('Save new policy'));
      await tester.pump();
      s.changes.add(null);
      await tester.pump();
      s.gate!.complete(
        validateOfferPolicies({
          'version': 1,
          'revision': 1,
          'presets': [
            {
              'id': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              'name': 'Private rule',
              'rateBps': 6000,
            },
          ],
        }),
      );
      await tester.pumpAndSettle();
      expect(find.text('Use Private rule'), findsNothing);
      expect(find.text('Private rule'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
