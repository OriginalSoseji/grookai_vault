@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/widgets/network/network_interaction_card.dart';

ThemeData _fixtureTheme(Brightness brightness) {
  final colorScheme = GvPalette.scheme(brightness);
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: colorScheme.surface,
  );
}

Widget _fixture({required Brightness brightness, required double textScale}) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: _fixtureTheme(brightness),
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(
        key: const Key('golden-surface'),
        body: SafeArea(
          child: SingleChildScrollView(
            child: NetworkInteractionCard(
              title: 'Pikachu — Reverse Holo With A Long Collector-Facing Name',
              imageLabel: 'Exact artwork unavailable',
              metadata: 'Scarlet & Violet 151 · #025 · Near Mint',
              topContext: const Row(
                children: [
                  CircleAvatar(
                    radius: 15,
                    child: Icon(Icons.person_outline_rounded, size: 18),
                  ),
                  SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      'Fixture Collector marked a copy for trade',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              supportingInfo: const Text(
                '1 exact copy · Printing: Reverse Holo',
              ),
              actionBar: const Row(
                children: [
                  IconButton(
                    onPressed: _noop,
                    tooltip: 'Message collector',
                    icon: Icon(Icons.chat_bubble_outline_rounded),
                  ),
                  IconButton(
                    onPressed: _noop,
                    tooltip: 'View card details',
                    icon: Icon(Icons.info_outline_rounded),
                  ),
                ],
              ),
              onPressed: _noop,
            ),
          ),
        ),
      ),
    ),
  );
}

void _noop() {}

void main() {
  const viewports = <String, Size>{
    'phone_320': Size(320, 740),
    'samsung_412': Size(412, 915),
  };
  const textScales = <String, double>{
    'text_100': 1.0,
    'text_130': 1.3,
    'text_200': 2.0,
  };
  const brightnesses = <String, Brightness>{
    'light': Brightness.light,
    'dark': Brightness.dark,
  };

  for (final viewport in viewports.entries) {
    for (final textScale in textScales.entries) {
      for (final brightness in brightnesses.entries) {
        testWidgets(
          '${viewport.key} ${textScale.key} ${brightness.key} remains stable',
          (tester) async {
            tester.view.physicalSize = viewport.value;
            tester.view.devicePixelRatio = 1;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);

            await tester.pumpWidget(
              _fixture(
                brightness: brightness.value,
                textScale: textScale.value,
              ),
            );
            await tester.pumpAndSettle();

            expect(tester.takeException(), isNull);
            await expectLater(
              find.byKey(const Key('golden-surface')),
              matchesGoldenFile(
                'goldens/app_redesign_${viewport.key}_${textScale.key}_${brightness.key}.png',
              ),
            );
          },
        );
      }
    }
  }
}
