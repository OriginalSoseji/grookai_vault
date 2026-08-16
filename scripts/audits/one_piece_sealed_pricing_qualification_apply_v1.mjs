import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_VERSION,
  buildOnePieceSealedPricingQualificationExecutionFingerprintV1,
  evaluateOnePieceSealedPricingQualificationPostApplyV1,
  evaluateOnePieceSealedPricingQualificationPrecommitV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_apply_v1.mjs";
import {
  validateOnePieceSealedPricingQualificationApplyPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_apply_plan_v1.mjs";
import {
  hashOnePieceSealedPricingQualificationPlanV1,
  stableJsonOnePieceSealedPricingQualificationPlanV1,
  validateOnePieceSealedPricingQualificationPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_plan_v1.mjs";
import {
  normalizeOnePieceSealedPricingQualificationRowsV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_canary_v1.mjs";
import {
  baseline,
  collisionProof,
  lineageProof,
  readOnlyPreflight,
} from "./one_piece_sealed_pricing_qualification_rollback_canary_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing");
const SOURCE_PLAN_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_plan_v1", "frozen_plan_v1",
  "qualification_plan.json.gz");
const APPLY_PLAN_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_apply_plan_v1",
  "frozen_apply_plan_v1", "plan.json");
const DEFAULT_DRY_RUN_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_apply_v1", "dry_run_v1");
const DEFAULT_PREFLIGHT_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_apply_v1",
  "production_read_only_preflight_v1");
const DEFAULT_APPLY_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_apply_v1", "durable_apply_v1");
const DEFAULT_VERIFY_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_pricing_qualification_apply_v1",
  "independent_post_apply_v1");

export function parseArgs(argv) {
  const args = { mode: "", execute: false, expectedHeadSha: "",
    expectedApplyPlanFingerprint: "", expectedPayloadFingerprint: "",
    expectedMutationContractHash: "", expectedFreshPreflightFingerprint: "",
    expectedApplyExecutionFingerprint: "", freshPreflightSummary: "",
    applySummary: path.join(DEFAULT_APPLY_OUT, "summary.json"),
    envFile: "C:\\grookai_vault\\.env.local", outDir: "" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) args.mode = argument.slice(7);
    else if (argument === "--execute-durable-apply") args.execute = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-apply-plan-fingerprint=")) {
      args.expectedApplyPlanFingerprint = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = argument.slice(31).trim().toLowerCase();
    } else if (argument.startsWith("--expected-mutation-contract-hash=")) {
      args.expectedMutationContractHash = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-fresh-preflight-fingerprint=")) {
      args.expectedFreshPreflightFingerprint = argument.slice(39)
        .trim().toLowerCase();
    } else if (argument.startsWith("--expected-apply-execution-fingerprint=")) {
      args.expectedApplyExecutionFingerprint = argument.slice(39)
        .trim().toLowerCase();
    } else if (argument.startsWith("--fresh-preflight-summary=")) {
      args.freshPreflightSummary = path.resolve(argument.slice(26));
    } else if (argument.startsWith("--apply-summary=")) {
      args.applySummary = path.resolve(argument.slice(16));
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!["dry-run", "preflight", "apply", "verify"].includes(args.mode)) {
    throw new Error("--mode=dry-run|preflight|apply|verify is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("Exact --expected-head-sha is required");
  }
  for (const [label, value] of [["apply plan",
    args.expectedApplyPlanFingerprint], ["payload",
    args.expectedPayloadFingerprint], ["mutation contract",
    args.expectedMutationContractHash]]) {
    if (!/^[0-9a-f]{64}$/.test(value)) {
      throw new Error(`Exact ${label} fingerprint is required`);
    }
  }
  if (args.mode === "apply" && (!args.execute ||
      !args.freshPreflightSummary ||
      !/^[0-9a-f]{64}$/.test(args.expectedFreshPreflightFingerprint))) {
    throw new Error("Apply requires explicit execution and exact fresh preflight");
  }
  if (args.mode === "verify" &&
      !/^[0-9a-f]{64}$/.test(args.expectedApplyExecutionFingerprint)) {
    throw new Error("Verify requires exact apply execution fingerprint");
  }
  args.outDir ||= ({ "dry-run": DEFAULT_DRY_RUN_OUT,
    preflight: DEFAULT_PREFLIGHT_OUT, apply: DEFAULT_APPLY_OUT,
    verify: DEFAULT_VERIFY_OUT })[args.mode];
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean durable-writer producer");
  }
  return result;
}

function options(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: name };
}

async function writeJson(file, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, body);
  return body;
}

async function writeArtifacts(dir, files, producer, dependencies = []) {
  await fs.mkdir(dir, { recursive: true });
  const buffers = {};
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith(".json")
      ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(dir, name), body);
    buffers[name] = body;
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", producer_commit_sha: producer,
    dependencies,
    artifacts: Object.fromEntries(Object.entries(buffers).map(([name, body]) =>
      [name, { bytes: body.length, sha256:
        hashOnePieceSealedPricingQualificationPlanV1(body) }])),
  });
}

async function loadInputs(args) {
  const [sourceBody, applyBody] = await Promise.all([
    fs.readFile(SOURCE_PLAN_PATH), fs.readFile(APPLY_PLAN_PATH),
  ]);
  const qualificationPlan = JSON.parse(gunzipSync(sourceBody));
  const applyPlan = JSON.parse(applyBody);
  const sourceValidation =
    validateOnePieceSealedPricingQualificationPlanV1(qualificationPlan);
  const applyValidation =
    validateOnePieceSealedPricingQualificationApplyPlanV1({
      plan: applyPlan, qualificationPlan });
  if (!sourceValidation.valid || !applyValidation.valid ||
      applyPlan.apply_plan_fingerprint_sha256 !==
        args.expectedApplyPlanFingerprint ||
      applyPlan.source_payload_fingerprint_sha256 !==
        args.expectedPayloadFingerprint ||
      applyPlan.mutation_contract_sha256 !==
        args.expectedMutationContractHash) {
    throw new Error("Durable writer is not bound to the exact valid frozen inputs");
  }
  return { sourceBody, applyBody, qualificationPlan, applyPlan,
    rows: qualificationPlan.payload.qualification_rows };
}

function runPlan(args, repo, inputs) {
  return { version: ONE_PIECE_SEALED_PRICING_QUALIFICATION_APPLY_VERSION,
    recorded_at: new Date().toISOString(), mode: args.mode, repository: repo,
    apply_plan_fingerprint_sha256:
      inputs.applyPlan.apply_plan_fingerprint_sha256,
    source_payload_fingerprint_sha256:
      inputs.applyPlan.source_payload_fingerprint_sha256,
    mutation_contract_sha256: inputs.applyPlan.mutation_contract_sha256,
    planned_rows: inputs.rows.length,
    boundaries: { release_writes: 0, release_member_writes: 0,
      release_pointer_writes: 0, publication_writes: 0, card_writes: 0,
      storage_writes: 0, vault_writes: 0, app_visibility_changes: 0 } };
}

function clientBoundaries() {
  return { release_writes: 0, release_member_writes: 0,
    release_pointer_writes: 0, publication_writes: 0, card_writes: 0,
    storage_writes: 0, vault_writes: 0, app_visibility_changes: 0 };
}

async function insertRows(client, rows) {
  await client.query(`insert into public.sealed_product_pricing_lane_qualifications
    (id,variant_id,source_mapping_id,source_price_row_identity,
     source_subtype_name_normalized,observed_on,currency,qualification_status,
     qualification_evidence,source_observation_fingerprint,
     qualification_contract_version,publication_authority)
    select id,variant_id,source_mapping_id,source_price_row_identity,
      source_subtype_name_normalized,observed_on,currency,qualification_status,
      qualification_evidence,source_observation_fingerprint,
      qualification_contract_version,publication_authority
    from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
      source_mapping_id uuid,source_price_row_identity text,
      source_subtype_name_normalized text,observed_on date,currency text,
      qualification_status text,qualification_evidence jsonb,
      source_observation_fingerprint text,qualification_contract_version text,
      publication_authority boolean)`, [JSON.stringify(rows)]);
}

async function readback(client, rows) {
  const actual = normalizeOnePieceSealedPricingQualificationRowsV1(
    (await client.query(`select id::text,variant_id::text,source_mapping_id::text,
      source_price_row_identity,source_subtype_name_normalized,
      observed_on::text,currency,qualification_status,qualification_evidence,
      source_observation_fingerprint,qualification_contract_version,
      publication_authority
      from public.sealed_product_pricing_lane_qualifications
      where id=any($1::uuid[]) order by id`,
    [rows.map((row) => row.id)])).rows);
  const expected = normalizeOnePieceSealedPricingQualificationRowsV1(rows);
  const statusCounts = Object.fromEntries(["qualified_exact", "blocked_stale",
    "blocked_missing_price"].map((status) => [status,
    actual.filter((row) => row.qualification_status === status).length]));
  return { count: actual.length, status_counts: statusCounts,
    expected_sha256: hashOnePieceSealedPricingQualificationPlanV1(expected),
    actual_sha256: hashOnePieceSealedPricingQualificationPlanV1(actual),
    exact: stableJsonOnePieceSealedPricingQualificationPlanV1(expected) ===
      stableJsonOnePieceSealedPricingQualificationPlanV1(actual) };
}

async function attribution(client) {
  return (await client.query(`select relname as table_name,
    n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
    n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
    from pg_stat_xact_user_tables where n_tup_ins<>0 or n_tup_upd<>0
      or n_tup_del<>0 or n_tup_hot_upd<>0 order by relname`)).rows.map((row) =>
    ({ table_name: row.table_name, inserted: Number(row.inserted),
      updated: Number(row.updated), deleted: Number(row.deleted),
      hot_updated: Number(row.hot_updated) }));
}

async function dryRun(args, repo, inputs, plan) {
  const execution = { ...plan, status: "dry_run_passed_no_connection",
    database_connections: 0, database_writes: 0, apply_executed: false,
    execution_fingerprint_sha256:
      buildOnePieceSealedPricingQualificationExecutionFingerprintV1({
        repository: repo, apply_plan_fingerprint_sha256:
          inputs.applyPlan.apply_plan_fingerprint_sha256,
        payload_fingerprint_sha256:
          inputs.applyPlan.source_payload_fingerprint_sha256,
        mutation_contract_sha256: inputs.applyPlan.mutation_contract_sha256,
        planned_rows: inputs.rows.length,
      }),
    exact_next_gate: "run a fresh production read-only preflight before any apply" };
  const report = `# One Piece Sealed Pricing Qualification Writer Dry Run V1\n\n` +
    `- Status: \`${execution.status}\`\n- Planned inserts: \`374\`\n` +
    `- Database connections/writes: \`0 / 0\`\n` +
    `- Release/publication/visibility writes: \`0 / 0 / 0\`\n`;
  await writeArtifacts(args.outDir, { "run_plan.json": plan,
    "summary.json": execution, "REPORT.md": report }, repo.commit_sha, [
    { path: path.relative(ROOT, APPLY_PLAN_PATH).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedPricingQualificationPlanV1(inputs.applyBody) },
    { path: path.relative(ROOT, SOURCE_PLAN_PATH).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedPricingQualificationPlanV1(inputs.sourceBody) },
  ]);
  process.stdout.write(`${JSON.stringify(execution, null, 2)}\n`);
}

async function preflight(args, repo, inputs, plan, connectionString) {
  const proof = await readOnlyPreflight(connectionString, inputs.rows);
  const preflightFingerprint =
    hashOnePieceSealedPricingQualificationPlanV1(proof);
  const summary = { ...plan, status: proof.valid && proof.transaction_read_only
    ? "production_read_only_preflight_passed"
    : "production_read_only_preflight_failed",
  preflight_fingerprint_sha256: preflightFingerprint,
  proof, database_writes: 0, apply_executed: false,
  exact_next_gate: "execute only from this exact clean commit and preflight fingerprint" };
  await writeArtifacts(args.outDir, { "run_plan.json": plan,
    "preflight_proof.json": proof, "summary.json": summary,
    "REPORT.md": `# Qualification Durable Apply Preflight V1\n\n- Status: \`${summary.status}\`\n- Rows: \`374\`\n- Database writes: \`0\`\n` },
  repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.status !== "production_read_only_preflight_passed") {
    throw new Error(proof.findings.join(","));
  }
}

async function apply(args, repo, inputs, plan, connectionString) {
  const freshBody = await fs.readFile(args.freshPreflightSummary);
  const fresh = JSON.parse(freshBody);
  if (fresh.status !== "production_read_only_preflight_passed" ||
      fresh.preflight_fingerprint_sha256 !==
        args.expectedFreshPreflightFingerprint ||
      hashOnePieceSealedPricingQualificationPlanV1(fresh.proof) !==
        args.expectedFreshPreflightFingerprint ||
      fresh.repository?.commit_sha !== repo.commit_sha) {
    throw new Error("Durable apply is not bound to the exact fresh preflight");
  }
  const client = new Client(options(connectionString,
    "one-piece-sealed-pricing-qualification-durable-apply-v1"));
  await client.connect();
  let committed = false;
  try {
    await client.query("begin transaction isolation level repeatable read");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_sealed_pricing_qualification_durable_apply_v1"]);
    const before = await baseline(client);
    const lineage = await lineageProof(client, inputs.rows);
    const collisions = await collisionProof(client, inputs.rows);
    const transactionPreflight = { valid:
      lineage.expected_rows === 374 && lineage.matched_variants === 374 &&
      lineage.matched_exact_mappings === 374 &&
      lineage.matched_source_observations === 374 &&
      collisions.id_collisions === 0 && collisions.unique_key_collisions === 0,
    lineage, collisions };
    if (!transactionPreflight.valid) {
      throw new Error("Transaction-local preflight failed");
    }
    await insertRows(client, inputs.rows);
    const exactReadback = await readback(client, inputs.rows);
    const writes = await attribution(client);
    const after = await baseline(client);
    const proof = { transaction: { started: true, committed: false },
      transaction_local_preflight: transactionPreflight,
      baseline_before: before, baseline_after_transaction: after,
      readback: exactReadback, write_attribution: writes,
      boundaries: clientBoundaries() };
    const validation =
      evaluateOnePieceSealedPricingQualificationPrecommitV1(proof);
    if (!validation.valid) throw new Error(validation.findings.join(","));
    const executionCore = { repository: repo,
      apply_plan_fingerprint_sha256:
        inputs.applyPlan.apply_plan_fingerprint_sha256,
      source_payload_fingerprint_sha256:
        inputs.applyPlan.source_payload_fingerprint_sha256,
      mutation_contract_sha256: inputs.applyPlan.mutation_contract_sha256,
      fresh_preflight_fingerprint_sha256:
        fresh.preflight_fingerprint_sha256,
      readback_sha256: exactReadback.actual_sha256,
      write_attribution: writes };
    const executionFingerprint =
      buildOnePieceSealedPricingQualificationExecutionFingerprintV1(
        executionCore);
    await client.query("commit");
    committed = true;
    const summary = { ...plan,
      status: "durable_apply_committed_and_exact_readback_passed",
      committed: true, apply_executed: true,
      apply_execution_fingerprint_sha256: executionFingerprint,
      validation, readback: exactReadback, write_attribution: writes,
      exact_next_gate: "run independent read-only post-apply verification" };
    await writeArtifacts(args.outDir, { "run_plan.json": plan,
      "transaction_proof.json": proof, "summary.json": summary,
      "REPORT.md": `# Qualification Durable Apply V1\n\n- Status: \`${summary.status}\`\n- Inserts: \`374\`\n` }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    if (!committed) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function verify(args, repo, inputs, plan, connectionString) {
  const applyBody = await fs.readFile(args.applySummary);
  const applySummary = JSON.parse(applyBody);
  if (applySummary.apply_execution_fingerprint_sha256 !==
      args.expectedApplyExecutionFingerprint) {
    throw new Error("Verification is not bound to the exact apply execution");
  }
  const client = new Client(options(connectionString,
    "one-piece-sealed-pricing-qualification-post-apply-v1"));
  await client.connect();
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    const verification = { transaction_read_only:
      (await client.query("show transaction_read_only")).rows[0]
        .transaction_read_only === "on",
    baseline: await baseline(client),
    readback: await readback(client, inputs.rows),
    write_attribution: await attribution(client),
    boundaries: { database_writes: 0, ...clientBoundaries() } };
    await client.query("rollback");
    const validation =
      evaluateOnePieceSealedPricingQualificationPostApplyV1({
        applySummary, verification });
    const summary = { ...plan, status: validation.valid
      ? "independent_post_apply_verification_passed"
      : "independent_post_apply_verification_failed",
    validation, apply_execution_fingerprint_sha256:
      args.expectedApplyExecutionFingerprint,
    database_writes: 0,
    exact_next_gate: "checkpoint durable qualifications before any release planning" };
    await writeArtifacts(args.outDir, { "run_plan.json": plan,
      "production_readback.json": verification, "summary.json": summary,
      "REPORT.md": `# Qualification Post-Apply Verification V1\n\n- Status: \`${summary.status}\`\n- Database writes: \`0\`\n` },
    repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!validation.valid) throw new Error(validation.findings.join(","));
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const inputs = await loadInputs(args);
  const plan = runPlan(args, repo, inputs);
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), plan);
  if (args.mode === "dry-run") return dryRun(args, repo, inputs, plan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  if (args.mode === "preflight") {
    return preflight(args, repo, inputs, plan, connectionString);
  }
  if (args.mode === "apply") return apply(args, repo, inputs, plan,
    connectionString);
  return verify(args, repo, inputs, plan, connectionString);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
