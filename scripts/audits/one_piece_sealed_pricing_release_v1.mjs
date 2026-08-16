import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_PRICING_RELEASE_ACTOR_ID,
  ONE_PIECE_SEALED_PRICING_RELEASE_ID,
  ONE_PIECE_SEALED_PRICING_RELEASE_VERSION,
  buildOnePieceSealedPricingReleasePlanV1,
  hashOnePieceSealedPricingReleaseV1,
  validateOnePieceSealedPricingReleasePlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_release_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_qualification_plan_v1", "frozen_plan_v1",
  "qualification_plan.json.gz");
const AUDIT_ROOT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_release_v1");

function parseArgs(argv) {
  const args = { mode: "", execute: false, expectedHeadSha: "",
    expectedPlanFingerprint: "", expectedPreflightFingerprint: "",
    preflightSummary: "", envFile: "C:\\grookai_vault\\.env.local",
    outDir: "" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) args.mode = argument.slice(7);
    else if (argument === "--execute-durable-release") args.execute = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-plan-fingerprint=")) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith("--expected-preflight-fingerprint=")) {
      args.expectedPreflightFingerprint = argument.slice(33).trim().toLowerCase();
    } else if (argument.startsWith("--preflight-summary=")) {
      args.preflightSummary = path.resolve(argument.slice(20));
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!["plan", "preflight", "canary", "apply", "verify"].includes(args.mode)) {
    throw new Error("--mode=plan|preflight|canary|apply|verify is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("Exact --expected-head-sha is required");
  }
  if (args.mode !== "plan" &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error("Exact --expected-plan-fingerprint is required");
  }
  if (args.mode === "apply" && (!args.execute || !args.preflightSummary ||
      !/^[0-9a-f]{64}$/.test(args.expectedPreflightFingerprint))) {
    throw new Error("Apply requires explicit execution and a bound preflight");
  }
  args.outDir ||= path.join(AUDIT_ROOT, `${args.mode}_v1`);
  return args;
}

const git = (...args) => execFileSync("git", args,
  { cwd: ROOT, encoding: "utf8" }).trim();

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean release producer");
  }
  return result;
}

function options(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: name };
}

async function loadPlan(repo) {
  const sourceBody = await fs.readFile(SOURCE_PATH);
  const qualificationPlan = JSON.parse(gunzipSync(sourceBody));
  const plan = buildOnePieceSealedPricingReleasePlanV1({ qualificationPlan,
    sourceProducerSha: qualificationPlan.repository.commit_sha });
  const validation = validateOnePieceSealedPricingReleasePlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  return { plan, qualificationPlan, sourceBodySha256:
    hashOnePieceSealedPricingReleaseV1(sourceBody), repository: repo };
}

async function baseline(client) {
  const row = (await client.query(`select
    (select count(*)::integer from public.sealed_product_pricing_lane_qualifications) qualification_rows,
    (select count(*)::integer from public.sealed_product_releases) release_rows,
    (select count(*)::integer from public.sealed_product_release_members) member_rows,
    (select count(*)::integer from public.sealed_product_release_pointer) pointer_rows,
    (select release_status from public.catalog_game_release_controls where game_code='one_piece') one_piece_status,
    exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='sealed_product_release_members' and column_name='qualification_id') qualification_binding_present`)).rows[0];
  return { qualification_rows: Number(row.qualification_rows),
    release_rows: Number(row.release_rows), member_rows: Number(row.member_rows),
    pointer_rows: Number(row.pointer_rows), one_piece_status: row.one_piece_status,
    qualification_binding_present: row.qualification_binding_present };
}

async function lineage(client, members) {
  const row = (await client.query(`with expected as (
      select * from jsonb_to_recordset($1::jsonb) as x(
        id uuid,release_id uuid,variant_id uuid,source_mapping_id uuid,
        qualification_id uuid,qualification_status text,member_fingerprint text)
    ) select count(*)::integer expected_rows,
      count(q.id)::integer matched_qualifications,
      count(v.id)::integer matched_variants,
      count(m.id)::integer matched_mappings,
      count(*) filter (where q.qualification_status='qualified_exact')::integer qualified_exact
    from expected e
    left join public.sealed_product_pricing_lane_qualifications q
      on q.id=e.qualification_id and q.variant_id=e.variant_id
     and q.source_mapping_id=e.source_mapping_id
     and q.qualification_status=e.qualification_status
    left join public.sealed_product_variants v on v.id=e.variant_id
    left join public.sealed_product_source_mappings m
      on m.id=e.source_mapping_id and m.variant_id=e.variant_id`,
  [JSON.stringify(members)])).rows[0];
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, Number(value)]));
}

async function collisions(client, plan) {
  const row = (await client.query(`select
    (select count(*)::integer from public.sealed_product_releases
      where id=$1 or release_key=$2 or manifest_fingerprint=$3) release_collisions,
    (select count(*)::integer from public.sealed_product_release_members
      where id=any($4::uuid[]) or member_fingerprint=any($5::text[])) member_collisions`, [
    plan.release.id, plan.release.release_key, plan.release.manifest_fingerprint,
    plan.members.map((row) => row.id),
    plan.members.map((row) => row.member_fingerprint),
  ])).rows[0];
  return { release_collisions: Number(row.release_collisions),
    member_collisions: Number(row.member_collisions) };
}

async function preflightProof(client, plan, expectEmpty = true) {
  const state = await baseline(client);
  const source = await lineage(client, plan.members);
  const collision = expectEmpty ? await collisions(client, plan) :
    { release_collisions: 0, member_collisions: 0 };
  const valid = state.qualification_rows === 374 &&
    state.qualification_binding_present === true &&
    state.one_piece_status === "hidden" && source.expected_rows === 332 &&
    source.matched_qualifications === 332 && source.matched_variants === 332 &&
    source.matched_mappings === 332 && source.qualified_exact === 332 &&
    (!expectEmpty || (state.release_rows === 0 && state.member_rows === 0 &&
      state.pointer_rows === 0 && collision.release_collisions === 0 &&
      collision.member_collisions === 0));
  return { valid, state, lineage: source, collisions: collision };
}

async function insertRelease(client, plan) {
  const release = plan.release;
  await client.query(`insert into public.sealed_product_releases
    (id,release_key,release_state,source_audit_producer_sha,
     source_sample_logical_hash,release_contract_version,
     manifest_fingerprint,expected_member_count,created_by)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [release.id,
    release.release_key, release.release_state, release.source_audit_producer_sha,
    release.source_sample_logical_hash, release.release_contract_version,
    release.manifest_fingerprint, release.expected_member_count,
    release.created_by]);
  await client.query(`insert into public.sealed_product_release_members
    (id,release_id,variant_id,source_mapping_id,qualification_id,
     qualification_status,member_fingerprint)
    select id,release_id,variant_id,source_mapping_id,qualification_id,
      qualification_status,member_fingerprint
    from jsonb_to_recordset($1::jsonb) as x(id uuid,release_id uuid,
      variant_id uuid,source_mapping_id uuid,qualification_id uuid,
      qualification_status text,member_fingerprint text)`,
  [JSON.stringify(plan.members)]);
  await client.query("select public.sealed_product_freeze_release_v1($1,$2,$3)",
    [release.id, release.manifest_fingerprint,
      ONE_PIECE_SEALED_PRICING_RELEASE_ACTOR_ID]);
  await client.query("select * from public.sealed_product_set_active_release_v1($1,$2,$3)",
    [release.id, null, ONE_PIECE_SEALED_PRICING_RELEASE_ACTOR_ID]);
}

async function releaseReadback(client, plan) {
  const release = (await client.query(`select id::text,release_key,release_state,
    source_audit_producer_sha,source_sample_logical_hash,
    release_contract_version,manifest_fingerprint,expected_member_count,
    created_by::text,frozen_by::text,frozen_at is not null as frozen
    from public.sealed_product_releases where id=$1`, [plan.release.id])).rows[0];
  const members = (await client.query(`select id::text,release_id::text,
    variant_id::text,source_mapping_id::text,qualification_id::text,
    qualification_status,member_fingerprint
    from public.sealed_product_release_members where release_id=$1
    order by variant_id`, [plan.release.id])).rows;
  const pointer = (await client.query(`select release_id::text,
    previous_release_id::text,pointer_contract_version
    from public.sealed_product_release_pointer where singleton`)).rows[0];
  const expectedMembers = [...plan.members].sort((left, right) =>
    left.variant_id.localeCompare(right.variant_id));
  const memberExact = hashOnePieceSealedPricingReleaseV1(members) ===
    hashOnePieceSealedPricingReleaseV1(expectedMembers);
  const valid = release?.id === plan.release.id &&
    release?.release_key === plan.release.release_key &&
    release?.release_state === "frozen" && release?.frozen === true &&
    release?.frozen_by === ONE_PIECE_SEALED_PRICING_RELEASE_ACTOR_ID &&
    release?.manifest_fingerprint === plan.release.manifest_fingerprint &&
    Number(release?.expected_member_count) === 332 && members.length === 332 &&
    memberExact && pointer?.release_id === plan.release.id &&
    pointer?.previous_release_id === null &&
    pointer?.pointer_contract_version ===
      "CROSS_TCG_SEALED_PRODUCT_RELEASE_POINTER_V1";
  return { valid, release, member_count: members.length,
    member_payload_sha256: hashOnePieceSealedPricingReleaseV1(members),
    expected_member_payload_sha256:
      hashOnePieceSealedPricingReleaseV1(expectedMembers), member_exact: memberExact,
    pointer };
}

async function appBoundary(client) {
  const rows = (await client.query(
    "select * from public.get_active_sealed_product_pricing_v1(null,100,0)",
  )).rows;
  return { one_piece_hidden: true, rows_returned_while_hidden: rows.length,
    valid: rows.length === 0 };
}

async function writeArtifacts(dir, files, producer) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.from(name.endsWith(".json")
      ? `${JSON.stringify(value, null, 2)}\n` : String(value));
    await fs.writeFile(path.join(dir, name), body);
    hashes[name] = { bytes: body.length,
      sha256: hashOnePieceSealedPricingReleaseV1(body) };
  }
  await fs.writeFile(path.join(dir, "artifact_hashes.json"),
    `${JSON.stringify({ hash_algorithm: "sha256", producer_commit_sha: producer,
      artifacts: hashes }, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const inputs = await loadPlan(repo);
  if (args.mode !== "plan" && inputs.plan.plan_fingerprint_sha256 !==
      args.expectedPlanFingerprint) {
    throw new Error("Release plan fingerprint mismatch");
  }
  if (args.mode === "plan") {
    const summary = { status: "offline_release_plan_frozen", repository: repo,
      plan_fingerprint_sha256: inputs.plan.plan_fingerprint_sha256,
      manifest_fingerprint_sha256: inputs.plan.release.manifest_fingerprint,
      member_count: inputs.plan.members.length, exclusions: inputs.plan.exclusions,
      database_connections: 0, database_writes: 0 };
    await writeArtifacts(args.outDir, { "release_plan.json": inputs.plan,
      "summary.json": summary,
      "REPORT.md": `# One Piece Sealed Pricing Release V1\n\n- Status: \`${summary.status}\`\n- Members: \`332\`\n` }, repo.commit_sha);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const client = new Client(options(connectionString,
    `one-piece-sealed-pricing-release-${args.mode}-v1`));
  await client.connect();
  let summary;
  try {
    if (args.mode === "preflight") {
      await client.query("begin read only");
      const proof = await preflightProof(client, inputs.plan);
      await client.query("commit");
      const fingerprint = hashOnePieceSealedPricingReleaseV1(proof);
      summary = { status: proof.valid ? "production_preflight_passed" :
        "production_preflight_failed", repository: repo,
      plan_fingerprint_sha256: inputs.plan.plan_fingerprint_sha256,
      preflight_fingerprint_sha256: fingerprint, proof, database_writes: 0 };
      if (!proof.valid) throw new Error("Release preflight failed");
    } else if (args.mode === "canary") {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
        ["one_piece_sealed_pricing_release_v1"]);
      const proof = await preflightProof(client, inputs.plan);
      if (!proof.valid) throw new Error("Canary preflight failed");
      await insertRelease(client, inputs.plan);
      const readback = await releaseReadback(client, inputs.plan);
      if (!readback.valid) throw new Error("Canary readback failed");
      await client.query("rollback");
      const residue = await baseline(client);
      const zeroResidue = residue.release_rows === 0 && residue.member_rows === 0 &&
        residue.pointer_rows === 0;
      summary = { status: zeroResidue ? "rollback_canary_passed_zero_residue" :
        "rollback_canary_failed", repository: repo,
      plan_fingerprint_sha256: inputs.plan.plan_fingerprint_sha256,
      transaction_readback: readback, post_rollback: residue,
      database_writes_committed: 0 };
      if (!zeroResidue) throw new Error("Rollback canary left residue");
    } else if (args.mode === "apply") {
      const preflight = JSON.parse(await fs.readFile(args.preflightSummary,
        "utf8"));
      if (preflight.status !== "production_preflight_passed" ||
          preflight.repository?.commit_sha !== repo.commit_sha ||
          preflight.preflight_fingerprint_sha256 !==
            args.expectedPreflightFingerprint ||
          hashOnePieceSealedPricingReleaseV1(preflight.proof) !==
            args.expectedPreflightFingerprint) {
        throw new Error("Apply is not bound to the exact fresh preflight");
      }
      let committed = false;
      await client.query("begin transaction isolation level repeatable read");
      try {
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
          ["one_piece_sealed_pricing_release_v1"]);
        const proof = await preflightProof(client, inputs.plan);
        if (!proof.valid) throw new Error("Apply preflight failed");
        await insertRelease(client, inputs.plan);
        const readback = await releaseReadback(client, inputs.plan);
        const boundary = await appBoundary(client);
        if (!readback.valid || !boundary.valid) {
          throw new Error("Apply readback or hidden boundary failed");
        }
        await client.query("commit");
        committed = true;
        summary = { status: "durable_release_activated_internal_only",
          repository: repo, plan_fingerprint_sha256:
            inputs.plan.plan_fingerprint_sha256, committed: true, readback,
        app_boundary: boundary, database_rows_written: 334,
        catalog_release_control_writes: 0 };
      } finally {
        if (!committed) await client.query("rollback").catch(() => {});
      }
    } else {
      await client.query("begin read only");
      const readback = await releaseReadback(client, inputs.plan);
      const source = await lineage(client, inputs.plan.members);
      const boundary = await appBoundary(client);
      const state = await baseline(client);
      await client.query("commit");
      const valid = readback.valid && boundary.valid &&
        source.matched_qualifications === 332 && source.qualified_exact === 332 &&
        state.release_rows === 1 && state.member_rows === 332 &&
        state.pointer_rows === 1 && state.one_piece_status === "hidden";
      summary = { status: valid ? "independent_release_verification_passed" :
        "independent_release_verification_failed", repository: repo,
      plan_fingerprint_sha256: inputs.plan.plan_fingerprint_sha256,
      readback, lineage: source, app_boundary: boundary, state,
      database_writes: 0 };
      if (!valid) throw new Error("Independent release verification failed");
    }
  } finally {
    await client.end();
  }
  await writeArtifacts(args.outDir, { "summary.json": summary,
    "REPORT.md": `# One Piece Sealed Pricing Release V1\n\n- Status: \`${summary.status}\`\n` }, repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
