import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_dashboard.dart';
import 'package:grookai_vault/screens/sales/sales_profit_panel.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_profit_service.dart';
import 'purchase_receipt_compatibility_test.dart' as purchase_fixture;

const _owner = '11111111-1111-4111-8111-111111111111';

class _Reports extends SalesCartService {
  _Reports(this.receipts);
  final List<Map<String, dynamic>> receipts;
  @override
  Stream<void> get accountChanges => const Stream.empty();
  @override
  Future<Map<String, dynamic>> loadReportBook() async => {
    'receipts': [
      for (final receipt in receipts) {'receipt': receipt},
    ],
  };
  @override
  Future<SalesDeskData> load() =>
      throw StateError('Read-only Reports cannot open a deal');
}

class _Gateway implements SalesProfitGateway {
  @override
  String? ownerId = _owner;
  final changes = StreamController<String?>.broadcast(sync: true);
  late Future<Object?> Function(List<String>) response;
  int calls = 0;
  @override
  Stream<String?> get ownerChanges => changes.stream;
  @override
  Future<Object?> read(List<String> ids) {
    calls++;
    return response(ids);
  }
}

void main() {
  late _Gateway gateway;
  late SalesProfitService service;
  late List<Map<String, dynamic>> receipts;
  late List<dynamic> snapshots;
  setUp(() {
    final fixture = jsonDecode(
      File('test/fixtures/sales_profit_web_v1.json').readAsStringSync(),
    );
    final first = fixture['cases'][0];
    receipts = (first['receipts'] as List)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    snapshots = first['snapshots'] as List;
    gateway = _Gateway();
    gateway.response = (_) async => {'ownerId': _owner, 'snapshots': snapshots};
    service = SalesProfitService(gateway: gateway);
  });
  tearDown(() async {
    await service.dispose();
    await gateway.changes.close();
  });
  Widget panel({List<Map<String, dynamic>>? rows, double scale = 1}) =>
      MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: Scaffold(
            body: SingleChildScrollView(
              child: SalesProfitPanel(
                receipts: rows ?? receipts,
                service: service,
              ),
            ),
          ),
        ),
      );
  testWidgets(
    'purchase receipts never request sale cost evidence or change coverage',
    (tester) async {
      final fixture = jsonDecode(
        File('test/fixtures/sales_purchase_web_v1.json').readAsStringSync(),
      );
      final purchase = Map<String, dynamic>.from(
        (fixture['cases'] as List).firstWhere(
              (row) => row['name'] == 'exact receipt',
            )['args'][0]
            as Map,
      );
      gateway.response = (ids) async {
        expect(ids, receipts.map((row) => row['id']).toList());
        return {'ownerId': _owner, 'snapshots': snapshots};
      };
      await tester.pumpWidget(panel(rows: [...receipts, purchase]));
      await tester.pumpAndSettle();
      expect(find.text('USD \$8.00'), findsOneWidget);
      expect(find.textContaining('1 of 1 sale line has'), findsOneWidget);
    },
  );
  testWidgets(
    'shows known profit with coverage and explicit excluded economics',
    (tester) async {
      await tester.pumpWidget(panel());
      await tester.pumpAndSettle();
      expect(find.text('USD \$8.00'), findsOneWidget);
      expect(find.textContaining('1 of 1 sale line has'), findsOneWidget);
      expect(find.textContaining('Taxes, payment movements'), findsOneWidget);
      expect(find.textContaining('Private ·'), findsOneWidget);
    },
  );
  testWidgets('failed read never becomes zero profit and can refresh', (
    tester,
  ) async {
    gateway.response = (_) async => throw StateError('private server details');
    await tester.pumpWidget(panel());
    await tester.pumpAndSettle();
    expect(find.textContaining('Profit is unavailable'), findsOneWidget);
    expect(find.textContaining('USD \$'), findsNothing);
    expect(find.textContaining('private server details'), findsNothing);
    gateway.response = (_) async => {'ownerId': _owner, 'snapshots': snapshots};
    await tester.tap(find.text('Refresh cost history'));
    await tester.pumpAndSettle();
    expect(find.text('USD \$8.00'), findsOneWidget);
  });
  testWidgets(
    'missing historical cost has an explicit gap and no invented profit',
    (tester) async {
      gateway.response = (_) async => {'ownerId': _owner, 'snapshots': []};
      await tester.pumpWidget(panel());
      await tester.pumpAndSettle();
      expect(find.text('Unavailable'), findsOneWidget);
      expect(find.text('No cost recorded at sale'), findsOneWidget);
      expect(find.textContaining('0 of 1 sale line has'), findsOneWidget);
      expect(find.text('1 sale line · USD \$20.00'), findsOneWidget);
    },
  );
  testWidgets(
    'a filter change clears old metrics and ignores its late response',
    (tester) async {
      final old = Completer<Object?>();
      gateway.response = (_) => old.future;
      await tester.pumpWidget(panel());
      await tester.pump();
      await tester.pumpWidget(panel(rows: []));
      await tester.pumpAndSettle();
      expect(find.text('No sales match these filters.'), findsOneWidget);
      old.complete({'ownerId': _owner, 'snapshots': snapshots});
      await tester.pumpAndSettle();
      expect(find.text('USD \$8.00'), findsNothing);
      expect(find.text('No sales match these filters.'), findsOneWidget);
    },
  );
  testWidgets('account changes hide existing and late private values', (
    tester,
  ) async {
    await tester.pumpWidget(panel());
    await tester.pumpAndSettle();
    expect(find.text('USD \$8.00'), findsOneWidget);
    gateway.ownerId = null;
    gateway.changes.add(null);
    await tester.pumpAndSettle();
    expect(find.text('USD \$8.00'), findsNothing);
    expect(find.text('Your account changed. Reopen Reports.'), findsOneWidget);
    gateway.ownerId = _owner;
    gateway.changes.add(_owner);
    await tester.pumpAndSettle();
    expect(find.text('USD \$8.00'), findsNothing);
  });
  testWidgets(
    'ordinary rebuild of identical filtered rows does not reread costs',
    (tester) async {
      await tester.pumpWidget(panel());
      await tester.pumpAndSettle();
      await tester.pumpWidget(panel(rows: List.of(receipts)));
      await tester.pumpAndSettle();
      expect(gateway.calls, 1);
    },
  );
  testWidgets(
    'phone at double text size keeps exclusions reachable without overflow',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      gateway.response = (_) async => {'ownerId': _owner, 'snapshots': []};
      await tester.pumpWidget(panel(scale: 2));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('No cost recorded at sale'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('default-off dashboard never reads or exposes private cost', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SalesDashboard(
            receipts: const [],
            refresh: () async {},
            profitService: service,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Known-cost profit'), findsNothing);
    expect(gateway.calls, 0);
  });
  testWidgets(
    'purchase dashboard exposes payout and opens a private-safe receipt',
    (tester) async {
      final purchase = purchase_fixture.purchase();
      final stamp = DateTime.fromMillisecondsSinceEpoch(
        DateTime.now().millisecondsSinceEpoch,
        isUtc: true,
      ).toIso8601String();
      purchase['createdAt'] = stamp;
      purchase['number'] =
          'GVB-${stamp.substring(0, 10).replaceAll('-', '')}-${(purchase['id'] as String).substring(0, 8).toUpperCase()}';
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SalesDashboard(receipts: [purchase], refresh: () async {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Paid out'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Paid out'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.textContaining(purchase['number'] as String),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.textContaining(purchase['number'] as String));
      await tester.pumpAndSettle();
      expect(find.textContaining('PURCHASE RECEIPT'), findsOneWidget);
      expect(
        find.textContaining('Total paid to seller: USD 6.50'),
        findsOneWidget,
      );
      expect(find.textContaining(purchase['note'] as String), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('malformed purchase remains a recoverable Reports read error', (
    tester,
  ) async {
    final purchase = purchase_fixture.purchase();
    purchase['purchaseMinor'] = 651;
    await tester.pumpWidget(
      MaterialApp(home: SalesReportsScreen(service: _Reports([purchase]))),
    );
    await tester.pumpAndSettle();
    expect(
      find.text('Reports could not load. Your receipts have not changed.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'Reports sends its visible payment-filtered receipts to private profit',
    (tester) async {
      final date = DateTime.now().toUtc().toIso8601String();
      receipts[0].addAll({
        'createdAt': date,
        'number': 'GV-TEST-1',
        'customerName': '',
        'method': 'Cash',
      });
      receipts[0]['items'][0]['description'] = 'Test card';
      snapshots[0]['soldAt'] = date;
      await tester.pumpWidget(
        MaterialApp(
          home: SalesReportsScreen(
            service: _Reports(receipts),
            profitEnabled: true,
            profitService: service,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byType(SalesProfitPanel),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.text('USD \$8.00'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.widgetWithText(ChoiceChip, 'Other'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.widgetWithText(ChoiceChip, 'Other'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byType(SalesProfitPanel),
        -300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.text('USD \$8.00'), findsNothing);
      expect(find.text('No sales match these filters.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
