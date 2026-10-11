import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/negotiated_draft.dart';
import 'package:grookai_vault/services/sales/purchase_drafts.dart';
import 'package:grookai_vault/services/sales/sales_profit.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'support/trade_controls.dart';

// Every request reaches the actual local authority. Only the committed response is lost.
class DropCommittedDiscount extends SalesCartService {
  DropCommittedDiscount(SupabaseClient client) : super(client: client);
  bool drop = false;
  final sent = <Map<String, dynamic>>[];
  Map<String, dynamic>? committed;
  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    sent.add(jsonDecode(jsonEncode(request)) as Map<String, dynamic>);
    final result = await super.complete(request);
    committed = result;
    if (drop && request['cart']['version'] == 6) {
      drop = false;
      throw const SocketException('Acceptance: committed response lost');
    }
    return result;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'actual discounted sale survives process loss and disabled entry',
    (tester) async {
      tester.testTextInput.register();
      addTearDown(tester.testTextInput.unregister);
      const url = String.fromEnvironment('SUPABASE_URL');
      const email = String.fromEnvironment('DISCOUNT_TEST_EMAIL');
      expect(url, 'http://127.0.0.1:34601');
      expect(email.endsWith('@discount-ui.invalid'), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('DISCOUNT_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final service = DropCommittedDiscount(client);
      final prefs = await SharedPreferences.getInstance();
      final marker = 'grookai.discount-runtime-proof.v1.$owner';
      final pendingKey = 'grookai.pending-sale.v1.$owner';
      final draftKey = 'grookai.sales-drafts.v1.$owner';
      final previous = prefs.getString(marker);
      final before = await service.load();
      expect(before.discountsAvailable, previous == null);
      const draftId = '11111111-1111-4111-8111-000000000433';
      final held = [
        blankPurchaseDraft(
          '22222222-2222-4222-8222-000000000433',
          'Retained buy',
        ),
        newNegotiatedDraft(
          '33333333-3333-4333-8333-000000000433',
          'Retained trade',
        ),
      ];
      if (previous == null) {
        expect(before.pending, isNull);
        expect(before.localDrafts?['drafts'], isEmpty);
        final draft = {
          ...blankSalesDraft(draftId, 'Samsung discount shop'),
          'items': [
            {
              'instanceId': const String.fromEnvironment('DISCOUNT_NM_ID'),
              'description': 'Known sixty-dollar cost',
              'quantity': 1,
              'unitMinor': 10000,
            },
            {
              'instanceId': const String.fromEnvironment('DISCOUNT_LP_ID'),
              'description': 'Known zero cost',
              'quantity': 1,
              'unitMinor': 5000,
            },
            {
              'instanceId': null,
              'description': 'Unlinked lot',
              'quantity': 2,
              'unitMinor': 2500,
            },
          ],
          'note': 'PRIVATE-RECEIPT-NOTE',
          'customer': {
            'name': 'Synthetic customer',
            'email': 'private@discount-ui.invalid',
            'phone': '555-0100',
            'wants': 'PRIVATE-WANTS',
            'notes': 'PRIVATE-CUSTOMER-NOTES',
          },
        };
        await service.saveDrafts({
          'version': 3,
          'revision': 0,
          'active': draftId,
          'drafts': [draft, ...held],
        });
      } else {
        final saved = jsonDecode(previous) as Map;
        expect(prefs.getString(pendingKey), saved['pendingRaw']);
        expect(prefs.getString(draftKey), saved['draftRaw']);
      }
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: GvPalette.scheme(Brightness.light),
          ),
          home: SalesDeskScreen(service: service),
        ),
      );
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
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

      Future<void> fill(String label, String value, {bool form = false}) async {
        final field = find
            .widgetWithText(form ? TextFormField : TextField, label)
            .first;
        await revealTradeControl(tester, field);
        await tester.enterText(field, value);
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
      }

      Future<void> screenshot(String name, Finder target) async {
        await revealTradeControl(tester, target);
        await binding.takeScreenshot(name);
      }

      if (previous == null) {
        await waitFor(find.textContaining('Cart ('));
        await tap(find.textContaining('Cart ('));
        await tap(find.widgetWithText(OutlinedButton, 'Add discount'));
        await fill('Sale discount (USD)', '201.00');
        final record = find.widgetWithText(
          FilledButton,
          'Review & record sale',
        );
        expect(tester.widget<FilledButton>(record).onPressed, isNull);
        await screenshot(
          'discount-invalid',
          find.textContaining('Total needs review'),
        );
        await fill('Sale discount (USD)', '20.00');
        await fill('Tax collected (USD)', '1.00');
        await tap(find.text('Customer view'));
        final dialog = find.byType(AlertDialog);
        expect(
          find.descendant(
            of: dialog,
            matching: find.text('You pay USD 181.00'),
          ),
          findsOneWidget,
        );
        for (final value in [
          'PRIVATE-RECEIPT-NOTE',
          'private@discount-ui.invalid',
          '555-0100',
          'PRIVATE-WANTS',
          'PRIVATE-CUSTOMER-NOTES',
          const String.fromEnvironment('DISCOUNT_NM_ID'),
        ]) {
          expect(
            find.descendant(of: dialog, matching: find.textContaining(value)),
            findsNothing,
          );
        }
        await screenshot('discount-customer', find.text('You pay USD 181.00'));
        await tap(find.text('Back to sales desk'));
        await tap(
          find.widgetWithText(SwitchListTile, 'Split payment / cash change'),
        );
        await fill('Amount applied (USD)', '100.00', form: true);
        await fill('Cash handed to you (USD)', '120.00', form: true);
        await tap(find.widgetWithText(OutlinedButton, 'Add payment method'));
        expect(find.text('Give USD 20.00 cash change'), findsOneWidget);
        await screenshot(
          'discount-split',
          find.text('Give USD 20.00 cash change'),
        );
        await tap(record);
        expect(find.text('Receive: USD 181.00'), findsOneWidget);
        await screenshot(
          'discount-review',
          find.text('Record discounted sale?'),
        );
        service.drop = true;
        await tap(
          find.widgetWithText(FilledButton, 'Exchange completed · Record sale'),
        );
        await waitFor(find.textContaining('Sale status is unconfirmed.'));
        await revealTradeControl(tester, find.text('Retry / recover this sale'));
        await prefs.reload();
        final raw = prefs.getString(pendingKey)!;
        final pending = jsonDecode(raw) as Map;
        expect(pending['cart']['version'], 6);
        expect(pending['cart']['discountMinor'], 2000);
        expect(pending['cart']['payments'], [
          {'method': 'Cash', 'amountMinor': 10000, 'tenderedMinor': 12000},
          {
            'method': 'Card (external terminal)',
            'amountMinor': 8100,
            'tenderedMinor': 8100,
          },
        ]);
        final draftRaw = prefs.getString(draftKey)!;
        final journal = jsonDecode(draftRaw) as Map;
        expect(journal['version'], 4);
        expect((journal['drafts'] as List).skip(1).toList(), held);
        final costs =
            await client.rpc(
                  'vendor_sale_cost_read_v1',
                  params: {
                    'p_request_ids': [pending['id']],
                  },
                )
                as Map;
        final profit = salesProfit(
          [service.committed!],
          List<Map<String, dynamic>>.from(
            (costs['snapshots'] as List).map(
              (s) => Map<String, dynamic>.from(s as Map),
            ),
          ),
        );
        expect(profit['knownProfitMinor'], '7500');
        expect(profit['unknownSalesMinor'], '4500');
        await prefs.setString(
          marker,
          jsonEncode({
            'pendingRaw': raw,
            'draftRaw': draftRaw,
            'receipt': service.committed,
          }),
        );
        await screenshot(
          'discount-pending',
          find.text('Retry / recover this sale'),
        );
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'discount_pending',
          'owner': owner,
          'pendingRaw': raw,
          'draftRaw': draftRaw,
          'receipt': service.committed,
          'sent': service.sent,
          'profit': profit,
        };
      } else {
        final saved = jsonDecode(previous) as Map;
        await waitFor(find.text('Sale recorded'));
        expect(service.sent, isEmpty);
        await prefs.reload();
        expect(prefs.getString(pendingKey), saved['pendingRaw']);
        expect(prefs.getString(draftKey), saved['draftRaw']);
        await screenshot(
          'discount-recovered-entry-off',
          find.text('Sale recorded'),
        );
        await tap(find.text('Start next sale'));
        await prefs.reload();
        expect(prefs.getString(pendingKey), isNull);
        final book = jsonDecode(prefs.getString(draftKey)!) as Map;
        expect(book['version'], 4);
        for (final d in held) {
          expect(
            (book['drafts'] as List).singleWhere((v) => v['id'] == d['id']),
            d,
          );
        }
        await client.auth.signOut();
        await tester.pumpAndSettle();
        expect(find.textContaining('Your account changed'), findsWidgets);
        await binding.takeScreenshot('discount-account-closed');
        binding.reportData = {
          ...?binding.reportData,
          'phase': 'discount_recovered',
          'owner': owner,
          'exactPendingAndDraftRetained': true,
          'noSecondCompletion': true,
          'pendingClearedAfterReceipt': true,
          'heldKindsRetained': true,
          'accountClosed': true,
        };
      }
      expect(tester.takeException(), isNull);
    },
  );
}
