import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { reconcileMtgStageRowsV1 } from "./mtg_canonical_catalog_stage_readback_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionExactReadbackV1,
  captureVisiblePokemonCountV1,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { buildMtgCanonicalSetPromotionContractV1 } from "./mtg_canonical_catalog_set_promotion_contract_v1.mjs";
import {
  captureMtgSetPromotionStageV1,
  captureMtgSetPromotionStateV1,
} from "./mtg_canonical_catalog_set_promotion_rollback_proof_v1.mjs";
import {
  assertMtgSetPromotionSecurityV1,
  buildMtgCanonicalSetPromotionApprovalV1,
  captureMtgSetPromotionCurrentSourceLanesV1,
  captureMtgSetPromotionRepositoryContractV1,
  captureMtgSetPromotionSecurityV1,
} from "./mtg_canonical_catalog_set_promotion_writer_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_SET_PROMOTION_POST_APPLY_READBACK_V1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { payload: null, applySummary: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--apply-summary=")) {
      args.applySummary = path.resolve(arg.slice(16));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  if (!args.applySummary) throw new Error("--apply-summary=<summary.json> is required");
  return args;
}

function expect(findings, actual, expected, label) {
  if (String(actual) !== String(expected)) findings.push(`${label}_mismatch`);
}

export function evaluateMtgSetPromotionPostApplyReadbackV1({
  plan,
  repository,
  approval,
  applySummary,
  readback,
  stagingReconciliation,
}) {
  const findings = [...stagingReconciliation.findings];
  if (applySummary.status !== "hidden_canonical_set_promotion_applied_and_read_back") {
    findings.push("apply_status_mismatch");
  }
  expect(
    findings,
    applySummary.plan?.promotion_plan_sha256,
    plan.promotion_plan_sha256,
    "apply_promotion_plan",
  );
  expect(
    findings,
    applySummary.approval_sha256,
    approval.approval_sha256,
    "apply_approval_hash",
  );
  expect(
    findings,
    applySummary.required_approval_message,
    approval.required_approval_message,
    "apply_approval_message",
  );
  expect(
    findings,
    applySummary.repository?.governing_commit_sha,
    repository.governing_commit_sha,
    "governing_commit",
  );
  expect(
    findings,
    applySummary.repository?.governing_files_sha256,
    repository.governing_files_sha256,
    "governing_source_hash",
  );
  if (applySummary.boundaries?.database_writes !== true) findings.push("apply_write_boundary_missing");
  for (const key of [
    "migration_writes",
    "release_control_writes",
    "app_visibility_activation",
    "storage_writes",
    "image_pointer_writes",
    "pricing_writes",
    "pokemon_mutation",
    "global_db_push",
  ]) {
    if (applySummary.boundaries?.[key] !== false) findings.push(`apply_${key}_boundary_mismatch`);
  }
  if (readback.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (!readback.state.foundation_migration_present) findings.push("foundation_migration_missing");
  if (!readback.state.visibility_migration_present) findings.push("visibility_migration_missing");
  if (!readback.state.visibility_table_present) findings.push("visibility_table_missing");
  if (readback.state.release_status !== "hidden") findings.push("mtg_release_not_hidden");

  const before = applySummary.database_proof?.before ?? {};
  const deltas = {
    mtg_set_count: plan.row_counts.sets,
    mtg_card_count: plan.row_counts.card_prints,
    mtg_identity_count: plan.row_counts.card_print_identity,
    mtg_printing_count: plan.row_counts.card_printings,
    mtg_parent_mapping_count: plan.row_counts.external_mappings,
    mtg_printing_mapping_count: plan.row_counts.external_printing_mappings,
  };
  for (const [key, delta] of Object.entries(deltas)) {
    expect(findings, readback.state[key], Number(before[key]) + delta, key);
  }
  const selected = {
    selected_set_count: plan.row_counts.sets,
    selected_card_count: plan.row_counts.card_prints,
    selected_identity_count: plan.row_counts.card_print_identity,
    selected_printing_count: plan.row_counts.card_printings,
    selected_parent_mapping_count: plan.row_counts.external_mappings,
    selected_printing_mapping_count: plan.row_counts.external_printing_mappings,
  };
  for (const [key, value] of Object.entries(selected)) {
    expect(findings, readback.state[key], value, key);
  }
  for (const key of ["dsk_set_count", "dsk_card_count", "dsk_identity_count", "dsk_printing_count"] ) {
    expect(findings, readback.state[key], before[key], key);
  }
  expect(findings, readback.state.pokemon_card_count, before.pokemon_card_count, "pokemon_card_count");

  for (const [name, count] of Object.entries(plan.row_counts)) {
    const exact = readback.exact[name] ?? {};
    expect(findings, exact.planned_count, count, `${name}_planned_count`);
    expect(findings, exact.actual_count, count, `${name}_actual_count`);
    expect(findings, exact.exact_count, count, `${name}_exact_count`);
  }
  try {
    assertMtgSetPromotionSecurityV1(readback.security);
  } catch {
    findings.push("visibility_security_mismatch");
  }
  expect(
    findings,
    readback.source.planned_count,
    plan.row_counts.external_printing_mappings,
    "source_planned_count",
  );
  expect(
    findings,
    readback.source.source_row_count,
    plan.row_counts.external_printing_mappings,
    "source_row_count",
  );
  expect(
    findings,
    readback.source.positive_market_price_count,
    plan.row_counts.external_printing_mappings,
    "source_positive_market_price_count",
  );
  for (const [role, evidence] of Object.entries(readback.client_visibility)) {
    for (const key of [
      "game_count",
      "set_count",
      "card_count",
      "identity_count",
      "printing_count",
      "legacy_search_count",
      "print_search_count",
    ]) {
      expect(findings, evidence[key], 0, `${role}_${key}`);
    }
  }
  expect(
    findings,
    readback.authenticated_pokemon_count,
    applySummary.database_proof?.authenticated_pokemon_before,
    "authenticated_pokemon_count",
  );
  for (const [key, count] of Object.entries(readback.image_pointers)) {
    expect(findings, count, 0, key);
  }
  expect(
    findings,
    stagingReconciliation.actual_hash_sha256,
    plan.staging_rows_sha256,
    "staging_rows_hash",
  );
  expect(
    findings,
    stagingReconciliation.row_count,
    plan.staging_contract.staged_row_count,
    "staging_row_count",
  );
  return [...new Set(findings)];
}

async function readProduction(payload, plan) {
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
    const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
    const security = await captureMtgSetPromotionSecurityV1(client);
    const source = await captureMtgSetPromotionCurrentSourceLanesV1(client, payload);
    const anon = await captureMtgClientVisibilityV1(client, "anon", payload.selected_set.code);
    const authenticated = await captureMtgClientVisibilityV1(
      client,
      "authenticated",
      payload.selected_set.code,
    );
    const authenticatedPokemonCount = await captureVisiblePokemonCountV1(
      client,
      "authenticated",
    );
    const imagePointers = await client.query(
      `select jsonb_build_object(
         'parent_image_url_count', count(*) filter (where image_url is not null),
         'parent_image_alt_url_count', count(*) filter (where image_alt_url is not null),
         'parent_image_source_count', count(*) filter (where image_source is not null),
         'printing_image_path_count', (
           select count(*) from public.card_printings
           where card_print_id = any($1::uuid[]) and image_path is not null
         ),
         'printing_image_url_count', (
           select count(*) from public.card_printings
           where card_print_id = any($1::uuid[]) and image_url is not null
         ),
         'printing_image_alt_url_count', (
           select count(*) from public.card_printings
           where card_print_id = any($1::uuid[]) and image_alt_url is not null
         )
       ) as value from public.card_prints where id = any($1::uuid[])`,
      [plan.rows.card_prints.map((row) => row.id)],
    );
    const readOnly = await client.query(
      "select current_setting('transaction_read_only')::boolean as value",
    );
    await client.query("rollback");
    return {
      transaction_read_only: readOnly.rows[0].value,
      state,
      stage,
      exact,
      security,
      source,
      client_visibility: { anon, authenticated },
      authenticated_pokemon_count: authenticatedPokemonCount,
      image_pointers: imagePointers.rows[0].value,
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
  return `# MTG ${result.selected_set.code.toUpperCase()} Canonical Promotion Independent Readback

- Status: **${result.status.toUpperCase()}**
- Promotion plan: \`${result.promotion_plan_sha256}\`
- Canonical selected-set parents: \`${result.production.state.selected_card_count}\`
- Canonical selected-set printings: \`${result.production.state.selected_printing_count}\`
- Staged rows: \`${result.staging_reconciliation.row_count}\`
- Client-visible MTG cards: \`0\`
- Non-null image pointers: \`${Object.values(result.production.image_pointers).reduce((sum, count) => sum + Number(count), 0)}\`
- Findings: \`${result.findings.length}\`
- Database writes: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payloadBody = await fs.readFile(args.payload, "utf8");
  const applyBody = await fs.readFile(args.applySummary, "utf8");
  const payload = JSON.parse(payloadBody);
  const applySummary = JSON.parse(applyBody);
  const plan = buildMtgCanonicalSetPromotionContractV1(payload);
  const repository = await captureMtgSetPromotionRepositoryContractV1();
  const approval = buildMtgCanonicalSetPromotionApprovalV1(plan, repository);
  const production = await readProduction(payload, plan);
  const stagingReconciliation = reconcileMtgStageRowsV1(
    production.stage.rows,
    plan.staging_contract,
  );
  const findings = evaluateMtgSetPromotionPostApplyReadbackV1({
    plan,
    repository,
    approval,
    applySummary,
    readback: production,
    stagingReconciliation,
  });
  delete production.stage.rows;
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "hidden_canonical_set_apply_verified" : "blocked",
    payload_sha256: sha256(payloadBody),
    apply_artifact_sha256: sha256(applyBody),
    promotion_plan_sha256: plan.promotion_plan_sha256,
    approval_sha256: approval.approval_sha256,
    repository,
    selected_set: plan.selected_set,
    row_counts: plan.row_counts,
    staging_reconciliation: stagingReconciliation,
    production,
    findings,
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      release_status_changes: false,
      image_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
    },
  };
  const outDir = args.outDir ?? path.join(
    ROOT,
    "docs",
    "audits",
    "pricing",
    "mtg_canonical_catalog_set_promotion_post_apply_readback_v1",
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
