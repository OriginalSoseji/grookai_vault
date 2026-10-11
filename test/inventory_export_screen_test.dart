import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/account/inventory_export_screen.dart';
import 'package:grookai_vault/services/vault/inventory_export.dart';
import 'package:grookai_vault/services/vault/inventory_export_service.dart';

class FakeExportService implements InventoryExportService {
  FakeExportService(this.ownerId, this.snapshot);
  @override
  String? ownerId;
  InventoryExport snapshot;
  Object? failure;
  Completer<InventoryExport>? pending;
  int reads = 0;
  final changes = StreamController<String?>.broadcast(sync: true);
  @override
  SupabaseClient get client => throw UnimplementedError();
  @override
  Stream<String?> get ownerChanges => changes.stream;
  @override
  Future<InventoryExport> read(String expectedOwner) async {
    reads += 1;
    if (failure != null) throw failure!;
    return pending?.future ?? snapshot;
  }

  void change(String? owner) {
    ownerId = owner;
    changes.add(owner);
  }
}

void main() {
  final corpus = jsonDecode(
    File('test/fixtures/inventory_export_cases.json').readAsStringSync(),
  );
  final owner = corpus['ownerId'] as String;
  final snapshot = InventoryExport.parse(owner, corpus['cases'][0]['document']);
  late FakeExportService service;
  setUp(() => service = FakeExportService(owner, snapshot));
  tearDown(() => service.changes.close());
  Future<void> open(WidgetTester tester, {InventoryFileSaver? save}) async {
    await tester.pumpWidget(
      MaterialApp(
        home: InventoryExportScreen(service: service, saveFile: save),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> prepare(WidgetTester tester) async {
    await tester.scrollUntilVisible(
      find.text('Prepare export'),
      120,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Prepare export'));
    await tester.pumpAndSettle();
  }

  testWidgets(
    'explicit preparation creates both formats from one complete read',
    (tester) async {
      final files = <String, Uint8List>{};
      await open(
        tester,
        save: (name, bytes) async {
          files[name] = bytes;
          return true;
        },
      );
      expect(service.reads, 0);
      await prepare(tester);
      expect(find.text('4 copies ready'), findsOneWidget);
      expect(find.text('Cards: 2 · Slabs: 1 · Sealed: 1'), findsOneWidget);
      await tester.ensureVisible(find.text('Save JSON'));
      await tester.tap(find.text('Save JSON'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save CSV'));
      await tester.pumpAndSettle();
      expect(service.reads, 1);
      expect(files.length, 2);
      expect(
        jsonDecode(utf8.decode(files[snapshot.fileName('json')]!)),
        snapshot.document,
      );
      expect(
        files[snapshot.fileName('csv')]!,
        utf8.encode(snapshot.toCsvString()),
      );
    },
  );
  testWidgets('failed read has no download and retry retains exact values', (
    tester,
  ) async {
    service.failure = Exception('private backend detail');
    await open(tester);
    await prepare(tester);
    expect(find.text('Save JSON'), findsNothing);
    expect(find.textContaining('private backend'), findsNothing);
    service.failure = null;
    await prepare(tester);
    expect(find.text('4 copies ready'), findsOneWidget);
  });
  testWidgets('account A to B to A invalidates delayed response permanently', (
    tester,
  ) async {
    service.pending = Completer<InventoryExport>();
    await open(tester);
    await tester.tap(find.text('Prepare export'));
    await tester.pump();
    service.change('10000000-0000-0000-0000-000000000002');
    service.change(owner);
    service.pending!.complete(snapshot);
    await tester.pumpAndSettle();
    expect(find.textContaining('Your account changed'), findsOneWidget);
    expect(find.text('4 copies ready'), findsNothing);
    expect(find.text('Save JSON'), findsNothing);
  });
  testWidgets('account replacement clears ready snapshot before save', (
    tester,
  ) async {
    var saves = 0;
    await open(
      tester,
      save: (_, _) async {
        saves += 1;
        return true;
      },
    );
    await prepare(tester);
    service.change(null);
    await tester.pumpAndSettle();
    expect(find.text('Save JSON'), findsNothing);
    expect(saves, 0);
  });
  testWidgets('disposal rejects late result', (tester) async {
    service.pending = Completer<InventoryExport>();
    await open(tester);
    await tester.tap(find.text('Prepare export'));
    await tester.pump();
    await tester.pumpWidget(const MaterialApp(home: Text('Other screen')));
    service.pending!.complete(snapshot);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
  testWidgets('save cancellation keeps the prepared snapshot available', (
    tester,
  ) async {
    await open(tester, save: (_, _) async => false);
    await prepare(tester);
    await tester.ensureVisible(find.text('Save JSON'));
    await tester.tap(find.text('Save JSON'));
    await tester.pumpAndSettle();
    expect(find.text('Save cancelled.'), findsOneWidget);
    expect(find.text('4 copies ready'), findsOneWidget);
  });
  testWidgets(
    'late save completion cannot restore content after account change',
    (tester) async {
      final pending = Completer<bool>();
      await open(tester, save: (_, _) => pending.future);
      await prepare(tester);
      await tester.ensureVisible(find.text('Save JSON'));
      await tester.tap(find.text('Save JSON'));
      await tester.pump();
      service.change(null);
      pending.complete(true);
      await tester.pumpAndSettle();
      expect(find.text('Inventory file saved.'), findsNothing);
      expect(find.text('4 copies ready'), findsNothing);
    },
  );
  testWidgets('compact enlarged text keeps export controls reachable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        builder: (_, child) => MediaQuery(
          data: const MediaQueryData(
            size: Size(320, 640),
            textScaler: TextScaler.linear(1.5),
          ),
          child: child!,
        ),
        home: InventoryExportScreen(
          service: service,
          saveFile: (_, _) async => true,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await prepare(tester);
    await tester.scrollUntilVisible(
      find.text('Save JSON'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Save JSON'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
