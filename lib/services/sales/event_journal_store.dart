import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'event_journal.dart';

abstract interface class EventJournalStore {
  Future<Map<String, dynamic>?> read();
  Future<Map<String, dynamic>> change(Map<String, dynamic> change);
}

class SqliteEventJournalStore implements EventJournalStore {
  SqliteEventJournalStore({
    required this.ownerId,
    required this.checkOwner,
    Future<Database>? database,
  }) : _database = database ?? _open() {
    validateEventJournal(null, ownerId);
  }
  final String ownerId;
  final void Function() checkOwner;
  final Future<Database> _database;
  static Future<Database> _open() => openDatabase(
    'grookai.private-events.v1.db',
    version: 1,
    onConfigure: (db) async {
      await db.execute('PRAGMA synchronous = FULL');
    },
    onCreate: createSchema,
  );
  static Future<void> createSchema(Database db, int version) async {
    await db.execute(
      'CREATE TABLE event_edits (owner_id TEXT PRIMARY KEY NOT NULL, local_revision TEXT NOT NULL, payload TEXT NOT NULL)',
    );
  }

  Map<String, dynamic> _decode(Map<String, Object?> row) {
    final value = validateEventJournal(
      jsonDecode(row['payload'] as String),
      ownerId,
    );
    if (value == null ||
        value['ownerId'] != row['owner_id'] ||
        value['localRevision'] != row['local_revision']) {
      throw const FormatException(
        'Saved event edit needs review. It has not been removed.',
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
      'event_edits',
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
      throw StateError('Your account changed. Reopen Events.');
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
        'event_edits',
        where: 'owner_id = ?',
        whereArgs: [ownerId],
      );
      checkOwner();
      final current = rows.isEmpty ? null : _decode(rows.single),
          next = changeEventJournal(current, frozen);
      final stored = {
        'owner_id': ownerId,
        'local_revision': next['localRevision'] as String,
        'payload': jsonEncode(next),
      };
      if (current == null) {
        await tx.insert('event_edits', stored);
      } else {
        final count = await tx.update(
          'event_edits',
          stored,
          where: 'owner_id = ? AND local_revision = ?',
          whereArgs: [ownerId, current['localRevision']],
        );
        if (count != 1) {
          throw StateError(
            'Saved event edit changed. Reload it before continuing.',
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
