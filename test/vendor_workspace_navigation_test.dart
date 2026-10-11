import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/workspace/vendor_workspace_screen.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService;

class RefreshingDesk extends FakeSalesService {
  int refreshes = 0;
  @override
  Future<List<VendorPricingWorkspaceRow>> loadInventory() async {
    refreshes++;
    return [];
  }
}

class ReportService extends SalesCartService {
  final changes = StreamController<void>.broadcast();
  final result = Completer<Map<String, dynamic>>();
  int reads = 0;
  @override
  Stream<void> get accountChanges => changes.stream;
  @override
  Future<Map<String, dynamic>> loadReportBook() {
    reads++;
    return result.future;
  }

  @override
  Future<SalesDeskData> load() =>
      throw StateError('Reports must not open drafts');
}

void main() {
  testWidgets(
    'returning to Reports refreshes receipts and retains the selected period',
    (tester) async {
      final service = ReportService();
      addTearDown(service.changes.close);
      service.result.complete({'receipts': []});
      await tester.pumpWidget(
        MaterialApp(
          home: VendorWorkspaceScreen(
            initialDestination: VendorDestination.reports,
            accountChanges: const Stream.empty(),
            onScan: () async {},
            pageBuilder: (_, destination, select) =>
                destination == VendorDestination.reports
                ? SalesReportsScreen(service: service)
                : const SizedBox(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('7 days'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('Inventory'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text('Reports'),
        ),
      );
      await tester.pumpAndSettle();
      expect(service.reads, 2);
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, '7 days'))
            .selected,
        isTrue,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'returning to Desk removes stale stock without changing the deal',
    (tester) async {
      tester.view.physicalSize = const Size(1194, 834);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = RefreshingDesk();
      await tester.pumpWidget(
        MaterialApp(
          home: VendorWorkspaceScreen(
            accountChanges: const Stream.empty(),
            onScan: () async {},
            pageBuilder: (_, destination, select) =>
                destination == VendorDestination.desk
                ? SalesDeskScreen(service: service)
                : const SizedBox(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Add to sale'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add to sale'));
      await tester.pumpAndSettle();
      expect(find.text('Checkout: 1 × USD 12.34'), findsOneWidget);
      await tester.tap(find.text('Inventory'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Desk'));
      await tester.pumpAndSettle();
      expect(service.refreshes, 1);
      expect(find.byKey(const ValueKey('drag-copy-one')), findsNothing);
      expect(find.text('Checkout: 1 × USD 12.34'), findsOneWidget);
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('workspace retains desk input and loads only visited pages', (
    tester,
  ) async {
    final created = <VendorDestination>[];
    var scans = 0;
    final scan = Completer<void>();
    final changes = StreamController<void>.broadcast();
    addTearDown(changes.close);
    await tester.pumpWidget(
      MaterialApp(
        home: VendorWorkspaceScreen(
          accountChanges: changes.stream,
          onScan: () {
            scans++;
            return scan.future;
          },
          pageBuilder: (_, destination, select) {
            created.add(destination);
            return Scaffold(
              body: destination == VendorDestination.desk
                  ? const TextField(key: Key('deal-note'))
                  : Text('Page ${destination.name}'),
            );
          },
        ),
      ),
    );
    await tester.enterText(
      find.byKey(const Key('deal-note')),
      'Keep negotiated deal',
    );
    await tester.tap(find.text('Inventory'));
    await tester.pumpAndSettle();
    expect(created, [VendorDestination.desk, VendorDestination.inventory]);
    await tester.tap(find.text('Desk'));
    await tester.pumpAndSettle();
    expect(find.text('Keep negotiated deal'), findsOneWidget);
    await tester.tap(find.text('Scan'));
    await tester.tap(find.text('Scan'));
    await tester.pump();
    expect(scans, 1);
    scan.complete();
    await tester.pumpAndSettle();
    changes.add(null);
    await tester.pumpAndSettle();
    expect(find.text('Workspace closed'), findsOneWidget);
    expect(
      find.text('Keep negotiated deal', skipOffstage: false),
      findsNothing,
    );
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('reports unwrap receipts without opening an editable draft', (
    tester,
  ) async {
    final service = ReportService();
    addTearDown(service.changes.close);
    await tester.pumpWidget(
      MaterialApp(home: SalesReportsScreen(service: service)),
    );
    service.result.complete({
      'receipts': [
        {
          'receipt': {
            'id': 'report-fixture',
            'number': 'GV-REPORT',
            'createdAt': DateTime.now().toIso8601String(),
            'storeName': 'Fixture',
            'customerName': '',
            'method': 'Cash',
            'note': '',
            'items': [
              {
                'description': 'Fixture card',
                'quantity': 1,
                'unitMinor': 1000,
                'lineMinor': 1000,
              },
            ],
            'subtotalMinor': 1000,
            'taxMinor': 0,
            'totalMinor': 1000,
          },
        },
      ],
    });
    await tester.pumpAndSettle();
    expect(service.reads, 1);
    await tester.scrollUntilVisible(
      find.textContaining('GV-REPORT'),
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.textContaining('GV-REPORT'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('GV-REPORT'));
    await tester.pumpAndSettle();
    expect(find.text('GV-REPORT'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('late report responses cannot show the previous account', (
    tester,
  ) async {
    final service = ReportService();
    addTearDown(service.changes.close);
    await tester.pumpWidget(
      MaterialApp(home: SalesReportsScreen(service: service)),
    );
    service.changes.add(null);
    await tester.pump();
    service.result.complete({'receipts': []});
    await tester.pumpAndSettle();
    expect(find.text('Your account changed. Reopen reports.'), findsOneWidget);
    expect(find.text('No receipts'), findsNothing);
  });
}
