import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import "../../backend/env.mjs";
import {
  MEE_ACQUISITION_PLAN_KEY,
  MEE_DEFAULT_MIN_FREE_BYTES,
  MEE_NIGHTLY_RUNTIME_POLICY_VERSION,
  buildCursorEventV1,
  classifyPipelineOutcomeV1,
  evaluateDiskCapacityV1,
  resolveAcquisitionCursorV1,
} from "../../backend/pricing/mee_nightly_runtime_policy_v1.mjs";
import {
  meeArtifactReferenceV1,
  resolveMeeArtifactInputV1,
  resolveMeeAuditRootV1,
} from "../../backend/pricing/mee_runtime_artifacts_v1.mjs";
import { computeMarketListingRequestManifestHashV1 } from "../../backend/pricing/market_listing_acquisition_dry_run_plan_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_ROOT = resolveMeeAuditRootV1(REPO_ROOT);
const PACKAGE_ID = "MARKET-LISTING-NIGHTLY-PIPELINE-V2";
const PIPELINE_KEY = "mee_listing_ingest_v2";
const DEFAULT_CALL_CEILING = 4000;

export function safeRunSlugV2(value) {
  const slug = String(value ?? "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 140);
  if (!slug) throw new Error("run key normalized to an empty artifact slug");
  return slug;
}

export function parseChildJsonV2(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Child scripts may emit bounded progress or dotenv messages before JSON.
  }
  for (let index = trimmed.indexOf("{"); index !== -1; index = trimmed.indexOf("{", index + 1)) {
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Continue to the next possible object boundary.
    }
  }
  return null;
}

function parseArgs(argv) {
  const callCeilingRaw = argv.find((arg) => arg.startsWith("--call-ceiling="))?.slice("--call-ceiling=".length);
  const callCeiling = Number.parseInt(callCeilingRaw ?? String(DEFAULT_CALL_CEILING), 10);
  if (!Number.isInteger(callCeiling) || callCeiling <= 0) throw new Error("--call-ceiling must be positive");
  return {
    run: argv.includes("--run"),
    requestedRunKey: argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length)
      ?? `MEE-NIGHTLY-${new Date().toISOString().slice(0, 10)}`,
    frozenDryRunPath: argv.find((arg) => arg.startsWith("--frozen-dry-run="))?.slice("--frozen-dry-run=".length)
      ?? null,
    frozenDryRunIfIncompletePath: argv
      .find((arg) => arg.startsWith("--frozen-dry-run-if-incomplete="))
      ?.slice("--frozen-dry-run-if-incomplete=".length) ?? null,
    callCeiling,
    acquisitionMode: process.env.MEE_NIGHTLY_ACQUISITION_MODE ?? "rotating_cycle",
    minimumFreeBytes: Number.parseInt(
      process.env.MEE_NIGHTLY_MIN_FREE_BYTES ?? String(MEE_DEFAULT_MIN_FREE_BYTES),
      10,
    ),
  };
}

function directDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function pgSslConfig(connectionString) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(connectionString) ? false : { rejectUnauthorized: false };
}

async function withClient(callback) {
  const connectionString = directDbUrl();
  if (!connectionString) throw new Error("A direct database URL is required for the V2 nightly pipeline");
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    ssl: pgSslConfig(connectionString),
  });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function latestCursor() {
  return withClient(async (client) => {
    const result = await client.query(
      `select *
         from public.v_market_listing_acquisition_cursor_latest_v1
        where source = 'ebay_active' and plan_key = $1
        limit 1`,
      [MEE_ACQUISITION_PLAN_KEY],
    );
    return result.rows[0] ?? null;
  });
}

async function recordCursorEvent(event) {
  return withClient(async (client) => {
    const result = await client.query(
      `insert into public.market_listing_acquisition_cursor_events (
         source, plan_key, run_key, acquisition_mode, source_manifest_hash,
         cycle_ordinal, batch_ordinal, start_index, next_start_index,
         source_request_count, selected_request_count, cycle_complete
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
       )
       on conflict (source, plan_key, run_key) do nothing
       returning id`,
      [
        event.source,
        event.plan_key,
        event.run_key,
        event.acquisition_mode,
        event.source_manifest_hash,
        event.cycle_ordinal,
        event.batch_ordinal,
        event.start_index,
        event.next_start_index,
        event.source_request_count,
        event.selected_request_count,
        event.cycle_complete,
      ],
    );
    return { inserted: result.rowCount === 1, id: result.rows[0]?.id ?? null };
  });
}

async function providerPhasePreviouslyAttempted(runKey) {
  return withClient(async (client) => {
    const result = await client.query(
      `select id, status, artifact_path, payload
         from public.market_pricing_pipeline_phase_runs
        where pipeline = $1
          and phase = 'daily_batch_fetch'
          and run_key = $2
        order by created_at desc, id desc
        limit 1`,
      [PIPELINE_KEY, runKey],
    );
    return result.rows[0] ?? null;
  });
}

async function latestUnfinishedPipeline() {
  return withClient(async (client) => {
    const result = await client.query(
      `select
         latest.run_key,
         coalesce(summary.artifact_path, latest.artifact_path) as artifact_path,
         coalesce(summary.status, latest.status) as status,
         coalesce(summary.payload, latest.payload) as payload
       from (
         select run_key, artifact_path, status, payload, created_at, id
         from public.market_pricing_pipeline_phase_runs
         where pipeline = $1 and run_key is not null
         order by created_at desc, id desc
         limit 1
       ) latest
       left join lateral (
         select artifact_path, status, payload
         from public.market_pricing_pipeline_phase_runs
         where pipeline = $1
           and phase = 'pipeline_summary'
           and run_key = latest.run_key
         order by created_at desc, id desc
         limit 1
       ) summary on true`,
      [PIPELINE_KEY],
    );
    const row = result.rows[0] ?? null;
    return row && row.status !== "succeeded" ? row : null;
  });
}

async function appendPhaseLedger(runKey, phase, statePath) {
  if (!directDbUrl()) return null;
  const status = phase.ledger_status ?? (phase.status === 0 ? "succeeded" : "failed");
  return withClient(async (client) => {
    const result = await client.query(
      `insert into public.market_pricing_pipeline_phase_runs (
         pipeline, phase, run_key, artifact_path, started_at, finished_at,
         status, acquired_count, candidate_count, inserted_count,
         updated_count, no_op_count, failed_count, error, payload
       ) values (
         $1, $2, $3, $4, $5::timestamptz, $6::timestamptz,
         $7, 0, 0, 0, 0, 0, $8, $9, $10::jsonb
       ) returning id`,
      [
        PIPELINE_KEY,
        phase.phase,
        runKey,
        statePath,
        phase.started_at,
        phase.finished_at ?? null,
        status,
        status === "failed" ? 1 : 0,
        status === "failed" ? phase.stderr_tail : null,
        JSON.stringify({
          command: phase.command,
          report_path: phase.report_path ?? null,
          stdout_tail: phase.stdout_tail,
          stderr_tail: phase.stderr_tail,
          resumed: phase.resumed ?? false,
        }),
      ],
    );
    return result.rows[0]?.id ?? null;
  });
}

function childReportPath(parsed) {
  const reference = parsed?.artifacts?.jsonPath
    ?? parsed?.artifacts?.reportJsonPath
    ?? parsed?.artifacts?.json
    ?? null;
  return resolveMeeArtifactInputV1(REPO_ROOT, reference);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveFrozenDryRunPathV2(inputPath) {
  const resolved = resolveMeeArtifactInputV1(REPO_ROOT, inputPath);
  const relative = path.relative(AUDIT_ROOT, resolved);
  if (!resolved || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("frozen dry-run plan must be inside the governed MEE artifact root");
  }
  if (!existsSync(resolved)) throw new Error(`frozen dry-run plan is missing: ${resolved}`);
  return resolved;
}

export function selectFrozenDryRunPathV2({ strictPath, conditionalPath, previousCursor } = {}) {
  if (strictPath && conditionalPath) {
    throw new Error("--frozen-dry-run and --frozen-dry-run-if-incomplete cannot be used together");
  }
  if (strictPath) return strictPath;
  if (conditionalPath && previousCursor && previousCursor.cycle_complete === false) return conditionalPath;
  return null;
}

export function validateFrozenDryRunPlanV2({ plan, previousCursor } = {}) {
  const findings = [];
  const requests = Array.isArray(plan?.acquisition_requests) ? plan.acquisition_requests : [];
  if (plan?.package_id !== "MARKET-LISTING-ACQUISITION-DRY-RUN-PLAN-V1") findings.push("package_id_mismatch");
  if (plan?.ready_for_acquisition_approval !== true) findings.push("plan_not_ready");
  if (!Array.isArray(plan?.acquisition_requests)) findings.push("missing_acquisition_requests");
  if (Number(plan?.summary?.acquisition_request_count) !== requests.length) findings.push("summary_request_count_mismatch");
  if (new Set(requests.map((request) => request.query_key)).size !== requests.length) findings.push("duplicate_query_key");
  const recomputedHash = computeMarketListingRequestManifestHashV1(requests);
  if (recomputedHash !== plan?.request_manifest_hash_sha256) findings.push("manifest_hash_mismatch");
  if (previousCursor) {
    if (previousCursor.cycle_complete === true) findings.push("previous_cycle_already_complete");
    if (previousCursor.source_manifest_hash !== plan?.request_manifest_hash_sha256) findings.push("cursor_manifest_mismatch");
    if (Number(previousCursor.source_request_count) !== requests.length) findings.push("cursor_request_count_mismatch");
  }
  if (findings.length > 0) {
    throw new Error(`frozen dry-run plan rejected: ${findings.join(",")}`);
  }
  return {
    request_manifest_hash: recomputedHash,
    request_count: requests.length,
  };
}

function saveState(statePath, state) {
  const tempPath = `${statePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tempPath, statePath);
}

function normalizeRollupVersionSuffixV2(raw) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function phaseReportSupportsResumeV2({ phase, report, sourceAcquisitionRunKey }) {
  if (phase === "strict_filtered_rollup_apply") {
    const suffix = normalizeRollupVersionSuffixV2(sourceAcquisitionRunKey);
    return Boolean(
      suffix
      && Array.isArray(report?.rollup_versions)
      && report.rollup_versions.length > 0
      && report.rollup_versions.every((version) => String(version).endsWith(`__${suffix}`)),
    );
  }
  if (phase === "run_scoped_readback") {
    return Boolean(
      sourceAcquisitionRunKey
      && report?.run_key === sourceAcquisitionRunKey
      && Array.isArray(report?.findings)
      && report.findings.length === 0,
    );
  }
  return true;
}

function executeChild(phase, command) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
    timeout: 1000 * 60 * 60 * 6,
    maxBuffer: 256 * 1024 * 1024,
  });
  const parsed = parseChildJsonV2(result.stdout);
  return {
    phase,
    command: command.join(" "),
    status: result.status ?? 1,
    signal: result.signal,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    stdout_tail: String(result.stdout ?? "").slice(-8000),
    stderr_tail: String(result.stderr ?? "").slice(-8000),
    child_output: parsed,
    report_path: childReportPath(parsed),
  };
}

function phaseSucceeded(state, phase) {
  const saved = state.phases?.[phase];
  if (!saved || saved.status !== 0) return null;
  if (saved.report_path && !existsSync(saved.report_path)) {
    throw new Error(`resume artifact missing for phase ${phase}: ${saved.report_path}`);
  }
  if (
    saved.report_path
    && !phaseReportSupportsResumeV2({
      phase,
      report: readJson(saved.report_path),
      sourceAcquisitionRunKey: state.source_acquisition_run?.run_key,
    })
  ) {
    return null;
  }
  return { ...saved, resumed: true };
}

function artifactFrom(state, phase) {
  const reportPath = state.phases?.[phase]?.report_path;
  if (!reportPath || !existsSync(reportPath)) throw new Error(`required phase artifact missing: ${phase}`);
  return reportPath;
}

export function phaseDefinitionsV2({ callCeiling, state, cursor }) {
  const acquisitionRunKey = () => {
    const value = state.source_acquisition_run?.run_key;
    if (!value) throw new Error("source acquisition run identity is not available");
    return value;
  };
  return [
    { key: "dry_run_plan", command: () => ["node", "scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs"] },
    {
      key: "daily_batch_plan",
      command: () => [
        "node",
        "scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs",
        `--dry-run=${artifactFrom(state, "dry_run_plan")}`,
        `--call-limit=${callCeiling}`,
        `--start-index=${cursor.start_index}`,
        `--batch-ordinal=${cursor.batch_ordinal}`,
      ],
    },
    {
      key: "daily_batch_fetch",
      provider_calls: true,
      command: () => [
        "node",
        "scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs",
        `--batch-plan=${artifactFrom(state, "daily_batch_plan")}`,
        "--allow-dynamic-plan",
      ],
    },
    {
      key: "daily_batch_backfill_plan",
      command: () => [
        "node",
        "scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs",
        `--fetch=${artifactFrom(state, "daily_batch_fetch")}`,
        "--allow-dynamic-plan",
      ],
    },
    {
      key: "daily_batch_backfill_apply",
      db_writes: true,
      command: () => [
        "node",
        "scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs",
        `--plan=${artifactFrom(state, "daily_batch_backfill_plan")}`,
        "--allow-dynamic-plan",
        "--apply",
      ],
    },
    {
      key: "card_candidate_rollup_plan",
      command: () => [
        "node",
        "scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs",
        `--run-key=${acquisitionRunKey()}`,
      ],
    },
    {
      key: "card_candidate_rollup_apply",
      db_writes: true,
      command: () => [
        "node",
        "scripts/audits/market_listing_card_candidate_rollup_apply_v1.mjs",
        `--plan=${artifactFrom(state, "card_candidate_rollup_plan")}`,
        "--allow-dynamic-plan",
        "--apply",
      ],
    },
    {
      key: "strict_filtered_rollup_plan",
      command: () => [
        "node",
        "scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs",
        `--run-key=${acquisitionRunKey()}`,
      ],
    },
    {
      key: "strict_filtered_rollup_apply",
      db_writes: true,
      command: () => [
        "node",
        "scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs",
        `--plan=${artifactFrom(state, "strict_filtered_rollup_plan")}`,
        "--allow-dynamic-plan",
        `--run-key=${acquisitionRunKey()}`,
        "--apply",
      ],
    },
    {
      key: "run_scoped_readback",
      command: () => [
        "node",
        "scripts/audits/market_listing_nightly_ingest_readback_v1.mjs",
        `--run-key=${acquisitionRunKey()}`,
      ],
    },
  ];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(AUDIT_ROOT, { recursive: true });
  let statePath = path.join(AUDIT_ROOT, `mee_nightly_pipeline_v2_state_${safeRunSlugV2(args.requestedRunKey)}.json`);
  if (args.run && !existsSync(statePath)) {
    const unfinished = await latestUnfinishedPipeline();
    if (unfinished?.artifact_path) {
      const unfinishedPath = resolveMeeArtifactInputV1(REPO_ROOT, unfinished.artifact_path);
      if (!existsSync(unfinishedPath)) {
        throw new Error(`unfinished pipeline state is missing: ${unfinishedPath}; refusing to refetch`);
      }
      statePath = unfinishedPath;
    }
  }
  const state = existsSync(statePath)
    ? readJson(statePath)
    : {
      package_id: PACKAGE_ID,
      policy_version: MEE_NIGHTLY_RUNTIME_POLICY_VERSION,
      run_key: args.requestedRunKey,
      created_at: new Date().toISOString(),
      phases: {},
      findings: [],
    };

  const strictFrozenDryRunPath = args.frozenDryRunPath
    ? resolveFrozenDryRunPathV2(args.frozenDryRunPath)
    : null;
  const conditionalFrozenDryRunInput = args.frozenDryRunIfIncompletePath;
  selectFrozenDryRunPathV2({
    strictPath: strictFrozenDryRunPath,
    conditionalPath: conditionalFrozenDryRunInput,
    previousCursor: null,
  });

  if (!args.run) {
    const report = {
      package_id: PACKAGE_ID,
      mode: "dry_run_plan_only",
      run_key: state.run_key,
      artifact_root: AUDIT_ROOT,
      call_ceiling: args.callCeiling,
      strict_frozen_dry_run_present: Boolean(strictFrozenDryRunPath),
      conditional_frozen_dry_run_present: Boolean(conditionalFrozenDryRunInput),
      provider_calls: false,
      db_writes: false,
      phases: [
        "dry_run_plan",
        "daily_batch_plan",
        "daily_batch_fetch",
        "daily_batch_backfill_plan",
        "daily_batch_backfill_apply",
        "card_candidate_rollup_plan",
        "card_candidate_rollup_apply",
        "strict_filtered_rollup_plan",
        "strict_filtered_rollup_apply",
        "run_scoped_readback",
      ],
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  if (process.env.MEE_NIGHTLY_ALLOW_RUN !== "1") throw new Error("MEE_NIGHTLY_ALLOW_RUN must equal 1");
  if (process.env.MEE_NIGHTLY_PROVIDER_CALLS_ENABLED !== "1") {
    throw new Error("MEE_NIGHTLY_PROVIDER_CALLS_ENABLED must equal 1");
  }

  const disk = statfsSync(AUDIT_ROOT);
  const diskDecision = evaluateDiskCapacityV1({
    freeBytes: Number(disk.bavail) * Number(disk.bsize),
    minimumFreeBytes: args.minimumFreeBytes,
  });
  state.disk_preflight = diskDecision;
  saveState(statePath, state);
  if (!diskDecision.provider_calls_allowed) throw new Error(diskDecision.finding);

  const existingProvider = await providerPhasePreviouslyAttempted(state.run_key);
  const savedProvider = state.phases?.daily_batch_fetch ?? null;
  if (state.provider_attempt_started && !savedProvider) {
    throw new Error("provider phase attempt was recorded without a final local result; refusing to refetch");
  }
  if (savedProvider?.status !== undefined && savedProvider.status !== 0) {
    throw new Error("provider phase previously failed for this run; refusing to refetch automatically");
  }
  if (existingProvider && !savedProvider) {
    throw new Error("provider phase was already attempted but its local resume result is missing; refusing to refetch");
  }

  let previousCursor = state.cursor ? null : await latestCursor();
  const selectedFrozenDryRunInput = selectFrozenDryRunPathV2({
    strictPath: strictFrozenDryRunPath,
    conditionalPath: conditionalFrozenDryRunInput,
    previousCursor,
  });
  const frozenDryRunPath = selectedFrozenDryRunInput
    ? resolveFrozenDryRunPathV2(selectedFrozenDryRunInput)
    : null;
  if (
    frozenDryRunPath
    && state.phases?.dry_run_plan?.report_path
    && path.resolve(state.phases.dry_run_plan.report_path) !== path.resolve(frozenDryRunPath)
  ) {
    throw new Error("frozen dry-run plan does not match the existing pipeline state");
  }
  let resumed = phaseSucceeded(state, "dry_run_plan");
  if (!resumed) {
    const phase = frozenDryRunPath
      ? (() => {
          const startedAt = new Date().toISOString();
          const validation = validateFrozenDryRunPlanV2({
            plan: readJson(frozenDryRunPath),
            previousCursor,
          });
          return {
            phase: "dry_run_plan",
            command: `frozen artifact ${frozenDryRunPath}`,
            status: 0,
            signal: null,
            started_at: startedAt,
            finished_at: new Date().toISOString(),
            stdout_tail: JSON.stringify(validation),
            stderr_tail: "",
            child_output: validation,
            report_path: frozenDryRunPath,
            frozen: true,
          };
        })()
      : executeChild("dry_run_plan", ["node", "scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs"]);
    state.phases.dry_run_plan = phase;
    if (phase.frozen) state.frozen_dry_run_plan = phase.report_path;
    saveState(statePath, state);
    await appendPhaseLedger(state.run_key, phase, statePath);
    if (phase.status !== 0) throw new Error("dry_run_plan failed");
  }

  if (!state.cursor) {
    const dryRun = readJson(artifactFrom(state, "dry_run_plan"));
    state.cursor = resolveAcquisitionCursorV1({
      previous: previousCursor ?? await latestCursor(),
      sourceManifestHash: dryRun.request_manifest_hash_sha256,
      sourceRequestCount: dryRun.acquisition_requests.length,
      acquisitionMode: args.acquisitionMode,
    });
    saveState(statePath, state);
  }

  let definitions = phaseDefinitionsV2({ callCeiling: args.callCeiling, state, cursor: state.cursor });
  for (const definition of definitions.slice(1)) {
    resumed = phaseSucceeded(state, definition.key);
    if (resumed) continue;

    if (definition.key === "card_candidate_rollup_plan" && !state.source_acquisition_run) {
      const backfillPlan = readJson(artifactFrom(state, "daily_batch_backfill_plan"));
      if (!backfillPlan.source_acquisition_run?.run_key) {
        throw new Error("backfill plan did not expose its exact acquisition run identity");
      }
      state.source_acquisition_run = backfillPlan.source_acquisition_run;
      saveState(statePath, state);
    }

    const phaseStartedAt = new Date().toISOString();
    if (definition.provider_calls) {
      state.provider_attempt_started = {
        phase: definition.key,
        started_at: phaseStartedAt,
      };
      saveState(statePath, state);
    }
    await appendPhaseLedger(state.run_key, {
      phase: definition.key,
      ledger_status: "started",
      command: definition.command().join(" "),
      started_at: phaseStartedAt,
      finished_at: null,
      stdout_tail: "",
      stderr_tail: "",
    }, statePath);

    const phase = executeChild(definition.key, definition.command());
    phase.provider_calls = definition.provider_calls === true;
    phase.db_writes = definition.db_writes === true;
    state.phases[definition.key] = phase;
    saveState(statePath, state);
    await appendPhaseLedger(state.run_key, phase, statePath);
    if (phase.status !== 0) break;

    if (definition.key === "daily_batch_backfill_plan" && !state.source_acquisition_run) {
      const backfillPlan = readJson(phase.report_path);
      state.source_acquisition_run = backfillPlan.source_acquisition_run;
      saveState(statePath, state);
    }

    if (definition.key === "daily_batch_backfill_apply" && !state.cursor_recorded) {
      const batchPlan = readJson(artifactFrom(state, "daily_batch_plan"));
      const event = buildCursorEventV1({
        runKey: state.run_key,
        cursor: state.cursor,
        nextStartIndex: batchPlan.summary.next_start_index,
        selectedRequestCount: batchPlan.summary.batch_request_count,
      });
      state.cursor_event = { ...event, ...(await recordCursorEvent(event)) };
      state.cursor_recorded = true;
      saveState(statePath, state);
    }
  }

  const phaseRows = Object.values(state.phases);
  state.outcome = classifyPipelineOutcomeV1(phaseRows);
  state.completed_at = new Date().toISOString();
  saveState(statePath, state);

  const summaryPhase = {
    phase: "pipeline_summary",
    status: state.outcome === "completed" || state.outcome === "completed_with_warnings" ? 0 : 1,
    started_at: state.created_at,
    finished_at: state.completed_at,
    report_path: statePath,
    stdout_tail: "",
    stderr_tail: state.outcome.startsWith("failed") ? state.outcome : "",
  };
  await appendPhaseLedger(state.run_key, summaryPhase, statePath);

  const report = {
    package_id: PACKAGE_ID,
    run_key: state.run_key,
    outcome: state.outcome,
    state_path: meeArtifactReferenceV1(REPO_ROOT, statePath),
    cursor: state.cursor,
    cursor_event: state.cursor_event ?? null,
    source_acquisition_run: state.source_acquisition_run ?? null,
    phase_count: phaseRows.length,
    provider_phase_count: phaseRows.filter((phase) => phase.provider_calls).length,
    database_write_phase_count: phaseRows.filter((phase) => phase.db_writes).length,
    findings: state.findings,
    boundary: {
      public_pricing_writes: false,
      app_visible_pricing_writes: false,
      canonical_identity_writes: false,
      vault_writes: false,
      deletes: false,
    },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (state.outcome.startsWith("failed")) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
