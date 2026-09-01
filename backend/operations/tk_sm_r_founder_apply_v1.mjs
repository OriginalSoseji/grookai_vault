import {
  FOUNDER_WORK_ITEM_CONTRACT_VERSION,
  OPERATIONS_AGENT_PROTOCOL_VERSION,
  operationsSha256V1,
  stableJsonV1,
  validateFounderWorkItemV1,
  validateOperationsAgentV1,
} from "./operations_control_plane_v1.mjs";

export const TK_SM_R_APPLY_AGENT_KEY = "tk-sm-r-hidden-set-apply-v1";
export const TK_SM_R_APPLY_WORK_ITEM_TYPE = "catalog_hidden_set_apply";
export const TK_SM_R_APPLY_ACTION = "apply_tk_sm_r_hidden_set_v1";
export const TK_SM_R_APPLY_EXECUTOR_VERSION = "TK_SM_R_HIDDEN_SET_APPLY_EXECUTOR_V1";
export const TK_SM_R_APPLY_EXECUTOR_KEY = "github-actions:tk-sm-r-hidden-set-apply-v1";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const EXPECTED_NUMBERS = ["1", "3", "5", "7", "8", "9", "10", "12", "24", "27", "28"];
const REQUIRED_FALSE_BOUNDARIES = [
  "child_printing_writes",
  "external_mapping_writes",
  "storage_writes",
  "image_pointer_writes",
  "pricing_writes",
  "publication_writes",
  "vault_writes",
  "updates",
  "deletes",
];

function clean(value) {
  return String(value ?? "").trim();
}

function assertSha256(value, label) {
  if (!SHA256_PATTERN.test(clean(value))) throw new Error(`${label} must be lowercase SHA-256`);
}

function sortedRows(rows) {
  return [...rows].sort((left, right) =>
    Number(left.number) - Number(right.number) || clean(left.name).localeCompare(clean(right.name)));
}

export function validateTkSmRFounderApplyManifestV1(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("TK-SM-R apply manifest must be an object");
  }
  const expectedStrings = {
    version: "TK_SM_R_FOUNDER_APPLY_MANIFEST_V1",
    agent_key: TK_SM_R_APPLY_AGENT_KEY,
    work_item_type: TK_SM_R_APPLY_WORK_ITEM_TYPE,
    action_type: TK_SM_R_APPLY_ACTION,
    executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
    source_set_code: "tk-sm-r",
    database_set_code: "tk-sm-r",
  };
  for (const [key, expected] of Object.entries(expectedStrings)) {
    if (manifest[key] !== expected) throw new Error(`TK-SM-R manifest ${key} is not frozen`);
  }
  for (const key of [
    "payload_fingerprint_sha256",
    "master_package_fingerprint_sha256",
    "source_snapshot_fingerprint_sha256",
    "package_fingerprint_sha256",
    "expected_persistence_fingerprint_sha256",
  ]) assertSha256(manifest[key], `TK-SM-R manifest ${key}`);
  if (!SHA1_PATTERN.test(clean(manifest.rollback_proof?.producer_commit_sha))) {
    throw new Error("TK-SM-R rollback producer commit is invalid");
  }
  assertSha256(manifest.rollback_proof?.report_sha256, "TK-SM-R rollback report hash");
  if (manifest.rollback_proof?.rollback_absence_verified !== true) {
    throw new Error("TK-SM-R rollback absence proof is required");
  }
  const expectedCounts = {
    card_prints: 11,
    identities: 11,
    evidence: 22,
    family_reviews: 11,
    image_candidates: 0,
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (Number(manifest.expected_counts?.[key]) !== expected) {
      throw new Error(`TK-SM-R expected ${key} must equal ${expected}`);
    }
  }
  if (!Array.isArray(manifest.expected_rows) || manifest.expected_rows.length !== 11) {
    throw new Error("TK-SM-R manifest must freeze exactly 11 rows");
  }
  const rows = sortedRows(manifest.expected_rows);
  if (stableJsonV1(rows.map((row) => clean(row.number))) !== stableJsonV1(EXPECTED_NUMBERS)) {
    throw new Error("TK-SM-R row coordinates changed");
  }
  const ids = new Set();
  const gvIds = new Set();
  for (const row of rows) {
    if (!/^[a-f0-9-]{36}$/.test(clean(row.card_print_id))) {
      throw new Error("TK-SM-R card_print_id is invalid");
    }
    if (!clean(row.gv_id) || !clean(row.name) || !clean(row.number)) {
      throw new Error("TK-SM-R row identity is incomplete");
    }
    if (Number(row.evidence_count) !== 2) throw new Error("TK-SM-R row evidence count changed");
    ids.add(row.card_print_id);
    gvIds.add(row.gv_id);
  }
  if (ids.size !== 11 || gvIds.size !== 11) throw new Error("TK-SM-R row identities must be unique");
  for (const key of REQUIRED_FALSE_BOUNDARIES) {
    if (manifest.boundaries?.[key] !== false) throw new Error(`TK-SM-R boundary ${key} must be false`);
  }
  for (const key of [
    "parent_card_print_inserts_only",
    "identity_inserts_only",
    "source_evidence_inserts_only",
    "family_review_inserts_only",
  ]) {
    if (manifest.boundaries?.[key] !== true) throw new Error(`TK-SM-R boundary ${key} must be true`);
  }
  return manifest;
}

export function buildTkSmRFounderApplyAgentV1() {
  return validateOperationsAgentV1({
    agent_key: TK_SM_R_APPLY_AGENT_KEY,
    display_name: "TK-SM-R Hidden Set Apply",
    domain: "catalog",
    owner_label: "Grookai Catalog Operations",
    description: "Execution-specific publisher and executor for the frozen TK-SM-R 11-row parent delta.",
    execution_platform: "github_actions",
    source_locator: ".github/workflows/tk-sm-r-founder-apply-command.yml",
    schedule_kind: "event",
    schedule_expression: null,
    heartbeat_interval_seconds: 86400,
    stale_after_seconds: 604800,
    allowed_work_item_types: [TK_SM_R_APPLY_WORK_ITEM_TYPE],
    allowed_command_actions: [TK_SM_R_APPLY_ACTION],
    contract_version: OPERATIONS_AGENT_PROTOCOL_VERSION,
    executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
    escalation_policy: {
      stale_severity: "warning",
      failure_severity: "critical",
      recovery_notification: true,
      founder_pause_allowed: true,
    },
  });
}

export function buildTkSmRFounderApplyWorkItemV1({
  manifest,
  executorManifestSha256,
  packageManifestSha256,
  sourceCommitSha,
  sourceRunUri = null,
  createdAt = new Date().toISOString(),
  expiresAt = new Date(Date.now() + 3 * 86400_000).toISOString(),
}) {
  validateTkSmRFounderApplyManifestV1(manifest);
  assertSha256(executorManifestSha256, "TK-SM-R executor manifest hash");
  assertSha256(packageManifestSha256, "TK-SM-R package manifest file hash");
  if (!SHA1_PATTERN.test(clean(sourceCommitSha))) throw new Error("TK-SM-R source commit must be SHA-1");
  if (Number.isNaN(Date.parse(createdAt)) || Number.isNaN(Date.parse(expiresAt))) {
    throw new Error("TK-SM-R work item timestamps are invalid");
  }
  const planPayload = {
    proposal_kind: "catalog_hidden_set_apply",
    proposal_version: FOUNDER_WORK_ITEM_CONTRACT_VERSION,
    created_at: createdAt,
    expires_at: expiresAt,
    source_commit_sha: sourceCommitSha,
    source_run_uri: sourceRunUri,
    executor_manifest_sha256: executorManifestSha256,
    package_manifest_file_sha256: packageManifestSha256,
    execution_plan: manifest,
    approval_boundary: {
      execution_enabled: true,
      exact_parent_card_print_inserts: 11,
      exact_identity_inserts: 11,
      exact_source_evidence_inserts: 22,
      exact_family_review_inserts: 11,
      all_other_writes: false,
    },
  };
  const planFingerprint = operationsSha256V1(planPayload);
  const evidenceBase = `tk-sm-r:${manifest.payload_fingerprint_sha256.slice(0, 16)}`;
  return validateFounderWorkItemV1({
    work_item_key: `catalog-apply:pokemon:tk-sm-r:${manifest.payload_fingerprint_sha256.slice(0, 16)}`,
    work_item_type: TK_SM_R_APPLY_WORK_ITEM_TYPE,
    action_type: TK_SM_R_APPLY_ACTION,
    agent_key: TK_SM_R_APPLY_AGENT_KEY,
    title: "Apply 11 verified TK-SM-R parent cards",
    summary: "Insert the exact rollback-proven TK-SM-R parent delta: 11 card_prints, 11 identities, 22 evidence rows, and 11 family reviews. No child printings, images, pricing, publication, or Vault writes.",
    domain: "catalog",
    risk_level: "high",
    scope: {
      game_code: "pokemon",
      language: "en",
      source_set_code: "tk-sm-r",
      database_set_code: "tk-sm-r",
      payload_fingerprint_sha256: manifest.payload_fingerprint_sha256,
      expected_counts: manifest.expected_counts,
      expected_card_print_ids: sortedRows(manifest.expected_rows).map((row) => row.card_print_id),
    },
    exclusions: [
      "no child printing writes",
      "no external mapping writes",
      "no Storage writes",
      "no image pointer writes",
      "no pricing or publication writes",
      "no Vault writes",
      "no updates or deletes",
      "no rows outside the exact 11-card payload",
    ],
    plan_payload: planPayload,
    plan_fingerprint: planFingerprint,
    source_commit_sha: sourceCommitSha,
    contract_version: FOUNDER_WORK_ITEM_CONTRACT_VERSION,
    executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
    requires_recent_auth: true,
    command_policy: {
      execution_enabled: true,
      cost_ceiling_usd: 0,
      execution_deadline_seconds: 3600,
      max_attempts: 2,
      retry_policy: "founder_only_after_exact_readback",
    },
    expires_at: expiresAt,
    evidence: [
      {
        evidence_key: `${evidenceBase}:founder-apply-manifest`,
        sha256: executorManifestSha256,
        media_type: "application/json",
        source_uri: sourceRunUri,
        durable_uri: `https://github.com/OriginalSoseji/grookai_vault/blob/${sourceCommitSha}/docs/audits/catalog_incremental_promotion/tk_sm_r_hidden_set_v1/founder_apply_manifest.json`,
        retention_class: "permanent_audit",
        role: "frozen_execution_plan",
        summary: "Exact TK-SM-R Founder Operations execution manifest",
        metadata: { source_set_code: "tk-sm-r" },
      },
      {
        evidence_key: `${evidenceBase}:rollback-proof`,
        sha256: manifest.rollback_proof.report_sha256,
        media_type: "application/json",
        source_uri: manifest.rollback_proof.run_uri,
        durable_uri: null,
        retention_class: "workflow_90_day",
        role: "rollback_proof",
        summary: "Production transaction and rollback absence proof",
        metadata: { github_run_id: manifest.rollback_proof.github_run_id },
      },
      {
        evidence_key: `${evidenceBase}:package-manifest`,
        sha256: packageManifestSha256,
        media_type: "application/json",
        source_uri: sourceRunUri,
        durable_uri: `https://github.com/OriginalSoseji/grookai_vault/blob/${sourceCommitSha}/docs/audits/catalog_incremental_promotion/tk_sm_r_hidden_set_v1/package_manifest.json`,
        retention_class: "permanent_audit",
        role: "authority_package",
        summary: "Rollback-reviewed TK-SM-R authority package",
        metadata: { package_fingerprint_sha256: manifest.package_fingerprint_sha256 },
      },
    ],
  });
}

export function validateTkSmRClaimedCommandV1({ command, manifest, executorManifestSha256, headSha }) {
  validateTkSmRFounderApplyManifestV1(manifest);
  assertSha256(executorManifestSha256, "TK-SM-R executor manifest hash");
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    throw new Error("TK-SM-R claimed command is required");
  }
  if (command.action_type !== TK_SM_R_APPLY_ACTION) throw new Error("TK-SM-R command action mismatch");
  if (command.executor_version !== TK_SM_R_APPLY_EXECUTOR_VERSION) {
    throw new Error("TK-SM-R command executor mismatch");
  }
  if (!SHA1_PATTERN.test(clean(headSha))) throw new Error("TK-SM-R executor HEAD is invalid");
  const planPayload = command.frozen_scope?.plan_payload;
  if (!planPayload || typeof planPayload !== "object" || Array.isArray(planPayload)) {
    throw new Error("TK-SM-R command plan payload is missing");
  }
  if (operationsSha256V1(planPayload) !== command.plan_fingerprint) {
    throw new Error("TK-SM-R command plan fingerprint mismatch");
  }
  if (planPayload.source_commit_sha !== headSha) throw new Error("TK-SM-R executor commit mismatch");
  if (planPayload.executor_manifest_sha256 !== executorManifestSha256) {
    throw new Error("TK-SM-R executor manifest hash mismatch");
  }
  if (stableJsonV1(planPayload.execution_plan) !== stableJsonV1(manifest)) {
    throw new Error("TK-SM-R frozen execution plan mismatch");
  }
  if (Number(command.cost_ceiling_usd ?? 0) !== 0) throw new Error("TK-SM-R command cost ceiling changed");
  const exclusions = command.frozen_scope?.exclusions;
  if (!Array.isArray(exclusions) || exclusions.length !== 8) {
    throw new Error("TK-SM-R command exclusions changed");
  }
  return {
    passed: true,
    plan_fingerprint: command.plan_fingerprint,
    action_type: TK_SM_R_APPLY_ACTION,
    executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
    executor_manifest_sha256: executorManifestSha256,
    source_commit_sha: headSha,
  };
}

export function buildTkSmRExactApprovalV1({ manifest, headSha }) {
  validateTkSmRFounderApplyManifestV1(manifest);
  if (!SHA1_PATTERN.test(clean(headSha))) throw new Error("TK-SM-R approval commit is invalid");
  return [
    "I approve ENGLISH_POKEMON_INCREMENTAL_PROMOTION_V1 apply only",
    "source_set=tk-sm-r",
    "database_set=tk-sm-r",
    `payload_fingerprint=${manifest.payload_fingerprint_sha256}`,
    `master_package_fingerprint=${manifest.master_package_fingerprint_sha256}`,
    `source_snapshot_fingerprint=${manifest.source_snapshot_fingerprint_sha256}`,
    `commit_sha=${headSha}`,
  ].join("; ");
}

const PERSISTED_COLUMNS = {
  card_prints: [
    "id", "set_id", "name", "number", "variant_key", "rarity", "artist",
    "image_url", "image_alt_url", "image_source", "image_status", "image_note",
    "external_ids", "variants", "print_identity_key", "ai_metadata",
    "data_quality_flags", "image_res", "gv_id", "set_code", "printed_set_abbrev",
    "printed_total", "regulation_mark", "identity_domain", "printed_identity_modifier",
    "set_identity_model", "representative_image_url",
  ],
  identities: [
    "id", "card_print_id", "identity_domain", "set_code_identity", "printed_number",
    "normalized_printed_name", "source_name_raw", "identity_payload",
    "identity_key_version", "identity_key_hash", "is_active",
  ],
  evidence: [
    "id", "card_print_identity_id", "card_print_id", "acquisition_key", "source_key",
    "evidence_key_hash", "evidence_subject", "evidence_payload", "active",
  ],
  family_reviews: [
    "id", "card_print_identity_id", "card_print_id", "acquisition_key", "family_status",
    "family_candidate_source", "normalized_family_candidate", "review_status",
    "family_link_promotion_allowed", "review_key_hash", "evidence_subject", "active",
  ],
};

function persistedRow(row, columns) {
  return Object.fromEntries(columns.map((column) => [column, row?.[column] ?? null]));
}

export function buildTkSmRPersistenceProjectionV1({
  cardPrints = [], identities = [], evidence = [], familyReviews = [],
}) {
  const project = (rows, columns) => rows
    .map((row) => persistedRow(row, columns))
    .sort((left, right) => clean(left.id).localeCompare(clean(right.id)));
  return {
    card_prints: project(cardPrints, PERSISTED_COLUMNS.card_prints),
    identities: project(identities, PERSISTED_COLUMNS.identities),
    evidence: project(evidence, PERSISTED_COLUMNS.evidence),
    family_reviews: project(familyReviews, PERSISTED_COLUMNS.family_reviews),
  };
}

export function tkSmRPersistenceFingerprintV1(rows) {
  return operationsSha256V1(buildTkSmRPersistenceProjectionV1(rows));
}

export function classifyTkSmRReadbackV1(readback, manifest) {
  validateTkSmRFounderApplyManifestV1(manifest);
  const expected = manifest.expected_counts;
  const keys = ["card_prints", "identities", "evidence", "family_reviews"];
  const coreCounts = Object.fromEntries(keys.map((key) => [key, Number(readback?.[key] ?? 0)]));
  const forbidden = ["child_printings", "mappings", "vault_items", "image_pointer_rows"];
  const forbiddenCounts = Object.fromEntries(forbidden.map((key) => [key, Number(readback?.[key] ?? 0)]));
  const rows = sortedRows(Array.isArray(readback?.rows) ? readback.rows : []);
  const expectedRows = sortedRows(manifest.expected_rows);
  const rowsExact = stableJsonV1(rows) === stableJsonV1(expectedRows);
  const empty = keys.every((key) => coreCounts[key] === 0) && rows.length === 0;
  const exact = keys.every((key) => coreCounts[key] === Number(expected[key]))
    && Object.values(forbiddenCounts).every((count) => count === 0)
    && rowsExact
    && readback?.persistence_fingerprint_sha256 === manifest.expected_persistence_fingerprint_sha256;
  return {
    state: exact ? "exact" : empty ? "empty" : "partial_or_conflicting",
    exact,
    empty,
    rows_exact: rowsExact,
    persistence_fingerprint_sha256: clean(readback?.persistence_fingerprint_sha256) || null,
    persistence_fingerprint_exact:
      readback?.persistence_fingerprint_sha256 === manifest.expected_persistence_fingerprint_sha256,
    ...coreCounts,
    ...forbiddenCounts,
    rows,
  };
}

export function validateTkSmRApplyReportV1(report, manifest) {
  validateTkSmRFounderApplyManifestV1(manifest);
  if (report?.pass !== true || report?.mode !== "apply") throw new Error("TK-SM-R apply report did not pass");
  if (report.payload_fingerprint_sha256 !== manifest.payload_fingerprint_sha256) {
    throw new Error("TK-SM-R apply payload fingerprint changed");
  }
  for (const [key, expected] of Object.entries(manifest.expected_counts)) {
    if (Number(report.counts?.[key]) !== Number(expected)) {
      throw new Error(`TK-SM-R apply count mismatch: ${key}`);
    }
  }
  if (Object.values(report.collision_preflight ?? {}).some((count) => Number(count) !== 0)) {
    throw new Error("TK-SM-R collision preflight was not clean");
  }
  const inserted = report.inserted_readback ?? {};
  for (const [key, expected] of Object.entries(manifest.expected_counts)) {
    if (key === "image_candidates") continue;
    if (Number(inserted[key]) !== Number(expected)) {
      throw new Error(`TK-SM-R apply readback count mismatch: ${key}`);
    }
  }
  for (const key of ["child_printings", "mappings", "vault_items", "image_pointer_rows"]) {
    if (Number(inserted[key]) !== 0) throw new Error(`TK-SM-R apply boundary violation: ${key}`);
  }
  if (stableJsonV1(sortedRows(report.rows ?? [])) !== stableJsonV1(sortedRows(manifest.expected_rows))) {
    throw new Error("TK-SM-R apply report rows changed");
  }
  return { summary_exact: true };
}
