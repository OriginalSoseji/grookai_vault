import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/sales/sales_catalog_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';

class MeasuredSalesService extends SalesCartService {
  MeasuredSalesService(SupabaseClient client) : super(client: client);
  int loads = 0, targetedReads = 0;
  @override
  Future<SalesDeskData> load() {
    loads++;
    return super.load();
  }

  @override
  Future<List<VendorPricingWorkspaceRow>> loadAddedCopy(String id) {
    targetedReads++;
    return super.loadAddedCopy(id);
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('real local continuous catalog to multi-copy sale', (
    tester,
  ) async {
    const url = String.fromEnvironment('SALES_TEST_URL');
    const email = String.fromEnvironment('SALES_TEST_EMAIL');
    expect(url, 'http://127.0.0.1:65301');
    expect(email.endsWith('@sales-fast-entry.invalid'), true);
    final client = SupabaseClient(
      url,
      const String.fromEnvironment('SALES_TEST_KEY'),
    );
    await client.auth.signInWithPassword(
      email: email,
      password: const String.fromEnvironment('SALES_TEST_PASSWORD'),
    );
    final service = MeasuredSalesService(client);
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.dark),
        ),
        home: SalesDeskScreen(service: service),
      ),
    );
    Future<void> waitFor(Finder finder) async {
      for (var i = 0; i < 200 && finder.evaluate().isEmpty; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(finder, findsWidgets);
    }

    Future<void> tap(String text) async {
      final finder = find.text(text).last;
      await tester.ensureVisible(finder);
      await tester.tap(finder);
      await tester.pumpAndSettle();
    }

    await waitFor(find.text('Your price: USD 100.00'));
    await tap('Add to sale');
    final compact = find.text('Cart (1)').evaluate().isNotEmpty;
    if (compact) await tap('Cart (1)');
    expect(find.text('Checkout: 1 × USD 100.00'), findsOneWidget);
    expect(find.text('Actual sale price (USD)'), findsNothing);
    if (compact) await tap('Cards');
    await tap('Search catalog & add a card');
    await tester.enterText(
      find.widgetWithText(TextField, 'Name, card number or GV-ID'),
      'GV-PK-FASTENTRY-001',
    );
    final result = find.descendant(
      of: find.byType(SalesCatalogDialog),
      matching: find.text('Synthetic fast entry Pikachu'),
    );
    await waitFor(result);
    final timings = <int>[];
    for (final price in ['20', '30']) {
      await tester.tap(result.last);
      await tester.pumpAndSettle();
      final printing = find
          .descendant(
            of: find.byType(SalesCatalogDialog),
            matching: find.byType(DropdownButtonFormField<String>),
          )
          .first;
      await tester.ensureVisible(printing);
      await tester.tap(printing);
      await tester.pumpAndSettle();
      await tester.tap(find.textContaining('GV-PK-FASTENTRY-001-STD').last);
      await tester.pumpAndSettle();
      final field = find.widgetWithText(TextField, 'Actual sale price (USD)');
      await tester.scrollUntilVisible(
        field,
        150,
        scrollable: find
            .descendant(
              of: find.byType(SalesCatalogDialog),
              matching: find.byType(Scrollable),
            )
            .last,
      );
      await tester.enterText(field, price);
      final watch = Stopwatch()..start();
      await tap('Add copy to Vault & cart');
      await waitFor(result);
      watch.stop();
      timings.add(watch.elapsedMilliseconds);
      expect(find.byType(SalesCatalogDialog), findsOneWidget);
    }
    expect(service.loads, 1);
    expect(service.targetedReads, 2);
    await binding.takeScreenshot('fast-entry-continuous');
    await tester.tap(find.byTooltip('Close catalog'));
    await tester.pumpAndSettle();
    if (compact) await tap('Cart (3)');
    expect(find.text('Checkout: 1 × USD 20.00'), findsOneWidget);
    expect(find.text('Checkout: 1 × USD 30.00'), findsOneWidget);
    await binding.takeScreenshot('fast-entry-cart');
    final storeName = find.widgetWithText(TextField, 'Store name on receipt');
    await tester.scrollUntilVisible(
      storeName,
      180,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('sales-cart-scroll')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.enterText(storeName, 'Synthetic fast entry vendor');
    await tester.scrollUntilVisible(
      find.text('Review & record sale'),
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const Key('sales-cart-scroll')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tap('Review & record sale');
    await tap('Payment received · Record sale');
    await waitFor(find.text('Sale recorded'));
    await binding.takeScreenshot('fast-entry-receipt');
    binding.reportData = {
      ...?binding.reportData,
      'fullDeskLoadsBeforeSale': 1,
      'targetedReads': service.targetedReads,
      'addRoundTripMilliseconds': timings,
    };
    await client.auth.signOut();
    await tester.pumpAndSettle();
    expect(find.textContaining('Your account changed'), findsOneWidget);
    await client.dispose();
  });
}
