import crypto from "node:crypto";

export const COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION =
  "COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_V1";

export const COLLECTIBLE_WAVE1_SET_MANIFEST_SHA256 = Object.freeze({
  yugioh_ygoprodeck_api_v7:
    "16c47dcdceffe4ea0b221b75efaeace5d8bd9f888795f061369023ce8ed1c999",
  gundam_gcg_api_v1:
    "e3c7c641711ccbabc42c6c191bd7ca6c5715c74c669d78002bc1ad85c500a14e",
});

const EXPECTED_PARSER_VERSION = "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1";
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((field) =>
      `${JSON.stringify(field)}:${stableJson(value[field])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function proposalId(game, sourceIdentity) {
  return `${game}:set-proposal:${sha256(`${game}\u0000${sourceIdentity}`).slice(0, 24)}`;
}

function requireSha256(value, field) {
  if (!/^[0-9a-f]{64}$/.test(clean(value))) {
    throw new Error(`${field} must be a lowercase SHA-256`);
  }
  return clean(value);
}

function requirePositiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a nonnegative integer`);
  }
  return parsed;
}

function normalizeYugiohManifest(payload, manifestSha256) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Yu-Gi-Oh set manifest must be a nonempty array");
  }
  const names = new Set();
  return payload.map((source, index) => {
    const sourceSetName = clean(source?.set_name);
    const sourceSetCode = clean(source?.set_code);
    const normalizedName = key(sourceSetName);
    if (!sourceSetName || !sourceSetCode || names.has(normalizedName)) {
      throw new Error("Yu-Gi-Oh set manifest has a missing or duplicate set identity");
    }
    names.add(normalizedName);
    return {
      proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
      set_proposal_id: proposalId("yugioh", normalizedName),
      game: "yugioh",
      source_id: SOURCE_BY_GAME.yugioh,
      source_manifest_sha256: manifestSha256,
      source_manifest_row_number: index + 1,
      source_set_name: sourceSetName,
      source_set_code: sourceSetCode,
      source_card_count: requirePositiveInteger(source?.num_of_cards, "num_of_cards"),
      source_release_date: clean(source?.tcg_date) || null,
      mapping_method: "exact_source_set_name",
      canonical_code_proposed: false,
      canonical_authority: false,
      write_authority: false,
    };
  });
}

function normalizeGundamManifest(payload, manifestSha256) {
  const sourceRows = Array.isArray(payload?.data) ? payload.data : null;
  if (!sourceRows || sourceRows.length === 0) {
    throw new Error("Gundam set manifest must contain a nonempty data array");
  }
  const codes = new Set();
  return sourceRows.map((source, index) => {
    const sourceSetName = clean(source?.set_name);
    const sourceSetCode = clean(source?.set_code);
    const normalizedCode = key(sourceSetCode);
    if (!sourceSetName || !sourceSetCode || codes.has(normalizedCode)) {
      throw new Error("Gundam set manifest has a missing or duplicate set code");
    }
    codes.add(normalizedCode);
    return {
      proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
      set_proposal_id: proposalId("gundam", normalizedCode),
      game: "gundam",
      source_id: SOURCE_BY_GAME.gundam,
      source_manifest_sha256: manifestSha256,
      source_manifest_row_number: index + 1,
      source_set_name: sourceSetName,
      source_set_code: sourceSetCode,
      source_card_count: requirePositiveInteger(source?.card_count, "card_count"),
      source_release_date: null,
      mapping_method: "exact_source_set_code",
      canonical_code_proposed: false,
      canonical_authority: false,
      write_authority: false,
    };
  });
}

export function normalizeCollectibleWave1SetManifestsV1({
  yugiohManifest,
  gundamManifest,
  manifestSha256 = COLLECTIBLE_WAVE1_SET_MANIFEST_SHA256,
}) {
  const yugiohSha = requireSha256(
    manifestSha256?.yugioh_ygoprodeck_api_v7,
    "Yu-Gi-Oh manifest SHA-256",
  );
  const gundamSha = requireSha256(
    manifestSha256?.gundam_gcg_api_v1,
    "Gundam manifest SHA-256",
  );
  return [
    ...normalizeYugiohManifest(yugiohManifest, yugiohSha),
    ...normalizeGundamManifest(gundamManifest, gundamSha),
  ].sort((left, right) => left.set_proposal_id.localeCompare(right.set_proposal_id));
}

function validateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("parser candidates must be a nonempty array");
  }
  const ids = new Set();
  for (const candidate of candidates) {
    const id = clean(candidate?.shadow_candidate_id);
    const game = key(candidate?.identity_coordinates?.game);
    const sourceId = clean(candidate?.candidate_source?.source_id);
    if (!id || ids.has(id)) throw new Error("parser candidates contain a missing or duplicate ID");
    if (!SOURCE_BY_GAME[game] || sourceId !== SOURCE_BY_GAME[game]) {
      throw new Error(`candidate is outside the frozen Wave 1 source boundary: ${id}`);
    }
    if (candidate?.parser_version !== EXPECTED_PARSER_VERSION ||
        candidate?.canonical_authority !== false ||
        !/^[0-9a-f]{64}$/.test(clean(candidate?.source_evidence_sha256)) ||
        !clean(candidate?.identity_coordinates?.set_or_product) ||
        !clean(candidate?.identity_coordinates?.collector_number)) {
      throw new Error(`candidate does not satisfy the Wave 1 parser contract: ${id}`);
    }
    ids.add(id);
  }
  return ids;
}

function indexManifestRows(setRows) {
  const yugiohByName = new Map();
  const gundamByCode = new Map();
  const rowsById = new Map();
  for (const row of setRows) {
    if (rowsById.has(row.set_proposal_id)) {
      throw new Error(`duplicate set proposal ID: ${row.set_proposal_id}`);
    }
    rowsById.set(row.set_proposal_id, row);
    if (row.game === "yugioh") yugiohByName.set(clean(row.source_set_name), row);
    if (row.game === "gundam") gundamByCode.set(key(row.source_set_code), row);
  }
  return { gundamByCode, rowsById, yugiohByName };
}

function assignmentRow(candidate, setRow) {
  const coordinates = candidate.identity_coordinates;
  return {
    proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    shadow_candidate_id: candidate.shadow_candidate_id,
    source_candidate_id: candidate.source_candidate_id,
    source_evidence_sha256: candidate.source_evidence_sha256,
    game: key(coordinates.game),
    set_proposal_id: setRow.set_proposal_id,
    assignment_method: setRow.mapping_method,
    observed_set_name: clean(coordinates.set_or_product),
    observed_set_code: clean(coordinates.set_code),
    observed_collector_number: clean(coordinates.collector_number),
    observed_language: key(coordinates.language) || null,
    canonical_authority: false,
    write_authority: false,
  };
}

function candidateGapRow(candidate) {
  const coordinates = candidate.identity_coordinates;
  const game = key(coordinates.game);
  return {
    proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    gap_id: `candidate-gap:${sha256(candidate.shadow_candidate_id).slice(0, 24)}`,
    gap_kind: "candidate_without_manifest",
    game,
    source_id: SOURCE_BY_GAME[game],
    shadow_candidate_id: candidate.shadow_candidate_id,
    source_candidate_id: candidate.source_candidate_id,
    source_evidence_sha256: candidate.source_evidence_sha256,
    observed_set_name: clean(coordinates.set_or_product),
    observed_set_code: clean(coordinates.set_code),
    observed_collector_number: clean(coordinates.collector_number),
    reason_codes: [game === "yugioh"
      ? "no_exact_source_set_name_manifest"
      : "no_exact_source_set_code_manifest"],
    canonical_authority: false,
    write_authority: false,
  };
}

function assignCandidates(candidates, index) {
  const assignments = [];
  const candidateGaps = [];
  for (const candidate of candidates) {
    const coordinates = candidate.identity_coordinates;
    const game = key(coordinates.game);
    const setRow = game === "yugioh"
      ? index.yugiohByName.get(clean(coordinates.set_or_product))
      : index.gundamByCode.get(key(coordinates.set_code));
    if (setRow) assignments.push(assignmentRow(candidate, setRow));
    else candidateGaps.push(candidateGapRow(candidate));
  }
  assignments.sort((left, right) =>
    left.shadow_candidate_id.localeCompare(right.shadow_candidate_id));
  candidateGaps.sort((left, right) => left.gap_id.localeCompare(right.gap_id));
  return { assignments, candidateGaps };
}

function collisionRelationship(members, assignmentsBySet) {
  const namespaces = members.map((member) => new Set(
    (assignmentsBySet.get(member.set_proposal_id) ?? [])
      .map((row) => clean(row.observed_collector_number).toUpperCase()
        .replace(/\d+/g, "#")),
  ));
  if (namespaces.some((namespace) => namespace.size === 0)) {
    return "insufficient_candidates";
  }
  for (let left = 0; left < namespaces.length; left += 1) {
    for (let right = left + 1; right < namespaces.length; right += 1) {
      if ([...namespaces[left]].some((value) => namespaces[right].has(value))) {
        return "overlapping_collector_namespaces";
      }
    }
  }
  return "disjoint_collector_namespaces";
}

function buildCodeCollisions(setRows, assignmentsBySet) {
  const byCode = new Map();
  for (const row of setRows.filter((setRow) => setRow.game === "yugioh")) {
    const code = key(row.source_set_code);
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }
  return [...byCode.values()].filter((members) => members.length > 1).map((members) => {
    members.sort((left, right) => left.set_proposal_id.localeCompare(right.set_proposal_id));
    return {
      proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
      collision_id: `yugioh:set-code:${key(members[0].source_set_code)}`,
      game: "yugioh",
      source_id: SOURCE_BY_GAME.yugioh,
      source_set_code: members[0].source_set_code,
      member_set_proposal_ids: members.map((row) => row.set_proposal_id),
      member_set_names: members.map((row) => row.source_set_name),
      member_candidate_counts: members.map((row) => ({
        set_proposal_id: row.set_proposal_id,
        candidate_count: (assignmentsBySet.get(row.set_proposal_id) ?? []).length,
      })),
      collector_namespace_relationship: collisionRelationship(members, assignmentsBySet),
      canonical_code_proposed: false,
      review_required: true,
      canonical_authority: false,
      write_authority: false,
    };
  }).sort((left, right) => left.collision_id.localeCompare(right.collision_id));
}

function languageMarkerConflict(setRow, assignments) {
  if (!/\(POR\)/i.test(setRow.source_set_name)) return false;
  return assignments.some((row) => row.observed_language === "en") &&
    assignments.some((row) => /-PT(?:\d|$)/i.test(row.observed_collector_number));
}

function proposalReasons(setRow, assignments, sharedCode) {
  const reasons = [];
  if (assignments.length === 0) reasons.push("manifest_without_candidates");
  if (setRow.game === "yugioh" && languageMarkerConflict(setRow, assignments)) {
    reasons.push("language_marker_conflicts_with_parser_en");
  }
  if (setRow.game === "gundam" && assignments.some((row) =>
    key(row.observed_set_name) !== key(setRow.source_set_name))) {
    reasons.push("candidate_name_conflict");
  }
  if (sharedCode) reasons.push("shared_source_code");
  return reasons;
}

function finalizeSetRows(setRows, assignmentsBySet, collisionSetIds) {
  return setRows.map((row) => {
    const assignments = assignmentsBySet.get(row.set_proposal_id) ?? [];
    const reasonCodes = proposalReasons(row, assignments, collisionSetIds.has(row.set_proposal_id));
    return {
      ...row,
      matching_candidate_count: assignments.length,
      observed_candidate_set_names: unique(assignments.map((item) => item.observed_set_name)),
      observed_candidate_set_codes: unique(assignments.map((item) => item.observed_set_code)),
      observed_candidate_languages: unique(assignments.map((item) => item.observed_language)),
      proposal_status: reasonCodes.length === 0 ? "review_ready" : reasonCodes.join("+"),
      reason_codes: reasonCodes,
      review_required: reasonCodes.length > 0,
    };
  }).sort((left, right) => left.set_proposal_id.localeCompare(right.set_proposal_id));
}

function manifestGapRows(setRows) {
  return setRows.filter((row) => row.matching_candidate_count === 0).map((row) => ({
    proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    gap_id: `manifest-gap:${sha256(row.set_proposal_id).slice(0, 24)}`,
    gap_kind: "manifest_without_candidates",
    game: row.game,
    source_id: row.source_id,
    set_proposal_id: row.set_proposal_id,
    source_manifest_sha256: row.source_manifest_sha256,
    source_set_name: row.source_set_name,
    source_set_code: row.source_set_code,
    reason_codes: ["no_parser_candidate_assigned"],
    canonical_authority: false,
    write_authority: false,
  })).sort((left, right) => left.gap_id.localeCompare(right.gap_id));
}

function candidateOnlyCoordinates(candidateGaps) {
  const groups = new Map();
  for (const gap of candidateGaps) {
    const groupKey = `${gap.game}\u0000${clean(gap.observed_set_name)}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(gap);
  }
  return [...groups.values()].map((rows) => ({
    proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    candidate_only_coordinate_id:
      `candidate-only:${sha256(`${rows[0].game}\u0000${clean(rows[0].observed_set_name)}`).slice(0, 24)}`,
    game: rows[0].game,
    source_id: rows[0].source_id,
    observed_set_name: rows[0].observed_set_name,
    observed_set_codes: unique(rows.map((row) => row.observed_set_code)),
    observed_collector_numbers: unique(rows.map((row) => row.observed_collector_number)),
    shadow_candidate_ids: unique(rows.map((row) => row.shadow_candidate_id)),
    candidate_count: rows.length,
    manifest_match_status: "missing",
    canonical_code_proposed: false,
    review_required: true,
    canonical_authority: false,
    write_authority: false,
  })).sort((left, right) =>
    left.candidate_only_coordinate_id.localeCompare(right.candidate_only_coordinate_id));
}

function conflictRows(setRows, assignmentsBySet) {
  const rows = [];
  for (const setRow of setRows) {
    const assignments = assignmentsBySet.get(setRow.set_proposal_id) ?? [];
    if (setRow.reason_codes.includes("language_marker_conflicts_with_parser_en")) {
      rows.push({
        proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
        conflict_id: `${setRow.set_proposal_id}:language-marker`,
        conflict_class: "language_marker_conflicts_with_parser_en",
        game: setRow.game,
        set_proposal_id: setRow.set_proposal_id,
        manifest_set_name: setRow.source_set_name,
        observed_languages: unique(assignments.map((row) => row.observed_language)),
        observed_collector_numbers: unique(assignments.map((row) =>
          row.observed_collector_number)),
        candidate_count: assignments.length,
        review_required: true,
        canonical_authority: false,
        write_authority: false,
      });
    }
    if (setRow.reason_codes.includes("candidate_name_conflict")) {
      rows.push({
        proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
        conflict_id: `${setRow.set_proposal_id}:candidate-name`,
        conflict_class: "candidate_name_conflict",
        game: setRow.game,
        set_proposal_id: setRow.set_proposal_id,
        manifest_set_name: setRow.source_set_name,
        observed_candidate_set_names: unique(assignments.map((row) => row.observed_set_name)),
        candidate_count: assignments.length,
        review_required: true,
        canonical_authority: false,
        write_authority: false,
      });
    }
  }
  return rows.sort((left, right) => left.conflict_id.localeCompare(right.conflict_id));
}

function validateAlternativeArtworkRows(rows, candidateIds) {
  if (!Array.isArray(rows)) throw new Error("alternative-artwork index must be an array");
  const ids = new Set();
  for (const row of rows) {
    if (row?.variant_evidence_version !== EXPECTED_ALT_ART_VERSION ||
        row?.source_id !== SOURCE_BY_GAME.yugioh ||
        row?.mapping_status !== "unresolved_artwork_to_printing" ||
        row?.canonical_authority !== false || row?.write_authority !== false ||
        !clean(row?.variant_evidence_id) || ids.has(row.variant_evidence_id) ||
        !/^[0-9a-f]{64}$/.test(clean(row?.source_evidence_sha256)) ||
        !Array.isArray(row?.source_printing_candidate_ids) ||
        !Array.isArray(row?.source_image_ids)) {
      throw new Error("alternative-artwork index violates the frozen evidence contract");
    }
    const missing = row.source_printing_candidate_ids.filter((id) => !candidateIds.has(id));
    if (new Set(row.source_printing_candidate_ids).size !==
          row.source_printing_candidate_ids.length ||
        new Set(row.source_image_ids.map(clean)).size !== row.source_image_ids.length ||
        row.source_printing_candidate_count !== row.source_printing_candidate_ids.length ||
        row.source_image_count !== row.source_image_ids.length) {
      throw new Error("alternative-artwork evidence contains inconsistent counts or duplicates");
    }
    if (missing.length > 0) {
      throw new Error(`alternative-artwork evidence references missing candidates: ${missing[0]}`);
    }
    ids.add(row.variant_evidence_id);
  }
}

function buildAlternativeArtworkOverlays(rows, assignmentsByCandidate) {
  return rows.map((row) => {
    const setGroups = new Map();
    const unmappedCandidateIds = [];
    for (const candidateId of row.source_printing_candidate_ids) {
      const assignment = assignmentsByCandidate.get(candidateId);
      if (!assignment) {
        unmappedCandidateIds.push(candidateId);
        continue;
      }
      if (!setGroups.has(assignment.set_proposal_id)) {
        setGroups.set(assignment.set_proposal_id, {
          set_proposal_id: assignment.set_proposal_id,
          observed_collector_numbers: [],
          shadow_candidate_ids: [],
        });
      }
      const group = setGroups.get(assignment.set_proposal_id);
      group.observed_collector_numbers.push(assignment.observed_collector_number);
      group.shadow_candidate_ids.push(candidateId);
    }
    const setCandidateReferences = [...setGroups.values()].map((reference) => ({
      ...reference,
      observed_collector_numbers: unique(reference.observed_collector_numbers),
      shadow_candidate_ids: unique(reference.shadow_candidate_ids),
    })).sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
    return {
      proposal_version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
      variant_evidence_id: row.variant_evidence_id,
      source_id: row.source_id,
      source_card_id: clean(row.source_card_id),
      source_evidence_sha256: row.source_evidence_sha256,
      source_image_ids: unique(row.source_image_ids.map(clean)),
      source_image_count: row.source_image_count,
      source_printing_candidate_ids: unique(row.source_printing_candidate_ids),
      source_printing_candidate_count: row.source_printing_candidate_count,
      set_candidate_references: setCandidateReferences,
      set_candidate_reference_count: setCandidateReferences.length,
      unmapped_manifest_candidate_ids: unique(unmappedCandidateIds),
      unmapped_manifest_candidate_count: unmappedCandidateIds.length,
      artwork_to_printing_ownership_status: "unresolved",
      mapping_status: row.mapping_status,
      canonical_authority: false,
      write_authority: false,
      image_content_accessed: false,
      image_republication_authorized: false,
    };
  }).sort((left, right) => left.variant_evidence_id.localeCompare(right.variant_evidence_id));
}

function countsBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right)));
}

export function buildCollectibleWave1SetFoundationProposalV1({
  candidates,
  setRows,
  alternativeArtworkRows = [],
}) {
  const candidateIds = validateCandidates(candidates);
  const manifestIndex = indexManifestRows(setRows);
  const { assignments, candidateGaps } = assignCandidates(candidates, manifestIndex);
  const assignmentsBySet = new Map();
  const assignmentsByCandidate = new Map();
  for (const assignment of assignments) {
    if (!assignmentsBySet.has(assignment.set_proposal_id)) {
      assignmentsBySet.set(assignment.set_proposal_id, []);
    }
    assignmentsBySet.get(assignment.set_proposal_id).push(assignment);
    assignmentsByCandidate.set(assignment.shadow_candidate_id, assignment);
  }
  const collisions = buildCodeCollisions(setRows, assignmentsBySet);
  const collisionSetIds = new Set(collisions.flatMap((row) => row.member_set_proposal_ids));
  const finalizedSets = finalizeSetRows(setRows, assignmentsBySet, collisionSetIds);
  const manifestGaps = manifestGapRows(finalizedSets);
  const sourceGaps = [...candidateGaps, ...manifestGaps]
    .sort((left, right) => left.gap_id.localeCompare(right.gap_id));
  validateAlternativeArtworkRows(alternativeArtworkRows, candidateIds);
  const alternativeArtworkOverlays = buildAlternativeArtworkOverlays(
    alternativeArtworkRows,
    assignmentsByCandidate,
  );
  const accountedCandidateIds = new Set([
    ...assignments.map((row) => row.shadow_candidate_id),
    ...candidateGaps.map((row) => row.shadow_candidate_id),
  ]);
  if (accountedCandidateIds.size !== candidateIds.size ||
      [...candidateIds].some((id) => !accountedCandidateIds.has(id))) {
    throw new Error("candidate assignment reconciliation is incomplete");
  }
  return {
    setCandidates: finalizedSets,
    candidateSetAssignments: assignments,
    setCodeCollisions: collisions,
    candidateSetConflicts: conflictRows(finalizedSets, assignmentsBySet),
    candidateOnlySetCoordinates: candidateOnlyCoordinates(candidateGaps),
    alternativeArtworkSetOverlays: alternativeArtworkOverlays,
    sourceGaps,
    metrics: {
      selected_candidate_count: candidates.length,
      assigned_candidate_count: assignments.length,
      candidate_source_gap_count: candidateGaps.length,
      manifest_set_count: finalizedSets.length,
      manifest_set_counts_by_game: countsBy(finalizedSets, "game"),
      proposal_status_counts: countsBy(finalizedSets, "proposal_status"),
      manifest_source_gap_count: manifestGaps.length,
      source_gap_count: sourceGaps.length,
      set_code_collision_count: collisions.length,
      collision_relationship_counts: countsBy(collisions, "collector_namespace_relationship"),
      candidate_set_conflict_count: conflictRows(finalizedSets, assignmentsBySet).length,
      candidate_only_set_coordinate_count: candidateOnlyCoordinates(candidateGaps).length,
      alternative_artwork_row_count: alternativeArtworkOverlays.length,
      alternative_artwork_candidate_reference_count:
        alternativeArtworkOverlays.reduce((sum, row) =>
          sum + row.source_printing_candidate_count, 0),
      alternative_artwork_set_candidate_reference_count:
        alternativeArtworkOverlays.reduce((sum, row) =>
          sum + row.set_candidate_reference_count, 0),
      alternative_artwork_missing_candidate_reference_count: 0,
      alternative_artwork_unmapped_manifest_candidate_count:
        alternativeArtworkOverlays.reduce((sum, row) =>
          sum + row.unmapped_manifest_candidate_count, 0),
    },
  };
}
