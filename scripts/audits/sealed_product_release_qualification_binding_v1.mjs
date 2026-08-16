import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION_VERSION = "20260816030000";
const MIGRATION_NAME = "sealed_product_release_qualification_binding_v1";
const MIGRATION_PATH = path.join(ROOT, "supabase", "migrations",
  `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`);
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "sealed_product_release_qualification_binding_v1");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args,
  { cwd: ROOT, encoding: "utf8" }).trim();

function parseArgs(argv) {
  const args = { mode: "", execute: false, expectedHeadSha: "",
    expectedMigrationSha: "", envFile: "C:\\grookai_vault\\.env.local",
    outDir: "" };
  for (const argument of argv) {
    if (argument.startsWith("--mode=")) args.mode = argument.slice(7);
    else if (argument === "--execute-migration") args.execute = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-migration-sha=")) {
      args.expectedMigrationSha = argument.slice(25).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!["preflight", "apply", "verify"].includes(args.mode)) {
    throw new Error("--mode=preflight|apply|verify is required");
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedMigrationSha)) {
    throw new Error("Exact head and migration hashes are required");
  }
  if (args.mode === "apply" && !args.execute) {
    throw new Error("Apply requires --execute-migration");
  }
  args.outDir ||= path.join(DEFAULT_OUT, `${args.mode}_v1`);
  return args;
}

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean migration producer");
  }
  return result;
}

function options(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 180_000,
    statement_timeout: 180_000, application_name: name };
}

async function inspect(client) {
  const row = (await client.query(`select
    (select count(*)::integer from public.sealed_product_pricing_lane_qualifications) qualification_rows,
    (select count(*)::integer from public.sealed_product_releases) release_rows,
    (select count(*)::integer from public.sealed_product_release_members) member_rows,
    (select count(*)::integer from public.sealed_product_release_pointer) pointer_rows,
    (select count(*)::integer from supabase_migrations.schema_migrations where version=$1) ledger_rows,
    exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='sealed_product_release_members' and column_name='qualification_id') qualification_column,
    to_regprocedure('public.get_active_sealed_product_pricing_v1(text,integer,integer)') is not null read_function,
    (select release_status from public.catalog_game_release_controls where game_code='one_piece') one_piece_status`,
  [MIGRATION_VERSION])).rows[0];
  return { qualification_rows: Number(row.qualification_rows),
    release_rows: Number(row.release_rows), member_rows: Number(row.member_rows),
    pointer_rows: Number(row.pointer_rows), ledger_rows: Number(row.ledger_rows),
    qualification_column: row.qualification_column,
    read_function: row.read_function, one_piece_status: row.one_piece_status };
}

async function verifySchema(client) {
  const state = await inspect(client);
  const constraints = (await client.query(`select conname from pg_constraint
    where conname=any($1::text[]) order by conname`, [[
      "sealed_product_pricing_release_binding_unique",
      "sealed_product_release_members_qualified_status_check",
      "sealed_product_release_members_qualification_binding_fk",
      "sealed_product_release_members_release_qualification_unique",
    ]])).rows.map((row) => row.conname);
  const privileges = (await client.query(`select
    has_function_privilege('anon', 'public.get_active_sealed_product_pricing_v1(text,integer,integer)', 'EXECUTE') anon_execute,
    has_function_privilege('authenticated', 'public.get_active_sealed_product_pricing_v1(text,integer,integer)', 'EXECUTE') authenticated_execute,
    has_function_privilege('service_role', 'public.get_active_sealed_product_pricing_v1(text,integer,integer)', 'EXECUTE') service_execute`)).rows[0];
  const valid = state.qualification_rows === 374 && state.release_rows === 0 &&
    state.member_rows === 0 && state.pointer_rows === 0 && state.ledger_rows === 1 &&
    state.qualification_column === true && state.read_function === true &&
    state.one_piece_status === "hidden" && constraints.length === 4 &&
    privileges.anon_execute === false &&
    privileges.authenticated_execute === true && privileges.service_execute === true;
  return { valid, state, constraints, privileges };
}

async function writeArtifacts(dir, summary) {
  await fs.mkdir(dir, { recursive: true });
  const body = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(path.join(dir, "summary.json"), body);
  await fs.writeFile(path.join(dir, "REPORT.md"),
    `# Sealed Release Qualification Binding V1\n\n- Status: \`${summary.status}\`\n- Database writes: \`${summary.database_writes}\`\n`);
  await fs.writeFile(path.join(dir, "artifact_hashes.json"),
    `${JSON.stringify({ hash_algorithm: "sha256", artifacts: {
      "summary.json": { bytes: body.length, sha256: sha256(body) },
    } }, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const migrationSql = await fs.readFile(MIGRATION_PATH, "utf8");
  const migrationSha = sha256(migrationSql);
  if (migrationSha !== args.expectedMigrationSha) {
    throw new Error(`Migration hash mismatch: ${migrationSha}`);
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const client = new Client(options(connectionString,
    `sealed-release-qualification-binding-${args.mode}-v1`));
  await client.connect();
  let summary;
  try {
    if (args.mode === "preflight") {
      await client.query("begin read only");
      const state = await inspect(client);
      await client.query("commit");
      const valid = state.qualification_rows === 374 && state.release_rows === 0 &&
        state.member_rows === 0 && state.pointer_rows === 0 &&
        state.ledger_rows === 0 && state.qualification_column === false &&
        state.read_function === false && state.one_piece_status === "hidden";
      summary = { status: valid ? "production_preflight_passed" :
        "production_preflight_failed", repository: repo,
      migration_sha256: migrationSha, state, database_writes: 0 };
      if (!valid) throw new Error("Migration preflight failed");
    } else if (args.mode === "apply") {
      await client.query("begin");
      let committed = false;
      try {
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
          ["sealed_product_release_qualification_binding_v1"]);
        const before = await inspect(client);
        if (before.qualification_rows !== 374 || before.release_rows !== 0 ||
            before.member_rows !== 0 || before.pointer_rows !== 0 ||
            before.ledger_rows !== 0 || before.qualification_column ||
            before.read_function || before.one_piece_status !== "hidden") {
          throw new Error("Transaction-local migration preflight failed");
        }
        await client.query(stripSealedMigrationTransactionWrapperV1(migrationSql));
        await client.query(`insert into supabase_migrations.schema_migrations
          (version, statements, name) values ($1,$2::text[],$3)`, [
          MIGRATION_VERSION, splitSealedMigrationStatementsV1(migrationSql),
          MIGRATION_NAME,
        ]);
        const proof = await verifySchema(client);
        if (!proof.valid) throw new Error("Transaction-local schema readback failed");
        await client.query("commit");
        committed = true;
        summary = { status: "migration_applied_and_verified", repository: repo,
          migration_sha256: migrationSha, proof, database_writes: 1,
          mutation_scope: "schema_and_migration_ledger_only" };
      } finally {
        if (!committed) await client.query("rollback").catch(() => {});
      }
    } else {
      await client.query("begin read only");
      const proof = await verifySchema(client);
      await client.query("commit");
      summary = { status: proof.valid ? "independent_verification_passed" :
        "independent_verification_failed", repository: repo,
      migration_sha256: migrationSha, proof, database_writes: 0 };
      if (!proof.valid) throw new Error("Independent schema verification failed");
    }
  } finally {
    await client.end();
  }
  await writeArtifacts(args.outDir, summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
