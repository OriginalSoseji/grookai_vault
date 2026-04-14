import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../vault/vault_card_service.dart';

class CollectionImportParsedRow {
  const CollectionImportParsedRow({
    required this.sourceRow,
    this.rawName = '',
    this.rawSet = '',
    this.rawNumber = '',
    this.rawCondition = '',
    this.rawQuantity = '',
    this.rawCost = '',
    this.rawDate = '',
    this.rawNotes = '',
  });

  final int sourceRow;
  final String rawName;
  final String rawSet;
  final String rawNumber;
  final String rawCondition;
  final String rawQuantity;
  final String rawCost;
  final String rawDate;
  final String rawNotes;
}

class CollectionImportNormalizedRow {
  const CollectionImportNormalizedRow({
    required this.sourceRow,
    required this.displayName,
    required this.displaySet,
    required this.displayNumber,
    required this.name,
    required this.set,
    required this.number,
    required this.compareName,
    required this.compareSet,
    required this.compareNumber,
    required this.quantity,
    required this.condition,
    this.cost,
    this.added,
    this.notes,
  });

  final int sourceRow;
  final String displayName;
  final String displaySet;
  final String displayNumber;
  final String name;
  final String set;
  final String number;
  final String compareName;
  final String compareSet;
  final String compareNumber;
  final int quantity;
  final String condition;
  final double? cost;
  final String? added;
  final String? notes;

  CollectionImportNormalizedRow copyWith({int? quantity}) {
    return CollectionImportNormalizedRow(
      sourceRow: sourceRow,
      displayName: displayName,
      displaySet: displaySet,
      displayNumber: displayNumber,
      name: name,
      set: set,
      number: number,
      compareName: compareName,
      compareSet: compareSet,
      compareNumber: compareNumber,
      quantity: quantity ?? this.quantity,
      condition: condition,
      cost: cost,
      added: added,
      notes: notes,
    );
  }
}

class CollectionImportCardMatch {
  const CollectionImportCardMatch({
    required this.cardId,
    required this.gvId,
    required this.name,
    required this.setName,
    required this.number,
    this.setCode,
  });

  final String cardId;
  final String gvId;
  final String name;
  final String setName;
  final String number;
  final String? setCode;
}

enum CollectionImportMatchStatus { matched, multiple, missing }

class CollectionImportPreviewRow {
  const CollectionImportPreviewRow({
    required this.row,
    required this.status,
    required this.compareKey,
    required this.desiredQuantity,
    required this.importQuantity,
    this.match,
    this.matches = const [],
  });

  final CollectionImportNormalizedRow row;
  final CollectionImportMatchStatus status;
  final String compareKey;
  final int desiredQuantity;
  final int importQuantity;
  final CollectionImportCardMatch? match;
  final List<CollectionImportCardMatch> matches;
}

class CollectionImportPreviewSummary {
  const CollectionImportPreviewSummary({
    required this.totalRows,
    required this.matchedRows,
    required this.multipleRows,
    required this.unmatchedRows,
  });

  final int totalRows;
  final int matchedRows;
  final int multipleRows;
  final int unmatchedRows;
}

class CollectionImportReport {
  const CollectionImportReport({
    required this.rowsRead,
    required this.rowsCollapsed,
    required this.rowsValid,
    required this.rowsInvalid,
    required this.rowsMatched,
    required this.rowsMissing,
  });

  final int rowsRead;
  final int rowsCollapsed;
  final int rowsValid;
  final int rowsInvalid;
  final int rowsMatched;
  final int rowsMissing;
}

class CollectionImportPreview {
  const CollectionImportPreview({
    required this.rows,
    required this.summary,
    required this.report,
  });

  final List<CollectionImportPreviewRow> rows;
  final CollectionImportPreviewSummary summary;
  final CollectionImportReport report;
}

class CollectionImportResult {
  const CollectionImportResult({
    required this.importedCards,
    required this.importedEntries,
    required this.needsManualMatch,
    required this.skippedRows,
  });

  final int importedCards;
  final int importedEntries;
  final int needsManualMatch;
  final int skippedRows;
}

class _CollectionImportSetRow {
  const _CollectionImportSetRow({
    required this.id,
    required this.name,
    this.code,
  });

  final String id;
  final String name;
  final String? code;
}

class _CollectionImportCandidateRow {
  const _CollectionImportCandidateRow({
    required this.id,
    required this.gvId,
    required this.name,
    required this.number,
    required this.setId,
    required this.setName,
    this.setCode,
  });

  final String id;
  final String gvId;
  final String name;
  final String number;
  final String setId;
  final String setName;
  final String? setCode;
}

class _CollectionImportAggregatedRow {
  const _CollectionImportAggregatedRow({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.setName,
    required this.desiredQuantity,
    required this.importQuantity,
    required this.condition,
    this.notes,
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String setName;
  final int desiredQuantity;
  final int importQuantity;
  final String condition;
  final String? notes;
}

class CollectionImportService {
  static const List<String> importConditionOptions = [
    'NM',
    'LP',
    'MP',
    'HP',
    'DMG',
  ];

  static const Map<String, String> _conditionMap = {
    'nm': 'NM',
    'near mint': 'NM',
    'lp': 'LP',
    'light play': 'LP',
    'lightly played': 'LP',
    'mp': 'MP',
    'moderate play': 'MP',
    'moderately played': 'MP',
    'hp': 'HP',
    'heavy play': 'HP',
    'heavily played': 'HP',
    'dmg': 'DMG',
    'damaged': 'DMG',
  };

  static const Map<String, String> _setAliasMap = {
    'base set (unlimited)': 'base set',
    'base set (1st edition & shadowless)': 'base set',
    'black and white': 'black & white',
  };

  static const Set<String> _excludedNameHeaders = {
    'portfolio name',
    'collection name',
    'folder name',
    'list name',
  };

  static const List<String> _safeProductNameHeaders = [
    'product name',
    'card name',
  ];

  static const Set<String> _removableNameDecorations = {
    'red cheeks',
    'yellow cheeks',
    'secret',
    'full art',
  };

  static Future<CollectionImportPreview> buildPreview({
    required SupabaseClient client,
    required String csvText,
  }) async {
    final parsedRows = parseCollectrCsv(csvText);
    final normalizedRows = parsedRows.map(normalizeRow).toList();
    final collapsedRows = _collapseRows(normalizedRows);
    final validation = _validateRows(collapsedRows);
    final validRows = validation.validRows;
    final invalidRows = validation.invalidRows;

    if (validRows.isEmpty) {
      return CollectionImportPreview(
        rows: const [],
        summary: const CollectionImportPreviewSummary(
          totalRows: 0,
          matchedRows: 0,
          multipleRows: 0,
          unmatchedRows: 0,
        ),
        report: CollectionImportReport(
          rowsRead: normalizedRows.length,
          rowsCollapsed: collapsedRows.length,
          rowsValid: 0,
          rowsInvalid: invalidRows.length,
          rowsMatched: 0,
          rowsMissing: 0,
        ),
      );
    }

    final setRows = await _fetchAllSets(client);
    final setNameMap = <String, List<_CollectionImportSetRow>>{};
    for (final setRow in setRows) {
      final normalizedName = normalizeImportSetForCompare(setRow.name);
      if (normalizedName.isEmpty) {
        continue;
      }
      final matches = setNameMap.putIfAbsent(
        normalizedName,
        () => <_CollectionImportSetRow>[],
      );
      matches.add(setRow);
    }

    final candidateRows = await _fetchCandidateRows(
      client: client,
      rows: validRows,
      setNameMap: setNameMap,
    );

    final existingVault = await _fetchExistingVaultQuantities(
      client: client,
      candidateRows: candidateRows,
    );

    final desiredQuantityByKey = <String, int>{
      for (final row in validRows) _buildRowKey(row): row.quantity,
    };
    final rowsToMatch = _reconcileVaultQuantities(validRows, existingVault);

    if (rowsToMatch.isEmpty) {
      return CollectionImportPreview(
        rows: const [],
        summary: const CollectionImportPreviewSummary(
          totalRows: 0,
          matchedRows: 0,
          multipleRows: 0,
          unmatchedRows: 0,
        ),
        report: CollectionImportReport(
          rowsRead: normalizedRows.length,
          rowsCollapsed: collapsedRows.length,
          rowsValid: validRows.length,
          rowsInvalid: invalidRows.length,
          rowsMatched: 0,
          rowsMissing: 0,
        ),
      );
    }

    final matchMap = <String, List<_CollectionImportCandidateRow>>{};
    for (final candidate in candidateRows) {
      final key = _buildMatchKey(
        normalizeImportSetForCompare(candidate.setName),
        normalizeImportNumberForCompare(candidate.number),
        normalizeImportNameForCompare(candidate.name),
      );
      final matches = matchMap.putIfAbsent(
        key,
        () => <_CollectionImportCandidateRow>[],
      );
      matches.add(candidate);
    }

    final previewRows = rowsToMatch.map((row) {
      final compareKey = _buildRowKey(row);
      final desiredQuantity = desiredQuantityByKey[compareKey] ?? row.quantity;
      final candidates =
          matchMap[_buildMatchKey(
            row.compareSet,
            row.compareNumber,
            row.compareName,
          )] ??
          const <_CollectionImportCandidateRow>[];

      if (candidates.length == 1) {
        final match = candidates.first;
        return CollectionImportPreviewRow(
          row: row,
          status: CollectionImportMatchStatus.matched,
          compareKey: compareKey,
          desiredQuantity: desiredQuantity,
          importQuantity: row.quantity,
          match: CollectionImportCardMatch(
            cardId: match.id,
            gvId: match.gvId,
            name: match.name,
            setName: match.setName,
            setCode: match.setCode,
            number: match.number,
          ),
        );
      }

      if (candidates.length > 1) {
        return CollectionImportPreviewRow(
          row: row,
          status: CollectionImportMatchStatus.multiple,
          compareKey: compareKey,
          desiredQuantity: desiredQuantity,
          importQuantity: row.quantity,
          matches: candidates
              .map(
                (candidate) => CollectionImportCardMatch(
                  cardId: candidate.id,
                  gvId: candidate.gvId,
                  name: candidate.name,
                  setName: candidate.setName,
                  setCode: candidate.setCode,
                  number: candidate.number,
                ),
              )
              .toList(),
        );
      }

      return CollectionImportPreviewRow(
        row: row,
        status: CollectionImportMatchStatus.missing,
        compareKey: compareKey,
        desiredQuantity: desiredQuantity,
        importQuantity: row.quantity,
      );
    }).toList();

    final matchedRows = previewRows
        .where((row) => row.status == CollectionImportMatchStatus.matched)
        .length;
    final multipleRows = previewRows
        .where((row) => row.status == CollectionImportMatchStatus.multiple)
        .length;
    final missingRows = previewRows
        .where((row) => row.status == CollectionImportMatchStatus.missing)
        .length;

    return CollectionImportPreview(
      rows: previewRows,
      summary: CollectionImportPreviewSummary(
        totalRows: previewRows.length,
        matchedRows: matchedRows,
        multipleRows: multipleRows,
        unmatchedRows: missingRows,
      ),
      report: CollectionImportReport(
        rowsRead: normalizedRows.length,
        rowsCollapsed: collapsedRows.length,
        rowsValid: validRows.length,
        rowsInvalid: invalidRows.length,
        rowsMatched: matchedRows,
        rowsMissing: missingRows,
      ),
    );
  }

  static Future<CollectionImportResult> importPreview({
    required SupabaseClient client,
    required CollectionImportPreview preview,
  }) async {
    final matchedPreviewRows = preview.rows
        .where((row) => row.status == CollectionImportMatchStatus.matched)
        .toList();

    if (matchedPreviewRows.isEmpty) {
      return CollectionImportResult(
        importedCards: 0,
        importedEntries: 0,
        needsManualMatch:
            preview.summary.multipleRows + preview.summary.unmatchedRows,
        skippedRows:
            preview.summary.multipleRows + preview.summary.unmatchedRows,
      );
    }

    final aggregatedRows = _aggregateImportRows(matchedPreviewRows);
    final existingOwnedCounts =
        await VaultCardService.getOwnedCountsByCardPrintIds(
          client: client,
          cardPrintIds: aggregatedRows.map((row) => row.cardPrintId).toList(),
        );
    final rowsToImport = aggregatedRows
        .map((row) {
          final existingQty = existingOwnedCounts[row.cardPrintId] ?? 0;
          final nextQuantity = row.desiredQuantity - existingQty;
          if (nextQuantity <= 0) {
            return null;
          }
          return _CollectionImportAggregatedRow(
            cardPrintId: row.cardPrintId,
            gvId: row.gvId,
            name: row.name,
            setName: row.setName,
            desiredQuantity: row.desiredQuantity,
            importQuantity: nextQuantity,
            condition: row.condition,
            notes: row.notes,
          );
        })
        .whereType<_CollectionImportAggregatedRow>()
        .toList();

    if (rowsToImport.isEmpty) {
      return CollectionImportResult(
        importedCards: 0,
        importedEntries: 0,
        needsManualMatch:
            preview.summary.multipleRows + preview.summary.unmatchedRows,
        skippedRows:
            preview.summary.multipleRows + preview.summary.unmatchedRows,
      );
    }

    for (final row in rowsToImport) {
      await client.rpc(
        'vault_add_card_instance_v1',
        params: {
          'p_card_print_id': row.cardPrintId,
          'p_quantity': row.importQuantity,
          'p_condition_label': row.condition,
          'p_notes': row.notes,
          'p_name': row.name,
          'p_set_name': row.setName,
        },
      );
    }

    return CollectionImportResult(
      importedCards: rowsToImport.fold<int>(
        0,
        (sum, row) => sum + row.importQuantity,
      ),
      importedEntries: rowsToImport.length,
      needsManualMatch:
          preview.summary.multipleRows + preview.summary.unmatchedRows,
      skippedRows: preview.summary.multipleRows + preview.summary.unmatchedRows,
    );
  }

  static List<CollectionImportParsedRow> parseCollectrCsv(String csvText) {
    final table = _parseCsvTable(csvText);
    if (table.length < 2) {
      throw Exception('This CSV does not contain any collection rows.');
    }

    final headers = table.first.map((header) => header.trim()).toList();
    final columnMap = _buildColumnMap(headers);

    return table.sublist(1).asMap().entries.map((entry) {
      final rowIndex = entry.key;
      final cells = entry.value;
      final raw = <String, String>{
        for (var headerIndex = 0; headerIndex < headers.length; headerIndex++)
          headers[headerIndex]:
              (cells.length > headerIndex ? cells[headerIndex] : '').trim(),
      };

      return CollectionImportParsedRow(
        sourceRow: rowIndex + 2,
        rawName: raw[columnMap.productName] ?? '',
        rawSet: raw[columnMap.set] ?? '',
        rawNumber: raw[columnMap.number] ?? '',
        rawCondition: columnMap.condition == null
            ? ''
            : (raw[columnMap.condition!] ?? ''),
        rawQuantity: columnMap.quantity == null
            ? ''
            : (raw[columnMap.quantity!] ?? ''),
        rawCost: columnMap.averageCost == null
            ? ''
            : (raw[columnMap.averageCost!] ?? ''),
        rawDate: columnMap.dateAdded == null
            ? ''
            : (raw[columnMap.dateAdded!] ?? ''),
        rawNotes: columnMap.notes == null ? '' : (raw[columnMap.notes!] ?? ''),
      );
    }).toList();
  }

  static CollectionImportNormalizedRow normalizeRow(
    CollectionImportParsedRow row,
  ) {
    final displayName = _normalizeText(row.rawName);
    final displaySet = _normalizeText(row.rawSet);
    final displayNumber = _normalizeCardNumber(row.rawNumber);
    final normalizedName = _normalizeMatchText(row.rawName);
    final normalizedSet = _normalizeMatchText(row.rawSet);
    final normalizedNumber = _normalizeCardNumber(row.rawNumber);

    return CollectionImportNormalizedRow(
      sourceRow: row.sourceRow,
      displayName: displayName.isEmpty ? 'Unknown card' : displayName,
      displaySet: displaySet.isEmpty ? 'Unknown set' : displaySet,
      displayNumber: displayNumber.isEmpty ? '—' : displayNumber,
      name: normalizedName,
      set: normalizedSet,
      number: normalizedNumber,
      compareName: normalizeImportNameForCompare(row.rawName),
      compareSet: normalizeImportSetForCompare(row.rawSet),
      compareNumber: normalizeImportNumberForCompare(row.rawNumber),
      quantity: _parseQuantity(row.rawQuantity),
      condition: _normalizeCondition(row.rawCondition),
      cost: _parseCurrency(row.rawCost),
      added: _parseImportedDate(row.rawDate),
      notes: _normalizeText(row.rawNotes).isEmpty
          ? null
          : _normalizeText(row.rawNotes),
    );
  }

  static String normalizeImportSetForCompare(String value) {
    final normalized = _normalizeMatchText(value);
    return _setAliasMap[normalized] ?? normalized;
  }

  static String normalizeImportNameForCompare(String value) {
    var normalized = _normalizeMatchText(value);
    normalized = normalized.replaceAllMapped(RegExp(r'\s*\(([^)]*)\)'), (
      match,
    ) {
      final decoration = _normalizeMatchText(match.group(1) ?? '');
      return _removableNameDecorations.contains(decoration)
          ? ''
          : match.group(0) ?? '';
    });
    return _normalizeText(normalized).toLowerCase();
  }

  static String normalizeImportNumberForCompare(String value) {
    final normalized = _normalizeCardNumber(value);
    if (normalized.isEmpty) {
      return '';
    }
    final leftSide = normalized.split('/').first.trim();
    if (RegExp(r'^\d+$').hasMatch(leftSide)) {
      return _stripLeadingZeros(leftSide);
    }
    return leftSide;
  }

  static Future<List<_CollectionImportSetRow>> _fetchAllSets(
    SupabaseClient client,
  ) async {
    final response = await client.from('sets').select('id,name,code');
    return response
        .whereType<Map<String, dynamic>>()
        .map((row) {
          return _CollectionImportSetRow(
            id: (row['id'] ?? '').toString(),
            name: (row['name'] ?? '').toString(),
            code: row['code']?.toString(),
          );
        })
        .where((row) => row.id.isNotEmpty && row.name.trim().isNotEmpty)
        .toList();
  }

  static Future<List<_CollectionImportCandidateRow>> _fetchCandidateRows({
    required SupabaseClient client,
    required List<CollectionImportNormalizedRow> rows,
    required Map<String, List<_CollectionImportSetRow>> setNameMap,
  }) async {
    if (rows.isEmpty) {
      return const [];
    }

    final candidateSetIds = rows
        .expand(
          (row) =>
              (setNameMap[row.compareSet] ?? const <_CollectionImportSetRow>[])
                  .map((setRow) => setRow.id),
        )
        .toSet()
        .toList();
    final candidateNumbers = rows
        .map((row) => row.compareNumber.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (candidateSetIds.isEmpty || candidateNumbers.isEmpty) {
      return const [];
    }

    final setIdChunks = _chunkList(candidateSetIds, 100);
    final numberChunks = _chunkList(candidateNumbers, 100);
    final candidates = <_CollectionImportCandidateRow>[];

    for (final setIdChunk in setIdChunks) {
      for (final numberChunk in numberChunks) {
        final response = await client
            .from('card_prints')
            .select('id,gv_id,name,number,set_id,set_code,sets(name)')
            .inFilter('set_id', setIdChunk)
            .inFilter('number', numberChunk);

        for (final row in response.whereType<Map<String, dynamic>>()) {
          final setRecord = _extractSetRecord(row['sets']);
          final id = (row['id'] ?? '').toString().trim();
          final gvId = (row['gv_id'] ?? '').toString().trim();
          final name = (row['name'] ?? '').toString().trim();
          final number = (row['number'] ?? '').toString().trim();
          final setId = (row['set_id'] ?? '').toString().trim();
          final setName = (setRecord?['name'] ?? '').toString().trim();

          if (id.isEmpty ||
              gvId.isEmpty ||
              name.isEmpty ||
              number.isEmpty ||
              setId.isEmpty ||
              setName.isEmpty) {
            continue;
          }

          candidates.add(
            _CollectionImportCandidateRow(
              id: id,
              gvId: gvId,
              name: name,
              number: number,
              setId: setId,
              setName: setName,
              setCode: row['set_code']?.toString().trim(),
            ),
          );
        }
      }
    }

    return candidates;
  }

  static Future<Map<String, int>> _fetchExistingVaultQuantities({
    required SupabaseClient client,
    required List<_CollectionImportCandidateRow> candidateRows,
  }) async {
    if (candidateRows.isEmpty) {
      return const {};
    }

    final countsByCardId = await VaultCardService.getOwnedCountsByCardPrintIds(
      client: client,
      cardPrintIds: candidateRows.map((row) => row.id).toSet().toList(),
    );

    final quantities = <String, int>{};
    for (final candidate in candidateRows) {
      final existingQty = countsByCardId[candidate.id] ?? 0;
      if (existingQty <= 0) {
        continue;
      }

      final key = _buildMatchKey(
        normalizeImportSetForCompare(candidate.setName),
        normalizeImportNumberForCompare(candidate.number),
        normalizeImportNameForCompare(candidate.name),
      );
      quantities[key] = (quantities[key] ?? 0) + existingQty;
    }

    return quantities;
  }

  static List<_CollectionImportAggregatedRow> _aggregateImportRows(
    List<CollectionImportPreviewRow> rows,
  ) {
    final aggregated = <String, _CollectionImportAggregatedRow>{};

    for (final row in rows) {
      final match = row.match;
      if (match == null) {
        continue;
      }

      final existing = aggregated[match.cardId];
      aggregated[match.cardId] = _CollectionImportAggregatedRow(
        cardPrintId: match.cardId,
        gvId: match.gvId,
        name: match.name,
        setName: match.setName,
        desiredQuantity: (existing?.desiredQuantity ?? 0) + row.desiredQuantity,
        importQuantity: (existing?.importQuantity ?? 0) + row.importQuantity,
        condition: existing?.condition ?? row.row.condition,
        notes: existing?.notes ?? row.row.notes,
      );
    }

    return aggregated.values.toList()
      ..sort((left, right) => left.gvId.compareTo(right.gvId));
  }

  static List<CollectionImportNormalizedRow> _collapseRows(
    List<CollectionImportNormalizedRow> rows,
  ) {
    final collapsed = <String, CollectionImportNormalizedRow>{};
    for (final row in rows) {
      final key = _buildRowKey(row);
      final existing = collapsed[key];
      if (existing == null) {
        collapsed[key] = row;
        continue;
      }
      collapsed[key] = existing.copyWith(
        quantity: existing.quantity + row.quantity,
      );
    }
    return collapsed.values.toList();
  }

  static ({
    List<CollectionImportNormalizedRow> validRows,
    List<CollectionImportNormalizedRow> invalidRows,
  })
  _validateRows(List<CollectionImportNormalizedRow> rows) {
    final validRows = <CollectionImportNormalizedRow>[];
    final invalidRows = <CollectionImportNormalizedRow>[];

    for (final row in rows) {
      if (row.compareSet.isEmpty ||
          row.compareNumber.isEmpty ||
          row.compareName.isEmpty ||
          row.quantity <= 0) {
        invalidRows.add(row);
      } else {
        validRows.add(row);
      }
    }

    return (validRows: validRows, invalidRows: invalidRows);
  }

  static List<CollectionImportNormalizedRow> _reconcileVaultQuantities(
    List<CollectionImportNormalizedRow> rows,
    Map<String, int> existingVault,
  ) {
    return rows
        .map((row) {
          final existingQty = existingVault[_buildRowKey(row)] ?? 0;
          final delta = row.quantity - existingQty;
          if (delta <= 0) {
            return null;
          }
          return row.copyWith(quantity: delta);
        })
        .whereType<CollectionImportNormalizedRow>()
        .toList();
  }

  static List<List<T>> _chunkList<T>(List<T> items, int size) {
    final chunks = <List<T>>[];
    for (var index = 0; index < items.length; index += size) {
      chunks.add(
        items.sublist(
          index,
          index + size > items.length ? items.length : index + size,
        ),
      );
    }
    return chunks;
  }

  static List<List<String>> _parseCsvTable(String csvText) {
    final rows = <List<String>>[];
    var currentRow = <String>[];
    final currentValue = StringBuffer();
    var inQuotes = false;

    for (var index = 0; index < csvText.length; index += 1) {
      final char = csvText[index];
      final nextChar = index + 1 < csvText.length ? csvText[index + 1] : null;

      if (char == '"') {
        if (inQuotes && nextChar == '"') {
          currentValue.write('"');
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char == ',' && !inQuotes) {
        currentRow.add(currentValue.toString());
        currentValue.clear();
        continue;
      }

      if ((char == '\n' || char == '\r') && !inQuotes) {
        if (char == '\r' && nextChar == '\n') {
          index += 1;
        }

        currentRow.add(currentValue.toString());
        if (currentRow.any((value) => value.trim().isNotEmpty)) {
          rows.add(currentRow);
        }
        currentRow = <String>[];
        currentValue.clear();
        continue;
      }

      currentValue.write(char);
    }

    currentRow.add(currentValue.toString());
    if (currentRow.any((value) => value.trim().isNotEmpty)) {
      rows.add(currentRow);
    }

    return rows;
  }

  static _CollectionImportColumnMap _buildColumnMap(List<String> headers) {
    final productName = _findProductNameHeader(headers);
    final set = _findHeader(headers, ['set', 'series']);
    final number = _findHeader(headers, ['card number', 'number']);

    if (productName == null || set == null || number == null) {
      throw Exception(
        'This CSV is missing one or more required Collectr columns: Product Name, Set, or Card Number.',
      );
    }

    return _CollectionImportColumnMap(
      productName: productName,
      set: set,
      number: number,
      condition: _findHeader(headers, ['card condition', 'condition']),
      quantity: _findHeader(headers, ['quantity', 'qty']),
      averageCost: _findHeader(headers, ['average cost', 'cost']),
      dateAdded: _findHeader(headers, ['date added', 'added']),
      notes: _findHeader(headers, ['notes', 'comment']),
    );
  }

  static String? _findProductNameHeader(List<String> headers) {
    final normalizedHeaders = headers
        .map(
          (header) => (original: header, normalized: _normalizeHeader(header)),
        )
        .toList();

    final exactMatch = normalizedHeaders
        .where((header) => header.normalized == 'product name')
        .firstOrNull;
    if (exactMatch != null) {
      return exactMatch.original;
    }

    final safeMatches = normalizedHeaders
        .where(
          (header) =>
              _safeProductNameHeaders.contains(header.normalized) &&
              !_excludedNameHeaders.contains(header.normalized),
        )
        .toList();

    if (safeMatches.length == 1) {
      return safeMatches.first.original;
    }

    if (safeMatches.length > 1) {
      throw Exception(
        'This CSV contains multiple possible product-name columns. Keep the original Collectr Product Name column and remove ambiguity.',
      );
    }

    throw Exception('This CSV is missing the required Product Name column.');
  }

  static String? _findHeader(List<String> headers, List<String> matchers) {
    for (final header in headers) {
      final normalized = _normalizeHeader(header);
      if (matchers.any((matcher) => normalized.contains(matcher))) {
        return header;
      }
    }
    return null;
  }

  static String _normalizeHeader(String value) {
    return value.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  }

  static String _normalizeText(String value) {
    return value.trim().replaceAll(RegExp(r'\s+'), ' ');
  }

  static String _normalizeMatchText(String value) {
    return _normalizeText(value).toLowerCase();
  }

  static String _normalizeCardNumber(String value) {
    return _normalizeText(value).replaceFirst(RegExp(r'^#'), '');
  }

  static String _stripLeadingZeros(String value) {
    final stripped = value.replaceFirst(RegExp(r'^0+(\\d+)$'), r'$1');
    return stripped.isNotEmpty ? stripped : '0';
  }

  static int _parseQuantity(String value) {
    final normalized = _normalizeText(value).replaceAll(',', '');
    final parsed = int.tryParse(normalized);
    return parsed != null && parsed > 0 ? parsed : 1;
  }

  static double? _parseCurrency(String value) {
    final normalized = _normalizeText(value).replaceAll(RegExp(r'[$,]'), '');
    if (normalized.isEmpty) {
      return null;
    }
    return double.tryParse(normalized);
  }

  static String? _parseImportedDate(String value) {
    final normalized = _normalizeText(value);
    if (normalized.isEmpty) {
      return null;
    }

    final isoLike = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(normalized);
    if (isoLike != null) {
      return '${isoLike.group(1)}-${isoLike.group(2)}-${isoLike.group(3)}T00:00:00.000Z';
    }

    final usLike = RegExp(
      r'^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$',
    ).firstMatch(normalized);
    if (usLike != null) {
      final year = (usLike.group(3) ?? '').length == 2
          ? '20${usLike.group(3)}'
          : usLike.group(3)!;
      final month = usLike.group(1)!.padLeft(2, '0');
      final day = usLike.group(2)!.padLeft(2, '0');
      return '$year-$month-${day}T00:00:00.000Z';
    }

    final parsed = DateTime.tryParse(normalized);
    return parsed?.toUtc().toIso8601String();
  }

  static String _normalizeCondition(String value) {
    final normalized = _normalizeMatchText(value);
    return _conditionMap[normalized] ?? 'NM';
  }

  static String _buildRowKey(CollectionImportNormalizedRow row) {
    return '${row.compareSet}|${row.compareNumber}|${row.compareName}';
  }

  static String _buildMatchKey(String setName, String number, String name) {
    return '${_normalizeKeyPart(setName)}||${number.trim()}||${_normalizeKeyPart(name)}';
  }

  static String _normalizeKeyPart(String? value) {
    return (value ?? '').trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
  }

  static Map<String, dynamic>? _extractSetRecord(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is List &&
        value.isNotEmpty &&
        value.first is Map<String, dynamic>) {
      return value.first as Map<String, dynamic>;
    }
    return null;
  }

  static String decodeCsvBytes(List<int> bytes) {
    try {
      return utf8.decode(bytes);
    } catch (_) {
      return latin1.decode(bytes);
    }
  }
}

class _CollectionImportColumnMap {
  const _CollectionImportColumnMap({
    required this.productName,
    required this.set,
    required this.number,
    this.condition,
    this.quantity,
    this.averageCost,
    this.dateAdded,
    this.notes,
  });

  final String productName;
  final String set;
  final String number;
  final String? condition;
  final String? quantity;
  final String? averageCost;
  final String? dateAdded;
  final String? notes;
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
