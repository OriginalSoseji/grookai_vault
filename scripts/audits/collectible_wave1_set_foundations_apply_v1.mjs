import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD,
  COLLECTIBLE_WAVE1_SET_FOUNDATIONS_VERSION,
  collectibleWave1SetDatabaseRowsV1,
  collectibleWave1SetProofFingerprintV1,
  evaluateCollectibleWave1SetDurableReadbackV1,
  parseCollectibleWave1SetPayloadV1,
  renderCollectibleWave1SetFoundationsMigrationV1,
} from "../../backend/catalog/collectible_wave1_set_foundations_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import {
  MIGRATION_PATH,
  PAYLOAD_PATH,
  captureBaseline,
  captureTransient,
} from "./collectible_wave1_set_foundations_rollback_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXECUTOR_VERSION = "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_APPLY_V1";
const TARGET_MIGRATION_NAME = "collectible_wave1_set_foundations_v1";
const TARGET_MIGRATION_FILE =
  `${COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION}_${TARGET_MIGRATION_NAME}.sql`;
const REVIEWED_MIGRATION_SHA256 =
  "0bef87cb2f487e84729a93aa2ba1bfb9b90cc559a10e981de34dcd1d7a8305fb";
const ROLLBACK_RUN_PLAN_FINGERPRINT =
  "e6daef9af7c9f0a489cd4c42a3f223194348dc0cca41268debb07a739497581c";
const EXECUTION_ACKNOWLEDGEMENT = "DURABLE_APPLY_505_HIDDEN_SETS";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const options = {
    mode: "",
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    executionAcknowledgement: "",
    outDir: "",
    preDryRunLog: "",
    applyLog: "",
    postDryRunLog: "",
  };
  for (const argument of argv) {
    if (argument === "--prepare-apply") options.mode = "prepare";
    else if (argument === "--post-apply-readback") options.mode = "readback";
    else if (argument.startsWith("--env-file=")) options.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--execution-acknowledgement=")) {
      options.executionAcknowledgement = argument.slice(28).trim();
    } else if (argument.startsWith("--out-dir=")) {
      options.outDir = path.resolve(argument.slice(10));
    } else if (argument.startsWith("--pre-dry-run-log=")) {
      options.preDryRunLog = path.resolve(argument.slice(18));
    } else if (argument.startsWith("--apply-log=")) {
      options.applyLog = path.resolve(argument.slice(12));
    } else if (argument.startsWith("--post-dry-run-log=")) {
      options.postDryRunLog = path.resolve(argument.slice(19));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!new Set(["prepare", "readback"]).has(options.mode)) {
    throw new Error("Exactly one of --prepare-apply or --post-apply-readback is required");
  }
  if (!/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (options.executionAcknowledgement !== EXECUTION_ACKNOWLEDGEMENT) {
    throw new Error(`--execution-acknowledgement=${EXECUTION_ACKNOWLEDGEMENT} is required`);
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  if (options.mode === "readback" &&
      (!options.preDryRunLog || !options.applyLog || !options.postDryRunLog)) {
    throw new Error("CLI evidence logs are required for post-apply readback");
  }
  return options;
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: applicationName,
    options: "-c default_transaction_read_only=on",
  };
}

async function writeJson(filePath, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, body, "utf8");
  return Buffer.from(body);
}

async function frozenInputs() {
  const [payloadBody, migrationBody] = await Promise.all([
    fs.readFile(PAYLOAD_PATH),
    fs.readFile(MIGRATION_PATH),
  ]);
  const payloadRows = parseCollectibleWave1SetPayloadV1(payloadBody);
  const databaseRows = collectibleWave1SetDatabaseRowsV1(payloadRows)
    .sort((left, right) => left.code.localeCompare(right.code));
  const rendered = Buffer.from(renderCollectibleWave1SetFoundationsMigrationV1(payloadRows));
  if (!migrationBody.equals(rendered)) {
    throw new Error("Committed migration is not the deterministic payload rendering");
  }
  if (sha256(migrationBody) !== REVIEWED_MIGRATION_SHA256) {
    throw new Error("Reviewed migration SHA-256 mismatch");
  }
  return { payloadBody, migrationBody, databaseRows };
}

function repositoryState(expectedHeadSha) {
  const commitSha = git("rev-parse", "HEAD");
  if (commitSha !== expectedHeadSha) throw new Error("Repository SHA does not match guard");
  if (git("status", "--porcelain", "--untracked-files=no")) {
    throw new Error("Tracked working tree is dirty");
  }
  return {
    commit_sha: commitSha,
    branch: process.env.GITHUB_REF_NAME || git("branch", "--show-current"),
    default_branch: process.env.GITHUB_EVENT_REPOSITORY_DEFAULT_BRANCH || "main",
  };
}

function authorizedBoundaries() {
  return {
    authorized_durable_changes: {
      public_sets_inserted: 505,
      yugioh_sets_inserted: 500,
      gundam_sets_inserted: 5,
      migration_ledger_rows_inserted: 1,
    },
    forbidden_durable_changes: {
      existing_rows_updated_or_deleted: 0,
      cards_identities_printings_mappings: 0,
      storage_images_pricing_publication_vault: 0,
      release_control_changes: 0,
      app_visibility_enabled: false,
    },
  };
}

function loadDatabaseUrl(envFile) {
  dotenv.config({ path: envFile, quiet: true });
  return marketEvidenceDbUrl();
}

async function prepareApply(options) {
  await fs.mkdir(options.outDir, { recursive: true });
  const inputs = await frozenInputs();
  const repository = repositoryState(options.expectedHeadSha);
  const frozenPlan = {
    version: `${EXECUTOR_VERSION}_FROZEN_EXECUTION_PLAN`,
    recorded_at: new Date().toISOString(),
    repository,
    migration: {
      version: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION,
      name: TARGET_MIGRATION_NAME,
      file: `supabase/migrations/${TARGET_MIGRATION_FILE}`,
      bytes: inputs.migrationBody.length,
      sha256: sha256(inputs.migrationBody),
    },
    payload: {
      rows: inputs.databaseRows.length,
      bytes: inputs.payloadBody.length,
      sha256: sha256(inputs.payloadBody),
      fingerprint_sha256: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.fingerprint_sha256,
    },
    rollback_authority: {
      run_plan_fingerprint_sha256: ROLLBACK_RUN_PLAN_FINGERPRINT,
      status: "passed_zero_durable_change",
    },
    ...authorizedBoundaries(),
    execution_acknowledgement: options.executionAcknowledgement,
  };
  frozenPlan.fingerprint_sha256 = collectibleWave1SetProofFingerprintV1(frozenPlan);
  await writeJson(path.join(options.outDir, "frozen_execution_plan.json"), frozenPlan);

  const connectionString = loadDatabaseUrl(options.envFile);
  const baseline = await captureBaseline(
    connectionString,
    inputs.databaseRows,
    "collectible-wave1-set-foundations-apply-preflight-v1",
  );
  const { evaluateCollectibleWave1SetRollbackBaselineV1 } = await import(
    "../../backend/catalog/collectible_wave1_set_foundations_v1.mjs"
  );
  const findings = evaluateCollectibleWave1SetRollbackBaselineV1(baseline);
  await writeJson(path.join(options.outDir, "pre_apply_readback.json"), baseline);
  const applyPlanCore = {
    ...frozenPlan,
    version: `${EXECUTOR_VERSION}_PLAN`,
    preflight: {
      status: findings.length ? "failed" : "passed",
      findings,
      latest_migration: baseline.latest_migration,
      candidate_migration_count: Number(baseline.candidate_migration_count),
      existing_selected_set_count: Number(baseline.existing_selected_set_count),
      existing_wave1_set_count: Number(baseline.existing_wave1_set_count),
      collision_count: ["planned_id_collision_count", "planned_code_collision_count",
        "planned_source_proposal_collision_count", "planned_game_name_collision_count"]
        .reduce((sum, field) => sum + Number(baseline[field] ?? 0), 0),
    },
    protected_counts_before: baseline.protected_counts,
  };
  const applyPlan = {
    ...applyPlanCore,
    apply_plan_fingerprint_sha256: collectibleWave1SetProofFingerprintV1(applyPlanCore),
  };
  await writeJson(path.join(options.outDir, "apply_plan.json"), applyPlan);
  if (findings.length) throw new Error(`Durable apply preflight failed: ${findings.join(",")}`);
  process.stdout.write(`${JSON.stringify({
    status: "durable_apply_preflight_passed",
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    target_migration: TARGET_MIGRATION_FILE,
    output_directory: options.outDir,
  }, null, 2)}\n`);
}

async function captureDurableReadback(connectionString, databaseRows, applicationName) {
  const client = new pg.Client(clientOptions(connectionString, applicationName));
  await client.connect();
  let open = false;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const transient = await captureTransient(client, databaseRows);
    const { rows } = await client.query(`select jsonb_build_object(
      'transaction_read_only', current_setting('transaction_read_only')::boolean,
      'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
      'ledger_rows', (select coalesce(jsonb_agg(jsonb_build_object(
        'version', version, 'name', name,
        'statement_count', coalesce(array_length(statements, 1), 0)
      ) order by version), '[]'::jsonb) from supabase_migrations.schema_migrations
        where version = $1),
      'ledger_statements', (select to_jsonb(statements)
        from supabase_migrations.schema_migrations where version = $1)
    ) as value`, [COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION]);
    await client.query("rollback");
    open = false;
    const ledgerStatements = rows[0].value.ledger_statements ?? [];
    return {
      ...transient,
      transaction_read_only: rows[0].value.transaction_read_only,
      latest_migration: rows[0].value.latest_migration,
      ledger_rows: rows[0].value.ledger_rows,
      ledger_statement_sha256: ledgerStatements.map((statement) => sha256(statement)),
      database_writes_during_readback: false,
    };
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function migrationVersions(log) {
  return [...new Set(log.match(/\b20\d{12}(?=_|\b)/g) ?? [])].sort();
}

function protectedCountDiagnostics(before, after) {
  return Object.fromEntries([...new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])].sort().map((key) => [key, {
    before: Number(before?.[key] ?? 0),
    after: Number(after?.[key] ?? 0),
    delta: Number(after?.[key] ?? 0) - Number(before?.[key] ?? 0),
    attribution: key === "sets" ? "contains_authorized_505_set_insert_plus_concurrent_activity" :
      "concurrent_activity_diagnostic_not_attributed_to_frozen_migration",
  }]));
}

function attributableReadback(readback) {
  const copy = structuredClone(readback);
  delete copy.protected_counts;
  delete copy.latest_migration;
  return copy;
}

async function readCliLog(filePath) {
  const body = await fs.readFile(filePath, "utf8");
  if (/postgres(?:ql)?:\/\/|SUPABASE_DB_URL|(?:password|passwd|pwd)\s*[=:]/i.test(body)) {
    throw new Error(`CLI evidence contains credential material: ${path.basename(filePath)}`);
  }
  return {
    path: path.basename(filePath),
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    migration_versions: migrationVersions(body),
    remote_database_up_to_date: /remote database is up to date/i.test(body),
  };
}

async function preserveArtifacts(outDir, values) {
  const report = `# Collectible Wave 1 Set Foundations Durable Apply V1\n\n` +
    `- Status: \`${values.summary.status}\`\n` +
    `- Repository SHA: \`${values.summary.repository.commit_sha}\`\n` +
    `- Migration SHA-256: \`${REVIEWED_MIGRATION_SHA256}\`\n` +
    `- Exact set rows: \`${values.summary.set_rows}\`\n` +
    `- Ledger rows: \`${values.summary.migration_ledger_rows}\`\n` +
    `- Direct RLS visibility: \`anon ${values.summary.rls_visible_set_counts.anon}` +
      ` / authenticated ${values.summary.rls_visible_set_counts.authenticated}\`\n` +
    `- Findings: \`${values.summary.findings.length}\`\n`;
  const bodies = {};
  for (const [name, value] of Object.entries(values.artifacts)) {
    bodies[name] = await writeJson(path.join(outDir, name), value);
  }
  bodies["REPORT.md"] = Buffer.from(`${report}\n`);
  await fs.writeFile(path.join(outDir, "REPORT.md"), bodies["REPORT.md"]);
  for (const name of ["frozen_execution_plan.json", "apply_plan.json",
    "pre_apply_readback.json", "pre_cli_dry_run.txt", "apply_cli.txt",
    "post_cli_dry_run.txt"]) {
    bodies[name] = await fs.readFile(path.join(outDir, name));
  }
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifact_path, body]) => ({
      artifact_path,
      bytes: body.length,
      sha256: sha256(body),
    })).sort((left, right) => left.artifact_path.localeCompare(right.artifact_path)),
  });
}

async function postApplyReadback(options) {
  const inputs = await frozenInputs();
  const repository = repositoryState(options.expectedHeadSha);
  const planPath = path.join(options.outDir, "apply_plan.json");
  const [planBody, baselineBody, preLog, applyLog, postLog] = await Promise.all([
    fs.readFile(planPath),
    fs.readFile(path.join(options.outDir, "pre_apply_readback.json")),
    readCliLog(options.preDryRunLog),
    readCliLog(options.applyLog),
    readCliLog(options.postDryRunLog),
  ]);
  const plan = JSON.parse(planBody);
  const baseline = JSON.parse(baselineBody);
  await Promise.all([
    fs.copyFile(options.preDryRunLog, path.join(options.outDir, "pre_cli_dry_run.txt")),
    fs.copyFile(options.applyLog, path.join(options.outDir, "apply_cli.txt")),
    fs.copyFile(options.postDryRunLog, path.join(options.outDir, "post_cli_dry_run.txt")),
  ]);
  const connectionString = loadDatabaseUrl(options.envFile);
  const primary = await captureDurableReadback(
    connectionString,
    inputs.databaseRows,
    "collectible-wave1-set-foundations-apply-readback-v1",
  );
  const independent = await captureDurableReadback(
    connectionString,
    inputs.databaseRows,
    "collectible-wave1-set-foundations-independent-readback-v1",
  );
  const findings = evaluateCollectibleWave1SetDurableReadbackV1(
    primary,
    inputs.databaseRows,
    baseline,
  );
  const independentFindings = evaluateCollectibleWave1SetDurableReadbackV1(
    independent,
    inputs.databaseRows,
    baseline,
  );
  if (JSON.stringify(attributableReadback(primary)) !==
      JSON.stringify(attributableReadback(independent))) {
    findings.push("independent_readback_mismatch");
  }
  if (JSON.stringify(preLog.migration_versions) !==
      JSON.stringify([COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION])) {
    findings.push("pre_apply_cli_migration_set_mismatch");
  }
  if (!applyLog.migration_versions.includes(COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION)) {
    findings.push("apply_cli_target_missing");
  }
  if (postLog.migration_versions.length !== 0 || !postLog.remote_database_up_to_date) {
    findings.push("post_apply_cli_not_up_to_date");
  }
  findings.push(...independentFindings.map((finding) => `independent:${finding}`));
  const uniqueFindings = [...new Set(findings)].sort();
  const execution = {
    version: `${EXECUTOR_VERSION}_EXECUTION`,
    recorded_at: new Date().toISOString(),
    source_commit: repository.commit_sha,
    apply_plan_sha256: sha256(planBody),
    apply_plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    command_metadata: {
      tool: "supabase_cli",
      version: "2.90.0",
      dry_run_command: "supabase db push --db-url <redacted> --dry-run",
      apply_command: "supabase db push --db-url <redacted> --yes",
      secrets_recorded: false,
    },
    cli_evidence: { pre_apply: preLog, apply: applyLog, post_apply: postLog },
    result: {
      status: uniqueFindings.length ? "failed_readback" : "success",
      applied_migrations: [TARGET_MIGRATION_FILE],
      other_migrations_applied: 0,
    },
    attributable_write_proof: {
      frozen_migration_sha256: REVIEWED_MIGRATION_SHA256,
      cli_pending_migration_versions: preLog.migration_versions,
      exact_target_set_rows: primary.sets.length,
      exact_target_ledger_rows: primary.ledger_rows.length,
      target_dependent_rows: {
        card_prints: Number(primary.card_print_count),
        legacy_cards: Number(primary.legacy_card_count),
        identities: Number(primary.identity_count),
        printings: Number(primary.printing_count),
        external_mappings: Number(primary.external_mapping_count),
        external_printing_mappings: Number(primary.external_printing_mapping_count),
      },
    },
    ...authorizedBoundaries(),
  };
  const summary = {
    version: `${EXECUTOR_VERSION}_SUMMARY`,
    recorded_at: execution.recorded_at,
    status: uniqueFindings.length ? "durable_apply_verification_failed" :
      "durable_apply_verified",
    repository,
    migration_sha256: REVIEWED_MIGRATION_SHA256,
    payload_fingerprint_sha256: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.fingerprint_sha256,
    set_rows: primary.sets.length,
    set_partition: primary.sets.reduce((counts, row) => ({
      ...counts,
      [row.game]: (counts[row.game] ?? 0) + 1,
    }), {}),
    migration_ledger_rows: primary.ledger_rows.length,
    rls_visible_set_counts: primary.rls_visible_set_counts,
    protected_count_diagnostics: protectedCountDiagnostics(
      baseline.protected_counts,
      primary.protected_counts,
    ),
    findings: uniqueFindings,
    database_writes_during_readback: false,
  };
  await preserveArtifacts(options.outDir, {
    summary,
    artifacts: {
      "apply_execution.json": execution,
      "apply_readback.json": primary,
      "independent_readback.json": independent,
      "reconciliation_report.json": {
        version: `${EXECUTOR_VERSION}_RECONCILIATION`,
        status: uniqueFindings.length ? "mismatch" : "reconciled",
        findings: uniqueFindings,
        exact_set_rows: primary.sets.length,
        exact_unique_ids: new Set(primary.sets.map((row) => row.id)).size,
        exact_unique_codes: new Set(primary.sets.map((row) => row.code)).size,
        migration_ledger_rows: primary.ledger_rows.length,
        cli_evidence: execution.cli_evidence,
        independent_attributable_readback_matches:
          JSON.stringify(attributableReadback(primary)) ===
          JSON.stringify(attributableReadback(independent)),
        protected_count_diagnostics: protectedCountDiagnostics(
          baseline.protected_counts,
          primary.protected_counts,
        ),
      },
      "summary.json": summary,
    },
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    set_rows: summary.set_rows,
    migration_ledger_rows: summary.migration_ledger_rows,
    findings: uniqueFindings,
    output_directory: options.outDir,
  }, null, 2)}\n`);
  if (uniqueFindings.length) process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.mode === "prepare") await prepareApply(options);
  else await postApplyReadback(options);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${String(error?.message ?? error)
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")}\n`);
    process.exitCode = 1;
  });
}

export {
  EXECUTION_ACKNOWLEDGEMENT,
  EXECUTOR_VERSION,
  REVIEWED_MIGRATION_SHA256,
  TARGET_MIGRATION_FILE,
  captureDurableReadback,
  migrationVersions,
  parseArgs,
};
