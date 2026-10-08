import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/event_reports_panel.dart';
import 'package:grookai_vault/screens/sales/sales_reports_screen.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/event_service.dart';
import 'package:grookai_vault/services/sales/event_report_loader.dart';
import 'package:grookai_vault/services/sales/event_journal_store.dart';
import 'package:grookai_vault/services/sales/event_journal.dart';
import 'package:grookai_vault/services/sales/vendor_events.dart';

dynamic copy(dynamic value) => jsonDecode(jsonEncode(value));

class Store implements EventJournalStore {
  Map<String, dynamic>? row;
  @override
  Future<Map<String, dynamic>?> read() async =>
      row == null ? null : Map<String, dynamic>.from(copy(row) as Map);
  @override
  Future<Map<String, dynamic>> change(Map<String, dynamic> edit) async {
    row = changeEventJournal(row, edit);
    return Map<String, dynamic>.from(copy(row) as Map);
  }
}

class Gateway implements EventGateway {
  Gateway(this.sample) : currentOwner = sample['ownerId'] as String;
  final Map<String, dynamic> sample;
  Map<String, dynamic> get state => sample['state'] as Map<String, dynamic>;
  String? currentOwner;
  bool drop = false, refuse = false, readFailure = false;
  final changes = StreamController<String?>.broadcast(sync: true),
      sent = <Map<String, dynamic>>[],
      acks = <String, Map<String, dynamic>>{};
  @override
  String? get ownerId => currentOwner;
  @override
  Stream<String?> get ownerChanges => changes.stream;
  @override
  Future<Object?> read(String? id) async {
    if (readFailure) throw StateError('Read unavailable');
    return {
      ...state,
      'selected': id == null
          ? null
          : id == sample['eventId']
          ? copy(state['selected'])
          : {
              ...copy(state['selected']) as Map,
              'eventId': id,
              'expenses': [],
              'candidates': [],
            },
    };
  }

  @override
  Future<Object?> recover(String id) async => copy(acks[id]);
  @override
  Future<Object?> mutate(Map<String, dynamic> request) async {
    sent.add(Map<String, dynamic>.from(copy(request) as Map));
    if (refuse) {
      refuse = false;
      throw const EventRpcError('PT409', definitive: true);
    }
    final op = request['operation'] as Map,
        revision = '${BigInt.parse(state['revision'] as String) + BigInt.one}';
    final ack = <String, dynamic>{
      'version': 1,
      'ownerId': ownerId,
      'requestId': request['requestId'],
      'previousRevision': request['expectedRevision'],
      'revision': revision,
      'operation': copy(op),
    };
    acks[request['requestId'] as String] = ack;
    state['revision'] = revision;
    if (op['type'] == 'event_create') {
      final event = Map<String, dynamic>.from(copy(op) as Map)..remove('type');
      event.addAll({
        'revision': revision,
        'status': 'open',
        'stateReason': '',
        'createdAt': '2026-10-08T14:00:00Z',
        'updatedAt': '2026-10-08T14:00:00Z',
      });
      (state['events'] as List).add(event);
      (state['events'] as List).sort(
        (a, b) => (a['eventId'] as String).compareTo(b['eventId'] as String),
      );
    }
    if (op['type'] == 'event_close' || op['type'] == 'event_reopen') {
      final event =
          (state['events'] as List).firstWhere(
                (e) => e['eventId'] == op['eventId'],
              )
              as Map;
      event['status'] = op['type'] == 'event_close' ? 'closed' : 'open';
      event['stateReason'] = op['reason'];
      event['revision'] = revision;
    }
    if (op['type'] == 'expense_update') {
      final expense =
          (state['selected']['expenses'] as List).firstWhere(
                (e) => e['expenseId'] == op['expenseId'],
              )
              as Map;
      for (final key in [
        'description',
        'amountMinor',
        'category',
        'incurredOn',
      ]) {
        expense[key] = op[key];
      }
      expense['lastReason'] = op['reason'];
      expense['revision'] = revision;
    }
    if (op['type'] == 'expense_void') {
      final expense =
          (state['selected']['expenses'] as List).firstWhere(
                (e) => e['expenseId'] == op['expenseId'],
              )
              as Map;
      expense['voided'] = true;
      expense['lastReason'] = op['reason'];
      expense['revision'] = revision;
    }
    if (op['type'] == 'receipts_assign') {
      for (final receipt in op['receipts'] as List) {
        final assignment =
            (state['selected']['assignments'] as List).firstWhere(
                  (a) => a['receiptId'] == receipt['receiptId'],
                )
                as Map;
        assignment['eventId'] = op['eventId'];
        assignment['revision'] = revision;
      }
    }
    if (drop) {
      drop = false;
      throw StateError('Response lost');
    }
    return copy(ack);
  }
}

class Reader implements EventReportSource {
  Reader(this.gateway, this.service);
  final Gateway gateway;
  final EventService service;
  bool costFailure = false;
  @override
  Future<Map<String, dynamic>> report(
    String id, {
    Map<String, dynamic>? state,
    bool Function()? isCurrent,
  }) => loadEventReportInput(
    ownerId: service.ownerId,
    eventId: id,
    checkOwner: () {
      service.checkOwner();
      if (isCurrent != null && !isCurrent()) {
        throw StateError('Selection changed');
      }
    },
    readState: (id) async => state ?? await service.read(id),
    readBook: () async => {
      'revision': 1,
      'book': {
        'receipts': (gateway.sample['receipts'] as List)
            .map((r) => {'receipt': r})
            .toList(),
      },
    },
    readCosts: (ids) async {
      if (costFailure) throw StateError('Cost unavailable');
      return {
        'ownerId': service.ownerId,
        'snapshots': (gateway.sample['snapshots'] as List)
            .where((s) => ids.contains(s['receiptId']))
            .toList(),
      };
    },
  );
  @override
  Future<Map<String, dynamic>> history(
    String eventId, {
    String? beforeRevision,
    int limit = 50,
  }) async => validateEventHistory(
    {
      'version': 1,
      'ownerId': service.ownerId,
      'eventId': eventId,
      'rows': gateway.acks.values
          .toList()
          .reversed
          .map(
            (a) => {
              'requestId': a['requestId'],
              'revision': a['revision'],
              'createdAt': '2026-10-08T14:00:00Z',
              'operation': a['operation'],
              'before': [],
              'after': [],
            },
          )
          .toList(),
      'nextRevision': null,
    },
    service.ownerId,
    eventId,
    beforeRevision: beforeRevision,
    limit: limit,
  );
}

class Rig {
  Rig() {
    final file =
        jsonDecode(
              File('test/fixtures/event_report_v1.json').readAsStringSync(),
            )
            as Map;
    sample = Map<String, dynamic>.from(copy(file['cases'][0]['args']) as Map);
    gateway = Gateway(sample);
    service = EventService(gateway: gateway, store: store);
    reader = Reader(gateway, service);
  }
  late final Map<String, dynamic> sample;
  late final Gateway gateway;
  final store = Store();
  late final EventService service;
  late final Reader reader;
  final boundaryKey = GlobalKey();
  Widget app({bool allow = true, double scale = 1}) => MaterialApp(
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: child!,
    ),
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      fontFamily: Platform.environment['GROOKAI_EVENT_UI_RENDER'] == null
          ? null
          : 'EventVisual',
    ),
    home: RepaintBoundary(
      key: boundaryKey,
      child: Scaffold(
        body: EventReportsPanel(
          service: service,
          reader: reader,
          allowNewEdits: allow,
        ),
      ),
    ),
  );
  Future<void> capture(WidgetTester tester, String name) async {
    final out = Platform.environment['GROOKAI_EVENT_UI_RENDER'];
    if (out == null) return;
    await tester.pumpAndSettle();
    expect(
      RegExp(
        r'^C:/grookai_vault_operator_artifacts/product_event_closeout_20261008/native-visual-v[0-9]+$',
      ).hasMatch(out),
      isTrue,
    );
    await tester.runAsync(() async {
      final file = File('$out/$name.png');
      expect(await file.exists(), isFalse);
      await Directory(out).create(recursive: true);
      final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(boundaryKey),
          ),
          picture = await boundary.toImage(pixelRatio: 1);
      final bytes = await picture.toByteData(format: ui.ImageByteFormat.png);
      await file.writeAsBytes(bytes!.buffer.asUint8List());
      picture.dispose();
    });
  }

  Future<void> dispose() async {
    service.dispose();
    await gateway.changes.close();
  }
}

class ReportCart extends SalesCartService {
  ReportCart(this.rig);
  final Rig rig;
  @override
  Stream<void> get accountChanges => rig.gateway.ownerChanges.map((_) {});
  @override
  Future<Map<String, dynamic>> loadReportBook() async => {
    'receipts': (rig.sample['receipts'] as List)
        .map((receipt) => {'receipt': receipt})
        .toList(),
  };
  @override
  Future<SalesDeskData> load() =>
      throw StateError('Reports must not open a sales draft');
}

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.text(text);
  await tester.scrollUntilVisible(
    finder,
    220,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.tap(finder.first);
  await tester.pumpAndSettle();
}

Future<void> open(
  WidgetTester tester,
  Rig rig, {
  double width = 390,
  double scale = 1,
}) async {
  if (Platform.environment['GROOKAI_EVENT_UI_RENDER'] != null) {
    await tester.runAsync(() async {
      final font = Platform.environment['GROOKAI_EVENT_UI_FONT'];
      expect(font, isNotNull);
      await (FontLoader('EventVisual')..addFont(
            Future.value(ByteData.sublistView(File(font!).readAsBytesSync())),
          ))
          .load();
      await (FontLoader(
        'MaterialIcons',
      )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
    });
  }
  tester.view.physicalSize = Size(width, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(rig.app(scale: scale));
  await tester.pumpAndSettle();
  await tester.tap(find.byType(DropdownButtonFormField<String>).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Card show').last);
  await tester.pumpAndSettle();
}

Finder field(String label) => find.widgetWithText(TextField, label);
Future<void> tapButton(WidgetTester tester, Finder finder) async {
  await tester.pumpAndSettle();
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  for (final width in [320.0, 390.0, 768.0]) {
    testWidgets('partial cost closeout fits $width pixels', (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig, width: width);
      await rig.capture(tester, 'event-top-$width');
      await tester.scrollUntilVisible(
        find.text('Known-cost event subtotal'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text(r'$30.00'), findsOneWidget);
      expect(
        find.textContaining(r'$50.00 in item sales remains uncovered.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      expect(rig.gateway.sent, isEmpty);
      await rig.capture(tester, 'totals-$width');
    });
  }
  testWidgets(
    'zero expense amendment changes contribution and preserves reason',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig);
      await tapText(tester, 'Expenses');
      await tapText(tester, 'Amend Booth fee');
      await tester.scrollUntilVisible(
        field('Amount (USD)'),
        -220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(field('Amount (USD)'), '0.00');
      await tester.enterText(
        field('Reason for this change'),
        'Organizer waived the booth fee',
      );
      await tester.pumpAndSettle();
      await rig.capture(tester, 'amend-expense');
      await tapButton(
        tester,
        find.widgetWithText(FilledButton, 'Amend expense'),
      );
      expect(rig.gateway.sent.single['operation']['amountMinor'], '0');
      await tapText(tester, 'Totals');
      await tester.scrollUntilVisible(
        find.text('Known-cost event subtotal'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text(r'$40.00'), findsOneWidget);
    },
  );
  testWidgets(
    'lost response survives panel recreation and entry-off recovery',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig);
      rig.gateway.drop = true;
      await tapText(tester, 'Close event');
      await tester.scrollUntilVisible(
        field('Reason for this change'),
        -200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(field('Reason for this change'), 'Show complete');
      await tapButton(tester, find.widgetWithText(FilledButton, 'Close event'));
      expect(rig.store.row?['pending'], isNotNull);
      expect(rig.gateway.sent, hasLength(1));
      await tester.pumpWidget(const SizedBox());
      rig.gateway.state['entryEnabled'] = false;
      await tester.pumpWidget(rig.app(allow: false));
      await tester.pumpAndSettle();
      await tapText(tester, 'Check saved result');
      expect(rig.store.row?['pending'], isNull);
      expect(rig.gateway.sent, hasLength(1));
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create event'),
            )
            .onPressed,
        isNull,
      );
    },
  );
  testWidgets('cost read failure hides totals and retains expense access', (
    tester,
  ) async {
    final rig = Rig();
    addTearDown(rig.dispose);
    rig.reader.costFailure = true;
    await open(tester, rig);
    expect(find.text('Known-cost event subtotal'), findsNothing);
    await tapText(tester, 'Expenses');
    await tester.scrollUntilVisible(
      find.text('Booth fee'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Booth fee'), findsOneWidget);
    expect(rig.gateway.sent, isEmpty);
  });
  testWidgets('account switch clears private event fields', (tester) async {
    final rig = Rig();
    addTearDown(rig.dispose);
    await open(tester, rig);
    await tapText(tester, 'Edit details');
    rig.gateway.currentOwner = null;
    rig.gateway.changes.add(null);
    await tester.pumpAndSettle();
    expect(find.text('Your account changed. Reopen Reports.'), findsOneWidget);
    expect(field('Event name'), findsNothing);
    expect(find.text('Card show'), findsNothing);
  });
  testWidgets(
    'creating an event uses explicit time zone and leaves receipt membership alone',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig);
      final membership = jsonEncode(
        rig.gateway.state['selected']['assignments'],
      );
      await tapText(tester, 'Create event');
      await tester.enterText(field('Event name'), 'Denver weekend');
      await tester.enterText(field('Event time zone'), 'America/Denver');
      await tester.scrollUntilVisible(
        field('Start date'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(field('Start date'), '2026-10-10');
      await tester.enterText(field('End date'), '2026-10-11');
      await tapButton(
        tester,
        find.widgetWithText(FilledButton, 'Create event'),
      );
      expect(
        rig.gateway.sent.single['operation'],
        containsPair('timeZone', 'America/Denver'),
      );
      expect(
        jsonEncode(rig.gateway.state['selected']['assignments']),
        membership,
      );
      expect(find.text('Denver weekend'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'removing an assigned receipt changes contribution without changing receipt bytes',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig);
      final receipts = jsonEncode(rig.sample['receipts']);
      await tapText(tester, 'Receipts');
      final scope = find.byType(DropdownButtonFormField<String>).last;
      await tester.ensureVisible(scope);
      await tester.tap(scope);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Assigned to this event').last);
      await tester.pumpAndSettle();
      final row = find.byType(CheckboxListTile).first;
      await tester.scrollUntilVisible(
        row,
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(row);
      await tester.pumpAndSettle();
      await tapButton(
        tester,
        find.widgetWithText(OutlinedButton, 'Remove selected from event'),
      );
      expect(
        rig.gateway.sent.single['operation'],
        containsPair('eventId', null),
      );
      expect(jsonEncode(rig.sample['receipts']), receipts);
      expect(
        (rig.gateway.state['selected']['assignments'] as List).where(
          (r) => r['eventId'] == null,
        ),
        hasLength(1),
      );
    },
  );
  testWidgets(
    'stale expense proposal can be explicitly reviewed without losing its values',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig);
      rig.gateway.refuse = true;
      await tapText(tester, 'Expenses');
      await tapText(tester, 'Amend Booth fee');
      await tester.scrollUntilVisible(
        field('Amount (USD)'),
        180,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.enterText(field('Amount (USD)'), '12.34');
      await tester.enterText(
        field('Reason for this change'),
        'Receipt correction',
      );
      await tapButton(
        tester,
        find.widgetWithText(FilledButton, 'Amend expense'),
      );
      expect(rig.store.row?['rejection'], 'PT409');
      await tapButton(
        tester,
        find.widgetWithText(OutlinedButton, 'Review proposed edit'),
      );
      expect(rig.store.row?['pending'], isNull);
      expect(
        tester.widget<TextField>(field('Amount (USD)')).controller!.text,
        '12.34',
      );
      expect(
        tester
            .widget<TextField>(field('Reason for this change'))
            .controller!
            .text,
        'Receipt correction',
      );
      expect(rig.gateway.sent, hasLength(1));
    },
  );
  testWidgets('void expense remains visible and history survives refresh', (
    tester,
  ) async {
    final rig = Rig();
    addTearDown(rig.dispose);
    await open(tester, rig);
    await tapText(tester, 'Expenses');
    await tapText(tester, 'Void Booth fee');
    await tester.enterText(field('Reason for this change'), 'Duplicate charge');
    await tapButton(tester, find.widgetWithText(FilledButton, 'Void expense'));
    await tester.scrollUntilVisible(
      find.text('Booth fee · Voided'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Booth fee · Voided'), findsOneWidget);
    await tapButton(tester, find.widgetWithText(ChoiceChip, 'History'));
    await tester.scrollUntilVisible(
      find.text('Duplicate charge'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Duplicate charge'), findsOneWidget);
    await tapButton(
      tester,
      find.widgetWithText(OutlinedButton, 'Refresh events'),
    );
    await tester.scrollUntilVisible(
      find.text('Duplicate charge'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Duplicate charge'), findsOneWidget);
    expect(rig.gateway.sent, hasLength(1));
  });
  testWidgets(
    'Reports UI rollback retains a recovery entry and disables new event edits',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      rig.gateway.drop = true;
      await rig.service.begin(
        {
          'type': 'event_close',
          'eventId': rig.sample['eventId'],
          'reason': 'Show complete',
        },
        rig.gateway.state['revision'] as String,
        null,
      );
      expect(rig.store.row?['pending'], isNotNull);
      await tester.pumpWidget(
        MaterialApp(
          home: SalesReportsScreen(
            service: ReportCart(rig),
            eventService: rig.service,
            eventReader: rig.reader,
            eventsEnabled: false,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Saved event edit'));
      await tester.pumpAndSettle();
      await tapButton(
        tester,
        find.widgetWithText(OutlinedButton, 'Check saved result'),
      );
      expect(rig.store.row?['pending'], isNull);
      expect(rig.gateway.sent, hasLength(1));
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Create event'),
            )
            .onPressed,
        isNull,
      );
    },
  );
  testWidgets(
    'large phone text keeps event totals and metadata controls usable',
    (tester) async {
      final rig = Rig();
      addTearDown(rig.dispose);
      await open(tester, rig, scale: 2);
      await rig.capture(tester, 'event-top-large-text');
      await tester.scrollUntilVisible(
        find.text('Known-cost event subtotal'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.text(r'$30.00'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await rig.capture(tester, 'totals-large-text');
    },
  );
}
