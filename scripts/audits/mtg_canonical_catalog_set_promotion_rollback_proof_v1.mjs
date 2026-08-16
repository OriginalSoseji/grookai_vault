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
  captureMtgPromotionExactReadbackV1,
  captureVisiblePokemonCountV1,
  insertMtgPromotionRowsV1,
  MTG_GAME_ID,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { buildMtgCanonicalSetPromotionContractV1 } from "./mtg_canonical_catalog_set_promotion_contract_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_SET_PROMOTION_ROLLBACK_PROOF_V1";

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
  const args = { payload: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

function expectEqual(actual, expected, label) {
  if (String(actual) !== String(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function expectCount(actual, expected, label) {
  if (Number(actual) !== Number(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

export async function captureMtgSetPromotionStateV1(client, plan) {
  const selectedCode = plan.selected_set.code.toLowerCase();
  const result = await client.query(
    `select jsonb_build_object(
       'foundation_migration_present', exists (
         select 1 from supabase_migrations.schema_migrations where version = '20260813190000'
       ),
       'visibility_migration_present', exists (
         select 1 from supabase_migrations.schema_migrations where version = '20260813200000'
       ),
       'visibility_table_present', to_regclass('public.catalog_game_release_controls') is not null,
       'release_status', (
         select release_status from public.catalog_game_release_controls where game_code = 'mtg'
       ),
       'staging_batch_count', (
         select count(*) from public.mtg_canonical_import_batches
         where id = $1 and payload_fingerprint_sha256 = $2
       ),
       'staging_row_count', (
         select count(*) from public.mtg_canonical_import_rows where batch_id = $1
       ),
       'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
       'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
       'mtg_card_count', (select count(*) from public.card_prints where game_id = $3),
       'mtg_identity_count', (
         select count(*) from public.card_print_identity identity_row
         join public.card_prints card on card.id = identity_row.card_print_id
         where card.game_id = $3
       ),
       'mtg_printing_count', (
         select count(*) from public.card_printings printing
         join public.card_prints card on card.id = printing.card_print_id
         where card.game_id = $3
       ),
       'mtg_parent_mapping_count', (
         select count(*) from public.external_mappings mapping
         join public.card_prints card on card.id = mapping.card_print_id
         where card.game_id = $3 and mapping.source = 'scryfall'
       ),
       'mtg_printing_mapping_count', (
         select count(*) from public.external_printing_mappings mapping
         join public.card_printings printing on printing.id = mapping.card_printing_id
         join public.card_prints card on card.id = printing.card_print_id
         where card.game_id = $3 and mapping.source = 'tcgplayer_market'
       ),
       'selected_set_count', (
         select count(*) from public.sets where game = 'mtg' and lower(code) = $4
       ),
       'selected_card_count', (
         select count(*) from public.card_prints where game_id = $3 and lower(set_code) = $4
       ),
       'selected_identity_count', (
         select count(*) from public.card_print_identity identity_row
         join public.card_prints card on card.id = identity_row.card_print_id
         where card.game_id = $3 and lower(card.set_code) = $4
       ),
       'selected_printing_count', (
         select count(*) from public.card_printings printing
         join public.card_prints card on card.id = printing.card_print_id
         where card.game_id = $3 and lower(card.set_code) = $4
       ),
       'selected_parent_mapping_count', (
         select count(*) from public.external_mappings mapping
         join public.card_prints card on card.id = mapping.card_print_id
         where card.game_id = $3 and lower(card.set_code) = $4 and mapping.source = 'scryfall'
       ),
       'selected_printing_mapping_count', (
         select count(*) from public.external_printing_mappings mapping
         join public.card_printings printing on printing.id = mapping.card_printing_id
         join public.card_prints card on card.id = printing.card_print_id
         where card.game_id = $3 and lower(card.set_code) = $4
           and mapping.source = 'tcgplayer_market'
       ),
       'dsk_set_count', (select count(*) from public.sets where game = 'mtg' and code = 'dsk'),
       'dsk_card_count', (
         select count(*) from public.card_prints where game_id = $3 and set_code = 'dsk'
       ),
       'dsk_identity_count', (
         select count(*) from public.card_print_identity identity_row
         join public.card_prints card on card.id = identity_row.card_print_id
         where card.game_id = $3 and card.set_code = 'dsk'
       ),
       'dsk_printing_count', (
         select count(*) from public.card_printings printing
         join public.card_prints card on card.id = printing.card_print_id
         where card.game_id = $3 and card.set_code = 'dsk'
       ),
       'pokemon_card_count', (
         select count(*) from public.card_prints card
         join public.games game on game.id = card.game_id where game.code = 'pokemon'
       )
     ) as value`,
    [plan.staging_batch_id, plan.writer_payload_fingerprint, MTG_GAME_ID, selectedCode],
  );
  return result.rows[0].value;
}

export async function captureMtgSetPromotionStageV1(client, plan) {
  const batch = await client.query(
    `select id::text, payload_fingerprint_sha256, plan_version, source_bulk_sha256,
            foundation_migration_sha256, producing_commit_sha, producing_branch,
            selected_set_code, selected_set_name, status, row_counts, execution_boundaries
     from public.mtg_canonical_import_batches where id = $1`,
    [plan.staging_batch_id],
  );
  const rows = await client.query(
    `select id::text, batch_id::text, entity_type, row_key, row_ordinal, payload, payload_sha256
     from public.mtg_canonical_import_rows where batch_id = $1
     order by entity_type, row_ordinal`,
    [plan.staging_batch_id],
  );
  return { batch: batch.rows, rows: rows.rows };
}

export function evaluateMtgSetPromotionBaselineV1({ plan, state, stage, reconciliation, collisions }) {
  const findings = [...reconciliation.findings];
  if (!state.foundation_migration_present) findings.push("foundation_migration_missing");
  if (!state.visibility_migration_present) findings.push("visibility_migration_missing");
  if (!state.visibility_table_present) findings.push("visibility_table_missing");
  if (state.release_status !== "hidden") findings.push("mtg_release_not_hidden");
  if (Number(state.staging_batch_count) !== 1) findings.push("staging_batch_count_mismatch");
  if (Number(state.staging_row_count) !== plan.staging_contract.staged_row_count) {
    findings.push("staging_row_count_mismatch");
  }
  if (stage.batch.length !== 1) findings.push("staging_batch_readback_mismatch");
  else {
    const batch = stage.batch[0];
    if (batch.payload_fingerprint_sha256 !== plan.writer_payload_fingerprint) {
      findings.push("staging_payload_fingerprint_mismatch");
    }
    if (batch.plan_version !== plan.source_plan_version) findings.push("staging_plan_version_mismatch");
    if (batch.selected_set_code !== plan.selected_set.code) findings.push("staging_set_code_mismatch");
    if (batch.status !== "staged") findings.push("staging_status_mismatch");
  }
  if (Number(state.mtg_game_count) !== 1) findings.push("mtg_game_baseline_mismatch");
  if (Number(state.selected_set_count) !== 0) findings.push("selected_set_already_canonical");
  if (Number(state.selected_card_count) !== 0) findings.push("selected_cards_already_canonical");
  if (Number(state.selected_identity_count) !== 0) findings.push("selected_identities_already_canonical");
  if (Number(state.selected_printing_count) !== 0) findings.push("selected_printings_already_canonical");
  if (Object.values(collisions).some((count) => Number(count) !== 0)) {
    findings.push("canonical_collision_detected");
  }
  return [...new Set(findings)];
}

export function verifyMtgSetPromotionExactReadbackV1(plan, exact) {
  for (const [name, check] of Object.entries(exact)) {
    expectCount(check.planned_count, plan.row_counts[name], `${name} planned readback`);
    expectCount(check.actual_count, plan.row_counts[name], `${name} actual readback`);
    expectCount(check.exact_count, plan.row_counts[name], `${name} exact readback`);
  }
}

export function verifyMtgSetPromotionDeltaV1(plan, before, inside) {
  const deltas = {
    mtg_set_count: plan.row_counts.sets,
    mtg_card_count: plan.row_counts.card_prints,
    mtg_identity_count: plan.row_counts.card_print_identity,
    mtg_printing_count: plan.row_counts.card_printings,
    mtg_parent_mapping_count: plan.row_counts.external_mappings,
    mtg_printing_mapping_count: plan.row_counts.external_printing_mappings,
  };
  for (const [key, delta] of Object.entries(deltas)) {
    expectCount(inside[key], Number(before[key]) + delta, `${key} promotion delta`);
  }
  const selected = {
    selected_set_count: plan.row_counts.sets,
    selected_card_count: plan.row_counts.card_prints,
    selected_identity_count: plan.row_counts.card_print_identity,
    selected_printing_count: plan.row_counts.card_printings,
    selected_parent_mapping_count: plan.row_counts.external_mappings,
    selected_printing_mapping_count: plan.row_counts.external_printing_mappings,
  };
  for (const [key, expected] of Object.entries(selected)) {
    expectCount(inside[key], expected, `${key} exact count`);
  }
  for (const key of ["dsk_set_count", "dsk_card_count", "dsk_identity_count", "dsk_printing_count"] ) {
    expectCount(inside[key], before[key], `${key} unchanged`);
  }
  expectEqual(inside.release_status, "hidden", "MTG release status");
  expectCount(inside.pokemon_card_count, before.pokemon_card_count, "Pokemon service count");
}

async function runRollbackProof(payload, plan) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
  });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("begin");
    transactionOpen = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");
    const before = await captureMtgSetPromotionStateV1(client, plan);
    const stage = await captureMtgSetPromotionStageV1(client, plan);
    const reconciliation = reconcileMtgStageRowsV1(stage.rows, plan.staging_contract);
    const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    const baselineFindings = evaluateMtgSetPromotionBaselineV1({
      plan,
      state: before,
      stage,
      reconciliation,
      collisions,
    });
    if (baselineFindings.length > 0) throw new Error(baselineFindings.join(", "));
    const authenticatedPokemonBefore = await captureVisiblePokemonCountV1(client, "authenticated");

    const inserted = await insertMtgPromotionRowsV1(client, plan.rows);
    for (const [name, expected] of Object.entries(plan.row_counts)) {
      expectCount(inserted[name], expected, `${name} inserted rows`);
    }
    const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
    verifyMtgSetPromotionExactReadbackV1(plan, exact);
    const inside = await captureMtgSetPromotionStateV1(client, plan);
    verifyMtgSetPromotionDeltaV1(plan, before, inside);

    const anon = await captureMtgClientVisibilityV1(client, "anon", payload.selected_set.code);
    const authenticated = await captureMtgClientVisibilityV1(
      client,
      "authenticated",
      payload.selected_set.code,
    );
    for (const [role, evidence] of Object.entries({ anon, authenticated })) {
      for (const key of [
        "game_count",
        "set_count",
        "card_count",
        "identity_count",
        "printing_count",
        "legacy_search_count",
        "print_search_count",
      ]) {
        expectCount(evidence[key], 0, `${role} ${key}`);
      }
    }
    expectCount(
      authenticated.pokemon_card_count,
      authenticatedPokemonBefore,
      "authenticated Pokemon visibility",
    );

    await client.query("rollback");
    transactionOpen = false;
    const after = await captureMtgSetPromotionStateV1(client, plan);
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      throw new Error("Post-rollback canonical baseline does not match the preflight baseline");
    }
    const afterStage = await captureMtgSetPromotionStageV1(client, plan);
    const afterReconciliation = reconcileMtgStageRowsV1(afterStage.rows, plan.staging_contract);
    if (afterReconciliation.findings.length > 0) {
      throw new Error(`Post-rollback staging drift: ${afterReconciliation.findings.join(", ")}`);
    }
    const afterCollisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    if (Object.values(afterCollisions).some((count) => Number(count) !== 0)) {
      throw new Error("Canonical rows survived rollback");
    }
    const authenticatedPokemonAfter = await captureVisiblePokemonCountV1(client, "authenticated");
    expectCount(authenticatedPokemonAfter, authenticatedPokemonBefore, "post-rollback Pokemon visibility");
    return {
      baseline_findings: baselineFindings,
      before,
      staging_reconciliation: reconciliation,
      collisions,
      inserted,
      exact_readback: exact,
      inside_transaction: inside,
      client_visibility: { anon, authenticated },
      authenticated_pokemon_before: authenticatedPokemonBefore,
      after_rollback: after,
      post_rollback_staging_reconciliation: afterReconciliation,
      post_rollback_collisions: afterCollisions,
      authenticated_pokemon_after: authenticatedPokemonAfter,
    };
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
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
  return `# MTG ${result.plan.selected_set.code.toUpperCase()} Canonical Promotion Rollback Proof

- Status: **${result.status.toUpperCase()}**
- Set: \`${result.plan.selected_set.code}\` - ${result.plan.selected_set.name}
- Promotion plan: \`${result.plan.promotion_plan_sha256}\`
- Exact promotion rows: \`${result.plan.total_rows}\`
- Parents / identities / printings: \`${result.plan.row_counts.card_prints}\` / \`${result.plan.row_counts.card_print_identity}\` / \`${result.plan.row_counts.card_printings}\`
- Scryfall / TCGPlayer mappings: \`${result.plan.row_counts.external_mappings}\` / \`${result.plan.row_counts.external_printing_mappings}\`
- Release status inside proof: \`${result.proof.inside_transaction.release_status}\`
- Client-visible MTG cards: \`0\`
- DSK cards before / inside / after: \`${result.proof.before.dsk_card_count}\` / \`${result.proof.inside_transaction.dsk_card_count}\` / \`${result.proof.after_rollback.dsk_card_count}\`
- Canonical selected-set cards after rollback: \`${result.proof.after_rollback.selected_card_count}\`
- Durable canonical writes: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = repositoryState();
  if (repository.branch !== "agent/mtg-pricing-readiness-v1") {
    throw new Error(`Unexpected branch: ${repository.branch}`);
  }
  if (!repository.tracked_worktree_clean) {
    throw new Error("Tracked worktree must be clean before the production rollback proof");
  }
  const payloadBody = await fs.readFile(args.payload, "utf8");
  const payload = JSON.parse(payloadBody);
  const plan = buildMtgCanonicalSetPromotionContractV1(payload);
  const proof = await runRollbackProof(payload, plan);
  const publicPlan = { ...plan, rows: undefined, staging_contract: { ...plan.staging_contract, rows: undefined } };
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: "rollback_proof_passed",
    repository,
    payload_sha256: sha256(payloadBody),
    plan: publicPlan,
    proof,
    boundaries: {
      durable_database_writes: false,
      migration_writes: false,
      release_control_writes: false,
      canonical_promotion_applied: false,
      app_visibility_activated: false,
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
    "mtg_canonical_catalog_set_promotion_rollback_proof_v1",
  );
  await fs.mkdir(outDir, { recursive: true });
  const planBody = await writeJson(path.join(outDir, "promotion_plan.json"), publicPlan);
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "promotion_plan.json": sha256(planBody),
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, status: result.status, plan: plan.promotion_plan_sha256 })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
