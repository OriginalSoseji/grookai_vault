import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceSt01PrintingImageAttributionV1,
  evaluateOnePieceSt01PrintingImageTransactionReadbackV1,
  evaluateOnePieceSt01PrintingImageZeroResidueV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION,
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_mutation_plan_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
export const CANARY_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_ROLLBACK_CANARY_V1";
export const PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_mutation_plan_v1",
  "identity_source_frozen_plan_v1", "mutation_plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_printing_image_rollback_canary_v1", "production_rollback_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
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

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    application_name: applicationName,
  };
}

async function roleVisibility(client, role) {
  await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
  const result = await client.query(
    "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
  );
  return result.rows[0]?.visible === true;
}

function exactScope(plan) {
  const payload = plan.mutation_payload;
  return {
    parent_ids: payload.parent_pointer_updates.map((row) => row.card_print_id),
    child_ids: payload.normal_child_inserts.map((row) => row.id),
    mapping_ids: payload.external_printing_mapping_inserts.map((row) => row.id),
    external_ids: payload.external_printing_mapping_inserts
      .map((row) => row.external_id),
    foil_parent_ids: payload.foil_taxonomy_blockers
      .map((row) => row.parent_card_print_id),
  };
}

async function captureVisibility(client) {
  const release = (await client.query(`select release_status
    from public.catalog_game_release_controls where game_code='one_piece'`))
    .rows[0] ?? null;
  return {
    release_status: release?.release_status ?? null,
    anon_visible: await roleVisibility(client, "anon"),
    authenticated_visible: await roleVisibility(client, "authenticated"),
    service_visible: await roleVisibility(client, "service_role"),
  };
}

async function readImageConstraints(client) {
  const rows = (await client.query(`select conname,
    pg_get_constraintdef(oid) as definition from pg_constraint
    where conrelid='public.card_prints'::regclass
      and conname=any($1::text[]) order by conname`, [[
    "card_prints_image_source_check",
    "card_prints_image_status_check",
  ]])).rows;
  return Object.fromEntries(rows.map((row) => [row.conname, row.definition]));
}

async function readParentRows(client, parentIds) {
  return (await client.query(`select id::text, gv_id, image_source, image_path,
    image_url, image_alt_url, image_status, image_note, data_quality_flags
    from public.card_prints where id=any($1::uuid[])
    order by array_position($1::uuid[], id)`, [parentIds])).rows;
}

async function readChildRows(client, parentIds) {
  return (await client.query(`select id::text, card_print_id::text,
    printing_gv_id, finish_key, is_provisional, provenance_source,
    provenance_ref, created_by, image_source, image_path, image_url,
    image_alt_url, image_status, image_note
    from public.card_printings where card_print_id=any($1::uuid[])
    order by array_position($1::uuid[], card_print_id), finish_key, id`,
  [parentIds])).rows;
}

async function readMappingRows(client, scope) {
  return (await client.query(`select id::text, card_printing_id::text, source,
    external_id, active, meta from public.external_printing_mappings
    where id=any($1::uuid[])
       or card_printing_id=any($2::uuid[])
       or (source='tcgplayer' and external_id=any($3::text[]))
    order by array_position($1::uuid[], id), source, external_id`,
  [scope.mapping_ids, scope.child_ids, scope.external_ids])).rows;
}

export async function captureOnePieceSt01PrintingImageStateV1(
  connectionString,
  plan,
  applicationName = "one-piece-st01-printing-image-readback-v1",
) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const scope = exactScope(plan);
    const parentRows = await readParentRows(client, scope.parent_ids);
    const childRows = await readChildRows(client, scope.parent_ids);
    const mappingRows = await readMappingRows(client, scope);
    const imageConstraints = await readImageConstraints(client);
    const visibility = await captureVisibility(client);
    const blocking = await client.query(
      "select unnest(pg_blocking_pids(pg_backend_pid()))::integer as pid",
    );
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0]?.transaction_read_only === "on";
    await client.query("rollback");
    open = false;
    return {
      parent_pointer_rows: parentRows,
      child_rows: childRows,
      external_printing_mapping_rows: mappingRows,
      ...visibility,
      image_constraints: imageConstraints,
      blocking_pids: blocking.rows.map((row) => Number(row.pid)),
      transaction_read_only: transactionReadOnly,
    };
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

export function evaluateOnePieceSt01PrintingImageFreshPreflightV1({
  plan,
  readback,
}) {
  const findings = evaluateOnePieceSt01PrintingImageZeroResidueV1({
    plan,
    readback,
  });
  if (readback?.transaction_read_only !== true) {
    findings.push("preflight_not_read_only");
  }
  if ((readback?.blocking_pids ?? []).length !== 0) {
    findings.push("preflight_blocked");
  }
  if (!readback?.image_constraints?.card_prints_image_source_check
    ?.includes("'identity'::text")) {
    findings.push("preflight_identity_image_source_not_allowed");
  }
  if (!readback?.image_constraints?.card_prints_image_status_check
    ?.includes("'exact'::text")) {
    findings.push("preflight_exact_image_status_not_allowed");
  }
  return [...new Set(findings)];
}

async function updateParentPointers(client, plan) {
  const payload = plan.mutation_payload.parent_pointer_updates.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    expected_image_source: row.expected_before.image_source,
    expected_image_path: row.expected_before.image_path,
    expected_image_url: row.expected_before.image_url,
    expected_image_alt_url: row.expected_before.image_alt_url,
    expected_image_status: row.expected_before.image_status,
    expected_image_note: row.expected_before.image_note,
    expected_data_quality_flags: row.expected_before.data_quality_flags,
    image_source: row.proposed_values.image_source,
    image_path: row.proposed_values.image_path,
    image_status: row.proposed_values.image_status,
    image_note: row.proposed_values.image_note,
    data_quality_flags: row.proposed_values.data_quality_flags,
  }));
  return (await client.query(`with payload as (
      select * from jsonb_to_recordset($1::jsonb) as row(
        card_print_id uuid, gv_id text,
        expected_image_source text, expected_image_path text,
        expected_image_url text, expected_image_alt_url text,
        expected_image_status text, expected_image_note text,
        expected_data_quality_flags jsonb, image_source text, image_path text,
        image_status text, image_note text, data_quality_flags jsonb)
    )
    update public.card_prints target set
      image_source=payload.image_source,
      image_path=payload.image_path,
      image_status=payload.image_status,
      image_note=payload.image_note,
      data_quality_flags=payload.data_quality_flags
    from payload
    where target.id=payload.card_print_id and target.gv_id=payload.gv_id
      and target.image_source is not distinct from payload.expected_image_source
      and target.image_path is not distinct from payload.expected_image_path
      and target.image_url is not distinct from payload.expected_image_url
      and target.image_alt_url is not distinct from payload.expected_image_alt_url
      and target.image_status is not distinct from payload.expected_image_status
      and target.image_note is not distinct from payload.expected_image_note
      and target.data_quality_flags=payload.expected_data_quality_flags
    returning target.id::text`, [JSON.stringify(payload)])).rows;
}

async function insertNormalChildren(client, plan) {
  const rows = plan.mutation_payload.normal_child_inserts;
  return (await client.query(`insert into public.card_printings (
      id, card_print_id, printing_gv_id, finish_key, is_provisional,
      provenance_source, provenance_ref, created_by, image_source, image_path,
      image_url, image_alt_url, image_status, image_note)
    select id, card_print_id, printing_gv_id, finish_key, is_provisional,
      provenance_source, provenance_ref, created_by, image_source, image_path,
      image_url, image_alt_url, image_status, image_note
    from jsonb_to_recordset($1::jsonb) as row(
      id uuid, card_print_id uuid, printing_gv_id text, finish_key text,
      is_provisional boolean, provenance_source text, provenance_ref text,
      created_by text, image_source text, image_path text, image_url text,
      image_alt_url text, image_status text, image_note text)
    returning id::text`, [JSON.stringify(rows)])).rows;
}

async function insertPrintingMappings(client, plan) {
  const rows = plan.mutation_payload.external_printing_mapping_inserts;
  return (await client.query(`insert into public.external_printing_mappings (
      id, card_printing_id, source, external_id, active, meta)
    select id, card_printing_id, source, external_id, active, meta
    from jsonb_to_recordset($1::jsonb) as row(
      id uuid, card_printing_id uuid, source text, external_id text,
      active boolean, meta jsonb)
    returning id::text`, [JSON.stringify(rows)])).rows;
}

async function transactionReadback(client, plan) {
  const scope = exactScope(plan);
  const parentRows = await readParentRows(client, scope.parent_ids);
  const normalChildRows = (await client.query(`select id::text,
    card_print_id::text, printing_gv_id, finish_key, is_provisional,
    provenance_source, provenance_ref, created_by, image_source, image_path,
    image_url, image_alt_url, image_status, image_note
    from public.card_printings where id=any($1::uuid[])
    order by array_position($1::uuid[], id)`, [scope.child_ids])).rows;
  const mappingRows = await readMappingRows(client, scope);
  const foilChildRows = await readChildRows(client, scope.foil_parent_ids);
  const visibility = await captureVisibility(client);
  return {
    parent_pointer_rows: parentRows,
    normal_child_rows: normalChildRows,
    external_printing_mapping_rows: mappingRows,
    foil_child_rows: foilChildRows,
    ...visibility,
  };
}

async function attributableWrites(client) {
  return (await client.query(`select relname as table_name,
    coalesce(n_tup_ins,0)::bigint as inserted,
    coalesce(n_tup_upd,0)::bigint as updated,
    coalesce(n_tup_del,0)::bigint as deleted,
    coalesce(n_tup_hot_upd,0)::bigint as hot_updated
    from pg_stat_xact_user_tables where schemaname='public'
      and (coalesce(n_tup_ins,0)<>0 or coalesce(n_tup_upd,0)<>0
        or coalesce(n_tup_del,0)<>0 or coalesce(n_tup_hot_upd,0)<>0)
    order by relname`)).rows;
}

export async function executeOnePieceSt01PrintingImageRollbackCanaryV1(
  connectionString,
  plan,
) {
  const before = await captureOnePieceSt01PrintingImageStateV1(
    connectionString,
    plan,
    "one-piece-st01-printing-image-canary-preflight-v1",
  );
  const beforeFindings =
    evaluateOnePieceSt01PrintingImageFreshPreflightV1({ plan, readback: before });
  let transaction = {
    mutation_counts: {
      parent_pointer_updates: 0,
      normal_child_inserts: 0,
      external_printing_mapping_inserts: 0,
    },
    readback: null,
    attributable_writes: [],
    findings: [...beforeFindings],
    rollback_attempted: false,
    rollback_succeeded: false,
    execution_error: null,
  };
  if (beforeFindings.length === 0) {
    const client = new Client(clientOptions(connectionString,
      "one-piece-st01-printing-image-rollback-canary-v1"));
    await client.connect();
    let open = false;
    try {
      await client.query("begin");
      open = true;
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='120s'");
      await client.query("set local idle_in_transaction_session_timeout='60s'");
      const parentUpdates = await updateParentPointers(client, plan);
      const childInserts = await insertNormalChildren(client, plan);
      const mappingInserts = await insertPrintingMappings(client, plan);
      const readback = await transactionReadback(client, plan);
      const writes = await attributableWrites(client);
      const findings = [
        ...(parentUpdates.length === 17 ? [] : ["parent_update_count_mismatch"]),
        ...(childInserts.length === 14 ? [] : ["child_insert_count_mismatch"]),
        ...(mappingInserts.length === 14 ? [] : ["mapping_insert_count_mismatch"]),
        ...evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
          plan,
          readback,
        }),
        ...evaluateOnePieceSt01PrintingImageAttributionV1(writes),
      ];
      transaction = {
        mutation_counts: {
          parent_pointer_updates: parentUpdates.length,
          normal_child_inserts: childInserts.length,
          external_printing_mapping_inserts: mappingInserts.length,
        },
        readback,
        attributable_writes: writes,
        findings: [...new Set(findings)],
        rollback_attempted: false,
        rollback_succeeded: false,
        execution_error: null,
      };
    } catch (error) {
      transaction.findings = [...new Set([
        ...transaction.findings,
        "transaction_execution_failed",
      ])];
      transaction.execution_error = error.message;
    } finally {
      if (open) {
        transaction.rollback_attempted = true;
        try {
          await client.query("rollback");
          transaction.rollback_succeeded = true;
        } catch (error) {
          transaction.findings = [...new Set([
            ...transaction.findings,
            "transaction_rollback_failed",
          ])];
          transaction.execution_error ??= error.message;
        }
      }
      await client.end();
    }
  }

  const after = await captureOnePieceSt01PrintingImageStateV1(
    connectionString,
    plan,
    "one-piece-st01-printing-image-canary-post-rollback-v1",
  );
  const afterFindings = evaluateOnePieceSt01PrintingImageZeroResidueV1({
    plan,
    readback: after,
  });
  if (after.transaction_read_only !== true) {
    afterFindings.push("post_rollback_readback_not_read_only");
  }
  if (stableJson(before.parent_pointer_rows) !==
      stableJson(after.parent_pointer_rows)) {
    afterFindings.push("parent_baseline_changed_after_rollback");
  }
  return {
    before,
    transaction,
    after,
    findings: [...new Set([...transaction.findings, ...afterFindings])],
  };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
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
    throw new Error("Repository is not the exact clean rollback-canary producer");
  }
  const planBody = await fs.readFile(PLAN_PATH, "utf8");
  const plan = JSON.parse(planBody);
  const validation = validateOnePieceSt01PrintingImageMutationPlanV1(plan);
  if (!validation.valid ||
      plan.version !== ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION) {
    throw new Error(`Frozen mutation plan is invalid: ${validation.findings.join(",")}`);
  }
  const runPlan = {
    version: CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    mutation_plan_sha256: sha256(planBody),
    mutation_plan_fingerprint_sha256:
      plan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      plan.mutation_payload_fingerprint_sha256,
    exact_scope: exactScope(plan),
    mode: "production_rollback_only",
    boundaries: {
      durable_database_writes: 0,
      transaction_rollback_required: true,
      parent_pointer_updates_in_transaction: 17,
      normal_child_inserts_in_transaction: 14,
      printing_mapping_inserts_in_transaction: 14,
      foil_child_writes: 0,
      storage_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_changes: 0,
    },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"),
    runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const proof = await executeOnePieceSt01PrintingImageRollbackCanaryV1(
    connectionString,
    plan,
  );
  const rollbackProofSha256 = sha256(stableJson({
    mutation_plan_fingerprint_sha256:
      plan.mutation_plan_fingerprint_sha256,
    before: proof.before,
    transaction: proof.transaction,
    after: proof.after,
  }));
  const summary = {
    version: CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    status: proof.findings.length === 0 &&
      proof.transaction.rollback_succeeded === true
      ? "rollback_canary_passed_zero_durable_rows"
      : "blocked_with_zero_residue_proof",
    repository,
    mutation_plan_fingerprint_sha256:
      plan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      plan.mutation_payload_fingerprint_sha256,
    rollback_proof_sha256: rollbackProofSha256,
    transaction: proof.transaction,
    findings: proof.findings,
    boundaries: runPlan.boundaries,
  };
  const beforeBody = await writeJson(path.join(args.outDir,
    "protected_before.json"), proof.before);
  const transactionBody = await writeJson(path.join(args.outDir,
    "transaction_proof.json"), proof.transaction);
  const afterBody = await writeJson(path.join(args.outDir,
    "post_rollback_readback.json"), proof.after);
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"),
    summary);
  const reportBody = `# One Piece ST-01 Printing And Image Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer SHA: \`${repository.commit_sha}\`\n` +
    `- Mutation plan fingerprint: \`${plan.mutation_plan_fingerprint_sha256}\`\n` +
    `- Parent pointer updates in transaction: \`17\`\n` +
    `- Normal child and mapping inserts in transaction: \`14 / 14\`\n` +
    `- Foil child writes: \`0\`\n` +
    `- Durable target rows after rollback: \`${proof.findings.some((finding) =>
      finding.startsWith("post_rollback") ||
      finding === "parent_baseline_changed_after_rollback") ? "unproven" : "0"}\`\n` +
    `- One Piece visibility: \`hidden\`\n` +
    `- Storage/pricing/publication/Vault writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  const artifactBodies = {
    "run_plan.json": runPlanBody,
    "protected_before.json": beforeBody,
    "transaction_proof.json": transactionBody,
    "post_rollback_readback.json": afterBody,
    "summary.json": summaryBody,
    "REPORT.md": reportBody,
  };
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifactBodies).map(([artifactPath, body]) => ({
      path: artifactPath,
      sha256: sha256(body),
    })),
    bound_inputs: [{
      path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"),
      sha256: sha256(planBody),
    }],
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    producer_commit_sha: repository.commit_sha,
    rollback_proof_sha256: rollbackProofSha256,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (proof.findings.length) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { DEFAULT_OUT, exactScope };
