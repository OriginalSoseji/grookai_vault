import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_ID = "MEE-DAILY-HEALTH-REPORT-V1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function latestArtifacts(pattern, limit = 3) {
  if (!existsSync(AUDIT_DIR)) return [];
  return readdirSync(AUDIT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => {
      const fullPath = path.join(AUDIT_DIR, entry.name);
      let parsed = null;
      if (entry.name.endsWith(".json")) {
        try {
          parsed = JSON.parse(readFileSync(fullPath, "utf8"));
        } catch {
          parsed = null;
        }
      }
      return {
        path: rel(fullPath),
        mtime_ms: existsSync(fullPath) ? statSync(fullPath).mtimeMs : null,
        package_fingerprint_sha256: parsed?.package_fingerprint_sha256 ?? null,
        findings: parsed?.findings ?? null,
        mode: parsed?.mode ?? null,
      };
    })
    .sort((left, right) => Number(right.mtime_ms ?? 0) - Number(left.mtime_ms ?? 0))
    .slice(0, limit);
}

function boundaryProof() {
  return {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    function_invocation: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    card_prints_writes: false,
    card_printings_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  };
}

async function withClient(fn) {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL or DATABASE_URL is required for the daily MEE health report.");
  }
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function query(client, key, sql) {
  try {
    const result = await client.query(sql);
    return { key, ok: true, rows: result.rows };
  } catch (error) {
    return { key, ok: false, error: String(error?.message ?? error) };
  }
}

function systemdTimerSnapshot() {
  if (process.platform === "win32") return { available: false, reason: "not_linux_systemd_host" };
  const result = spawnSync("systemctl", ["list-timers", "--all", "grookai-mee-*", "--no-pager"], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  return {
    available: result.status === 0,
    status: result.status,
    stdout_tail: (result.stdout ?? "").slice(-4000),
    stderr_tail: (result.stderr ?? "").slice(-2000),
  };
}

function renderTable(rows) {
  if (!rows.length) return "_No rows._";
  const columns = Object.keys(rows[0]);
  const header = `| ${columns.join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column] ?? "")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

const querySpecs = [
  {
    key: "reference_candidates_by_source",
    sql: `
      select source, count(*)::int as rows, max(created_at) as latest_created_at
      from public.market_reference_candidates
      group by source
      order by source;
    `,
  },
  {
    key: "reference_normalized_by_source",
    sql: `
      select source, count(*)::int as rows, max(normalized_at) as latest_normalized_at
      from public.market_reference_normalized_evidence
      group by source
      order by source;
    `,
  },
  {
    key: "listing_warehouse_counts",
    sql: `
      select 'market_listing_acquisition_runs' as table_name, count(*)::int as rows, max(created_at) as latest_created_at from public.market_listing_acquisition_runs
      union all select 'market_listing_query_cache', count(*)::int, max(created_at) from public.market_listing_query_cache
      union all select 'market_listing_raw_snapshots', count(*)::int, max(created_at) from public.market_listing_raw_snapshots
      union all select 'market_listing_observations', count(*)::int, max(created_at) from public.market_listing_observations
      union all select 'market_listing_card_candidates', count(*)::int, max(created_at) from public.market_listing_card_candidates
      union all select 'market_listing_rollups', count(*)::int, max(created_at) from public.market_listing_rollups
      union all select 'market_listing_price_events', count(*)::int, max(created_at) from public.market_listing_price_events
      order by table_name;
    `,
  },
  {
    key: "lifecycle_current_state",
    sql: `
      select 'market_evidence_observations' as metric, count(*)::int as rows, max(created_at) as latest_created_at
      from public.market_evidence_observations
      union all
      select 'market_evidence_lifecycle_events', count(*)::int, max(created_at)
      from public.market_evidence_lifecycle_events
      union all
      select 'lifecycle_public_boundary_rows', count(*)::int, max(created_at)
      from public.market_evidence_lifecycle_events
      where publishable or app_visible or market_truth
      order by metric;
    `,
  },
  {
    key: "review_disposition_status",
    sql: `
      select review_lane, review_status, review_disposition, count(*)::int as rows
      from public.market_evidence_review_dispositions
      group by review_lane, review_status, review_disposition
      order by review_lane, review_status, review_disposition;
    `,
  },
  {
    key: "publication_gate_candidates",
    sql: `
      select gate_decision, evidence_lane, count(*)::int as rows
      from public.v_market_evidence_publication_gate_candidates_v1
      group by gate_decision, evidence_lane
      order by gate_decision, evidence_lane;
    `,
  },
  {
    key: "normalization_assignment_queue",
    sql: `
      select source, assignment_queue_reason, count(*)::int as rows
      from public.v_market_evidence_normalization_assignment_queue_v1
      group by source, assignment_queue_reason
      order by source, assignment_queue_reason;
    `,
  },
  {
    key: "public_boundary_probe",
    sql: `
      select
        (select count(*)::int from public.market_evidence_lifecycle_events where publishable or app_visible or market_truth) as lifecycle_public_rows,
        (select count(*)::int from public.market_evidence_review_dispositions where publishable or app_visible or market_truth or can_publish_price_directly) as disposition_public_rows,
        (select count(*)::int from public.market_listing_card_candidates where can_publish_price_directly) as listing_candidate_direct_publish_rows;
    `,
  },
];

mkdirSync(AUDIT_DIR, { recursive: true });

const queryResults = await withClient(async (client) => {
  const results = {};
  for (const spec of querySpecs) {
    results[spec.key] = await query(client, spec.key, spec.sql);
  }
  return results;
});

const findings = [];
for (const [key, result] of Object.entries(queryResults)) {
  if (!result.ok) findings.push(`${key}_query_failed`);
}
const publicProbe = queryResults.public_boundary_probe?.rows?.[0] ?? {};
for (const [key, value] of Object.entries(publicProbe)) {
  if (Number(value ?? 0) !== 0) findings.push(`${key}_nonzero`);
}

const reportBasis = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  health_status: findings.length === 0 ? "pass" : "needs_attention",
  query_results: queryResults,
  latest_artifacts: {
    reference_delta_writer: latestArtifacts(/^mee_reference_warehouse_delta_writer_v1_.*\.json$/),
    reference_refresh_worker: latestArtifacts(/^mee_reference_source_refresh_worker_v1_.*\.json$/),
    post_ingest_orchestrator: latestArtifacts(/^mee_nightly_post_ingest_orchestrator_v1_.*\.json$/),
    foundation_checkpoint: latestArtifacts(/^mee_core_foundation_complete_v2_.*\.json$/),
  },
  systemd_timers: systemdTimerSnapshot(),
  boundary: boundaryProof(),
  findings,
};

const report = {
  ...reportBasis,
  package_fingerprint_sha256: sha256(reportBasis),
};

const fileStamp = stamp();
const jsonPath = path.join(AUDIT_DIR, `mee_daily_health_report_v1_${fileStamp}.json`);
const mdPath = path.join(AUDIT_DIR, `mee_daily_health_report_v1_${fileStamp}.md`);

const markdown = `# ${PACKAGE_ID}

## Status

- Health status: \`${report.health_status}\`
- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Findings: ${report.findings.length ? report.findings.map((finding) => `\`${finding}\``).join(", ") : "`none`"}
- Public/app-visible pricing writes: \`false\`

## Reference Candidates By Source

${renderTable(queryResults.reference_candidates_by_source?.rows ?? [])}

## Reference Normalized By Source

${renderTable(queryResults.reference_normalized_by_source?.rows ?? [])}

## Listing Warehouse Counts

${renderTable(queryResults.listing_warehouse_counts?.rows ?? [])}

## Lifecycle Current State

${renderTable(queryResults.lifecycle_current_state?.rows ?? [])}

## Review Disposition Status

${renderTable(queryResults.review_disposition_status?.rows ?? [])}

## Publication Gate Candidates

${renderTable(queryResults.publication_gate_candidates?.rows ?? [])}

## Normalization Assignment Queue

${renderTable(queryResults.normalization_assignment_queue?.rows ?? [])}

## Public Boundary Probe

\`\`\`json
${JSON.stringify(publicProbe, null, 2)}
\`\`\`

## Timers

\`\`\`
${report.systemd_timers.stdout_tail ?? report.systemd_timers.reason ?? ""}
\`\`\`

## Latest Artifacts

\`\`\`json
${JSON.stringify(report.latest_artifacts, null, 2)}
\`\`\`
`;

writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, markdown);

console.log(JSON.stringify({
  package_id: PACKAGE_ID,
  health_status: report.health_status,
  findings: report.findings,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  artifacts: {
    json: rel(jsonPath),
    markdown: rel(mdPath),
  },
}, null, 2));
