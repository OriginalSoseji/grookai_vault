import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluatePricingTrustSampleV1,
  PRICING_TRUST_SPOT_CHECK_POLICY_V1,
} from "../../backend/pricing/pricing_trust_spot_check_policy_v1.mjs";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "release",
  "pricing_trust_spot_check_v1",
);
const AUDIT_VERSION = "PRICING_TRUST_SPOT_CHECK_AUDIT_V1";

function parseArgs(argv) {
  const value = (name) =>
    argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";
  const sampleSize = Number.parseInt(value("sample-size") || "20", 10);
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100) {
    throw new Error("--sample-size must be between 1 and 100");
  }
  return {
    sampleSize,
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
    requirePass: argv.includes("--require-pass"),
  };
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function git(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeArtifacts(runDir, files) {
  const hashes = {};
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(runDir, name), contents);
    hashes[name] = sha256(contents);
  }
  const hashText = `${JSON.stringify(hashes, null, 2)}\n`;
  await fs.writeFile(path.join(runDir, "artifact_hashes.json"), hashText);
}

function reportMarkdown(summary, samples, sourceHealth) {
  return `${[
    "# Pricing Trust Spot Check V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Samples: \`${summary.passed_samples}/${summary.sample_count}\``,
    `- Current exact prices: \`${summary.current_exact_price_count}\``,
    `- Source continuity: \`${sourceHealth.continuity_mode}\``,
    `- Latest source status: \`${sourceHealth.latest_status}\``,
    `- Database writes: \`0\``,
    "",
    "## Samples",
    "",
    ...samples.map((sample) =>
      `- \`${sample.identity.printing_gv_id}\` ${sample.identity.name} (${sample.identity.finish_key}): $${Number(sample.read_model.market_close).toFixed(2)} - ${sample.findings.length ? `FAILED: ${sample.findings.join(", ")}` : "passed"}`,
    ),
    "",
    "## Findings",
    "",
    ...(summary.findings.length ? summary.findings.map((finding) => `- \`${finding}\``) : ["- none"]),
    "",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = databaseUrl();
  if (!url) throw new Error("database connection string is required");
  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const plan = {
    audit_version: AUDIT_VERSION,
    policy_version: PRICING_TRUST_SPOT_CHECK_POLICY_V1,
    mode: "read_only",
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    sample_size: args.sampleSize,
    boundaries: { database_reads: true, database_writes: false, customer_data: false },
  };

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 125_000,
    application_name: "pricing-trust-spot-check-v1",
  });
  const samples = [];
  let sourceHealth = null;
  let currentExactPriceCount = 0;
  await client.connect();
  try {
    await client.query("begin read only");
    const current = (
      await client.query(
        `select count(*)::integer as exact_price_count
           from public.v_market_price_current_v1`,
      )
    ).rows[0];
    currentExactPriceCount = Number(current.exact_price_count ?? 0);
    const selected = (
      await client.query(
        `select
           price.card_printing_id::text,
           price.card_print_id::text,
           price.gv_id,
           price.printing_gv_id,
           price.finish_key,
           price.provenance_id::text,
           card.name,
           card.number,
           card.set_code
         from public.v_market_price_current_v1 price
         join public.card_prints card on card.id = price.card_print_id
         order by md5(price.card_printing_id::text)
         limit $1`,
        [args.sampleSize],
      )
    ).rows;
    if (selected.length !== args.sampleSize) {
      throw new Error(`sample size mismatch: expected ${args.sampleSize}, got ${selected.length}`);
    }

    for (const identity of selected) {
      const readModel = (
        await client.query(
          `select * from public.get_market_pricing_read_model_v1(null::uuid[], array[$1::uuid])`,
          [identity.card_printing_id],
        )
      ).rows[0] ?? null;
      const trace = readModel?.provenance_id
        ? (
            await client.query(`select public.get_market_price_trace_v1($1::uuid) as trace`, [readModel.provenance_id])
          ).rows[0]?.trace ?? null
        : null;
      const sourceObservation = trace?.source_observation_id
        ? (
            await client.query(
              `select id::text, source_price_row_identity, product_id, subtype_name,
                      observed_on, market_price, currency, payload_hash
                 from public.tcgcsv_source_price_daily_observations
                where id = $1::uuid`,
              [trace.source_observation_id],
            )
          ).rows[0] ?? null
        : null;
      const sample = {
        identity: {
          ...identity,
          card_print_id: identity.card_print_id,
          card_printing_id: identity.card_printing_id,
        },
        read_model: readModel,
        trace,
        source_observation: sourceObservation,
      };
      samples.push({ ...sample, findings: evaluatePricingTrustSampleV1(sample) });
    }

    const source = (
      await client.query(
        `select run_key, status, source_marker, finished_at, price_row_count, failed_count
           from public.tcgcsv_source_sync_runs
          where sync_mode = 'current_full_sync'
          order by finished_at desc nulls last, created_at desc
          limit 1`,
      )
    ).rows[0] ?? null;
    sourceHealth = {
      latest_run_key: source?.run_key ?? null,
      latest_status: source?.status ?? null,
      source_marker: source?.source_marker ?? null,
      finished_at: source?.finished_at ?? null,
      price_row_count: Number(source?.price_row_count ?? 0),
      failed_count: Number(source?.failed_count ?? 0),
      continuity_mode: source?.status === "completed" ? "completed_sync" : source?.status === "skipped_no_change" ? "verified_no_change_candidate" : "unverified",
    };
    await client.query("rollback");
  } finally {
    await client.end().catch(() => {});
  }

  const findings = [...new Set(samples.flatMap((sample) => sample.findings))].sort();
  if (!currentExactPriceCount) findings.push("no_current_exact_prices");
  if (!sourceHealth || !["completed", "skipped_no_change"].includes(sourceHealth.latest_status)) {
    findings.push("latest_source_continuity_unverified");
  }
  const summary = {
    audit_version: AUDIT_VERSION,
    policy_version: PRICING_TRUST_SPOT_CHECK_POLICY_V1,
    status: findings.length ? "failed" : "passed",
    sample_count: samples.length,
    passed_samples: samples.filter((sample) => sample.findings.length === 0).length,
    current_exact_price_count: currentExactPriceCount,
    findings: [...new Set(findings)].sort(),
    database_writes: 0,
  };
  const files = {
    "run_plan.json": `${JSON.stringify(plan, null, 2)}\n`,
    "source_health.json": `${JSON.stringify(sourceHealth, null, 2)}\n`,
    "samples.json": `${JSON.stringify(samples, null, 2)}\n`,
    "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    "PRICING_TRUST_SPOT_CHECK_V1.md": reportMarkdown(summary, samples, sourceHealth),
  };
  await writeArtifacts(runDir, files);
  process.stdout.write(`${JSON.stringify({ ...summary, artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/") }, null, 2)}\n`);
  if (args.requirePass && summary.status !== "passed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[pricing-trust-spot-check] ${error.stack || error.message}`);
  process.exitCode = 1;
});
