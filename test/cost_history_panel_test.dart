import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/cost_history_panel.dart';
import 'package:grookai_vault/services/sales/cost_correction_service.dart';
import 'package:grookai_vault/services/sales/cost_correction_journal.dart';
import 'package:grookai_vault/services/sales/cost_correction_journal_store.dart';
import 'package:grookai_vault/services/sales/sales_profit_service.dart';

dynamic copy(dynamic v) => jsonDecode(jsonEncode(v));

class Store implements CostCorrectionJournalStore {
  Map<String, dynamic>? row;
  @override
  Future<Map<String, dynamic>?> read() async =>
      row == null ? null : Map<String, dynamic>.from(copy(row) as Map);
  @override
  Future<Map<String, dynamic>> change(Map<String, dynamic> edit) async {
    row = changeCostCorrectionJournal(row, edit);
    return (await read())!;
  }
}

class Gateway implements CostCorrectionGateway {
  Gateway(this.sample) : ownerId = sample['ownerId'] as String;
  final Map<String, dynamic> sample;
  @override
  String? ownerId;
  final changes = StreamController<String?>.broadcast(sync: true);
  @override
  Stream<String?> get ownerChanges => changes.stream;
  bool enabled = true, drop = false, failRead = false, reject = false;
  final sent = <Map<String, dynamic>>[];
  Map<String, dynamic>? outcome;
  @override
  Future<Object?> available() async => enabled;
  @override
  Future<Object?> read(List<String> ids) async {
    if (failRead) throw StateError('Unavailable');
    return copy(
      (sample['correctionStates'] as List)
          .where((s) => ids.contains(s['receiptId']))
          .toList(),
    );
  }

  @override
  Future<Object?> history(
    String receiptId,
    int lineIndex,
    String? beforeRevision,
  ) async => copy(
    ((sample['correctionStates'] as List).firstWhere(
              (s) => s['receiptId'] == receiptId,
            )['lines']
            as List)
        .where((r) => r['request']['lineIndex'] == lineIndex)
        .toList(),
  );
  @override
  Future<Object?> recover(Map<String, dynamic> request) async => copy(outcome);
  @override
  Future<Object?> apply(Map<String, dynamic> request) async {
    sent.add(Map<String, dynamic>.from(copy(request) as Map));
    if (reject) throw StateError('Stale');
    outcome = {
      'version': 1,
      'ownerId': ownerId,
      'request': copy(request),
      'status': 'applied',
      'revision': '2',
      'source': 'legacy',
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
    };
    final state = (sample['correctionStates'] as List).firstWhere(
      (s) => s['receiptId'] == request['receipt']['id'],
    );
    state['lines'] = [copy(outcome)];
    if (drop) throw StateError('Lost reply');
    return copy(outcome);
  }

  @override
  Future<Object?> cancel(Map<String, dynamic> request) async => copy(
    outcome ??= {
      'version': 1,
      'ownerId': ownerId,
      'request': copy(request),
      'status': 'cancelled',
      'revision': null,
      'source': null,
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
    },
  );
}

class ProfitGateway implements SalesProfitGateway {
  ProfitGateway(this.gateway);
  final Gateway gateway;
  @override
  String? get ownerId => gateway.ownerId;
  @override
  Stream<String?> get ownerChanges => gateway.ownerChanges;
  @override
  Future<Object?> read(List<String> ids) async => {
    'ownerId': ownerId,
    'snapshots': copy(gateway.sample['snapshots']),
  };
}

void main() {
  late Gateway gateway;
  late Store store;
  late CostCorrectionService service;
  late SalesProfitService profit;
  setUp(() {
    final fixture =
        jsonDecode(
              File(
                'test/fixtures/event_cost_corrections_v1.json',
              ).readAsStringSync(),
            )
            as Map;
    final sample = Map<String, dynamic>.from(
      copy(fixture['cases'][0]['args']) as Map,
    );
    final now = DateTime.now().toUtc().toIso8601String();
    for (final receipt in sample['receipts'] as List) {
      receipt['createdAt'] = now;
    }
    for (final snapshot in sample['snapshots'] as List) {
      snapshot['soldAt'] = now;
    }
    for (final state in sample['correctionStates'] as List) {
      state['receipt']['createdAt'] = now;
      for (final row in state['lines'] as List) {
        row['request']['receipt']['createdAt'] = now;
      }
    }
    gateway = Gateway(sample);
    store = Store();
    service = CostCorrectionService(gateway: gateway, store: store);
    profit = SalesProfitService(gateway: ProfitGateway(gateway));
  });
  tearDown(() async {
    service.dispose();
    profit.dispose();
    await gateway.changes.close();
  });
  Future<void> mount(
    WidgetTester t, {
    double width = 390,
    double scale = 1,
    bool enabled = true,
  }) async {
    t.view.physicalSize = Size(width, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.resetPhysicalSize);
    addTearDown(t.view.resetDevicePixelRatio);
    await t.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(
            size: Size(width, 844),
            textScaler: TextScaler.linear(scale),
          ),
          child: Scaffold(
            body: CostHistoryPanel(
              receipts: (gateway.sample['receipts'] as List)
                  .map((r) => Map<String, dynamic>.from(r as Map))
                  .toList(),
              service: service,
              profitService: profit,
              allowNewEdits: enabled,
            ),
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
  }

  Future<void> tap(WidgetTester t, Finder f) async {
    if (f.evaluate().isEmpty) {
      t
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .jumpTo(0);
      await t.pumpAndSettle();
      await t.scrollUntilVisible(
        f,
        250,
        scrollable: find.byType(Scrollable).first,
        maxScrolls: 30,
      );
    }
    await t.ensureVisible(f);
    await t.pumpAndSettle();
    await t.tap(f);
    await t.pumpAndSettle();
  }

  Future<void> edit(WidgetTester t) async {
    final receipt = (gateway.sample['receipts'] as List).first;
    await tap(t, find.text(receipt['number'] as String));
    await tap(t, find.text('Correct cost').first);
  }

  for (final size in [(320.0, 1.0), (390.0, 2.0), (768.0, 1.0)]) {
    testWidgets(
      'cost report and editor fit width ${size.$1}, scale ${size.$2}',
      (t) async {
        await mount(t, width: size.$1, scale: size.$2);
        expect(find.text(r'$40.00'), findsOneWidget);
        await edit(t);
        expect(find.text('Total cost for this line'), findsOneWidget);
        await tap(t, find.text('Set full-line cost'));
        await tap(t, find.text('Restore original evidence').last);
        expect(find.text('Total cost for this line'), findsNothing);
        expect(t.takeException(), isNull);
      },
    );
  }
  testWidgets(
    'corrected basis changes metrics and read failure cannot become zero',
    (t) async {
      await mount(t);
      await tap(t, find.text('Original cost at sale'));
      await tap(t, find.text('Later owner corrections').last);
      expect(find.text(r'$75.00'), findsOneWidget);
      gateway.failRead = true;
      await tap(t, find.text('Refresh cost history'));
      expect(find.text(r'$75.00'), findsNothing);
      expect(
        find.textContaining('Later cost revisions could not load.'),
        findsOneWidget,
      );
    },
  );
  testWidgets(
    'whole-line edit retains reason and recovers lost success with entry off',
    (t) async {
      await mount(t);
      await edit(t);
      await t.enterText(
        find.widgetWithText(TextField, 'Total cost for this line'),
        '0',
      );
      await t.enterText(
        find.widgetWithText(TextField, 'Reason for this correction'),
        'Gift receipt found',
      );
      gateway.drop = true;
      await tap(t, find.text('Save cost revision'));
      expect(store.row!['pending']['cost']['minor'], '0');
      expect(gateway.sent.single['reason'], 'Gift receipt found');
      expect(gateway.sent.single['expectedRevision'], '1');
      await t.pumpWidget(const SizedBox());
      service.dispose();
      gateway.enabled = false;
      service = CostCorrectionService(gateway: gateway, store: store);
      await mount(t, enabled: false);
      await tap(t, find.text('Check saved correction'));
      expect(store.row!['pending'], isNull);
      expect(gateway.sent.length, 1);
      t
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .jumpTo(0);
      await t.pumpAndSettle();
      expect(
        find.text('Cost revision saved. Original sale evidence is retained.'),
        findsOneWidget,
      );
    },
  );
  testWidgets('stale request stays exact until terminal cancellation', (
    t,
  ) async {
    await mount(t);
    await edit(t);
    await t.enterText(
      find.widgetWithText(TextField, 'Total cost for this line'),
      '25',
    );
    await t.enterText(
      find.widgetWithText(TextField, 'Reason for this correction'),
      'Invoice checked',
    );
    gateway.reject = true;
    await tap(t, find.text('Save cost revision'));
    final bytes = jsonEncode(store.row!['pending']);
    await tap(t, find.text('Check saved correction'));
    expect(jsonEncode(store.row!['pending']), bytes);
    await tap(t, find.text('Cancel pending request'));
    expect(store.row!['pending'], isNull);
  });
  testWidgets('account switch removes private costs and open editor', (
    t,
  ) async {
    await mount(t);
    await edit(t);
    gateway.ownerId = null;
    gateway.changes.add(null);
    await t.pumpAndSettle();
    expect(find.text('Total cost for this line'), findsNothing);
    expect(find.text(r'$40.00'), findsNothing);
    expect(find.textContaining('account changed'), findsOneWidget);
  });
}
