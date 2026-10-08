import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/screens/sales/sales_purchase_dialog.dart';
import 'package:grookai_vault/services/sales/offer_policies.dart';
import 'offer_presets_screen_test.dart' show PresetFixture, enter;
import 'sales_purchase_screen_test.dart' show tapVisible;

const policyId = '11111111-1111-4111-8111-111111111111';
const cardId = '22222222-2222-4222-8222-222222222222';
const printingId = '33333333-3333-4333-8333-333333333333';
const secondPrinting = '44444444-4444-4444-8444-444444444444';
Map<String, dynamic> policy({String source = 'manual'}) => validateOfferPolicy({
  'id': policyId,
  'name': 'Standard cash',
  'intent': 'cash',
  'rateBps': 6500,
  'source': source,
  'conditionBasis': 'unspecified',
  'rounding': {'incrementMinor': 25, 'mode': 'nearest'},
  'lowValueTier': {'ceilingMinor': 500, 'rateBps': 4000},
});

class PolicyDialogFixture extends PresetFixture {
  Map<String, dynamic>? result;
  int referenceReads = 0;
  bool referenceFails = false;
  Completer<Map<String, dynamic>>? referenceGate;
  Map<String, dynamic> reference = {
    'source': 'tcgplayer_market',
    'amountMinor': 1001,
    'currency': 'USD',
    'cardId': cardId,
    'printingId': printingId,
    'condition': null,
    'observedAt': DateTime.now()
        .toUtc()
        .subtract(const Duration(minutes: 2))
        .toIso8601String(),
    'publishedAt': DateTime.now()
        .toUtc()
        .subtract(const Duration(minutes: 1))
        .toIso8601String(),
    'provenanceId': policyId,
  };
  void install(Map<String, dynamic> value) {
    presets = validateOfferPolicies({
      'version': 2,
      'revision': 1,
      'presets': [value],
      'defaults': {'cash': value['id'], 'trade': null},
    });
  }

  @override
  Future<List<CardPrint>> searchCatalog(String query, String game) async => [
    CardPrint(
      id: cardId,
      name: 'Catalog card',
      gvId: 'GV-FIXTURE',
      setCode: 'TEST',
    ),
  ];
  @override
  Future<List<Map<String, dynamic>>> catalogPrintings(String id) async => [
    {
      'id': printingId,
      'card_print_id': id,
      'printing_gv_id': 'GVP-HOLO',
      'finish_is_active': true,
    },
    {
      'id': secondPrinting,
      'card_print_id': id,
      'printing_gv_id': 'GVP-REVERSE',
      'finish_is_active': true,
    },
  ];
  @override
  Future<Map<String, dynamic>> offerMarketReference(
    String id,
    String printing,
  ) async {
    referenceReads++;
    if (referenceGate != null) return referenceGate!.future;
    if (referenceFails) throw StateError('fixture read failed');
    return {
      'status': 'available',
      'reference': {...reference},
    };
  }
}

Future<void> open(
  WidgetTester tester,
  PolicyDialogFixture service, {
  bool quick = true,
  bool negotiated = false,
  Map<String, dynamic>? line,
  Size size = const Size(430, 932),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(service.changes.close);
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              service.result = await showDialog<Map<String, dynamic>>(
                context: context,
                builder: (_) => SalesPurchaseDialog(
                  service: service,
                  quick: quick,
                  negotiated: negotiated,
                  line: line,
                ),
              );
            },
            child: const Text('Open item'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open item'));
  await tester.pumpAndSettle();
}

Future<void> choose(WidgetTester tester, String label, String option) async {
  final field = find.byWidgetPredicate(
    (widget) =>
        widget is DropdownButtonFormField<String> &&
        widget.decoration.labelText == label,
  );
  await tester.ensureVisible(field);
  await tester.tap(field);
  await tester.pumpAndSettle();
  await tester.tap(find.text(option).last);
  await tester.pumpAndSettle();
}

Future<void> canonical(
  WidgetTester tester,
  PolicyDialogFixture service, {
  Size size = const Size(430, 932),
  bool negotiated = false,
}) async {
  await open(tester, service, quick: false, size: size, negotiated: negotiated);
  await enter(tester, 'Find incoming card', 'Catalog');
  await tester.pump(const Duration(milliseconds: 200));
  await tester.pumpAndSettle();
  await tapVisible(tester, find.text('Catalog card'));
  await choose(tester, 'Exact printing', 'GVP-HOLO');
  await tapVisible(tester, find.text('Calculate an offer · optional'));
}

String textValue(WidgetTester tester, String label) => tester
    .widget<TextField>(find.widgetWithText(TextField, label))
    .controller!
    .text;
void main() {
  testWidgets(
    'newly saved selected-condition tier policy rounds above ceiling',
    (tester) async {
      final s = PolicyDialogFixture();
      await canonical(tester, s);
      await enter(tester, 'Agreed price per item (USD)', '6.50');
      await enter(tester, 'Reference value per item (USD)', '10.00');
      await tapVisible(tester, find.text('Offer policies'));
      await enter(tester, 'Policy name', 'Private device cash');
      await enter(tester, 'Policy percentage', '60');
      await choose(tester, 'Round to', 'USD 0.50');
      await choose(tester, 'Rounding rule', 'Down');
      await tapVisible(tester, find.text('Use a low-value tier'));
      await enter(tester, 'Tier reference ceiling per item (USD)', '5.00');
      await enter(tester, 'Tier percentage', '40');
      await tapVisible(tester, find.text('Save new policy'));
      await choose(tester, 'Default cash policy', 'Private device cash');
      await tapVisible(tester, find.text('Use Private device cash'));
      await tapVisible(tester, find.text('Offer policies'));
      for (final sample in {
        '5.00': '2.00',
        '10.99': '6.50',
        '10.00': '6.00',
      }.entries) {
        await enter(tester, 'Reference value per item (USD)', sample.key);
        expect(textValue(tester, 'Reference value per item (USD)'), sample.key);
        expect(
          find.textContaining('Suggested offer: USD ${sample.value}'),
          findsOneWidget,
        );
        expect(textValue(tester, 'Agreed price per item (USD)'), '6.50');
      }
    },
  );
  testWidgets(
    'newly saved trade policy preserves agreed credit across tier and rounding',
    (tester) async {
      final s = PolicyDialogFixture();
      await canonical(tester, s, negotiated: true);
      await enter(tester, 'Agreed credit for this whole line (USD)', '6.50');
      await enter(tester, 'Reference value per item (USD)', '10.00');
      await tapVisible(tester, find.text('Offer policies'));
      await enter(tester, 'Policy name', 'Private device trade');
      await enter(tester, 'Policy percentage', '60');
      await choose(tester, 'Round to', 'USD 0.50');
      await choose(tester, 'Rounding rule', 'Down');
      await tapVisible(tester, find.text('Use a low-value tier'));
      await enter(tester, 'Tier reference ceiling per item (USD)', '5.00');
      await enter(tester, 'Tier percentage', '40');
      await tapVisible(tester, find.text('Save new policy'));
      await choose(tester, 'Default trade policy', 'Private device trade');
      await tapVisible(tester, find.text('Use Private device trade'));
      await tapVisible(tester, find.text('Offer policies'));
      for (final sample in {
        '5.00': '2.00',
        '10.99': '6.50',
        '10.00': '6.00',
      }.entries) {
        await enter(tester, 'Reference value per item (USD)', sample.key);
        expect(textValue(tester, 'Reference value per item (USD)'), sample.key);
        expect(
          find.textContaining('Suggested offer: USD ${sample.value}'),
          findsOneWidget,
        );
        expect(
          textValue(tester, 'Agreed credit for this whole line (USD)'),
          '6.50',
        );
      }
    },
  );
  testWidgets(
    'new cash default applies tier per unit and preserves explicit negotiated amount',
    (tester) async {
      final s = PolicyDialogFixture()..install(policy());
      await open(tester, s);
      await enter(tester, 'Agreed price per item (USD)', '6.50');
      await tapVisible(tester, find.text('Calculate an offer · optional'));
      expect(find.text('Using Standard cash'), findsOneWidget);
      await enter(tester, 'Reference value per item (USD)', '5.00');
      await enter(tester, 'Quantity', '3');
      expect(find.textContaining('Suggested offer: USD 2.00'), findsOneWidget);
      expect(textValue(tester, 'Agreed price per item (USD)'), '6.50');
      await enter(tester, 'Reference value per item (USD)', '5.01');
      expect(find.textContaining('Suggested offer: USD 3.25'), findsOneWidget);
      await tapVisible(tester, find.text('Use suggested offer'));
      expect(textValue(tester, 'Agreed price per item (USD)'), '3.25');
      await enter(tester, 'Agreed price per item (USD)', '3.50');
      await enter(tester, 'Purchase item description', 'Negotiated bundle');
      await tapVisible(tester, find.text('Add to purchase'));
      expect(s.result, containsPair('unitMinor', 350));
      expect(s.result, containsPair('quantity', 3));
      expect(s.result, containsPair('rateBps', 6500));
      expect(s.calls, isEmpty);
    },
  );
  testWidgets('rounding may suggest a known zero and never double rounds', (
    tester,
  ) async {
    final s = PolicyDialogFixture()
      ..install({
        ...policy(),
        'rateBps': 5000,
        'lowValueTier': null,
        'rounding': {'incrementMinor': 10, 'mode': 'nearest'},
      });
    await open(tester, s);
    await tapVisible(tester, find.text('Calculate an offer · optional'));
    await enter(tester, 'Reference value per item (USD)', '0.09');
    expect(find.textContaining('Suggested offer: USD 0.00'), findsOneWidget);
    await tapVisible(tester, find.text('Use suggested offer'));
    expect(textValue(tester, 'Agreed price per item (USD)'), '0.00');
  });
  testWidgets('reopening an existing held item never applies a default', (
    tester,
  ) async {
    final s = PolicyDialogFixture()..install(policy());
    final line = {
      'description': 'Held item',
      'quantity': 1,
      'unitMinor': 650,
      'referenceMinor': 1000,
      'rateBps': 6000,
      'cardId': null,
      'printingId': null,
      'condition': null,
      'addToVault': false,
    };
    await open(tester, s, line: line);
    await tapVisible(tester, find.text('Calculate an offer · optional'));
    expect(find.text('Using Standard cash'), findsNothing);
    expect(textValue(tester, 'Buy percentage'), '60');
    expect(textValue(tester, 'Agreed price per item (USD)'), '6.50');
    await tapVisible(tester, find.text('Save purchase item'));
    expect(s.result, line);
  });
  testWidgets('bypass survives collapsing and reopening calculator', (
    tester,
  ) async {
    final s = PolicyDialogFixture()..install(policy());
    await open(tester, s);
    await tapVisible(tester, find.text('Calculate an offer · optional'));
    await tapVisible(tester, find.text('Bypass policy · manual terms'));
    await enter(tester, 'Buy percentage', '75');
    await tapVisible(tester, find.text('Calculate an offer · optional'));
    await tapVisible(tester, find.text('Calculate an offer · optional'));
    expect(find.text('Using Standard cash'), findsNothing);
    expect(textValue(tester, 'Buy percentage'), '75');
  });
  for (final size in [const Size(430, 932), const Size(1194, 834)]) {
    testWidgets(
      'market condition review and refreshed prices preserve terms at $size',
      (tester) async {
        final s = PolicyDialogFixture()
          ..install(policy(source: 'tcgplayer_market'));
        await canonical(tester, s, size: size);
        expect(s.referenceReads, 1);
        expect(
          find.textContaining('Suggested offer: USD 6.50'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<TextButton>(
                find.widgetWithText(TextButton, 'Use suggested offer'),
              )
              .onPressed,
          isNull,
        );
        await tapVisible(
          tester,
          find.textContaining('I reviewed the unspecified reference condition'),
        );
        await tapVisible(tester, find.text('Use suggested offer'));
        expect(textValue(tester, 'Agreed price per item (USD)'), '6.50');
        await choose(tester, 'Condition', 'LP');
        expect(
          tester
              .widget<TextButton>(
                find.widgetWithText(TextButton, 'Use suggested offer'),
              )
              .onPressed,
          isNull,
        );
        await tapVisible(
          tester,
          find.textContaining('I reviewed the unspecified reference condition'),
        );
        await enter(tester, 'Agreed price per item (USD)', '7.00');
        s.reference['amountMinor'] = 2000;
        await tapVisible(tester, find.text('Refresh market reference'));
        expect(
          find.textContaining('Suggested offer: USD 13.00'),
          findsOneWidget,
        );
        expect(textValue(tester, 'Agreed price per item (USD)'), '7.00');
        expect(
          tester
              .widget<TextButton>(
                find.widgetWithText(TextButton, 'Use suggested offer'),
              )
              .onPressed,
          isNull,
        );
        await tapVisible(tester, find.text('Add to purchase'));
        expect(s.result, containsPair('unitMinor', 700));
        expect(s.result, containsPair('referenceMinor', 2000));
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final failure in ['stale', 'wrong-printing', 'read-error']) {
    testWidgets(
      '$failure market reference permits manual agreement without invented evidence',
      (tester) async {
        final s = PolicyDialogFixture()
          ..install(policy(source: 'tcgplayer_market'));
        if (failure == 'stale') {
          s.reference['observedAt'] = DateTime.now()
              .toUtc()
              .subtract(const Duration(hours: 37))
              .toIso8601String();
        }
        if (failure == 'wrong-printing') {
          s.reference['printingId'] = secondPrinting;
        }
        if (failure == 'read-error') s.referenceFails = true;
        await canonical(tester, s);
        expect(find.textContaining('Suggested offer:'), findsNothing);
        await enter(tester, 'Agreed price per item (USD)', '7.00');
        await tapVisible(tester, find.text('Add to purchase'));
        expect(s.result, containsPair('unitMinor', 700));
        expect(s.result!['referenceMinor'], isNull);
        expect(s.result!['rateBps'], isNull);
      },
    );
  }
  testWidgets('changing the exact printing invalidates the previous proposal', (
    tester,
  ) async {
    final s = PolicyDialogFixture()
      ..install(policy(source: 'tcgplayer_market'));
    await canonical(tester, s);
    await choose(tester, 'Exact printing', 'GVP-REVERSE');
    expect(s.referenceReads, 2);
    expect(find.textContaining('Suggested offer:'), findsNothing);
    expect(
      find.textContaining('Market reference needs review'),
      findsOneWidget,
    );
  });
  testWidgets('sign-out hides private policy and a late market result', (
    tester,
  ) async {
    final s = PolicyDialogFixture()
      ..install(policy(source: 'tcgplayer_market'));
    await canonical(tester, s);
    s.referenceGate = Completer();
    await tester.ensureVisible(find.text('Refresh market reference'));
    await tester.tap(find.text('Refresh market reference'));
    await tester.pump();
    s.changes.add(null);
    await tester.pump();
    s.referenceGate!.complete({
      'status': 'available',
      'reference': s.reference,
    });
    await tester.pumpAndSettle();
    expect(find.text('Using Standard cash'), findsNothing);
    expect(find.textContaining('Suggested offer:'), findsNothing);
    expect(
      find.text('Your account changed. Close and reopen the sales desk.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'policy editor saves tiers and separate defaults and clears only deleted default',
    (tester) async {
      final s = PolicyDialogFixture();
      await open(tester, s);
      await tapVisible(tester, find.text('Calculate an offer · optional'));
      await tapVisible(tester, find.text('Offer policies'));
      await enter(tester, 'Policy name', 'Tier cash');
      await enter(tester, 'Policy percentage', '65');
      await choose(tester, 'Reference condition basis', 'LP');
      await choose(tester, 'Round to', 'USD 0.50');
      await choose(tester, 'Rounding rule', 'Down');
      await tapVisible(tester, find.text('Use a low-value tier'));
      await enter(tester, 'Tier reference ceiling per item (USD)', '5.00');
      await enter(tester, 'Tier percentage', '40');
      await tapVisible(tester, find.text('Save new policy'));
      await choose(tester, 'Default cash policy', 'Tier cash');
      await enter(tester, 'Policy name', 'Trade standard');
      await enter(tester, 'Policy percentage', '80');
      await choose(tester, 'Policy intent', 'Trade credit');
      await tapVisible(tester, find.text('Save new policy'));
      await choose(tester, 'Default trade policy', 'Trade standard');
      final cash = (s.presets['presets'] as List).first as Map;
      final trade = (s.presets['presets'] as List).last as Map;
      expect(cash['rounding'], {'incrementMinor': 50, 'mode': 'down'});
      expect(cash['lowValueTier'], {'ceilingMinor': 500, 'rateBps': 4000});
      expect(cash['conditionBasis'], 'LP');
      expect(s.presets['defaults'], {'cash': cash['id'], 'trade': trade['id']});
      expect(find.text('Use Trade standard'), findsNothing);
      await tapVisible(tester, find.text('Delete Tier cash'));
      expect(s.presets['defaults'], {'cash': null, 'trade': trade['id']});
      expect(tester.takeException(), isNull);
    },
  );
}
