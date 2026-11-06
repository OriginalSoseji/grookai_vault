import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/intake/intake_screens.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';

final client = SupabaseClient(
  'http://127.0.0.1:54321',
  'fixture-key',
  authOptions: const AuthClientOptions(autoRefreshToken: false),
);

class LotService extends IntakeService {
  LotService({this.commitFirst = true, PurchaseLot? initial}) : super(client) {
    if (initial != null) records[initial.id] = initial;
  }
  final bool commitFirst;
  final records = <String, PurchaseLot>{};
  final requests = <PurchaseLot>[];
  int reads = 0;
  @override
  Future<List<PurchaseLot>> lots() async {
    reads++;
    return records.values.toList();
  }

  @override
  Future<PurchaseLot> saveLot(PurchaseLot lot) async {
    requests.add(PurchaseLot.fromJson(lot.toJson()));
    if (requests.length == 1 && !commitFirst) {
      throw StateError(IntakeService.connectionMessage);
    }
    final previous = records[lot.id];
    if (previous != null && previous.revision != lot.revision) {
      throw StateError('Revision conflict');
    }
    final saved = PurchaseLot.fromJson(lot.toJson())
      ..revision = previous == null ? 0 : previous.revision + 1;
    records[lot.id] = saved;
    if (requests.length == 1) throw StateError(IntakeService.connectionMessage);
    return saved;
  }
}

Future<void> openEditor(
  WidgetTester tester,
  LotService service, {
  PurchaseLot? lot,
  required ValueChanged<PurchaseLot?> result,
}) async {
  tester.view.physicalSize = const Size(800, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async => result(
              await Navigator.of(context).push<PurchaseLot>(
                MaterialPageRoute(
                  builder: (_) => PurchaseLotEditor(service: service, lot: lot),
                ),
              ),
            ),
            child: const Text('Open editor'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open editor'));
  await tester.pumpAndSettle();
}

Future<void> save(WidgetTester tester) async {
  final button = find.text('Save purchase lot');
  await tester.ensureVisible(button);
  await tester.tap(button);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'lost creation response recovers one lot without a second write',
    (tester) async {
      final service = LotService();
      PurchaseLot? result;
      await openEditor(tester, service, result: (value) => result = value);
      await tester.enterText(
        find.widgetWithText(TextField, 'Lot name'),
        'Recovery lot',
      );
      await save(tester);
      expect(service.records, hasLength(1));
      expect(result, isNull);
      await save(tester);
      expect(service.requests, hasLength(1));
      expect(service.reads, 1);
      expect(result?.id, service.requests.single.id);
      expect(service.records, hasLength(1));
    },
  );

  testWidgets('failed creation retries with the original identity', (
    tester,
  ) async {
    final service = LotService(commitFirst: false);
    PurchaseLot? result;
    await openEditor(tester, service, result: (value) => result = value);
    await save(tester);
    expect(service.records, isEmpty);
    await save(tester);
    expect(service.requests, hasLength(2));
    expect(service.requests[0].id, service.requests[1].id);
    expect(service.records, hasLength(1));
    expect(result?.id, service.requests.first.id);
  });

  testWidgets('edits after an uncertain update use the recovered revision', (
    tester,
  ) async {
    final initial = PurchaseLot(
      id: 'existing-lot',
      name: 'Purchase',
      revision: 4,
    );
    final service = LotService(initial: initial);
    PurchaseLot? result;
    await openEditor(
      tester,
      service,
      lot: initial,
      result: (value) => result = value,
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Lot name'),
      'First edit',
    );
    await save(tester);
    expect(service.records[initial.id]?.revision, 5);
    final field = find.widgetWithText(TextField, 'Lot name');
    await tester.ensureVisible(field);
    await tester.enterText(field, 'Second edit');
    await save(tester);
    expect(service.requests.map((value) => value.revision), [4, 5]);
    expect(service.requests.map((value) => value.id).toSet(), {initial.id});
    expect(result?.name, 'Second edit');
    expect(result?.revision, 6);
  });

  testWidgets(
    'conflicting remote edits preserve the form and never overwrite',
    (tester) async {
      final service = LotService();
      PurchaseLot? result;
      await openEditor(tester, service, result: (value) => result = value);
      await tester.enterText(
        find.widgetWithText(TextField, 'Lot name'),
        'My lot',
      );
      await save(tester);
      final id = service.requests.single.id;
      service.records[id] = PurchaseLot(
        id: id,
        name: 'Other device edit',
        revision: 2,
      );
      await save(tester);
      expect(result, isNull);
      expect(service.requests, hasLength(1));
      expect(service.records[id]?.name, 'Other device edit');
      expect(
        find.text(
          'This lot changed on another device. Refresh it before saving.',
        ),
        findsOneWidget,
      );
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Lot name'))
            .controller
            ?.text,
        'My lot',
      );
    },
  );
}
