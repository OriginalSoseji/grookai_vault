import 'dart:convert';
import 'dart:io';
import 'support/trade_controls.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_purchase_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/negotiated_trade.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/secrets.dart';

class LostTradeResponse extends SalesCartService {
  LostTradeResponse(SupabaseClient client) : super(client: client);
  final attempts = <String>[];
  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    attempts.add(jsonEncode(request));
    await super.complete(request);
    throw StateError('Synthetic lost committed trade response');
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'negotiated trade survives process restart with controls off and exact credit intake',
    (tester) async {
      // enterText already injects editing messages. Stub the native IME so its
      // delayed echo cannot restore the previous value during synthetic input.
      tester.testTextInput.register();
      addTearDown(tester.testTextInput.unregister);
      const url = String.fromEnvironment('TRADE_TEST_URL');
      const email = String.fromEnvironment('TRADE_TEST_EMAIL');
      const name = String.fromEnvironment('TRADE_TEST_NAME');
      const printing = String.fromEnvironment('TRADE_TEST_PRINTING_GV');
      expect(url, 'http://127.0.0.1:33561');
      expect(grookaiWebBaseUrl, 'http://127.0.0.1:33611');
      expect(email.endsWith('@trade-device.invalid'), isTrue);
      expect(name.startsWith('Device trade '), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('TRADE_TEST_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('TRADE_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id,
          service = LostTradeResponse(client);
      final initial = await service.load(),
          recovering = initial.pending != null;
      final prefs = await SharedPreferences.getInstance();
      final pendingKey = 'grookai.pending-sale.v1.$owner';
      final beforePending = prefs.getString(pendingKey);
      Widget app(String key) => MaterialApp(
        key: ValueKey(key),
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.light),
        ),
        home: SalesDeskScreen(service: service),
      );
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 150 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        if (finder.evaluate().isEmpty) {
          await binding.takeScreenshot('trade-diagnostic');
        }
        expect(finder, findsWidgets);
      }

      Future<void> show(Finder finder) async {
        try {
          await revealTradeControl(tester, finder);
        } catch (_) {
          await binding.takeScreenshot('trade-control-diagnostic');
          rethrow;
        }
      }

      Future<void> tap(Finder finder) async {
        await show(finder);
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      Future<void> fill(String label, String value) async {
        final field = find.widgetWithText(TextField, label);
        await show(field);
        await tester.enterText(field, value);
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(field).controller!.text,
          value,
          reason: 'Synthetic input must reach $label before continuing',
        );
      }

      Future<void> choose(String label, String value) async {
        final field = find.byWidgetPredicate(
          (widget) =>
              widget is DropdownButtonFormField<String> &&
              widget.decoration.labelText == label,
        );
        await tap(field);
        await tap(find.text(value).last);
      }

      Future<void> expectOffer(String reference, String expected) async {
        await fill('Reference value per item (USD)', reference);
        final input = tester
            .widget<TextField>(
              find.widgetWithText(TextField, 'Reference value per item (USD)'),
            )
            .controller!
            .text;
        final offer = find.textContaining('Suggested offer: USD $expected');
        if (input != reference || offer.evaluate().length != 1) {
          binding.reportData = {
            'phase': 'offer_diagnostic',
            'enteredReference': reference,
            'actualReference': input,
            'expectedOffer': expected,
            'visiblePolicyText': tester
                .widgetList<Text>(find.byType(Text))
                .map((w) => w.data ?? '')
                .where(
                  (text) =>
                      text.startsWith('Suggested offer:') ||
                      text.startsWith('Reference USD') ||
                      text.startsWith('Using ') ||
                      text.startsWith('No policy offer'),
                )
                .toList(),
          };
          await binding.takeScreenshot('trade-offer-diagnostic');
        }
        expect(input, reference);
        expect(offer, findsOneWidget);
      }

      await tester.pumpWidget(app('first'));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      if (!recovering) {
        await waitFor(find.byTooltip('New trade'));
        await tap(find.byTooltip('New trade'));
        await tap(find.text('Cart (0)'));
        await fill('Store name on receipt', 'Device trade shop');
        await tap(find.text('Customer & receipt details'));
        await fill('Private trade note', 'PRIVATE DEVICE TRADE');
        await tap(find.text('Customer & receipt details'));
        await tap(find.text('Quick-add item'));
        await fill('Card / item name', 'Outgoing bundle');
        await fill('Actual sale price (USD)', '10.00');
        await tap(find.text('Add to cart'));
        for (final amount in ['6.50', '0.00']) {
          await tap(find.text('Add trade-in'));
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
          await tap(
            find.widgetWithText(
              DropdownButtonFormField<String>,
              'Exact printing',
            ),
          );
          await tap(find.text(printing).last);
          await fill('Agreed credit for this whole line (USD)', amount);
          if (amount == '6.50') {
            await tap(find.text('Calculate an offer · optional'));
            await fill('Reference value per item (USD)', '10.00');
            await tap(find.text('Offer policies'));
            await fill('Policy name', 'Private device trade');
            await fill('Policy percentage', '60');
            await choose('Round to', 'USD 0.50');
            await choose('Rounding rule', 'Down');
            await tap(find.text('Use a low-value tier'));
            await fill('Tier reference ceiling per item (USD)', '5.00');
            await fill('Tier percentage', '40');
            await tap(find.text('Save new policy'));
            await choose('Default trade policy', 'Private device trade');
            await tap(find.text('Use Private device trade'));
            await tap(find.text('Offer policies'));
            await expectOffer('5.00', '2.00');
            await expectOffer('10.99', '6.50');
            await expectOffer('10.00', '6.00');
            expect(
              tester
                  .widget<TextField>(
                    find.widgetWithText(
                      TextField,
                      'Agreed credit for this whole line (USD)',
                    ),
                  )
                  .controller!
                  .text,
              '6.50',
            );
            await binding.takeScreenshot('trade-offer-policies');
            expect(
              find.textContaining('Agreed price overridden'),
              findsWidgets,
            );
            await tap(find.text('Calculate an offer · optional'));
          }
          await tap(find.text('Add this copy to my Vault'));
          await tap(find.text('Add to trade'));
          expect(find.byType(SalesPurchaseDialog), findsNothing);
        }
        await tap(find.text('Add trade-in'));
        await tap(find.text('Quick trade'));
        await fill('Trade item description', 'Incoming bundle');
        await fill('Quantity', '3');
        await fill('Agreed credit for this whole line (USD)', '1.50');
        await tap(find.text('Add to trade'));
        await tester.pumpWidget(app('held-reload'));
        await waitFor(find.text('Cart (1)'));
        await tap(find.text('Cart (1)'));

        await waitFor(find.text('Your trade'));
        final copiesBefore = await client
            .from('vault_item_instances')
            .select('id')
            .eq('user_id', owner);
        expect(copiesBefore, isEmpty);
        await binding.takeScreenshot('trade-held-offer');
        await tap(find.text('Customer view'));
        final dialog = find.byType(AlertDialog);
        expect(
          find.descendant(
            of: dialog,
            matching: find.textContaining('PRIVATE DEVICE TRADE'),
          ),
          findsNothing,
        );
        expect(
          find.descendant(
            of: dialog,
            matching: find.textContaining('Reference'),
          ),
          findsNothing,
        );
        await binding.takeScreenshot('trade-seller-offer');
        await tap(find.text('Back to trade desk'));
        await tap(find.text('Review & record trade'));
        await waitFor(find.text('Record this trade?'));
        await binding.takeScreenshot('trade-confirmation');
        await tap(find.text('Exchange completed · Record trade'));
        await waitFor(find.textContaining('Trade status is unconfirmed.'));
        expect(service.attempts, hasLength(1));
        await prefs.reload();
        final pending = jsonDecode(prefs.getString(pendingKey)!) as Map;
        final receipt = await service.recover(pending['id'] as String);
        expect(receipt, isNotNull);
        validateNegotiatedSaleReceipt(receipt);
        expect(receipt!['tradeIn']['totalCreditMinor'], 800);
        expect(receipt['tradeIn']['balanceMinor'], 200);
        // Readback does not clear the screen or device journal: restart is still required.
        expect(prefs.getString(pendingKey), service.attempts.single);
        final presetBook = await service.loadOfferPolicies();
        expect(presetBook['presets'], hasLength(1));
        expect(presetBook['defaults']['trade'], presetBook['presets'][0]['id']);
        await binding.takeScreenshot('trade-unconfirmed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'pending_after_commit',
          'owner': owner,
          'requestId': pending['id'],
          'noEarlyIntake': true,
          'heldReload': true,
          'presetChosen': true,
          'presetId': presetBook['presets'][0]['id'],
          'policyVersion': presetBook['version'],
          'policyTierProved': true,
          'policyRoundingProved': true,
          'policyDefaultSaved': true,
        };
      } else {
        expect(initial.available, isFalse);
        expect(initial.negotiatedTradesAvailable, isFalse);
        await waitFor(find.text('Trade recorded'));
        await prefs.reload();
        expect(prefs.getString(pendingKey), beforePending);
        expect(service.attempts, isEmpty);
        final presetBook = await service.loadOfferPolicies();
        expect(presetBook['presets'], hasLength(1));
        expect(presetBook['presets'][0]['name'], 'Private device trade');
        expect(presetBook['presets'][0]['rateBps'], 6000);
        expect(presetBook['presets'][0]['rounding'], {
          'incrementMinor': 50,
          'mode': 'down',
        });
        expect(presetBook['presets'][0]['lowValueTier'], {
          'ceilingMinor': 500,
          'rateBps': 4000,
        });
        expect(presetBook['defaults']['trade'], presetBook['presets'][0]['id']);
        await binding.takeScreenshot('trade-recovered');
        final receipt = await service.recover(initial.pending!['id'] as String);
        expect(receipt!['tradeIn']['totalCreditMinor'], 800);
        expect(receipt['tradeIn']['balanceMinor'], 200);
        expect(receipt['tradeIn']['items'], hasLength(3));
        final publicText = saleReceiptText(receipt);
        expect(publicText, contains('SALES RECEIPT'));
        expect(publicText, contains('6.50'));
        expect(publicText, contains('0.00'));
        expect(publicText, isNot(contains('PRIVATE DEVICE TRADE')));
        expect(publicText, isNot(contains('Private device trade')));
        await tap(find.text('Continue to deals'));
        await waitFor(
          find.textContaining('The sales desk is not available yet.'),
        );
        await prefs.reload();
        expect(prefs.getString(pendingKey), isNull);
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(find.textContaining('Your account changed.'), findsOneWidget);
        await binding.takeScreenshot('trade-account-closed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'recovered_after_process_restart',
          'owner': owner,
          'requestId': initial.pending!['id'],
          'accountClosed': true,
          'featureOff': true,
          'exactPending': true,
          'completionCalls': 0,
          'presetRetained': true,
          'presetId': presetBook['presets'][0]['id'],
          'policyVersion': presetBook['version'],
          'policyDefaultRetained': true,
        };
      }
    },
  );
}
