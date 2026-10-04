import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/jungle_edition_resolution_service.dart';
import 'package:grookai_vault/services/identity/display_identity.dart';
import 'package:grookai_vault/widgets/jungle_edition_choice_sheet.dart';

void main() {
  test('late Edge conflicts become safe edition messages', () {
    expect(
      jungleEditionFailureMessage({
        'error': 'JUNGLE_EDITION_REQUIRED',
        'message': 'untrusted detail',
      }),
      contains('Choose First Edition or Unlimited'),
    );
    expect(
      jungleEditionFailureMessage({
        'error': 'unknown',
        'message': 'private detail',
      }),
      isNull,
    );
    expect(jungleEditionFailureMessage('malformed'), isNull);
  });
  Map<String, dynamic> fixture() =>
      jsonDecode(
            File(
              'tests/fixtures/jungle_edition_resolution_v1.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  test('legacy selection cannot silently choose an edition', () {
    final data = fixture();
    final r = JungleEditionResolution.fromJson(data);
    expect(
      () => r.assertSelection(
        data['legacy_card_print_id'],
        r.options.first.cardPrintingId,
      ),
      throwsA(isA<JungleEditionSelectionRequired>()),
    );
    final ready = JungleEditionResolution.fromJson({
      ...data,
      'status': 'ready',
    });
    for (final x in ready.options) {
      expect(
        () => ready.assertSelection(x.cardPrintId, x.cardPrintingId),
        returnsNormally,
      );
    }
    expect(
      () => ready.assertSelection(
        ready.options.first.cardPrintId,
        ready.options.last.cardPrintingId,
      ),
      throwsException,
    );
  });
  test('partial and conflicting pairs are rejected', () {
    final data = fixture();
    (data['options'] as List).removeLast();
    expect(() => JungleEditionResolution.fromJson(data), throwsFormatException);
    final duplicate = fixture();
    duplicate['options'][1] = duplicate['options'][0];
    expect(
      () => JungleEditionResolution.fromJson(duplicate),
      throwsFormatException,
    );
  });
  test(
    'edition labels survive child finish; unknown and special variants stay distinct',
    () {
      for (final pair in [
        ['edition:first_edition', '1st Edition'],
        ['edition:unlimited', 'Unlimited'],
      ]) {
        final r = resolveDisplayIdentityFromFields(
          name: 'Clefable',
          printedIdentityModifier: pair[0],
          finishKey: 'holo',
          displayDiscriminator: 'Holo',
          searchObjectType: 'child_printing',
        );
        expect(r.displayName, 'Clefable · ${pair[1]} · Holo');
      }
      expect(
        resolveDisplayIdentityFromFields(
          name: 'Clefable',
          setCode: 'base2',
          number: '1',
          finishKey: 'holo',
          searchObjectType: 'child_printing',
        ).displayName,
        'Clefable · Edition unconfirmed · Holo',
      );
      expect(
        resolveDisplayIdentityFromFields(
          name: 'Clefable',
          setCode: 'base2',
          number: '1',
          printedIdentityModifier: 'recognized_error:no_jungle_symbol',
        ).suffix,
        isNot('Edition unconfirmed'),
      );
      expect(
        resolveDisplayIdentityFromFields(
          name: 'Other',
          setCode: 'base1',
          number: '1',
        ).suffix,
        isNull,
      );
    },
  );
  testWidgets(
    'choice sheet requires a tap and returns the exact selected identity',
    (tester) async {
      final r = JungleEditionResolution.fromJson(fixture());
      JungleEditionOption? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: JungleEditionChoiceSheet(
              resolution: r,
              onSelect: (x) => selected = x,
            ),
          ),
        ),
      );
      expect(selected, isNull);
      expect(find.text('First Edition · Holo'), findsOneWidget);
      expect(find.text('Unlimited · Holo'), findsOneWidget);
      await tester.tap(find.text('Unlimited · Holo'));
      expect(selected?.cardPrintId, r.options.last.cardPrintId);
      expect(selected?.cardPrintingId, r.options.last.cardPrintingId);
    },
  );
  testWidgets('unavailable editions cannot be selected', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: JungleEditionChoiceSheet(
            resolution: const JungleEditionResolution(status: 'unavailable'),
            onSelect: (_) => fail('unexpected selection'),
          ),
        ),
      ),
    );
    expect(find.byType(ListTile), findsNothing);
    expect(find.text('Edition choices are being reviewed.'), findsOneWidget);
  });
  testWidgets('unavailable status overrides retained choice data', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: JungleEditionChoiceSheet(
            resolution: JungleEditionResolution.fromJson({
              ...fixture(),
              'status': 'unavailable',
            }),
            onSelect: (_) => fail('unexpected selection'),
          ),
        ),
      ),
    );
    expect(find.byType(ListTile), findsNothing);
    expect(find.text('Edition choices are being reviewed.'), findsOneWidget);
  });
  testWidgets(
    'edition choices remain reachable on a small screen with large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 260);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      JungleEditionOption? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Scaffold(
              body: JungleEditionChoiceSheet(
                resolution: JungleEditionResolution.fromJson(fixture()),
                onSelect: (x) => selected = x,
              ),
            ),
          ),
        ),
      );
      await tester.ensureVisible(find.text('Unlimited · Holo'));
      await tester.tap(find.text('Unlimited · Holo'));
      expect(selected?.edition, 'unlimited');
      expect(tester.takeException(), isNull);
    },
  );
}
