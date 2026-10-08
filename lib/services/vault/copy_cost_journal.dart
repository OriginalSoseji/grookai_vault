import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'copy_cost_models.dart';

/// The proposal and pending wire request are separate so acknowledgment never
/// erases an edit accepted by a newer screen.
class CopyCostDraft {
  CopyCostDraft._(this._value);
  final Map<String, dynamic> _value;
  String get ownerId => _value['ownerId'] as String;
  String get instanceId => _value['instanceId'] as String;
  String get gvviId => _value['gvviId'] as String;
  String get title => _value['title'] as String;
  int get revision => _value['revision'] as int;
  String get amountText => _value['amountText'] as String;
  String get currencyText => _value['currencyText'] as String;
  String? get expectedAmount => _value['expectedAmount'] as String?;
  String? get expectedCurrency => _value['expectedCurrency'] as String?;
  bool get needsReview => _value['needsReview'] as bool;
  CopyCostRequest? get pending => _value['pending'] == null
      ? null
      : CopyCostRequest.fromJson(_value['pending']);

  factory CopyCostDraft.create({
    required String ownerId,
    required String instanceId,
    required String gvviId,
    required String title,
    required CopyCostEvidence cost,
  }) => CopyCostDraft.fromJson({
    'version': 1,
    'ownerId': ownerId,
    'instanceId': instanceId,
    'gvviId': gvviId,
    'title': title,
    'revision': 0,
    'amountText': cost.amount ?? '',
    'currencyText': cost.currency ?? '',
    'expectedAmount': cost.amount,
    'expectedCurrency': cost.currency,
    'needsReview': false,
    'pending': null,
  });

  factory CopyCostDraft.fromJson(Object? value) {
    const keys = {
      'version',
      'ownerId',
      'instanceId',
      'gvviId',
      'title',
      'revision',
      'amountText',
      'currencyText',
      'expectedAmount',
      'expectedCurrency',
      'needsReview',
      'pending',
    };
    if (value is! Map ||
        value.length != keys.length ||
        !keys.every(value.containsKey) ||
        value['version'] != 1 ||
        !isCopyCostId(value['ownerId']) ||
        !isCopyCostId(value['instanceId']) ||
        value['revision'] is! int ||
        (value['revision'] as int) < 0 ||
        (value['revision'] as int) > 2147483646 ||
        value['needsReview'] is! bool) {
      throw const FormatException(
        'The saved cost edit needs review. It has not been removed.',
      );
    }
    for (final entry in {
      'gvviId': 300,
      'title': 512,
      'amountText': 4096,
      'currencyText': 1000,
    }.entries) {
      if (value[entry.key] is! String ||
          (value[entry.key] as String).length > entry.value) {
        throw const FormatException(
          'The saved cost edit needs review. It has not been removed.',
        );
      }
    }
    if (!(value['expectedAmount'] == null ||
            value['expectedAmount'] is String) ||
        !(value['expectedCurrency'] == null ||
            value['expectedCurrency'] is String)) {
      throw const FormatException('The previous cost needs review.');
    }
    // Validates the legacy comparison pair without coercing it into a new cost.
    CopyCostRequest(
      ownerId: value['ownerId'] as String,
      requestId: value['instanceId'] as String,
      instanceId: value['instanceId'] as String,
      expectedAmount: value['expectedAmount'] as String?,
      expectedCurrency: value['expectedCurrency'] as String?,
      amount: null,
      currency: null,
    );
    final pending = value['pending'] == null
        ? null
        : CopyCostRequest.fromJson(value['pending']);
    if (pending != null &&
        (pending.ownerId != value['ownerId'] ||
            pending.instanceId != value['instanceId'])) {
      throw const FormatException(
        'The saved request belongs to another copy or account.',
      );
    }
    return CopyCostDraft._(
      Map.unmodifiable({
        ...Map<String, dynamic>.from(value),
        'pending': pending?.toJson(),
      }),
    );
  }
  Map<String, dynamic> toJson() => {..._value, 'pending': pending?.toJson()};
  CopyCostDraft withValues(Map<String, dynamic> values) =>
      CopyCostDraft.fromJson({...toJson(), ...values});
}

abstract interface class CopyCostStore {
  Future<CopyCostDraft?> read(String instanceId);
  Future<List<CopyCostDraft>> pending({String? after, int limit = 50});
  Future<int> pendingCount();
  Future<CopyCostDraft> save(
    CopyCostDraft proposed, {
    CopyCostRequest? resolving,
  });
}

/// App-sandbox SQLite, independent of existing preferences, sale drafts and caches.
/// Every mutation uses a database transaction and a revision comparison.
class SqliteCopyCostStore implements CopyCostStore {
  SqliteCopyCostStore({
    required this.ownerId,
    required this.checkOwner,
    Future<Database>? database,
  }) : _database = database ?? _open() {
    if (!isCopyCostId(ownerId)) {
      throw const FormatException('Sign in to edit private costs.');
    }
  }
  final String ownerId;
  final void Function() checkOwner;
  final Future<Database> _database;

  static Future<Database> _open() => openDatabase(
    'grookai.private-copy-cost.v1.db',
    version: 1,
    onConfigure: (db) async {
      await db.execute('PRAGMA synchronous = FULL');
    },
    onCreate: createSchema,
  );

  /// Also used by real-device journal tests with a dedicated temporary database.
  static Future<void> createSchema(Database db, int version) async {
    await db.execute(
      'CREATE TABLE cost_edits (owner_id TEXT NOT NULL, instance_id TEXT NOT NULL, '
      'revision INTEGER NOT NULL CHECK(revision > 0), pending_request_id TEXT, payload TEXT NOT NULL, '
      'PRIMARY KEY(owner_id, instance_id))',
    );
    await db.execute(
      'CREATE INDEX cost_pending_by_owner ON cost_edits(owner_id, instance_id) WHERE pending_request_id IS NOT NULL',
    );
  }

  void _copy(String id) {
    checkOwner();
    if (!isCopyCostId(id)) {
      throw const FormatException('Invalid copy identity.');
    }
  }

  CopyCostDraft _decode(Map<String, Object?> row) {
    final draft = CopyCostDraft.fromJson(jsonDecode(row['payload'] as String));
    if (draft.ownerId != ownerId ||
        draft.ownerId != row['owner_id'] ||
        draft.instanceId != row['instance_id'] ||
        draft.revision != row['revision'] ||
        draft.pending?.requestId != row['pending_request_id']) {
      throw const FormatException(
        'The saved cost edit could not be verified. It has not been removed.',
      );
    }
    return draft;
  }

  @override
  Future<CopyCostDraft?> read(String instanceId) async {
    _copy(instanceId);
    final db = await _database;
    checkOwner();
    final rows = await db.query(
      'cost_edits',
      where: 'owner_id = ? AND instance_id = ?',
      whereArgs: [ownerId, instanceId],
    );
    checkOwner();
    return rows.isEmpty ? null : _decode(rows.single);
  }

  @override
  Future<List<CopyCostDraft>> pending({String? after, int limit = 50}) async {
    checkOwner();
    if (after != null) _copy(after);
    if (limit < 1 || limit > 100) throw ArgumentError.value(limit, 'limit');
    final db = await _database;
    checkOwner();
    final rows = await db.query(
      'cost_edits',
      where:
          'owner_id = ? AND pending_request_id IS NOT NULL${after == null ? '' : ' AND instance_id > ?'}',
      whereArgs: [ownerId, ?after],
      orderBy: 'instance_id',
      limit: limit,
    );
    checkOwner();
    return rows.map(_decode).toList(growable: false);
  }

  @override
  Future<int> pendingCount() async {
    checkOwner();
    final db = await _database;
    checkOwner();
    final rows = await db.rawQuery(
      'SELECT count(*) AS n FROM cost_edits WHERE owner_id = ? AND pending_request_id IS NOT NULL',
      [ownerId],
    );
    checkOwner();
    return rows.single['n'] as int;
  }

  @override
  Future<CopyCostDraft> save(
    CopyCostDraft proposed, {
    CopyCostRequest? resolving,
  }) async {
    _copy(proposed.instanceId);
    if (proposed.ownerId != ownerId) {
      throw StateError('Your account changed. Reopen private costs.');
    }
    final db = await _database;
    checkOwner();
    final result = await db.transaction((transaction) async {
      checkOwner();
      final rows = await transaction.query(
        'cost_edits',
        where: 'owner_id = ? AND instance_id = ?',
        whereArgs: [ownerId, proposed.instanceId],
      );
      final prior = rows.isEmpty ? null : _decode(rows.single);
      if ((prior?.revision ?? 0) != proposed.revision) {
        throw StateError(
          'This cost edit changed in another screen. Reopen it before continuing.',
        );
      }
      // A pending payload may be resolved by the service, but never replaced by
      // another request or modified while it remains pending.
      if (prior?.pending != null &&
          proposed.pending != null &&
          jsonEncode(prior!.pending!.toJson()) !=
              jsonEncode(proposed.pending!.toJson())) {
        throw StateError(
          'Recover the existing cost save before creating another.',
        );
      }
      if (prior?.pending != null &&
          proposed.pending == null &&
          (resolving == null ||
              jsonEncode(prior!.pending!.toJson()) !=
                  jsonEncode(resolving.toJson()))) {
        throw StateError(
          'A pending cost save needs confirmation before it can be cleared.',
        );
      }
      final next = proposed.withValues({'revision': proposed.revision + 1});
      final encoded = jsonEncode(next.toJson());
      if (encoded.length > 20000) {
        throw const FormatException(
          'The cost edit is too large to save safely.',
        );
      }
      checkOwner();
      await transaction.insert('cost_edits', {
        'owner_id': ownerId,
        'instance_id': next.instanceId,
        'revision': next.revision,
        'pending_request_id': next.pending?.requestId,
        'payload': encoded,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      return next;
    }, exclusive: true);
    checkOwner();
    return result;
  }
}
