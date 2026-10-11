import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:grookai_vault/services/sales/cost_correction_journal.dart';
import 'package:grookai_vault/services/sales/cost_correction_journal_store.dart';

const one = '11111111-1111-4111-8111-111111111111',
    two = '22222222-2222-4222-8222-222222222222',
    three = '33333333-3333-4333-8333-333333333333';
void main() {
  sqfliteFfiInit();
  final fixtures =
          jsonDecode(
                File(
                  'test/fixtures/sale_cost_corrections_v1.json',
                ).readAsStringSync(),
              )
              as Map,
      owner = fixtures['ownerId'] as String;
  final outcome = Map<String, dynamic>.from(
        fixtures['profits'][0]['outcome'] as Map,
      ),
      request = outcome['request'];
  Map<String, dynamic> change(
    String action,
    String? previous,
    String next, [
    Map<String, dynamic> extra = const {},
  ]) => {
    'ownerId': owner,
    'action': action,
    'expectedLocalRevision': previous,
    'nextLocalRevision': next,
    ...extra,
  };
  test('only a terminal exact acknowledgement clears pending correction', () {
    final staged = changeCostCorrectionJournal(
      null,
      change('stage', null, one, {'request': request}),
    );
    for (final action in [
      'discard',
      'discardRejected',
      'reject',
      'cancel',
      'reset',
    ]) {
      expect(
        () => changeCostCorrectionJournal(staged, change(action, one, two)),
        throwsFormatException,
      );
    }
    expect(
      () => changeCostCorrectionJournal(
        staged,
        change('acknowledge', one, two, {
          'request': request,
          'acknowledgement': null,
        }),
      ),
      throwsFormatException,
    );
    expect(
      changeCostCorrectionJournal(
        staged,
        change('acknowledge', one, two, {
          'request': request,
          'acknowledgement': outcome,
        }),
      )['pending'],
      null,
    );
    expect(staged['pending'], request);
  });
  test(
    'SQLite restart, competing writers and account isolation retain exact pending bytes',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'grookai-cost-corrections-',
      );
      final path = '${directory.path}${Platform.pathSeparator}corrections.db';
      final connections = <Database>[];
      var allowed = true;
      Future<Database> connect() async {
        final db = await databaseFactoryFfi.openDatabase(
          path,
          options: OpenDatabaseOptions(
            version: 1,
            singleInstance: false,
            onConfigure: (d) => d.execute('PRAGMA synchronous = FULL'),
            onCreate: SqliteCostCorrectionJournalStore.createSchema,
          ),
        );
        connections.add(db);
        return db;
      }

      SqliteCostCorrectionJournalStore scoped(Database db, [String? account]) =>
          SqliteCostCorrectionJournalStore(
            ownerId: account ?? owner,
            checkOwner: () {
              if (!allowed) throw StateError('Account changed');
            },
            database: Future.value(db),
          );
      try {
        final first = await connect(),
            a = scoped(first),
            b = scoped(await connect());
        final staged = await a.change(
          change('stage', null, one, {'request': request}),
        );
        final stored = await first.query('cost_corrections');
        await expectLater(
          b.change(change('stage', null, two, {'request': request})),
          throwsFormatException,
        );
        expect(await first.query('cost_corrections'), stored);
        await first.close();
        final reopened = scoped(await connect());
        expect(await reopened.read(), staged);
        expect(
          await scoped(
            await connect(),
            'd1000000-0000-4000-8000-000000000002',
          ).read(),
          null,
        );
        allowed = false;
        await expectLater(
          reopened.change(
            change('acknowledge', one, two, {
              'request': request,
              'acknowledgement': outcome,
            }),
          ),
          throwsStateError,
        );
        allowed = true;
        expect(await reopened.read(), staged);
        final cancelled = {
          ...outcome,
          'status': 'cancelled',
          'source': null,
          'revision': null,
        };
        expect(
          (await reopened.change(
            change('acknowledge', one, three, {
              'request': request,
              'acknowledgement': cancelled,
            }),
          ))['pending'],
          null,
        );
        await expectLater(
          b.change(
            change('acknowledge', one, two, {
              'request': request,
              'acknowledgement': outcome,
            }),
          ),
          throwsFormatException,
        );
      } finally {
        for (final db in connections) {
          if (db.isOpen) await db.close();
        }
        final temporaryRoot = await Directory.systemTemp.resolveSymbolicLinks();
        final target = await directory.resolveSymbolicLinks();
        expect(
          target.toLowerCase().startsWith(
            '${temporaryRoot.toLowerCase()}${Platform.pathSeparator}',
          ),
          isTrue,
        );
        expect(
          directory.uri.pathSegments
              .where((s) => s.isNotEmpty)
              .last
              .startsWith('grookai-cost-corrections-'),
          isTrue,
        );
        await directory.delete(recursive: true);
      }
    },
  );
}
