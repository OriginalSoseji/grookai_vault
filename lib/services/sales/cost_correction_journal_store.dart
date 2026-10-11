import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'cost_correction_journal.dart';

abstract interface class CostCorrectionJournalStore {
  Future<Map<String, dynamic>?> read();
  Future<Map<String, dynamic>> change(Map<String, dynamic> change);
}

class SqliteCostCorrectionJournalStore implements CostCorrectionJournalStore {
  SqliteCostCorrectionJournalStore({
    required this.ownerId,
    required this.checkOwner,
    Future<Database>? database,
  }) : _database = database ?? _open() {
    validateCostCorrectionJournal(null, ownerId);
  }
  final String ownerId;
  final void Function() checkOwner;
  final Future<Database> _database;
  static Future<Database> _open() => openDatabase(
    'grookai.private-cost-corrections.v1.db',
    version: 1,
    onConfigure: (db) async {
      await db.execute('PRAGMA synchronous = FULL');
    },
    onCreate: createSchema,
  );
  static Future<void> createSchema(Database db, int version) async {
    await db.execute(
      'CREATE TABLE cost_corrections (owner_id TEXT PRIMARY KEY NOT NULL, local_revision TEXT NOT NULL, payload TEXT NOT NULL)',
    );
  }

  Map<String, dynamic> _decode(Map<String, Object?> row) {
    final value = validateCostCorrectionJournal(
      jsonDecode(row['payload'] as String),
      ownerId,
    );
    if (value == null ||
        value['ownerId'] != row['owner_id'] ||
        value['localRevision'] != row['local_revision']) {
      throw const FormatException(
        'Saved cost correction needs review. It has not been removed.',
      );
    }
    return value;
  }

  @override
  Future<Map<String, dynamic>?> read() async {
    checkOwner();
    final db = await _database;
    checkOwner();
    final rows = await db.query(
      'cost_corrections',
      where: 'owner_id = ?',
      whereArgs: [ownerId],
    );
    checkOwner();
    return rows.isEmpty ? null : _decode(rows.single);
  }

  @override
  Future<Map<String, dynamic>> change(Map<String, dynamic> change) async {
    checkOwner();
    if (change['ownerId'] != ownerId) {
      throw StateError('Your account changed. Reopen Reports.');
    }
    // Freeze caller-owned maps before the first await.
    final frozen = Map<String, dynamic>.from(
          jsonDecode(jsonEncode(change)) as Map,
        ),
        db = await _database;
    checkOwner();
    final result = await db.transaction((tx) async {
      checkOwner();
      final rows = await tx.query(
        'cost_corrections',
        where: 'owner_id = ?',
        whereArgs: [ownerId],
      );
      checkOwner();
      final current = rows.isEmpty ? null : _decode(rows.single),
          next = changeCostCorrectionJournal(current, frozen);
      final stored = {
        'owner_id': ownerId,
        'local_revision': next['localRevision'] as String,
        'payload': jsonEncode(next),
      };
      if (current == null) {
        await tx.insert('cost_corrections', stored);
      } else {
        final count = await tx.update(
          'cost_corrections',
          stored,
          where: 'owner_id = ? AND local_revision = ?',
          whereArgs: [ownerId, current['localRevision']],
        );
        if (count != 1) {
          throw StateError(
            'Saved cost correction changed. Reload it before continuing.',
          );
        }
      }
      checkOwner();
      return next;
    });
    checkOwner();
    return result;
  }
}
