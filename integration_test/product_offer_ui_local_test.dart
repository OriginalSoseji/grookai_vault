import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_purchase_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/secrets.dart';
import 'support/trade_controls.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'published exact reference informs reviewed offers without changing agreed terms',
    (tester) async {
      tester.testTextInput.register();
      addTearDown(tester.testTextInput.unregister);
      const url = String.fromEnvironment('SUPABASE_URL'),
          email = String.fromEnvironment('MARKET_TEST_EMAIL'),
          card = String.fromEnvironment('MARKET_TEST_CARD'),
          printing = String.fromEnvironment('MARKET_TEST_PRINTING'),
          name = String.fromEnvironment('MARKET_TEST_NAME');
      expect(url, 'http://127.0.0.1:33561');
      expect(grookaiWebBaseUrl, 'http://127.0.0.1:33611');
      expect(email.endsWith('@offer-market.invalid'), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('MARKET_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id,
          service = SalesCartService(client: client),
          prefs = await SharedPreferences.getInstance();
      await service.load();
      final key = 'grookai.sales-drafts.v1.$owner',
          marker = 'grookai.market-runtime-proof.v1.$owner';
      final previous = prefs.getString(marker),
          quote = await service.offerMarketReference(card, printing);
      expect(quote['status'], 'available');
      final reference = quote['reference'] as Map;
      expect(reference['amountMinor'], 1234);
      expect(reference['cardId'], card);
      expect(reference['printingId'], printing);
      expect(reference['condition'], isNull);
      expect(
        reference['provenanceId'],
        const String.fromEnvironment('MARKET_TEST_PROVENANCE'),
      );
      expect(
        DateTime.parse(reference['observedAt'] as String),
        DateTime.parse(const String.fromEnvironment('MARKET_TEST_OBSERVED')),
      );
      expect(
        DateTime.parse(reference['publishedAt'] as String),
        DateTime.parse(const String.fromEnvironment('MARKET_TEST_PUBLISHED')),
      );
      expect(
        (await service.offerMarketReference(
          card,
          const String.fromEnvironment('MARKET_TEST_MISSING_PRINTING'),
        ))['status'],
        'unavailable',
      );
      expect(
        (await service.offerMarketReference(
          const String.fromEnvironment('MARKET_TEST_OTHER_CARD'),
          printing,
        ))['status'],
        'unavailable',
      );
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 150 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(finder, findsWidgets);
      }

      Future<void> tap(Finder finder) async {
        await revealTradeControl(tester, finder);
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      Future<void> fill(String label, String value) async {
        final field = find.widgetWithText(TextField, label);
        await revealTradeControl(tester, field);
        await tester.enterText(field, value);
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        expect(tester.widget<TextField>(field).controller!.text, value);
      }

      Future<void> choose(String label, String value) async {
        final field = find.byWidgetPredicate(
          (w) =>
              w is DropdownButtonFormField<String> &&
              w.decoration.labelText == label,
        );
        await tap(field);
        await tap(find.text(value).last);
      }

      if (previous != null) {
        await prefs.reload();
        expect(prefs.getString(key), previous);
      }
      Widget app() => MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.light),
        ),
        home: SalesDeskScreen(service: service),
      );
      await tester.pumpWidget(app());
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      await waitFor(find.byTooltip('New trade'));
      if (previous == null) {
        for (final trade in [false, true]) {
          final intent = trade ? 'trade' : 'cash';
          await tap(find.byTooltip(trade ? 'New trade' : 'New buy'));
          if (trade) {
            await tap(find.text('Cart (0)'));
            await tap(find.text('Add trade-in'));
          } else {
            await tap(find.widgetWithText(FilledButton, 'Find incoming card'));
          }
          await fill('Find incoming card', name);
          await tester.pump(const Duration(milliseconds: 400));
          final result = find.descendant(
            of: find.byType(ListTile),
            matching: find.text(name),
          );
          await waitFor(result);
          await tap(result);
          await waitFor(
            find.widgetWithText(
              DropdownButtonFormField<String>,
              'Exact printing',
            ),
          );
          await choose(
            'Exact printing',
            const String.fromEnvironment('MARKET_TEST_PRINTING_GV'),
          );
          await choose('Condition', 'LP');
          final amountLabel = trade
              ? 'Agreed credit for this whole line (USD)'
              : 'Agreed price per item (USD)';
          await fill(amountLabel, '7.00');
          await tap(find.text('Calculate an offer · optional'));
          await tap(find.text('Offer policies'));
          await fill('Policy name', 'Runtime $intent');
          await fill('Policy percentage', '65');
          await choose('Reference source', 'TCGPlayer Market · exact printing');
          await choose('Reference condition basis', 'Condition unspecified');
          await choose('Round to', 'USD 0.50');
          await tap(find.text('Save new policy'));
          await tap(find.text('Use Runtime $intent'));
          await tap(find.text('Offer policies'));
          final offer = find.textContaining(
            trade ? 'Suggested credit: USD 8.00' : 'Suggested offer: USD 8.00',
          );
          await waitFor(offer);
          await revealTradeControl(tester, offer);
          final use = find.widgetWithText(
            TextButton,
            trade ? 'Use suggested credit' : 'Use suggested offer',
          );
          await revealTradeControl(tester, use);
          expect(tester.widget<TextButton>(use).onPressed, isNull);
          expect(
            tester
                .widget<TextField>(find.widgetWithText(TextField, amountLabel))
                .controller!
                .text,
            '7.00',
          );
          await tap(
            find.text(
              'I reviewed the unspecified reference condition for this LP item.',
            ),
          );
          await tap(use);
          expect(
            tester
                .widget<TextField>(find.widgetWithText(TextField, amountLabel))
                .controller!
                .text,
            '8.00',
          );
          await fill(amountLabel, '7.00');
          await tap(find.text('Refresh market reference'));
          await waitFor(offer);
          expect(
            tester
                .widget<TextField>(find.widgetWithText(TextField, amountLabel))
                .controller!
                .text,
            '7.00',
          );
          await choose(
            'Exact printing',
            const String.fromEnvironment('MARKET_TEST_MISSING_PRINTING_GV'),
          );
          await waitFor(find.textContaining('No qualified market reference'));
          await revealTradeControl(tester, use);
          expect(tester.widget<TextButton>(use).onPressed, isNull);
          await choose(
            'Exact printing',
            const String.fromEnvironment('MARKET_TEST_PRINTING_GV'),
          );
          await choose('Condition', 'MP');
          await waitFor(offer);
          await revealTradeControl(tester, use);
          expect(tester.widget<TextButton>(use).onPressed, isNull);
          await tap(
            find.text(
              'I reviewed the unspecified reference condition for this MP item.',
            ),
          );
          await revealTradeControl(tester, offer);
          await binding.takeScreenshot('market-$intent-reference');
          await tap(find.text('Calculation details'));
          await binding.takeScreenshot('market-$intent-calculation');
          await tap(find.text('Calculation details'));
          expect(
            tester
                .widget<TextField>(find.widgetWithText(TextField, amountLabel))
                .controller!
                .text,
            '7.00',
          );
          await tap(find.text(trade ? 'Add to trade' : 'Add to purchase'));
          expect(find.byType(SalesPurchaseDialog), findsNothing);
          await tester.pumpAndSettle();
        }
        await prefs.reload();
        final raw = prefs.getString(key);
        expect(raw, isNotNull);
        final book = jsonDecode(raw!) as Map, drafts = book['drafts'] as List;
        final buy = drafts.singleWhere((d) => d['kind'] == 'purchase') as Map,
            trade =
                drafts.singleWhere((d) => d['kind'] == 'negotiated-trade')
                    as Map;
        expect(buy['items'][0]['unitMinor'], 700);
        expect(buy['items'][0]['referenceMinor'], 1234);
        expect(trade['trades'][0]['creditMinor'], 700);
        expect(trade['trades'][0]['valueMinor'], 1234);
        expect(buy['items'][0]['rateBps'], 6500);
        expect(trade['trades'][0]['rateBps'], 6500);
        expect(prefs.getString('grookai.pending-sale.v1.$owner'), isNull);
        expect(await prefs.setString(marker, raw), isTrue);
        await prefs.reload();
        expect(prefs.getString(marker), raw);
        await binding.takeScreenshot('market-held-offers');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'market_saved',
          'owner': owner,
          'reference': reference,
          'buyId': buy['id'],
          'tradeId': trade['id'],
          'manualMinor': 700,
          'referenceMinor': 1234,
          'noPending': true,
        };
      } else {
        await prefs.reload();
        final reopened = jsonDecode(prefs.getString(key)!) as Map,
            saved = jsonDecode(previous) as Map;
        // The desk queues one normal journal save on load. Its revision is
        // bookkeeping; every active draft and agreed/reference term must match.
        expect(
          reopened.remove('revision'),
          (saved.remove('revision') as int) + 1,
        );
        expect(reopened, saved);
        expect(prefs.getString('grookai.pending-sale.v1.$owner'), isNull);
        await tap(find.byTooltip('Held deals'));
        await binding.takeScreenshot('market-reopened-offers');
        await tap(find.text('Close'));
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(find.textContaining('Your account changed.'), findsOneWidget);
        await binding.takeScreenshot('market-account-closed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'market_reopened',
          'owner': owner,
          'reference': reference,
          'exactHeldBytes': true,
          'exactHeldTermsAfterOpen': true,
          'journalRevisionIncrement': 1,
          'noPending': true,
          'accountClosed': true,
        };
      }
    },
  );
}
