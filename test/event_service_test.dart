import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/event_service.dart';
import 'package:grookai_vault/services/sales/event_journal.dart';
import 'package:grookai_vault/services/sales/event_journal_store.dart';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
dynamic copy(dynamic v) => jsonDecode(jsonEncode(v));

class MemoryStore implements EventJournalStore {
  Map<String, dynamic>? row;
  String? failAction;
  @override
  Future<Map<String, dynamic>?> read() async =>
      row == null ? null : Map<String, dynamic>.from(copy(row) as Map);
  @override
  Future<Map<String, dynamic>> change(Map<String, dynamic> change) async {
    if (change['action'] == failAction) throw StateError('Storage full');
    row = changeEventJournal(row, change);
    return Map<String, dynamic>.from(copy(row) as Map);
  }
}

class FakeGateway implements EventGateway {
  String? currentOwner = owner;
  String mode = 'ok';
  final changes = StreamController<String?>.broadcast(sync: true),
      results = <String, Map<String, dynamic>>{},
      sent = <Map<String, dynamic>>[];
  Future<void> Function()? afterCommit;
  Completer<void>? recoveryGate;
  @override
  String? get ownerId => currentOwner;
  @override
  Stream<String?> get ownerChanges => changes.stream;
  void switchOwner(String? value) {
    currentOwner = value;
    changes.add(value);
  }

  @override
  Future<Object?> read(String? eventId) async => throw StateError('Unused');
  @override
  Future<Object?> recover(String requestId) async {
    if (recoveryGate != null) await recoveryGate!.future;
    if (mode == 'readFail') throw StateError('Network');
    return copy(results[requestId]);
  }

  @override
  Future<Object?> mutate(Map<String, dynamic> request) async {
    sent.add(Map<String, dynamic>.from(copy(request) as Map));
    if (mode == 'beforeDrop') throw StateError('Network');
    if (mode == 'refuse') throw const EventRpcError('PT409', definitive: true);
    if (mode == 'fakeConflict') throw const EventRpcError('PT409');
    final ack = {
      'version': 1,
      'ownerId': owner,
      'requestId': request['requestId'],
      'previousRevision': request['expectedRevision'],
      'revision':
          '${BigInt.parse(request['expectedRevision'] as String) + BigInt.one}',
      'operation': copy(request['operation']),
    };
    results[request['requestId'] as String] = ack;
    if (afterCommit != null) await afterCommit!();
    if (mode == 'afterDrop') throw StateError('Network');
    if (mode == 'badAck') return {...ack, 'revision': '999'};
    return copy(ack);
  }
}

class Rig {
  final gateway = FakeGateway(),
      store = MemoryStore(),
      services = <EventService>[];
  int sequence = 0;
  EventService service() {
    final s = EventService(
      gateway: gateway,
      store: store,
      newId: () =>
          '${(++sequence).toRadixString(16).padLeft(8, '0')}-1111-4111-8111-111111111111',
    );
    services.add(s);
    return s;
  }

  Future<void> close() async {
    for (final s in services) {
      s.dispose();
    }
    await gateway.changes.close();
  }
}

void main() {
  final request =
          (jsonDecode(
                    File(
                      'test/fixtures/vendor_events_v1.json',
                    ).readAsStringSync(),
                  )
                  as Map)['requestCases'][0]['request']
              as Map,
      operation = Map<String, dynamic>.from(request['operation'] as Map);
  late Rig x;
  setUp(() => x = Rig());
  tearDown(() => x.close());
  test('journal persistence finishes before a request can be sent', () async {
    final s = x.service();
    x.store.failAction = 'stage';
    await expectLater(s.begin(operation, '0', null), throwsStateError);
    expect(x.gateway.sent, isEmpty);
    expect(x.store.row, null);
  });
  test(
    'lost response recovers after restart without a second mutation',
    () async {
      var s = x.service();
      x.gateway.mode = 'afterDrop';
      expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
      final pending = copy(x.store.row!['pending']);
      s.dispose();
      s = x.service();
      x.gateway.mode = 'refuse';
      expect((await s.recover()).status, 'saved');
      expect(x.gateway.sent, [pending]);
      expect(x.store.row!['pending'], null);
    },
  );
  test('uncommitted request retries exactly the stored payload', () async {
    final s = x.service();
    x.gateway.mode = 'beforeDrop';
    expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
    final pending = copy(x.store.row!['pending']);
    expect((await s.recover(sendIfMissing: false)).status, 'unconfirmed');
    expect(x.gateway.sent.length, 1);
    x.gateway.mode = 'ok';
    expect((await s.recover()).status, 'saved');
    expect(x.gateway.sent, [pending, pending]);
  });
  test('failed recovery read does not send a speculative mutation', () async {
    final s = x.service();
    x.gateway.mode = 'readFail';
    expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
    expect(x.gateway.sent, isEmpty);
    expect(x.store.row!['pending'], isNotNull);
  });
  test('local acknowledgement failure retains exact pending payload', () async {
    final s = x.service();
    x.store.failAction = 'acknowledge';
    expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
    final pending = copy(x.store.row!['pending']);
    x.store.failAction = null;
    expect((await s.recover()).status, 'saved');
    expect(x.gateway.sent, [pending]);
  });
  test('malformed acknowledgement cannot clear a pending request', () async {
    final s = x.service();
    x.gateway.mode = 'badAck';
    expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
    expect(x.store.row!['pending'], isNotNull);
    expect((await s.recover()).status, 'saved');
    expect(x.gateway.sent.length, 1);
  });
  test('conflict retains proposal until explicit discard', () async {
    final s = x.service();
    x.gateway.mode = 'refuse';
    expect((await s.begin(operation, '0', null)).status, 'rejected');
    final saved = copy(x.store.row) as Map;
    expect(saved['rejection'], 'PT409');
    await expectLater(
      s.begin(operation, '1', saved['localRevision'] as String),
      throwsA(anything),
    );
    expect(x.store.row, saved);
    await s.discardRejected(saved['localRevision'] as String);
    expect(x.store.row!['pending'], null);
  });
  test('transport-shaped conflict remains uncertain', () async {
    final s = x.service();
    x.gateway.mode = 'fakeConflict';
    expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
    expect(x.store.row!['rejection'], null);
    await expectLater(
      s.discardRejected(x.store.row!['localRevision'] as String),
      throwsA(anything),
    );
  });
  test('failed rejection write remains uncertain', () async {
    final s = x.service();
    x.gateway.mode = 'refuse';
    x.store.failAction = 'reject';
    expect((await s.begin(operation, '0', null)).status, 'unconfirmed');
    expect(x.store.row!['rejection'], null);
  });
  test(
    'account switch and switch-back permanently invalidate late completion',
    () async {
      final s = x.service(),
          entered = Completer<void>(),
          release = Completer<void>();
      x.gateway.afterCommit = () async {
        entered.complete();
        await release.future;
      };
      final saving = s.begin(operation, '0', null);
      await entered.future;
      x.gateway.switchOwner(null);
      x.gateway.switchOwner(owner);
      release.complete();
      await expectLater(saving, throwsStateError);
      expect(x.store.row!['pending'], isNotNull);
    },
  );
  test('overlapping saves cannot replace the first pending request', () async {
    final s = x.service();
    x.gateway.recoveryGate = Completer<void>();
    final saving = s.begin(operation, '0', null);
    await expectLater(s.begin(operation, '0', null), throwsStateError);
    x.gateway.recoveryGate!.complete();
    expect((await saving).status, 'saved');
    expect(x.gateway.sent.length, 1);
  });
}
