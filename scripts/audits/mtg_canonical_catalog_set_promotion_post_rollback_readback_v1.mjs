import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { reconcileMtgStageRowsV1 } from "./mtg_canonical_catalog_stage_readback_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionCollisionsV1,
  captureVisiblePokemonCountV1,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { buildMtgCanonicalSetPromotionContractV1 } from "./mtg_canonical_catalog_set_promotion_contract_v1.mjs";
import {
  captureMtgSetPromotionStageV1,
  captureMtgSetPromotionStateV1,
  evaluateMtgSetPromotionBaselineV1,
} from "./mtg_canonical_catalog_set_promotion_rollback_proof_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_SET_PROMOTION_POST_ROLLBACK_READBACK_V1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryState() {
  const run = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  return {
    commit_sha: run(["rev-parse", "HEAD"]),
    branch: run(["branch", "--show-current"]),
    tracked_worktree_clean: run(["status", "--porcelain", "--untracked-files=no"]) === "",
  };
}

function parseArgs(argv) {
  const args = { payload: null, rollbackSummary: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--rollback-summary=")) {
      args.rollbackSummary = path.resolve(arg.slice(19));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  if (!args.rollbackSummary) throw new Error("--rollback-summary=<summary.json> is required");
  return args;
}

export function evaluateMtgSetPromotionPostRollbackV1({
  plan,
  rollbackSummary,
  state,
  stage,
  reconciliation,
  collisions,
  clientVisibility,
  authenticatedPokemonCount,
}) {
  const rollbackProof = rollbackSummary.proof ?? rollbackSummary.database_proof;
  const findings = evaluateMtgSetPromotionBaselineV1({
    plan,
    state,
    stage,
    reconciliation,
    collisions,
  });
  if (!new Set([
    "rollback_proof_passed",
    "promotion_writer_rollback_proof_passed",
  ]).has(rollbackSummary.status)) {
    findings.push("rollback_proof_status_mismatch");
  }
  if (rollbackSummary.plan?.promotion_plan_sha256 !== plan.promotion_plan_sha256) {
    findings.push("rollback_promotion_plan_mismatch");
  }
  if (JSON.stringify(rollbackProof?.before) !== JSON.stringify(state)) {
    findings.push("post_rollback_baseline_mismatch");
  }
  if (JSON.stringify(rollbackProof?.after_rollback) !== JSON.stringify(state)) {
    findings.push("rollback_summary_after_state_mismatch");
  }
  for (const [role, evidence] of Object.entries(clientVisibility)) {
    for (const key of [
      "game_count",
      "set_count",
      "card_count",
      "identity_count",
      "printing_count",
      "legacy_search_count",
      "print_search_count",
    ]) {
      if (Number(evidence[key]) !== 0) findings.push(`${role}_${key}_visible`);
    }
  }
  if (
    Number(authenticatedPokemonCount) !==
    Number(rollbackProof?.authenticated_pokemon_before)
  ) {
    findings.push("authenticated_pokemon_visibility_changed");
  }
  return [...new Set(findings)];
}

async function readProduction(plan) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '240s'");
    const state = await captureMtgSetPromotionStateV1(client, plan);
    const stage = await captureMtgSetPromotionStageV1(client, plan);
    const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    const anon = await captureMtgClientVisibilityV1(client, "anon", plan.selected_set.code);
    const authenticated = await captureMtgClientVisibilityV1(
      client,
      "authenticated",
      plan.selected_set.code,
    );
    const authenticatedPokemonCount = await captureVisiblePokemonCountV1(
      client,
      "authenticated",
    );
    const readOnly = await client.query(
      "select current_setting('transaction_read_only')::boolean as value",
    );
    await client.query("rollback");
    return {
      transaction_read_only: readOnly.rows[0].value,
      state,
      stage,
      collisions,
      client_visibility: { anon, authenticated },
      authenticated_pokemon_count: authenticatedPokemonCount,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(result) {
  return `# MTG ${result.selected_set.code.toUpperCase()} Promotion Post-Rollback Readback

- Status: **${result.status.toUpperCase()}**
- Promotion plan: \`${result.promotion_plan_sha256}\`
- Transaction read-only: \`${result.production.transaction_read_only}\`
- Immutable staged rows: \`${result.reconciliation.row_count}\`
- Canonical selected-set cards: \`${result.production.state.selected_card_count}\`
- Canonical DSK cards: \`${result.production.state.dsk_card_count}\`
- Client-visible MTG cards: \`0\`
- Findings: \`${result.findings.length}\`
- Database writes: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = repositoryState();
  const payloadBody = await fs.readFile(args.payload, "utf8");
  const rollbackBody = await fs.readFile(args.rollbackSummary, "utf8");
  const payload = JSON.parse(payloadBody);
  const rollbackSummary = JSON.parse(rollbackBody);
  const plan = buildMtgCanonicalSetPromotionContractV1(payload);
  const production = await readProduction(plan);
  const reconciliation = reconcileMtgStageRowsV1(
    production.stage.rows,
    plan.staging_contract,
  );
  const findings = evaluateMtgSetPromotionPostRollbackV1({
    plan,
    rollbackSummary,
    state: production.state,
    stage: production.stage,
    reconciliation,
    collisions: production.collisions,
    clientVisibility: production.client_visibility,
    authenticatedPokemonCount: production.authenticated_pokemon_count,
  });
  delete production.stage.rows;
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "rollback_independently_verified" : "blocked",
    repository,
    payload_sha256: sha256(payloadBody),
    rollback_summary_sha256: sha256(rollbackBody),
    promotion_plan_sha256: plan.promotion_plan_sha256,
    selected_set: plan.selected_set,
    row_counts: plan.row_counts,
    reconciliation,
    production,
    findings,
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      canonical_writes: false,
      app_visibility: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
    },
  };
  const outDir = args.outDir ?? path.join(
    ROOT,
    "docs",
    "audits",
    "pricing",
    "mtg_canonical_catalog_set_promotion_post_rollback_readback_v1",
  );
  await fs.mkdir(outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, status: result.status, findings })}\n`);
  if (findings.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
