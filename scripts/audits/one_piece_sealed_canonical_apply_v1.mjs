import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_CANONICAL_APPLY_VERSION,
  evaluateOnePieceSealedCanonicalPostApplyV1,
  evaluateOnePieceSealedCanonicalPrecommitV1,
  hashOnePieceSealedCanonicalApplyV1,
  normalizeOnePieceSealedCanonicalPayloadV1,
} from "../../backend/pricing/one_piece_sealed_canonical_apply_v1.mjs";
import {
  validateOnePieceSealedCanonicalApplyPlanV1,
} from "../../backend/pricing/one_piece_sealed_canonical_apply_plan_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing");
const CANONICAL_PLAN_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_online_evidence_resolution_v1", "frozen_live_resolution_v1",
  "canonical_plan.json.gz");
const APPLY_PLAN_PATH = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_apply_plan_v1", "frozen_apply_plan_v1",
  "plan.json");
const DEFAULT_APPLY_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_apply_v1", "durable_apply_v1");
const DEFAULT_VERIFY_OUT = path.join(AUDIT_ROOT,
  "one_piece_sealed_canonical_apply_v1", "independent_post_apply_v1");

function parseArgs(argv) {
  const args = { mode: "", expectedHeadSha: "",
    expectedApplyPlanFingerprint: "", expectedPayloadFingerprint: "",
    expectedMutationContractHash: "", expectedFreshPreflightFingerprint: "",
    expectedApplyExecutionFingerprint: "", freshPreflightSummary: "",
    applySummary: path.join(DEFAULT_APPLY_OUT, "summary.json"),
    envFile: "C:\\grookai_vault\\.env.local", outDir: "" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) args.mode = argument.slice(7);
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-apply-plan-fingerprint=")) {
      args.expectedApplyPlanFingerprint = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = argument.slice(31).trim().toLowerCase();
    } else if (argument.startsWith("--expected-mutation-contract-hash=")) {
      args.expectedMutationContractHash = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-fresh-preflight-fingerprint=")) {
      args.expectedFreshPreflightFingerprint =
        argument.slice(39).trim().toLowerCase();
    } else if (argument.startsWith("--expected-apply-execution-fingerprint=")) {
      args.expectedApplyExecutionFingerprint =
        argument.slice(39).trim().toLowerCase();
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
  if (!["apply", "verify"].includes(args.mode)) {
    throw new Error("--mode=apply|verify is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  for (const [label, value] of [
    ["apply-plan", args.expectedApplyPlanFingerprint],
    ["payload", args.expectedPayloadFingerprint],
    ["mutation-contract-hash", args.expectedMutationContractHash],
  ]) {
    if (!/^[0-9a-f]{64}$/.test(value)) {
      throw new Error(`Exact ${label} fingerprint is required`);
    }
  }
  if (args.mode === "apply" &&
      (!args.freshPreflightSummary ||
       !/^[0-9a-f]{64}$/.test(args.expectedFreshPreflightFingerprint))) {
    throw new Error("Apply requires the exact fresh preflight artifact and fingerprint");
  }
  if (args.mode === "verify" &&
      !/^[0-9a-f]{64}$/.test(args.expectedApplyExecutionFingerprint)) {
    throw new Error("Verify requires the exact apply execution fingerprint");
  }
  args.outDir ||= args.mode === "apply" ? DEFAULT_APPLY_OUT : DEFAULT_VERIFY_OUT;
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
    throw new Error("Repository is not the exact clean durable writer producer");
  }
  return result;
}

function clientOptions(connectionString, applicationName) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: applicationName };
}

function numeric(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function baseline(client) {
  return numeric((await client.query(`select
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
    (select count(*) from public.market_price_current_publication) as market_price_current_publication,
    (select count(*) from public.catalog_game_release_controls) as catalog_game_release_controls`))
    .rows[0]);
}

async function visibility(client) {
  const result = { release_status: (await client.query(`select release_status
    from public.catalog_game_release_controls where game_code='one_piece'`))
    .rows[0]?.release_status ?? null };
  for (const role of ["anon", "authenticated"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)",
      [role]);
    result[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return result;
}

async function candidateLineage(client, payload) {
  const expected = payload.source_mappings.map((row) => ({ id: row.candidate_id,
    source_provider: row.source_provider,
    source_category_id: Number(row.source_category_id),
    source_group_id: Number(row.source_group_id),
    source_product_id: Number(row.source_product_id),
    source_product_name: row.source_product_name,
    source_payload_hash: row.source_payload_hash,
    classifier_version: row.classifier_version,
    classification: row.candidate_classification }));
  const rows = (await client.query(`select id::text,source_provider,
    source_category_id::bigint,source_group_id::bigint,source_product_id::bigint,
    source_product_name,source_payload_hash,classifier_version,classification
    from public.sealed_product_candidates where id=any($1::uuid[])`,
  [expected.map((row) => row.id)])).rows.map((row) => ({ ...row,
    source_category_id: Number(row.source_category_id),
    source_group_id: Number(row.source_group_id),
    source_product_id: Number(row.source_product_id) }));
  const found = new Map(rows.map((row) => [row.id, row]));
  const mismatches = expected.filter((row) =>
    JSON.stringify(row) !== JSON.stringify(found.get(row.id) ?? null))
    .map((row) => row.source_product_id);
  return { expected: expected.length, found: rows.length, mismatches };
}

async function collisions(client, payload) {
  const families = JSON.stringify(payload.families);
  const variants = JSON.stringify(payload.variants);
  const mappings = JSON.stringify(payload.source_mappings);
  const evidence = JSON.stringify(payload.variant_evidence);
  const family = numeric((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb)
      as x(id uuid,game_key text,family_key text,identity_fingerprint text))
    select
      (select count(*) from public.sealed_product_families f join proposed p on f.id=p.id) as family_ids,
      (select count(*) from public.sealed_product_families f join proposed p on f.game_key=p.game_key and f.family_key=p.family_key) as family_keys,
      (select count(*) from public.sealed_product_families f join proposed p on f.identity_fingerprint=p.identity_fingerprint) as family_fingerprints`,
  [families])).rows[0]);
  const variant = numeric((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb)
      as x(id uuid,family_id uuid,variant_key text,identity_fingerprint text))
    select
      (select count(*) from public.sealed_product_variants v join proposed p on v.id=p.id) as variant_ids,
      (select count(*) from public.sealed_product_variants v join proposed p on v.family_id=p.family_id and v.variant_key=p.variant_key) as variant_keys,
      (select count(*) from public.sealed_product_variants v join proposed p on v.identity_fingerprint=p.identity_fingerprint) as variant_fingerprints`,
  [variants])).rows[0]);
  const reviewIds = Number((await client.query(`select count(*) from
    public.sealed_product_candidate_reviews where id=any($1::uuid[])`,
  [payload.automated_reviews.map((row) => row.id)])).rows[0].count);
  const mapping = numeric((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,
      source_provider text,source_category_id bigint,source_group_id bigint,
      source_product_id bigint,mapping_fingerprint text))
    select
      (select count(*) from public.sealed_product_source_mappings m join proposed p on m.id=p.id) as mapping_ids,
      (select count(*) from public.sealed_product_source_mappings m join proposed p on m.source_provider=p.source_provider and m.source_category_id=p.source_category_id and m.source_group_id=p.source_group_id and m.source_product_id=p.source_product_id) as mapping_sources,
      (select count(*) from public.sealed_product_source_mappings m join proposed p on m.mapping_fingerprint=p.mapping_fingerprint) as mapping_fingerprints`,
  [mappings])).rows[0]);
  const evidenceResult = numeric((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb)
      as x(id uuid,evidence_fingerprint text))
    select
      (select count(*) from public.sealed_product_variant_evidence e join proposed p on e.id=p.id) as evidence_ids,
      (select count(*) from public.sealed_product_variant_evidence e join proposed p on e.evidence_fingerprint=p.evidence_fingerprint) as evidence_fingerprints`,
  [evidence])).rows[0]);
  return { ...family, ...variant, review_ids: reviewIds, ...mapping,
    ...evidenceResult };
}

async function targetRowCount(client, payload) {
  const row = (await client.query(`select
    (select count(*) from public.sealed_product_families where id=any($1::uuid[]))+
    (select count(*) from public.sealed_product_variants where id=any($2::uuid[]))+
    (select count(*) from public.sealed_product_candidate_reviews where id=any($3::uuid[]))+
    (select count(*) from public.sealed_product_source_mappings where id=any($4::uuid[]))+
    (select count(*) from public.sealed_product_variant_evidence where id=any($5::uuid[])) as count`,
  [payload.families.map((row) => row.id), payload.variants.map((row) => row.id),
    payload.automated_reviews.map((row) => row.id),
    payload.source_mappings.map((row) => row.id),
    payload.variant_evidence.map((row) => row.id)])).rows[0];
  return Number(row.count);
}

async function insertPayload(client, payload) {
  await client.query(`insert into public.sealed_product_families
    (id,identity_contract_version,game_key,family_key,canonical_name,
     manufacturer_name,product_line_key,identity_fingerprint)
    select id,identity_contract_version,game_key,family_key,canonical_name,
      manufacturer_name,product_line_key,identity_fingerprint
    from jsonb_to_recordset($1::jsonb) as x(id uuid,
      identity_contract_version text,game_key text,family_key text,
      canonical_name text,manufacturer_name text,product_line_key text,
      identity_fingerprint text)`, [JSON.stringify(payload.families)]);
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
      identity_fingerprint text)`, [JSON.stringify(payload.variants)]);
  await client.query(`insert into public.sealed_product_candidate_reviews
    (id,candidate_id,decision,promotion_authorized,reviewed_by,
     decision_evidence,review_contract_version)
    select id,candidate_id,decision,promotion_authorized,reviewed_by,
      decision_evidence,review_contract_version
    from jsonb_to_recordset($1::jsonb) as x(id uuid,candidate_id uuid,
      decision text,promotion_authorized boolean,reviewed_by uuid,
      decision_evidence jsonb,review_contract_version text)`,
  [JSON.stringify(payload.automated_reviews)]);
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
  [JSON.stringify(payload.source_mappings)]);
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
      evidence_fingerprint text)`, [JSON.stringify(payload.variant_evidence)]);
}

async function readback(client, payload) {
  const families = (await client.query(`select id::text,
    identity_contract_version,game_key,family_key,canonical_name,
    manufacturer_name,product_line_key,identity_fingerprint
    from public.sealed_product_families where id=any($1::uuid[])`,
  [payload.families.map((row) => row.id)])).rows;
  const variants = (await client.query(`select id::text,family_id::text,
    identity_contract_version,variant_key,canonical_name,package_form,
    language_code,region_code,edition,wave,explicit_contents,manufacturer_sku,
    upc,release_date::text,identity_fingerprint
    from public.sealed_product_variants where id=any($1::uuid[])`,
  [payload.variants.map((row) => row.id)])).rows;
  const reviews = (await client.query(`select id::text,candidate_id::text,
    decision,promotion_authorized,reviewed_by::text,decision_evidence,
    review_contract_version from public.sealed_product_candidate_reviews
    where id=any($1::uuid[])`,
  [payload.automated_reviews.map((row) => row.id)])).rows;
  const mappings = (await client.query(`select id::text,variant_id::text,
    candidate_id::text,review_id::text,candidate_classification,review_decision,
    promotion_authorized,source_provider,source_category_id::bigint,
    source_group_id::bigint,source_product_id::bigint,source_product_name,
    source_url,source_payload_hash,classifier_version,mapping_contract_version,
    mapping_status,mapping_fingerprint from public.sealed_product_source_mappings
    where id=any($1::uuid[])`,
  [payload.source_mappings.map((row) => row.id)])).rows;
  const evidence = (await client.query(`select id::text,variant_id::text,
    source_mapping_id::text,evidence_dimension,source_provider,
    source_object_identity,source_field,source_value,normalized_value,
    evidence_strength,confidence::float8 as confidence,source_payload_hash,
    observed_at,evidence_fingerprint from public.sealed_product_variant_evidence
    where id=any($1::uuid[])`,
  [payload.variant_evidence.map((row) => row.id)])).rows;
  const actual = normalizeOnePieceSealedCanonicalPayloadV1({ families,
    variants, automated_reviews: reviews, source_mappings: mappings,
    variant_evidence: evidence });
  const expected = normalizeOnePieceSealedCanonicalPayloadV1(payload);
  const counts = Object.fromEntries(Object.entries(actual)
    .map(([key, rows]) => [key, rows.length]));
  const expectedSha = hashOnePieceSealedCanonicalApplyV1(expected);
  const actualSha = hashOnePieceSealedCanonicalApplyV1(actual);
  return { counts, expected_sha256: expectedSha, actual_sha256: actualSha,
    exact: expectedSha === actualSha };
}

async function attribution(client) {
  return (await client.query(`select relname as table_name,
    n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
    n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
    from pg_stat_xact_user_tables where schemaname='public' and
      (n_tup_ins<>0 or n_tup_upd<>0 or n_tup_del<>0 or n_tup_hot_upd<>0)
    order by relname`)).rows.map(numeric);
}

async function loadFrozenInputs(args) {
  const [canonicalBody, applyPlanBody] = await Promise.all([
    fs.readFile(CANONICAL_PLAN_PATH), fs.readFile(APPLY_PLAN_PATH)]);
  const canonicalPlan = JSON.parse(gunzipSync(canonicalBody));
  const applyPlan = JSON.parse(applyPlanBody);
  const validation = validateOnePieceSealedCanonicalApplyPlanV1(applyPlan);
  if (!validation.valid ||
      applyPlan.apply_plan_fingerprint_sha256 !==
        args.expectedApplyPlanFingerprint ||
      applyPlan.canonical_payload_fingerprint_sha256 !==
        args.expectedPayloadFingerprint ||
      applyPlan.mutation_contract_sha256 !==
        args.expectedMutationContractHash ||
      applyPlan.canonical_plan_sha256 !==
        hashOnePieceSealedCanonicalApplyV1(canonicalBody) ||
      hashOnePieceSealedCanonicalApplyV1(canonicalPlan.payload) !==
        args.expectedPayloadFingerprint) {
    throw new Error("Frozen apply plan, payload, or mutation contract changed");
  }
  return { canonicalPlan, applyPlan, canonicalBody, applyPlanBody };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function writeArtifacts(dir, files, boundInputs = []) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = [];
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith(".json")
      ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(dir, name), body);
    hashes.push({ path: name, bytes: body.length,
      sha256: hashOnePieceSealedCanonicalApplyV1(body) });
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", artifacts: hashes, bound_inputs: boundInputs,
  });
}

async function captureReadOnlyVerification(connectionString, payload) {
  const client = new Client(clientOptions(connectionString,
    "one-piece-sealed-canonical-independent-verify-v1"));
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const result = { transaction_read_only:
      (await client.query("show transaction_read_only")).rows[0]
        .transaction_read_only === "on",
    readback: await readback(client, payload),
    candidate_lineage: await candidateLineage(client, payload),
    visibility: await visibility(client), baseline: await baseline(client),
    write_attribution: await attribution(client),
    boundaries: { database_writes: 0, storage_writes: 0, pricing_writes: 0,
      release_writes: 0, publication_writes: 0, card_writes: 0,
      vault_writes: 0 } };
    await client.query("rollback");
    open = false;
    return result;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function apply(args, repo, inputs, connectionString) {
  const preflightBody = await fs.readFile(args.freshPreflightSummary);
  const preflight = JSON.parse(preflightBody);
  const collisionTotal = Object.values(preflight.collision_counts ?? {})
    .reduce((sum, value) => sum + Number(value), 0);
  if (preflight.status !== "production_read_only_preflight_passed" ||
      preflight.repository?.commit_sha !== repo.commit_sha ||
      preflight.preflight_fingerprint_sha256 !==
        args.expectedFreshPreflightFingerprint ||
      preflight.canonical_plan_sha256 !==
        inputs.applyPlan.canonical_plan_sha256 || collisionTotal !== 0 ||
      preflight.candidate_lineage?.expected !== 390 ||
      preflight.candidate_lineage?.found !== 390 ||
      (preflight.candidate_lineage?.mismatches ?? []).length !== 0) {
    throw new Error("Fresh zero-collision lineage preflight is not exact");
  }
  const runPlan = { version: ONE_PIECE_SEALED_CANONICAL_APPLY_VERSION,
    recorded_at: new Date().toISOString(), repository: repo, mode: "apply",
    apply_plan_fingerprint_sha256:
      inputs.applyPlan.apply_plan_fingerprint_sha256,
    canonical_payload_fingerprint_sha256:
      inputs.applyPlan.canonical_payload_fingerprint_sha256,
    mutation_contract_sha256: inputs.applyPlan.mutation_contract_sha256,
    fresh_preflight_fingerprint_sha256:
      preflight.preflight_fingerprint_sha256,
    expected_inserts: inputs.applyPlan.mutation_contract.expected_inserts,
    boundaries: { transaction_insert_only: true, updates: 0, deletes: 0,
      candidate_writes: 0, card_writes: 0, storage_writes: 0,
      pricing_writes: 0, release_writes: 0, publication_writes: 0,
      vault_writes: 0, app_visibility_changes: 0 } };
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  const payload = inputs.canonicalPlan.payload;
  const client = new Client(clientOptions(connectionString,
    "one-piece-sealed-canonical-durable-apply-v1"));
  await client.connect();
  let open = false;
  let committed = false;
  let proof = null;
  try {
    await client.query("begin transaction isolation level repeatable read");
    open = true;
    await client.query("set local lock_timeout='30s'");
    await client.query("set local statement_timeout='300s'");
    await client.query("set local idle_in_transaction_session_timeout='300s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_sealed_canonical_durable_apply_v1"]);
    const baselineBefore = await baseline(client);
    const visibilityBefore = await visibility(client);
    const collisionProof = await collisions(client, payload);
    const lineage = await candidateLineage(client, payload);
    const priorTargetRows = await targetRowCount(client, payload);
    if (priorTargetRows !== 0 || Object.values(collisionProof)
      .some((value) => Number(value) !== 0) || lineage.expected !== 390 ||
      lineage.found !== 390 || lineage.mismatches.length !== 0) {
      throw new Error("Transaction-local preflight failed closed");
    }
    await insertPayload(client, payload);
    proof = { transaction: { started: true, committed: false },
      prior_target_rows: priorTargetRows, candidate_lineage: lineage,
      collisions: collisionProof, baseline_before: baselineBefore,
      visibility_before: visibilityBefore,
      readback: await readback(client, payload),
      baseline_after_transaction: await baseline(client),
      visibility_after_transaction: await visibility(client),
      write_attribution: await attribution(client),
      boundaries: { storage_writes: 0, pricing_writes: 0, release_writes: 0,
        publication_writes: 0, card_writes: 0, vault_writes: 0 } };
    const validation = evaluateOnePieceSealedCanonicalPrecommitV1(proof);
    proof.validation = validation;
    if (!validation.valid) throw new Error(validation.findings.join(","));
    await client.query("commit");
    open = false;
    committed = true;
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    await writeJson(path.join(args.outDir, "failure.json"), {
      recorded_at: new Date().toISOString(), committed, error: error.message,
      transaction_proof: proof });
    throw error;
  } finally {
    await client.end();
  }

  const durable = await captureReadOnlyVerification(connectionString, payload);
  const immediate = evaluateOnePieceSealedCanonicalPostApplyV1({
    applySummary: { status: "durable_apply_committed_and_exact_readback_passed",
      committed }, verification: durable });
  if (!immediate.valid) {
    throw new Error(`Immediate durable readback failed: ${immediate.findings.join(",")}`);
  }
  const executionCore = { version: ONE_PIECE_SEALED_CANONICAL_APPLY_VERSION,
    repository: repo,
    apply_plan_fingerprint_sha256:
      inputs.applyPlan.apply_plan_fingerprint_sha256,
    canonical_payload_fingerprint_sha256:
      inputs.applyPlan.canonical_payload_fingerprint_sha256,
    mutation_contract_sha256: inputs.applyPlan.mutation_contract_sha256,
    fresh_preflight_fingerprint_sha256:
      preflight.preflight_fingerprint_sha256,
    committed, transaction_readback: proof.readback,
    write_attribution: proof.write_attribution,
    immediate_durable_readback: durable.readback };
  const executionFingerprint =
    hashOnePieceSealedCanonicalApplyV1(executionCore);
  const summary = { ...executionCore, recorded_at: new Date().toISOString(),
    status: "durable_apply_committed_and_exact_readback_passed",
    apply_execution_fingerprint_sha256: executionFingerprint,
    validation: { precommit: proof.validation, immediate_post_commit: immediate },
    visibility: durable.visibility, candidate_lineage: durable.candidate_lineage,
    boundaries: runPlan.boundaries,
    exact_next_gate: "run the independent read-only verifier in a new process" };
  const report = `# One Piece Sealed Canonical Durable Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer commit: \`${repo.commit_sha}\`\n` +
    `- Families / variants / reviews / mappings / evidence: ` +
    `\`242 / 390 / 390 / 390 / 1731\`\n` +
    `- Exact transaction readback: \`${proof.readback.exact}\`\n` +
    `- One Piece release status: \`${durable.visibility.release_status}\`\n` +
    `- Pricing, publication, cards, Storage, Vault writes: \`0\`\n`;
  await writeArtifacts(args.outDir, { "run_plan.json": runPlan,
    "transaction_proof.json": proof, "immediate_readback.json": durable,
    "summary.json": summary, "REPORT.md": report }, [
    { path: path.relative(ROOT, CANONICAL_PLAN_PATH).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedCanonicalApplyV1(inputs.canonicalBody) },
    { path: path.relative(ROOT, APPLY_PLAN_PATH).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedCanonicalApplyV1(inputs.applyPlanBody) },
    { path: path.relative(ROOT, args.freshPreflightSummary).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedCanonicalApplyV1(preflightBody) },
  ]);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function verify(args, repo, inputs, connectionString) {
  const applySummaryBody = await fs.readFile(args.applySummary);
  const applySummary = JSON.parse(applySummaryBody);
  if (applySummary.apply_execution_fingerprint_sha256 !==
      args.expectedApplyExecutionFingerprint ||
      applySummary.repository?.commit_sha !== repo.commit_sha ||
      applySummary.apply_plan_fingerprint_sha256 !==
        args.expectedApplyPlanFingerprint ||
      applySummary.canonical_payload_fingerprint_sha256 !==
        args.expectedPayloadFingerprint ||
      applySummary.mutation_contract_sha256 !==
        args.expectedMutationContractHash) {
    throw new Error("Independent verifier is not bound to the exact apply");
  }
  const runPlan = { version:
    "ONE_PIECE_SEALED_CANONICAL_INDEPENDENT_POST_APPLY_V1",
  recorded_at: new Date().toISOString(), repository: repo,
  mode: "independent_read_only_post_apply_verification",
  apply_execution_fingerprint_sha256:
    applySummary.apply_execution_fingerprint_sha256,
  database_writes: 0 };
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  const verification = await captureReadOnlyVerification(
    connectionString, inputs.canonicalPlan.payload);
  const validation = evaluateOnePieceSealedCanonicalPostApplyV1({
    applySummary, verification });
  const summary = { ...runPlan, status: validation.valid
    ? "independent_post_apply_readback_passed"
    : "independent_post_apply_readback_failed",
  apply_plan_fingerprint_sha256:
    inputs.applyPlan.apply_plan_fingerprint_sha256,
  canonical_payload_fingerprint_sha256:
    inputs.applyPlan.canonical_payload_fingerprint_sha256,
  mutation_contract_sha256: inputs.applyPlan.mutation_contract_sha256,
  readback: verification.readback,
  candidate_lineage: verification.candidate_lineage,
  visibility: verification.visibility, sealed_baseline: Object.fromEntries(
    Object.entries(verification.baseline)
      .filter(([key]) => key.startsWith("sealed_product_"))),
  validation, boundaries: verification.boundaries,
  exact_next_gate: validation.valid
    ? "checkpoint hidden One Piece sealed canon; pricing remains separately gated"
    : "stop and investigate without modifying durable rows" };
  const report = `# One Piece Sealed Canonical Independent Readback V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Exact payload readback: \`${verification.readback.exact}\`\n` +
    `- Candidate lineage: \`${verification.candidate_lineage.found}/390\`\n` +
    `- One Piece release status: \`${verification.visibility.release_status}\`\n` +
    `- Findings: \`${validation.findings.length}\`\n` +
    `- Database writes: \`0\`\n`;
  await writeArtifacts(args.outDir, { "run_plan.json": runPlan,
    "production_readback.json": verification, "summary.json": summary,
    "REPORT.md": report }, [
    { path: path.relative(ROOT, args.applySummary).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedCanonicalApplyV1(applySummaryBody) },
    { path: path.relative(ROOT, CANONICAL_PLAN_PATH).replaceAll("\\", "/"),
      sha256: hashOnePieceSealedCanonicalApplyV1(inputs.canonicalBody) },
  ]);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!validation.valid) process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const inputs = await loadFrozenInputs(args);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  if (args.mode === "apply") await apply(args, repo, inputs, connectionString);
  else await verify(args, repo, inputs, connectionString);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { parseArgs };
