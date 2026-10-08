import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/cost_correction_service.dart';
import 'package:grookai_vault/services/sales/cost_correction_journal.dart';
import 'package:grookai_vault/services/sales/cost_correction_journal_store.dart';

class _Store implements CostCorrectionJournalStore {
  Map<String, dynamic>? row;
  bool failStage = false, failAck = false;
  @override
  Future<Map<String, dynamic>?> read() async => row == null
      ? null
      : Map<String, dynamic>.from(jsonDecode(jsonEncode(row)) as Map);
  @override
  Future<Map<String, dynamic>> change(Map<String, dynamic> c) async {
    if (c['action'] == 'stage' && failStage ||
        c['action'] == 'acknowledge' && failAck) {
      throw StateError('Disk full');
    }
    row = changeCostCorrectionJournal(row, c);
    return (await read())!;
  }
}

class _Gateway implements CostCorrectionGateway {
  _Gateway(this.ownerId, this.result, this.state);
  @override
  String? ownerId;
  final Map<String, dynamic> result, state;
  final changes = StreamController<String?>.broadcast(sync: true);
  @override
  Stream<String?> get ownerChanges => changes.stream;
  Object? outcome;
  bool loseResponse = false, reject = false, enabled = true, partial = false;
  int applies = 0;
  Completer<Object?>? delayed;
  @override
  Future<Object?> available() async => enabled;
  @override
  Future<Object?> read(List<String> ids) async => partial ? [] : [state];
  @override
  Future<Object?> history(
    String receiptId,
    int lineIndex,
    String? beforeRevision,
  ) async => [result];
  @override
  Future<Object?> recover(Map<String, dynamic> request) async =>
      delayed == null ? outcome : await delayed!.future;
  @override
  Future<Object?> apply(Map<String, dynamic> request) async {
    applies++;
    if (reject) throw StateError('Stale');
    outcome = result;
    if (loseResponse) throw StateError('Response lost');
    return outcome;
  }

  @override
  Future<Object?> cancel(Map<String, dynamic> request) async {
    outcome ??= {
      ...result,
      'status': 'cancelled',
      'revision': null,
      'source': null,
    };
    return outcome;
  }
}

void main() {
  final fixture =
      jsonDecode(
            File(
              'test/fixtures/sale_cost_corrections_v1.json',
            ).readAsStringSync(),
          )
          as Map;
  late _Store store;
  late _Gateway gateway;
  late Map<String, dynamic> request;
  var sequence = 0;
  CostCorrectionService make() => CostCorrectionService(
    gateway: gateway,
    store: store,
    newId: () =>
        'e1000000-0000-4000-8000-${(++sequence).toString().padLeft(12, '0')}',
  );
  setUp(() {
    final f = jsonDecode(jsonEncode(fixture['profits'][0])) as Map;
    store = _Store();
    gateway = _Gateway(
      fixture['ownerId'] as String,
      Map<String, dynamic>.from(f['outcome'] as Map),
      Map<String, dynamic>.from(f['state'] as Map),
    );
    request = Map<String, dynamic>.from(gateway.result['request'] as Map);
    sequence = 0;
  });
  tearDown(() async {
    await gateway.changes.close();
  });
  test(
    'lost commit response survives restart and entry-off recovery without another apply',
    () async {
      final first = make();
      gateway.loseResponse = true;
      expect((await first.begin(request, null)).status, 'unconfirmed');
      final bytes = jsonEncode(store.row!['pending']);
      first.dispose();
      gateway.enabled = false;
      final next = make();
      expect(await next.available(), false);
      expect((await next.recover()).status, 'applied');
      expect(gateway.applies, 1);
      expect(bytes, jsonEncode(request));
      expect(store.row!['pending'], null);
      next.dispose();
    },
  );
  test(
    'null read and rejected correction remain pending until cancellation',
    () async {
      final service = make();
      gateway.reject = true;
      expect((await service.begin(request, null)).status, 'unconfirmed');
      expect((await service.recover()).status, 'unconfirmed');
      expect(store.row!['pending'], request);
      expect((await service.cancel()).status, 'cancelled');
      expect(store.row!['pending'], null);
      service.dispose();
    },
  );
  test(
    'storage failure prevents mutation and acknowledgement storage failure is recoverable',
    () async {
      final service = make();
      store.failStage = true;
      await expectLater(service.begin(request, null), throwsStateError);
      expect(gateway.applies, 0);
      store.failStage = false;
      store.failAck = true;
      expect((await service.begin(request, null)).status, 'unconfirmed');
      expect(store.row!['pending'], request);
      store.failAck = false;
      expect((await service.recover()).status, 'applied');
      expect(gateway.applies, 1);
      service.dispose();
    },
  );
  test(
    'late response after account change preserves owner journal and prevents apply',
    () async {
      final service = make();
      gateway.delayed = Completer<Object?>();
      final pending = service.begin(request, null);
      await Future<void>.delayed(Duration.zero);
      gateway.ownerId = 'd1000000-0000-4000-8000-000000000002';
      gateway.changes.add(gateway.ownerId);
      gateway.delayed!.complete(null);
      await expectLater(pending, throwsStateError);
      expect(gateway.applies, 0);
      expect(store.row!['pending'], request);
      service.dispose();
    },
  );
  test('private report reads fail on partial data and aliases', () async {
    final service = make(), id = gateway.state['receiptId'] as String;
    expect((await service.read([id])).length, 1);
    gateway.partial = true;
    await expectLater(service.read([id]), throwsFormatException);
    await expectLater(
      service.read([id, id.toUpperCase()]),
      throwsFormatException,
    );
    expect(await service.read([]), isEmpty);
    service.dispose();
  });
}
