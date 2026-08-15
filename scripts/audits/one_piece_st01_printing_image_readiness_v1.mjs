import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildOnePieceSt01PrintingImageEvidenceV1,
  buildOnePieceSt01PrintingImageReadinessFingerprintV1,
  evaluateOnePieceSt01PrintingImageReadinessV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_PINNED_INPUTS,
  ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
} from "../../backend/pricing/one_piece_st01_printing_image_readiness_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing");
export const INPUT_PATHS = Object.freeze({
  promotion_plan: path.join(AUDIT_ROOT, "one_piece_st01_canonical_promotion_v1",
    "frozen_plan_v1", "plan.json"),
  source_readback: path.join(AUDIT_ROOT,
    "one_piece_canonical_import_durable_payload_apply_v1",
    "production_apply_v1_independent_verify", "readback.json"),
  storage_readback_rows: path.join(AUDIT_ROOT,
    "one_piece_st01_storage_permanent_readback_v1", "st01_18_objects_v1",
    "readback_rows.jsonl"),
  canonical_post_apply_readback: path.join(AUDIT_ROOT,
    "one_piece_st01_canonical_promotion_v1", "independent_post_apply_v1",
    "fresh_readback.json"),
});
const DEFAULT_OUT = path.join(AUDIT_ROOT,
  "one_piece_st01_printing_image_readiness_v1", "production_read_only_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function jsonLines(body) {
  return body.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function loadInputs() {
  const bodies = {};
  for (const [key, file] of Object.entries(INPUT_PATHS)) {
    bodies[key] = await fs.readFile(file, "utf8");
  }
  const hashes = Object.fromEntries(Object.entries(bodies).map(([key, body]) => [
    `${key}_sha256`, sha256(body),
  ]));
  if (JSON.stringify(hashes) !==
      JSON.stringify(ONE_PIECE_ST01_PRINTING_IMAGE_PINNED_INPUTS)) {
    throw new Error("Pinned evidence file hashes do not match the readiness contract");
  }
  return {
    bodies,
    hashes,
    promotionPlan: JSON.parse(bodies.promotion_plan),
    sourceReadback: JSON.parse(bodies.source_readback),
    storageRows: jsonLines(bodies.storage_readback_rows),
    canonicalReadback: JSON.parse(bodies.canonical_post_apply_readback),
  };
}

function clientOptions(connectionString) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    application_name: "one-piece-st01-printing-image-readiness-v1",
  };
}

async function roleVisibility(client, role) {
  await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
  const result = await client.query(
    "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
  );
  return result.rows[0]?.visible === true;
}

export async function captureOnePieceSt01PrintingImageSnapshotV1(
  connectionString,
  evidencePlan,
) {
  const client = new Client(clientOptions(connectionString));
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    transactionOpen = true;
    const rows = evidencePlan.rows;
    const parentIds = rows.map((row) => row.parent_card_print_id);
    const productIds = rows.map((row) => row.source_product_id);
    const normalRows = rows.filter((row) =>
      row.child_printing_readiness.proposed_row !== null);
    const childIds = normalRows.map((row) =>
      row.child_printing_readiness.proposed_row.id);
    const printingGvIds = normalRows.map((row) =>
      row.child_printing_readiness.proposed_row.printing_gv_id);
    const printingMappingIds = normalRows.map((row) =>
      row.child_printing_readiness.proposed_external_printing_mapping.id);
    const imagePaths = rows.map((row) =>
      row.parent_artwork_pointer_readiness.proposed_values.image_path);

    const columnRows = (await client.query(`select table_name, column_name
      from information_schema.columns
      where table_schema='public'
        and table_name=any($1::text[])
      order by table_name, ordinal_position`, [[
      "card_prints", "card_printings", "external_printing_mappings",
    ]])).rows;
    const schema = Object.fromEntries([
      "card_prints", "card_printings", "external_printing_mappings",
    ].map((table) => [table, columnRows.filter((row) =>
      row.table_name === table).map((row) => row.column_name)]));

    const finishKeys = (await client.query(`select key, label, sort_order,
      is_active, meta from public.finish_keys where key=any($1::text[])
      order by key`, [["normal", "foil", "holo"]])).rows;
    const parents = (await client.query(`select id::text, gv_id, name, number,
      image_source, image_path, image_url, image_alt_url, image_status,
      image_note, data_quality_flags
      from public.card_prints where id=any($1::uuid[]) order by number`,
    [parentIds])).rows;
    const parentMappings = (await client.query(`select card_print_id::text,
      source, external_id, active, meta from public.external_mappings
      where source='tcgplayer' and external_id=any($1::text[])
      order by external_id`, [productIds.map(String)])).rows;
    const existingChildren = (await client.query(`select id::text,
      card_print_id::text, finish_key, printing_gv_id, image_source, image_path,
      image_url, image_alt_url, image_status, image_note, is_provisional,
      provenance_source, provenance_ref, created_by
      from public.card_printings where card_print_id=any($1::uuid[])
      order by card_print_id, finish_key`, [parentIds])).rows;
    const existingPrintingMappings = (await client.query(`select
      mapping.id::text, mapping.card_printing_id::text, mapping.source,
      mapping.external_id, mapping.active, mapping.meta
      from public.external_printing_mappings mapping
      left join public.card_printings child on child.id=mapping.card_printing_id
      where child.card_print_id=any($1::uuid[])
         or (mapping.source='tcgplayer' and mapping.external_id=any($2::text[]))
      order by mapping.source, mapping.external_id`,
    [parentIds, productIds.map(String)])).rows;
    const sourcePriceLanes = (await client.query(`with latest as (
        select product_id, max(observed_on) as observed_on
        from public.tcgcsv_source_price_daily_observations
        where category_id=68 and product_id=any($1::integer[])
        group by product_id
      )
      select price.product_id::integer as source_product_id,
        price.source_price_row_identity, price.subtype_name_normalized,
        price.observed_on::text,
        coalesce(price.market_price > 0, false) as positive_market_signal
      from public.tcgcsv_source_price_daily_observations price
      join latest on latest.product_id=price.product_id
        and latest.observed_on=price.observed_on
      where price.category_id=68
      order by price.product_id, price.source_price_row_identity`,
    [productIds])).rows;
    const collisions = (await client.query(`select
      (select count(*)::int from public.card_printings
        where id=any($1::uuid[])) as child_id,
      (select count(*)::int from public.card_printings
        where printing_gv_id=any($2::text[])) as printing_gv_id,
      (select count(*)::int from public.card_printings
        where card_print_id=any($3::uuid[]) and finish_key='normal') as parent_finish,
      (select count(*)::int from public.external_printing_mappings
        where id=any($4::uuid[])) as printing_mapping_id,
      (select count(*)::int from public.external_printing_mappings
        where source='tcgplayer' and external_id=any($5::text[]))
        as printing_mapping_source,
      ((select count(*)::int from public.card_prints where image_path=any($6::text[])) +
       (select count(*)::int from public.card_printings where image_path=any($6::text[])))
        as image_path_reference`, [childIds, printingGvIds,
      normalRows.map((row) => row.parent_card_print_id), printingMappingIds,
      normalRows.map((row) => String(row.source_product_id)), imagePaths])).rows[0];
    const releaseStatus = (await client.query(`select release_status,
      release_version from public.catalog_game_release_controls
      where game_code='one_piece'`)).rows[0] ?? null;
    const release = {
      ...releaseStatus,
      anon_visible: await roleVisibility(client, "anon"),
      authenticated_visible: await roleVisibility(client, "authenticated"),
      service_visible: await roleVisibility(client, "service_role"),
    };
    const blockingPids = (await client.query(
      "select unnest(pg_blocking_pids(pg_backend_pid()))::integer as pid"))
      .rows.map((row) => Number(row.pid));
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0]?.transaction_read_only === "on";
    await client.query("rollback");
    transactionOpen = false;
    return {
      schema,
      finish_keys: finishKeys,
      parents,
      parent_mappings: parentMappings,
      existing_children: existingChildren,
      existing_printing_mappings: existingPrintingMappings,
      source_price_lanes: sourcePriceLanes,
      collisions,
      release,
      blocking_pids: blockingPids,
      transaction_read_only: transactionReadOnly,
    };
  } finally {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

function report(summary, rows) {
  const rowLines = rows.map((row) =>
    `| ${row.card_number} | ${row.name.replaceAll("|", "\\|")} | ` +
    `${row.source_finish_evidence.subtype_name_normalized} | ` +
    `${row.child_printing_readiness.status} | ` +
    `${row.parent_artwork_pointer_readiness.status} |`);
  return `# One Piece ST-01 Printing And Image Readiness V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Readiness fingerprint: \`${summary.readiness_fingerprint_sha256}\`\n` +
    `- Parent artwork pointers ready: \`${summary.counts.parent_artwork_pointers_ready}\`\n` +
    `- Normal child printings ready: \`${summary.counts.normal_child_printings_ready}\`\n` +
    `- Foil children blocked by taxonomy: \`${summary.counts.foil_children_blocked_by_taxonomy}\`\n` +
    `- Child image pointers ready: \`0\`\n` +
    `- Database writes: \`0\`\n` +
    `- Storage writes: \`0\`\n` +
    `- Findings: \`${summary.findings.length}\`\n\n` +
    `## Evidence Decision\n\n` +
    `The TCGPlayer source price lane proves each product's source finish subtype. ` +
    `The official Bandai image proves parent artwork identity only. The global ` +
    `\`foil\` finish key is currently scoped to MTG, so the three One Piece foil ` +
    `rows remain blocked rather than being translated to \`holo\`.\n\n` +
    `| Card | Name | Source finish | Child printing | Parent artwork pointer |\n` +
    `| --- | --- | --- | --- | --- |\n${rowLines.join("\n")}\n\n` +
    `## Boundaries\n\nNo database, Storage, pointer, pricing, publication, ` +
    `Vault, or visibility writes occurred. No child image is claimed from the ` +
    `shared parent artwork evidence.\n`;
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
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean readiness producer");
  }
  const inputs = await loadInputs();
  const evidencePlan = buildOnePieceSt01PrintingImageEvidenceV1({
    repository,
    inputHashes: inputs.hashes,
    promotionPlan: inputs.promotionPlan,
    sourceReadback: inputs.sourceReadback,
    storageRows: inputs.storageRows,
    canonicalReadback: inputs.canonicalReadback,
  });
  const runPlan = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    selected_parent_card_print_ids:
      evidencePlan.rows.map((row) => row.parent_card_print_id),
    selected_source_product_ids:
      evidencePlan.rows.map((row) => row.source_product_id),
    evidence_plan_fingerprint_sha256:
      evidencePlan.evidence_plan_fingerprint_sha256,
    mode: "production_read_only",
    boundaries: evidencePlan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const snapshot = await captureOnePieceSt01PrintingImageSnapshotV1(
    connectionString,
    evidencePlan,
  );
  const evaluation = evaluateOnePieceSt01PrintingImageReadinessV1({
    evidencePlan,
    snapshot,
  });
  const fingerprint = buildOnePieceSt01PrintingImageReadinessFingerprintV1({
    producerCommitSha: repository.commit_sha,
    evidencePlanFingerprint: evidencePlan.evidence_plan_fingerprint_sha256,
    snapshot,
    evaluation,
  });
  const status = evaluation.valid
    ? "pass_with_expected_finish_taxonomy_blockers"
    : "blocked_unexpected_readiness_findings";
  const summary = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    recorded_at: new Date().toISOString(),
    status,
    repository,
    evidence_plan_fingerprint_sha256:
      evidencePlan.evidence_plan_fingerprint_sha256,
    readiness_fingerprint_sha256: fingerprint,
    counts: evaluation.counts,
    findings: evaluation.findings,
    next_gate: evaluation.valid
      ? "separately_authorized_guarded_plan_for_17_parent_artwork_pointers_and_14_normal_children"
      : "repair_unexpected_readiness_findings_without_writes",
    boundaries: evidencePlan.boundaries,
  };
  const evidenceBody = await writeJson(path.join(args.outDir, "evidence_plan.json"),
    evidencePlan);
  const snapshotBody = await writeJson(path.join(args.outDir, "production_readback.json"),
    snapshot);
  const rowsBody = evaluation.rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  await fs.writeFile(path.join(args.outDir, "readiness_rows.jsonl"), rowsBody, "utf8");
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = report(summary, evaluation.rows);
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  const artifactBodies = {
    "run_plan.json": runPlanBody,
    "evidence_plan.json": evidenceBody,
    "production_readback.json": snapshotBody,
    "readiness_rows.jsonl": rowsBody,
    "summary.json": summaryBody,
    "REPORT.md": reportBody,
  };
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifactBodies).map(([artifactPath, body]) => ({
      path: artifactPath,
      sha256: sha256(body),
    })),
    bound_inputs: Object.entries(INPUT_PATHS).map(([key, file]) => ({
      key,
      path: path.relative(ROOT, file).replaceAll("\\", "/"),
      sha256: inputs.hashes[`${key}_sha256`],
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status,
    readiness_fingerprint_sha256: fingerprint,
    counts: evaluation.counts,
    findings: evaluation.findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (!evaluation.valid) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { DEFAULT_OUT, parseArgs };
