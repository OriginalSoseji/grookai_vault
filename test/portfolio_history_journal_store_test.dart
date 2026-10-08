import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:grookai_vault/services/vault/portfolio_history_journal_store.dart';
import 'helpers/portfolio_history_fakes.dart';

void main() {
  sqfliteFfiInit();
  test(
    'SQLite reopen preserves request, competing writers cannot replace it, account isolation holds',
    () async {
      final directory = await Directory.systemTemp.createTemp(
            'grookai-portfolio-history-',
          ),
          path = '${directory.path}${Platform.pathSeparator}history.db';
      final connections = <Database>[];
      var allowed = true;
      Future<Database> connect() async {
        final db = await databaseFactoryFfi.openDatabase(
          path,
          options: OpenDatabaseOptions(
            version: 1,
            singleInstance: false,
            onConfigure: (d) => d.execute('PRAGMA synchronous = FULL'),
            onCreate: SqlitePortfolioJournalStore.createSchema,
          ),
        );
        connections.add(db);
        return db;
      }

      final owner = portfolioTestId(1),
          request = {
            'version': 1,
            'requestId': portfolioTestId(5),
            'day': portfolioTestDay,
          };
      Map<String, dynamic> change(
        String action,
        String? old,
        int next, {
        dynamic outcome,
      }) => {
        'ownerId': owner,
        'expectedLocalRevision': old,
        'nextLocalRevision': portfolioTestId(next),
        'action': action,
        'request': request,
        'acknowledgement': ?outcome,
      };
      SqlitePortfolioJournalStore scoped(Database db, {String? account}) =>
          SqlitePortfolioJournalStore(
            ownerId: account ?? owner,
            checkOwner: () {
              if (!allowed) throw StateError('Account changed');
            },
            database: Future.value(db),
          );
      try {
        final db = await connect(), a = scoped(db), b = scoped(await connect());
        final staged = await a.change(change('stage', null, 6)),
            bytes = await db.query('portfolio_history');
        await expectLater(
          b.change(change('stage', null, 7)),
          throwsFormatException,
        );
        expect(await db.query('portfolio_history'), bytes);
        await db.close();
        final restarted = scoped(await connect());
        expect(await restarted.read(), staged);
        expect(
          await scoped(await connect(), account: portfolioTestId(9)).read(),
          null,
        );
        final gateway = PortfolioFakeGateway(),
            cancelled = gateway.result(request, 'cancelled');
        await gateway.changes.close();
        allowed = false;
        await expectLater(
          restarted.change(
            change('acknowledge', portfolioTestId(6), 7, outcome: cancelled),
          ),
          throwsStateError,
        );
        allowed = true;
        expect(await restarted.read(), staged);
        final acknowledged = await restarted.change(
          change('acknowledge', portfolioTestId(6), 7, outcome: cancelled),
        );
        expect(acknowledged['pending'], null);
        expect(acknowledged['lastOutcome'], cancelled);
        await expectLater(
          b.change(
            change('acknowledge', portfolioTestId(6), 8, outcome: cancelled),
          ),
          throwsFormatException,
        );
        expect(await scoped(await connect()).read(), acknowledged);
      } finally {
        for (final db in connections) {
          if (db.isOpen) await db.close();
        }
      }
    },
  );
}
