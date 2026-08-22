import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import {
  activeMtgCatalogRunnerRunsV1,
  buildMtgCatalogSupervisorPlanV1,
  MTG_CATALOG_SUPERVISOR_VERSION,
} from "../../backend/pricing/mtg_catalog_supervisor_v1.mjs";
import {
  buildMtgCatalogExecutionOrderV1,
  sha256MtgIngestionV1,
  validateMtgCatalogManifestForIngestionV1,
} from "./mtg_canonical_catalog_ingestion_envelope_v1.mjs";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_FILE), "..", "..");
const DEFAULT_MANIFEST = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "mtg_canonical_catalog_batch_manifest_v1",
  "2026-08-13T22-10-07Z",
  "manifest.json",
);
const EXPECTED_MANIFEST_SHA256 =
  "1240b4ab9aa71c118d022d23e393e8c06397346c61d778e223d0b3b549f8c3e1";
const DEFAULT_RUNNER_WORKFLOW_ID = "335602786";
const DEFAULT_RUNNER_REF = "agent/mtg-pointer-release-v1";
const DEFAULT_RUNNER_COMMIT = "7e9f2bb92f56335a6a352f655e12000b344a63a4";
const MTG_GAME_ID = "4d544700-0000-4000-8000-000000000001";

function parseArgs(argv) {
  const args = {
    asOf: "2026-08-16",
    dispatch: false,
    manifest: DEFAULT_MANIFEST,
    maxConsecutiveFailures: 3,
    maxSets: 35,
    outDir: path.join(ROOT, ".tmp", "mtg_catalog_supervisor_v1"),
    repository: process.env.GITHUB_REPOSITORY ?? "",
    runnerCommit: DEFAULT_RUNNER_COMMIT,
    runnerRef: DEFAULT_RUNNER_REF,
    workflowId: DEFAULT_RUNNER_WORKFLOW_ID,
  };
  for (const arg of argv) {
    if (arg === "--dispatch") args.dispatch = true;
    else if (arg.startsWith("--as-of=")) args.asOf = arg.slice(8);
    else if (arg.startsWith("--manifest=")) args.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith("--max-consecutive-failures=")) {
      args.maxConsecutiveFailures = Number(arg.slice(27));
    } else if (arg.startsWith("--max-sets=")) args.maxSets = Number(arg.slice(11));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--repository=")) args.repository = arg.slice(13);
    else if (arg.startsWith("--runner-commit=")) args.runnerCommit = arg.slice(16);
    else if (arg.startsWith("--runner-ref=")) args.runnerRef = arg.slice(13);
    else if (arg.startsWith("--workflow-id=")) args.workflowId = arg.slice(14);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!/^[^/]+\/[^/]+$/.test(args.repository)) {
    throw new Error("GitHub repository must be owner/name");
  }
  if (!/^\d+$/.test(args.workflowId)) throw new Error("workflow-id must be numeric");
  if (args.workflowId !== DEFAULT_RUNNER_WORKFLOW_ID) {
    throw new Error("workflow-id is outside the frozen supervisor authority");
  }
  if (args.runnerRef !== DEFAULT_RUNNER_REF) {
    throw new Error("runner-ref is outside the frozen supervisor authority");
  }
  if (args.runnerCommit !== DEFAULT_RUNNER_COMMIT) {
    throw new Error("runner-commit is outside the frozen supervisor authority");
  }
  if (args.asOf !== "2026-08-16") {
    throw new Error("as-of is outside the frozen supervisor authority");
  }
  if (!Number.isInteger(args.maxSets) || args.maxSets < 1 || args.maxSets > 35) {
    throw new Error("max-sets must be between 1 and the frozen ceiling of 35");
  }
  if (
    !Number.isInteger(args.maxConsecutiveFailures) ||
    args.maxConsecutiveFailures < 1 ||
    args.maxConsecutiveFailures > 3
  ) {
    throw new Error(
      "max-consecutive-failures must be between 1 and the frozen ceiling of 3",
    );
  }
  return args;
}

async function atomicWriteJson(file, value) {
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

async function writeArtifactHashes(outDir) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const hashes = {};
  for (const entry of entries) {
    if (!entry.isFile() || entry.name === "artifact_hashes.json") continue;
    const body = await fs.readFile(path.join(outDir, entry.name));
    hashes[entry.name] = sha256MtgIngestionV1(body);
  }
  await atomicWriteJson(path.join(outDir, "artifact_hashes.json"), {
    version: MTG_CATALOG_SUPERVISOR_VERSION,
    recorded_at: new Date().toISOString(),
    sha256: hashes,
  });
}

function sanitizedRun(run) {
  return {
    id: run.id,
    status: run.status,
    conclusion: run.conclusion ?? null,
    event: run.event,
    head_branch: run.head_branch,
    head_sha: run.head_sha,
    created_at: run.created_at,
    updated_at: run.updated_at,
    run_started_at: run.run_started_at,
    html_url: run.html_url,
  };
}

async function githubRequest(args, endpoint, options = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN is required");
  const method = options.method ?? "GET";
  const apiEndpoint = `repos/${args.repository}${endpoint}`;
  const commandArgs = [
    "api",
    apiEndpoint,
    "--method",
    method,
    "--header",
    "X-GitHub-Api-Version: 2022-11-28",
  ];
  if (options.body !== undefined) commandArgs.push("--input", "-");
  let output;
  try {
    output = execFileSync("gh", commandArgs, {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: token },
      input: options.body,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const stderr = String(error?.stderr ?? error?.message ?? error).slice(0, 500);
    throw new Error(`GitHub API failed for ${endpoint}: ${stderr}`);
  }
  return output.trim() ? JSON.parse(output) : null;
}

async function captureRunnerState(args) {
  const [commit, runs] = await Promise.all([
    githubRequest(args, `/commits/${encodeURIComponent(args.runnerRef)}`),
    githubRequest(
      args,
      `/actions/workflows/${args.workflowId}/runs?event=workflow_dispatch&per_page=50`,
    ),
  ]);
  return {
    target_commit_sha: commit.sha,
    runs: (runs.workflow_runs ?? []).map(sanitizedRun),
  };
}

function createReadOnlyClient() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: MTG_CATALOG_SUPERVISOR_VERSION,
  });
}

async function groupedCounts(client, sql, valueField) {
  const result = await client.query(sql, [MTG_GAME_ID]);
  return new Map(
    result.rows.map((row) => [String(row.code).toLowerCase(), Number(row[valueField])]),
  );
}

async function captureCatalogReadback() {
  const client = createReadOnlyClient();
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const release = await client.query(`
      select release_status
      from public.catalog_game_release_controls
      where game_code = 'mtg'
    `);
    const sets = await client.query(`
      select lower(code) as code, count(*)::integer as sets
      from public.sets
      where game = 'mtg'
      group by lower(code)
    `);
    const cardPrints = await groupedCounts(
      client,
      `select lower(set_code) as code, count(*)::integer as card_prints
       from public.card_prints
       where game_id = $1::uuid
       group by lower(set_code)`,
      "card_prints",
    );
    const identities = await groupedCounts(
      client,
      `select lower(card.set_code) as code, count(*)::integer as card_print_identity
       from public.card_print_identity identity_row
       join public.card_prints card on card.id = identity_row.card_print_id
       where card.game_id = $1::uuid
       group by lower(card.set_code)`,
      "card_print_identity",
    );
    const printings = await groupedCounts(
      client,
      `select lower(card.set_code) as code, count(*)::integer as card_printings
       from public.card_printings printing
       join public.card_prints card on card.id = printing.card_print_id
       where card.game_id = $1::uuid
       group by lower(card.set_code)`,
      "card_printings",
    );
    const mappings = await groupedCounts(
      client,
      `select lower(card.set_code) as code, count(*)::integer as external_mappings
       from public.external_mappings mapping
       join public.card_prints card on card.id = mapping.card_print_id
       where card.game_id = $1::uuid and mapping.source = 'scryfall'
       group by lower(card.set_code)`,
      "external_mappings",
    );
    const printingMappings = await groupedCounts(
      client,
      `select lower(card.set_code) as code,
              count(*)::integer as external_printing_mappings
       from public.external_printing_mappings mapping
       join public.card_printings printing on printing.id = mapping.card_printing_id
       join public.card_prints card on card.id = printing.card_print_id
       where card.game_id = $1::uuid and mapping.source = 'tcgplayer_market'
       group by lower(card.set_code)`,
      "external_printing_mappings",
    );
    await client.query("rollback");

    const byCode = {};
    const setCounts = new Map(
      sets.rows.map((row) => [String(row.code).toLowerCase(), Number(row.sets)]),
    );
    const codes = new Set([
      ...setCounts.keys(),
      ...cardPrints.keys(),
      ...identities.keys(),
      ...printings.keys(),
      ...mappings.keys(),
      ...printingMappings.keys(),
    ]);
    for (const code of [...codes].sort()) {
      byCode[code] = {
        sets: setCounts.get(code) ?? 0,
        card_prints: cardPrints.get(code) ?? 0,
        card_print_identity: identities.get(code) ?? 0,
        card_printings: printings.get(code) ?? 0,
        external_mappings: mappings.get(code) ?? 0,
        external_printing_mappings: printingMappings.get(code) ?? 0,
      };
    }
    return {
      recorded_at: new Date().toISOString(),
      transaction_read_only: true,
      release_status: release.rows.length === 1 ? release.rows[0].release_status : null,
      release_control_row_count: release.rows.length,
      by_code: byCode,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function dispatchRunner(args, dispatch) {
  await githubRequest(args, `/actions/workflows/${args.workflowId}/dispatches`, {
    method: "POST",
    body: JSON.stringify({
      ref: args.runnerRef,
      inputs: {
        operation: dispatch.operation,
        start_index: String(dispatch.start_index),
        max_sets: String(dispatch.max_sets),
        as_of: dispatch.as_of,
      },
    }),
  });
}

async function verifyDispatchedRunnerAppears(args, priorRunIds) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const state = await captureRunnerState(args);
    const newlyActive = activeMtgCatalogRunnerRunsV1(state.runs).filter(
      (run) => !priorRunIds.has(run.id),
    );
    if (newlyActive.length > 0) {
      return newlyActive.map((run) => ({
        id: run.id,
        status: run.status,
        html_url: run.html_url,
      }));
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error("GitHub accepted the dispatch but no new active runner appeared");
}

async function appendGithubMetadata(summary) {
  if (process.env.GITHUB_OUTPUT) {
    const outputs = [
      `status=${summary.status}`,
      `dispatched=${summary.dispatched === true}`,
      `start_index=${summary.dispatch?.start_index ?? ""}`,
      `max_sets=${summary.dispatch?.max_sets ?? ""}`,
    ];
    await fs.appendFile(process.env.GITHUB_OUTPUT, `${outputs.join("\n")}\n`, "utf8");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      "## MTG catalog supervisor",
      "",
      `- Status: \`${summary.status}\``,
      `- Frozen runner commit: \`${summary.target_commit_sha ?? "unavailable"}\``,
      `- Dispatch created: \`${summary.dispatched === true}\``,
      `- Next range: \`${summary.dispatch ? `${summary.dispatch.start_index} + ${summary.dispatch.max_sets}` : "none"}\``,
      `- Complete eligible sets: \`${summary.catalog?.complete_exact_count ?? "not read while writer active"}\``,
      `- Remaining eligible sets: \`${summary.catalog?.absent_count ?? "not read while writer active"}\``,
    ];
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`, "utf8");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(args.outDir, { recursive: true });
  const startedAt = new Date().toISOString();
  let targetCommitSha = null;
  let runnerState = null;
  let readback = null;
  let runPlan = null;
  let dispatchAccepted = false;
  try {
    const manifestBody = await fs.readFile(args.manifest, "utf8");
    const manifestSha256 = sha256MtgIngestionV1(manifestBody);
    if (manifestSha256 !== EXPECTED_MANIFEST_SHA256) {
      throw new Error(`Frozen manifest changed: ${manifestSha256}`);
    }
    const manifest = JSON.parse(manifestBody);
    const manifestFindings = validateMtgCatalogManifestForIngestionV1(manifest);
    if (manifestFindings.length > 0) {
      throw new Error(`Frozen manifest failed validation: ${manifestFindings.join(", ")}`);
    }
    const executionOrder = buildMtgCatalogExecutionOrderV1(manifest);
    runnerState = await captureRunnerState(args);
    targetCommitSha = runnerState.target_commit_sha;

    if (activeMtgCatalogRunnerRunsV1(runnerState.runs).length === 0) {
      readback = await captureCatalogReadback();
      await atomicWriteJson(path.join(args.outDir, "catalog_readback.json"), readback);
    }
    runPlan = buildMtgCatalogSupervisorPlanV1({
      executionOrder,
      readbackByCode: readback?.by_code ?? null,
      releaseStatus: readback?.release_status ?? null,
      runnerRuns: runnerState.runs,
      targetCommitSha,
      expectedTargetCommitSha: args.runnerCommit,
      asOf: args.asOf,
      maxSets: args.maxSets,
      maxConsecutiveFailures: args.maxConsecutiveFailures,
    });
    runPlan = {
      ...runPlan,
      recorded_at: new Date().toISOString(),
      repository: args.repository,
      manifest_sha256: manifestSha256,
      runner_workflow_id: args.workflowId,
      runner_ref: args.runnerRef,
      dispatch_requested: args.dispatch,
      boundaries: {
        database_access: readback ? "read_only" : "skipped_while_writer_active",
        database_writes: false,
        release_control_writes: false,
        image_or_storage_writes: false,
        pricing_or_publication_writes: false,
        app_visibility_activation: false,
      },
    };
    await atomicWriteJson(path.join(args.outDir, "run_plan.json"), runPlan);
    await atomicWriteJson(path.join(args.outDir, "runner_runs.json"), {
      recorded_at: new Date().toISOString(),
      runs: runnerState.runs,
    });

    let dispatched = false;
    let dispatchedRuns = [];
    let finalStatus = runPlan.status;
    if (runPlan.status === "dispatch_ready" && args.dispatch) {
      const finalRunnerState = await captureRunnerState(args);
      if (finalRunnerState.target_commit_sha !== args.runnerCommit) {
        throw new Error("Frozen runner ref moved after planning");
      }
      if (activeMtgCatalogRunnerRunsV1(finalRunnerState.runs).length > 0) {
        finalStatus = "dispatch_race_avoided_writer_became_active";
      } else {
        const priorRunIds = new Set(finalRunnerState.runs.map((run) => run.id));
        await dispatchRunner(args, runPlan.dispatch);
        dispatchAccepted = true;
        dispatchedRuns = await verifyDispatchedRunnerAppears(args, priorRunIds);
        dispatched = true;
        finalStatus = "dispatch_created_and_observed";
      }
    } else if (runPlan.status === "dispatch_ready") {
      finalStatus = "plan_only_dispatch_ready";
    }

    const summary = {
      version: MTG_CATALOG_SUPERVISOR_VERSION,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: finalStatus,
      dispatched,
      repository: args.repository,
      target_commit_sha: targetCommitSha,
      catalog: runPlan.catalog,
      dispatch: runPlan.dispatch,
      dispatched_runs: dispatchedRuns,
      active_run_count: runPlan.active_run_count,
      consecutive_runner_failures: runPlan.consecutive_runner_failures,
      findings: [],
      boundaries: runPlan.boundaries,
    };
    await atomicWriteJson(path.join(args.outDir, "summary.json"), summary);
    await writeArtifactHashes(args.outDir);
    await appendGithubMetadata(summary);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    const failure = {
      version: MTG_CATALOG_SUPERVISOR_VERSION,
      started_at: startedAt,
      failed_at: new Date().toISOString(),
      status: "stopped_fail_closed",
      dispatched: dispatchAccepted,
      repository: args.repository,
      target_commit_sha: targetCommitSha,
      error: String(error?.message ?? error),
      active_run_count: runnerState
        ? activeMtgCatalogRunnerRunsV1(runnerState.runs).length
        : null,
      boundaries: {
        database_writes: false,
        release_control_writes: false,
        image_or_storage_writes: false,
        pricing_or_publication_writes: false,
        app_visibility_activation: false,
      },
    };
    await atomicWriteJson(path.join(args.outDir, "failure.json"), failure);
    await atomicWriteJson(path.join(args.outDir, "summary.json"), failure);
    await writeArtifactHashes(args.outDir);
    await appendGithubMetadata(failure);
    throw error;
  }
}

if (path.resolve(process.argv[1]) === SCRIPT_FILE) {
  main().catch((error) => {
    process.stderr.write(`[mtg-catalog-supervisor-v1] ${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
