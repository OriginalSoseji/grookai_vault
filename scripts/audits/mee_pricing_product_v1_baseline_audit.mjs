import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import "../../backend/env.mjs";
import { marketEvidenceQueryRows } from "../lib/market_evidence_db_query_v1.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "pricing",
  "mee_pricing_platform_production_v1",
);
const AUDIT_VERSION = "MEE_PRICING_PRODUCT_V1_BASELINE_AUDIT_V1";

function parseArgs(argv) {
  const args = {
    outRoot: DEFAULT_OUT_ROOT,
    includeSchemaDiff: true,
  };
  for (const arg of argv) {
    if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg === "--skip-schema-diff") {
      args.includeSchemaDiff = false;
    }
  }
  return args;
}

function timestampSegment(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: REPO_ROOT,
      timeout: options.timeout ?? 30_000,
      maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
      windowsHide: true,
      env: process.env,
    });
    return {
      command: [command, ...args],
      exit_code: 0,
      stdout: result.stdout?.trim() ?? "",
      stderr: result.stderr?.trim() ?? "",
    };
  } catch (error) {
    return {
      command: [command, ...args],
      exit_code:
        Number.isInteger(error.code) && error.code >= 0 ? error.code : 1,
      stdout: error.stdout?.trim() ?? "",
      stderr: error.stderr?.trim() ?? error.message,
    };
  }
}

async function git(args, options) {
  return run("git", args, options);
}

async function supabase(args, options) {
  if (process.platform === "win32") {
    return run("cmd.exe", ["/d", "/s", "/c", "supabase", ...args], options);
  }
  return run("supabase", args, options);
}

export function parseMigrationList(stdout) {
  const rows = [];
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(\d{8,14})?\s*\|\s*(\d{8,14})?\s*\|\s*(.+?)\s*$/,
    );
    if (!match) continue;
    rows.push({
      local: match[1] ?? null,
      remote: match[2] ?? null,
      time_utc: match[3],
    });
  }
  return {
    rows,
    local_only: rows
      .filter((row) => row.local && !row.remote)
      .map((row) => row.local),
    remote_only: rows
      .filter((row) => !row.local && row.remote)
      .map((row) => row.remote),
    aligned: rows
      .filter((row) => row.local && row.remote)
      .map((row) => row.local),
  };
}

export function parseWorktreePorcelain(stdout) {
  const worktrees = [];
  let current = null;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      current = { path: line.slice("worktree ".length) };
      worktrees.push(current);
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (current && line.startsWith("branch ")) {
      current.branch = line.slice("branch refs/heads/".length);
    } else if (current && line === "detached") {
      current.detached = true;
    }
  }
  return worktrees;
}

export function summarizeStatus(statusText) {
  const lines = statusText ? statusText.split(/\r?\n/).filter(Boolean) : [];
  return {
    clean: lines.length === 0,
    changed_paths: lines.length,
    tracked_paths: lines.filter((line) => !line.startsWith("??")).length,
    untracked_paths: lines.filter((line) => line.startsWith("??")).length,
    status_lines: lines,
  };
}

function projectRefFromConfig(configText) {
  return configText.match(/^\s*project_id\s*=\s*"([^"]+)"/m)?.[1] ?? null;
}

function repositorySystemdInventory(files) {
  return files.map(({ file, content }) => ({
    file,
    on_calendar:
      content.match(/^\s*OnCalendar=(.+)$/m)?.[1]?.trim() ?? null,
    exec_start: content.match(/^\s*ExecStart=(.+)$/m)?.[1]?.trim() ?? null,
    on_failure:
      content.match(/^\s*OnFailure=(.+)$/m)?.[1]?.trim() ?? null,
    failure_action:
      content.match(/^\s*FailureAction=(.+)$/m)?.[1]?.trim() ?? null,
  }));
}

function markdown(audit) {
  const lines = [
    "# MEE Pricing Platform Production V1 Baseline Audit",
    "",
    `- Audit version: \`${audit.audit_version}\``,
    `- Recorded at: \`${audit.recorded_at}\``,
    `- Commit: \`${audit.repository.commit_sha}\``,
    `- Branch: \`${audit.repository.branch}\``,
    `- Target project: \`${audit.environment.project_ref}\``,
    `- Original workspace changed by this audit: \`false\``,
    "",
    "## Migration Gate",
    "",
    `- Linked migration command: \`${audit.migrations.list_exit_code === 0 ? "pass" : "fail"}\``,
    `- Local-only migrations: \`${audit.migrations.local_only.join(", ") || "none"}\``,
    `- Remote-only migrations: \`${audit.migrations.remote_only.join(", ") || "none"}\``,
    `- Linked schema diff: \`${audit.migrations.schema_diff.status}\``,
    `- Linked schema diff bytes: \`${audit.migrations.schema_diff.bytes}\``,
    `- Linked schema diff SHA-256: \`${audit.migrations.schema_diff.sha256 ?? "not_recorded"}\``,
    "",
    "The production migration gate remains closed while the linked schema diff is nonempty.",
    "",
    "## Production Truth",
    "",
    "| Metric | Value |",
    "|---|---:|",
    ...audit.production.metrics.map(
      (row) => `| ${row.metric} | ${row.value} |`,
    ),
    "",
    "## Operational Findings",
    "",
    ...audit.findings.map((finding) => `- **${finding.severity}:** ${finding.text}`),
    "",
    "## Repository Scheduling",
    "",
    "| File | Calendar | OnFailure |",
    "|---|---|---|",
    ...audit.repository.systemd.map(
      (unit) =>
        `| \`${unit.file}\` | \`${unit.on_calendar ?? "n/a"}\` | \`${unit.on_failure ?? "none"}\` |`,
    ),
    "",
    "## Boundaries",
    "",
    "- This audit used read-only production queries.",
    "- It made no database writes, migration applies, publication writes, client deploys, or scheduler changes.",
    "- Environment values and systemd command bodies are not included in the Markdown summary.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function collectWorktrees() {
  const worktreeResult = await git(["worktree", "list", "--porcelain"]);
  if (worktreeResult.exit_code !== 0) {
    throw new Error(`git worktree list failed: ${worktreeResult.stderr}`);
  }
  const worktrees = parseWorktreePorcelain(worktreeResult.stdout);
  for (const worktree of worktrees) {
    const status = await git([
      "-C",
      worktree.path,
      "status",
      "--short",
    ]);
    worktree.status = summarizeStatus(status.stdout);
  }
  return worktrees;
}

async function collectSystemdInventory() {
  const systemdDir = path.join(REPO_ROOT, "deploy", "systemd");
  const names = (await fs.readdir(systemdDir))
    .filter((name) => /\.(service|timer)(\.candidate)?$/.test(name))
    .sort();
  const files = await Promise.all(
    names.map(async (name) => ({
      file: `deploy/systemd/${name}`,
      content: await fs.readFile(path.join(systemdDir, name), "utf8"),
    })),
  );
  return repositorySystemdInventory(files);
}

async function collectProduction() {
  const metrics = await marketEvidenceQueryRows(`
    select 'card_prints' as metric, count(*)::bigint::text as value
    from public.card_prints
    union all
    select 'card_printings', count(*)::bigint::text
    from public.card_printings
    union all
    select 'tcgcsv_source_sync_runs', count(*)::bigint::text
    from public.tcgcsv_source_sync_runs
    union all
    select 'market_pricing_pipeline_phase_events', count(*)::bigint::text
    from public.market_pricing_pipeline_phase_runs
    union all
    select
      'tcgcsv_price_observations_estimate',
      coalesce(s.n_live_tup, 0)::bigint::text
    from pg_stat_user_tables s
    where s.schemaname = 'public'
      and s.relname = 'tcgcsv_source_price_daily_observations'
  `);

  const pricingObjects = await marketEvidenceQueryRows(`
    select
      case c.relkind
        when 'r' then 'table'
        when 'v' then 'view'
        when 'm' then 'materialized_view'
        when 'i' then 'index'
        else c.relkind::text
      end as object_type,
      c.relname as object_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        c.relname like 'market_price%'
        or c.relname like 'v_market_price%'
        or c.relname like 'v_tcgplayer_market%'
        or c.relname like 'market_pricing_pipeline%'
      )
    order by object_type, object_name
  `);

  const cronJobs = await marketEvidenceQueryRows(`
    select jobid, schedule, active, database, username, jobname
    from cron.job
    order by jobid
  `);

  const phaseSummary = await marketEvidenceQueryRows(`
    select
      pipeline,
      phase,
      status,
      count(*)::integer as event_count,
      max(created_at) as latest_at
    from public.market_pricing_pipeline_phase_runs
    where created_at >= now() - interval '14 days'
    group by pipeline, phase, status
    order by pipeline, phase, status
  `);

  const syncSummary = await marketEvidenceQueryRows(`
    select
      sync_mode,
      status,
      count(*)::integer as run_count,
      max(finished_at) as latest_finished_at,
      sum(price_row_count)::bigint as price_rows,
      sum(failed_count)::bigint as failed_count
    from public.tcgcsv_source_sync_runs
    where created_at >= now() - interval '14 days'
    group by sync_mode, status
    order by sync_mode, status
  `);

  const staleRuns = await marketEvidenceQueryRows(`
    select
      id,
      run_key,
      sync_mode,
      status,
      started_at,
      finished_at,
      request_count,
      price_row_count,
      failed_count,
      git_commit_sha
    from public.tcgcsv_source_sync_runs
    where status = 'running'
      and started_at < now() - interval '6 hours'
    order by started_at desc
  `);

  const recentPhaseFailures = await marketEvidenceQueryRows(`
    select
      pipeline,
      phase,
      run_key,
      status,
      started_at,
      finished_at,
      failed_count,
      error,
      created_at
    from public.market_pricing_pipeline_phase_runs
    where status in ('failed', 'warning')
      and created_at >= now() - interval '14 days'
    order by created_at desc
    limit 50
  `);

  return {
    metrics,
    pricing_objects: pricingObjects,
    cron_jobs: cronJobs,
    phase_summary_14d: phaseSummary,
    source_sync_summary_14d: syncSummary,
    stale_source_sync_runs: staleRuns,
    recent_phase_failures: recentPhaseFailures,
  };
}

function deriveFindings(audit) {
  const findings = [];
  const schemaDiff = audit.migrations.schema_diff;
  if (schemaDiff.status === "nonempty") {
    findings.push({
      severity: "BLOCKING",
      code: "linked_schema_diff_nonempty",
      text: `Linked schema diff is nonempty (${schemaDiff.bytes} bytes); remote migration apply remains blocked pending reconciliation.`,
    });
  }
  if (audit.migrations.remote_only.length > 0) {
    findings.push({
      severity: "BLOCKING",
      code: "remote_only_migrations",
      text: `Remote-only migration IDs exist: ${audit.migrations.remote_only.join(", ")}.`,
    });
  }
  const staleCount = audit.production.stale_source_sync_runs.length;
  if (staleCount > 0) {
    findings.push({
      severity: "HIGH",
      code: "stale_running_source_syncs",
      text: `${staleCount} source sync runs remain in running status more than six hours after start.`,
    });
  }
  const failedPhases = audit.production.recent_phase_failures.length;
  if (failedPhases > 0) {
    findings.push({
      severity: "HIGH",
      code: "recent_pipeline_phase_failures",
      text: `${failedPhases} failed or warning MEE phase events were recorded in the last 14 days.`,
    });
  }
  if (
    audit.repository.systemd.some(
      (unit) =>
        unit.file.includes("mee-nightly.service") && !unit.on_failure,
    )
  ) {
    findings.push({
      severity: "HIGH",
      code: "mee_systemd_onfailure_missing",
      text: "The repository MEE nightly service has no systemd OnFailure route.",
    });
  }
  if (
    !audit.production.pricing_objects.some(
      (object) =>
        object.object_name === "market_price_publication_snapshots",
    )
  ) {
    findings.push({
      severity: "EXPECTED",
      code: "production_publication_model_not_applied",
      text: "Production does not yet contain the governed qualification/publication tables or shared read views.",
    });
  }
  findings.push({
    severity: "BOUNDARY",
    code: "original_workspace_preserved",
    text: "The original pricing/full-tcgcsv-warehouse worktree was audited read-only and not modified.",
  });
  return findings;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const recordedAt = new Date().toISOString();
  const runDir = path.join(args.outRoot, timestampSegment(new Date(recordedAt)));
  await fs.mkdir(runDir, { recursive: true });

  const [head, branch, status, remote, worktrees, systemd, configText] =
    await Promise.all([
      git(["rev-parse", "HEAD"]),
      git(["branch", "--show-current"]),
      git(["status", "--short"]),
      git(["remote", "-v"]),
      collectWorktrees(),
      collectSystemdInventory(),
      fs.readFile(path.join(REPO_ROOT, "supabase", "config.toml"), "utf8"),
    ]);
  if (head.exit_code !== 0 || branch.exit_code !== 0) {
    throw new Error("unable to establish repository provenance");
  }

  const migrationList = await supabase(["migration", "list", "--linked"], {
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const migrationSummary = parseMigrationList(migrationList.stdout);

  let schemaDiff = {
    status: "skipped",
    exit_code: null,
    bytes: 0,
    lines: 0,
    sha256: null,
    artifact_path: null,
  };
  if (args.includeSchemaDiff) {
    const result = await supabase(["db", "diff", "--linked"], {
      timeout: 10 * 60 * 1000,
      maxBuffer: 128 * 1024 * 1024,
    });
    const body = result.stdout.trim();
    const diffPath = path.join(runDir, "linked_schema_diff.sql");
    if (body) await fs.writeFile(diffPath, `${body}\n`);
    schemaDiff = {
      status:
        result.exit_code !== 0 ? "command_failed" : body ? "nonempty" : "empty",
      exit_code: result.exit_code,
      bytes: Buffer.byteLength(body),
      lines: body ? body.split(/\r?\n/).length : 0,
      sha256: body ? sha256(body) : null,
      artifact_path: body
        ? path.relative(REPO_ROOT, diffPath).replace(/\\/g, "/")
        : null,
      stderr: result.stderr,
    };
  }

  const audit = {
    audit_version: AUDIT_VERSION,
    recorded_at: recordedAt,
    environment: {
      project_ref: projectRefFromConfig(configText),
      supabase_url_host: process.env.SUPABASE_URL
        ? new URL(process.env.SUPABASE_URL).host
        : null,
      direct_database_read_available: Boolean(
        process.env.SUPABASE_DB_URL ??
          process.env.DATABASE_URL ??
          process.env.POSTGRES_URL,
      ),
      credential_values_recorded: false,
    },
    repository: {
      path: REPO_ROOT,
      commit_sha: head.stdout,
      branch: branch.stdout,
      status: summarizeStatus(status.stdout),
      remotes: remote.stdout.split(/\r?\n/).filter(Boolean),
      worktrees,
      systemd,
    },
    migrations: {
      list_exit_code: migrationList.exit_code,
      aligned_count: migrationSummary.aligned.length,
      local_only: migrationSummary.local_only,
      remote_only: migrationSummary.remote_only,
      schema_diff: schemaDiff,
    },
    production: await collectProduction(),
    boundaries: {
      read_only_database_queries: true,
      database_writes: false,
      migration_apply: false,
      scheduler_changes: false,
      deployment_changes: false,
      original_workspace_changes: false,
    },
  };
  audit.findings = deriveFindings(audit);

  const jsonPath = path.join(runDir, "baseline_audit.json");
  const markdownPath = path.join(runDir, "BASELINE_AUDIT.md");
  await fs.writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  await fs.writeFile(markdownPath, markdown(audit));

  const hashes = {};
  for (const filePath of [jsonPath, markdownPath]) {
    hashes[path.basename(filePath)] = sha256(await fs.readFile(filePath));
  }
  if (schemaDiff.artifact_path) {
    const diffPath = path.resolve(REPO_ROOT, schemaDiff.artifact_path);
    hashes[path.basename(diffPath)] = sha256(await fs.readFile(diffPath));
  }
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        audit_version: AUDIT_VERSION,
        status: audit.findings.some(
          (finding) => finding.severity === "BLOCKING",
        )
          ? "migration_gate_blocked"
          : "baseline_recorded",
        commit_sha: audit.repository.commit_sha,
        branch: audit.repository.branch,
        run_dir: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
        findings: audit.findings,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[mee-pricing-baseline-audit] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
