import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../vault/vault_card_service.dart';
import '../public/jungle_edition_resolution_service.dart';
import 'collection_import_mtg_identity.dart';
import 'collection_import_pokemon_name.dart';
import 'collection_import_named_finish.dart';
import 'collection_import_set_scope.dart';

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
    this.rawGame = '',
    this.rawFinish = '',
    this.rawGrade = '',
    this.rawPortfolio = '',
    this.rawWatchlist = '',
    this.sourceFields = const {},
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
  final String rawGame;
  final String rawFinish;
  final String rawGrade;
  final String rawPortfolio;
  final String rawWatchlist;
  // Original columns, including fields this version cannot yet save.
  final Map<String, String> sourceFields;
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
    this.gameCode = '',
    this.displayGame = '',
    this.finish = '',
    this.grade = '',
    this.portfolio = '',
    this.watchlist = false,
    this.sourceFields = const {},
    this.sourceRows = const [],
    this.sourceRecords = const [],
    this.reviewReasons = const [],
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
  final String gameCode;
  final String displayGame;
  final String finish;
  final String grade;
  final String portfolio;
  final bool watchlist;
  final Map<String, String> sourceFields;
  final List<int> sourceRows;
  final List<CollectionImportParsedRow> sourceRecords;
  final List<String> reviewReasons;

  CollectionImportNormalizedRow copyWith({
    int? quantity,
    List<int>? sourceRows,
    List<CollectionImportParsedRow>? sourceRecords,
  }) {
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
      gameCode: gameCode,
      displayGame: displayGame,
      finish: finish,
      grade: grade,
      portfolio: portfolio,
      watchlist: watchlist,
      sourceFields: sourceFields,
      sourceRows: sourceRows ?? this.sourceRows,
      sourceRecords: sourceRecords ?? this.sourceRecords,
      reviewReasons: reviewReasons,
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
    this.reviewReasons = const [],
    this.cardPrintingId,
    this.cardPrintingFinishKey,
  });

  final CollectionImportNormalizedRow row;
  final CollectionImportMatchStatus status;
  final String compareKey;
  final int desiredQuantity;
  final int importQuantity;
  final CollectionImportCardMatch? match;
  final List<CollectionImportCardMatch> matches;
  final List<String> reviewReasons;
  final String? cardPrintingId;
  final String? cardPrintingFinishKey;
  bool get canImport =>
      status == CollectionImportMatchStatus.matched &&
      reviewReasons.isEmpty &&
      row.reviewReasons.isEmpty;
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
    this.sourceQuantity = 0,
    this.rowsAlreadyOwned = 0,
  });

  final int rowsRead;
  final int rowsCollapsed;
  final int rowsValid;
  final int rowsInvalid;
  final int rowsMatched;
  final int rowsMissing;
  final int sourceQuantity;
  final int rowsAlreadyOwned;
}

class CollectionImportPreview {
  const CollectionImportPreview({
    required this.rows,
    required this.summary,
    required this.report,
    required this.ownerUserId,
  });

  final List<CollectionImportPreviewRow> rows;
  final CollectionImportPreviewSummary summary;
  final CollectionImportReport report;
  final String ownerUserId;
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
    this.game = '',
  });

  final String id;
  final String name;
  final String? code;
  final String game;
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
    this.game = '',
    this.identityCard = const {},
  });

  final String id;
  final String gvId;
  final String name;
  final String number;
  final String setId;
  final Map<String, dynamic> identityCard;
  final String setName;
  final String? setCode;
  final String game;
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
    this.cost,
    this.added,
    this.notes,
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String setName;
  final int desiredQuantity;
  final int importQuantity;
  final String condition;
  final double? cost;
  final String? added;
  final String? notes;
}

class CollectionImportFailure implements Exception {
  const CollectionImportFailure(this.message);
  final String message;
  @override
  String toString() => message;
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

  // Explicit Collectr labels reconciled with current catalog set names.
  // No fuzzy set-name inference or language substitution.
  static const Map<String, Map<String, String>> _gameSetAliases = {
    'mtg': {
      'universes beyond: final fantasy': 'final fantasy',
      'commander: final fantasy': 'final fantasy commander',
      'universes beyond: final fantasy: through the ages':
          'final fantasy: through the ages',
      'avatar: the last airbender: eternal-legal':
          'avatar: the last airbender eternal',
    },
    'pokemon': {
      'sv: 151': '151',
      'scarlet & violet base set': 'scarlet & violet',
      'sword & shield base set': 'sword & shield',
      'sun & moon base set': 'sun & moon',
      'crown zenith: galarian gallery': 'crown zenith galarian gallery',
      'ex holon phantoms': 'holon phantoms',
      'ex power keepers': 'power keepers',
      'sword & shield promo': 'swsh black star promos',
      'sun & moon promo': 'sm black star promos',
      'scarlet & violet promo': 'scarlet & violet black star promos',
      'xy promos': 'xy black star promos',
      'wotc promo': 'wizards black star promos',
      'pokemon go': 'pokémon go',
      'xy base set': 'xy',
      'ex delta species': 'delta species',
      'ex emerald': 'emerald',
      'ex ruby & sapphire': 'ruby & sapphire',
      'ex sandstorm': 'sandstorm',
      'ex team magma vs team aqua': 'team magma vs team aqua',
      'black and white promos': 'bw black star promos',
      'diamond and pearl promos': 'dp black star promos',
      'nintendo promos': 'nintendo black star promos',
      'hgss promos': 'hgss black star promos',
      'platinum arceus': 'arceus',
      'undaunted': 'hs—undaunted',
      'expedition': 'expedition base set',
      'rumble': 'pokémon rumble',
      'shining fates: shiny vault': 'shining fates shiny vault',
      "mcdonald's 25th anniversary promos": "mcdonald's collection 2021",
      "mcdonald's promos 2022": "mcdonald's collection 2022",
      "mcdonald's promos 2024": "mcdonald's collection 2024",
    },
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

  static Future<CollectionImportPreview> buildPreview({
    required SupabaseClient client,
    required String csvText,
    bool sourceAware = false,
  }) async {
    final ownerUserId = client.auth.currentUser?.id;
    if (ownerUserId == null) {
      throw const CollectionImportFailure('Sign in before choosing a CSV.');
    }
    final normalizedRows = parseCollectrCsv(csvText).map(normalizeRow).toList();
    final collapsedRows = _collapseRows(normalizedRows);
    final validRows = collapsedRows
        .where((row) => row.reviewReasons.isEmpty)
        .toList();
    final setRows = validRows.isEmpty
        ? <_CollectionImportSetRow>[]
        : await _fetchAllSets(client);
    final setNameMap = <String, List<_CollectionImportSetRow>>{};
    for (final setRow in setRows) {
      final key = normalizeImportSetForCompare(setRow.name);
      (setNameMap[key] ??= []).add(setRow);
    }
    final candidates = await _fetchCandidateRows(
      client: client,
      rows: validRows,
      setNameMap: setNameMap,
      sourceAware: sourceAware,
    );
    // Import rows have no collector-confirmed edition selection yet. Keep all
    // governed candidates for review, including an apparently unique edition.
    final editionReview = <String, String>{};
    for (final card in candidates.where((card) => card.setCode == 'base2')) {
      try {
        final edition = await getJungleEditionResolution(client, card.id);
        if (edition.status != 'not_applicable') {
          editionReview[card.id] = edition.status == 'unavailable'
              ? 'Jungle edition choices are being reviewed. This row is not imported; keep the original CSV.'
              : 'Confirm First Edition or Unlimited on the physical card. This row is kept for review; automatic edition import is not available yet.';
        }
      } catch (_) {
        editionReview[card.id] =
            'Jungle edition choices could not be checked. Choose the CSV again to retry; this row is not imported.';
      }
    }
    final byKey = <String, List<_CollectionImportCandidateRow>>{};
    for (final card in candidates) {
      final key = _buildMatchKey(
        normalizeImportSetForCompare(card.setName),
        normalizeImportNumberForCompare(card.number),
        normalizeImportNameForCompare(card.name),
      );
      (byKey[key] ??= []).add(card);
    }
    final byCoordinate = <String, List<_CollectionImportCandidateRow>>{};
    for (final card in candidates.where(
      (card) => ['mtg', 'pokemon'].contains(card.game),
    )) {
      final key = _buildMatchKey(
        normalizeImportSetForCompare(card.setName),
        normalizeImportNumberForCompare(card.number),
        '',
      );
      (byCoordinate[key] ??= []).add(card);
    }
    List<_CollectionImportCandidateRow> treatmentCandidates(
      CollectionImportNormalizedRow row,
    ) => sourceAware && row.gameCode == 'mtg'
        ? _matchingSetKeys(row, sourceAware)
              .expand(
                (key) =>
                    byCoordinate[_buildMatchKey(key, row.compareNumber, '')] ??
                    <_CollectionImportCandidateRow>[],
              )
              .where((card) => card.game == 'mtg')
              .toList()
        : [];
    final identityIds = <String>{};
    for (final row in validRows) {
      for (final card in treatmentCandidates(row)) {
        if (row.compareName != normalizeImportNameForCompare(card.name)) {
          identityIds.add(card.id);
        }
      }
    }
    final identities = <String, List<Map<String, dynamic>>>{};
    for (final chunk in _chunkList(identityIds.toList()..sort(), 100)) {
      final records = await _readCatalogPages((after) {
        var query = client
            .from('card_print_identity')
            .select(
              'id,card_print_id,identity_domain,identity_key_version,is_active,set_code_identity,printed_number,identity_payload',
            )
            .inFilter('card_print_id', chunk)
            .eq('is_active', true);
        if (after != null) query = query.gt('id', after);
        return query.order('id', ascending: true).limit(500);
      });
      for (final identity in records) {
        if (!chunk.contains(identity['card_print_id'])) {
          throw const CollectionImportFailure(
            'Catalog identity matching was interrupted. Choose the CSV again to retry.',
          );
        }
        (identities[identity['card_print_id'] as String] ??= []).add(identity);
      }
    }
    final matchCache =
        <CollectionImportNormalizedRow, List<_CollectionImportCandidateRow>>{};
    List<_CollectionImportCandidateRow> matchesFor(
      CollectionImportNormalizedRow row,
    ) => matchCache.putIfAbsent(row, () {
      final exact = _matchingSetKeys(row, sourceAware)
          .expand(
            (key) =>
                byKey[_buildMatchKey(
                  key,
                  row.compareNumber,
                  row.compareName,
                )] ??
                <_CollectionImportCandidateRow>[],
          )
          .where((card) => row.gameCode.isEmpty || card.game == row.gameCode)
          .toList();
      final namedFinish = sourceAware && row.gameCode == 'pokemon'
          ? collectrPokemonNamedFinish(row.displayName)
          : null;
      final result = {
        for (final card in exact)
          if (namedFinish == null ||
              matchesCollectrPokemonName(
                sourceName: namedFinish.name,
                sourceNumber: row.displayNumber,
                game: row.gameCode,
                card: card.identityCard,
              ))
            card.id: card,
      };
      if (sourceAware && row.gameCode == 'pokemon') {
        for (final card in _matchingSetKeys(row, sourceAware).expand(
          (key) =>
              byCoordinate[_buildMatchKey(key, row.compareNumber, '')] ??
              <_CollectionImportCandidateRow>[],
        )) {
          if (card.game == 'pokemon' &&
              matchesCollectrPokemonName(
                sourceName: namedFinish?.name ?? row.displayName,
                sourceNumber: row.displayNumber,
                game: row.gameCode,
                card: card.identityCard,
              )) {
            result[card.id] = card;
          }
        }
      }
      for (final card in treatmentCandidates(row)) {
        if (matchesCollectrMtgIdentity(
          sourceName: row.displayName,
          sourceNumber: row.displayNumber,
          sourceFinishKey: importFinishKey(row.finish),
          game: row.gameCode,
          card: card.identityCard,
          identities: identities[card.id] ?? [],
        )) {
          result[card.id] = card;
        }
      }
      return result.values.toList();
    });
    // The legacy writer accepts only one metadata group per canonical parent.
    // Keep conflicting groups visible; never pick the first group's cost/grade.
    final groupsByCard = <String, Set<String>>{};
    for (final row in validRows) {
      final matches = matchesFor(row);
      if (matches.length == 1) {
        (groupsByCard[matches.single.id] ??= {}).add(_buildRowKey(row));
      }
    }
    final eligibleParentIds = <String>{};
    for (final row in validRows) {
      final matches = matchesFor(row);
      if (matches.length == 1 &&
          !editionReview.containsKey(matches.single.id) &&
          groupsByCard[matches.single.id]!.length == 1 &&
          _unsupportedSaveReasons(row).isEmpty) {
        eligibleParentIds.add(matches.single.id);
      }
    }
    final owned = sourceAware
        ? <String, int>{}
        : await VaultCardService.getOwnedCountsIncludingSlabs(
            client: client,
            cardPrintIds: eligibleParentIds,
          );
    final printingOptions = sourceAware
        ? await _fetchImportPrintings(
            client,
            validRows
                .map(matchesFor)
                .expand((matches) => matches.map((match) => match.id))
                .where((id) => !editionReview.containsKey(id)),
          )
        : <Map<String, dynamic>>[];
    final printingsByParent = <String, List<Map<String, dynamic>>>{};
    for (final option in printingOptions) {
      if (option['finish_is_active'] == true) {
        (printingsByParent[option['card_print_id'] as String] ??= []).add(
          option,
        );
      }
    }
    final previewRows = <CollectionImportPreviewRow>[];
    var alreadyOwned = 0;
    for (final row in collapsedRows) {
      var matches = row.reviewReasons.isEmpty
          ? matchesFor(row)
          : <_CollectionImportCandidateRow>[];
      final namedFinish = sourceAware && row.gameCode == 'pokemon'
          ? collectrPokemonNamedFinish(row.displayName)
          : null;
      final requestedFinish =
          namedFinish?.finishKey ?? importFinishKey(row.finish);
      if (sourceAware && matches.length > 1 && requestedFinish != null) {
        // Compare the explicit finish before declaring parent ambiguity. Missing
        // printing evidence cannot rule out a competing identity. Never prefer
        // an unstamped/default parent, or infer a finish from rarity or artwork.
        final compatible = matches.where((card) {
          final options = printingsByParent[card.id] ?? [];
          return options.isEmpty ||
              options.any((option) => option['finish_key'] == requestedFinish);
        }).toList();
        // Keep all candidates available for review when none supports the
        // finish; absence of a printing is not absence of the source card.
        if (compatible.isNotEmpty) matches = compatible;
      }
      final reasons = <String>[
        ...row.reviewReasons,
        ..._unsupportedSaveReasons(row, sourceAware: sourceAware),
        ...matches
            .map((card) => editionReview[card.id])
            .whereType<String>()
            .toSet(),
      ];
      String? printingId;
      String? printingFinishKey;
      if (sourceAware &&
          matches.length == 1 &&
          !editionReview.containsKey(matches.single.id) &&
          (row.finish.trim().isEmpty || requestedFinish != null)) {
        final options = (printingsByParent[matches.single.id] ?? [])
            .where(
              (option) =>
                  (requestedFinish == null ||
                  option['finish_key'] == requestedFinish),
            )
            .toList();
        if (options.length == 1) {
          printingId = options.single['id'] as String;
          printingFinishKey = options.single['finish_key'] as String;
        } else {
          reasons.add(
            options.isEmpty
                ? 'This row has no verified catalog printing yet.'
                : 'More than one printing matches. Specify the finish or keep this row for review.',
          );
        }
      }
      if (!sourceAware &&
          matches.length == 1 &&
          groupsByCard[matches.single.id]!.length > 1) {
        reasons.add(
          'Different source rows describe this card. Keep their finishes, grades and purchase details separate before saving.',
        );
      }
      final status = matches.length == 1
          ? CollectionImportMatchStatus.matched
          : matches.length > 1
          ? CollectionImportMatchStatus.multiple
          : CollectionImportMatchStatus.missing;
      var quantity = row.quantity;
      if (!sourceAware && matches.length == 1 && reasons.isEmpty) {
        quantity = (row.quantity - (owned[matches.single.id] ?? 0)).clamp(
          0,
          row.quantity,
        );
        if (quantity == 0) {
          alreadyOwned += row.sourceRows.length;
          continue;
        }
      }
      if (matches.isEmpty && row.reviewReasons.isEmpty) {
        reasons.add(
          'No exact catalog match for this game, set, number and name.',
        );
      }
      if (matches.length > 1) {
        reasons.add(
          'Multiple catalog identities match. A printing or language must be selected.',
        );
      }
      CollectionImportCardMatch convert(_CollectionImportCandidateRow card) =>
          CollectionImportCardMatch(
            cardId: card.id,
            gvId: card.gvId,
            name: card.name,
            setName: card.setName,
            number: card.number,
            setCode: card.setCode,
          );
      previewRows.add(
        CollectionImportPreviewRow(
          row: row,
          status: status,
          compareKey: _buildRowKey(row),
          desiredQuantity: row.quantity,
          importQuantity: quantity,
          match: matches.length == 1 ? convert(matches.single) : null,
          matches: matches.map(convert).toList(),
          reviewReasons: reasons,
          cardPrintingId: printingId,
          cardPrintingFinishKey: printingFinishKey,
        ),
      );
    }
    if (client.auth.currentUser?.id != ownerUserId) {
      throw const CollectionImportFailure(
        'Your account changed. Choose the CSV again for the signed-in account.',
      );
    }
    final ready = previewRows.where((row) => row.canImport).length;
    final multiple = previewRows
        .where((row) => row.status == CollectionImportMatchStatus.multiple)
        .length;
    return CollectionImportPreview(
      ownerUserId: ownerUserId,
      rows: previewRows,
      summary: CollectionImportPreviewSummary(
        totalRows: previewRows.length,
        matchedRows: ready,
        multipleRows: multiple,
        unmatchedRows: previewRows.length - ready - multiple,
      ),
      report: CollectionImportReport(
        rowsRead: normalizedRows.length,
        rowsCollapsed: collapsedRows.length,
        rowsValid: validRows.length,
        rowsInvalid: collapsedRows.length - validRows.length,
        rowsMatched: ready,
        rowsMissing: previewRows.length - ready,
        sourceQuantity: normalizedRows.fold(
          0,
          (total, row) => total + (row.quantity > 0 ? row.quantity : 0),
        ),
        rowsAlreadyOwned: alreadyOwned,
      ),
    );
  }

  static List<String> _unsupportedSaveReasons(
    CollectionImportNormalizedRow row, {
    bool sourceAware = false,
  }) => [
    if (!sourceAware && row.finish.trim().isNotEmpty)
      'Finish: ${row.finish}. This import cannot yet save this finish; the row is kept for review.',
    if (row.grade.trim().isNotEmpty &&
        row.grade.trim().toLowerCase() != 'ungraded')
      'Grade: ${row.grade}. Keep the grade for review; do not import this as an ungraded card.',
    if (!sourceAware && row.portfolio.trim().isNotEmpty)
      'Portfolio: ${row.portfolio}. This import cannot yet preserve portfolio membership.',
    if (sourceAware &&
        row.finish.trim().isNotEmpty &&
        importFinishKey(row.finish) == null)
      'Finish: ${row.finish}. This finish needs review before saving.',
    if (sourceAware &&
        row.gameCode == 'pokemon' &&
        collectrPokemonNamedFinish(row.displayName) != null &&
        !collectrNamedFinishVarianceAgrees(row.finish))
      'The named finish conflicts with the Variance column; keep the original row for review.',
    if (sourceAware &&
        RegExp(
          r'1st edition|shadowless|unlimited',
          caseSensitive: false,
        ).hasMatch(row.displaySet))
      'This edition needs a verified printing identity before saving.',
    if (sourceAware && row.quantity > 50000)
      'Quantity exceeds the import limit.',
    if (sourceAware && (row.notes?.length ?? 0) > 4000)
      'Notes exceed the import limit; the original text is kept for review.',
    if (sourceAware) ..._sourceAwareValueReasons(row),
    for (final entry in row.sourceFields.entries)
      if (entry.value.trim().isNotEmpty &&
          !_supportedSourceColumn(entry.key) &&
          !(_normalizeHeader(entry.key) == 'price override' &&
              RegExp(r'^0(?:\.0+)?$').hasMatch(entry.value.trim())))
        'Column "${entry.key}" needs review so its value is not lost.',
  ];

  static List<String> _sourceAwareValueReasons(
    CollectionImportNormalizedRow row,
  ) {
    final reasons = <String>{};
    for (final source in row.sourceRecords) {
      final quantity = source.rawQuantity.trim().replaceAll(',', '');
      final cost = source.rawCost.trim().replaceAll(RegExp(r'[$,]'), '');
      final date = source.rawDate.trim();
      if (RegExp(r'T\d{2}:\d{2}:\d{2}\.\d{7,}').hasMatch(date)) {
        reasons.add(
          'Date precision exceeds six fractional digits; keep the original for review.',
        );
      }
      if (quantity.isNotEmpty && !RegExp(r'^\d+$').hasMatch(quantity)) {
        reasons.add('Quantity needs a positive whole number.');
      }
      if (cost.isNotEmpty &&
          !RegExp(r'^(?:\d+(?:\.\d*)?|\.\d+)$').hasMatch(cost)) {
        reasons.add('Purchase cost needs a decimal amount.');
      }
      if (date.isNotEmpty &&
          !RegExp(
            r'^(?:\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/(?:\d{2}|\d{4})|\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2}))$',
          ).hasMatch(date)) {
        reasons.add(
          'Date needs a calendar date or a timestamp with its time zone.',
        );
      }
    }
    return reasons.toList();
  }

  static String? importFinishKey(String value) => const {
    'normal': 'normal',
    'holo': 'holo',
    'holofoil': 'holo',
    'reverse holo': 'reverse',
    'reverse holofoil': 'reverse',
    'foil': 'foil',
  }[_normalizeMatchText(value)];

  static Future<List<Map<String, dynamic>>> _fetchImportPrintings(
    SupabaseClient client,
    Iterable<String> parents,
  ) async {
    final ids = parents.toSet().toList()..sort();
    final result = <Map<String, dynamic>>[];
    final seen = <String>{};
    for (var start = 0; start < ids.length; start += 100) {
      final chunk = ids.sublist(start, (start + 100).clamp(0, ids.length));
      var offset = 0;
      while (true) {
        final raw = await client.rpc(
          'get_public_card_printing_options_v1',
          params: {
            'p_card_print_ids': chunk,
            'p_limit': 1000,
            'p_offset': offset,
          },
        );
        if (raw is! List) {
          throw const CollectionImportFailure(
            'Printing data could not be checked. Choose the CSV again.',
          );
        }
        if (raw.isEmpty) break;
        for (final value in raw) {
          if (value is! Map ||
              value['id'] is! String ||
              !seen.add(value['id'] as String) ||
              !chunk.contains(value['card_print_id'])) {
            throw const CollectionImportFailure(
              'Printing data was incomplete. Choose the CSV again.',
            );
          }
          result.add(Map<String, dynamic>.from(value));
        }
        offset += raw.length;
      }
    }
    return result;
  }

  static bool _supportedSourceColumn(String value) {
    final header = _normalizeHeader(value);
    // Market snapshots and rarity are source evidence, never acquisition cost
    // or permission to replace canonical pricing/identity.
    return const {
          'product name',
          'card name',
          'set',
          'series',
          'card number',
          'number',
          'card condition',
          'condition',
          'quantity',
          'qty',
          'average cost paid',
          'average cost',
          'cost',
          'date added',
          'added',
          'notes',
          'comment',
          'category',
          'game',
          'variance',
          'finish',
          'grade',
          'portfolio name',
          'collection name',
          'watchlist',
          'rarity',
        }.contains(header) ||
        header.startsWith('market price');
  }

  static Future<CollectionImportResult> importPreview({
    required SupabaseClient client,
    required CollectionImportPreview preview,
  }) async {
    final userId = client.auth.currentUser?.id;
    if (userId == null || userId != preview.ownerUserId) {
      throw const CollectionImportFailure(
        'Your account changed. Choose the CSV again for the signed-in account.',
      );
    }
    if (preview.rows.any(
      (row) => row.canImport && _unsupportedSaveReasons(row.row).isNotEmpty,
    )) {
      throw const CollectionImportFailure(
        'Some source details cannot be saved by this import. Choose the CSV again and review those rows.',
      );
    }
    final rows = _aggregateImportRows(
      preview.rows.where((row) => row.canImport).toList(),
    );
    final needsReview = preview.rows.where((row) => !row.canImport).length;
    if (rows.isEmpty) {
      return CollectionImportResult(
        importedCards: 0,
        importedEntries: 0,
        needsManualMatch: needsReview,
        skippedRows: needsReview,
      );
    }
    const uncertain = CollectionImportFailure(
      'We could not confirm the import. Some cards may already be saved. '
      'Retry this import to check the saved quantities and add only missing copies. '
      'If you close this screen, choose the same CSV again.',
    );
    try {
      final response = await client.functions.invoke(
        'vault-import-targets-v1',
        body: {
          'ownerUserId': userId,
          'rows': rows
              .map(
                (row) => {
                  'cardId': row.cardPrintId,
                  'gvId': row.gvId,
                  'desiredQuantity': row.desiredQuantity,
                  'condition': row.condition,
                  'acquisitionCost': row.cost,
                  'createdAt': row.added,
                  'notes': row.notes,
                },
              )
              .toList(),
        },
      );
      final data = response.data;
      if (response.status != 200 ||
          data is! Map ||
          data['success'] != true ||
          data['importedCards'] is! int ||
          data['importedEntries'] is! int ||
          data['targets'] is! List) {
        throw uncertain;
      }
      final importedCards = data['importedCards'] as int;
      final importedEntries = data['importedEntries'] as int;
      if (importedCards < 0 ||
          importedCards >
              rows.fold<int>(0, (sum, row) => sum + row.desiredQuantity) ||
          importedEntries < 0 ||
          importedEntries > rows.length) {
        throw uncertain;
      }
      final desired = {
        for (final row in rows) row.cardPrintId: row.desiredQuantity,
      };
      final targets = <String, int>{};
      for (final raw in data['targets'] as List) {
        if (raw is! Map ||
            raw['cardPrintId'] is! String ||
            raw['expectedCount'] is! int) {
          throw uncertain;
        }
        final id = raw['cardPrintId'] as String;
        final count = raw['expectedCount'] as int;
        if (!desired.containsKey(id) ||
            targets.containsKey(id) ||
            count < desired[id]!) {
          throw uncertain;
        }
        targets[id] = count;
      }
      if (targets.length != rows.length ||
          client.auth.currentUser?.id != userId) {
        throw uncertain;
      }
      final counts = await VaultCardService.getOwnedCountsIncludingSlabs(
        client: client,
        cardPrintIds: targets.keys,
      );
      if (client.auth.currentUser?.id != userId ||
          targets.entries.any((entry) => counts[entry.key] != entry.value)) {
        throw uncertain;
      }
      if (importedCards > 0) {
        await _emitVaultImportSummary(
          client: client,
          userId: userId,
          importedCards: importedCards,
          importedEntries: importedEntries,
          needsManualMatch: needsReview,
          skippedRows: needsReview,
          source: 'flutter_collection_import',
        );
      }
      return CollectionImportResult(
        importedCards: importedCards,
        importedEntries: importedEntries,
        needsManualMatch: needsReview,
        skippedRows: needsReview,
      );
    } on FunctionException catch (error) {
      final details = error.details;
      if (details is Map && details['error'] == 'import_account_changed') {
        throw const CollectionImportFailure(
          'Your account changed. Choose the CSV again for the signed-in account.',
        );
      }
      if (details is Map && details['error'] == 'vault_paused') {
        throw const CollectionImportFailure(
          'Vault imports are temporarily paused. Keep this CSV and retry when imports reopen.',
        );
      }
      if (error.status == 401) {
        throw const CollectionImportFailure(
          'Sign in again, then choose the same CSV to check saved quantities.',
        );
      }
      throw uncertain;
    } on CollectionImportFailure {
      rethrow;
    } catch (_) {
      throw uncertain;
    }
  }

  static Future<void> _emitVaultImportSummary({
    required SupabaseClient client,
    required String userId,
    required int importedCards,
    required int importedEntries,
    required int needsManualMatch,
    required int skippedRows,
    required String source,
  }) async {
    try {
      final importRunId =
          '${source}_${DateTime.now().toUtc().microsecondsSinceEpoch}';
      await client.rpc(
        'card_events_emit_vault_import_summary_v1',
        params: {
          'p_user_id': userId,
          'p_import_run_id': importRunId,
          'p_payload': {
            'source': source,
            'import_run_id': importRunId,
            'imported_cards': importedCards,
            'imported_entries': importedEntries,
            'needs_manual_match': needsManualMatch,
            'skipped_rows': skippedRows,
          },
        },
      );
    } catch (_) {
      // Import completion should never be rolled back by interest telemetry.
    }
  }

  static List<CollectionImportParsedRow> parseCollectrCsv(String csvText) {
    final table = _parseCsvTable(csvText);
    if (table.length < 2) {
      throw Exception('This CSV does not contain any collection rows.');
    }

    final headers = table.first
        .map((header) => header.replaceFirst('\ufeff', '').trim())
        .toList();
    if (headers.map(_normalizeHeader).toSet().length != headers.length ||
        headers.any((header) => header.isEmpty)) {
      throw const CollectionImportFailure(
        'The CSV has duplicate or empty column names. Keep the original Collectr headers.',
      );
    }
    final columnMap = _buildColumnMap(headers);

    return table.sublist(1).asMap().entries.map((entry) {
      final rowIndex = entry.key;
      final cells = entry.value;
      if (cells.length > headers.length) {
        throw CollectionImportFailure(
          'CSV row ${rowIndex + 2} has more values than column headers. Check its quoting before importing.',
        );
      }
      final raw = <String, String>{
        for (var headerIndex = 0; headerIndex < headers.length; headerIndex++)
          headers[headerIndex]: (cells.length > headerIndex
              ? cells[headerIndex]
              : ''),
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
        rawGame: _sourceValue(raw, ['category', 'game']),
        rawFinish: _sourceValue(raw, ['variance', 'finish']),
        rawGrade: _sourceValue(raw, ['grade']),
        rawPortfolio: _sourceValue(raw, ['portfolio name', 'collection name']),
        rawWatchlist: _sourceValue(raw, ['watchlist']),
        sourceFields: Map.unmodifiable(raw),
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
    final gameCode = normalizeImportGame(row.rawGame);
    final quantity = _parseQuantity(row.rawQuantity);
    final cost = _parseCurrency(row.rawCost);
    final added = _parseImportedDate(row.rawDate);
    final reasons = <String>[
      if (normalizedName.isEmpty) 'Product name is missing.',
      if (normalizedSet.isEmpty) 'Set is missing.',
      if (normalizedNumber.isEmpty)
        'No card number. Identify this product before importing; it may be a sealed product or a numberless card.',
      if (quantity <= 0) 'Quantity must be a positive whole number.',
      if (row.rawGame.trim().isNotEmpty && gameCode.isEmpty)
        'This game is not supported by the card importer.',
      if (row.rawCondition.trim().isNotEmpty &&
          !_conditionMap.containsKey(_normalizeMatchText(row.rawCondition)))
        'Card condition is not recognized.',
      if (row.rawCost.trim().isNotEmpty &&
          (cost == null || !cost.isFinite || cost < 0))
        'Purchase cost is not a valid nonnegative amount.',
      if (row.rawDate.trim().isNotEmpty && added == null)
        'Date added is not a valid date.',
      if (![
        '',
        'false',
        'true',
      ].contains(_normalizeMatchText(row.rawWatchlist)))
        'Watchlist value is not recognized.',
      if (_normalizeMatchText(row.rawWatchlist) == 'true')
        'Watchlist item; not counted as owned.',
    ];

    return CollectionImportNormalizedRow(
      sourceRow: row.sourceRow,
      displayName: displayName.isEmpty ? 'Unknown card' : displayName,
      displaySet: displaySet.isEmpty ? 'Unknown set' : displaySet,
      displayNumber: displayNumber.isEmpty ? '—' : displayNumber,
      name: normalizedName,
      set: normalizedSet,
      number: normalizedNumber,
      compareName: normalizeImportNameForCompare(row.rawName),
      compareSet: normalizeImportSetForCompare(row.rawSet, gameCode: gameCode),
      compareNumber: normalizeImportNumberForCompare(row.rawNumber),
      quantity: quantity,
      condition: _normalizeCondition(row.rawCondition),
      cost: cost,
      added: added,
      notes: _normalizeText(row.rawNotes).isEmpty ? null : row.rawNotes,
      gameCode: gameCode,
      displayGame: row.rawGame,
      finish: row.rawFinish,
      grade: row.rawGrade,
      portfolio: row.rawPortfolio,
      watchlist: _normalizeMatchText(row.rawWatchlist) == 'true',
      sourceFields: row.sourceFields,
      sourceRows: [row.sourceRow],
      sourceRecords: [row],
      reviewReasons: reasons,
    );
  }

  static String normalizeImportSetForCompare(
    String value, {
    String gameCode = '',
  }) {
    final normalized = _normalizeMatchText(value);
    return _gameSetAliases[gameCode]?[normalized] ??
        _setAliasMap[normalized] ??
        normalized;
  }

  static String normalizeImportGame(String value) =>
      const {
        'pokemon': 'pokemon',
        'pokémon': 'pokemon',
        'pokémon tcg': 'pokemon',
        'magic: the gathering': 'mtg',
        'magic the gathering': 'mtg',
        'mtg': 'mtg',
        'gundam': 'gundam',
        'gundam card game': 'gundam',
        'one piece': 'one_piece',
        'one piece card game': 'one_piece',
        'yu-gi-oh!': 'yugioh',
        'yu-gi-oh': 'yugioh',
      }[_normalizeMatchText(value)] ??
      '';

  static String _sourceValue(Map<String, String> fields, List<String> names) {
    for (final name in names) {
      for (final entry in fields.entries) {
        if (name == _normalizeHeader(entry.key)) return entry.value;
      }
    }
    return '';
  }

  static String normalizeImportNameForCompare(String value) {
    // Art/cheek/edition labels can distinguish physical identities. Keep them
    // until a catalog-aware treatment resolver can prove the exact candidate.
    return _normalizeMatchText(value);
  }

  static String normalizeImportNumberForCompare(String value) {
    final normalized = _normalizeCardNumber(value);
    if (normalized.isEmpty) {
      return '';
    }
    final leftSide = normalized.split('/').first.trim();
    final numbered = RegExp(
      r'^([A-Za-z]*)(\d+)([A-Za-z]*)$',
    ).firstMatch(leftSide);
    if (numbered != null) {
      return '${numbered.group(1)!.toUpperCase()}${_stripLeadingZeros(numbered.group(2)!)}${numbered.group(3)!.toUpperCase()}';
    }
    return leftSide.toUpperCase();
  }

  static Future<List<_CollectionImportSetRow>> _fetchAllSets(
    SupabaseClient client,
  ) async {
    final records = await _readCatalogPages((after) {
      var query = client.from('sets').select('id,name,code,game');
      if (after != null) query = query.gt('id', after);
      return query.order('id', ascending: true).limit(500);
    });
    return records
        .map(
          (row) => _CollectionImportSetRow(
            id: (row['id'] ?? '').toString(),
            name: (row['name'] ?? '').toString(),
            code: row['code']?.toString(),
            game: (row['game'] ?? '').toString(),
          ),
        )
        .where((row) => row.id.isNotEmpty && row.name.trim().isNotEmpty)
        .toList();
  }

  static Future<List<Map<String, dynamic>>> _readCatalogPages(
    Future<List<Map<String, dynamic>>> Function(String? after) fetch,
  ) async {
    final result = <Map<String, dynamic>>[];
    String? after;
    while (true) {
      final page = await fetch(after);
      if (page.isEmpty) return result;
      for (final row in page) {
        final id = row['id'];
        if (id is! String ||
            id.isEmpty ||
            (after != null && id.compareTo(after) <= 0)) {
          throw const CollectionImportFailure(
            'Catalog matching was interrupted. Choose the CSV again to retry; no collection changes were made.',
          );
        }
        after = id;
        result.add(row);
      }
      // Continue through an empty page, even when the server caps a page below 500.
    }
  }

  static List<String> _matchingSetKeys(
    CollectionImportNormalizedRow row,
    bool sourceAware,
  ) => sourceAware
      ? collectrSetTargets(row.compareSet, row.gameCode, row.compareNumber)
      : [row.compareSet];

  static Future<List<_CollectionImportCandidateRow>> _fetchCandidateRows({
    required SupabaseClient client,
    required List<CollectionImportNormalizedRow> rows,
    required Map<String, List<_CollectionImportSetRow>> setNameMap,
    required bool sourceAware,
  }) async {
    final sets = <String, _CollectionImportSetRow>{};
    for (final row in rows) {
      for (final set in _matchingSetKeys(
        row,
        sourceAware,
      ).expand((key) => setNameMap[key] ?? <_CollectionImportSetRow>[])) {
        if (row.gameCode.isEmpty || row.gameCode == set.game) {
          sets[set.id] = set;
        }
      }
    }
    final numbers = rows.map((row) => row.compareNumber).toSet();
    final candidates = <_CollectionImportCandidateRow>[];
    for (final chunk in _chunkList(sets.keys.toList(), 50)) {
      final records = await _readCatalogPages((after) {
        var query = client
            .from('card_prints')
            .select(
              'id,gv_id,name,number,set_id,set_code,variant_key,printed_identity_modifier,identity_domain,rarity',
            )
            .inFilter('set_id', chunk);
        if (after != null) query = query.gt('id', after);
        return query.order('id', ascending: true).limit(500);
      });
      for (final record in records) {
        final set = sets[record['set_id']];
        final number = (record['number'] ?? '').toString();
        final gvId = (record['gv_id'] ?? '').toString();
        final name = (record['name'] ?? '').toString();
        if (set == null ||
            gvId.isEmpty ||
            name.isEmpty ||
            !numbers.contains(normalizeImportNumberForCompare(number))) {
          continue;
        }
        candidates.add(
          _CollectionImportCandidateRow(
            id: record['id'] as String,
            gvId: gvId,
            name: name,
            number: number,
            setId: set.id,
            setName: set.name,
            setCode: set.code,
            game: set.game,
            identityCard: record,
          ),
        );
      }
    }
    return candidates;
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
      if (existing != null &&
          (existing.condition != row.row.condition ||
              existing.cost != row.row.cost ||
              existing.added != row.row.added ||
              existing.notes != row.row.notes)) {
        throw const CollectionImportFailure(
          'Different purchase details for the same card need review before importing.',
        );
      }
      aggregated[match.cardId] = _CollectionImportAggregatedRow(
        cardPrintId: match.cardId,
        gvId: match.gvId,
        name: match.name,
        setName: match.setName,
        desiredQuantity: (existing?.desiredQuantity ?? 0) + row.desiredQuantity,
        importQuantity: (existing?.importQuantity ?? 0) + row.importQuantity,
        condition: existing?.condition ?? row.row.condition,
        cost: row.row.cost ?? existing?.cost,
        added: ([
          existing?.added,
          row.row.added,
        ].whereType<String>().toList()..sort()).firstOrNull,
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
        sourceRows: [...existing.sourceRows, ...row.sourceRows],
        sourceRecords: [...existing.sourceRecords, ...row.sourceRecords],
      );
    }
    return collapsed.values.toList();
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
    if (csvText.startsWith('\ufeff')) csvText = csvText.substring(1);
    final rows = <List<String>>[];
    var currentRow = <String>[];
    final currentValue = StringBuffer();
    var inQuotes = false;
    var closedQuote = false;

    for (var index = 0; index < csvText.length; index += 1) {
      final char = csvText[index];
      final nextChar = index + 1 < csvText.length ? csvText[index + 1] : null;

      if (char == '"') {
        if (inQuotes && nextChar == '"') {
          currentValue.write('"');
          index += 1;
        } else if (inQuotes) {
          inQuotes = false;
          closedQuote = true;
        } else if (currentValue.isEmpty && !closedQuote) {
          inQuotes = true;
        } else {
          throw const CollectionImportFailure(
            'The CSV has an unexpected quote. Choose the original export again.',
          );
        }
        continue;
      }

      if (char == ',' && !inQuotes) {
        currentRow.add(currentValue.toString());
        currentValue.clear();
        closedQuote = false;
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
        closedQuote = false;
        continue;
      }

      if (closedQuote) {
        throw const CollectionImportFailure(
          'The CSV has text after a quoted value. Choose the original export again.',
        );
      }
      currentValue.write(char);
    }

    if (inQuotes) {
      throw const CollectionImportFailure(
        'The CSV ends inside a quoted value. Choose the original export again.',
      );
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
      averageCost: _findHeader(headers, [
        'average cost paid',
        'average cost',
        'cost',
      ]),
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
    for (final matcher in matchers) {
      for (final header in headers) {
        if (_normalizeHeader(header) == matcher) return header;
      }
    }
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
    final stripped = value.replaceFirst(RegExp(r'^0+'), '');
    return stripped.isNotEmpty ? stripped : '0';
  }

  static int _parseQuantity(String value) {
    final normalized = _normalizeText(value).replaceAll(',', '');
    final parsed = int.tryParse(normalized);
    return normalized.isEmpty ? 1 : (parsed ?? 0);
  }

  static double? _parseCurrency(String value) {
    final normalized = _normalizeText(value).replaceAll(RegExp(r'[$,]'), '');
    if (normalized.isEmpty) {
      return null;
    }
    final parsed = double.tryParse(normalized);
    return parsed != null && parsed.isFinite ? parsed : null;
  }

  static String? _parseImportedDate(String value) {
    final normalized = _normalizeText(value);
    if (normalized.isEmpty) {
      return null;
    }

    final isoLike = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(normalized);
    if (isoLike != null) {
      if (!_validDate(
        int.parse(isoLike.group(1)!),
        int.parse(isoLike.group(2)!),
        int.parse(isoLike.group(3)!),
      )) {
        return null;
      }
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
      if (!_validDate(int.parse(year), int.parse(month), int.parse(day))) {
        return null;
      }
      return '$year-$month-${day}T00:00:00.000Z';
    }

    final parsed = DateTime.tryParse(normalized);
    final parts = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(normalized);
    if (parts != null &&
        !_validDate(
          int.parse(parts.group(1)!),
          int.parse(parts.group(2)!),
          int.parse(parts.group(3)!),
        )) {
      return null;
    }
    return parsed?.toUtc().toIso8601String();
  }

  static bool _validDate(int year, int month, int day) {
    final date = DateTime.utc(year, month, day);
    return date.year == year && date.month == month && date.day == day;
  }

  static String _normalizeCondition(String value) {
    final normalized = _normalizeMatchText(value);
    return _conditionMap[normalized] ?? 'NM';
  }

  static String _buildRowKey(CollectionImportNormalizedRow row) {
    // No finish, grade, portfolio, cost, date, note, or unknown source field may
    // disappear through aggregation. Only byte-identical source groups merge.
    final fields = Map<String, String>.from(row.sourceFields)
      ..removeWhere(
        (key, _) => ['quantity', 'qty'].contains(_normalizeHeader(key)),
      );
    final keys = fields.keys.toList()..sort();
    return jsonEncode([
      row.gameCode,
      row.name,
      row.set,
      row.number,
      row.condition,
      row.cost,
      row.added,
      row.notes,
      row.finish,
      row.grade,
      row.portfolio,
      row.watchlist,
      {for (final key in keys) key: fields[key]},
      row.reviewReasons,
    ]);
  }

  static String _buildMatchKey(String setName, String number, String name) {
    return '${_normalizeKeyPart(setName)}||${number.trim()}||${_normalizeKeyPart(name)}';
  }

  static String _normalizeKeyPart(String? value) {
    return (value ?? '').trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
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
