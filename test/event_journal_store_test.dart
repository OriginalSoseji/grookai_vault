import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:grookai_vault/services/sales/event_journal_store.dart';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const one = '11111111-1111-4111-8111-111111111111',
    two = '22222222-2222-4222-8222-222222222222',
    three = '33333333-3333-4333-8333-333333333333',
    four = '44444444-4444-4444-8444-444444444444';
void main() {
  sqfliteFfiInit();
  final fixture =
      jsonDecode(File('test/fixtures/event_journal_v1.json').readAsStringSync())
          as Map;
  Map<String, dynamic> request() => Map<String, dynamic>.from(
    jsonDecode(jsonEncode(fixture['cases'][0]['change']['request'])) as Map,
  );
  Map<String, dynamic> change(
    String action,
    String? previous,
    String next, [
    Map<String, dynamic> extra = const {},
  ]) => {
    'ownerId': owner,
    'expectedLocalRevision': previous,
    'nextLocalRevision': next,
    'action': action,
    ...extra,
  };
  Map<String, dynamic> acknowledgement(Map r) => {
    'version': 1,
    'ownerId': owner,
    'requestId': r['requestId'],
    'previousRevision': r['expectedRevision'],
    'revision': '${BigInt.parse(r['expectedRevision'] as String) + BigInt.one}',
    'operation': r['operation'],
  };
  late Directory directory;
  late Database db;
  late SqliteEventJournalStore store;
  late List<Database> connections;
  var allowed = true;
  Future<Database> connect() async {
    final database = await databaseFactoryFfi.openDatabase(
      '${directory.path}${Platform.pathSeparator}events.db',
      options: OpenDatabaseOptions(
        version: 1,
        singleInstance: false,
        onConfigure: (d) => d.execute('PRAGMA synchronous = FULL'),
        onCreate: SqliteEventJournalStore.createSchema,
      ),
    );
    connections.add(database);
    return database;
  }

  SqliteEventJournalStore scoped(Database database, [String account = owner]) =>
      SqliteEventJournalStore(
        ownerId: account,
        checkOwner: () {
          if (!allowed) throw StateError('Account changed');
        },
        database: Future.value(database),
      );
  setUp(() async {
    directory = await Directory.systemTemp.createTemp(
      'grookai-events-journal-',
    );
    connections = [];
    allowed = true;
    db = await connect();
    store = scoped(db);
  });
  tearDown(() async {
    for (final database in connections) {
      if (database.isOpen) await database.close();
    }
    expect(directory.absolute.parent.path, Directory.systemTemp.absolute.path);
    expect(
      directory.path.split(Platform.pathSeparator).last,
      startsWith('grookai-events-journal-'),
    );
    await directory.delete(recursive: true);
  });
  test('complete pending request survives database close and reopen', () async {
    final r = request(),
        saved = await store.change(change('stage', null, one, {'request': r}));
    expect((await db.rawQuery('PRAGMA synchronous')).single.values.single, 2);
    await db.close();
    final reopened = scoped(await connect());
    expect(await reopened.read(), saved);
    expect((await reopened.read())!['pending'], r);
    expect(await scoped(connections.last, two).read(), null);
  });
  test('competing editors cannot overwrite a pending request', () async {
    final other = scoped(await connect()),
        a = request(),
        b = request()..['requestId'] = four;
    final results = await Future.wait([
      store
          .change(change('stage', null, one, {'request': a}))
          .then((_) => true, onError: (_) => false),
      other
          .change(change('stage', null, two, {'request': b}))
          .then((_) => true, onError: (_) => false),
    ]);
    expect(results.where((v) => v).length, 1);
    final saved = await store.read();
    expect(saved!['pending'], anyOf(equals(a), equals(b)));
  });
  test(
    'caller mutation during storage await cannot change the wire request',
    () async {
      final r = request(),
          before = jsonEncode(r),
          saving = store.change(change('stage', null, one, {'request': r}));
      r['operation']['name'] = 'Changed after click';
      await saving;
      expect(jsonEncode((await store.read())!['pending']), before);
    },
  );
  test('local acknowledgement write failure retains pending request', () async {
    final r = request(),
        saved = await store.change(change('stage', null, one, {'request': r}));
    await db.execute(
      "CREATE TRIGGER simulate_storage_failure BEFORE UPDATE ON event_edits BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END",
    );
    await expectLater(
      store.change(
        change('acknowledge', one, two, {
          'request': r,
          'acknowledgement': acknowledgement(r),
        }),
      ),
      throwsA(anything),
    );
    expect(await store.read(), saved);
    await db.execute('DROP TRIGGER simulate_storage_failure');
    await store.change(
      change('acknowledge', one, two, {
        'request': r,
        'acknowledgement': acknowledgement(r),
      }),
    );
    expect((await store.read())!['pending'], null);
  });
  test('uncertain transport cannot authorize dropping the request', () async {
    final r = request(),
        saved = await store.change(change('stage', null, one, {'request': r}));
    await expectLater(
      store.change(
        change('reject', one, two, {'request': r, 'code': 'NETWORK'}),
      ),
      throwsA(anything),
    );
    await expectLater(
      store.change(change('discardRejected', one, two)),
      throwsA(anything),
    );
    expect(await store.read(), saved);
  });
  test('late acknowledgement cannot erase a newer pending request', () async {
    final r = request();
    await store.change(change('stage', null, one, {'request': r}));
    await store.change(
      change('reject', one, two, {'request': r, 'code': 'PT409'}),
    );
    await store.change(change('discardRejected', two, three));
    final next = request()..['requestId'] = four;
    final saved = await store.change(
      change('stage', three, four, {'request': next}),
    );
    await expectLater(
      store.change(
        change('acknowledge', one, two, {
          'request': r,
          'acknowledgement': acknowledgement(r),
        }),
      ),
      throwsA(anything),
    );
    expect(await store.read(), saved);
  });
  test(
    'account changes invalidate late reads without deleting old pending data',
    () async {
      final saved = await store.change(
            change('stage', null, one, {'request': request()}),
          ),
          reading = store.read();
      allowed = false;
      await expectLater(reading, throwsStateError);
      allowed = true;
      expect(await store.read(), saved);
    },
  );
  test('corrupt stored payload is preserved for recovery', () async {
    await store.change(change('stage', null, one, {'request': request()}));
    await db.update(
      'event_edits',
      {'payload': 'not JSON'},
      where: 'owner_id = ?',
      whereArgs: [owner],
    );
    await expectLater(store.read(), throwsA(anything));
    expect((await db.query('event_edits')).single['payload'], 'not JSON');
  });
}
