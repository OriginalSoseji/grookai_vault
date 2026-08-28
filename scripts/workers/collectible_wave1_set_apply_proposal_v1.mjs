import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import pg from "pg";

import {
  COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED,
  COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT,
  buildCollectibleWave1SetApplyProposalV1,
  buildCollectibleWave1SetRollbackContractV1,
  evaluateCollectibleWave1SetDatabasePreflightV1,
  wave1SetApplyFingerprintV1,
} from "../../backend/catalog/collectible_wave1_set_apply_proposal_v1.mjs";

const DEFAULT_OUT_DIR = path.resolve(
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_set_apply_proposal_v1",
  new Date().toISOString().replace(/[:.]/g, "-"),
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const options = {
    foundationArtifactDir: null,
    outDir: DEFAULT_OUT_DIR,
    expectedHeadSha: null,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    envFile: null,
  };
  for (const argument of argv) {
    if (argument.startsWith("--foundation-artifact-dir=")) {
      options.foundationArtifactDir = path.resolve(argument.slice(26));
    } else if (argument.startsWith("--out-dir=")) {
      options.outDir = path.resolve(argument.slice(10));
    } else if (argument.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--db-url=")) {
      options.databaseUrl = argument.slice(9);
    } else if (argument.startsWith("--env-file=")) {
      options.envFile = path.resolve(argument.slice(11));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!options.foundationArtifactDir) {
    throw new Error("--foundation-artifact-dir is required");
  }
  if (!/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return options;
}

async function loadOptions(argv) {
  const initial = parseArgs(argv);
  if (initial.envFile) {
    dotenv.config({ path: initial.envFile, quiet: true });
    initial.databaseUrl = initial.databaseUrl ??
      process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null;
  }
  if (!initial.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  return initial;
}

async function readPinnedFile(directory, fileName, expected) {
  const body = await fs.readFile(path.join(directory, fileName));
  if (body.length !== expected.bytes || sha256(body) !== expected.sha256) {
    throw new Error(`Frozen input mismatch: ${fileName}`);
  }
  return body;
}

function parseJsonLines(body, fileName) {
  return body.toString("utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${fileName}:${index + 1} is invalid JSON: ${error.message}`);
    }
  });
}

async function loadFrozenFoundationArtifact(directory) {
  const [setBody, summaryBody, validationBody, hashManifestBody] = await Promise.all([
    readPinnedFile(
      directory,
      "set_candidates.jsonl",
      COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.set_candidates,
    ),
    readPinnedFile(directory, "summary.json", COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.summary),
    readPinnedFile(
      directory,
      "validation_failures.jsonl",
      COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.validation_failures,
    ),
    fs.readFile(path.join(directory, "artifact_hashes.json")),
  ]);
  if (validationBody.length !== 0) throw new Error("Frozen proposal contains validation failures");
  const summary = JSON.parse(summaryBody.toString("utf8"));
  if (summary.version !== "COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_V1" ||
      summary.manifest_set_count !== 1056 ||
      summary.proposal_status_counts?.review_ready !== 505 ||
      summary.validation_failure_count !== 0 ||
      summary.candidate_reconciliation_mismatch_count !== 0) {
    throw new Error("Frozen proposal summary does not match the reviewed profile");
  }
  const hashManifest = JSON.parse(hashManifestBody.toString("utf8"));
  for (const [fileName, expected] of Object.entries({
    "set_candidates.jsonl": COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.set_candidates,
    "summary.json": COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.summary,
    "validation_failures.jsonl": COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.validation_failures,
  })) {
    const recorded = hashManifest.artifacts?.find((row) => row.path === fileName);
    if (!recorded || recorded.bytes !== expected.bytes || recorded.sha256 !== expected.sha256) {
      throw new Error(`Frozen artifact hash manifest mismatch: ${fileName}`);
    }
  }
  return {
    setCandidates: parseJsonLines(setBody, "set_candidates.jsonl"),
    upstreamSummary: summary,
    verifiedArtifacts: Object.entries({
      "set_candidates.jsonl": COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.set_candidates,
      "summary.json": COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.summary,
      "validation_failures.jsonl": COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT.validation_failures,
    }).map(([artifact_path, profile]) => ({ artifact_path, ...profile })),
  };
}

function clientOptions(connectionString) {
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: "collectible-wave1-set-apply-proposal-v1-read-only",
    connectionTimeoutMillis: 20_000,
    statement_timeout: 120_000,
    query_timeout: 120_000,
    options: "-c default_transaction_read_only=on",
  };
}

async function captureDatabasePreflight(connectionString, proposalRows) {
  const client = new pg.Client(clientOptions(connectionString));
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    transactionOpen = true;
    const planned = proposalRows.map((row) => ({
      id: row.id,
      game: row.game,
      code: row.code,
      name: row.name,
      source_set_proposal_id: row.source_set_proposal_id,
    }));
    const { rows } = await client.query(`
      with planned as materialized (
        select *
        from jsonb_to_recordset($1::jsonb) as row(
          id uuid,
          game text,
          code text,
          name text,
          source_set_proposal_id text
        )
      )
      select jsonb_build_object(
        'transaction_read_only', current_setting('transaction_read_only')::boolean,
        'latest_migration', (
          select max(version) from supabase_migrations.schema_migrations
        ),
        'planned_row_count', (select count(*) from planned),
        'games', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', id,
            'code', code,
            'name', name,
            'slug', slug
          ) order by code), '[]'::jsonb)
          from public.games where code in ('gundam', 'yugioh')
        ),
        'release_controls', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'game_code', game_code,
            'release_status', release_status,
            'release_version', release_version
          ) order by game_code), '[]'::jsonb)
          from public.catalog_game_release_controls
          where game_code in ('gundam', 'yugioh')
        ),
        'existing_wave1_set_count', (
          select count(*) from public.sets where game in ('gundam', 'yugioh')
        ),
        'planned_id_collision_count', (
          select count(*) from public.sets existing join planned on planned.id = existing.id
        ),
        'planned_code_collision_count', (
          select count(*) from public.sets existing join planned on planned.code = existing.code
        ),
        'planned_source_proposal_collision_count', (
          select count(*) from public.sets existing join planned
            on planned.source_set_proposal_id = existing.source ->> 'set_proposal_id'
        ),
        'planned_game_name_collision_count', (
          select count(*) from public.sets existing join planned
            on planned.game = existing.game and lower(planned.name) = lower(existing.name)
        ),
        'sets_rls_enabled', (
          select relrowsecurity from pg_class where oid = 'public.sets'::regclass
        ),
        'sets_force_rls', (
          select relforcerowsecurity from pg_class where oid = 'public.sets'::regclass
        ),
        'sets_columns', (
          select jsonb_agg(column_name order by ordinal_position)
          from information_schema.columns
          where table_schema = 'public' and table_name = 'sets'
        ),
        'set_unique_definitions', (
          select coalesce(jsonb_agg(definition order by definition), '[]'::jsonb)
          from (
            select pg_get_constraintdef(oid) as definition
            from pg_constraint
            where conrelid = 'public.sets'::regclass and contype in ('p', 'u')
            union all
            select indexdef
            from pg_indexes
            where schemaname = 'public' and tablename = 'sets' and indexdef ilike '%unique%'
          ) definitions
        ),
        'conflicting_lock_count', (
          select count(*) from pg_locks lock
          where not lock.granted and lock.relation = 'public.sets'::regclass
        )
      ) as value
    `, [JSON.stringify(planned)]);
    await client.query("rollback");
    transactionOpen = false;
    return rows[0].value;
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function writeJson(filePath, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, body, "utf8");
  return Buffer.from(body);
}

async function writeJsonLines(filePath, rows) {
  const body = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  await fs.writeFile(filePath, body, "utf8");
  return Buffer.from(body);
}

function report(summary) {
  return `# Collectible Wave 1 Set Apply Proposal V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Repository SHA: \`${summary.repository.commit_sha}\`\n` +
    `- Selected sets: \`${summary.selected_set_count}\`\n` +
    `- Yu-Gi-Oh sets: \`${summary.selected_by_game.yugioh}\`\n` +
    `- Gundam sets: \`${summary.selected_by_game.gundam}\`\n` +
    `- Excluded review rows: \`${summary.excluded_set_count}\`\n` +
    `- Database collision findings: \`${summary.preflight_findings.length}\`\n` +
    `- Payload fingerprint: \`${summary.payload_fingerprint_sha256}\`\n` +
    `- Database writes: \`0\`\n` +
    `- Migration generated: \`false\`\n\n` +
    `This artifact does not authorize a migration or durable apply.\n`;
}

async function main() {
  const options = await loadOptions(process.argv.slice(2));
  const repository = {
    branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"),
    tracked_worktree_clean: git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== options.expectedHeadSha || !repository.tracked_worktree_clean) {
    throw new Error("Proposal requires the exact clean frozen commit");
  }
  const frozen = await loadFrozenFoundationArtifact(options.foundationArtifactDir);
  const proposal = buildCollectibleWave1SetApplyProposalV1(frozen.setCandidates);
  const rollbackContract = buildCollectibleWave1SetRollbackContractV1(proposal.rows);
  await fs.mkdir(options.outDir, { recursive: true });
  const runPlanCore = {
    version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    mode: "production_read_only_proposal",
    repository,
    input: COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT,
    verified_input_artifacts: frozen.verifiedArtifacts,
    exact_scope: {
      selected_set_count: proposal.rows.length,
      excluded_set_count: proposal.excludedRows.length,
      selected_by_game: proposal.selected_by_game,
      language_code: COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.language_code,
    },
    payload_fingerprint_sha256: proposal.payload_fingerprint_sha256,
    boundaries: proposal.boundaries,
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: wave1SetApplyFingerprintV1(runPlanCore),
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const databasePreflight = await captureDatabasePreflight(options.databaseUrl, proposal.rows);
  const preflightFindings = evaluateCollectibleWave1SetDatabasePreflightV1(databasePreflight);
  const summary = {
    version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    status: preflightFindings.length === 0
      ? "proposal_ready_no_write_authority"
      : "blocked",
    repository,
    selected_set_count: proposal.rows.length,
    excluded_set_count: proposal.excludedRows.length,
    selected_by_game: proposal.selected_by_game,
    payload_fingerprint_sha256: proposal.payload_fingerprint_sha256,
    run_plan_fingerprint_sha256: runPlan.run_plan_fingerprint_sha256,
    preflight_findings: preflightFindings,
    database_parent_migration: databasePreflight.latest_migration,
    database_collision_counts: {
      ids: Number(databasePreflight.planned_id_collision_count),
      codes: Number(databasePreflight.planned_code_collision_count),
      source_proposals: Number(databasePreflight.planned_source_proposal_collision_count),
      game_names: Number(databasePreflight.planned_game_name_collision_count),
    },
    boundaries: proposal.boundaries,
  };
  const validationFailures = preflightFindings.map((finding) => ({
    version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    finding,
    write_authority: false,
  }));
  const artifacts = {
    "set_apply_payload.jsonl": await writeJsonLines(
      path.join(options.outDir, "set_apply_payload.jsonl"),
      proposal.rows,
    ),
    "excluded_review_rows.jsonl": await writeJsonLines(
      path.join(options.outDir, "excluded_review_rows.jsonl"),
      proposal.excludedRows,
    ),
    "database_preflight.json": await writeJson(
      path.join(options.outDir, "database_preflight.json"),
      databasePreflight,
    ),
    "rollback_contract.json": await writeJson(
      path.join(options.outDir, "rollback_contract.json"),
      rollbackContract,
    ),
    "summary.json": await writeJson(path.join(options.outDir, "summary.json"), summary),
    "validation_failures.jsonl": await writeJsonLines(
      path.join(options.outDir, "validation_failures.jsonl"),
      validationFailures,
    ),
  };
  const reportBody = Buffer.from(report(summary));
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), reportBody);
  artifacts["REPORT.md"] = reportBody;
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts: Object.entries(artifacts).sort(([left], [right]) => left.localeCompare(right))
      .map(([artifact_path, body]) => ({
        artifact_path,
        bytes: body.length,
        sha256: sha256(body),
      })),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (preflightFindings.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  const message = String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]");
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
