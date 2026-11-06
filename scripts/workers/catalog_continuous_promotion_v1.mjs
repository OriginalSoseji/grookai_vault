import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildCatalogContinuousPromotionAgentV1,
  buildCatalogContinuousPromotionRunKeyV1,
  CATALOG_CONTINUOUS_PROMOTION_MODE,
  CATALOG_CONTINUOUS_PROMOTION_VERSION,
  validateCatalogContinuousPromotionBatchV1,
} from "../../backend/operations/catalog_continuous_promotion_v1.mjs";
import {
  buildCatalogWriterInvocationV1,
  validateCatalogWriterResultV1,
  validateCatalogWriterRollbackProofV1,
} from "../../backend/operations/catalog_founder_outcome_v1.mjs";
import { callOperationsRpcV1, operationsSha256V1 } from
  "../../backend/operations/operations_control_plane_v1.mjs";

function parseArgs(argv) {
  const options = {
    run: false,
    packagesFile: null,
    outDir: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    sourceRunId: null,
    maxTargets: 5,
  };
  for (const token of argv) {
    if (token === "--run") options.run = true;
    else if (token.startsWith("--packages-file=")) {
      options.packagesFile = path.resolve(token.slice(16));
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token.startsWith("--source-run-id=")) {
      options.sourceRunId = token.slice(16);
    } else if (token.startsWith("--max-targets=")) {
      options.maxTargets = Number(token.slice(14));
    } else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.run) throw new Error("Refusing continuous catalog promotion without --run");
  if (!options.packagesFile || !options.outDir) {
    throw new Error("--packages-file and --out-dir are required");
  }
  return options;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function credentials() {
  const supabaseUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  if (!String(supabaseUrl ?? "").trim() || !String(serviceRoleKey ?? "").trim()) {
    throw new Error("Continuous catalog promotion requires production service credentials");
  }
  return { supabaseUrl, serviceRoleKey };
}

async function heartbeat({ auth, agent, runKey, status, sourceRunId, headSha, summary }) {
  const githubServerUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const githubRepository = process.env.GITHUB_REPOSITORY ??
    "OriginalSoseji/grookai_vault";
  return callOperationsRpcV1({
    ...auth,
    functionName: "operations_agent_heartbeat_v1",
    body: {
      p_heartbeat: {
        agent_key: agent.agent_key,
        run_key: runKey,
        status,
        source_commit_sha: headSha,
        source_run_uri:
          `${githubServerUrl}/${githubRepository}/actions/runs/${sourceRunId}`,
        progress: {
          selected_target_count: summary.selected_target_count,
          completed_target_count: summary.completed_target_count,
          failed_target_count: summary.failed_target_count,
        },
        summary,
      },
    },
  });
}

async function executeWriter(outcomePackage, { headSha, outDir, mode }) {
  const invocation = buildCatalogWriterInvocationV1(outcomePackage, {
    headSha,
    outDir,
    mode,
  });
  await fs.mkdir(outDir, { recursive: true });
  await writeJson(path.join(outDir, "invocation.json"), {
    writer_key: outcomePackage.writer_key,
    target_key: outcomePackage.target_key,
    mode,
    source_commit_sha: headSha,
    package_fingerprint_sha256: outcomePackage.package_fingerprint_sha256,
    payload_fingerprint_sha256: outcomePackage.payload_fingerprint_sha256,
    arguments: invocation.args.slice(1),
    environment_keys: Object.keys(invocation.env).sort(),
    secrets_excluded: true,
  });
  const execution = spawnSync(process.execPath, invocation.args, {
    cwd: process.cwd(),
    env: { ...process.env, ...invocation.env },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  await writeJson(path.join(outDir, "executor_process.json"), {
    exit_code: execution.status,
    signal: execution.signal,
    stdout: execution.stdout,
    stderr: execution.stderr,
  });
  if (execution.status !== 0) {
    throw new Error(
      `${mode} catalog writer failed (${execution.status}): ` +
      String(execution.stderr ?? "").slice(-2000),
    );
  }
  const summary = JSON.parse(await fs.readFile(
    path.join(outDir, invocation.writer.summary_file),
    "utf8",
  ));
  return mode === "dry-run"
    ? validateCatalogWriterRollbackProofV1(outcomePackage, summary)
    : validateCatalogWriterResultV1(outcomePackage, summary);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (process.env.CATALOG_AUTOMATION_MODE !== CATALOG_CONTINUOUS_PROMOTION_MODE) {
    throw new Error(
      `CATALOG_AUTOMATION_MODE must equal ${CATALOG_CONTINUOUS_PROMOTION_MODE}`,
    );
  }
  if (process.env.CATALOG_CONTINUOUS_PROMOTION_ACTIVE !== "true") {
    throw new Error("CATALOG_CONTINUOUS_PROMOTION_ACTIVE=true is required");
  }
  const headSha = git("rev-parse", "HEAD");
  if (headSha !== options.expectedHeadSha ||
      git("status", "--short", "--untracked-files=no")) {
    throw new Error("Continuous catalog promotion requires the exact clean source commit");
  }
  const packageBytes = await fs.readFile(options.packagesFile);
  const artifactHashes = JSON.parse(await fs.readFile(
    path.join(path.dirname(options.packagesFile), "artifact_hashes.json"),
    "utf8",
  ));
  if (artifactHashes["founder_outcome_packages.json"] !==
      operationsSha256V1(packageBytes)) {
    throw new Error("Continuous catalog promotion package artifact hash mismatch");
  }
  const packages = validateCatalogContinuousPromotionBatchV1(
    JSON.parse(packageBytes.toString("utf8")),
    {
      headSha,
      sourceRunId: options.sourceRunId,
      maxTargets: options.maxTargets,
    },
  );
  const auth = credentials();
  const agent = buildCatalogContinuousPromotionAgentV1();
  await callOperationsRpcV1({
    ...auth,
    functionName: "operations_register_agent_v1",
    body: { p_agent: agent },
  });
  const runKey = buildCatalogContinuousPromotionRunKeyV1({
    sourceRunId: options.sourceRunId,
    headSha,
    packages,
  });
  const receipts = [];
  const state = {
    version: CATALOG_CONTINUOUS_PROMOTION_VERSION,
    run_key: runKey,
    source_run_id: String(options.sourceRunId),
    source_commit_sha: headSha,
    selected_target_count: packages.length,
    completed_target_count: 0,
    failed_target_count: 0,
    canonical_writes: false,
  };
  await heartbeat({
    auth, agent, runKey, status: "running", sourceRunId: options.sourceRunId,
    headSha, summary: state,
  });
  try {
    for (const [index, outcomePackage] of packages.entries()) {
      const targetDir = path.join(
        options.outDir,
        "targets",
        `${String(index + 1).padStart(2, "0")}_${outcomePackage.target_key.replace(/[^a-z0-9_-]+/gi, "_")}`,
      );
      const rollbackProof = await executeWriter(outcomePackage, {
        headSha,
        outDir: path.join(targetDir, "dry_run"),
        mode: "dry-run",
      });
      const durableResult = await executeWriter(outcomePackage, {
        headSha,
        outDir: path.join(targetDir, "apply"),
        mode: "apply",
      });
      receipts.push({
        target_key: outcomePackage.target_key,
        writer_key: outcomePackage.writer_key,
        package_fingerprint_sha256: outcomePackage.package_fingerprint_sha256,
        rollback_proof: rollbackProof,
        durable_result: durableResult,
      });
      state.completed_target_count = receipts.length;
      state.canonical_writes = true;
      await heartbeat({
        auth, agent, runKey, status: "running", sourceRunId: options.sourceRunId,
        headSha, summary: state,
      });
    }
    const summary = {
      ...state,
      status: "succeeded",
      completed_at: new Date().toISOString(),
      receipts,
    };
    await writeJson(path.join(options.outDir, "summary.json"), summary);
    await heartbeat({
      auth, agent, runKey, status: "succeeded", sourceRunId: options.sourceRunId,
      headSha, summary,
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    state.failed_target_count = 1;
    const failure = {
      ...state,
      status: "failed",
      failed_at: new Date().toISOString(),
      receipts,
      error_class: error instanceof Error ? error.name : "UnknownError",
      error_message: error instanceof Error ? error.message : String(error),
    };
    await writeJson(path.join(options.outDir, "failure.json"), failure);
    await heartbeat({
      auth, agent, runKey, status: "failed", sourceRunId: options.sourceRunId,
      headSha, summary: failure,
    }).catch(() => {});
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
