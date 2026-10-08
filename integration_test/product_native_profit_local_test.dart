import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/screens/sales/sales_profit_panel.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_profit_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';

class InterruptedProfitRead extends SupabaseSalesProfitGateway {
  InterruptedProfitRead(super.client);
  bool fail = false;
  int calls = 0;
  @override
  Future<Object?> read(List<String> receiptIds) async {
    calls++;
    final result = await super.read(receiptIds);
    if (fail) throw StateError('Synthetic interrupted private history read');
    return result;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native Reports reconciles immutable private profit and recovers reads',
    (tester) async {
      const url = String.fromEnvironment('PROFIT_TEST_URL');
      const email = String.fromEnvironment('PROFIT_TEST_EMAIL');
      expect(url, 'http://127.0.0.1:33061');
      expect(email.endsWith('@native-profit.invalid'), isTrue);
      expect(kVendorProfitEnabled, isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('PROFIT_TEST_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('PROFIT_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final gateway = InterruptedProfitRead(client);
      final profits = SalesProfitService(gateway: gateway);
      addTearDown(profits.dispose);
      Widget screen(String key, {bool enabled = true}) => MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.light),
        ),
        home: SalesReportsScreen(
          key: ValueKey(key),
          service: SalesCartService(client: client),
          profitService: profits,
          profitEnabled: enabled,
        ),
      );
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 100 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(finder, findsWidgets);
      }

      Finder scrollable() => find
          .byWidgetPredicate(
            (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
          )
          .first;
      Future<void> show(Finder finder, {double delta = 260}) async {
        if (finder.evaluate().isEmpty) {
          await tester.scrollUntilVisible(
            finder,
            delta,
            scrollable: scrollable(),
            maxScrolls: 35,
          );
        }
        await tester.ensureVisible(finder);
        await tester.pumpAndSettle();
      }

      Future<void> showProfit({double delta = 260}) async {
        await show(find.byType(SalesProfitPanel), delta: delta);
        await waitFor(find.text('USD \$8.00'));
      }

      await tester.pumpWidget(screen('initial'));
      await waitFor(find.text('Your sales, at a glance'));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      await showProfit();
      expect(find.textContaining('1 of 4 sale lines'), findsOneWidget);
      await binding.takeScreenshot('native-profit-summary');
      await show(find.text('No cost recorded at sale'));
      expect(find.text('Cost recorded in another currency'), findsOneWidget);
      expect(find.text('Item not linked to an exact copy'), findsOneWidget);
      await binding.takeScreenshot('native-profit-coverage');
      await show(find.widgetWithText(ChoiceChip, 'Split payment'));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Split payment'));
      await tester.pumpAndSettle();
      await showProfit(delta: -260);
      expect(find.textContaining('1 of 3 sale lines'), findsOneWidget);
      await binding.takeScreenshot('native-profit-filtered');
      gateway.fail = true;
      await tester.tap(find.byTooltip('Refresh reports'));
      await tester.pumpAndSettle();
      await show(find.byType(SalesProfitPanel));
      await waitFor(find.text('Refresh cost history'));
      expect(find.text('USD \$8.00'), findsNothing);
      await binding.takeScreenshot('native-profit-unavailable');
      gateway.fail = false;
      await show(find.text('Refresh cost history'));
      await tester.tap(find.text('Refresh cost history'));
      await tester.pumpAndSettle();
      await waitFor(find.text('USD \$8.00'));
      await binding.takeScreenshot('native-profit-recovered');
      final calls = gateway.calls;
      await tester.pumpWidget(screen('disabled', enabled: false));
      await waitFor(find.text('Your sales, at a glance'));
      await tester.pumpAndSettle();
      expect(find.byType(SalesProfitPanel), findsNothing);
      expect(gateway.calls, calls);
      await tester.pumpWidget(screen('account'));
      await waitFor(find.text('Your sales, at a glance'));
      await showProfit();
      await client.auth.signOut();
      await tester.pumpAndSettle();
      expect(find.byType(SalesProfitPanel), findsNothing);
      expect(find.text('USD \$8.00'), findsNothing);
      expect(
        find.text('Your account changed. Reopen reports.'),
        findsOneWidget,
      );
      await binding.takeScreenshot('native-profit-account-closed');
      binding.reportData = {
        ...?binding.reportData,
        'phase': 'native_profit_passed',
        'owner': owner,
        'knownProfitMinor': '800',
        'totalLines': 4,
        'filteredLines': 3,
        'readRecovery': true,
        'flagOff': true,
        'accountClosed': true,
        'readCalls': gateway.calls,
      };
    },
  );
}
