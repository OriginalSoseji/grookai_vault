import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildOnePieceCardImagePointerPlanV1,
  evaluateOnePieceCardImagePointerStateV1,
  validateOnePieceCardImagePointerPlanV1,
} from "../../backend/pricing/one_piece_card_image_pointer_v1.mjs";
import {
  hashOnePieceCardImageV1,
  validateOnePieceCardImageSourcePlanV1,
  validateOnePieceCardImagePointersV1,
} from "../../backend/pricing/one_piece_card_image_self_host_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_card_image_pointer_v1");
const IMAGE_AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_card_image_self_host_v1");
const SOURCE_PLAN_PATH = path.join(IMAGE_AUDIT_ROOT, "source_plan_v1",
  "source_plan.json.gz");
const ASSET_MANIFEST_PATH = path.join(IMAGE_AUDIT_ROOT, "storage_upload_v1",
  "asset_manifest.json.gz");
const POINTER_PLAN_PATH = path.join(AUDIT_ROOT, "pointer_plan_v1",
  "pointer_plan.json.gz");
const MODE_DIRECTORIES = Object.freeze({ plan: "pointer_plan_v1",
  canary: "pointer_canary_v1", apply: "pointer_apply_v1",
  verify: "pointer_readback_v1" });

const git = (...args) => execFileSync("git", args,
  { cwd: ROOT, encoding: "utf8" }).trim();

function parseArgs(argv) {
  const args = { mode: "", expectedHeadSha: "", expectedPlanFingerprint: "",
    expectedPayloadFingerprint: "", envFile: "C:\\grookai_vault\\.env.local",
    outDir: "" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) args.mode = argument.slice(7);
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-plan-fingerprint=")) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = argument.slice(31).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!Object.hasOwn(MODE_DIRECTORIES, args.mode)) {
    throw new Error("--mode=plan|canary|apply|verify is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("Exact producer SHA is required");
  }
  if (args.mode !== "plan" &&
      (!/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint) ||
       !/^[0-9a-f]{64}$/.test(args.expectedPayloadFingerprint))) {
    throw new Error("Exact pointer plan and payload fingerprints are required");
  }
  args.outDir ||= path.join(AUDIT_ROOT, MODE_DIRECTORIES[args.mode]);
  return args;
}

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== BRANCH || result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean pointer producer");
  }
  return result;
}

function options(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 240_000,
    statement_timeout: 240_000, application_name: name };
}

async function writeArtifacts(dir, files, producer) {
  await fs.mkdir(dir, { recursive: true });
  const artifacts = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value) ? value : Buffer.from(name.endsWith(".json")
      ? `${JSON.stringify(value, null, 2)}\n` : String(value));
    await fs.writeFile(path.join(dir, name), body);
    artifacts[name] = { bytes: body.length,
      sha256: hashOnePieceCardImageV1(body) };
  }
  await fs.writeFile(path.join(dir, "artifact_hashes.json"),
    `${JSON.stringify({ hash_algorithm: "sha256",
      producer_commit_sha: producer, artifacts }, null, 2)}\n`);
}

async function loadImageInputs() {
  const [sourceBody, manifestBody] = await Promise.all([
    fs.readFile(SOURCE_PLAN_PATH), fs.readFile(ASSET_MANIFEST_PATH),
  ]);
  const sourcePlan = JSON.parse(gunzipSync(sourceBody));
  const assetManifest = JSON.parse(gunzipSync(manifestBody));
  const findings = validateOnePieceCardImageSourcePlanV1(sourcePlan).findings;
  if (!validateOnePieceCardImagePointersV1(assetManifest.pointers,
      assetManifest.counts?.image_pointers).valid ||
      assetManifest.counts?.catalog_rows !== sourcePlan.items.length ||
      assetManifest.counts?.image_pointers +
        assetManifest.counts?.coverage_gaps !== sourcePlan.items.length ||
      assetManifest.pointer_payload_fingerprint_sha256 !==
        hashOnePieceCardImageV1(assetManifest.pointers)) {
    findings.push("asset_manifest_invalid");
  }
  if (findings.length) throw new Error([...new Set(findings)].join(","));
  return { sourcePlan, assetManifest,
    sourcePlanSha256: hashOnePieceCardImageV1(sourceBody),
    assetManifestSha256: hashOnePieceCardImageV1(manifestBody) };
}

async function captureRows(client, ids, lock = false) {
  return (await client.query(`select cp.id::text,cp.gv_id,g.code game_code,
    mapping.external_id source_product_id,cp.image_url,cp.image_alt_url,
    cp.image_source,cp.image_hash,cp.image_status,cp.image_res,
    cp.image_last_checked_at,cp.image_path,cp.image_note,
    cp.representative_image_url
    from public.card_prints cp
    join public.games g on g.id=cp.game_id
    join public.external_mappings mapping on mapping.card_print_id=cp.id
      and mapping.source='tcgplayer'
    where cp.id=any($1::uuid[])
    order by cp.id ${lock ? "for update of cp" : ""}`, [ids])).rows;
}

async function boundarySnapshot(client) {
  return (await client.query(`select count(*)::int row_count,
    count(*) filter(where cp.image_url is not null)::int image_url_count,
    count(*) filter(where cp.image_path is not null)::int image_path_count,
    md5(coalesce(string_agg(cp.id::text||'|'||
      coalesce(cp.image_url,'')||'|'||coalesce(cp.image_path,'')||'|'||
      coalesce(cp.image_hash,'')||'|'||coalesce(cp.image_source,'')||'|'||
      coalesce(cp.image_status,'')||'|'||coalesce(cp.image_note,''),
      E'\n' order by cp.id),'')) image_fingerprint
    from public.card_prints cp join public.games g on g.id=cp.game_id
    where g.code<>'one_piece'`)).rows[0];
}

async function readDatabase(connectionString, ids, name) {
  const client = new Client(options(connectionString, name));
  await client.connect();
  try {
    await client.query("begin read only");
    const [rows, boundary] = await Promise.all([
      captureRows(client, ids), boundarySnapshot(client),
    ]);
    await client.query("commit");
    return { rows, boundary };
  } finally { await client.end(); }
}

async function loadPointerPlan(inputs, args) {
  const plan = JSON.parse(gunzipSync(await fs.readFile(POINTER_PLAN_PATH)));
  const validation = validateOnePieceCardImagePointerPlanV1(plan,
    inputs.sourcePlan, inputs.assetManifest);
  if (!validation.valid || plan.pointer_plan_fingerprint_sha256 !==
      args.expectedPlanFingerprint ||
      plan.pointer_payload_fingerprint_sha256 !==
        args.expectedPayloadFingerprint) {
    throw new Error(`Pointer plan binding failed:${validation.findings}`);
  }
  return plan;
}

function selectedCanaryRows(plan) {
  const official = plan.rows.find((row) =>
    row.evidence_role === "existing_official_self_hosted_image");
  const tcgplayer = plan.rows.filter((row) =>
    row.evidence_role === "exact_tcgplayer_product_image");
  const step = Math.max(1, Math.floor(tcgplayer.length / 24));
  const selected = [official, ...tcgplayer.filter((_, index) =>
    index % step === 0)].filter(Boolean).slice(0, 25);
  if (selected.length !== 25) throw new Error("Pointer canary scope mismatch");
  return selected;
}

async function updatePointers(client, rows) {
  await client.query(`create temp table op_image_pointer_payload_v1
    (id uuid primary key,image_url text,image_alt_url text,image_source text,
     image_hash text,image_status text,image_res jsonb,
     image_last_checked_at timestamptz,image_path text,image_note text)
    on commit drop`);
  await client.query(`insert into op_image_pointer_payload_v1
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,image_url text,
      image_alt_url text,image_source text,image_hash text,image_status text,
      image_res jsonb,image_last_checked_at timestamptz,image_path text,
      image_note text)`, [JSON.stringify(rows.map((row) => ({
        id: row.card_print_id, ...row.after })))]);
  return (await client.query(`update public.card_prints cp set
    image_url=p.image_url,image_alt_url=p.image_alt_url,
    image_source=p.image_source,image_hash=p.image_hash,
    image_status=p.image_status,image_res=p.image_res,
    image_last_checked_at=p.image_last_checked_at,image_path=p.image_path,
    image_note=p.image_note
    from op_image_pointer_payload_v1 p where cp.id=p.id
    returning cp.id::text`, [])).rows;
}

async function executeMutation(connectionString, plan, mode) {
  const selected = mode === "canary" ? selectedCanaryRows(plan) : plan.rows;
  const selectedPlan = { ...plan, rows: selected };
  const allIds = [...plan.rows, ...plan.gap_rows].map((row) => row.card_print_id);
  const client = new Client(options(connectionString,
    `one-piece-image-pointer-${mode}-v1`));
  await client.connect();
  let open = false;
  try {
    await client.query("begin");
    open = true;
    await client.query("set local lock_timeout='20s'");
    await client.query("set local statement_timeout='240s'");
    const before = await captureRows(client, allIds, true);
    const beforeFindings = evaluateOnePieceCardImagePointerStateV1(
      plan, before, "before");
    if (beforeFindings.length) throw new Error(beforeFindings.join(","));
    const updated = await updatePointers(client, selected);
    if (updated.length !== selected.length) throw new Error("update_count_mismatch");
    const after = await captureRows(client, allIds);
    const afterFindings = evaluateOnePieceCardImagePointerStateV1(
      selectedPlan, after, "after");
    if (afterFindings.length) throw new Error(afterFindings.join(","));
    if (mode === "canary") await client.query("rollback");
    else await client.query("commit");
    open = false;
    return { selected: selected.length, updated: updated.length,
      transaction_readback: selected.length, committed: mode === "apply" };
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    throw error;
  } finally { await client.end(); }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  dotenv.config({ path: args.envFile, quiet: true });
  if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL required");
  const inputs = await loadImageInputs();
  const ids = inputs.sourcePlan.items.map((row) => row.card_print_id);
  if (args.mode === "plan") {
    const current = await readDatabase(process.env.SUPABASE_DB_URL, ids,
      "one-piece-image-pointer-plan-v1");
    const plan = buildOnePieceCardImagePointerPlanV1({ ...inputs,
      currentRows: current.rows, pointerTimestamp: new Date().toISOString(),
      producerCommit: repo.commit_sha, boundarySnapshot: current.boundary });
    const validation = validateOnePieceCardImagePointerPlanV1(plan,
      inputs.sourcePlan, inputs.assetManifest);
    if (!validation.valid) throw new Error(validation.findings.join(","));
    const compressed = gzipSync(Buffer.from(`${JSON.stringify(plan)}\n`));
    const summary = { status: "pointer_plan_frozen_read_only", repository: repo,
      pointer_plan_fingerprint_sha256:
        plan.pointer_plan_fingerprint_sha256,
      pointer_payload_fingerprint_sha256:
        plan.pointer_payload_fingerprint_sha256,
      pointer_rows: plan.rows.length, coverage_gaps: plan.gap_rows.length,
      findings: [], database_writes: 0 };
    await writeArtifacts(args.outDir, { "pointer_plan.json.gz": compressed,
      "summary.json": summary, "REPORT.md":
        `# One Piece Card Image Pointer Plan V1\n\n- Status: \`${summary.status}\`\n- Exact pointer rows: \`${summary.pointer_rows}\`\n- Preserved coverage gaps: \`${summary.coverage_gaps}\`\n` }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  const plan = await loadPointerPlan(inputs, args);
  let mutation = null;
  if (args.mode === "canary" || args.mode === "apply") {
    mutation = await executeMutation(process.env.SUPABASE_DB_URL, plan,
      args.mode);
  }
  const current = await readDatabase(process.env.SUPABASE_DB_URL, ids,
    `one-piece-image-pointer-${args.mode}-readback-v1`);
  const expectedPhase = args.mode === "apply" || args.mode === "verify"
    ? "after" : "before";
  const findings = evaluateOnePieceCardImagePointerStateV1(plan,
    current.rows, expectedPhase);
  if (hashOnePieceCardImageV1(current.boundary) !==
      hashOnePieceCardImageV1(plan.boundary_snapshot)) {
    findings.push("non_one_piece_boundary_changed");
  }
  const status = findings.length ? `pointer_${args.mode}_failed`
    : args.mode === "canary" ? "pointer_canary_passed_zero_residue"
      : args.mode === "apply" ? "pointer_apply_committed_and_verified"
        : "independent_pointer_readback_passed";
  const summary = { status, repository: repo,
    pointer_plan_fingerprint_sha256: plan.pointer_plan_fingerprint_sha256,
    pointer_payload_fingerprint_sha256:
      plan.pointer_payload_fingerprint_sha256,
    pointer_rows: plan.rows.length, coverage_gaps: plan.gap_rows.length,
    mutation, readback_rows: current.rows.length, findings,
    database_writes: args.mode === "apply" ? plan.rows.length : 0,
    committed: args.mode === "apply" && findings.length === 0 };
  await writeArtifacts(args.outDir, { "summary.json": summary, "REPORT.md":
    `# One Piece Card Image Pointer ${args.mode} V1\n\n- Status: \`${status}\`\n- Pointer rows: \`${plan.rows.length}\`\n- Coverage gaps unchanged: \`${plan.gap_rows.length}\`\n` }, repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (findings.length) throw new Error(findings.join(","));
}

await main();
