import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/search_interpretation.dart';
import 'package:grookai_vault/widgets/search_interpretation_chips.dart';

void main() {
  test(
    'older resolver payloads remain valid without interpretation actions',
    () {
      final model = SearchInterpretation.fromJson({'artist': 'Yuka Morii'});
      expect(model.filters, isEmpty);
      expect(model.artistChoices, isEmpty);
    },
  );

  testWidgets(
    'filter removal and correction use the exact shared-service queries',
    (tester) async {
      String? selected;
      final model = SearchInterpretation.fromJson({
        'queryFilters': [
          {
            'label': 'Artist: Yuka Morii',
            'queryWithout': 'Wurmple reverse holo',
          },
          {
            'label': 'Finish: Reverse Holo',
            'queryWithout': 'Yuka Morri Wurmple',
          },
        ],
        'artistCorrection': {
          'original': 'Yuka Morri',
          'corrected': 'Yuka Morii',
        },
        'originalSpellingQuery': '"Yuka Morri" Wurmple reverse holo',
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SearchInterpretationChips(
              interpretation: model,
              onQuery: (query) => selected = query,
            ),
          ),
        ),
      );
      await tester.tap(find.byTooltip('Remove Finish: Reverse Holo'));
      expect(selected, 'Yuka Morri Wurmple');
      await tester.tap(find.text('Use original spelling'));
      expect(selected, '"Yuka Morri" Wurmple reverse holo');
    },
  );

  testWidgets(
    'ambiguous artist choices remain usable at narrow width and scaled text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      String? selected;
      final model = SearchInterpretation.fromJson({
        'queryFilters': [
          {'label': 'Artist: Yuka', 'queryWithout': 'wurmple holo'},
        ],
        'artistChoices': [
          {'name': 'Yuka Morii', 'query': 'Yuka Morii wurmple holo'},
          {'name': 'Yuka Tanaka', 'query': 'Yuka Tanaka wurmple holo'},
        ],
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(2)),
              child: SingleChildScrollView(
                child: SearchInterpretationChips(
                  interpretation: model,
                  onQuery: (query) => selected = query,
                  empty: true,
                ),
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Yuka Tanaka'));
      expect(selected, 'Yuka Tanaka wurmple holo');
      expect(find.textContaining('No recorded matches'), findsOneWidget);
    },
  );
}
