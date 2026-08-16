import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOnePieceDurableStagingPlanV1,
  sha256,
  validateOnePieceDurableStagingSqlV1,
  verifyOnePieceDurableStagingPlanV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const EXPECTED_BRANCH = "agent/one-piece-ingestion-readiness-v1";
const MIGRATION_CANDIDATE = path.join(
  ROOT,
  "docs",
  "sql",
  "one_piece_canonical_import_durable_staging_schema_v1_migration_candidate.sql",
);
const ROLLBACK_CANDIDATE = path.join(
  ROOT,
  "docs",
  "sql",
  "one_piece_canonical_import_durable_staging_schema_v1_rollback_candidate.sql",
);
const EXECUTION_SUMMARY = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_import_staging_and_canary_v1",
  "production_rollback_attribution_v2",
  "summary.json",
);
const INDEPENDENT_SUMMARY = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "one_piece_canonical_import_staging_and_canary_v1",
  "production_rollback_attribution_v2",
  "independent_verify",
  "summary.json",
);

function parseArgs(argv) {
  const args = {
    outDir: path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "one_piece_canonical_import_durable_staging_schema_v1",
      "offline_design_v1",
    ),
  };
  for (const arg of argv) {
    if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function report(summary, plan) {
  return `# One Piece Durable Service-Only Staging Schema V1

- Status: **${summary.status.toUpperCase()}**
- Producing commit: \`${summary.repository.commit_sha}\`
- Branch: \`${summary.repository.branch}\`
- Migration candidate SHA-256: \`${summary.migration_candidate_sha256}\`
- Rollback candidate SHA-256: \`${summary.rollback_candidate_sha256}\`
- Plan fingerprint: \`${summary.plan_fingerprint_sha256}\`
- Database connections: \`0\`
- Database writes: \`0\`

## Proven Input

The production rollback-only canary passed with plan
\`${plan.passed_rollback_canary.canary_plan_fingerprint_sha256}\`, and the
standalone verifier reported \`${plan.passed_rollback_canary.independent_status}\`.
The hash-bound canary draft remains unchanged.

## Durable Design Boundary

The candidate creates only two FORCE-RLS staging tables, one internal mutation
rejection function, two immutable triggers, four service-role policies, and two
indexes. Effective service-role authority is limited to SELECT and INSERT.
There is no canonical promotion, app RPC, public read, pricing publication,
Storage operation, image mutation, Vault write, or staging data write.

The rollback candidate is fail-closed: it refuses to run when either staging
table contains a row or when later migrations exist.

## Exact Next Gate

Run a separately governed production **read-only preflight** for proposed
migration \`${plan.proposed_migration.version}_${plan.proposed_migration.name}\`.
It must verify migration-version and object-name availability, capture effective
role privileges and protected-domain baselines, account for concurrent MTG
growth, and perform zero writes. Stop before copying this candidate into
\`supabase/migrations\` or applying it.
`;
}

export async function generateOnePieceDurableStagingDesignV1(args) {
  const branch = git(["branch", "--show-current"]);
  if (branch !== EXPECTED_BRANCH) throw new Error(`Unexpected branch: ${branch}`);
  const trackedStatus = git(["status", "--porcelain", "--untracked-files=no"]);
  if (trackedStatus) throw new Error("Tracked working tree must be clean");

  const [migrationSql, rollbackSql, executionBody, independentBody] = await Promise.all([
    fs.readFile(MIGRATION_CANDIDATE, "utf8"),
    fs.readFile(ROLLBACK_CANDIDATE, "utf8"),
    fs.readFile(EXECUTION_SUMMARY, "utf8"),
    fs.readFile(INDEPENDENT_SUMMARY, "utf8"),
  ]);
  const sqlValidation = validateOnePieceDurableStagingSqlV1({ migrationSql, rollbackSql });
  if (!sqlValidation.valid) {
    throw new Error(`SQL validation failed: ${sqlValidation.findings.join(", ")}`);
  }

  const execution = JSON.parse(executionBody);
  const independent = JSON.parse(independentBody);
  const repository = { commit_sha: git(["rev-parse", "HEAD"]), branch };
  const plan = buildOnePieceDurableStagingPlanV1({
    repository,
    migrationCandidateFile: relative(MIGRATION_CANDIDATE),
    migrationCandidateSha256: sha256(migrationSql),
    rollbackCandidateFile: relative(ROLLBACK_CANDIDATE),
    rollbackCandidateSha256: sha256(rollbackSql),
    executionSummaryFile: relative(EXECUTION_SUMMARY),
    executionSummarySha256: sha256(executionBody),
    executionStatus: execution.status,
    independentSummaryFile: relative(INDEPENDENT_SUMMARY),
    independentSummarySha256: sha256(independentBody),
    independentStatus: independent.status,
  });
  const planValidation = verifyOnePieceDurableStagingPlanV1(plan);
  if (!planValidation.valid) {
    throw new Error(`Plan validation failed: ${planValidation.findings.join(", ")}`);
  }

  const runPlan = {
    version: "ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_OFFLINE_GATE_V1",
    repository,
    mode: "offline_design_only",
    input_files: {
      migration_candidate: plan.proposed_migration,
      rollback_candidate: plan.rollback_candidate,
      passed_rollback_canary: plan.passed_rollback_canary,
    },
    database_connections: 0,
    database_writes: 0,
    boundaries: plan.boundaries,
  };
  const summary = {
    version: runPlan.version,
    recorded_at: new Date().toISOString(),
    status: "offline_durable_staging_design_ready_for_production_read_only_preflight",
    repository,
    migration_candidate_sha256: plan.proposed_migration.candidate_sha256,
    rollback_candidate_sha256: plan.rollback_candidate.sha256,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    sql_validation: sqlValidation,
    plan_validation: planValidation,
    database_connections: 0,
    database_writes: 0,
    exact_next_gate:
      "production read-only migration collision, security, migration-order, lock, and protected-boundary preflight; stop before migration placement or apply",
  };

  await fs.mkdir(args.outDir, { recursive: true });
  const artifacts = {};
  artifacts["run_plan.json"] = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  artifacts["schema_apply_plan.json"] = await writeJson(
    path.join(args.outDir, "schema_apply_plan.json"),
    plan,
  );
  artifacts["summary.json"] = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = Buffer.from(report(summary, plan), "utf8");
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody);
  artifacts["REPORT.md"] = reportBody;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.fromEntries(
      Object.entries(artifacts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, body]) => [name, sha256(body)]),
    ),
  });
  return { out_dir: args.outDir, ...summary };
}

async function main() {
  const result = await generateOnePieceDurableStagingDesignV1(
    parseArgs(process.argv.slice(2)),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
