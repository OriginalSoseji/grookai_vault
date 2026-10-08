import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/vault/copy_cost_review_service.dart';
import 'package:grookai_vault/services/vault/copy_cost_service.dart';
import 'copy_cost_review_screen_test.dart' show copy;
import 'support/copy_cost_review_fakes.dart';
import 'support/copy_cost_fakes.dart';

class InventoryReviewService extends VendorPricingWorkspaceService {
  InventoryReviewService(this.gateway);
  final ReviewGateway gateway;
  int opened = 0;
  @override
  Future<VendorPricingWorkspaceData> load() async =>
      VendorPricingWorkspaceData(rows: [copy(0), copy(1)], sections: []);
  @override
  CopyCostReviewService createCopyCostReviewService() {
    opened++;
    return CopyCostReviewService(gateway);
  }
}

void main() {
  for (final enabled in [false, true]) {
    testWidgets(
      'inventory cost review is ${enabled ? 'enabled with explicit scope' : 'off without private reads'}',
      (tester) async {
        final review = ReviewGateway()
          ..rows.addAll([reviewRow(0), reviewRow(1)]);
        final inventory = InventoryReviewService(review);
        final gateway = FakeCostGateway([]);
        final costs = CopyCostService(
          gateway: gateway,
          store: MemoryCostStore([]),
        );
        addTearDown(() async {
          costs.dispose();
          await gateway.changes.close();
          await review.changes.close();
        });
        await tester.pumpWidget(
          MaterialApp(
            home: VendorPricingWorkspaceScreen(
              service: inventory,
              copyCosts: costs,
              costEntryEnabled: enabled,
            ),
          ),
        );
        await tester.pumpAndSettle();
        final entry = find.byKey(const Key('vendor_cost_review'));
        if (!enabled) {
          expect(entry, findsNothing);
          expect(inventory.opened, 0);
          expect(review.calls, isEmpty);
          expect(find.byKey(const Key('vendor_cost_recovery')), findsOneWidget);
          return;
        }
        // Narrow the actual Inventory search before selecting the review scope.
        await tester.enterText(find.byType(TextField).first, 'Sample 1');
        await tester.pumpAndSettle();
        await tester.tap(entry);
        await tester.pumpAndSettle();
        expect(review.calls.single, [reviewId(1)]);
        final repair = find.byKey(Key('cost_review_edit_${reviewId(1)}'));
        await tester.ensureVisible(repair);
        await tester.tap(repair);
        await tester.pumpAndSettle();
        expect(find.text('Private cost'), findsOneWidget);
        expect(find.byKey(const Key('copy_cost_amount')), findsOneWidget);
        expect(gateway.requests, isEmpty);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        expect(review.calls, hasLength(2));
        expect(find.text('Review private costs'), findsOneWidget);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const Key('vendor_search_clear')));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<TextField>(find.byKey(const Key('vendor_search')))
              .controller!
              .text,
          '',
        );
        await tester.tap(find.byKey(const Key('vendor_cost_review')));
        await tester.pumpAndSettle();
        expect(review.calls.last.toSet(), {reviewId(0), reviewId(1)});
        expect(
          find.text(
            '0 of 2 included copies have a recorded cost and currency.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
