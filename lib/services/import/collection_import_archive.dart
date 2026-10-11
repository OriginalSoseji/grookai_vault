import 'dart:convert';

/// Historical reconciliation is independent of current owned quantities.
class CollectionImportArchive {
  CollectionImportArchive._({
    required this.sourceSha256,
    required this.createdAt,
    required this.rows,
    required this.groups,
    required this.reviewIndices,
    required this.cardCopies,
    required this.sealedCopies,
    required this.addedCopies,
  });

  final String sourceSha256, createdAt;
  final List<Map<String, String>> rows;
  final List<Map<String, dynamic>> groups;
  final List<int> reviewIndices;
  final int cardCopies, sealedCopies, addedCopies;
  int get reconciledRows => rows.length - reviewIndices.length;
  int get reusedCopies => cardCopies + sealedCopies - addedCopies;

  static final _hash = RegExp(r'^[a-f0-9]{64}$');
  static final _uuid = RegExp(r'^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$');
  static bool _isUuid(Object? value) =>
      value is String && _uuid.hasMatch(value);
  static Never _invalid() => throw const FormatException(
    'Saved import details could not be confirmed. Retry loading this import.',
  );
  static Map<String, dynamic> _map(Object? value) {
    if (value is! Map || value.keys.any((key) => key is! String)) _invalid();
    return Map<String, dynamic>.from(value);
  }

  factory CollectionImportArchive.fromStored({
    required String ownerId,
    required String sourceSha256,
    required Object? document,
    required List<dynamic> mappings,
  }) {
    if (!_isUuid(ownerId) || !_hash.hasMatch(sourceSha256)) _invalid();
    final doc = _map(document), rawRows = doc['source_rows'];
    if (doc['user_id'] != ownerId ||
        doc['source_sha256'] != sourceSha256 ||
        doc['created_at'] is! String ||
        DateTime.tryParse(doc['created_at'] as String) == null ||
        rawRows is! List ||
        rawRows.isEmpty ||
        rawRows.length > 5000 ||
        mappings.length > rawRows.length) {
      _invalid();
    }
    List<String>? columns;
    final rows = <Map<String, String>>[];
    for (final value in rawRows) {
      final row = _map(value), keys = row.keys.toList()..sort();
      if (keys.isEmpty ||
          keys.any((key) => key.trim().isEmpty || row[key] is! String)) {
        _invalid();
      }
      if (columns != null && jsonEncode(columns) != jsonEncode(keys)) {
        _invalid();
      }
      columns = keys;
      rows.add(
        Map<String, String>.unmodifiable({
          for (final key in keys) key: row[key] as String,
        }),
      );
    }
    final indices = <int>{}, copies = <String>{}, keys = <String>{};
    final groups = <Map<String, dynamic>>[];
    var cardCopies = 0, sealedCopies = 0, addedCopies = 0;
    for (final value in mappings) {
      final group = _map(value), target = _map(group['target']);
      final key = group['group_key'], sourceIndices = group['source_indices'];
      final ids = group['instance_ids'], added = group['added_count'];
      if (group['user_id'] != ownerId ||
          group['source_sha256'] != sourceSha256 ||
          key is! String ||
          !_hash.hasMatch(key) ||
          !keys.add(key) ||
          sourceIndices is! List ||
          sourceIndices.isEmpty ||
          ids is! List ||
          ids.isEmpty ||
          added is! int ||
          added < 0 ||
          added > ids.length ||
          target['sourceIndices'] is! List ||
          jsonEncode(target['sourceIndices']) != jsonEncode(sourceIndices) ||
          target['desiredQuantity'] != ids.length) {
        _invalid();
      }
      for (final index in sourceIndices) {
        if (index is! int ||
            index < 0 ||
            index >= rows.length ||
            !indices.add(index)) {
          _invalid();
        }
      }
      for (final id in ids) {
        if (!_isUuid(id) || !copies.add(id as String)) _invalid();
      }
      final kind = target['objectKind'] == 'sealed' ? 'sealed' : 'card';
      if (kind == 'sealed') {
        if (!_isUuid(target['sealedVariantId'])) _invalid();
        sealedCopies += ids.length;
      } else {
        if ((target.containsKey('objectKind') &&
                target['objectKind'] != 'card') ||
            !_isUuid(target['cardId']) ||
            !target.containsKey('cardPrintingId') ||
            (target['cardPrintingId'] != null &&
                !_isUuid(target['cardPrintingId']))) {
          _invalid();
        }
        cardCopies += ids.length;
      }
      addedCopies += added;
      groups.add({
        'groupKey': key,
        'sourceIndices': List<int>.from(sourceIndices),
        'instanceIds': List<String>.from(ids),
        'kind': kind,
        'addedCopies': added,
        'target': jsonDecode(jsonEncode(target)),
      });
    }
    return CollectionImportArchive._(
      sourceSha256: sourceSha256,
      createdAt: doc['created_at'] as String,
      rows: List.unmodifiable(rows),
      groups: List.unmodifiable(groups),
      reviewIndices: List.unmodifiable([
        for (var i = 0; i < rows.length; i++)
          if (!indices.contains(i)) i,
      ]),
      cardCopies: cardCopies,
      sealedCopies: sealedCopies,
      addedCopies: addedCopies,
    );
  }

  String toSourceJson() =>
      '${const JsonEncoder.withIndent('  ').convert({
        'format': 'grookai-saved-import-v1',
        'sourceSha256': sourceSha256,
        'createdAt': createdAt,
        'description': 'Stored source fields and historical reconciliation. Mapped copies may since have been sold, archived or edited. This is not a current inventory export or the original CSV file.',
        'sourceRows': rows,
        'mappings': groups,
        'reviewIndices': reviewIndices,
        'counts': {'sourceRows': rows.length, 'reconciledRows': reconciledRows, 'reviewRows': reviewIndices.length, 'cardCopies': cardCopies, 'sealedCopies': sealedCopies, 'addedCopies': addedCopies, 'reusedCopies': reusedCopies},
      })}\n';

  static Future<CollectionImportArchive> read({
    required String ownerId,
    required String sourceSha256,
    required bool Function() isCurrentOwner,
    required Future<Object?> Function() readDocument,
    required Future<Object?> Function(String? after) readGroupPage,
  }) async {
    void checkOwner() {
      if (!isCurrentOwner()) {
        throw StateError('Your account changed. Reopen saved imports.');
      }
    }

    checkOwner();
    final document = await readDocument();
    checkOwner();
    final source = CollectionImportArchive.fromStored(
      ownerId: ownerId,
      sourceSha256: sourceSha256,
      document: document,
      mappings: [],
    );
    final groups = <dynamic>[];
    String? after;
    while (true) {
      checkOwner();
      final page = await readGroupPage(after);
      checkOwner();
      if (page is! List) _invalid();
      if (page.isEmpty) break;
      if (groups.length + page.length > source.rows.length) _invalid();
      for (final value in page) {
        final group = _map(value), key = group['group_key'];
        if (key is! String ||
            !_hash.hasMatch(key) ||
            (after != null && key.compareTo(after) <= 0)) {
          _invalid();
        }
        after = key;
        groups.add(group);
      }
    }
    checkOwner();
    return CollectionImportArchive.fromStored(
      ownerId: ownerId,
      sourceSha256: sourceSha256,
      document: document,
      mappings: groups,
    );
  }
}
