import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import pg from "pg";

import "../../backend/env.mjs";
import {
  callOperationsRpcV1,
  operationsSha256V1,
} from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  buildTkSmRExactApprovalV1,
  classifyTkSmRReadbackV1,
  tkSmRPersistenceFingerprintV1,
  TK_SM_R_APPLY_ACTION,
  TK_SM_R_APPLY_EXECUTOR_KEY,
  TK_SM_R_APPLY_EXECUTOR_VERSION,
  validateTkSmRApplyReportV1,
  validateTkSmRClaimedCommandV1,
  validateTkSmRFounderApplyManifestV1,
} from "../../backend/operations/tk_sm_r_founder_apply_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(import.meta.dirname, "../..");
const AUDIT_DIR = path.join(
  ROOT, "docs", "audits", "catalog_incremental_promotion", "tk_sm_r_hidden_set_v1",
);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA1_PATTERN = /^[a-f0-9]{40}$/;

function parseArgs(argv) {
  const options = {
    run: false,
    outDir: path.join(AUDIT_DIR, "founder_command_execution"),
  };
  for (const token of argv) {
    if (token === "--run") options.run = true;
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.run) throw new Error("Explicit --run is required");
  return options;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function connectionOptions(connectionString) {
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: "tk_sm_r_founder_command_executor_v1",
    connectionTimeoutMillis: 20_000,
    statement_timeout: 120_000,
    query_timeout: 120_000,
  };
}

async function readExactState(databaseUrl, manifest) {
  const ids = manifest.expected_rows.map((row) => row.card_print_id);
  const client = new Client(connectionOptions(databaseUrl));
  await client.connect();
  try {
    const [result, cardPrints, identities, evidence, familyReviews] = await Promise.all([
      client.query(`
      select
        (select count(*)::int from public.card_prints where id=any($1::uuid[])) as card_prints,
        (select count(*)::int from public.card_print_identity where card_print_id=any($1::uuid[])) as identities,
        (select count(*)::int from public.card_print_identity_source_evidence where card_print_id=any($1::uuid[])) as evidence,
        (select count(*)::int from public.card_print_family_review_queue where card_print_id=any($1::uuid[])) as family_reviews,
        (select count(*)::int from public.card_printings where card_print_id=any($1::uuid[])) as child_printings,
        (select count(*)::int from public.external_mappings where card_print_id=any($1::uuid[])) as mappings,
        (select count(*)::int from public.vault_items where card_id=any($1::uuid[])) as vault_items,
        (select count(*)::int from public.card_prints where id=any($1::uuid[])
          and (image_url is not null or representative_image_url is not null or image_path is not null))
          as image_pointer_rows
      `, [ids]),
      client.query(`
        select id::text, set_id::text, name, number, variant_key, rarity, artist,
          image_url, image_alt_url, image_source, image_status, image_note,
          external_ids, variants, print_identity_key, ai_metadata, data_quality_flags,
          image_res, gv_id, set_code, printed_set_abbrev, printed_total,
          regulation_mark, identity_domain, printed_identity_modifier,
          set_identity_model, representative_image_url
        from public.card_prints where id=any($1::uuid[]) order by id
      `, [ids]),
      client.query(`
        select id::text, card_print_id::text, identity_domain, set_code_identity,
          printed_number, normalized_printed_name, source_name_raw, identity_payload,
          identity_key_version, identity_key_hash, is_active
        from public.card_print_identity where card_print_id=any($1::uuid[]) order by id
      `, [ids]),
      client.query(`
        select id::text, card_print_identity_id::text, card_print_id::text,
          acquisition_key, source_key, evidence_key_hash, evidence_subject,
          evidence_payload, active
        from public.card_print_identity_source_evidence
        where card_print_id=any($1::uuid[]) order by id
      `, [ids]),
      client.query(`
        select id::text, card_print_identity_id::text, card_print_id::text,
          acquisition_key, family_status, family_candidate_source,
          normalized_family_candidate, review_status, family_link_promotion_allowed,
          review_key_hash, evidence_subject, active
        from public.card_print_family_review_queue
        where card_print_id=any($1::uuid[]) order by id
      `, [ids]),
    ]);
    const evidenceCounts = new Map();
    for (const row of evidence.rows) {
      evidenceCounts.set(row.card_print_id, (evidenceCounts.get(row.card_print_id) ?? 0) + 1);
    }
    const rows = cardPrints.rows.map((row) => ({
      card_print_id: row.id,
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      evidence_count: evidenceCounts.get(row.id) ?? 0,
    }));
    const persistenceFingerprint = tkSmRPersistenceFingerprintV1({
      cardPrints: cardPrints.rows,
      identities: identities.rows,
      evidence: evidence.rows,
      familyReviews: familyReviews.rows,
    });
    return classifyTkSmRReadbackV1({
      ...result.rows[0],
      rows,
      persistence_fingerprint_sha256: persistenceFingerprint,
    }, manifest);
  } finally {
    await client.end().catch(() => {});
  }
}

function runApplyWorker({ manifest, headSha, outDir, databaseUrl }) {
  const writerOutDir = path.join(outDir, "writer");
  const args = [
    "scripts/workers/english_pokemon_incremental_promotion_v1.mjs",
    "--mode=apply",
    `--as-of=${new Date().toISOString().slice(0, 10)}`,
    "--source-set-code=tk-sm-r",
    "--database-set-code=tk-sm-r",
    `--master-dir=${path.join(AUDIT_DIR, "master")}`,
    `--source-set-file=${path.join(AUDIT_DIR, "tcgdex_repository_set_snapshot.json")}`,
    "--skip-card-detail-fetch",
    `--expected-head-sha=${headSha}`,
    `--expected-payload-fingerprint=${manifest.payload_fingerprint_sha256}`,
    `--expected-master-package-fingerprint=${manifest.master_package_fingerprint_sha256}`,
    `--expected-source-snapshot-fingerprint=${manifest.source_snapshot_fingerprint_sha256}`,
    `--out-dir=${writerOutDir}`,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_DB_URL: databaseUrl,
      ENGLISH_POKEMON_INCREMENTAL_APPLY_APPROVAL: buildTkSmRExactApprovalV1({ manifest, headSha }),
    },
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`TK-SM-R apply worker failed: ${result.stderr || result.stdout || result.error}`);
  }
  return { writerOutDir, stdout: result.stdout };
}

function normalizeRpcResult(payload) {
  return Array.isArray(payload) ? (payload[0] ?? null) : payload;
}

async function completeCommand({ command, status, preflight, reconciliation, errorSummary = null }) {
  return callOperationsRpcV1({
    supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
    functionName: "operations_complete_command_v1",
    body: {
      p_command_id: command.id,
      p_lease_token: command.lease_token,
      p_status: status,
      p_preflight: preflight,
      p_reconciliation: reconciliation,
      p_error_summary: errorSummary,
    },
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  const expectedCommandId = String(process.env.TK_SM_R_EXPECTED_COMMAND_ID ?? "").trim();
  const expectedSourceCommit = String(process.env.TK_SM_R_EXPECTED_SOURCE_COMMIT ?? "").trim();
  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    throw new Error("PROD_SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_DB_URL are required");
  }
  if (!UUID_PATTERN.test(expectedCommandId)) {
    throw new Error("TK_SM_R_EXPECTED_COMMAND_ID is required and must be a UUID");
  }
  if (!SHA1_PATTERN.test(expectedSourceCommit)) {
    throw new Error("TK_SM_R_EXPECTED_SOURCE_COMMIT is required and must be SHA-1");
  }
  const headSha = git("rev-parse", "HEAD");
  const trackedStatus = git("status", "--short", "--untracked-files=no");
  if (trackedStatus) throw new Error("TK-SM-R executor requires a clean tracked worktree");
  if (headSha !== expectedSourceCommit) {
    throw new Error("TK-SM-R executor checkout does not match the resolved command revision");
  }
  const manifestFile = path.join(AUDIT_DIR, "founder_apply_manifest.json");
  const manifestBytes = await fs.readFile(manifestFile);
  const manifest = validateTkSmRFounderApplyManifestV1(JSON.parse(manifestBytes));
  const executorManifestSha256 = operationsSha256V1(manifestBytes);
  await fs.mkdir(options.outDir, { recursive: true });

  const claimedPayload = await callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_claim_command_action_v1",
    body: {
      p_executor_key: TK_SM_R_APPLY_EXECUTOR_KEY,
      p_action_type: TK_SM_R_APPLY_ACTION,
      p_executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
      p_expected_command_id: expectedCommandId,
      p_source_commit_sha: expectedSourceCommit,
      p_lease_seconds: 1800,
    },
  });
  const command = normalizeRpcResult(claimedPayload);
  if (!command) {
    const report = {
      version: "TK_SM_R_FOUNDER_COMMAND_EXECUTOR_V1",
      status: "no_queued_command",
      source_commit_sha: headSha,
      canonical_writes: false,
    };
    await writeJson(path.join(options.outDir, "summary.json"), report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (command.id !== expectedCommandId) {
    throw new Error("Claimed TK-SM-R command does not match the resolved command ID");
  }

  let preflight = null;
  let reconciliation = { reconciled: false, stage: "claimed" };
  let executionPath = null;
  let durableReconciled = false;
  try {
    preflight = validateTkSmRClaimedCommandV1({
      command,
      manifest,
      executorManifestSha256,
      headSha,
    });
    const initialReadback = await readExactState(databaseUrl, manifest);
    await writeJson(path.join(options.outDir, "initial_readback.json"), initialReadback);
    if (initialReadback.state === "partial_or_conflicting") {
      throw new Error("TK-SM-R production state is partial or conflicting");
    }
    if (initialReadback.exact) {
      executionPath = "existing_exact_readback";
    } else {
      executionPath = "fresh_apply";
      const writer = runApplyWorker({ manifest, headSha, outDir: options.outDir, databaseUrl });
      await fs.writeFile(path.join(options.outDir, "writer_stdout.txt"), writer.stdout, "utf8");
      const writerReport = JSON.parse(await fs.readFile(path.join(writer.writerOutDir, "report.json"), "utf8"));
      validateTkSmRApplyReportV1(writerReport, manifest);
    }
    const finalReadback = await readExactState(databaseUrl, manifest);
    await writeJson(path.join(options.outDir, "final_readback.json"), finalReadback);
    if (!finalReadback.exact) throw new Error("TK-SM-R independent durable readback did not reconcile");
    reconciliation = {
      reconciled: true,
      execution_path: executionPath,
      payload_fingerprint_sha256: manifest.payload_fingerprint_sha256,
      expected_counts: manifest.expected_counts,
      durable_readback: finalReadback,
      forbidden_surface_counts: {
        child_printings: finalReadback.child_printings,
        mappings: finalReadback.mappings,
        vault_items: finalReadback.vault_items,
        image_pointer_rows: finalReadback.image_pointer_rows,
      },
    };
    durableReconciled = true;
    const completion = await completeCommand({
      command,
      status: "succeeded",
      preflight,
      reconciliation,
    });
    const report = {
      version: "TK_SM_R_FOUNDER_COMMAND_EXECUTOR_V1",
      status: "succeeded",
      command_id: command.id,
      source_commit_sha: headSha,
      execution_path: executionPath,
      preflight,
      reconciliation,
      completion,
    };
    await writeJson(path.join(options.outDir, "summary.json"), report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const errorSummary = {
      error_class: error instanceof Error ? error.name : "UnknownError",
      message: String(error?.message ?? error).slice(0, 1000),
      execution_path: executionPath,
    };
    if (preflight?.passed === true && !durableReconciled) {
      await completeCommand({
        command,
        status: "failed",
        preflight,
        reconciliation,
        errorSummary,
      }).catch(() => {});
    }
    await writeJson(path.join(options.outDir, "summary.json"), {
      version: "TK_SM_R_FOUNDER_COMMAND_EXECUTOR_V1",
      status: "failed",
      command_id: command.id,
      source_commit_sha: headSha,
      preflight,
      reconciliation,
      error_summary: errorSummary,
    });
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
