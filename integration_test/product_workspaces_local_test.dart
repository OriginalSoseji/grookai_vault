import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/workspace/vendor_workspace_screen.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_workspace_screen.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/screens/sales/sales_dashboard.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';

class InterruptedLocalSale extends SalesCartService {
  InterruptedLocalSale(SupabaseClient client) : super(client: client);
  final attempts = <String>[];
  @override
  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    attempts.add(jsonEncode(request));
    final receipt = await super.complete(request);
    if (attempts.length == 1) {
      throw StateError('Simulated lost local commit response');
    }
    return receipt;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'local native workspace exact-copy sale recovers once and reconciles',
    (tester) async {
      const url = String.fromEnvironment('SALES_TEST_URL');
      const email = String.fromEnvironment('SALES_TEST_EMAIL');
      const scan = String.fromEnvironment('SALES_TEST_GVVI');
      const spare = String.fromEnvironment('SALES_TEST_SPARE_GVVI');
      expect(url, 'http://127.0.0.1:32841');
      expect(email.endsWith('@product-overhaul.invalid'), isTrue);
      expect(scan.startsWith('GVVI-'), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('SALES_TEST_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('SALES_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final desk = InterruptedLocalSale(client);
      final reports = SalesCartService(client: client);
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: GvPalette.scheme(Brightness.light),
          ),
          home: VendorWorkspaceScreen(
            accountChanges: client.auth.onAuthStateChange
                .where((e) => e.session?.user.id != owner)
                .map((_) {}),
            onScan: () async {},
            pageBuilder: (_, destination, select) => switch (destination) {
              VendorDestination.desk => SalesDeskScreen(service: desk),
              VendorDestination.inventory => VendorPricingWorkspaceScreen(
                service: VendorPricingWorkspaceService(client: client),
              ),
              VendorDestination.reports => SalesReportsScreen(service: reports),
              VendorDestination.store => const Scaffold(
                body: Center(
                  child: Text('Store is outside this acceptance test'),
                ),
              ),
            },
          ),
        ),
      );
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 150 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(finder, findsWidgets);
      }

      Future<void> tap(Finder finder) async {
        await waitFor(finder);
        await tester.ensureVisible(finder);
        await tester.pumpAndSettle();
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      Future<void> tab(String name) async {
        final navigation = find.byWidgetPredicate(
          (w) => w is NavigationBar || w is NavigationRail,
        );
        await tap(find.descendant(of: navigation, matching: find.text(name)));
      }

      Future<void> screenshot(String name) async {
        await tester.pumpAndSettle();
        await binding.takeScreenshot(name);
      }

      await waitFor(find.text('Scan cards'));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      await tap(find.text('Scan cards'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Scanner input'),
        'https://grookaivault.com/q/$scan',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await waitFor(find.textContaining('Draft saved'));
      await tap(find.text('Stop scanning'));
      await screenshot('workspace-local-scanned-copy');
      await tab('Reports');
      await waitFor(find.text('Your sales, at a glance'));
      await tab('Desk');
      if (find.text('Cart (1)').evaluate().isNotEmpty) {
        await tap(find.text('Cart (1)'));
      }
      await waitFor(find.text('Checkout: 1 × USD 12.34'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Store name on receipt'),
        'Overhaul synthetic vendor',
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Review & record sale'),
        350,
        scrollable: find
            .descendant(
              of: find.byKey(const Key('sales-cart-scroll')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tap(find.text('Review & record sale'));
      await tap(find.text('Payment received · Record sale'));
      await waitFor(find.textContaining('Sale status is unconfirmed'));
      expect(desk.attempts.length, 1);
      await screenshot('workspace-local-unconfirmed');
      await tap(find.text('Retry / recover this sale'));
      await waitFor(find.text('Sale recorded'));
      expect(desk.attempts.length, 2);
      expect(desk.attempts[0], desk.attempts[1]);
      await screenshot('workspace-local-recovered-receipt');
      final book = await client.rpc('vendor_receipt_book_read_v1');
      final rows = book['book']['receipts'] as List;
      expect(rows.length, 1);
      expect(rows.single['receipt']['totalMinor'], 1234);
      expect((rows.single['receipt']['items'] as List).length, 1);
      final owned = await client
          .from('vault_item_instances')
          .select('gv_vi_id,archived_at')
          .eq('user_id', owner);
      // Owner reads intentionally hide archived copies; the external local
      // readback separately verifies the retained row and single disposition.
      expect(owned.where((r) => r['gv_vi_id'] == scan), isEmpty);
      expect(
        owned.singleWhere((r) => r['gv_vi_id'] == spare)['archived_at'],
        isNull,
      );
      await tab('Reports');
      await waitFor(find.text('Your sales, at a glance'));
      final receiptNumber = find.textContaining(
        rows.single['receipt']['number'] as String,
      );
      await tester.scrollUntilVisible(
        receiptNumber,
        350,
        scrollable: find
            .descendant(
              of: find.byType(SalesDashboard),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await waitFor(receiptNumber);
      await screenshot('workspace-local-reconciled-report');
      await tab('Inventory');
      await waitFor(find.textContaining(spare));
      expect(find.textContaining(scan), findsNothing);
      await screenshot('workspace-local-remaining-copy');
      await client.auth.signOut();
      await waitFor(find.text('Workspace closed'));
      expect(find.textContaining(spare), findsNothing);
      await screenshot('workspace-local-account-closed');
      expect(tester.takeException(), isNull);
      binding.reportData ??= {};
      binding.reportData!['overhaul'] = {
        'owner': owner,
        'receiptCount': 1,
        'totalMinor': 1234,
        'sameRequestRetried': true,
        'simulatedResponseLoss': true,
        'realLocalAuth': true,
        'accountChangeClearsWorkspace': true,
        'productionWrites': 0,
      };
    },
  );
}
