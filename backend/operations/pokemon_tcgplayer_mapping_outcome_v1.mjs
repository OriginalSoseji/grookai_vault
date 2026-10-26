import path from "node:path";
import assert from "node:assert/strict";

import {
  buildFounderOutcomeAgentV1,
  buildFounderOutcomeStageV1,
  buildFounderOutcomeWorkflowPlanV1,
  buildFounderOutcomeWorkItemV1,
} from "./founder_outcome_workflow_v1.mjs";
import { operationsSha256V1 } from "./operations_control_plane_v1.mjs";
import { assertMasterMappingBatchAuthority } from "../pricing/master_index_mapping_authority_v1.mjs";

export const POKEMON_TCGPLAYER_MAPPING_AUTHORITY_VERSION =
  "POKEMON_TCGPLAYER_MAPPING_AUTHORITY_V1";
export const POKEMON_TCGPLAYER_MAPPING_OUTCOME_PACKAGE_VERSION =
  "POKEMON_TCGPLAYER_MAPPING_OUTCOME_PACKAGE_V1";
export const POKEMON_TCGPLAYER_MAPPING_WORKFLOW_KEY =
  "pokemon_tcgplayer_mapping_apply_v1";
export const POKEMON_TCGPLAYER_MAPPING_AGENT_KEY =
  "pokemon-tcgplayer-mapping-outcome-v1";
export const POKEMON_TCGPLAYER_MAPPING_REVIEW_AGENT_KEY =
  "tcgplayer-pricing-completion-v1";
export const POKEMON_TCGPLAYER_MAPPING_REVIEW_TYPE =
  "tcgplayer_pricing_backlog_repair";
export const POKEMON_TCGPLAYER_MAPPING_REVIEW_ACTION =
  "advance_tcgplayer_pricing_backlog";

const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PROJECT_REF = "ycdxbpibncqcchqiihfz";

const clean = (value) => String(value ?? "").trim();

export function pokemonTcgplayerMappingDatabaseConfigV1(connectionString, {
  mode,
  env = process.env,
} = {}) {
  assert.ok(["apply", "dry_run"].includes(mode), "pokemon_mapping_database_mode_required");
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, "0", "pokemon_mapping_insecure_tls_environment");
  const url = new URL(connectionString);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "pokemon_mapping_database_protocol");
  const user = decodeURIComponent(url.username);
  const direct = url.hostname === `db.${PROJECT_REF}.supabase.co` && user === "postgres";
  const pooler = url.hostname === "aws-1-us-east-2.pooler.supabase.com" &&
    user === `postgres.${PROJECT_REF}`;
  assert.ok(direct || pooler, "pokemon_mapping_wrong_database_project");
  assert.equal(url.pathname, "/postgres", "pokemon_mapping_wrong_database_name");
  assert.ok(["", "5432", "6543"].includes(url.port), "pokemon_mapping_wrong_database_port");
  for (const key of url.searchParams.keys()) {
    assert.ok(["sslmode", "sslcert", "sslkey", "sslrootcert"].includes(key),
      "pokemon_mapping_unexpected_database_option");
  }
  url.search = "";
  if (direct) {
    url.hostname = "aws-1-us-east-2.pooler.supabase.com";
    url.port = "5432";
    url.username = `postgres.${PROJECT_REF}`;
  }
  const ca = clean(env.SUPABASE_DB_CA_CERT);
  if (ca) assert.match(ca, /-----BEGIN CERTIFICATE-----/, "pokemon_mapping_invalid_ca_certificate");
  return {
    connectionString: url.href,
    ssl: {
      rejectUnauthorized: true,
      servername: url.hostname,
      ...(ca ? { ca } : {}),
    },
    application_name: "pokemon-tcgplayer-mapping-outcome-v1",
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    ...(mode === "dry_run" ? { options: "-c default_transaction_read_only=on" } : {}),
  };
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  if (JSON.stringify(Object.keys(value ?? {}).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${label} fields changed`);
  }
}

function normalizeReviewCandidate(candidate) {
  object(candidate, "Pokemon mapping review candidate");
  const targets = Array.isArray(candidate.review_targets) ? candidate.review_targets : [];
  if (targets.length !== 1) throw new Error("Pokemon mapping outcome requires one target per source product");
  const target = object(targets[0], "Pokemon mapping review target");
  const sourceProductId = Number(candidate.source_product_id);
  const sourceGroupId = Number(candidate.source_group_id);
  if (!Number.isSafeInteger(sourceProductId) || sourceProductId < 1 ||
      !Number.isSafeInteger(sourceGroupId) || sourceGroupId < 1) {
    throw new Error("Pokemon mapping source coordinates are invalid");
  }
  const normalizedTarget = {
    card_print_id: clean(target.card_print_id),
    gv_id: clean(target.gv_id),
    set_id: clean(target.set_id),
    set_code: clean(target.set_code),
    set_name: clean(target.set_name),
    canonical_name: clean(target.canonical_name),
    canonical_number: clean(target.canonical_number),
    variant_key: clean(target.variant_key),
    candidate_score: Number(target.candidate_score),
    candidate_evidence: object(target.candidate_evidence ?? {}, "Pokemon mapping candidate evidence"),
  };
  if (!UUID.test(normalizedTarget.card_print_id) || !UUID.test(normalizedTarget.set_id) ||
      !normalizedTarget.gv_id || !normalizedTarget.set_code || !normalizedTarget.set_name ||
      !normalizedTarget.canonical_name || !normalizedTarget.canonical_number ||
      !Number.isFinite(normalizedTarget.candidate_score) || normalizedTarget.candidate_score < 0) {
    throw new Error("Pokemon mapping target evidence is incomplete");
  }
  const observationIds = [...new Set((candidate.supporting_gap_observation_ids ?? [])
    .map(clean).filter(Boolean))].sort();
  if (observationIds.length < 1 || observationIds.some((id) => !UUID.test(id))) {
    throw new Error("Pokemon mapping supporting observations are invalid");
  }
  return {
    source_product_id: sourceProductId,
    source_product_name: clean(candidate.source_product_name),
    source_group_id: sourceGroupId,
    source_group_name: clean(candidate.source_group_name),
    printed_number: clean(candidate.printed_number),
    source_subtypes: [...new Set((candidate.source_subtypes ?? []).map(clean).filter(Boolean))].sort(),
    supporting_gap_observation_ids: observationIds,
    target: normalizedTarget,
  };
}

function assertExactCandidatesMatchReview(candidates, exactCandidates) {
  if (!Array.isArray(exactCandidates) || exactCandidates.length !== candidates.length) {
    throw new Error("Pokemon mapping review lacks exact reviewed mapping candidates");
  }
  const exactByProduct = new Map(exactCandidates.map((row) => [Number(row?.source_product_id), row]));
  if (exactByProduct.size !== candidates.length) {
    throw new Error("Pokemon exact mapping candidates contain a source collision");
  }
  for (const candidate of candidates) {
    const exact = exactByProduct.get(candidate.source_product_id);
    if (!exact || exact.source_product_name !== candidate.source_product_name ||
        Number(exact.source_group_id) !== candidate.source_group_id ||
        exact.source_group_name !== candidate.source_group_name ||
        exact.printed_number !== candidate.printed_number ||
        exact.target?.card_print_id !== candidate.target.card_print_id ||
        exact.target?.gv_id !== candidate.target.gv_id ||
        exact.target?.set_id !== candidate.target.set_id ||
        exact.target?.set_code !== candidate.target.set_code ||
        exact.target?.canonical_name !== candidate.target.canonical_name ||
        exact.target?.canonical_number !== candidate.target.canonical_number ||
        clean(exact.target?.variant_key) !== candidate.target.variant_key ||
        JSON.stringify([...(exact.source_subtypes ?? [])].sort()) !==
          JSON.stringify(candidate.source_subtypes) ||
        JSON.stringify([...(exact.supporting_gap_observation_ids ?? [])].sort()) !==
          JSON.stringify(candidate.supporting_gap_observation_ids)) {
      throw new Error(`Pokemon exact mapping candidate changed:${candidate.source_product_id}`);
    }
  }
  return exactCandidates;
}

export function validateApprovedPokemonMappingReviewV1(review) {
  object(review, "Approved Pokemon mapping review");
  if (!UUID.test(clean(review.id)) || !Number.isInteger(Number(review.version)) || Number(review.version) < 1) {
    throw new Error("Approved Pokemon mapping review identity is invalid");
  }
  if (!Number.isFinite(Date.parse(clean(review.decided_at)))) {
    throw new Error("Approved Pokemon mapping review decision time is invalid");
  }
  if (review.state !== "approved" || review.work_item_type !== POKEMON_TCGPLAYER_MAPPING_REVIEW_TYPE ||
      review.action_type !== POKEMON_TCGPLAYER_MAPPING_REVIEW_ACTION ||
      review.agent_key !== POKEMON_TCGPLAYER_MAPPING_REVIEW_AGENT_KEY) {
    throw new Error("Pokemon mapping review is not an approved pricing review item");
  }
  const payload = object(review.plan_payload, "Pokemon mapping review plan");
  if (payload.proposal_kind !== "pokemon_tcgplayer_mapping_review" ||
      !clean(payload.source_pricing_run_id) || !UUID.test(clean(payload.source_sync_run_id)) ||
      !Number.isFinite(Date.parse(clean(payload.source_completed_at)))) {
    throw new Error("Pokemon mapping review source evidence is invalid");
  }
  if (payload.review_boundary?.database_writes !== false ||
      payload.review_boundary?.mapping_writes !== false ||
      payload.review_boundary?.publication_writes !== false ||
      payload.review_boundary?.writer_dispatches !== false ||
      payload.review_boundary?.approval_records_review_only !== true) {
    throw new Error("Pokemon mapping review boundary changed");
  }
  if (!SHA256.test(clean(review.plan_fingerprint)) ||
      operationsSha256V1(payload) !== clean(review.plan_fingerprint)) {
    throw new Error("Pokemon mapping review fingerprint changed");
  }
  if (!Array.isArray(payload.review_candidates) || payload.review_candidates.length < 1 ||
      payload.review_candidates.length > 50) {
    throw new Error("Pokemon mapping review candidate count is invalid");
  }
  const candidates = payload.review_candidates.map(normalizeReviewCandidate)
    .sort((left, right) => left.source_product_id - right.source_product_id);
  if (new Set(candidates.map((row) => row.source_product_id)).size !== candidates.length ||
      new Set(candidates.map((row) => row.target.card_print_id)).size !== candidates.length) {
    throw new Error("Pokemon mapping review contains a source or target collision");
  }
  const exactCandidates = assertExactCandidatesMatchReview(
    candidates,
    payload.exact_mapping_candidates,
  );
  const masterMappingAuthority = object(
    payload.master_mapping_authority,
    "Pokemon reviewed Master Index mapping authority",
  );
  assertMasterMappingBatchAuthority(exactCandidates, masterMappingAuthority);
  return { payload, candidates, exactCandidates, masterMappingAuthority };
}

export function buildPokemonTcgplayerMappingAuthorityV1({ review, sourceCommitSha }) {
  const {
    payload,
    candidates,
    exactCandidates,
    masterMappingAuthority,
  } = validateApprovedPokemonMappingReviewV1(review);
  if (!SHA1.test(clean(sourceCommitSha))) throw new Error("Pokemon mapping source commit is invalid");
  const core = {
    version: POKEMON_TCGPLAYER_MAPPING_AUTHORITY_VERSION,
    source_commit_sha: clean(sourceCommitSha),
    review_work_item_id: clean(review.id),
    review_work_item_key: clean(review.work_item_key),
    review_work_item_version: Number(review.version),
    review_plan_fingerprint: clean(review.plan_fingerprint),
    review_decided_at: clean(review.decided_at),
    source_pricing_run_id: clean(payload.source_pricing_run_id),
    source_sync_run_id: clean(payload.source_sync_run_id),
    source_completed_at: clean(payload.source_completed_at),
    candidates,
    exact_mapping_candidates: exactCandidates,
    master_mapping_authority: masterMappingAuthority,
    expected_mapping_count: candidates.length,
    boundaries: {
      insert_only: true,
      mapping_inserts: candidates.length,
      mapping_updates: 0,
      mapping_deletes: 0,
      publication_writes: 0,
      price_writes: 0,
      customer_state_writes: 0,
    },
  };
  return validatePokemonTcgplayerMappingAuthorityV1({
    ...core,
    authority_fingerprint_sha256: operationsSha256V1(core),
  });
}

export function validatePokemonTcgplayerMappingAuthorityV1(authority, { sourceCommitSha = null } = {}) {
  object(authority, "Pokemon mapping authority");
  if (authority.version !== POKEMON_TCGPLAYER_MAPPING_AUTHORITY_VERSION ||
      !SHA1.test(clean(authority.source_commit_sha)) ||
      (sourceCommitSha && clean(authority.source_commit_sha) !== clean(sourceCommitSha)) ||
      !UUID.test(clean(authority.review_work_item_id)) ||
      !clean(authority.review_work_item_key) ||
      !Number.isInteger(Number(authority.review_work_item_version)) ||
      !SHA256.test(clean(authority.review_plan_fingerprint)) ||
      !UUID.test(clean(authority.source_sync_run_id)) ||
      !clean(authority.source_pricing_run_id)) {
    throw new Error("Pokemon mapping authority provenance is invalid");
  }
  if (!Array.isArray(authority.candidates) || authority.candidates.length < 1 ||
      authority.candidates.length > 50 ||
      Number(authority.expected_mapping_count) !== authority.candidates.length) {
    throw new Error("Pokemon mapping authority count is invalid");
  }
  const candidates = authority.candidates.map((row) => normalizeReviewCandidate({
    ...row,
    review_targets: [row.target],
  }));
  if (new Set(candidates.map((row) => row.source_product_id)).size !== candidates.length ||
      new Set(candidates.map((row) => row.target.card_print_id)).size !== candidates.length) {
    throw new Error("Pokemon mapping authority contains a collision");
  }
  const exactCandidates = assertExactCandidatesMatchReview(
    candidates,
    authority.exact_mapping_candidates,
  );
  assertMasterMappingBatchAuthority(
    exactCandidates,
    object(authority.master_mapping_authority, "Pokemon reviewed Master Index mapping authority"),
  );
  exactKeys(authority.boundaries, [
    "insert_only", "mapping_inserts", "mapping_updates", "mapping_deletes",
    "publication_writes", "price_writes", "customer_state_writes",
  ], "Pokemon mapping authority boundary");
  if (authority.boundaries.insert_only !== true ||
      Number(authority.boundaries.mapping_inserts) !== candidates.length ||
      ["mapping_updates", "mapping_deletes", "publication_writes", "price_writes", "customer_state_writes"]
        .some((key) => Number(authority.boundaries[key]) !== 0)) {
    throw new Error("Pokemon mapping authority boundary widened");
  }
  const fingerprintPayload = { ...authority };
  delete fingerprintPayload.authority_fingerprint_sha256;
  if (!SHA256.test(clean(authority.authority_fingerprint_sha256)) ||
      operationsSha256V1(fingerprintPayload) !== authority.authority_fingerprint_sha256) {
    throw new Error("Pokemon mapping authority fingerprint changed");
  }
  return authority;
}

export function buildPokemonTcgplayerMappingOutcomePackageV1({ authority, preflight }) {
  validatePokemonTcgplayerMappingAuthorityV1(authority);
  object(preflight, "Pokemon mapping preflight");
  if (preflight.status !== "passed" || preflight.mode !== "dry_run" ||
      preflight.authority_fingerprint_sha256 !== authority.authority_fingerprint_sha256 ||
      preflight.master_authority_fingerprint !== authority.master_mapping_authority.fingerprint ||
      Number(preflight.expected_mapping_count) !== authority.expected_mapping_count ||
      Number(preflight.conflict_count) !== 0) {
    throw new Error("Pokemon mapping preflight is not clean");
  }
  const core = {
    version: POKEMON_TCGPLAYER_MAPPING_OUTCOME_PACKAGE_VERSION,
    authority,
    preflight: {
      status: preflight.status,
      mode: preflight.mode,
      expected_mapping_count: Number(preflight.expected_mapping_count),
      missing_mapping_count: Number(preflight.missing_mapping_count),
      already_applied_count: Number(preflight.already_applied_count),
      conflict_count: Number(preflight.conflict_count),
      live_state_fingerprint_sha256: clean(preflight.live_state_fingerprint_sha256),
      master_authority_fingerprint: clean(preflight.master_authority_fingerprint),
    },
  };
  return validatePokemonTcgplayerMappingOutcomePackageV1({
    ...core,
    package_fingerprint_sha256: operationsSha256V1(core),
  });
}

export function validatePokemonTcgplayerMappingOutcomePackageV1(pkg, { sourceCommitSha = null } = {}) {
  object(pkg, "Pokemon mapping outcome package");
  if (pkg.version !== POKEMON_TCGPLAYER_MAPPING_OUTCOME_PACKAGE_VERSION) {
    throw new Error("Pokemon mapping outcome package version is unsupported");
  }
  validatePokemonTcgplayerMappingAuthorityV1(pkg.authority, { sourceCommitSha });
  if (pkg.preflight?.status !== "passed" || pkg.preflight?.mode !== "dry_run" ||
      Number(pkg.preflight?.conflict_count) !== 0 ||
      Number(pkg.preflight?.expected_mapping_count) !== pkg.authority.expected_mapping_count ||
      pkg.preflight?.master_authority_fingerprint !==
        pkg.authority.master_mapping_authority.fingerprint ||
      Number(pkg.preflight?.missing_mapping_count) +
        Number(pkg.preflight?.already_applied_count) !== pkg.authority.expected_mapping_count ||
      !SHA256.test(clean(pkg.preflight?.live_state_fingerprint_sha256))) {
    throw new Error("Pokemon mapping outcome preflight proof is invalid");
  }
  const fingerprintPayload = { ...pkg };
  delete fingerprintPayload.package_fingerprint_sha256;
  if (!SHA256.test(clean(pkg.package_fingerprint_sha256)) ||
      operationsSha256V1(fingerprintPayload) !== pkg.package_fingerprint_sha256) {
    throw new Error("Pokemon mapping outcome package fingerprint changed");
  }
  return pkg;
}

export function buildPokemonTcgplayerMappingOutcomeWorkItemV1({ outcomePackage, sourceRunUri = null }) {
  validatePokemonTcgplayerMappingOutcomePackageV1(outcomePackage);
  const authority = outcomePackage.authority;
  const effects = { pokemon_mapping_outcome_package: outcomePackage };
  const exclusions = [
    "no mapping updates or deletes",
    "no canonical card or printing creation",
    "no price or publication writes in this command",
    "no customer or Vault writes",
    "no rows outside the approved review batch",
  ];
  const workflow = buildFounderOutcomeWorkflowPlanV1({
    workflowKey: POKEMON_TCGPLAYER_MAPPING_WORKFLOW_KEY,
    stages: [
      buildFounderOutcomeStageV1({
        stageKey: "verify_pokemon_mapping_scope",
        handlerKey: "verify_pokemon_mapping_scope_v1",
        mode: "read_only",
        expectedEffects: effects,
        exclusions,
        maxAttempts: 2,
      }),
      buildFounderOutcomeStageV1({
        stageKey: "apply_and_reconcile_pokemon_mappings",
        handlerKey: "apply_pokemon_mapping_plan_v1",
        mode: "canonical_write",
        expectedEffects: effects,
        exclusions,
        maxAttempts: 2,
      }),
    ],
    terminalOutcome: {
      summary: "The approved Pokemon TCGPlayer mappings are inserted and durably reconciled for the next price publication.",
      mapping_count: authority.expected_mapping_count,
      source_sync_run_id: authority.source_sync_run_id,
      price_publication_required: true,
    },
  });
  return buildFounderOutcomeWorkItemV1({
    workItemKey: `pokemon-tcgplayer-mapping-outcome:${authority.source_sync_run_id}`,
    agentKey: POKEMON_TCGPLAYER_MAPPING_AGENT_KEY,
    title: `Apply ${authority.expected_mapping_count} approved Pokemon price mappings`,
    summary: "One approval inserts only the reviewed TCGPlayer-to-grookai mappings, verifies durable readback, and makes them eligible for the next pricing publication.",
    domain: "pricing",
    riskLevel: "high",
    scope: {
      game: "pokemon",
      source: "tcgplayer",
      mapping_count: authority.expected_mapping_count,
      source_sync_run_id: authority.source_sync_run_id,
      review_work_item_id: authority.review_work_item_id,
      review_plan_fingerprint: authority.review_plan_fingerprint,
      master_mapping_authority_fingerprint: authority.master_mapping_authority.fingerprint,
    },
    exclusions,
    workflow,
    sourceCommitSha: authority.source_commit_sha,
    evidence: [{
      evidence_key: `pokemon-mapping-review:${authority.review_work_item_id}:${authority.review_work_item_version}`,
      sha256: authority.review_plan_fingerprint,
      media_type: "application/json",
      source_uri: sourceRunUri,
      durable_uri: null,
      retention_class: "workflow_90_day",
      role: "founder_approved_identity_review",
      summary: "Approved review-only Pokemon identity batch and live collision preflight.",
      metadata: {
        review_work_item_key: authority.review_work_item_key,
        authority_fingerprint_sha256: authority.authority_fingerprint_sha256,
        package_fingerprint_sha256: outcomePackage.package_fingerprint_sha256,
        master_mapping_authority_fingerprint: authority.master_mapping_authority.fingerprint,
      },
    }],
    costCeilingUsd: 0,
    maxAttempts: 3,
    createdAt: authority.review_decided_at || authority.source_completed_at,
    expiresAt: new Date(Date.parse(authority.review_decided_at || authority.source_completed_at) + 7 * 86400_000).toISOString(),
  });
}

export function buildPokemonTcgplayerMappingOutcomeAgentV1() {
  return buildFounderOutcomeAgentV1({
    agentKey: POKEMON_TCGPLAYER_MAPPING_AGENT_KEY,
    displayName: "Pokemon TCGPlayer Mapping Outcome",
    domain: "pricing",
    sourceLocator: ".github/workflows/pokemon-tcgplayer-mapping-outcome.yml",
    description: "Converts approved Pokemon mapping reviews into bounded insert-only mapping outcomes.",
    scheduleKind: "cron",
  });
}

export function buildPokemonTcgplayerMappingWriterInvocationV1(outcomePackage, { headSha, outDir }) {
  validatePokemonTcgplayerMappingOutcomePackageV1(outcomePackage, { sourceCommitSha: headSha });
  return {
    args: ["backend/maintenance/run_canon_maintenance_v1.mjs"],
    env: {
      ENABLE_CANON_MAINTENANCE_MODE: "true",
      CANON_MAINTENANCE_MODE: "EXPLICIT",
      CANON_MAINTENANCE_DRY_RUN: "false",
      CANON_MAINTENANCE_TASK: "backend/maintenance/pokemon_tcgplayer_mapping_outcome_apply_v1.mjs",
      POKEMON_TCGPLAYER_MAPPING_PLAN_PATH: path.join(outDir, "authority.json"),
      POKEMON_TCGPLAYER_MAPPING_EXPECTED_FINGERPRINT: outcomePackage.authority.authority_fingerprint_sha256,
      POKEMON_TCGPLAYER_MAPPING_EXPECTED_COMMIT_SHA: headSha,
      POKEMON_TCGPLAYER_MAPPING_CONFIRMATION: "POKEMON_TCGPLAYER_MAPPING_OUTCOME_APPLY_V1",
      POKEMON_TCGPLAYER_MAPPING_OUTPUT_ROOT: outDir,
    },
    authority: outcomePackage.authority,
    summary_file: "summary.json",
  };
}

export function validatePokemonTcgplayerMappingWriterResultV1(outcomePackage, summary) {
  validatePokemonTcgplayerMappingOutcomePackageV1(outcomePackage);
  if (summary?.status !== "passed" || summary?.mode !== "apply" ||
      summary?.authority_fingerprint_sha256 !== outcomePackage.authority.authority_fingerprint_sha256 ||
      summary?.master_authority_fingerprint !==
        outcomePackage.authority.master_mapping_authority.fingerprint ||
      Number(summary?.durable_mapping_count) !== outcomePackage.authority.expected_mapping_count ||
      Number(summary?.conflict_count) !== 0 || summary?.reconciled !== true) {
    throw new Error("Pokemon mapping writer did not reconcile the approved outcome");
  }
  return summary;
}
