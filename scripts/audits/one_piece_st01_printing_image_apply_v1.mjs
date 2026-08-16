import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceSt01PrintingImageDurableReadbackV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION,
  ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPROVAL_ENV,
  requiredOnePieceSt01PrintingImageDurableApprovalV1,
  validateOnePieceSt01PrintingImageDurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_apply_v1.mjs";
import {
  evaluateOnePieceSt01PrintingImageAttributionV1,
  evaluateOnePieceSt01PrintingImageTransactionReadbackV1,
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_mutation_plan_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  attributableWrites,
  captureOnePieceSt01PrintingImageStateV1,
  clientOptions,
  evaluateOnePieceSt01PrintingImageFreshPreflightV1,
  insertNormalChildren,
  insertPrintingMappings,
  PLAN_PATH,
  transactionReadback,
  updateParentPointers,
} from "./one_piece_st01_printing_image_rollback_canary_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
export const APPLY_PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_durable_apply_v1", "frozen_apply_plan_v1",
  "apply_plan.json");
export const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_durable_apply_v1",
  "durable_apply_execution_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    expectedApplyPlanFingerprint: "",
    expectedPayloadFingerprint: "",
    mode: "plan",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-apply-plan-fingerprint=")) {
      args.expectedApplyPlanFingerprint = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = argument.slice(31).trim().toLowerCase();
    } else if (argument.startsWith("--mode=")) {
      args.mode = argument.slice(7).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!/^[0-9a-f]{64}$/.test(args.expectedApplyPlanFingerprint)) {
    throw new Error("--expected-apply-plan-fingerprint=<SHA-256> is required");
  }
  if (!/^[0-9a-f]{64}$/.test(args.expectedPayloadFingerprint)) {
    throw new Error("--expected-payload-fingerprint=<SHA-256> is required");
  }
  if (!["plan", "apply"].includes(args.mode)) {
    throw new Error("--mode must be plan or apply");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

export async function executeOnePieceSt01PrintingImageDurableApplyV1({
  connectionString,
  mutationPlan,
  applyPlan,
}) {
  const freshPreflight = await captureOnePieceSt01PrintingImageStateV1(
    connectionString,
    mutationPlan,
    "one-piece-st01-printing-image-apply-preflight-v1",
  );
  const preflightFindings =
    evaluateOnePieceSt01PrintingImageFreshPreflightV1({
      plan: mutationPlan,
      readback: freshPreflight,
    });
  if (preflightFindings.length) {
    throw new Error(`Fresh apply preflight failed: ${preflightFindings.join(",")}`);
  }

  const client = new Client(clientOptions(
    connectionString,
    "one-piece-st01-printing-image-durable-apply-v1",
  ));
  await client.connect();
  let open = false;
  let committed = false;
  let transactionReadbackValue = null;
  let writes = [];
  let mutationCounts = {
    parent_pointer_updates: 0,
    normal_child_inserts: 0,
    external_printing_mapping_inserts: 0,
  };
  try {
    await client.query("begin");
    open = true;
    await client.query(`set local lock_timeout='${applyPlan.timeouts.lock_timeout}'`);
    await client.query(
      `set local statement_timeout='${applyPlan.timeouts.statement_timeout}'`,
    );
    await client.query("set local idle_in_transaction_session_timeout=" +
      `'${applyPlan.timeouts.idle_in_transaction_session_timeout}'`);
    const parentUpdates = await updateParentPointers(client, mutationPlan);
    const childInserts = await insertNormalChildren(client, mutationPlan);
    const mappingInserts = await insertPrintingMappings(client, mutationPlan);
    mutationCounts = {
      parent_pointer_updates: parentUpdates.length,
      normal_child_inserts: childInserts.length,
      external_printing_mapping_inserts: mappingInserts.length,
    };
    transactionReadbackValue = await transactionReadback(client, mutationPlan);
    writes = await attributableWrites(client);
    const findings = [
      ...(parentUpdates.length === 17 ? [] : ["parent_update_count_mismatch"]),
      ...(childInserts.length === 14 ? [] : ["child_insert_count_mismatch"]),
      ...(mappingInserts.length === 14 ? [] : ["mapping_insert_count_mismatch"]),
      ...evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
        plan: mutationPlan,
        readback: transactionReadbackValue,
      }),
      ...evaluateOnePieceSt01PrintingImageAttributionV1(writes),
    ];
    if (findings.length) throw new Error(findings.join(","));
    await client.query("commit");
    open = false;
    committed = true;
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    error.executionProof = {
      committed,
      fresh_preflight: freshPreflight,
      mutation_counts: mutationCounts,
      transaction_readback: transactionReadbackValue,
      attributable_writes: writes,
    };
    throw error;
  } finally {
    await client.end();
  }

  const durableReadback = await captureOnePieceSt01PrintingImageStateV1(
    connectionString,
    mutationPlan,
    "one-piece-st01-printing-image-writer-post-apply-v1",
  );
  const durableFindings = evaluateOnePieceSt01PrintingImageDurableReadbackV1({
    mutationPlan,
    readback: durableReadback,
  });
  if (durableFindings.length) {
    const error = new Error(
      `Fresh durable readback failed: ${durableFindings.join(",")}`,
    );
    error.executionProof = {
      committed,
      fresh_preflight: freshPreflight,
      mutation_counts: mutationCounts,
      transaction_readback: transactionReadbackValue,
      attributable_writes: writes,
      durable_readback: durableReadback,
    };
    throw error;
  }
  return {
    committed,
    fresh_preflight: freshPreflight,
    mutation_counts: mutationCounts,
    transaction_readback: transactionReadbackValue,
    attributable_writes: writes,
    durable_readback: durableReadback,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== BRANCH || !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean durable-apply producer");
  }
  const [mutationPlanBody, applyPlanBody] = await Promise.all([
    fs.readFile(PLAN_PATH, "utf8"),
    fs.readFile(APPLY_PLAN_PATH, "utf8"),
  ]);
  const mutationPlan = JSON.parse(mutationPlanBody);
  const applyPlan = JSON.parse(applyPlanBody);
  const findings = [
    ...validateOnePieceSt01PrintingImageMutationPlanV1(mutationPlan).findings,
    ...validateOnePieceSt01PrintingImageDurableApplyPlanV1(
      applyPlan,
      mutationPlan,
    ).findings,
  ];
  if (applyPlan.apply_plan_fingerprint_sha256 !==
      args.expectedApplyPlanFingerprint) {
    findings.push("expected_apply_plan_fingerprint_mismatch");
  }
  if (applyPlan.mutation_payload_fingerprint_sha256 !==
      args.expectedPayloadFingerprint) {
    findings.push("expected_payload_fingerprint_mismatch");
  }
  if (findings.length) throw new Error([...new Set(findings)].join(","));

  const requiredApproval =
    requiredOnePieceSt01PrintingImageDurableApprovalV1({ applyPlan });
  if (args.mode === "apply" &&
      process.env[ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPROVAL_ENV] !==
        requiredApproval) {
    throw new Error("Exact approval missing from " +
      ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPROVAL_ENV);
  }
  const runPlan = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    repository,
    mutation_plan_sha256: sha256(mutationPlanBody),
    apply_plan_sha256: sha256(applyPlanBody),
    mutation_plan_fingerprint_sha256:
      mutationPlan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      mutationPlan.mutation_payload_fingerprint_sha256,
    apply_plan_fingerprint_sha256:
      applyPlan.apply_plan_fingerprint_sha256,
    required_approval_message: requiredApproval,
    boundaries: applyPlan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(
    path.join(args.outDir, "run_plan.json"),
    runPlan,
  );

  let proof = null;
  if (args.mode === "apply") {
    dotenv.config({ path: args.envFile, quiet: true });
    const connectionString = marketEvidenceDbUrl();
    if (!connectionString) throw new Error("Production database URL is unavailable");
    try {
      proof = await executeOnePieceSt01PrintingImageDurableApplyV1({
        connectionString,
        mutationPlan,
        applyPlan,
      });
    } catch (error) {
      await writeJson(path.join(args.outDir, "failure.json"), {
        recorded_at: new Date().toISOString(),
        error: error.message,
        execution_proof: error.executionProof ?? null,
      });
      throw error;
    }
  }

  const summary = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    status: args.mode === "plan"
      ? "durable_apply_ready_exact_approval_required"
      : "durable_apply_committed_and_readback_passed",
    repository,
    mutation_plan_fingerprint_sha256:
      mutationPlan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      mutationPlan.mutation_payload_fingerprint_sha256,
    apply_plan_fingerprint_sha256:
      applyPlan.apply_plan_fingerprint_sha256,
    required_approval_message: requiredApproval,
    committed: proof?.committed ?? false,
    fresh_preflight: proof?.fresh_preflight ?? null,
    mutation_counts: proof?.mutation_counts ?? null,
    transaction_readback: proof?.transaction_readback ?? null,
    attributable_writes: proof?.attributable_writes ?? [],
    durable_readback: proof?.durable_readback ?? null,
    findings: [],
    boundaries: applyPlan.boundaries,
  };
  const summaryBody = await writeJson(
    path.join(args.outDir, "summary.json"),
    summary,
  );
  const reportBody =
    "# One Piece ST-01 Printing And Image Durable Apply V1\n\n" +
    `- Status: \`${summary.status}\`\n` +
    `- Producer SHA: \`${repository.commit_sha}\`\n` +
    `- Apply-plan fingerprint: \`${summary.apply_plan_fingerprint_sha256}\`\n` +
    `- Mutation payload fingerprint: \`${summary.mutation_payload_fingerprint_sha256}\`\n` +
    `- Committed: \`${summary.committed}\`\n` +
    "- Exact scope: `17 parent updates / 14 child inserts / 14 mapping inserts`\n" +
    "- One Piece visibility: `hidden`\n";
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      ["run_plan.json", runPlanBody],
      ["summary.json", summaryBody],
      ["REPORT.md", reportBody],
    ].map(([artifactPath, body]) => ({
      path: artifactPath,
      sha256: sha256(body),
    })),
    bound_inputs: [
      { path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"),
        sha256: sha256(mutationPlanBody) },
      { path: path.relative(ROOT, APPLY_PLAN_PATH).replaceAll("\\", "/"),
        sha256: sha256(applyPlanBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    producer_commit_sha: repository.commit_sha,
    apply_plan_fingerprint_sha256: summary.apply_plan_fingerprint_sha256,
    committed: summary.committed,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
