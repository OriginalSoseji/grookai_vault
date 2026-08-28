import crypto from "node:crypto";

import { v5 as uuidV5 } from "uuid";

export const COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION =
  "COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_V1";

export const COLLECTIBLE_WAVE1_SET_APPLY_UUID_NAMESPACE =
  "f6ba1fa1-e377-59a1-995a-58323b4d46f5";

export const COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT = Object.freeze({
  workflow_run_id: 33142767700,
  artifact_id: 9674581333,
  artifact_name: "collectible-wave1-set-foundation-proposal-33142767700",
  producer_sha: "843f73d33427d54aa98ab3248f097498f5cce2ef",
  set_candidates: Object.freeze({
    bytes: 878931,
    sha256: "382e1a26fc2e3c57766445949c9fc0f0051544eb4f552c88bcf2654bddc320bb",
  }),
  summary: Object.freeze({
    bytes: 1888,
    sha256: "40dc7eea7964b4a04547ea0c851cd2adfa82fec2de44778732e7af352bec4fbc",
  }),
  validation_failures: Object.freeze({
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  }),
});

export const COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED = Object.freeze({
  selected_set_count: 505,
  excluded_set_count: 551,
  selected_by_game: Object.freeze({ gundam: 5, yugioh: 500 }),
  language_code: "en",
  expected_database_parent_migration: "20260828024500",
});

const GAME_POLICY = Object.freeze({
  yugioh: Object.freeze({
    game_id: "59474f00-0000-4000-8000-000000000001",
    game_name: "Yu-Gi-Oh!",
    game_slug: "yu-gi-oh",
    code_prefix: "ygo",
    identity_domain_default: null,
  }),
  gundam: Object.freeze({
    game_id: "47434700-0000-4000-8000-000000000001",
    game_name: "Gundam Card Game",
    game_slug: "gundam-card-game",
    code_prefix: "gcg",
    identity_domain_default: null,
  }),
});

function clean(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

export function stableJsonWave1SetApplyV1(value) {
  return JSON.stringify(stable(value));
}

export function wave1SetApplyFingerprintV1(value) {
  return crypto.createHash("sha256")
    .update(stableJsonWave1SetApplyV1(value))
    .digest("hex");
}

export function canonicalWave1SetCodeV1(game, sourceSetCode) {
  const policy = GAME_POLICY[clean(game).toLocaleLowerCase("en-US")];
  const sourceCode = clean(sourceSetCode).toUpperCase();
  if (!policy) throw new Error(`Unsupported Wave 1 game: ${game}`);
  if (!/^[A-Z0-9]{1,16}$/.test(sourceCode)) {
    throw new Error(`Unsupported source set code: ${sourceSetCode}`);
  }
  return `${policy.code_prefix}-${sourceCode.toLocaleLowerCase("en-US")}`;
}

export function canonicalWave1SetIdV1(setProposalId) {
  const proposalId = clean(setProposalId);
  if (!/^(?:yugioh|gundam):set-proposal:[0-9a-f]{24}$/.test(proposalId)) {
    throw new Error(`Invalid set proposal ID: ${setProposalId}`);
  }
  return uuidV5(
    `grookai:collectible-wave1:canonical-set:${proposalId}`,
    COLLECTIBLE_WAVE1_SET_APPLY_UUID_NAMESPACE,
  );
}

function validateSourceRow(row) {
  const game = clean(row?.game).toLocaleLowerCase("en-US");
  const policy = GAME_POLICY[game];
  if (!policy) throw new Error(`Source row has unsupported game: ${game || "missing"}`);
  if (row?.proposal_status !== "review_ready" || row?.review_required !== false ||
      row?.canonical_authority !== false || row?.write_authority !== false ||
      !Array.isArray(row?.reason_codes) || row.reason_codes.length !== 0) {
    throw new Error(`Source row is not review_ready: ${row?.set_proposal_id ?? "missing"}`);
  }
  if (clean(row?.source_set_name).length === 0 ||
      !Number.isInteger(Number(row?.source_manifest_row_number)) ||
      Number(row.source_manifest_row_number) < 1 ||
      !Number.isInteger(Number(row?.source_card_count)) ||
      Number(row.source_card_count) < 0 ||
      !Number.isInteger(Number(row?.matching_candidate_count)) ||
      Number(row.matching_candidate_count) < 1) {
    throw new Error(`Source row has invalid manifest evidence: ${row?.set_proposal_id ?? "missing"}`);
  }
  if (!/^[0-9a-f]{64}$/.test(clean(row?.source_manifest_sha256))) {
    throw new Error(`Source row has invalid manifest hash: ${row.set_proposal_id}`);
  }
  if (row?.observed_candidate_languages?.length !== 1 ||
      row.observed_candidate_languages[0] !==
        COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.language_code) {
    throw new Error(`Source row is outside the English apply boundary: ${row.set_proposal_id}`);
  }
  if (row?.source_release_date !== null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(clean(row.source_release_date))) {
    throw new Error(`Source row has an invalid release date: ${row.set_proposal_id}`);
  }
  canonicalWave1SetIdV1(row.set_proposal_id);
  canonicalWave1SetCodeV1(game, row.source_set_code);
  return { game, policy };
}

function payloadRow(sourceRow) {
  const { game, policy } = validateSourceRow(sourceRow);
  const sourceSetCode = clean(sourceRow.source_set_code).toUpperCase();
  return {
    apply_proposal_version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    source_set_proposal_id: sourceRow.set_proposal_id,
    id: canonicalWave1SetIdV1(sourceRow.set_proposal_id),
    game,
    code: canonicalWave1SetCodeV1(game, sourceSetCode),
    name: clean(sourceRow.source_set_name),
    release_date: sourceRow.source_release_date,
    source: {
      source_id: clean(sourceRow.source_id),
      source_manifest_sha256: clean(sourceRow.source_manifest_sha256),
      source_manifest_row_number: Number(sourceRow.source_manifest_row_number),
      source_set_name: clean(sourceRow.source_set_name),
      source_set_code: sourceSetCode,
      source_card_count: Number(sourceRow.source_card_count),
      matching_candidate_count: Number(sourceRow.matching_candidate_count),
      mapping_method: clean(sourceRow.mapping_method),
      set_proposal_id: sourceRow.set_proposal_id,
      language_code: COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.language_code,
      canonical_code_policy: `${policy.code_prefix}-lowercase-source-code`,
      canonical_visibility: "hidden",
      card_identity_authorized: false,
      source_images_authorized: false,
    },
    printed_total: null,
    printed_set_abbrev: sourceSetCode,
    set_role: null,
    identity_domain_default: policy.identity_domain_default,
    identity_model: "standard",
    logo_url: null,
    symbol_url: null,
    hero_image_url: null,
    hero_image_source: null,
    canonical_authority_proposed: true,
    write_authority: false,
  };
}

function assertUnique(rows, field) {
  const owners = new Map();
  for (const row of rows) {
    const value = row[field];
    const existing = owners.get(value);
    if (existing) throw new Error(`Duplicate ${field}: ${value}`);
    owners.set(value, row.source_set_proposal_id);
  }
}

export function buildCollectibleWave1SetApplyProposalV1(setCandidates) {
  if (!Array.isArray(setCandidates) || setCandidates.length !== 1056) {
    throw new Error("Wave 1 set candidate input must contain exactly 1,056 rows");
  }
  const sourceIds = new Set();
  for (const row of setCandidates) {
    const id = clean(row?.set_proposal_id);
    if (!id || sourceIds.has(id)) throw new Error(`Duplicate source set proposal ID: ${id}`);
    sourceIds.add(id);
  }
  const selectedSourceRows = setCandidates
    .filter((row) => row.proposal_status === "review_ready")
    .sort((left, right) => left.set_proposal_id.localeCompare(right.set_proposal_id));
  const excludedSourceRows = setCandidates
    .filter((row) => row.proposal_status !== "review_ready")
    .map((row) => ({
      set_proposal_id: row.set_proposal_id,
      game: row.game,
      source_set_name: row.source_set_name,
      source_set_code: row.source_set_code,
      proposal_status: row.proposal_status,
      reason_codes: row.reason_codes,
      review_required: row.review_required,
      exclusion_reason: "not_review_ready",
      write_authority: false,
    }))
    .sort((left, right) => left.set_proposal_id.localeCompare(right.set_proposal_id));
  if (selectedSourceRows.length !== COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_set_count ||
      excludedSourceRows.length !== COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.excluded_set_count) {
    throw new Error("Wave 1 review-ready partition does not match the frozen profile");
  }
  const rows = selectedSourceRows.map(payloadRow);
  assertUnique(rows, "id");
  assertUnique(rows, "code");
  assertUnique(rows, "source_set_proposal_id");
  const selectedByGame = Object.fromEntries(Object.keys(GAME_POLICY).sort().map((game) => [
    game,
    rows.filter((row) => row.game === game).length,
  ]));
  if (stableJsonWave1SetApplyV1(selectedByGame) !==
      stableJsonWave1SetApplyV1(COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_by_game)) {
    throw new Error("Wave 1 game partition does not match the frozen profile");
  }
  const fingerprintPayload = {
    version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    input: COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT,
    rows,
  };
  return {
    version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    status: "proposal_ready_for_read_only_preflight",
    rows,
    excludedRows: excludedSourceRows,
    selected_by_game: selectedByGame,
    payload_fingerprint_sha256: wave1SetApplyFingerprintV1(fingerprintPayload),
    boundaries: {
      database_access: "read_only",
      database_writes: false,
      migration_generated: false,
      migration_ledger_writes: false,
      card_writes: false,
      identity_writes: false,
      mapping_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      publication_writes: false,
      vault_writes: false,
    },
  };
}

function number(value) {
  return Number(value ?? 0);
}

export function evaluateCollectibleWave1SetDatabasePreflightV1(readback) {
  const findings = [];
  if (readback?.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (readback?.latest_migration !==
      COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.expected_database_parent_migration) {
    findings.push("migration_history_not_at_expected_parent");
  }
  const expectedGames = Object.entries(GAME_POLICY).map(([code, policy]) => ({
    id: policy.game_id,
    code,
    name: policy.game_name,
    slug: policy.game_slug,
  })).sort((left, right) => left.code.localeCompare(right.code));
  const games = [...(readback?.games ?? [])].sort((left, right) =>
    String(left.code).localeCompare(String(right.code)));
  if (stableJsonWave1SetApplyV1(games) !== stableJsonWave1SetApplyV1(expectedGames)) {
    findings.push("game_foundations_mismatch");
  }
  const controls = [...(readback?.release_controls ?? [])];
  for (const code of Object.keys(GAME_POLICY)) {
    const control = controls.find((row) => row.game_code === code);
    if (!control || control.release_status !== "hidden" ||
        control.release_version !== "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1") {
      findings.push(`hidden_release_control_mismatch:${code}`);
    }
  }
  for (const field of [
    "existing_wave1_set_count",
    "planned_id_collision_count",
    "planned_code_collision_count",
    "planned_source_proposal_collision_count",
    "planned_game_name_collision_count",
    "conflicting_lock_count",
  ]) {
    if (number(readback?.[field]) !== 0) findings.push(`${field}_not_zero`);
  }
  if (number(readback?.planned_row_count) !==
      COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_set_count) {
    findings.push("database_preflight_planned_row_count_mismatch");
  }
  if (readback?.sets_rls_enabled !== true || readback?.sets_force_rls !== false) {
    findings.push("sets_rls_state_mismatch");
  }
  const columns = new Set(readback?.sets_columns ?? []);
  for (const required of [
    "id", "game", "code", "name", "release_date", "source", "printed_total",
    "printed_set_abbrev", "set_role", "identity_domain_default", "identity_model",
    "logo_url", "symbol_url", "hero_image_url", "hero_image_source",
  ]) {
    if (!columns.has(required)) findings.push(`sets_column_missing:${required}`);
  }
  const uniqueDefinitions = (readback?.set_unique_definitions ?? []).join("\n");
  if (!/UNIQUE \(game, code\)/i.test(uniqueDefinitions) ||
      !/UNIQUE INDEX uq_sets_code[\s\S]*\(code\)/i.test(uniqueDefinitions)) {
    findings.push("sets_unique_ownership_constraints_missing");
  }
  return [...new Set(findings)].sort();
}

export function buildCollectibleWave1SetRollbackContractV1(rows) {
  if (!Array.isArray(rows) || rows.length !==
      COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_set_count) {
    throw new Error("Rollback contract requires the exact selected set payload");
  }
  return {
    version: "COLLECTIBLE_WAVE1_SET_ROLLBACK_CONTRACT_V1",
    status: "candidate_only_not_authorized",
    selector: {
      exact_set_ids: rows.map((row) => row.id).sort(),
      exact_set_codes: rows.map((row) => row.code).sort(),
      exact_payload_fingerprint_sha256: wave1SetApplyFingerprintV1(rows),
    },
    preconditions: [
      "all selected rows match the exact proposed payload",
      "no selected set has any card_print or cards references",
      "no selected set has gained image, pricing, publication, or Vault dependencies",
      "a separate rollback execution is explicitly authorized",
    ],
    behavior: "delete exact inserted set IDs only, in one transaction, then prove absence",
    automatic_execution_authorized: false,
    forward_fix_required_if_referenced: true,
  };
}
