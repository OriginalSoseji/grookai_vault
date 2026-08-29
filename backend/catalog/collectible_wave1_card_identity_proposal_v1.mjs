import crypto from "node:crypto";

export const COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION =
  "COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_V1";

const EXPECTED_CANDIDATE_VERSION = "COLLECTIBLE_SHADOW_CANDIDATE_V1";
const EXPECTED_PARSER_VERSION = "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1";
const EXPECTED_SET_VERSION = "COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_V1";
const EXPECTED_ALT_ART_VERSION =
  "COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1";
const SOURCE_BY_GAME = Object.freeze({
  yugioh: "yugioh_ygoprodeck_api_v7",
  gundam: "gundam_gcg_api_v1",
});

function clean(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function key(value) {
  return clean(value).toLocaleLowerCase("en-US");
}

function numberKey(value) {
  return key(value).replace(/\s+/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parentProposalId(game, setId, number, name) {
  const identity = [game, setId, numberKey(number), key(name)].join("\u0000");
  return `${game}:card-proposal:${sha256(identity).slice(0, 24)}`;
}

function selectedSetLookupKey(game, sourceSetName, sourceSetCode) {
  if (game === "yugioh") return `${game}\u0000name\u0000${key(sourceSetName)}`;
  return `${game}\u0000code\u0000${key(sourceSetCode)}`;
}

function coordinateKey(game, setId, number) {
  return [game, setId, numberKey(number)].join("\u0000");
}

function parentKey(game, setId, number, name) {
  return [game, setId, numberKey(number), key(name)].join("\u0000");
}

function countsBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right)));
}

function validateSetRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("set apply payload must be a nonempty array");
  }
  const ids = new Set();
  const codes = new Set();
  const lookup = new Map();
  for (const row of rows) {
    const game = key(row?.game);
    const id = clean(row?.id);
    const code = key(row?.code);
    const sourceId = clean(row?.source?.source_id);
    if (row?.apply_proposal_version !== EXPECTED_SET_VERSION ||
        !SOURCE_BY_GAME[game] || sourceId !== SOURCE_BY_GAME[game] ||
        !id || ids.has(id) || !code || codes.has(code) ||
        row?.source?.canonical_visibility !== "hidden" ||
        row?.source?.card_identity_authorized !== false ||
        row?.canonical_authority_proposed !== true ||
        row?.write_authority !== false) {
      throw new Error(`invalid selected set foundation row: ${id || "missing"}`);
    }
    const lookupKey = selectedSetLookupKey(
      game,
      row.source?.source_set_name,
      row.source?.source_set_code,
    );
    if (lookup.has(lookupKey)) {
      throw new Error(`selected set foundation coordinate is duplicated: ${lookupKey}`);
    }
    ids.add(id);
    codes.add(code);
    lookup.set(lookupKey, row);
  }
  return { ids, lookup };
}

function validateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("candidate index must be a nonempty array");
  }
  const ids = new Set();
  for (const candidate of candidates) {
    const id = clean(candidate?.shadow_candidate_id);
    const game = key(candidate?.identity_coordinates?.game);
    const coordinates = candidate?.identity_coordinates ?? {};
    if (!id || ids.has(id) || !SOURCE_BY_GAME[game] ||
        candidate?.candidate_schema_version !== EXPECTED_CANDIDATE_VERSION ||
        candidate?.parser_version !== EXPECTED_PARSER_VERSION ||
        candidate?.candidate_source?.source_id !== SOURCE_BY_GAME[game] ||
        candidate?.canonical_authority !== false ||
        !/^[0-9a-f]{64}$/.test(clean(candidate?.source_evidence_sha256)) ||
        !clean(coordinates.set_or_product) ||
        !clean(coordinates.collector_number) ||
        !clean(coordinates.card_name) ||
        key(coordinates.language) !== "en") {
      throw new Error(`invalid Wave 1 candidate: ${id || "missing"}`);
    }
    ids.add(id);
  }
  return ids;
}

function validateAlternativeArtworkRows(rows, candidateIds) {
  if (!Array.isArray(rows)) throw new Error("alternative artwork rows must be an array");
  const evidenceIds = new Set();
  const evidenceByCandidate = new Map();
  for (const row of rows) {
    const evidenceId = clean(row?.variant_evidence_id);
    const candidateReferences = row?.source_printing_candidate_ids;
    const sourceImageIds = row?.source_image_ids;
    if (row?.variant_evidence_version !== EXPECTED_ALT_ART_VERSION ||
        row?.source_id !== SOURCE_BY_GAME.yugioh || !evidenceId ||
        evidenceIds.has(evidenceId) ||
        row?.mapping_status !== "unresolved_artwork_to_printing" ||
        row?.canonical_authority !== false || row?.write_authority !== false ||
        row?.image_content_accessed !== false ||
        row?.image_republication_authorized !== false ||
        !Array.isArray(candidateReferences) || !Array.isArray(sourceImageIds) ||
        candidateReferences.length !== row.source_printing_candidate_count ||
        sourceImageIds.length !== row.source_image_count ||
        new Set(candidateReferences).size !== candidateReferences.length ||
        new Set(sourceImageIds.map(clean)).size !== sourceImageIds.length) {
      throw new Error(`invalid alternative artwork evidence: ${evidenceId || "missing"}`);
    }
    for (const candidateId of candidateReferences) {
      if (!candidateIds.has(candidateId)) {
        throw new Error(`alternative artwork evidence references unknown candidate: ${candidateId}`);
      }
      if (!evidenceByCandidate.has(candidateId)) evidenceByCandidate.set(candidateId, []);
      evidenceByCandidate.get(candidateId).push(evidenceId);
    }
    evidenceIds.add(evidenceId);
  }
  for (const values of evidenceByCandidate.values()) values.sort();
  return { evidenceByCandidate, evidenceIds };
}

function setForCandidate(candidate, setLookup) {
  const coordinates = candidate.identity_coordinates;
  const game = key(coordinates.game);
  return setLookup.get(selectedSetLookupKey(
    game,
    coordinates.set_or_product,
    coordinates.set_code,
  ));
}

function parentStatus(group, conflictingCoordinates) {
  if (conflictingCoordinates.has(group.coordinate_key)) {
    return {
      proposal_status: "review_required_identity_conflict",
      reason_codes: ["collector_number_has_multiple_source_names"],
    };
  }
  if (group.alternative_artwork_evidence_ids.length > 0) {
    return {
      proposal_status: "review_required_unresolved_alternative_artwork",
      reason_codes: ["source_card_has_unresolved_artwork_to_printing_mapping"],
    };
  }
  return {
    proposal_status: "proposal_ready",
    reason_codes: ["exact_selected_set_foundation", "source_parent_coordinates_complete"],
  };
}

export function buildCollectibleWave1CardIdentityProposalV1({
  candidates,
  selectedSetRows,
  alternativeArtworkRows = [],
}) {
  const candidateIds = validateCandidates(candidates);
  const selectedSets = validateSetRows(selectedSetRows);
  const alternativeArtwork = validateAlternativeArtworkRows(
    alternativeArtworkRows,
    candidateIds,
  );
  const dispositions = [];
  const excludedCandidates = [];
  const selectedCandidates = [];
  const parentGroups = new Map();
  const namesByCoordinate = new Map();

  for (const candidate of candidates) {
    const coordinates = candidate.identity_coordinates;
    const game = key(coordinates.game);
    const setRow = setForCandidate(candidate, selectedSets.lookup);
    if (!setRow) {
      const excluded = {
        proposal_version: COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
        shadow_candidate_id: candidate.shadow_candidate_id,
        source_candidate_id: candidate.source_candidate_id,
        game,
        observed_set_name: clean(coordinates.set_or_product),
        observed_set_code: clean(coordinates.set_code),
        disposition: "excluded_missing_approved_set_foundation",
        reason_codes: ["candidate_set_not_in_approved_505_set_payload"],
        canonical_authority: false,
        write_authority: false,
      };
      dispositions.push(excluded);
      excludedCandidates.push(excluded);
      continue;
    }

    const coordinate = coordinateKey(game, setRow.id, coordinates.collector_number);
    const groupKey = parentKey(
      game,
      setRow.id,
      coordinates.collector_number,
      coordinates.card_name,
    );
    if (!namesByCoordinate.has(coordinate)) namesByCoordinate.set(coordinate, new Set());
    namesByCoordinate.get(coordinate).add(key(coordinates.card_name));
    if (!parentGroups.has(groupKey)) {
      parentGroups.set(groupKey, {
        coordinate_key: coordinate,
        game,
        set_row: setRow,
        card_name: clean(coordinates.card_name),
        collector_number: clean(coordinates.collector_number),
        language: key(coordinates.language),
        candidates: [],
        alternative_artwork_evidence_ids: [],
      });
    }
    const group = parentGroups.get(groupKey);
    group.candidates.push(candidate);
    group.alternative_artwork_evidence_ids.push(
      ...(alternativeArtwork.evidenceByCandidate.get(candidate.shadow_candidate_id) ?? []),
    );
    selectedCandidates.push({ candidate, setRow, groupKey });
  }

  const conflictingCoordinates = new Set(
    [...namesByCoordinate.entries()]
      .filter(([, names]) => names.size > 1)
      .map(([coordinate]) => coordinate),
  );
  const parentProposals = [];
  const parentByGroup = new Map();
  for (const [groupKey, group] of parentGroups) {
    group.candidates.sort((left, right) =>
      left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
    group.alternative_artwork_evidence_ids = unique(
      group.alternative_artwork_evidence_ids,
    );
    const status = parentStatus(group, conflictingCoordinates);
    const proposal = {
      proposal_version: COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
      parent_proposal_id: parentProposalId(
        group.game,
        group.set_row.id,
        group.collector_number,
        group.card_name,
      ),
      game: group.game,
      set_id: group.set_row.id,
      canonical_set_code: group.set_row.code,
      canonical_set_name: group.set_row.name,
      source_set_proposal_id: group.set_row.source_set_proposal_id,
      source_set_name: group.set_row.source.source_set_name,
      source_set_code: group.set_row.source.source_set_code,
      language: group.language,
      card_name: group.card_name,
      collector_number: group.collector_number,
      normalized_card_name: key(group.card_name),
      normalized_collector_number: numberKey(group.collector_number),
      source_printing_candidate_ids: group.candidates.map((row) =>
        row.shadow_candidate_id),
      source_printing_candidate_count: group.candidates.length,
      source_product_ids: unique(group.candidates.map((row) =>
        clean(row.identity_coordinates?.source_product_id))),
      source_rarity_labels: unique(group.candidates.map((row) =>
        clean(row.identity_coordinates?.rarity))),
      source_evidence_sha256: unique(group.candidates.map((row) =>
        row.source_evidence_sha256)),
      alternative_artwork_evidence_ids: group.alternative_artwork_evidence_ids,
      alternative_artwork_evidence_count:
        group.alternative_artwork_evidence_ids.length,
      ...status,
      canonical_parent_id_proposed: false,
      canonical_gv_id_proposed: false,
      canonical_authority: false,
      write_authority: false,
      image_authority: false,
      printing_authority: false,
    };
    parentProposals.push(proposal);
    parentByGroup.set(groupKey, proposal);
  }
  parentProposals.sort((left, right) =>
    left.parent_proposal_id.localeCompare(right.parent_proposal_id));

  const sourcePrintingEvidence = [];
  for (const selected of selectedCandidates) {
    const candidate = selected.candidate;
    const parent = parentByGroup.get(selected.groupKey);
    const evidenceIds = alternativeArtwork.evidenceByCandidate.get(
      candidate.shadow_candidate_id,
    ) ?? [];
    sourcePrintingEvidence.push({
      proposal_version: COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
      shadow_candidate_id: candidate.shadow_candidate_id,
      source_candidate_id: candidate.source_candidate_id,
      parent_proposal_id: parent.parent_proposal_id,
      game: parent.game,
      set_id: parent.set_id,
      source_product_id: clean(candidate.identity_coordinates?.source_product_id),
      source_rarity_label: clean(candidate.identity_coordinates?.rarity) || null,
      source_evidence_sha256: candidate.source_evidence_sha256,
      alternative_artwork_evidence_ids: evidenceIds,
      evidence_status: evidenceIds.length > 0
        ? "review_required_unresolved_alternative_artwork"
        : "source_printing_evidence_unmapped",
      normalized_finish_key: null,
      normalized_variant_key: null,
      source_rarity_is_not_finish_authority: true,
      canonical_printing_id_proposed: false,
      canonical_authority: false,
      write_authority: false,
      image_authority: false,
    });
    dispositions.push({
      proposal_version: COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
      shadow_candidate_id: candidate.shadow_candidate_id,
      source_candidate_id: candidate.source_candidate_id,
      game: parent.game,
      set_id: parent.set_id,
      parent_proposal_id: parent.parent_proposal_id,
      disposition: parent.proposal_status,
      reason_codes: parent.reason_codes,
      canonical_authority: false,
      write_authority: false,
    });
  }
  sourcePrintingEvidence.sort((left, right) =>
    left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  dispositions.sort((left, right) =>
    left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  excludedCandidates.sort((left, right) =>
    left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));

  const dispositionIds = new Set(dispositions.map((row) => row.shadow_candidate_id));
  const selectedCount = sourcePrintingEvidence.length;
  const parentReferenceCount = parentProposals.reduce((sum, row) =>
    sum + row.source_printing_candidate_count, 0);
  if (dispositionIds.size !== candidateIds.size || dispositions.length !== candidates.length ||
      [...candidateIds].some((id) => !dispositionIds.has(id)) ||
      selectedCount + excludedCandidates.length !== candidates.length ||
      parentReferenceCount !== selectedCount) {
    throw new Error("card identity proposal candidate reconciliation is incomplete");
  }

  const reviewRequiredParents = parentProposals.filter((row) =>
    row.proposal_status !== "proposal_ready");
  const altSelectedReferences = sourcePrintingEvidence.filter((row) =>
    row.alternative_artwork_evidence_ids.length > 0).length;
  return {
    parentProposals,
    sourcePrintingEvidence,
    candidateDispositions: dispositions,
    excludedCandidates,
    reviewRequiredParents,
    metrics: {
      selected_candidate_count: candidates.length,
      approved_set_foundation_count: selectedSetRows.length,
      selected_source_printing_count: selectedCount,
      excluded_source_printing_count: excludedCandidates.length,
      selected_source_printing_counts_by_game: countsBy(sourcePrintingEvidence, "game"),
      proposed_parent_count: parentProposals.length,
      proposed_parent_counts_by_game: countsBy(parentProposals, "game"),
      parent_status_counts: countsBy(parentProposals, "proposal_status"),
      review_required_parent_count: reviewRequiredParents.length,
      conflicting_coordinate_count: conflictingCoordinates.size,
      alternative_artwork_evidence_row_count: alternativeArtworkRows.length,
      alternative_artwork_selected_candidate_reference_count: altSelectedReferences,
      candidate_disposition_count: dispositions.length,
      candidate_reconciliation_mismatch_count: 0,
    },
  };
}
