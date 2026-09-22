import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show HomePage;
import 'package:grookai_vault/card_detail_screen.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/secrets.dart';

// Uses the controlled combined-search fixture only. Never point this harness at
// production; the URL guard is deliberately independent of a build-mode flag.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  Future<void> capture(String name) async {
    // Android screenshots are captured by adb on the host. Converting the
    // Flutter surface can stall this integration_test binding on API 36.
    if (Platform.isAndroid) {
      debugPrint('COMBINED_SEARCH_CAPTURE_READY=$name');
      await Future<void>.delayed(const Duration(seconds: 8));
      return;
    }
    final bytes = await binding.takeScreenshot(name);
    final file = File('${Directory.systemTemp.path}/combined-search-$name.png');
    await file.writeAsBytes(bytes);
    debugPrint('COMBINED_SEARCH_SCREENSHOT=${file.path}');
    await Future<void>.delayed(const Duration(seconds: 8));
  }

  setUpAll(() async {
    final host = Uri.parse(supabaseUrl).host;
    if (!['127.0.0.1', 'localhost', '10.0.2.2'].contains(host)) {
      throw StateError(
        'Combined search verification requires the local fixture backend.',
      );
    }
    await Supabase.initialize(
      url: supabaseUrl,
      publishableKey: supabasePublishableKey,
      authOptions: const FlutterAuthClientOptions(
        localStorage: EmptyLocalStorage(),
      ),
    );
  });

  Future<void> until(WidgetTester tester, Finder finder) async {
    for (var attempt = 0; attempt < 100; attempt++) {
      await tester.pump(const Duration(milliseconds: 200));
      if (finder.evaluate().isNotEmpty) return;
    }
    debugPrint(
      'Search fixture visible text: ${tester.allWidgets.whereType<Text>().map((widget) => widget.data ?? widget.textSpan?.toPlainText()).join(' | ')}',
    );
    expect(finder, findsWidgets);
  }

  Widget harness(String query, {Map<String, String> parameters = const {}}) =>
      MaterialApp(
        onGenerateRoute: (settings) => settings.name == '/search'
            ? MaterialPageRoute<void>(
                builder: (_) => Scaffold(
                  appBar: AppBar(title: const Text('Search')),
                  body: HomePage(
                    signedOutBrowse: true,
                    initialQuery: settings.arguments! as String,
                  ),
                ),
              )
            : null,
        home: Scaffold(
          body: SafeArea(
            child: HomePage(
              key: ValueKey(query),
              signedOutBrowse: true,
              initialQuery: query,
              initialSearchParameters: parameters,
            ),
          ),
        ),
      );

  testWidgets(
    'shared search URL filters survive native opening and individual removal',
    (tester) async {
      await tester.pumpWidget(
        harness(
          'Wurmple',
          parameters: {'illustrator': 'Yuka Morii', 'finish': 'reverse'},
        ),
      );
      await until(tester, find.byTooltip('Remove Finish: reverse'));
      await until(tester, find.text('Showing 24 of 168'));
      await tester.tap(find.byTooltip('Remove Finish: reverse'));
      await until(tester, find.text('Showing 24 of 335'));
      expect(find.text('Artist: Yuka Morii'), findsOneWidget);
    },
  );

  testWidgets(
    'native repository reads every matching exact printing from the local service',
    (tester) async {
      final result = await CardPrintRepository.searchCardPrintsResolved(
        client: Supabase.instance.client,
        options: const CardSearchOptions(
          query: 'Yuka Morri Wurmple reverse holo',
          limit: 32,
        ),
        publicPokemonBrowse: true,
      );
      expect(result.rows.length, 168);
      expect(
        result.rows.map((row) => row.searchCardPrintingId).toSet().length,
        168,
      );
      expect(result.rows.every((row) => row.finishKey == 'reverse'), isTrue);
      expect(result.interpretation!.correction, contains('Yuka Morii'));
    },
  );

  testWidgets(
    'native filters retain the remaining query and ambiguity choices narrow the artist',
    (tester) async {
      await tester.pumpWidget(harness('Yuka Morri Wurmple reverse holo'));
      await until(tester, find.byTooltip('Remove Finish: Reverse Holo'));
      await tester.pump(const Duration(milliseconds: 500));
      await capture('filters');
      await tester.tap(find.byTooltip('Remove Finish: Reverse Holo'));
      await until(tester, find.text('Artist: Yuka Morii'));
      expect(find.byTooltip('Remove Finish: Reverse Holo'), findsNothing);
      await tester.pumpWidget(harness('Yuka wurmple holo'));
      await until(tester, find.widgetWithText(ActionChip, 'Yuka Tanaka'));
      await tester.tap(find.widgetWithText(ActionChip, 'Yuka Tanaka'));
      await until(tester, find.text('Artist: Yuka Tanaka'));
      expect(find.text('Finish: Holo'), findsOneWidget);
    },
  );

  testWidgets(
    'native search opens the selected reverse printing and returns to the combined query',
    (tester) async {
      await tester.pumpWidget(harness('Yuka Morii Wurmple reverse holo'));
      await until(tester, find.text('Wurmple · Reverse Holo'));
      final resultsScroll = find
          .descendant(
            of: find.byType(CustomScrollView),
            matching: find.byType(Scrollable),
          )
          .first;
      await tester.scrollUntilVisible(
        find.text('Load more'),
        600,
        scrollable: resultsScroll,
        maxScrolls: 40,
      );
      await tester.pumpAndSettle();
      await Scrollable.ensureVisible(
        tester.element(find.widgetWithText(OutlinedButton, 'Load more')),
        alignment: 0.5,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      await tester.drag(resultsScroll, const Offset(0, 450));
      await tester.pumpAndSettle();
      final scrollState = tester.state<ScrollableState>(resultsScroll);
      final savedPosition = scrollState.position.pixels;
      expect(savedPosition, greaterThan(0));
      await tester.tap(find.text('Wurmple · Reverse Holo').hitTestable().first);
      await until(tester, find.byType(CardDetailScreen));
      final detail = tester.widget<CardDetailScreen>(
        find.byType(CardDetailScreen),
      );
      expect(detail.selectedPrintingGvId, endsWith('-REVERSE'));
      final artistLink = find.widgetWithText(TextButton, 'Yuka Morii');
      await until(tester, artistLink);
      await tester.ensureVisible(artistLink);
      await tester.pumpAndSettle();
      await tester.tap(artistLink);
      await until(tester, find.text('Artist: Yuka Morii'));
      await tester.enterText(
        find.byType(TextField).last,
        'Yuka Morii Wurmple reverse holo',
      );
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await until(tester, find.text('Finish: Reverse Holo'));
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await until(tester, find.byType(CardDetailScreen));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      await until(tester, find.text('Finish: Reverse Holo'));
      expect(find.text('Artist: Yuka Morii'), findsOneWidget);
      expect(scrollState.position.pixels, closeTo(savedPosition, 2));
      scrollState.position.jumpTo(0);
      await tester.pumpAndSettle();
      expect(find.text('Showing 48 of 168'), findsOneWidget);
    },
  );
}
