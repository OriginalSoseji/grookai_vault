import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:grookai_vault/services/vault/copy_cost_journal.dart';
import 'package:grookai_vault/services/vault/copy_cost_models.dart';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '44444444-4444-4444-8444-444444444444';
const instance = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';

CopyCostDraft proposal({String account = owner, String copy = instance}) =>
    CopyCostDraft.create(
      ownerId: account,
      instanceId: copy,
      gvviId: 'GVVI-TEST',
      title: 'Private example',
      cost: const CopyCostEvidence(
        amount: null,
        currency: null,
        minor: null,
        status: 'missing_amount',
      ),
    ).withValues({'amountText': '12.00', 'currencyText': 'USD'});

CopyCostDraft prepare(CopyCostDraft draft) => draft.withValues({
  'pending': CopyCostRequest(
    ownerId: draft.ownerId,
    requestId: requestId,
    instanceId: draft.instanceId,
    expectedAmount: null,
    expectedCurrency: null,
    amount: '12.00',
    currency: 'USD',
  ).toJson(),
});

void main() {
  sqfliteFfiInit();
  late Directory directory;
  late Database database;
  late SqliteCopyCostStore store;
  late List<Database> connections;
  var allowed = true;
  Future<Database> connect() async {
    final db = await databaseFactoryFfi.openDatabase(
      '${directory.path}${Platform.pathSeparator}cost.db',
      options: OpenDatabaseOptions(
        version: 1,
        singleInstance: false,
        onConfigure: (db) => db.execute('PRAGMA synchronous = FULL'),
        onCreate: SqliteCopyCostStore.createSchema,
      ),
    );
    connections.add(db);
    return db;
  }

  SqliteCopyCostStore scoped(Database db, [String account = owner]) =>
      SqliteCopyCostStore(
        ownerId: account,
        checkOwner: () {
          if (!allowed) throw StateError('Account changed');
        },
        database: Future.value(db),
      );

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('grookai-cost-journal-');
    connections = [];
    allowed = true;
    database = await connect();
    store = scoped(database);
  });
  tearDown(() async {
    for (final db in connections) {
      if (db.isOpen) await db.close();
    }
    // This directory is uniquely created by this test and contains no app data.
    expect(directory.absolute.parent.path, Directory.systemTemp.absolute.path);
    await directory.delete(recursive: true);
  });

  test('complete pending request survives close and reopen', () async {
    final saved = await store.save(prepare(proposal()));
    expect(
      (await database.rawQuery('PRAGMA synchronous')).single.values.single,
      2,
    );
    await database.close();
    final reopened = scoped(await connect());
    expect((await reopened.read(instance))!.toJson(), saved.toJson());
    expect(await reopened.pendingCount(), 1);
    expect(
      (await reopened.pending()).single.pending!.rpcParams,
      saved.pending!.rpcParams,
    );
  });

  test(
    'separate connections reject a stale revision without overwriting',
    () async {
      final saved = await store.save(proposal());
      final second = scoped(await connect());
      final stale = (await second.read(instance))!;
      final updated = await store.save(saved.withValues({'amountText': '14'}));
      await expectLater(
        second.save(stale.withValues({'amountText': '999'})),
        throwsStateError,
      );
      expect((await second.read(instance))!.toJson(), updated.toJson());
    },
  );

  test('concurrent screens have only one revision winner', () async {
    final saved = await store.save(proposal());
    final second = scoped(database);
    final outcomes = await Future.wait([
      store
          .save(saved.withValues({'amountText': '14'}))
          .then<Object>((v) => v, onError: (Object e) => e),
      second
          .save(saved.withValues({'amountText': '15'}))
          .then<Object>((v) => v, onError: (Object e) => e),
    ]);
    expect(outcomes.whereType<CopyCostDraft>(), hasLength(1));
    expect(outcomes.whereType<StateError>(), hasLength(1));
    expect((await store.read(instance))!.revision, 2);
  });

  test(
    'pending request cannot be replaced, changed or silently cleared',
    () async {
      final saved = await store.save(prepare(proposal()));
      for (final values in [
        {
          'pending': {...saved.pending!.toJson(), 'requestId': other},
        },
        {
          'pending': {...saved.pending!.toJson(), 'amount': '13.00'},
        },
        {'pending': null},
      ]) {
        await expectLater(
          store.save(saved.withValues(values)),
          throwsStateError,
        );
        expect((await store.read(instance))!.toJson(), saved.toJson());
      }
      final resolved = await store.save(
        saved.withValues({'pending': null}),
        resolving: saved.pending,
      );
      expect(resolved.pending, isNull);
      expect(await store.pendingCount(), 0);
    },
  );

  test('wrong acknowledgment cannot clear pending evidence', () async {
    final saved = await store.save(prepare(proposal()));
    final wrong = CopyCostRequest.fromJson({
      ...saved.pending!.toJson(),
      'requestId': other,
    });
    await expectLater(
      store.save(saved.withValues({'pending': null}), resolving: wrong),
      throwsStateError,
    );
    expect((await store.read(instance))!.toJson(), saved.toJson());
  });

  test('owners stay isolated even for the same copy key', () async {
    final otherStore = scoped(database, other);
    await store.save(prepare(proposal()));
    expect(await otherStore.read(instance), isNull);
    expect(await otherStore.pending(), isEmpty);
    expect(await otherStore.pendingCount(), 0);
    final privateOther = await otherStore.save(proposal(account: other));
    await expectLater(store.save(privateOther), throwsStateError);
    expect((await store.read(instance))!.pending, isNotNull);
    expect((await otherStore.read(instance))!.pending, isNull);
  });

  test(
    'pending paging covers all records without leaking another owner',
    () async {
      for (var i = 1; i <= 53; i++) {
        final id = '22222222-2222-4222-8222-${i.toString().padLeft(12, '0')}';
        await store.save(prepare(proposal(copy: id)));
      }
      await scoped(database, other).save(prepare(proposal(account: other)));
      expect(await store.pendingCount(), 53);
      final first = await store.pending();
      final next = await store.pending(after: first.last.instanceId);
      expect(first, hasLength(50));
      expect(next, hasLength(3));
      expect({
        ...first.map((d) => d.instanceId),
        ...next.map((d) => d.instanceId),
      }, hasLength(53));
      await expectLater(store.pending(limit: 101), throwsArgumentError);
    },
  );

  test('SQL failure rolls back and retains prior pending payload', () async {
    final saved = await store.save(prepare(proposal()));
    await database.execute(
      'CREATE TRIGGER fail_cost_write BEFORE INSERT ON cost_edits '
      "BEGIN SELECT RAISE(ABORT, 'synthetic disk failure'); END",
    );
    await expectLater(
      store.save(saved.withValues({'pending': null}), resolving: saved.pending),
      throwsA(isA<DatabaseException>()),
    );
    expect((await store.read(instance))!.toJson(), saved.toJson());
    await database.execute('DROP TRIGGER fail_cost_write');
  });

  test('corrupt payload is preserved and cannot be overwritten', () async {
    final saved = await store.save(prepare(proposal()));
    final corrupt = jsonEncode({...saved.toJson(), 'ownerId': other});
    await database.update('cost_edits', {'payload': corrupt});
    await expectLater(store.read(instance), throwsFormatException);
    await expectLater(store.pending(), throwsFormatException);
    await expectLater(store.save(saved), throwsFormatException);
    expect((await database.query('cost_edits')).single['payload'], corrupt);
    expect(await store.pendingCount(), 1);
  });

  test(
    'account change while waiting for database prevents any write',
    () async {
      final ready = Completer<Database>();
      final delayed = SqliteCopyCostStore(
        ownerId: owner,
        checkOwner: () {
          if (!allowed) throw StateError('Account changed');
        },
        database: ready.future,
      );
      final write = delayed.save(prepare(proposal()));
      final assertion = expectLater(write, throwsStateError);
      allowed = false;
      ready.complete(database);
      await assertion;
      expect(await database.query('cost_edits'), isEmpty);
    },
  );
}
