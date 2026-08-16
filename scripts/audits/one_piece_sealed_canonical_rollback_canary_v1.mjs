import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_CANONICAL_CANARY_VERSION,
  evaluateOnePieceSealedCanonicalCanaryV1,
  hashOnePieceSealedCanonicalCanaryV1,
  selectOnePieceSealedCanonicalCanaryV1,
  stableJsonOnePieceSealedCanonicalCanaryV1,
} from "../../backend/pricing/one_piece_sealed_canonical_canary_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing");
const PLAN_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_online_evidence_resolution_v1", "frozen_live_resolution_v1",
  "canonical_plan.json.gz");
const PREFLIGHT_SUMMARY_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_preflight_v1", "production_read_only_v1",
  "summary.json");
const DEFAULT_OUT_DIR = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_rollback_canary_v1", "production_rollback_v1");

function parseArgs(argv) {
  const args = { expectedHeadSha: "", expectedPreflightFingerprint: "",
    envFile: "C:\\grookai_vault\\.env.local", outDir: DEFAULT_OUT_DIR };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--expected-preflight-fingerprint=")) {
      args.expectedPreflightFingerprint = arg.slice(33).trim().toLowerCase();
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice(11));
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPreflightFingerprint)) {
    throw new Error("Exact producer SHA and preflight fingerprint are required");
  }
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
    throw new Error("Repository is not the exact clean rollback-canary producer");
  }
  return result;
}

function options(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: name };
}

function numberFields(row, keys) {
  const result = { ...row };
  for (const key of keys) if (result[key] !== null && result[key] !== undefined) {
    result[key] = Number(result[key]);
  }
  return result;
}

async function baseline(client) {
  return numberFields((await client.query(`select
    (select count(*) from public.sealed_product_families) as sealed_product_families,
    (select count(*) from public.sealed_product_variants) as sealed_product_variants,
    (select count(*) from public.sealed_product_candidates) as sealed_product_candidates,
    (select count(*) from public.sealed_product_candidate_reviews) as sealed_product_candidate_reviews,
    (select count(*) from public.sealed_product_source_mappings) as sealed_product_source_mappings,
    (select count(*) from public.sealed_product_variant_evidence) as sealed_product_variant_evidence,
    (select count(*) from public.card_prints) as card_prints,
    (select count(*) from public.card_printings) as card_printings,
    (select count(*) from public.external_mappings) as external_mappings,
    (select count(*) from public.vault_item_instances) as vault_item_instances,
    (select count(*) from public.market_price_current_publication) as market_price_current_publication`))
    .rows[0], ["sealed_product_families", "sealed_product_variants",
      "sealed_product_candidates", "sealed_product_candidate_reviews",
      "sealed_product_source_mappings", "sealed_product_variant_evidence",
      "card_prints", "card_printings", "external_mappings",
      "vault_item_instances", "market_price_current_publication"]);
}

async function remainingRows(client, sample) {
  const result = await client.query(`select
    (select count(*) from public.sealed_product_families where id=any($1::uuid[]))+
    (select count(*) from public.sealed_product_variants where id=any($2::uuid[]))+
    (select count(*) from public.sealed_product_candidate_reviews where id=any($3::uuid[]))+
    (select count(*) from public.sealed_product_source_mappings where id=any($4::uuid[]))+
    (select count(*) from public.sealed_product_variant_evidence where id=any($5::uuid[]))
      as count`, [sample.families.map((row) => row.id),
    sample.variants.map((row) => row.id),
    sample.automated_reviews.map((row) => row.id),
    sample.source_mappings.map((row) => row.id),
    sample.variant_evidence.map((row) => row.id)]);
  return Number(result.rows[0].count);
}

async function insertSample(client, sample) {
  await client.query(`insert into public.sealed_product_families
    (id,identity_contract_version,game_key,family_key,canonical_name,
     manufacturer_name,product_line_key,identity_fingerprint)
    select id,identity_contract_version,game_key,family_key,canonical_name,
      manufacturer_name,product_line_key,identity_fingerprint
    from jsonb_to_recordset($1::jsonb) as x(id uuid,
      identity_contract_version text,game_key text,family_key text,
      canonical_name text,manufacturer_name text,product_line_key text,
      identity_fingerprint text)`, [JSON.stringify(sample.families)]);
  await client.query(`insert into public.sealed_product_variants
    (id,family_id,identity_contract_version,variant_key,canonical_name,
     package_form,language_code,region_code,edition,wave,explicit_contents,
     manufacturer_sku,upc,release_date,identity_fingerprint)
    select id,family_id,identity_contract_version,variant_key,canonical_name,
      package_form,language_code,region_code,edition,wave,explicit_contents,
      manufacturer_sku,upc,release_date,identity_fingerprint
    from jsonb_to_recordset($1::jsonb) as x(id uuid,family_id uuid,
      identity_contract_version text,family_identity_fingerprint text,
      variant_key text,canonical_name text,package_form text,language_code text,
      region_code text,edition text,wave text,explicit_contents jsonb,
      manufacturer_sku text,upc text,release_date date,
      identity_fingerprint text)`, [JSON.stringify(sample.variants)]);
  await client.query(`insert into public.sealed_product_candidate_reviews
    (id,candidate_id,decision,promotion_authorized,reviewed_by,
     decision_evidence,review_contract_version)
    select id,candidate_id,decision,promotion_authorized,reviewed_by,
      decision_evidence,review_contract_version
    from jsonb_to_recordset($1::jsonb) as x(id uuid,candidate_id uuid,
      decision text,promotion_authorized boolean,reviewed_by uuid,
      decision_evidence jsonb,review_contract_version text)`,
  [JSON.stringify(sample.automated_reviews)]);
  await client.query(`insert into public.sealed_product_source_mappings
    (id,variant_id,candidate_id,review_id,candidate_classification,
     review_decision,promotion_authorized,source_provider,source_category_id,
     source_group_id,source_product_id,source_product_name,source_url,
     source_payload_hash,classifier_version,mapping_contract_version,
     mapping_status,mapping_fingerprint)
    select id,variant_id,candidate_id,review_id,candidate_classification,
      review_decision,promotion_authorized,source_provider,source_category_id,
      source_group_id,source_product_id,source_product_name,source_url,
      source_payload_hash,classifier_version,mapping_contract_version,
      mapping_status,mapping_fingerprint
    from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
      candidate_id uuid,review_id uuid,candidate_classification text,
      review_decision text,promotion_authorized boolean,source_provider text,
      source_category_id bigint,source_group_id bigint,source_product_id bigint,
      source_product_name text,source_url text,source_payload_hash text,
      classifier_version text,mapping_contract_version text,
      mapping_status text,mapping_fingerprint text)`,
  [JSON.stringify(sample.source_mappings)]);
  await client.query(`insert into public.sealed_product_variant_evidence
    (id,variant_id,source_mapping_id,evidence_dimension,source_provider,
     source_object_identity,source_field,source_value,normalized_value,
     evidence_strength,confidence,source_payload_hash,observed_at,
     evidence_fingerprint)
    select id,variant_id,source_mapping_id,evidence_dimension,source_provider,
      source_object_identity,source_field,source_value,normalized_value,
      evidence_strength,confidence,source_payload_hash,observed_at,
      evidence_fingerprint
    from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
      source_mapping_id uuid,evidence_dimension text,source_provider text,
      source_object_identity text,source_field text,source_value text,
      normalized_value jsonb,evidence_strength text,confidence numeric,
      source_payload_hash text,observed_at timestamptz,
      evidence_fingerprint text)`, [JSON.stringify(sample.variant_evidence)]);
}

function normalizeSample(sample) {
  const sorted = (rows) => [...rows].sort((left, right) =>
    left.id.localeCompare(right.id));
  return {
    families: sorted(sample.families),
    variants: sorted(sample.variants).map((row) => {
      const { family_identity_fingerprint: ignored, ...stored } = row;
      return stored;
    }),
    automated_reviews: sorted(sample.automated_reviews),
    source_mappings: sorted(sample.source_mappings),
    variant_evidence: sorted(sample.variant_evidence).map((row) => ({ ...row,
      confidence: Number(row.confidence), observed_at: row.observed_at
        ? new Date(row.observed_at).toISOString() : null })),
  };
}

async function readback(client, sample) {
  const families = (await client.query(`select id::text,
    identity_contract_version,game_key,family_key,canonical_name,
    manufacturer_name,product_line_key,identity_fingerprint
    from public.sealed_product_families where id=any($1::uuid[])`,
  [sample.families.map((row) => row.id)])).rows;
  const variants = (await client.query(`select id::text,family_id::text,
    identity_contract_version,variant_key,canonical_name,package_form,
    language_code,region_code,edition,wave,
    explicit_contents,manufacturer_sku,upc,release_date::text,
    identity_fingerprint from public.sealed_product_variants
    where id=any($1::uuid[])`, [sample.variants.map((row) => row.id)])).rows;
  const reviews = (await client.query(`select id::text,candidate_id::text,
    decision,promotion_authorized,reviewed_by::text,decision_evidence,
    review_contract_version from public.sealed_product_candidate_reviews
    where id=any($1::uuid[])`,
  [sample.automated_reviews.map((row) => row.id)])).rows;
  const mappings = (await client.query(`select id::text,variant_id::text,
    candidate_id::text,review_id::text,candidate_classification,review_decision,
    promotion_authorized,source_provider,source_category_id::bigint,
    source_group_id::bigint,source_product_id::bigint,source_product_name,
    source_url,source_payload_hash,classifier_version,mapping_contract_version,
    mapping_status,mapping_fingerprint from public.sealed_product_source_mappings
    where id=any($1::uuid[])`,
  [sample.source_mappings.map((row) => row.id)])).rows.map((row) =>
    numberFields(row, ["source_category_id", "source_group_id",
      "source_product_id"]));
  const evidence = (await client.query(`select id::text,variant_id::text,
    source_mapping_id::text,evidence_dimension,source_provider,
    source_object_identity,source_field,source_value,normalized_value,
    evidence_strength,confidence::float8 as confidence,source_payload_hash,
    observed_at,evidence_fingerprint from public.sealed_product_variant_evidence
    where id=any($1::uuid[])`,
  [sample.variant_evidence.map((row) => row.id)])).rows.map((row) => ({ ...row,
    confidence: Number(row.confidence), observed_at: row.observed_at
      ? new Date(row.observed_at).toISOString() : null }));
  return normalizeSample({ families, variants, automated_reviews: reviews,
    source_mappings: mappings, variant_evidence: evidence });
}

async function attribution(client) {
  return (await client.query(`select relname as table_name,
    n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
    n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
    from pg_stat_xact_user_tables where n_tup_ins<>0 or n_tup_upd<>0
      or n_tup_del<>0 or n_tup_hot_upd<>0 order by relname`)).rows
    .map((row) => numberFields(row,
      ["inserted", "updated", "deleted", "hot_updated"]));
}

async function runRollback(connectionString, selection) {
  const client = new Client(options(connectionString,
    "one-piece-sealed-canonical-rollback-canary-v1"));
  await client.connect();
  let rolledBack = false;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_sealed_canonical_rollback_canary_v1"]);
    const baselineBefore = await baseline(client);
    const priorRows = await remainingRows(client, selection.sample);
    if (priorRows !== 0) throw new Error(`Canary collision count: ${priorRows}`);
    await insertSample(client, selection.sample);
    const actual = await readback(client, selection.sample);
    const expected = normalizeSample(selection.sample);
    const writeAttribution = await attribution(client);
    await client.query("rollback");
    rolledBack = true;
    return { transaction: { committed: false, rolled_back: true },
      baseline_before: baselineBefore, prior_rows: priorRows,
      readback: {
        expected_sha256: hashOnePieceSealedCanonicalCanaryV1(expected),
        actual_sha256: hashOnePieceSealedCanonicalCanaryV1(actual),
        exact: stableJsonOnePieceSealedCanonicalCanaryV1(expected) ===
          stableJsonOnePieceSealedCanonicalCanaryV1(actual),
      },
      write_attribution: writeAttribution };
  } finally {
    if (!rolledBack) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function verifyRollback(connectionString, selection) {
  const client = new Client(options(connectionString,
    "one-piece-sealed-canonical-post-rollback-v1"));
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    const result = { transaction_read_only:
      (await client.query("show transaction_read_only")).rows[0]
        .transaction_read_only === "on",
    remaining_rows: await remainingRows(client, selection.sample),
    baseline: await baseline(client) };
    await client.query("rollback");
    return result;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function writeArtifacts(dir, files) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith(".json")
      ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(dir, name), body);
    hashes[name] = { sha256: hashOnePieceSealedCanonicalCanaryV1(body),
      bytes: body.length };
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", artifacts: hashes,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  dotenv.config({ path: args.envFile });
  const repo = repository(args);
  const [planBuffer, preflightText] = await Promise.all([
    fs.readFile(PLAN_PATH), fs.readFile(PREFLIGHT_SUMMARY_PATH, "utf8")]);
  const plan = JSON.parse(gunzipSync(planBuffer));
  const preflight = JSON.parse(preflightText);
  if (preflight.status !== "production_read_only_preflight_passed" ||
      preflight.preflight_fingerprint_sha256 !==
        args.expectedPreflightFingerprint ||
      preflight.canonical_plan_sha256 !==
        hashOnePieceSealedCanonicalCanaryV1(planBuffer)) {
    throw new Error("Rollback canary is not bound to the exact passing preflight");
  }
  const selection = selectOnePieceSealedCanonicalCanaryV1(plan);
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = { version: ONE_PIECE_SEALED_CANONICAL_CANARY_VERSION,
    recorded_at: new Date().toISOString(), repository: repo,
    resolution_fingerprint_sha256: plan.resolution_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    sample_fingerprint_sha256: selection.sample_fingerprint_sha256,
    sample_counts: Object.fromEntries(Object.entries(selection.sample)
      .map(([key, rows]) => [key, rows.length])),
    package_forms: selection.package_forms,
    boundaries: { rollback_only: true, durable_database_writes: 0,
      storage_writes: 0, pricing_writes: 0, publication_writes: 0 } };
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const proof = await runRollback(connectionString, selection);
  proof.post_rollback = await verifyRollback(connectionString, selection);
  proof.boundaries = { database_durable_writes: 0, storage_writes: 0,
    pricing_writes: 0, publication_writes: 0 };
  const validation = evaluateOnePieceSealedCanonicalCanaryV1({ selection, proof });
  const summary = { ...runPlan, status: validation.valid
    ? "production_rollback_canary_passed_zero_residue"
    : "production_rollback_canary_failed", validation,
  write_attribution: proof.write_attribution,
  post_rollback_remaining_rows: proof.post_rollback.remaining_rows,
  exact_readback: proof.readback.exact,
  exact_next_gate: "freeze the complete insert-only apply plan; durable apply remains separately gated" };
  const report = `# One Piece Sealed Canonical Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Package forms: \`${selection.package_forms.length}/12\`\n` +
    `- Families / variants / reviews / mappings / evidence: \`${runPlan.sample_counts.families} / ${runPlan.sample_counts.variants} / ${runPlan.sample_counts.automated_reviews} / ${runPlan.sample_counts.source_mappings} / ${runPlan.sample_counts.variant_evidence}\`\n` +
    `- Exact transaction readback: \`${proof.readback.exact}\`\n` +
    `- Post-rollback rows: \`${proof.post_rollback.remaining_rows}\`\n` +
    `- Durable database writes: \`0\`\n- Storage/pricing/publication writes: \`0\`\n`;
  await writeArtifacts(args.outDir, { "run_plan.json": runPlan,
    "selection.json": selection, "transaction_proof.json": proof,
    "summary.json": summary, "REPORT.md": report });
  console.log(JSON.stringify(summary, null, 2));
  if (!validation.valid) throw new Error(validation.findings.join(","));
}

await main();
