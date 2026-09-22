import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show HomePage;
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/secrets.dart';

// Requires the contained shared-credit-20260922 fixture. Never use production.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    if (![
      '127.0.0.1',
      'localhost',
      '10.0.2.2',
    ].contains(Uri.parse(supabaseUrl).host)) {
      throw StateError(
        'Shared artist verification requires the local backend.',
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

  testWidgets(
    'both contributors include joint credits and retain every finish',
    (tester) async {
      for (final artist in ['Ken Sugimori', 'Yusuke Ohmura']) {
        final result = await CardPrintRepository.searchCardPrintsResolved(
          client: Supabase.instance.client,
          options: CardSearchOptions(
            query: '$artist Cynthia & Caitlin reverse holo',
            limit: 32,
          ),
          publicPokemonBrowse: true,
        );
        expect(result.rows.length, 56);
        expect(
          result.rows.map((row) => row.searchCardPrintingId).toSet().length,
          56,
        );
        expect(result.rows.every((row) => row.finishKey == 'reverse'), isTrue);
      }
      final result = await CardPrintRepository.searchCardPrintsResolved(
        client: Supabase.instance.client,
        options: const CardSearchOptions(
          query: 'Ken Sugimori Cynthia & Caitlin any holo',
          limit: 32,
        ),
        publicPokemonBrowse: true,
      );
      expect(result.rows.length, 84);
      expect(
        result.rows.map((row) => row.searchCardPrintingId).toSet().length,
        84,
      );
      expect(result.rows.where((row) => row.finishKey == 'holo').length, 28);
      expect(result.rows.where((row) => row.finishKey == 'reverse').length, 56);
    },
  );

  testWidgets(
    'shared artist search renders combined filters and complete count',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SafeArea(
              child: HomePage(
                signedOutBrowse: true,
                initialQuery: 'Ken Sugimori Cynthia & Caitlin any holo',
              ),
            ),
          ),
        ),
      );
      for (var attempt = 0; attempt < 150; attempt++) {
        await tester.pump(const Duration(milliseconds: 200));
        if (find.text('Showing 24 of 84').evaluate().isNotEmpty) break;
      }
      expect(find.text('Showing 24 of 84'), findsOneWidget);
      expect(find.text('Artist: Ken Sugimori'), findsOneWidget);
      expect(
        find.byTooltip('Remove Finish: Holo or Reverse Holo'),
        findsOneWidget,
      );
      debugPrint('COMBINED_SEARCH_CAPTURE_READY=shared-credit');
      await Future<void>.delayed(const Duration(seconds: 8));
      await tester.tap(find.byTooltip('Remove Finish: Holo or Reverse Holo'));
      for (var attempt = 0; attempt < 150; attempt++) {
        await tester.pump(const Duration(milliseconds: 200));
        if (find.text('Showing 24 of 56').evaluate().isNotEmpty) break;
      }
      expect(find.text('Showing 24 of 56'), findsOneWidget);
      expect(find.text('Artist: Ken Sugimori'), findsOneWidget);
    },
  );
}
