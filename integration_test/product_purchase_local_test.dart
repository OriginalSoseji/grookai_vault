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
import 'package:grookai_vault/services/sales/sales_purchase.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/secrets.dart';

class LostPurchaseResponse extends SalesCartService {
  LostPurchaseResponse(SupabaseClient client) : super(client: client);
  final attempts = <String>[];
  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    attempts.add(jsonEncode(request));
    await super.complete(request);
    throw StateError('Synthetic lost committed purchase response');
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'purchase survives process restart with controls off and exact cost intake',
    (tester) async {
      const url = String.fromEnvironment('PURCHASE_TEST_URL');
      const email = String.fromEnvironment('PURCHASE_TEST_EMAIL');
      const name = String.fromEnvironment('PURCHASE_TEST_NAME');
      const printing = String.fromEnvironment('PURCHASE_TEST_PRINTING_GV');
      expect(url, 'http://127.0.0.1:33281');
      expect(grookaiWebBaseUrl, 'http://127.0.0.1:33451');
      expect(email.endsWith('@purchase-device.invalid'), isTrue);
      expect(name.startsWith('Device purchase '), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('PURCHASE_TEST_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('PURCHASE_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id,
          service = LostPurchaseResponse(client);
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
          await binding.takeScreenshot('purchase-diagnostic');
        }
        expect(finder, findsWidgets);
      }

      Future<void> show(Finder finder) async {
        if (finder.evaluate().isEmpty) {
          await tester.scrollUntilVisible(
            finder,
            220,
            scrollable: find
                .byWidgetPredicate(
                  (w) =>
                      w is Scrollable && w.axisDirection == AxisDirection.down,
                )
                .last,
            maxScrolls: 35,
          );
        }
        await tester.ensureVisible(finder);
        await tester.pumpAndSettle();
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
      }

      await tester.pumpWidget(app('first'));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      if (!recovering) {
        await waitFor(find.byTooltip('New buy'));
        await tap(find.byTooltip('New buy'));
        await tap(find.text('Store & private note'));
        await fill('Store name', 'Device purchase shop');
        await fill('Private purchase note', 'PRIVATE DEVICE PURCHASE');
        await tap(find.text('Store & private note'));
        for (final amount in ['6.50', '0.00']) {
          await tap(find.text('Find incoming card'));
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
          await fill('Agreed price per item (USD)', amount);
          if (amount == '6.50') {
            await tap(find.text('Calculate an offer · optional'));
            await fill('Reference value per item (USD)', '10.00');
            await tap(find.text('Offer presets'));
            await fill('Preset name', 'Private device cash');
            await fill('Preset percentage', '60');
            await tap(find.text('Save new preset'));
            await tap(find.text('Use Private device cash'));
            expect(
              tester
                  .widget<TextField>(
                    find.widgetWithText(TextField, 'Buy percentage'),
                  )
                  .controller!
                  .text,
              '60',
            );
            expect(
              tester
                  .widget<TextField>(
                    find.widgetWithText(
                      TextField,
                      'Agreed price per item (USD)',
                    ),
                  )
                  .controller!
                  .text,
              '6.50',
            );
            await binding.takeScreenshot('purchase-offer-presets');
            await tap(find.text('Offer presets'));
            expect(
              find.textContaining('Agreed price overridden'),
              findsWidgets,
            );
            await tap(find.text('Calculate an offer · optional'));
          }
          await tap(find.text('Add this copy to my Vault'));
          await tap(find.text('Add to purchase'));
          expect(find.byType(SalesPurchaseDialog), findsNothing);
        }
        await tester.pumpWidget(app('held-reload'));
        await waitFor(find.text('Your purchase'));
        final copiesBefore = await client
            .from('vault_item_instances')
            .select('id')
            .eq('user_id', owner);
        expect(copiesBefore, isEmpty);
        await binding.takeScreenshot('purchase-held-offer');
        await tap(find.text('Seller view'));
        final dialog = find.byType(AlertDialog);
        expect(
          find.descendant(
            of: dialog,
            matching: find.textContaining('PRIVATE DEVICE PURCHASE'),
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
        await binding.takeScreenshot('purchase-seller-offer');
        await tap(find.text('Close seller view'));
        await tap(find.text('Review purchase'));
        await waitFor(find.text('Record this purchase?'));
        await binding.takeScreenshot('purchase-confirmation');
        await tap(find.text('Exchange completed · Record purchase'));
        await waitFor(find.textContaining('Purchase status is unconfirmed.'));
        expect(service.attempts, hasLength(1));
        await prefs.reload();
        final pending = jsonDecode(prefs.getString(pendingKey)!) as Map;
        final receipt = await service.recover(pending['id'] as String);
        expect(receipt, isNotNull);
        confirmedPurchaseReceipt(receipt, {
          'id': pending['id'],
          'cart': pending['cart'],
        });
        // Readback does not clear the screen or device journal: restart is still required.
        expect(prefs.getString(pendingKey), service.attempts.single);
        final presetBook = await service.loadOfferPresets();
        expect(presetBook['presets'], hasLength(1));
        await binding.takeScreenshot('purchase-unconfirmed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'pending_after_commit',
          'owner': owner,
          'requestId': pending['id'],
          'noEarlyIntake': true,
          'heldReload': true,
          'presetChosen': true,
          'presetId': presetBook['presets'][0]['id'],
        };
      } else {
        expect(initial.available, isFalse);
        expect(initial.purchasesAvailable, isFalse);
        await waitFor(find.text('Purchase recorded'));
        await prefs.reload();
        expect(prefs.getString(pendingKey), beforePending);
        expect(service.attempts, isEmpty);
        final presetBook = await service.loadOfferPresets();
        expect(presetBook['presets'], hasLength(1));
        expect(presetBook['presets'][0]['name'], 'Private device cash');
        expect(presetBook['presets'][0]['rateBps'], 6000);
        await binding.takeScreenshot('purchase-recovered');
        final receipt = await service.recover(initial.pending!['id'] as String);
        expect(receipt!['purchaseMinor'], 650);
        expect(receipt['items'], hasLength(2));
        final publicText = saleReceiptText(receipt);
        expect(publicText, contains('PURCHASE RECEIPT'));
        expect(publicText, contains('6.50'));
        expect(publicText, contains('0.00'));
        expect(publicText, isNot(contains('PRIVATE DEVICE PURCHASE')));
        expect(publicText, isNot(contains('Private device cash')));
        await tap(find.text('Continue to deals'));
        await waitFor(
          find.textContaining('The sales desk is not available yet.'),
        );
        await prefs.reload();
        expect(prefs.getString(pendingKey), isNull);
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(find.textContaining('Your account changed.'), findsOneWidget);
        await binding.takeScreenshot('purchase-account-closed');
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
        };
      }
    },
  );
}
