import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/vault/copy_cost_review_service.dart';
import 'package:grookai_vault/services/vault/copy_cost_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';

class InterruptedReviewRead extends SupabaseCopyCostReviewGateway {
  InterruptedReviewRead(super.client);
  bool fail = false;
  int calls = 0;
  @override
  Future<Object?> read(List<String> ids) async {
    calls++;
    final value = await super.read(ids);
    if (value is Map) {
      debugPrint(
        'cost-review-read requested=${ids.length} returned=${(value['copies'] as List?)?.length}',
      );
    }
    if (fail) throw StateError('Synthetic interrupted review read');
    return value;
  }
}

class ReviewInventory extends VendorPricingWorkspaceService {
  ReviewInventory(SupabaseClient client, this.gateway)
    : super(client: client, includeSections: false, includeMarketPrices: false);
  final InterruptedReviewRead gateway;
  @override
  CopyCostReviewService createCopyCostReviewService() =>
      CopyCostReviewService(gateway);
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'Inventory reviews exact costs and repairs only explicit missing currency',
    (tester) async {
      const url = String.fromEnvironment('REVIEW_TEST_URL');
      const email = String.fromEnvironment('REVIEW_TEST_EMAIL');
      const copy = String.fromEnvironment('REVIEW_TEST_COPY');
      const gvvi = String.fromEnvironment('REVIEW_TEST_GVVI');
      expect(url, 'http://127.0.0.1:33061');
      expect(email.endsWith('@cost-review.invalid'), isTrue);
      expect(gvvi.startsWith('GVVI-COSTREVIEW-'), isTrue);
      final client = SupabaseClient(
        url,
        const String.fromEnvironment('REVIEW_TEST_KEY'),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('REVIEW_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final costs = CopyCostService.supabase(client);
      addTearDown(costs.dispose);
      expect(await costs.pendingCount(), 0);
      final gateway = InterruptedReviewRead(client);
      final inventory = ReviewInventory(client, gateway);
      expect((await inventory.load()).rows.length, 6);
      Widget app(String key, {bool enabled = true}) => MaterialApp(
        key: ValueKey(key),
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: GvPalette.scheme(Brightness.light),
        ),
        home: VendorPricingWorkspaceScreen(
          service: inventory,
          copyCosts: costs,
          costEntryEnabled: enabled,
        ),
      );
      Future<void> waitFor(Finder finder) async {
        for (var i = 0; i < 120 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        if (finder.evaluate().isEmpty) {
          debugPrint(
            'cost-review-visible-text: ${find.byType(Text).evaluate().map((element) => (element.widget as Text).data).whereType<String>().take(100).join(' | ')}',
          );
          await binding.takeScreenshot('cost-review-diagnostic');
        }
        expect(finder, findsWidgets);
      }

      Future<void> show(Finder finder, {double delta = 240}) async {
        if (finder.evaluate().isEmpty) {
          await tester.scrollUntilVisible(
            finder,
            delta,
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

      Future<void> coverage(int recorded, int included) async {
        await waitFor(
          find.text(
            '$recorded of $included ${included == 1 ? 'included copy has' : 'included copies have'} a recorded cost and currency.',
          ),
        );
      }

      await tester.pumpWidget(app('disabled', enabled: false));
      await waitFor(find.byKey(const Key('vendor_search')));
      expect(find.byKey(const Key('vendor_cost_review')), findsNothing);
      expect(gateway.calls, 0);
      expect(find.byKey(const Key('vendor_cost_recovery')), findsOneWidget);
      await tester.pumpWidget(app('enabled'));
      await waitFor(find.byKey(const Key('vendor_search')));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      await tester.enterText(find.byKey(const Key('vendor_search')), gvvi);
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tap(find.byKey(const Key('vendor_cost_review')));
      await coverage(0, 1);
      expect(find.text('Recorded amount: 12.00'), findsOneWidget);
      await binding.takeScreenshot('cost-review-filtered');
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tap(find.byKey(const Key('vendor_search_clear')));
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('vendor_search')))
            .controller!
            .text,
        '',
      );
      expect(find.byKey(const Key('vendor_search_clear')), findsNothing);
      await tap(find.byKey(const Key('vendor_cost_review')));
      await coverage(3, 6);
      await binding.takeScreenshot('cost-review-summary');
      await tap(find.byKey(const Key('cost_review_filter_known')));
      await show(find.text('USD 0.00'));
      expect(find.text('USD 0.00'), findsOneWidget);
      await show(find.text('CAD 3.00'));
      expect(find.text('CAD 3.00'), findsOneWidget);
      await binding.takeScreenshot('cost-review-recorded');
      await tap(find.byKey(const Key('cost_review_filter_missingCurrency')));
      await show(find.byKey(const Key('cost_review_edit_$copy')));
      expect(find.text('Recorded amount: 12.00'), findsOneWidget);
      await tap(find.byKey(const Key('cost_review_edit_$copy')));
      await waitFor(find.byKey(const Key('copy_cost_amount')));
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('copy_cost_amount')))
            .controller!
            .text,
        '12.00',
      );
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('copy_cost_currency')))
            .controller!
            .text,
        '',
      );
      await binding.takeScreenshot('cost-review-editor');
      await show(find.byKey(const Key('copy_cost_currency')));
      await tester.enterText(
        find.byKey(const Key('copy_cost_currency')),
        'USD',
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tap(find.byKey(const Key('copy_cost_save')));
      await waitFor(find.text('Cost saved.'));
      expect((await costs.read(copy)).cost!.label, 'USD 12.00');
      expect(await costs.pendingCount(), 0);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await coverage(4, 6);
      expect(
        find.text('No included copies match this filter.'),
        findsOneWidget,
      );
      await binding.takeScreenshot('cost-review-repaired');
      gateway.fail = true;
      await tester.tap(find.byTooltip('Refresh cost review'));
      await tester.pumpAndSettle();
      await waitFor(find.byKey(const Key('cost_review_error')));
      expect(find.byKey(const Key('cost_review_coverage')), findsNothing);
      await binding.takeScreenshot('cost-review-unavailable');
      gateway.fail = false;
      await tap(find.text('Try again'));
      await coverage(4, 6);
      await binding.takeScreenshot('cost-review-recovered');
      await client.auth.signOut();
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Your account changed. Reopen Inventory to review private costs.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('cost_review_coverage')), findsNothing);
      expect(find.byType(TextField), findsNothing);
      await binding.takeScreenshot('cost-review-account-closed');
      binding.reportData = {
        ...?binding.reportData,
        'phase': 'cost_review_passed',
        'owner': owner,
        'initialRecorded': 3,
        'finalRecorded': 4,
        'includedCopies': 6,
        'pendingCount': 0,
        'filteredScope': true,
        'readRecovery': true,
        'flagOff': true,
        'accountClosed': true,
        'readCalls': gateway.calls,
      };
    },
  );
}
