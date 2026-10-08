import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/vault/copy_cost_review_screen.dart';
import 'package:grookai_vault/services/vault/copy_cost_review_service.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'support/copy_cost_review_fakes.dart';

VendorPricingWorkspaceRow copy(int index) => VendorPricingWorkspaceRow(
  instanceId: reviewId(index),
  gvviId: 'GVVI-REVIEW-$index',
  vaultItemId: '',
  cardPrintId: reviewId(100),
  gvId: 'GV-REVIEW',
  name: 'Sample $index',
  displayName: 'Sample $index',
  number: '$index',
  printingLabel: 'Holo',
  conditionLabel: 'NM',
  intent: 'hold',
  isGraded: false,
  marketPrice: null,
  askingPrice: null,
  currency: 'USD',
  sectionIds: const {},
);

void main() {
  late ReviewGateway gateway;
  late CopyCostReviewService service;
  setUp(() {
    gateway = ReviewGateway();
    service = CopyCostReviewService(gateway);
  });
  tearDown(() async {
    service.dispose();
    await gateway.changes.close();
  });
  Future<void> open(
    WidgetTester tester, {
    int count = 2,
    Future<void> Function(VendorPricingWorkspaceRow)? edit,
    double scale = 1,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        builder: (_, child) => MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: CopyCostReviewScreen(
          service: service,
          copies: List.generate(count, copy),
          onEdit: edit ?? (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> choose(WidgetTester tester, String filter) async {
    final chip = find.byKey(Key('cost_review_filter_$filter'));
    await tester.ensureVisible(chip);
    await tester.pumpAndSettle();
    await tester.tap(chip);
    await tester.pumpAndSettle();
  }

  testWidgets('coverage is scoped and default queue excludes recorded costs', (
    tester,
  ) async {
    gateway.rows.addAll([
      reviewRow(0),
      reviewRow(
        1,
        cost: reviewCost('known', amount: '0', currency: 'USD', minor: '0'),
      ),
    ]);
    await open(tester);
    expect(
      find.text('1 of 2 included copies have a recorded cost and currency.'),
      findsOneWidget,
    );
    expect(find.text('Sample 0'), findsOneWidget);
    expect(find.text('Sample 1'), findsNothing);
    await choose(tester, 'known');
    expect(find.text('USD 0.00'), findsOneWidget);
    expect(find.text('Sample 0'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'missing currency preserves original amount without inventing USD',
    (tester) async {
      gateway.rows.add(
        reviewRow(0, cost: reviewCost('missing_currency', amount: '12.00')),
      );
      await open(tester, count: 1);
      await choose(tester, 'missingCurrency');
      expect(find.text('Recorded amount: 12.00'), findsOneWidget);
      expect(find.textContaining('USD'), findsNothing);
    },
  );
  testWidgets('editor returns to refreshed queue with confirmed cost removed', (
    tester,
  ) async {
    gateway.rows.addAll([reviewRow(0), reviewRow(1)]);
    String? opened;
    await open(
      tester,
      edit: (selected) async {
        opened = selected.instanceId;
        gateway.rows[0] = reviewRow(
          0,
          cost: reviewCost('known', amount: '5', currency: 'USD', minor: '500'),
        );
      },
    );
    final action = find.byKey(Key('cost_review_edit_${reviewId(0)}'));
    await tester.ensureVisible(action);
    await tester.tap(action);
    await tester.pumpAndSettle();
    expect(opened, reviewId(0));
    expect(gateway.calls, hasLength(2));
    expect(find.text('Sample 0'), findsNothing);
    expect(
      find.text('1 of 2 included copies have a recorded cost and currency.'),
      findsOneWidget,
    );
  });
  testWidgets('refresh failure clears old coverage and retry restores it', (
    tester,
  ) async {
    gateway.rows.add(reviewRow(0));
    await open(tester, count: 1);
    gateway.fail = true;
    await tester.tap(find.byTooltip('Refresh cost review'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cost_review_coverage')), findsNothing);
    expect(find.text('Sample 0'), findsNothing);
    expect(find.textContaining('Private transport detail'), findsNothing);
    gateway.fail = false;
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cost_review_coverage')), findsOneWidget);
  });
  testWidgets(
    'account closure hides private copies and ignores late response',
    (tester) async {
      final pending = Completer<Object?>();
      gateway.respond = (_) => pending.future;
      await tester.pumpWidget(
        MaterialApp(
          home: CopyCostReviewScreen(
            service: service,
            copies: [copy(0)],
            onEdit: (_) async {},
          ),
        ),
      );
      await tester.pump();
      gateway.change(null);
      gateway.change(reviewOwner);
      await tester.pump();
      pending.complete({
        'ownerId': reviewOwner,
        'editEnabled': true,
        'copies': [reviewRow(0)],
      });
      await tester.pumpAndSettle();
      expect(find.textContaining('Your account changed.'), findsOneWidget);
      expect(find.text('Sample 0'), findsNothing);
      expect(find.byKey(const Key('cost_review_coverage')), findsNothing);
      expect(find.byType(TextField), findsNothing);
    },
  );
  testWidgets(
    'unavailable copies have no edit action; empty scope reads nothing',
    (tester) async {
      await open(tester, count: 1);
      await choose(tester, 'unavailable');
      expect(find.text('Copy no longer available'), findsOneWidget);
      expect(find.text('Review cost'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      gateway.calls.clear();
      await open(tester, count: 0);
      expect(gateway.calls, isEmpty);
      expect(find.textContaining('No copies were included.'), findsOneWidget);
    },
  );
  testWidgets('360px at double text size scrolls to repair without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    gateway.rows.add(reviewRow(0));
    await open(tester, count: 1, scale: 2);
    await tester.scrollUntilVisible(
      find.text('Review cost'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('Review cost'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('search narrows the queue without changing overall scope', (
    tester,
  ) async {
    gateway.rows.addAll([reviewRow(0), reviewRow(1)]);
    await open(tester);
    await tester.enterText(find.byType(TextField), 'GVVI-REVIEW-1');
    await tester.pumpAndSettle();
    expect(find.text('Sample 0'), findsNothing);
    expect(find.text('Sample 1'), findsOneWidget);
    expect(
      find.text('0 of 2 included copies have a recorded cost and currency.'),
      findsOneWidget,
    );
    expect(gateway.calls, hasLength(1));
  });
}
