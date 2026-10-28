import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/screens/intake/intake_screens.dart';
import 'package:grookai_vault/services/intake/intake_card_context.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';

CardPrint card(
  String id, {
  String name = 'Eevee',
  bool stamped = false,
  bool artwork = false,
}) => CardPrint(
  id: id,
  name: name,
  gvId: artwork ? 'GV-PK-SVP-173-POKEMON-CENTER-STAMP' : null,
  setCode: 'svp',
  setName: 'Scarlet & Violet Black Star Promos',
  number: '173',
  variantKey: stamped ? 'pokemon_center_stamp' : null,
  printedIdentityModifier: stamped ? 'pokemon_center_stamp' : null,
);

Finder rowNamed(String name) => find.byWidgetPredicate(
  (widget) =>
      widget is ListTile &&
      widget.title is Text &&
      (widget.title as Text).data == name,
);

void main() {
  test(
    'exact stamped identity, human set and canonical artwork survive draft recovery',
    () {
      final candidate = intakeCandidateFromCard(
        card('stamped-parent', stamped: true, artwork: true),
      );
      final batch = IntakeBatch(
        title: 'Review',
        userId: 'owner',
        items: [
          IntakeItem(captureId: 'manual', imagePath: '', selected: candidate),
        ],
      );
      final restored = IntakeBatch.fromJson(batch.toJson()).items.single;
      expect(restored.selected!.cardId, 'stamped-parent');
      expect(
        restored.selected!.printedIdentityModifier,
        'pokemon_center_stamp',
      );
      expect(
        intakeCandidateDisplayName(restored.selected),
        'Eevee · Pokémon Center Stamp',
      );
      expect(
        intakeCandidateSetLabel(restored.selected),
        'Scarlet & Violet Black Star Promos · #173',
      );
      expect(
        Uri.parse(restored.selected!.imageUrl!).path,
        '/api/canon/cards/GV-PK-SVP-173-POKEMON-CENTER-STAMP/image',
      );
      expect(
        restored.cardPrintingId,
        isNull,
        reason: 'Finish still requires explicit review.',
      );
      expect(restored.state, 'needs_review');
      final legacy = ScannerV5Candidate.fromJson({
        'card_id': 'base',
        'name': 'Eevee',
        'set_code': 'svp',
      });
      expect(legacy.toSessionJson().containsKey('set_name'), isFalse);
      expect(intakeCandidateSetLabel(legacy), 'svp');
    },
  );

  testWidgets(
    'picker distinguishes stamped cards and returns the selected parent',
    (tester) async {
      ScannerV5Candidate? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  selected = await Navigator.of(context)
                      .push<ScannerV5Candidate>(
                        MaterialPageRoute(
                          builder: (_) => IntakeCardSearch(
                            searchCards: (_) async => [
                              card('base-parent'),
                              card('stamped-parent', stamped: true),
                            ],
                          ),
                        ),
                      );
                },
                child: const Text('Open picker'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open picker'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Eevee 173');
      await tester.pump(const Duration(milliseconds: 351));
      await tester.pumpAndSettle();
      expect(rowNamed('Eevee'), findsOneWidget);
      expect(rowNamed('Eevee · Pokémon Center Stamp'), findsOneWidget);
      expect(
        find.text('Scarlet & Violet Black Star Promos · #173'),
        findsNWidgets(2),
      );
      await tester.tap(rowNamed('Eevee · Pokémon Center Stamp'));
      await tester.pumpAndSettle();
      expect(selected!.cardId, 'stamped-parent');
      expect(selected!.printedIdentityModifier, 'pokemon_center_stamp');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'new query clears old choices and late replies cannot replace newer results',
    (tester) async {
      final old = Completer<List<CardPrint>>(),
          latest = Completer<List<CardPrint>>();
      final calls = <String>[];
      await tester.pumpWidget(
        MaterialApp(
          home: IntakeCardSearch(
            searchCards: (query) {
              calls.add(query);
              return query == 'Eevee' ? old.future : latest.future;
            },
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Eevee');
      await tester.pump(const Duration(milliseconds: 351));
      await tester.enterText(find.byType(TextField), 'Pikachu');
      expect(find.byType(ListTile), findsNothing);
      await tester.pump(const Duration(milliseconds: 351));
      latest.complete([card('pikachu', name: 'Pikachu')]);
      await tester.pump();
      old.complete([card('old-eevee')]);
      await tester.pumpAndSettle();
      expect(calls, ['Eevee', 'Pikachu']);
      expect(rowNamed('Pikachu'), findsOneWidget);
      expect(rowNamed('Eevee'), findsNothing);
      await tester.enterText(find.byType(TextField), '');
      await tester.pump();
      expect(find.byType(ListTile), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'failed search retains query, hides transport details and supports an empty retry',
    (tester) async {
      var attempts = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: IntakeCardSearch(
            searchCards: (_) async {
              if (++attempts == 1) throw StateError('private-host.example');
              return [];
            },
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Eevee 173');
      await tester.pump(const Duration(milliseconds: 351));
      await tester.pumpAndSettle();
      expect(find.textContaining('private-host'), findsNothing);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Eevee 173',
      );
      await tester.tap(find.text('Retry card search'));
      await tester.pumpAndSettle();
      expect(attempts, 2);
      expect(find.textContaining('No matching cards.'), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
