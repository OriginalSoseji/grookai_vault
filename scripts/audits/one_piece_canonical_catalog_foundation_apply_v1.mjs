import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV,
  ONE_PIECE_FOUNDATION_APPLY_PLAN_PATH,
  ONE_PIECE_FOUNDATION_APPLY_VERSION,
  ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH,
  ONE_PIECE_FOUNDATION_MIGRATION_PATH,
  ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH,
  ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH,
  buildOnePieceFoundationApplyPlanV1,
  evaluateOnePieceFoundationDurableReadbackV1,
  stableJsonFoundationApplyV1,
  stripFoundationMigrationWrapperV1,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_apply_v1.mjs";
import {
  ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
  ONE_PIECE_GAME,
  evaluateOnePieceFoundationPreflightV1,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import { captureFoundationState } from "./one_piece_canonical_catalog_foundation_rollback_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const PLAN_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_apply_v1", "foundation_apply_plan_v1");
const EXECUTION_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_apply_v1", "production_apply_v1");
const PREFLIGHT_RUN_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_preflight_v1", "production_read_only_v1",
  "run_plan.json");

function rootPath(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    mode: "plan",
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: null,
  };
  for (const argument of argv) {
    if (argument === "--plan-only") args.mode = "plan";
    else if (argument === "--execute-foundation-apply") args.mode = "execute";
    else if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  args.outDir ??= args.mode === "plan" ? PLAN_DIR : EXECUTION_DIR;
  if (args.mode === "execute" && !/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required for execution");
  }
  return args;
}

async function read(relativePath) {
  return fs.readFile(rootPath(relativePath));
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function cleanError(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

async function loadFrozenInputs() {
  const [migration, preflight, rollback, independent] = await Promise.all([
    read(ONE_PIECE_FOUNDATION_MIGRATION_PATH),
    read(ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH),
    read(ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH),
    read(ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH),
  ]);
  const plan = buildOnePieceFoundationApplyPlanV1({
    migrationSql: migration.toString("utf8"),
    preflightSummary: JSON.parse(preflight),
    rollbackSummary: JSON.parse(rollback),
    independentSummary: JSON.parse(independent),
    inputHashes: {
      preflight: sha256(preflight),
      rollback: sha256(rollback),
      independent: sha256(independent),
    },
  });
  return { migration, preflight, rollback, independent, plan };
}

function planReport(plan) {
  return `# One Piece Canonical Catalog Foundation Apply Plan V1\n\n` +
    `- Status: **FROZEN / NOT EXECUTED**\n` +
    `- Migration: \`${plan.migration.version}_${plan.migration.name}.sql\`\n` +
    `- Migration SHA-256: \`${plan.migration.sha256}\`\n` +
    `- Apply-plan fingerprint: \`${plan.apply_plan_fingerprint_sha256}\`\n` +
    `- Rollback proof: \`${plan.authority.rollback_proof_sha256}\`\n` +
    `- Independent proof: \`${plan.authority.independent_proof_sha256}\`\n` +
    `- Release state: \`${plan.target.release_status}\`\n` +
    `- Canonical card rows authorized: \`0\`\n\n` +
    `## Boundary\n\nThe plan authorizes one atomic hidden game foundation, one ` +
    `identity-domain constraint replacement, and one exact migration-ledger row. ` +
    `It authorizes no set, card, printing, mapping, sealed, Storage, image-pointer, ` +
    `pricing, publication, Vault, or app-visibility write.\n\n` +
    `## Guard Token\n\n\`\`\`text\n${plan.guard_token}\n\`\`\`\n`;
}

async function writePlanArtifacts({ plan, outDir }) {
  await fs.mkdir(outDir, { recursive: true });
  const planBody = await writeJson(path.join(outDir, "plan.json"), plan);
  const reportBody = planReport(plan);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  const boundInputs = [
    ONE_PIECE_FOUNDATION_MIGRATION_PATH,
    ONE_PIECE_FOUNDATION_PREFLIGHT_SUMMARY_PATH,
    ONE_PIECE_FOUNDATION_ROLLBACK_SUMMARY_PATH,
    ONE_PIECE_FOUNDATION_INDEPENDENT_SUMMARY_PATH,
    "backend/pricing/one_piece_canonical_catalog_foundation_apply_v1.mjs",
    "scripts/audits/one_piece_canonical_catalog_foundation_apply_v1.mjs",
  ];
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "plan.json", bytes: Buffer.byteLength(planBody), sha256: sha256(planBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody), sha256: sha256(reportBody) },
    ],
    bound_inputs: await Promise.all(boundInputs.map(async (entry) => {
      const body = await read(entry);
      return { path: entry, bytes: body.length, sha256: sha256(body) };
    })),
  });
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: applicationName,
  };
}

async function captureProtectedCounts(client) {
  return (await client.query(`select jsonb_build_object(
    'games', (select count(*) from public.games),
    'catalog_game_release_controls', (select count(*) from public.catalog_game_release_controls),
    'sets', (select count(*) from public.sets),
    'card_prints', (select count(*) from public.card_prints),
    'identity_rows', (select count(*) from public.card_print_identity),
    'printing_rows', (select count(*) from public.card_printings),
    'external_mappings', (select count(*) from public.external_mappings),
    'external_printing_mappings', (select count(*) from public.external_printing_mappings),
    'sealed_families', (select count(*) from public.sealed_product_families),
    'sealed_variants', (select count(*) from public.sealed_product_variants),
    'sealed_candidates', (select count(*) from public.sealed_product_candidates),
    'sealed_releases', (select count(*) from public.sealed_product_releases),
    'market_price_current_publication', (select count(*) from public.market_price_current_publication),
    'market_price_publication_snapshots', (select count(*) from public.market_price_publication_snapshots),
    'vault_items', (select count(*) from public.vault_items),
    'vault_item_instances', (select count(*) from public.vault_item_instances),
    'vault_owners', (select count(*) from public.vault_owners)
  ) as value`)).rows[0].value;
}

async function captureDurableReadback(client) {
  const result = await client.query(`select jsonb_build_object(
    'game_count', (select count(*) from public.games where code = $1),
    'game_row', (select jsonb_build_object('id', id, 'code', code, 'name', name, 'slug', slug)
      from public.games where code = $1),
    'release_control_count', (select count(*) from public.catalog_game_release_controls
      where game_code = $1),
    'release_control_row', (select jsonb_build_object(
      'game_code', game_code, 'release_status', release_status,
      'release_version', release_version)
      from public.catalog_game_release_controls where game_code = $1),
    'identity_domain_constraint', (select pg_get_constraintdef(oid)
      from pg_constraint where conrelid = 'public.card_print_identity'::regclass
        and conname = 'card_print_identity_identity_domain_check'),
    'anon_game_visible', (select set_config('request.jwt.claim.role', 'anon', true)
      is not null and public.catalog_game_visible_to_request_v1($1)),
    'authenticated_game_visible', (select set_config('request.jwt.claim.role', 'authenticated', true)
      is not null and public.catalog_game_visible_to_request_v1($1)),
    'service_game_visible', (select set_config('request.jwt.claim.role', 'service_role', true)
      is not null and public.catalog_game_visible_to_request_v1($1)),
    'migration_ledger', (select coalesce(jsonb_agg(jsonb_build_object(
      'version', version, 'name', name, 'statements', statements) order by version), '[]'::jsonb)
      from supabase_migrations.schema_migrations where version = $2),
    'set_count', (select count(*) from public.sets where game = $1),
    'card_count', (select count(*) from public.card_prints where game_id = $3::uuid),
    'identity_count', (select count(*) from public.card_print_identity identity
      join public.card_prints card on card.id = identity.card_print_id
      where card.game_id = $3::uuid),
    'printing_count', (select count(*) from public.card_printings printing
      join public.card_prints card on card.id = printing.card_print_id
      where card.game_id = $3::uuid),
    'sealed_count', (select count(*) from public.sealed_product_families where game_key = $1),
    'staged_total_rows', (select count(*) from public.one_piece_canonical_import_rows
      where source_group_id = 3189),
    'staged_numbered_rows', (select count(*) from public.one_piece_canonical_import_rows
      where source_group_id = 3189 and single_card_kind = 'numbered_card'),
    'staged_don_rows', (select count(*) from public.one_piece_canonical_import_rows
      where source_group_id = 3189 and single_card_kind = 'don_card'),
    'staged_sealed_rows', (select count(*) from public.one_piece_canonical_import_rows
      where source_group_id = 3189 and record_class = 'sealed_product_candidate')
  ) as value`, [ONE_PIECE_GAME.code, ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
    ONE_PIECE_GAME.id]);
  const readOnly = (await client.query("show transaction_read_only"))
    .rows[0].transaction_read_only === "on";
  return {
    ...result.rows[0].value,
    protected_counts: await captureProtectedCounts(client),
    transaction_read_only: readOnly,
  };
}

async function captureFreshReadOnly(connectionString) {
  const client = new Client(clientOptions(
    connectionString,
    "one-piece-foundation-post-apply-readback-v1",
  ));
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    const readback = await captureDurableReadback(client);
    await client.query("rollback");
    return readback;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function captureAttributableWrites(client) {
  return (await client.query(`select schemaname, relname as table_name,
    coalesce(n_tup_ins,0)::bigint as inserted,
    coalesce(n_tup_upd,0)::bigint as updated,
    coalesce(n_tup_del,0)::bigint as deleted,
    coalesce(n_tup_hot_upd,0)::bigint as hot_updated
    from pg_stat_xact_user_tables
    where schemaname = 'public'
      and (coalesce(n_tup_ins,0) <> 0 or coalesce(n_tup_upd,0) <> 0
        or coalesce(n_tup_del,0) <> 0 or coalesce(n_tup_hot_upd,0) <> 0)
    order by relname`)).rows;
}

function evaluateAttributableWrites(rows) {
  const expected = [
    { table_name: "catalog_game_release_controls", inserted: 1 },
    { table_name: "games", inserted: 1 },
  ];
  const normalized = rows.map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  }));
  const findings = [];
  if (normalized.length !== expected.length) findings.push("attributable_table_count_mismatch");
  for (const target of expected) {
    const row = normalized.find((entry) => entry.table_name === target.table_name);
    if (!row || row.inserted !== target.inserted || row.updated !== 0 ||
        row.deleted !== 0 || row.hot_updated !== 0) {
      findings.push(`attributable_write_mismatch:${target.table_name}`);
    }
  }
  for (const row of normalized) {
    if (!expected.some((target) => target.table_name === row.table_name)) {
      findings.push(`unexpected_attributable_write:${row.table_name}`);
    }
  }
  return [...new Set(findings)];
}

function assertExecutionAuthority(args, plan) {
  const repository = {
    branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.branch !== BRANCH || repository.commit_sha !== args.expectedHeadSha ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean foundation-apply producer");
  }
  if (process.env[ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV] !== plan.guard_token) {
    throw new Error(`Exact guard token missing from ${ONE_PIECE_FOUNDATION_APPLY_APPROVAL_ENV}`);
  }
  return repository;
}

async function executeFoundationApply({ args, inputs, connectionString }) {
  const repository = assertExecutionAuthority(args, inputs.plan);
  const preflightRunPlan = JSON.parse(await fs.readFile(PREFLIGHT_RUN_PLAN, "utf8"));
  const runPlan = {
    version: ONE_PIECE_FOUNDATION_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    apply_plan_fingerprint_sha256: inputs.plan.apply_plan_fingerprint_sha256,
    migration_sha256: inputs.plan.migration.sha256,
    authority: inputs.plan.authority,
    target: inputs.plan.target,
    boundaries: inputs.plan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  const baseline = await captureFoundationState(connectionString, {
    productIds: preflightRunPlan.numbered_card_scope.product_ids,
    gvIds: preflightRunPlan.numbered_card_scope.gv_ids,
    applicationName: "one-piece-foundation-apply-preflight-v1",
  });
  const preflightEvaluation = evaluateOnePieceFoundationPreflightV1(baseline);
  if (!preflightEvaluation.valid) {
    throw new Error(`Fresh apply preflight failed: ${preflightEvaluation.findings.join(",")}`);
  }
  const client = new Client(clientOptions(
    connectionString,
    "one-piece-foundation-apply-v1",
  ));
  await client.connect();
  let committed = false;
  let inside = null;
  let attributableWrites = null;
  let protectedBefore = null;
  try {
    protectedBefore = await captureProtectedCounts(client);
    await client.query("begin");
    try {
      await client.query(`set local lock_timeout='${inputs.plan.timeouts.lock_timeout}'`);
      await client.query(`set local statement_timeout='${inputs.plan.timeouts.statement_timeout}'`);
      await client.query(`set local idle_in_transaction_session_timeout=` +
        `'${inputs.plan.timeouts.idle_in_transaction_session_timeout}'`);
      await client.query(stripFoundationMigrationWrapperV1(
        inputs.migration.toString("utf8")));
      await client.query(`insert into supabase_migrations.schema_migrations
        (version, statements, name) values ($1, $2::text[], $3)`, [
        inputs.plan.ledger_row.version,
        inputs.plan.ledger_row.statements,
        inputs.plan.ledger_row.name,
      ]);
      inside = await captureDurableReadback(client);
      const insideFindings = evaluateOnePieceFoundationDurableReadbackV1({
        plan: inputs.plan,
        readback: inside,
        beforeProtectedCounts: protectedBefore,
        requireReadOnly: false,
      });
      attributableWrites = await captureAttributableWrites(client);
      const findings = [...insideFindings, ...evaluateAttributableWrites(attributableWrites)];
      if (findings.length) {
        throw new Error(`Inside-transaction verification failed: ${findings.join(",")}`);
      }
      await client.query("commit");
      committed = true;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } catch (error) {
    error.executionProof = {
      repository,
      committed,
      baseline,
      protected_counts_before: protectedBefore,
      inside_transaction_readback: inside,
      attributable_writes: attributableWrites,
    };
    throw error;
  } finally {
    await client.end();
  }
  if (!committed) throw new Error("Foundation transaction did not commit");
  let postApply;
  try {
    postApply = await captureFreshReadOnly(connectionString);
  } catch (error) {
    error.executionProof = {
      repository,
      committed,
      baseline,
      protected_counts_before: protectedBefore,
      inside_transaction_readback: inside,
      attributable_writes: attributableWrites,
      fresh_post_apply_readback: null,
    };
    throw error;
  }
  const postFindings = evaluateOnePieceFoundationDurableReadbackV1({
    plan: inputs.plan,
    readback: postApply,
  });
  if (postFindings.length) {
    const error = new Error(`Fresh post-apply verification failed: ${postFindings.join(",")}`);
    error.executionProof = {
      repository,
      committed,
      baseline,
      protected_counts_before: protectedBefore,
      inside_transaction_readback: inside,
      attributable_writes: attributableWrites,
      fresh_post_apply_readback: postApply,
    };
    throw error;
  }
  return {
    status: "foundation_applied_hidden_and_readback_passed",
    repository,
    apply_plan_fingerprint_sha256: inputs.plan.apply_plan_fingerprint_sha256,
    migration_sha256: inputs.plan.migration.sha256,
    committed,
    baseline,
    protected_counts_before: protectedBefore,
    inside_transaction_readback: inside,
    attributable_writes: attributableWrites,
    fresh_post_apply_readback: postApply,
    boundaries: {
      ...inputs.plan.boundaries,
      durable_database_transaction_committed: true,
    },
  };
}

async function writeExecutionArtifacts({ result, outDir }) {
  const summary = {
    version: ONE_PIECE_FOUNDATION_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    ...result,
  };
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const readbackBody = await writeJson(
    path.join(outDir, "fresh_post_apply_readback.json"),
    result.fresh_post_apply_readback,
  );
  const reportBody = `# One Piece Canonical Foundation Apply V1\n\n` +
    `- Status: \`${result.status}\`\n` +
    `- Producer SHA: \`${result.repository.commit_sha}\`\n` +
    `- Plan fingerprint: \`${result.apply_plan_fingerprint_sha256}\`\n` +
    `- Migration SHA-256: \`${result.migration_sha256}\`\n` +
    `- Release status: \`hidden\`\n` +
    `- Canonical card rows: \`0\`\n` +
    `- App visibility enabled: \`false\`\n`;
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  const runPlanBody = await fs.readFile(path.join(outDir, "run_plan.json"));
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "run_plan.json", sha256: sha256(runPlanBody) },
      { path: "summary.json", sha256: sha256(summaryBody) },
      { path: "fresh_post_apply_readback.json", sha256: sha256(readbackBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
  });
}

async function writeFailureArtifacts({ error, plan, outDir }) {
  await fs.mkdir(outDir, { recursive: true });
  const failure = {
    version: ONE_PIECE_FOUNDATION_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: "blocked",
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    migration_sha256: plan.migration.sha256,
    error: cleanError(error),
    execution_proof: error.executionProof ?? null,
  };
  const failureBody = await writeJson(path.join(outDir, "failure.json"), failure);
  const artifacts = [{ path: "failure.json", sha256: sha256(failureBody) }];
  try {
    const runPlanBody = await fs.readFile(path.join(outDir, "run_plan.json"));
    artifacts.unshift({ path: "run_plan.json", sha256: sha256(runPlanBody) });
  } catch (readError) {
    if (readError.code !== "ENOENT") throw readError;
  }
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputs = await loadFrozenInputs();
  if (args.mode === "plan") {
    await writePlanArtifacts({ plan: inputs.plan, outDir: args.outDir });
    process.stdout.write(`${JSON.stringify({
      status: "foundation_apply_plan_frozen_no_database_access",
      plan_path: relative(path.join(args.outDir, "plan.json")),
      migration_sha256: inputs.plan.migration.sha256,
      apply_plan_fingerprint_sha256: inputs.plan.apply_plan_fingerprint_sha256,
      guard_token: inputs.plan.guard_token,
    }, null, 2)}\n`);
    return;
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const checkedInPlan = JSON.parse(await read(ONE_PIECE_FOUNDATION_APPLY_PLAN_PATH));
  if (stableJsonFoundationApplyV1(checkedInPlan) !==
      stableJsonFoundationApplyV1(inputs.plan)) {
    throw new Error("Checked-in foundation apply plan does not reproduce exactly");
  }
  let result;
  try {
    result = await executeFoundationApply({ args, inputs, connectionString });
  } catch (error) {
    await writeFailureArtifacts({ error, plan: inputs.plan, outDir: args.outDir });
    throw error;
  }
  await writeExecutionArtifacts({ result, outDir: args.outDir });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    producing_commit_sha: result.repository.commit_sha,
    output_directory: relative(args.outDir),
  }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export {
  captureDurableReadback,
  captureFreshReadOnly,
  captureProtectedCounts,
  evaluateAttributableWrites,
  loadFrozenInputs,
  parseArgs,
};
