import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

import "../../backend/env.mjs";
import {
  TCGPLAYER_MARKET_FRESHNESS_HOURS_V1,
  TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
  TCGPLAYER_MARKET_SUPPRESSION_HOURS_V1,
  evaluateTcgplayerMarketQualificationV1,
} from "../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs";
import {
  loadTcgplayerMarketCanaryDefinitionV1,
  tcgplayerMarketCanarySourceKeyV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";
import {
  TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1,
  TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1,
  buildTcgplayerCandidateProductPagesV1,
  inspectTcgplayerBoundedPageProgressV1,
  inspectTcgplayerCandidateRowsV1,
} from "../../backend/pricing/tcgplayer_market_candidate_paging_v1.mjs";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
);
const WORKER_VERSION = "TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_7";
const PIPELINE_VERSION = "TCGPLAYER_MARKET_PIPELINE_V1";
const SCHEMA_VERSION = "TCGPLAYER_MARKET_PUBLICATION_SCHEMA_V1";
const SNAPSHOT_SCHEMA_VERSION = "MARKET_PRICE_PUBLICATION_SNAPSHOT_V1";
const MIGRATION_VERSION = "20260728010000";
const REQUIRED_PHASES = [
  "prepare_variant_assignments",
  "stage_candidates",
  "qualify",
  "build_publication",
  "reconcile",
];
const WRITE_MODES = new Set(["shadow", "canary", "production"]);
const ACTIVATION_MODES = new Set(["canary", "production"]);
const DEFAULT_DATABASE_TIMEOUT_MINUTES = 20;
const MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES = 10;

function parseArgs(argv) {
  const args = {
    runMode: "dry_run",
    runKey: null,
    expectedSourceSyncRunId: null,
    outRoot: DEFAULT_OUT_ROOT,
    limit: null,
    canaryDefinitionPath: null,
    freshnessHours: TCGPLAYER_MARKET_FRESHNESS_HOURS_V1,
    suppressionHours: TCGPLAYER_MARKET_SUPPRESSION_HOURS_V1,
    batchSize: 500,
    databaseTimeoutMinutes: Number.parseInt(
      process.env.TCGPLAYER_MARKET_DATABASE_TIMEOUT_MINUTES ||
        String(DEFAULT_DATABASE_TIMEOUT_MINUTES),
      10,
    ),
  };

  for (const arg of argv) {
    if (arg === "--apply" || arg === "--run" || arg === "--production") {
      args.runMode = "production";
    } else if (arg === "--dry-run") {
      args.runMode = "dry_run";
    } else if (arg === "--shadow") {
      args.runMode = "shadow";
    } else if (arg === "--canary") {
      args.runMode = "canary";
    } else if (arg.startsWith("--mode=")) {
      args.runMode = arg.slice("--mode=".length).trim();
    } else if (arg.startsWith("--run-key=")) {
      args.runKey = arg.slice("--run-key=".length).trim();
    } else if (arg.startsWith("--resume-run-key=")) {
      args.runKey = arg.slice("--resume-run-key=".length).trim();
    } else if (arg.startsWith("--expected-source-sync-run-id=")) {
      args.expectedSourceSyncRunId = arg
        .slice("--expected-source-sync-run-id=".length)
        .trim();
    } else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg.startsWith("--canary-definition=")) {
      args.canaryDefinitionPath = path.resolve(
        arg.slice("--canary-definition=".length),
      );
    } else if (arg.startsWith("--freshness-hours=")) {
      args.freshnessHours = Number(arg.slice("--freshness-hours=".length));
    } else if (arg.startsWith("--suppression-hours=")) {
      args.suppressionHours = Number(
        arg.slice("--suppression-hours=".length),
      );
    } else if (arg.startsWith("--batch-size=")) {
      args.batchSize = Number.parseInt(arg.slice("--batch-size=".length), 10);
    } else if (arg.startsWith("--database-timeout-minutes=")) {
      args.databaseTimeoutMinutes = Number.parseInt(
        arg.slice("--database-timeout-minutes=".length),
        10,
      );
    }
  }

  if (!new Set(["dry_run", "shadow", "canary", "production"]).has(args.runMode)) {
    throw new Error("--mode must be dry_run, shadow, canary, or production");
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }
  if (args.runMode === "production" && args.limit !== null) {
    throw new Error(
      "production mode forbids --limit; full rollout must evaluate the complete eligible scope",
    );
  }
  if (
    args.expectedSourceSyncRunId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      args.expectedSourceSyncRunId,
    )
  ) {
    throw new Error("--expected-source-sync-run-id must be a UUID");
  }
  if (!Number.isFinite(args.freshnessHours) || args.freshnessHours <= 0) {
    throw new Error("--freshness-hours must be positive");
  }
  if (
    !Number.isFinite(args.suppressionHours) ||
    args.suppressionHours <= args.freshnessHours
  ) {
    throw new Error("--suppression-hours must exceed --freshness-hours");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 2000) {
    throw new Error("--batch-size must be between 1 and 2000");
  }
  if (
    !Number.isInteger(args.databaseTimeoutMinutes) ||
    args.databaseTimeoutMinutes < 1
  ) {
    throw new Error("--database-timeout-minutes must be a positive integer");
  }
  if (
    WRITE_MODES.has(args.runMode) &&
    args.databaseTimeoutMinutes < MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES
  ) {
    throw new Error(
      `write modes require --database-timeout-minutes >= ${MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES}`,
    );
  }
  if (args.runMode === "canary" && !args.canaryDefinitionPath) {
    throw new Error("canary mode requires --canary-definition");
  }
  if (args.canaryDefinitionPath && args.limit !== null) {
    throw new Error(
      "exact canary definition modes forbid first-N --limit selection",
    );
  }
  if (
    args.canaryDefinitionPath &&
    !new Set(["dry_run", "canary"]).has(args.runMode)
  ) {
    throw new Error(
      "--canary-definition is only valid in dry_run or canary mode",
    );
  }
  return args;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256")
    .update(
      Buffer.isBuffer(value)
        ? value
        : typeof value === "string"
          ? value
          : JSON.stringify(stable(value)),
    )
    .digest("hex");
}

function runKeyNow(mode) {
  return `tcgplayer-market-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function safePathSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function chunks(rows, size) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

async function git(args) {
  const result = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    timeout: 15_000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonLines(filePath, rows, batchSize = 1_000) {
  const handle = await fs.open(filePath, "w");
  try {
    for (const batch of chunks(rows, batchSize)) {
      await handle.writeFile(
        `${batch.map((row) => JSON.stringify(row)).join("\n")}\n`,
      );
    }
  } finally {
    await handle.close();
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function latestSourceRun(client, expectedSourceSyncRunId = null) {
  const result = await client.query(
    `with selected_sync_run as materialized (
       select
         sync_run.id,
         sync_run.run_key,
         sync_run.observed_on,
         sync_run.source_marker,
         sync_run.artifact_hash,
         sync_run.finished_at,
         sync_run.failed_count
       from public.tcgcsv_source_sync_runs sync_run
       where sync_run.sync_mode = 'current_full_sync'
         and sync_run.status = 'completed'
         and sync_run.failed_count = 0
         and sync_run.finished_at is not null
         and ($1::uuid is null or sync_run.id = $1::uuid)
       order by sync_run.finished_at desc, sync_run.created_at desc, sync_run.id desc
       limit 1
     )
     select
       sync_run.id,
       sync_run.run_key,
       sync_run.observed_on,
       sync_run.source_marker,
       sync_run.artifact_hash,
       sync_run.finished_at,
       sync_run.failed_count,
       artifact.id as source_artifact_id,
       artifact.sha256 as source_artifact_hash
     from public.tcgcsv_source_sync_runs sync_run
     left join lateral (
       select source_artifact.id, source_artifact.sha256
       from public.tcgcsv_source_artifacts source_artifact
       where source_artifact.sync_run_id = sync_run.id
         and source_artifact.artifact_kind = 'run_summary'
       order by source_artifact.created_at desc, source_artifact.id desc
       limit 1
     ) artifact on true
     `,
    [expectedSourceSyncRunId],
  );
  if (!result.rowCount) {
    throw new Error("no reconciled completed current TCGCSV source run exists");
  }
  return result.rows[0];
}

function assertCandidateScopeEvidence(rows) {
  const missingScopeEvidence = rows.filter(
    (row) =>
      Number(row.category_id) === 3 &&
      (!String(row.source_product_name ?? "").trim() ||
        !String(row.source_group_name ?? "").trim()),
  );
  if (missingScopeEvidence.length) {
    throw new Error(
      `publication scope evidence missing for ${missingScopeEvidence.length} Pokemon candidates`,
    );
  }
}

async function candidateInventory(client, { limit, sourceRun }) {
  const inventory = (
    await client.query(
      `select
         count(*)::integer as observation_count,
         array_agg(distinct observation.product_id order by observation.product_id)
           as product_ids
       from public.tcgcsv_source_price_daily_observations observation
       where observation.last_seen_run_id = $1
         and observation.observed_on = $2
         and observation.category_id in (1, 3)`,
      [sourceRun.id, sourceRun.observed_on],
    )
  ).rows[0];
  const observationCount = Number(inventory.observation_count);
  return {
    expectedCount: limit === null
      ? observationCount
      : Math.min(limit, observationCount),
    pages: buildTcgplayerCandidateProductPagesV1(inventory.product_ids),
  };
}

async function visitCandidateRowPages(client, {
  limit,
  sourceRun,
  onPage,
}) {
  const inventory = await candidateInventory(client, { limit, sourceRun });
  let processedCount = 0;
  let largestPageCount = 0;
  let firstSourceObservationId = null;
  let lastSourceObservationId = null;

  for (const productIds of inventory.pages) {
    const result = await client.query(
      `select
         candidate.*,
         source_group.name as source_group_name
       from public.v_tcgplayer_market_qualification_candidates_v1 candidate
       left join public.tcgcsv_source_groups source_group
         on source_group.group_id = candidate.group_id
       where candidate.source_sync_run_id = $1
         and candidate.source_product_id = any($2::integer[])
       order by candidate.source_product_id,
                candidate.source_subtype_name,
                candidate.source_observation_id`,
      [sourceRun.id, productIds],
    );
    const remaining = limit === null ? result.rows.length : limit - processedCount;
    const selectedRows = limit === null
      ? result.rows
      : result.rows.slice(0, Math.max(0, remaining));
    if (!selectedRows.length) break;
    assertCandidateScopeEvidence(selectedRows);
    if (selectedRows.some((row) => row.source_sync_run_id !== sourceRun.id)) {
      throw new Error("candidate source sync run drifted inside a bounded page");
    }
    firstSourceObservationId ??= selectedRows[0].source_observation_id;
    lastSourceObservationId = selectedRows.at(-1).source_observation_id;
    processedCount += selectedRows.length;
    largestPageCount = Math.max(largestPageCount, selectedRows.length);
    await onPage(selectedRows);
    if (limit !== null && processedCount >= limit) break;
  }

  const inspection = inspectTcgplayerBoundedPageProgressV1({
    processedCount,
    expectedCount: inventory.expectedCount,
    largestPageCount,
    pageSize: TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1 * 10,
  });
  if (!inspection.valid) {
    throw new Error(`candidate reconciliation failed: ${inspection.findings.join(",")}`);
  }
  return {
    processedCount,
    expectedCount: inventory.expectedCount,
    largestPageCount,
    firstSourceObservationId,
    lastSourceObservationId,
  };
}

async function candidateRows(client, {
  limit,
  canaryDefinition,
  sourceRun,
}) {
  if (canaryDefinition) {
    const printingIds = canaryDefinition.printings.map(
      (printing) => printing.card_printing_id,
    );
    const result = await client.query(
      `select
         candidate.*,
         source_group.name as source_group_name
       from public.v_tcgplayer_market_qualification_candidates_v1 candidate
       left join public.tcgcsv_source_groups source_group
         on source_group.group_id = candidate.group_id
       where candidate.card_printing_id = any($1::uuid[])
         and candidate.source_sync_run_id = $2
       order by candidate.source_product_id,
                candidate.source_subtype_name,
                candidate.source_observation_id`,
      [printingIds, sourceRun.id],
    );
    assertCandidateScopeEvidence(result.rows);
    const rowsBySourceKey = new Map();
    for (const row of result.rows) {
      const key = tcgplayerMarketCanarySourceKeyV1(row);
      const matches = rowsBySourceKey.get(key) ?? [];
      matches.push(row);
      rowsBySourceKey.set(key, matches);
    }
    const rows = canaryDefinition.printings.map((printing) => {
      const key = tcgplayerMarketCanarySourceKeyV1(printing);
      const matches = rowsBySourceKey.get(key) ?? [];
      if (matches.length !== 1) {
        throw new Error(
          `canary source identity ${key} resolved ${matches.length} rows`,
        );
      }
      const row = matches[0];
      const mismatches = [
        ["card_print_id", printing.card_print_id],
        ["gv_id", printing.gv_id],
        ["printing_gv_id", printing.printing_gv_id],
        ["finish_key", printing.expected_finish],
      ].filter(([field, expected]) => row[field] !== expected);
      if (mismatches.length) {
        throw new Error(
          `canary identity ${key} drifted: ${mismatches
            .map(([field, expected]) => `${field}=${row[field]} expected=${expected}`)
            .join(",")}`,
        );
      }
      return row;
    });
    const inspection = inspectTcgplayerCandidateRowsV1({
      rows,
      expectedSourceSyncRunId: sourceRun.id,
      expectedCount: canaryDefinition.printings.length,
    });
    if (!inspection.valid) {
      throw new Error(`canary candidate reconciliation failed: ${inspection.findings.join(",")}`);
    }
    return rows;
  }
  const rows = [];
  await visitCandidateRowPages(client, {
    limit,
    sourceRun,
    onPage: async (page) => rows.push(...page),
  });
  return rows;
}

function buildCandidate(row, runId) {
  return {
    run_id: runId,
    source_observation_id: row.source_observation_id,
    source_sync_run_id: row.source_sync_run_id,
    source_artifact_id: row.source_artifact_id,
    source_price_row_identity: row.source_price_row_identity,
    source_row_hash: row.source_row_hash,
    source_product_id: Number(row.source_product_id),
    source_subtype_name: row.source_subtype_name,
    source_mapping_id: row.source_mapping_id,
    variant_assignment_id: row.variant_assignment_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    candidate_hash: sha256({
      source_observation_id: row.source_observation_id,
      source_row_hash: row.source_row_hash,
      source_mapping_id: row.source_mapping_id,
      variant_assignment_id: row.variant_assignment_id,
      card_printing_id: row.card_printing_id,
    }),
    candidate_payload: row,
  };
}

function buildDecision(candidate, evaluation, run, phaseAttemptId, evaluatedAt) {
  const row = candidate.candidate_payload;
  const decisionKey = sha256({
    run_id: run.id,
    pipeline_candidate_id: candidate.id,
    source_observation_id: row.source_observation_id,
    policy_version: evaluation.policy_version,
  });
  return {
    decision_key: decisionKey,
    run_id: run.id,
    pipeline_candidate_id: candidate.id,
    run_key: run.run_key,
    phase_attempt_id: phaseAttemptId,
    policy_version: evaluation.policy_version,
    source_observation_id: row.source_observation_id,
    source_sync_run_id: row.source_sync_run_id,
    source_artifact_id: row.source_artifact_id,
    source_artifact_date: row.source_artifact_date,
    source_artifact_hash: row.source_artifact_hash,
    source_price_row_identity: row.source_price_row_identity,
    source_row_hash: row.source_row_hash,
    source_mapping_id: row.source_mapping_id,
    candidate_mapping_identity: [
      "tcgplayer",
      row.source_product_id,
      row.source_mapping_id ?? "unmapped",
      row.card_print_id ?? "unmapped",
    ].join(":"),
    variant_assignment_id: row.variant_assignment_id,
    variant_assignment_status:
      row.variant_assignment_status ?? row.derived_variant_assignment_status,
    variant_assignment_version: row.variant_assignment_version,
    mapping_method: row.mapping_method,
    mapping_confidence: row.mapping_confidence,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gv_id: row.gv_id,
    printing_gv_id: row.printing_gv_id,
    finish_key: row.finish_key,
    source_product_id: Number(row.source_product_id),
    source_subtype_name: row.source_subtype_name,
    source_observed_on: row.source_observed_on,
    source_sync_finished_at: row.source_sync_finished_at,
    currency: row.currency,
    market_price: row.market_price,
    decision: evaluation.decision,
    eligible: evaluation.eligible,
    publication_lane: evaluation.publication_lane,
    language_result: evaluation.language_result,
    finish_result: evaluation.finish_result,
    source_integrity_result: evaluation.source_integrity_result,
    duplicate_product_result: evaluation.duplicate_product_result,
    freshness_result: evaluation.freshness_result,
    reason_codes: evaluation.reason_codes,
    evidence: evaluation.evidence,
    observed_at:
      row.source_last_observed_at ?? row.source_sync_finished_at ?? evaluatedAt,
    evaluated_at: evaluatedAt,
    code_version: WORKER_VERSION,
    migration_version: MIGRATION_VERSION,
  };
}

async function ensureRun(client, {
  runKey,
  runMode,
  sourceRun,
  commitSha,
}) {
  const result = await client.query(
    `insert into public.market_price_pipeline_runs (
       run_key,
       pipeline_version,
       policy_version,
       run_mode,
       source_observed_on,
       source_sync_run_id,
       source_artifact_id,
       source_artifact_hash,
       source_marker,
       state,
       current_phase,
       required_phase_count,
       git_commit_sha,
       worker_version,
       schema_version,
       started_at
     )
     values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       'running', 'prepare_variant_assignments', $10, $11, $12, $13, now()
     )
     on conflict (run_key) do nothing
     returning *`,
    [
      runKey,
      PIPELINE_VERSION,
      TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
      runMode,
      sourceRun.observed_on,
      sourceRun.id,
      sourceRun.source_artifact_id,
      sourceRun.source_artifact_hash ?? sourceRun.artifact_hash,
      sourceRun.source_marker,
      REQUIRED_PHASES.length,
      commitSha,
      WORKER_VERSION,
      SCHEMA_VERSION,
    ],
  );
  const run =
    result.rows[0] ??
    (
      await client.query(
        `select *
           from public.market_price_pipeline_runs
          where run_key = $1`,
        [runKey],
      )
    ).rows[0];
  if (
    !run ||
    run.git_commit_sha !== commitSha ||
    run.run_mode !== runMode ||
    run.source_sync_run_id !== sourceRun.id ||
    run.policy_version !== TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3 ||
    run.worker_version !== WORKER_VERSION
  ) {
    throw new Error(
      "resume refused because the frozen run provenance does not match",
    );
  }
  return run;
}

async function completedPhase(client, runId, phaseName) {
  const result = await client.query(
    `select exists (
       select 1
       from public.market_price_pipeline_phase_attempts
       where run_id = $1
         and phase_name = $2
         and state = 'succeeded'
     ) as completed`,
    [runId, phaseName],
  );
  return result.rows[0].completed === true;
}

async function closeInterruptedPhaseAttempts(client, {
  run,
  sourceRun,
  phaseName,
}) {
  const result = await client.query(
    `select started.attempt, started.started_at
       from public.market_price_pipeline_phase_attempts started
      where started.run_id = $1
        and started.phase_name = $2
        and started.state = 'started'
        and not exists (
          select 1
          from public.market_price_pipeline_phase_attempts terminal
          where terminal.run_id = started.run_id
            and terminal.phase_name = started.phase_name
            and terminal.attempt = started.attempt
            and terminal.state in ('succeeded', 'failed')
        )
      order by started.attempt`,
    [run.id, phaseName],
  );
  for (const interrupted of result.rows) {
    await insertPhaseAttempt(client, {
      run,
      phaseName,
      attempt: Number(interrupted.attempt),
      state: "failed",
      sourceRun,
      startedAt: interrupted.started_at,
      completedAt: new Date().toISOString(),
      result: {
        resumability_data: {
          recovered_by_worker_version: WORKER_VERSION,
          recovery_reason: "prior_worker_terminated_without_terminal_state",
        },
      },
      error: new Error("prior worker terminated without a terminal phase state"),
    });
  }
  if (result.rows.length) {
    process.stdout.write(
      `[tcgplayer-market-publication] phase=${phaseName} interrupted_attempts_closed=${result.rows.length}\n`,
    );
  }
  return result.rows.length;
}

async function nextPhaseAttempt(client, runId, phaseName) {
  const result = await client.query(
    `select coalesce(max(attempt), 0)::integer + 1 as attempt
       from public.market_price_pipeline_phase_attempts
      where run_id = $1
        and phase_name = $2`,
    [runId, phaseName],
  );
  return Number(result.rows[0].attempt);
}

async function insertPhaseAttempt(client, {
  run,
  phaseName,
  attempt,
  state,
  sourceRun,
  startedAt,
  completedAt = null,
  result = {},
  error = null,
}) {
  const inserted = await client.query(
    `insert into public.market_price_pipeline_phase_attempts (
       run_id,
       run_key,
       phase_name,
       attempt,
       state,
       source_observed_on,
       source_artifact_id,
       source_artifact_hash,
       started_at,
       completed_at,
       input_count,
       output_count,
       reconciled_count,
       excluded_count,
       quarantined_count,
       error_classification,
       error,
       resumability_data,
       code_version
     )
     values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19
     )
     returning id`,
    [
      run.id,
      run.run_key,
      phaseName,
      attempt,
      state,
      sourceRun.observed_on,
      sourceRun.source_artifact_id,
      sourceRun.source_artifact_hash ?? sourceRun.artifact_hash,
      startedAt,
      completedAt,
      Number(result.input_count ?? 0),
      Number(result.output_count ?? 0),
      Number(result.reconciled_count ?? 0),
      Number(result.excluded_count ?? 0),
      Number(result.quarantined_count ?? 0),
      error ? "phase_execution_failed" : null,
      error ? String(error.message ?? error).slice(0, 10_000) : null,
      JSON.stringify(result.resumability_data ?? {}),
      WORKER_VERSION,
    ],
  );
  return inserted.rows[0].id;
}

async function refreshSucceededPhaseCount(client, runId, phaseName) {
  await client.query(
    `update public.market_price_pipeline_runs run
        set succeeded_phase_count = least(
              run.required_phase_count,
              (
                select count(distinct attempt.phase_name)::integer
                from public.market_price_pipeline_phase_attempts attempt
                where attempt.run_id = run.id
                  and attempt.state = 'succeeded'
                  and attempt.phase_name = any($2::text[])
              )
            ),
            current_phase = $3,
            state = case when run.state = 'failed' then 'running' else run.state end,
            error_classification = null,
            error = null
      where run.id = $1`,
    [runId, REQUIRED_PHASES, phaseName],
  );
}

async function runPhase(client, {
  run,
  sourceRun,
  phaseName,
  operation,
}) {
  if (await completedPhase(client, run.id, phaseName)) {
    process.stdout.write(
      `[tcgplayer-market-publication] phase=${phaseName} status=resumed\n`,
    );
    return { resumed: true };
  }
  await closeInterruptedPhaseAttempts(client, { run, sourceRun, phaseName });
  const attempt = await nextPhaseAttempt(client, run.id, phaseName);
  const startedAt = new Date().toISOString();
  const phaseAttemptId = await insertPhaseAttempt(client, {
    run,
    phaseName,
    attempt,
    state: "started",
    sourceRun,
    startedAt,
  });
  await client.query(
    `update public.market_price_pipeline_runs
        set state = case
              when $2 = 'activate'
                and reconciliation_state = 'reconciled'
                then 'reconciled'
              else 'running'
            end,
            current_phase = $2,
            error_classification = null,
            error = null
      where id = $1`,
    [run.id, phaseName],
  );

  try {
    const result = (await operation({ phaseAttemptId })) ?? {};
    await insertPhaseAttempt(client, {
      run,
      phaseName,
      attempt,
      state: "succeeded",
      sourceRun,
      startedAt,
      completedAt: new Date().toISOString(),
      result,
    });
    await refreshSucceededPhaseCount(client, run.id, phaseName);
    process.stdout.write(
      `[tcgplayer-market-publication] phase=${phaseName} status=succeeded\n`,
    );
    return result;
  } catch (error) {
    await insertPhaseAttempt(client, {
      run,
      phaseName,
      attempt,
      state: "failed",
      sourceRun,
      startedAt,
      completedAt: new Date().toISOString(),
      error,
    }).catch(() => {});
    await client.query(
      `update public.market_price_pipeline_runs
          set state = 'failed',
              current_phase = $2,
              failed_at = now(),
              error_classification = 'phase_execution_failed',
              error = $3
        where id = $1`,
      [run.id, phaseName, String(error.message ?? error).slice(0, 10_000)],
    ).catch(() => {});
    throw error;
  }
}

async function insertCandidates(client, candidates, batchSize) {
  for (const batch of chunks(candidates, batchSize)) {
    await client.query(
      `with incoming as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(
           run_id uuid,
           source_observation_id uuid,
           source_sync_run_id uuid,
           source_artifact_id uuid,
           source_price_row_identity text,
           source_row_hash text,
           source_product_id integer,
           source_subtype_name text,
           source_mapping_id bigint,
           variant_assignment_id uuid,
           card_print_id uuid,
           card_printing_id uuid,
           candidate_hash text,
           candidate_payload jsonb
         )
       )
       insert into public.market_price_pipeline_candidates (
         run_id,
         source_observation_id,
         source_sync_run_id,
         source_artifact_id,
         source_price_row_identity,
         source_row_hash,
         source_product_id,
         source_subtype_name,
         source_mapping_id,
         variant_assignment_id,
         card_print_id,
         card_printing_id,
         candidate_hash,
         candidate_payload
       )
       select
         run_id,
         source_observation_id,
         source_sync_run_id,
         source_artifact_id,
         source_price_row_identity,
         source_row_hash,
         source_product_id,
         source_subtype_name,
         source_mapping_id,
         variant_assignment_id,
         card_print_id,
         card_printing_id,
         candidate_hash,
         candidate_payload
       from incoming
       on conflict (run_id, source_observation_id) do nothing`,
      [JSON.stringify(batch)],
    );
  }
}

async function stagedCandidateCounts(client, runId) {
  const result = await client.query(
    `select
       count(*)::integer as candidate_count,
       count(distinct source_observation_id)::integer as distinct_observation_count
       from public.market_price_pipeline_candidates
      where run_id = $1`,
    [runId],
  );
  return {
    candidateCount: Number(result.rows[0].candidate_count),
    distinctObservationCount: Number(result.rows[0].distinct_observation_count),
  };
}

async function visitStagedCandidatePages(client, runId, onPage) {
  let afterId = null;
  let processedCount = 0;
  let largestPageCount = 0;
  while (true) {
    const result = await client.query(
      `select id, candidate_payload
         from public.market_price_pipeline_candidates
        where run_id = $1
          and ($2::uuid is null or id > $2::uuid)
        order by id
        limit $3`,
      [runId, afterId, TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1],
    );
    if (!result.rows.length) break;
    await onPage(result.rows);
    processedCount += result.rows.length;
    largestPageCount = Math.max(largestPageCount, result.rows.length);
    afterId = result.rows.at(-1).id;
  }
  return { processedCount, largestPageCount };
}

async function insertDecisions(client, decisions, batchSize) {
  for (const batch of chunks(decisions, batchSize)) {
    await client.query(
      `with incoming as (
         select *
         from jsonb_to_recordset($1::jsonb) as row(
           decision_key text,
           run_id uuid,
           pipeline_candidate_id uuid,
           run_key text,
           phase_attempt_id uuid,
           policy_version text,
           source_observation_id uuid,
           source_sync_run_id uuid,
           source_artifact_id uuid,
           source_artifact_date date,
           source_artifact_hash text,
           source_price_row_identity text,
           source_row_hash text,
           source_mapping_id bigint,
           candidate_mapping_identity text,
           variant_assignment_id uuid,
           variant_assignment_status text,
           variant_assignment_version text,
           mapping_method text,
           mapping_confidence numeric,
           card_print_id uuid,
           card_printing_id uuid,
           gv_id text,
           printing_gv_id text,
           finish_key text,
           source_product_id integer,
           source_subtype_name text,
           source_observed_on date,
           source_sync_finished_at timestamptz,
           currency text,
           market_price numeric,
           decision text,
           eligible boolean,
           publication_lane text,
           language_result text,
           finish_result text,
           source_integrity_result text,
           duplicate_product_result text,
           freshness_result text,
           reason_codes text[],
           evidence jsonb,
           observed_at timestamptz,
           evaluated_at timestamptz,
           code_version text,
           migration_version text
         )
       )
       insert into public.market_price_qualification_decisions (
         decision_key,
         run_id,
         pipeline_candidate_id,
         run_key,
         phase_attempt_id,
         policy_version,
         source_observation_id,
         source_sync_run_id,
         source_artifact_id,
         source_artifact_date,
         source_artifact_hash,
         source_price_row_identity,
         source_row_hash,
         source_mapping_id,
         candidate_mapping_identity,
         variant_assignment_id,
         variant_assignment_status,
         variant_assignment_version,
         mapping_method,
         mapping_confidence,
         card_print_id,
         card_printing_id,
         gv_id,
         printing_gv_id,
         finish_key,
         source_product_id,
         source_subtype_name,
         source_observed_on,
         source_sync_finished_at,
         currency,
         market_price,
         decision,
         eligible,
         publication_lane,
         language_result,
         finish_result,
         source_integrity_result,
         duplicate_product_result,
         freshness_result,
         reason_codes,
         evidence,
         observed_at,
         evaluated_at,
         code_version,
         migration_version
       )
       select
         decision_key,
         run_id,
         pipeline_candidate_id,
         run_key,
         phase_attempt_id,
         policy_version,
         source_observation_id,
         source_sync_run_id,
         source_artifact_id,
         source_artifact_date,
         source_artifact_hash,
         source_price_row_identity,
         source_row_hash,
         source_mapping_id,
         candidate_mapping_identity,
         variant_assignment_id,
         variant_assignment_status,
         variant_assignment_version,
         mapping_method,
         mapping_confidence,
         card_print_id,
         card_printing_id,
         gv_id,
         printing_gv_id,
         finish_key,
         source_product_id,
         source_subtype_name,
         source_observed_on,
         source_sync_finished_at,
         currency,
         market_price,
         decision,
         eligible,
         publication_lane,
         language_result,
         finish_result,
         source_integrity_result,
         duplicate_product_result,
         freshness_result,
         reason_codes,
         evidence,
         observed_at,
         evaluated_at,
         code_version,
         migration_version
       from incoming
       on conflict (decision_key) do nothing`,
      [JSON.stringify(batch)],
    );
  }
}

async function ensurePublicationSet(client, run) {
  const counts = await decisionCounts(client, run.id);
  const result = await client.query(
    `insert into public.market_price_publication_sets (
       run_id,
       run_key,
       expected_snapshot_count
     )
     values ($1, $2, $3)
     on conflict (run_id) do update
       set expected_snapshot_count = excluded.expected_snapshot_count
       where public.market_price_publication_sets.publication_state = 'staging'
     returning *`,
    [run.id, run.run_key, counts.eligible_count],
  );
  const publicationSet =
    result.rows[0] ??
    (
      await client.query(
        `select *
           from public.market_price_publication_sets
          where run_id = $1`,
        [run.id],
      )
    ).rows[0];
  if (!publicationSet || publicationSet.publication_state !== "staging") {
    throw new Error("publication set is missing or is not resumable");
  }
  return publicationSet;
}

async function insertSnapshots(client, run, publicationSet, phaseAttemptId) {
  const result = await client.query(
    `insert into public.market_price_publication_snapshots (
       publication_set_id,
       run_id,
       phase_attempt_id,
       qualification_decision_id,
       policy_version,
       snapshot_schema_version,
       source_observation_id,
       source_sync_run_id,
       source_artifact_id,
       source_artifact_date,
       source_artifact_hash,
       source_price_row_identity,
       source_row_hash,
       source_mapping_id,
       variant_assignment_id,
       source_product_id,
       source_subtype_name,
       source_observed_on,
       source_sync_finished_at,
       card_print_id,
       card_printing_id,
       gv_id,
       printing_gv_id,
       finish_key,
       currency,
       market_price,
       low_price,
       mid_price,
       high_price,
       direct_low_price,
       observed_at,
       qualified_at,
       freshness_state,
       code_version
     )
     select
       $2,
       decision.run_id,
       $3,
       decision.id,
       decision.policy_version,
       $4,
       decision.source_observation_id,
       decision.source_sync_run_id,
       decision.source_artifact_id,
       decision.source_artifact_date,
       decision.source_artifact_hash,
       decision.source_price_row_identity,
       decision.source_row_hash,
       decision.source_mapping_id,
       decision.variant_assignment_id,
       decision.source_product_id,
       decision.source_subtype_name,
       decision.source_observed_on,
       decision.source_sync_finished_at,
       decision.card_print_id,
       decision.card_printing_id,
       decision.gv_id,
       decision.printing_gv_id,
       decision.finish_key,
       decision.currency,
       decision.market_price,
       nullif(candidate.candidate_payload ->> 'low_price', '')::numeric,
       nullif(candidate.candidate_payload ->> 'mid_price', '')::numeric,
       nullif(candidate.candidate_payload ->> 'high_price', '')::numeric,
       nullif(candidate.candidate_payload ->> 'direct_low_price', '')::numeric,
       decision.observed_at,
       decision.evaluated_at,
       decision.freshness_result,
       $5
     from public.market_price_qualification_decisions decision
     join public.market_price_pipeline_candidates candidate
       on candidate.id = decision.pipeline_candidate_id
      and candidate.run_id = decision.run_id
     where decision.run_id = $1
       and decision.eligible = true
       and decision.decision = 'publish'
       and decision.publication_lane = 'current'
     on conflict (
       publication_set_id,
       source_observation_id,
       card_printing_id,
       policy_version
     ) do nothing`,
    [
      run.id,
      publicationSet.id,
      phaseAttemptId,
      SNAPSHOT_SCHEMA_VERSION,
      WORKER_VERSION,
    ],
  );
  return result.rowCount;
}

async function decisionCounts(client, runId) {
  const result = await client.query(
    `select
       count(*)::integer as decision_count,
       count(*) filter (where decision = 'publish')::integer as eligible_count,
       count(*) filter (where decision = 'delay')::integer as delayed_count,
       count(*) filter (where decision = 'suppress_stale')::integer as suppressed_count,
       count(*) filter (where decision = 'quarantine')::integer as quarantined_count,
       count(*) filter (where decision = 'exclude')::integer as excluded_count
     from public.market_price_qualification_decisions
     where run_id = $1`,
    [runId],
  );
  return Object.fromEntries(
    Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]),
  );
}

async function reconcileRun(client, runId) {
  const result = await client.query(
    `with candidate_totals as (
       select
         count(*)::integer as selected_count,
         count(*) filter (
           where nullif(candidate_payload ->> 'card_print_mapping_count', '')::integer = 1
         )::integer as mapped_count
       from public.market_price_pipeline_candidates
       where run_id = $1
     ),
     decision_totals as (
       select
         count(*)::integer as decision_count,
         count(*) filter (where decision = 'publish')::integer as eligible_count,
         count(*) filter (where decision = 'delay')::integer as delayed_count,
         count(*) filter (where decision = 'suppress_stale')::integer as suppressed_count,
         count(*) filter (where decision = 'quarantine')::integer as quarantined_count,
         count(*) filter (where decision = 'exclude')::integer as excluded_count
       from public.market_price_qualification_decisions
       where run_id = $1
     ),
     snapshot_totals as (
       select
         count(*)::integer as snapshot_count,
         count(*) filter (
           where decision.id is not null
             and decision.source_observation_id = snapshot.source_observation_id
             and decision.card_printing_id = snapshot.card_printing_id
             and decision.eligible = true
         )::integer as traced_snapshot_count
       from public.market_price_publication_snapshots snapshot
       left join public.market_price_qualification_decisions decision
         on decision.id = snapshot.qualification_decision_id
        and decision.run_id = snapshot.run_id
       where snapshot.run_id = $1
     )
     select *
     from candidate_totals
     cross join decision_totals
     cross join snapshot_totals`,
    [runId],
  );
  const reconciliation = Object.fromEntries(
    Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]),
  );
  const mismatches = [];
  if (reconciliation.selected_count !== reconciliation.decision_count) {
    mismatches.push("selected_decision_count");
  }
  if (reconciliation.eligible_count !== reconciliation.snapshot_count) {
    mismatches.push("eligible_snapshot_count");
  }
  if (reconciliation.snapshot_count !== reconciliation.traced_snapshot_count) {
    mismatches.push("snapshot_trace_count");
  }
  if (
    reconciliation.selected_count !==
    reconciliation.eligible_count +
      reconciliation.delayed_count +
      reconciliation.suppressed_count +
      reconciliation.quarantined_count +
      reconciliation.excluded_count
  ) {
    mismatches.push("decision_lane_count");
  }
  return { ...reconciliation, mismatches };
}

async function persistReconciliation(client, runId, reconciliation) {
  await client.query(
    `update public.market_price_pipeline_runs
        set state = $2,
            current_phase = 'reconcile',
            reconciliation_state = $3,
            selected_count = $4,
            mapped_count = $5,
            excluded_count = $6,
            quarantined_count = $7,
            delayed_count = $8,
            suppressed_count = $9,
            eligible_count = $10,
            snapshot_count = $11,
            completed_at = case when $3 = 'reconciled' then now() else completed_at end,
            reconciliation = $12::jsonb,
            error_classification = case
              when $3 = 'mismatch' then 'reconciliation_mismatch'
              else null
            end,
            error = case
              when $3 = 'mismatch' then array_to_string($13::text[], ',')
              else null
            end
      where id = $1`,
    [
      runId,
      reconciliation.mismatches.length ? "failed" : "reconciled",
      reconciliation.mismatches.length ? "mismatch" : "reconciled",
      reconciliation.selected_count,
      reconciliation.mapped_count,
      reconciliation.excluded_count,
      reconciliation.quarantined_count,
      reconciliation.delayed_count,
      reconciliation.suppressed_count,
      reconciliation.eligible_count,
      reconciliation.snapshot_count,
      JSON.stringify(reconciliation),
      reconciliation.mismatches,
    ],
  );
}

async function activateAndVerify(client, run, publicationSet) {
  await client.query("begin");
  try {
    const activation = await client.query(
      `select *
         from public.activate_market_price_publication_set_v1($1, $2, $3)`,
      [run.id, publicationSet.id, Number(publicationSet.expected_snapshot_count)],
    );
    const readback = await client.query(
      `select
         count(*)::integer as current_count,
         count(*) filter (
           where publication_set_id = $1
             and run_id = $2
         )::integer as matching_count
       from public.v_market_price_current_v1`,
      [publicationSet.id, run.id],
    );
    const currentCount = Number(readback.rows[0].current_count);
    const matchingCount = Number(readback.rows[0].matching_count);
    const expectedCount = Number(publicationSet.expected_snapshot_count);
    if (currentCount !== expectedCount || matchingCount !== expectedCount) {
      throw new Error(
        `published readback mismatch expected=${expectedCount} current=${currentCount} matching=${matchingCount}`,
      );
    }
    await client.query(
      `update public.market_price_pipeline_runs
          set state = 'verified',
              current_phase = 'verify_read_model',
              completed_at = now()
        where id = $1`,
      [run.id],
    );
    await client.query("commit");
    return {
      input_count: expectedCount,
      output_count: matchingCount,
      reconciled_count: matchingCount,
      resumability_data: {
        activation: activation.rows[0],
        readback_current_count: currentCount,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function artifactRows(client, runId, { includeDecisions = true } = {}) {
  const [runResult, reconciliationResult] = await Promise.all([
    client.query(
      `select *
         from public.market_price_pipeline_runs
        where id = $1`,
      [runId],
    ),
    client.query(
      `select reconciliation
         from public.market_price_pipeline_runs
        where id = $1`,
      [runId],
    ),
  ]);
  const decisions = includeDecisions
    ? (
        await client.query(
          `select *
             from public.market_price_qualification_decisions
            where run_id = $1
            order by source_product_id, source_subtype_name, source_observation_id`,
          [runId],
        )
      ).rows
    : null;
  return {
    run: runResult.rows[0],
    decisions,
    reconciliation: reconciliationResult.rows[0]?.reconciliation ?? {},
  };
}

async function writeDatabaseDecisionJsonLines(client, runId, filePath) {
  const handle = await fs.open(filePath, "w");
  let sourceProductId = null;
  let sourceSubtypeName = null;
  let sourceObservationId = null;
  let writtenCount = 0;
  try {
    while (true) {
      const result = await client.query(
        `select *
           from public.market_price_qualification_decisions
          where run_id = $1
            and (
              $2::integer is null
              or source_product_id > $2
              or (
                source_product_id = $2
                and coalesce(source_subtype_name, '') > $3
              )
              or (
                source_product_id = $2
                and coalesce(source_subtype_name, '') = $3
                and source_observation_id > $4::uuid
              )
            )
          order by source_product_id,
                   coalesce(source_subtype_name, ''),
                   source_observation_id
          limit $5`,
        [
          runId,
          sourceProductId,
          sourceSubtypeName,
          sourceObservationId,
          TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1,
        ],
      );
      if (!result.rows.length) break;
      await handle.writeFile(
        `${result.rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
      );
      writtenCount += result.rows.length;
      const last = result.rows.at(-1);
      sourceProductId = Number(last.source_product_id);
      sourceSubtypeName = last.source_subtype_name ?? "";
      sourceObservationId = last.source_observation_id;
    }
  } finally {
    await handle.close();
  }
  return writtenCount;
}

async function writeArtifacts(outDir, {
  client,
  durableRunId,
  runPlan,
  summary,
  decisions,
  reconciliation,
}) {
  await fs.mkdir(outDir, { recursive: true });
  const files = {
    run_plan: path.join(outDir, "run_plan.json"),
    summary: path.join(outDir, "summary.json"),
    decisions: path.join(outDir, "qualification_decisions.jsonl"),
    reconciliation: path.join(outDir, "reconciliation.json"),
  };
  await writeJson(files.run_plan, runPlan);
  await writeJson(files.summary, summary);
  const writtenDecisionCount = Array.isArray(decisions)
    ? (await writeJsonLines(files.decisions, decisions), decisions.length)
    : await writeDatabaseDecisionJsonLines(client, durableRunId, files.decisions);
  if (writtenDecisionCount !== summary.selected_count) {
    throw new Error(
      `decision artifact reconciliation failed expected=${summary.selected_count} written=${writtenDecisionCount}`,
    );
  }
  await writeJson(files.reconciliation, reconciliation);
  const hashes = {};
  for (const [name, filePath] of Object.entries(files)) {
    hashes[name] = await sha256File(filePath);
  }
  await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
}

function emptyDecisionSummary() {
  return {
    selected_count: 0,
    eligible_count: 0,
    delayed_count: 0,
    suppressed_count: 0,
    quarantined_count: 0,
    excluded_count: 0,
    reason_counts: {},
    category_counts: {},
  };
}

function addDecisionToSummary(result, decision, increment = 1) {
  result.selected_count += increment;
  const categoryKey = String(decision.evidence?.category_id ?? decision.category_id ?? "unknown");
  const category = result.category_counts[categoryKey] ?? {
    selected_count: 0,
    eligible_count: 0,
    delayed_count: 0,
    suppressed_count: 0,
    quarantined_count: 0,
    excluded_count: 0,
  };
  category.selected_count += increment;
  if (decision.decision === "publish") result.eligible_count += increment;
  else if (decision.decision === "delay") result.delayed_count += increment;
  else if (decision.decision === "suppress_stale") result.suppressed_count += increment;
  else if (decision.decision === "exclude") result.excluded_count += increment;
  else result.quarantined_count += increment;
  if (decision.decision === "publish") category.eligible_count += increment;
  else if (decision.decision === "delay") category.delayed_count += increment;
  else if (decision.decision === "suppress_stale") category.suppressed_count += increment;
  else if (decision.decision === "exclude") category.excluded_count += increment;
  else category.quarantined_count += increment;
  result.category_counts[categoryKey] = category;
}

function decisionSummary(decisions) {
  const result = emptyDecisionSummary();
  for (const decision of decisions) {
    addDecisionToSummary(result, decision);
    for (const reason of decision.reason_codes) {
      result.reason_counts[reason] = (result.reason_counts[reason] ?? 0) + 1;
    }
  }
  return result;
}

async function decisionSummaryFromDatabase(client, runId) {
  const result = emptyDecisionSummary();
  const categoryRows = await client.query(
    `select
       coalesce(evidence->>'category_id', 'unknown') as category_id,
       decision,
       count(*)::integer as row_count
     from public.market_price_qualification_decisions
     where run_id = $1
     group by coalesce(evidence->>'category_id', 'unknown'), decision`,
    [runId],
  );
  for (const row of categoryRows.rows) {
    addDecisionToSummary(result, row, Number(row.row_count));
  }
  const reasonRows = await client.query(
    `select reason, count(*)::integer as row_count
       from public.market_price_qualification_decisions decision_row
       cross join lateral unnest(decision_row.reason_codes) reason
      where decision_row.run_id = $1
      group by reason`,
    [runId],
  );
  for (const row of reasonRows.rows) {
    result.reason_counts[row.reason] = Number(row.row_count);
  }
  return result;
}

async function runDryRun(client, args, sourceRun, runPlan) {
  const rows = await candidateRows(client, {
    limit: args.limit,
    canaryDefinition: args.canaryDefinition,
    sourceRun,
  });
  const evaluatedAt = new Date().toISOString();
  const decisions = rows.map((row, index) =>
    buildDecision(
      { id: `dry-run-candidate-${index + 1}`, candidate_payload: row },
      evaluateTcgplayerMarketQualificationV1(row, {
        now: new Date(evaluatedAt),
        freshnessHours: args.freshnessHours,
        suppressionHours: args.suppressionHours,
      }),
      { id: "dry-run", run_key: runPlan.run_key },
      null,
      evaluatedAt,
    ),
  );
  const counts = decisionSummary(decisions);
  const reconciliation = {
    ...counts,
    source_sync_run_id: sourceRun.id,
    writes: false,
    mismatches: [],
  };
  return { decisions, reconciliation };
}

async function runDurable(client, args, sourceRun, runPlan) {
  await client.query(
    "select pg_advisory_lock(hashtext('tcgplayer_market_publication_v1'))",
  );
  let run;
  try {
    run = await ensureRun(client, {
      runKey: runPlan.run_key,
      runMode: args.runMode,
      sourceRun,
      commitSha: runPlan.commit_sha,
    });

    if (["shadow_verified", "verified"].includes(run.state)) {
      return artifactRows(client, run.id, { includeDecisions: false });
    }

    await runPhase(client, {
      run,
      sourceRun,
      phaseName: "prepare_variant_assignments",
      operation: async () => {
        const result = await client.query(
          `select public.prepare_tcgplayer_market_variant_assignments_v1($1) as inserted_count`,
          [sourceRun.id],
        );
        const insertedCount = Number(result.rows[0].inserted_count);
        return {
          input_count: insertedCount,
          output_count: insertedCount,
          reconciled_count: insertedCount,
          resumability_data: {
            source_sync_run_id: sourceRun.id,
            inserted_assignment_count: insertedCount,
            idempotent_prepare_no_op: insertedCount === 0,
          },
        };
      },
    });

    await runPhase(client, {
      run,
      sourceRun,
      phaseName: "stage_candidates",
      operation: async () => {
        let progress;
        if (args.canaryDefinition) {
          const rows = await candidateRows(client, {
            limit: args.limit,
            canaryDefinition: args.canaryDefinition,
            sourceRun,
          });
          await insertCandidates(
            client,
            rows.map((row) => buildCandidate(row, run.id)),
            args.batchSize,
          );
          progress = {
            processedCount: rows.length,
            expectedCount: rows.length,
            largestPageCount: rows.length,
            firstSourceObservationId: rows[0]?.source_observation_id ?? null,
            lastSourceObservationId: rows.at(-1)?.source_observation_id ?? null,
          };
        } else {
          progress = await visitCandidateRowPages(client, {
            limit: args.limit,
            sourceRun,
            onPage: async (rows) => {
              await insertCandidates(
                client,
                rows.map((row) => buildCandidate(row, run.id)),
                args.batchSize,
              );
            },
          });
        }
        const staged = await stagedCandidateCounts(client, run.id);
        if (
          staged.candidateCount !== progress.expectedCount ||
          staged.distinctObservationCount !== progress.expectedCount
        ) {
          throw new Error(
            `candidate staging mismatch selected=${progress.expectedCount} staged=${staged.candidateCount} distinct=${staged.distinctObservationCount}`,
          );
        }
        return {
          input_count: progress.processedCount,
          output_count: staged.candidateCount,
          reconciled_count: staged.distinctObservationCount,
          resumability_data: {
            first_source_observation_id: progress.firstSourceObservationId,
            last_source_observation_id: progress.lastSourceObservationId,
            largest_in_memory_page_count: progress.largestPageCount,
            candidate_product_page_size:
              TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1,
          },
        };
      },
    });

    await runPhase(client, {
      run,
      sourceRun,
      phaseName: "qualify",
      operation: async ({ phaseAttemptId }) => {
        const evaluatedAt = new Date().toISOString();
        const candidateCounts = await stagedCandidateCounts(client, run.id);
        const progress = await visitStagedCandidatePages(
          client,
          run.id,
          async (candidates) => {
            const decisions = candidates.map((candidate) =>
              buildDecision(
                candidate,
                evaluateTcgplayerMarketQualificationV1(
                  candidate.candidate_payload,
                  {
                    now: new Date(evaluatedAt),
                    freshnessHours: args.freshnessHours,
                    suppressionHours: args.suppressionHours,
                  },
                ),
                run,
                phaseAttemptId,
                evaluatedAt,
              ),
            );
            await insertDecisions(client, decisions, args.batchSize);
          },
        );
        const pageInspection = inspectTcgplayerBoundedPageProgressV1({
          processedCount: progress.processedCount,
          expectedCount: candidateCounts.candidateCount,
          largestPageCount: progress.largestPageCount,
          pageSize: TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1,
        });
        if (!pageInspection.valid) {
          throw new Error(
            `bounded qualification scan failed: ${pageInspection.findings.join(",")}`,
          );
        }
        const counts = await decisionCounts(client, run.id);
        if (counts.decision_count !== candidateCounts.candidateCount) {
          throw new Error(
            `qualification mismatch candidates=${candidateCounts.candidateCount} decisions=${counts.decision_count}`,
          );
        }
        await client.query(
          `update public.market_price_pipeline_runs
              set state = 'qualified',
                  current_phase = 'qualify'
            where id = $1`,
          [run.id],
        );
        return {
          input_count: candidateCounts.candidateCount,
          output_count: counts.decision_count,
          excluded_count: counts.excluded_count,
          quarantined_count:
            counts.quarantined_count + counts.suppressed_count,
          resumability_data: {
            ...counts,
            largest_in_memory_page_count: progress.largestPageCount,
            staged_candidate_page_size:
              TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1,
          },
        };
      },
    });

    let publicationSet;
    await runPhase(client, {
      run,
      sourceRun,
      phaseName: "build_publication",
      operation: async ({ phaseAttemptId }) => {
        publicationSet = await ensurePublicationSet(client, run);
        await insertSnapshots(client, run, publicationSet, phaseAttemptId);
        const counts = await decisionCounts(client, run.id);
        const snapshotResult = await client.query(
          `select count(*)::integer as snapshot_count
             from public.market_price_publication_snapshots
            where run_id = $1
              and publication_set_id = $2`,
          [run.id, publicationSet.id],
        );
        const snapshotCount = Number(snapshotResult.rows[0].snapshot_count);
        if (snapshotCount !== counts.eligible_count) {
          throw new Error(
            `snapshot build mismatch eligible=${counts.eligible_count} snapshots=${snapshotCount}`,
          );
        }
        return {
          input_count: counts.eligible_count,
          output_count: snapshotCount,
          reconciled_count: snapshotCount,
          resumability_data: { publication_set_id: publicationSet.id },
        };
      },
    });
    publicationSet ??= await ensurePublicationSet(client, run);

    await runPhase(client, {
      run,
      sourceRun,
      phaseName: "reconcile",
      operation: async () => {
        const reconciliation = await reconcileRun(client, run.id);
        await persistReconciliation(client, run.id, reconciliation);
        if (reconciliation.mismatches.length) {
          throw new Error(
            `publication reconciliation failed: ${reconciliation.mismatches.join(",")}`,
          );
        }
        return {
          input_count: reconciliation.selected_count,
          output_count: reconciliation.snapshot_count,
          reconciled_count: reconciliation.traced_snapshot_count,
          excluded_count: reconciliation.excluded_count,
          quarantined_count:
            reconciliation.quarantined_count +
            reconciliation.suppressed_count,
          resumability_data: reconciliation,
        };
      },
    });

    if (args.runMode === "shadow") {
      await client.query(
        `update public.market_price_pipeline_runs
            set state = 'shadow_verified',
                current_phase = 'shadow_verify',
                completed_at = now()
          where id = $1
            and reconciliation_state = 'reconciled'`,
        [run.id],
      );
    } else if (ACTIVATION_MODES.has(args.runMode)) {
      await runPhase(client, {
        run,
        sourceRun,
        phaseName: "activate",
        operation: async () => activateAndVerify(client, run, publicationSet),
      });
    }
    return artifactRows(client, run.id, { includeDecisions: false });
  } finally {
    await client.query(
      "select pg_advisory_unlock(hashtext('tcgplayer_market_publication_v1'))",
    ).catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let loadedCanary = null;
  if (args.canaryDefinitionPath) {
    loadedCanary = await loadTcgplayerMarketCanaryDefinitionV1(
      args.canaryDefinitionPath,
    );
    args.canaryDefinition = loadedCanary.definition;
  } else {
    args.canaryDefinition = null;
  }
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const runKey = args.runKey || runKeyNow(args.runMode);
  const outDir = path.join(args.outRoot, safePathSegment(runKey));
  await fs.mkdir(outDir, { recursive: true });
  const [commitSha, branch, trackedChanges] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain", "--untracked-files=no"]),
  ]);
  if (WRITE_MODES.has(args.runMode) && trackedChanges) {
    throw new Error(
      "write modes require a clean tracked working tree so the producing commit is exact",
    );
  }

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    query_timeout: args.databaseTimeoutMinutes * 60 * 1000,
    statement_timeout: args.databaseTimeoutMinutes * 60 * 1000,
  });
  client.on("error", (error) => {
    process.stderr.write(
      `[tcgplayer-market-publication] database connection error: ${error.message}\n`,
    );
  });
  await client.connect();
  await client.query(
    "select set_config('statement_timeout', $1, false)",
    [`${args.databaseTimeoutMinutes}min`],
  );
  try {
    const sourceRun = await latestSourceRun(
      client,
      args.expectedSourceSyncRunId,
    );
    if (
      args.expectedSourceSyncRunId &&
      sourceRun.id !== args.expectedSourceSyncRunId
    ) {
      throw new Error(
        `Latest source run ${sourceRun.id} does not match shadow-proven source run ${args.expectedSourceSyncRunId}`,
      );
    }
    const runPlan = {
      pipeline_version: PIPELINE_VERSION,
      worker_version: WORKER_VERSION,
      schema_version: SCHEMA_VERSION,
      policy_version: TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
      run_key: runKey,
      run_mode: args.runMode,
      commit_sha: commitSha,
      branch,
      source_sync_run_id: sourceRun.id,
      source_sync_run_key: sourceRun.run_key,
      source_observed_on: sourceRun.observed_on,
      source_artifact_id: sourceRun.source_artifact_id,
      source_artifact_hash:
        sourceRun.source_artifact_hash ?? sourceRun.artifact_hash,
      created_at: new Date().toISOString(),
      settings: {
        limit: args.limit,
        canary_definition_path: loadedCanary
          ? path.relative(REPO_ROOT, loadedCanary.absolutePath).replace(/\\/g, "/")
          : null,
        canary_definition_sha256: loadedCanary
          ? sha256(loadedCanary.raw)
          : null,
        canary_id: loadedCanary?.definition.canary_id ?? null,
        canary_expected_count:
          loadedCanary?.definition.expected_count ?? null,
        freshness_hours: args.freshnessHours,
        suppression_hours: args.suppressionHours,
        batch_size: args.batchSize,
        candidate_product_page_size:
          TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1,
        database_timeout_minutes: args.databaseTimeoutMinutes,
        expected_source_sync_run_id: args.expectedSourceSyncRunId,
      },
      boundaries: {
        source_warehouse_writes: false,
        canonical_identity_writes: false,
        vault_writes: false,
        synthetic_value_calculation: false,
        qualification_ledger_writes: WRITE_MODES.has(args.runMode),
        publication_snapshot_writes: WRITE_MODES.has(args.runMode),
        current_publication_activation: ACTIVATION_MODES.has(args.runMode),
      },
      canary_selection: loadedCanary
        ? loadedCanary.definition.printings.map((printing) => ({
            ordinal: printing.ordinal,
            card_printing_id: printing.card_printing_id,
            source_product_id: printing.source_product_id,
            source_subtype_name: printing.source_subtype_name,
          }))
        : null,
    };
    await writeJson(path.join(outDir, "run_plan.json"), runPlan);

    let decisions;
    let reconciliation;
    let durableRun = null;
    if (args.runMode === "dry_run") {
      ({ decisions, reconciliation } = await runDryRun(
        client,
        args,
        sourceRun,
        runPlan,
      ));
    } else {
      const durable = await runDurable(client, args, sourceRun, runPlan);
      durableRun = durable.run;
      decisions = durable.decisions;
      reconciliation = durable.reconciliation;
    }
    const counts = Array.isArray(decisions)
      ? decisionSummary(decisions)
      : await decisionSummaryFromDatabase(client, durableRun.id);
    const summary = {
      worker_version: WORKER_VERSION,
      policy_version: TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
      run_key: runKey,
      run_mode: args.runMode,
      commit_sha: commitSha,
      source_sync_run_id: sourceRun.id,
      evaluated_at: new Date().toISOString(),
      freshness_hours: args.freshnessHours,
      suppression_hours: args.suppressionHours,
      ...counts,
      durable_run_state: durableRun?.state ?? null,
      reconciliation_state: durableRun?.reconciliation_state ?? null,
      source_of_market_close:
        "tcgcsv_source_price_daily_observations.market_price",
      supporting_fields_change_market_close: false,
      writes_publication_tables: WRITE_MODES.has(args.runMode),
      activates_current_publication: ACTIVATION_MODES.has(args.runMode),
      canary_id: loadedCanary?.definition.canary_id ?? null,
      canary_definition_sha256: loadedCanary
        ? sha256(loadedCanary.raw)
        : null,
      writes_canonical_identity: false,
      writes_vault: false,
    };
    await writeArtifacts(outDir, {
      client,
      durableRunId: durableRun?.id ?? null,
      runPlan,
      summary,
      decisions,
      reconciliation,
    });
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          reconciliation,
          artifact_dir: outDir,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    `[tcgplayer-market-publication] ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
