import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildSealedCanarySelectionPlanV1,
  SEALED_CANARY_SOURCE_PRODUCT_IDS_V1,
  SEALED_CANARY_TABLES_V1,
} from "../../backend/pricing/cross_tcg_sealed_product_no_publication_canary_v1.mjs";
import {
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outRoot: path.join(ROOT, "docs", "audits", "pricing",
      "cross_tcg_sealed_product_no_publication_canary_v1"),
  };
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--out-root=")) args.outRoot = path.resolve(arg.slice(11));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readProduction(connectionString) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "sealed-product-canary-plan-read-only-v1",
  });
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin read only");
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0].transaction_read_only;
    const rows = (await client.query(`
      select product.product_id, product.category_id, product.group_id,
             product.name, product.clean_name, product.source_url,
             product.presale_info, product.extended_data,
             category.display_name as category_name,
             source_group.name as group_name
        from public.tcgcsv_source_products product
        join public.tcgcsv_source_categories category using (category_id)
        left join public.tcgcsv_source_groups source_group using (group_id)
       where product.source_active
         and product.product_id = any($1::integer[])
       order by product.product_id`, [SEALED_CANARY_SOURCE_PRODUCT_IDS_V1])).rows;
    const rowCounts = {};
    for (const table of SEALED_CANARY_TABLES_V1) {
      rowCounts[table] = Number((await client.query(
        `select count(*)::integer as value from public.${table}`,
      )).rows[0].value);
    }
    const ledger = await client.query(`
      select count(*)::integer as value
        from supabase_migrations.schema_migrations
       where version = '20260814060000'
         and name = 'cross_tcg_sealed_product_domain_v1'`);
    await client.query("rollback");
    return {
      rows,
      schemaState: {
        transaction_read_only: transactionReadOnly,
        transaction_closed_before_artifacts: true,
        migration_ledger_present: Number(ledger.rows[0].value) === 1,
        active_release_pointer_count: rowCounts.sealed_product_release_pointer,
        row_counts: rowCounts,
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function reviewPacket(plan) {
  const rows = plan.candidates.map((entry, index) =>
    `| ${index + 1} | ${entry.source.source_category_name} | ` +
    `${entry.source.source_product_id} | ${entry.source.source_product_name} | ` +
    `${entry.package_form} | ${entry.classification_confidence} | Unreviewed |`);
  return `# Sealed Product No-Publication Canary Review Packet V1\n\n` +
    `- Status: **${plan.status}**\n` +
    `- Plan SHA-256: \`${plan.plan_sha256}\`\n` +
    `- Candidate rows: ${plan.candidates.length}\n` +
    `- Database writes: 0\n` +
    `- Canonical rows constructed: 0\n` +
    `- Publication authority: false\n\n` +
    `| # | Game | Product ID | Source product | Package form | Confidence | Review |\n` +
    `|---:|---|---:|---|---|---:|---|\n${rows.join("\n")}\n\n` +
    `Each candidate preserves its full source payload hash and classifier evidence in ` +
    `\`candidates.json\`. Review is one bounded gate; no row may be promoted from ` +
    `this selection artifact alone.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const branch = git("branch", "--show-current");
  const headSha = git("rev-parse", "HEAD");
  if (branch !== "agent/sealed-catalog-readiness-v1") {
    throw new Error(`Unexpected branch: ${branch}`);
  }
  if (headSha !== args.expectedHeadSha) {
    throw new Error(`HEAD ${headSha} does not match expected ${args.expectedHeadSha}`);
  }
  if (git("status", "--porcelain") !== "") {
    throw new Error("Canary plan producer worktree must be clean");
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  const production = await readProduction(connectionString);
  const plan = buildSealedCanarySelectionPlanV1({
    rows: production.rows,
    schemaState: production.schemaState,
  });
  const recordedAt = new Date().toISOString();
  const summary = {
    version: plan.version,
    recorded_at: recordedAt,
    producer_commit_sha: headSha,
    status: plan.status,
    plan_sha256: plan.plan_sha256,
    selected_source_product_count: plan.candidates.length,
    findings: plan.findings,
    database_writes: false,
    exact_next_gate: plan.findings.length === 0
      ? "Review the ten candidates as one packet, then construct a separately fingerprinted no-publication mutation payload. Do not write from this selection artifact."
      : "Stop before any data canary. Repair the reported selection or schema-state finding and rerun from a new frozen producer.",
  };
  const outDir = path.join(args.outRoot,
    `${recordedAt.replace(/[:.]/g, "-")}_read_only_selection`);
  await fs.mkdir(outDir, { recursive: true });
  const contents = new Map();
  contents.set("run_plan.json", await writeJson(path.join(outDir, "run_plan.json"), {
    recorded_at: recordedAt,
    producer_commit_sha: headSha,
    selected_source_product_ids: SEALED_CANARY_SOURCE_PRODUCT_IDS_V1,
    boundaries: plan.boundaries,
  }));
  contents.set("candidates.json", await writeJson(path.join(outDir, "candidates.json"), plan));
  contents.set("summary.json", await writeJson(path.join(outDir, "summary.json"), summary));
  const packet = reviewPacket(plan);
  await fs.writeFile(path.join(outDir, "REVIEW_PACKET.md"), packet, "utf8");
  contents.set("REVIEW_PACKET.md", packet);
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [...contents].map(([name, body]) => ({
      path: name,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({
    status: plan.status,
    out_dir: path.relative(ROOT, outDir).replaceAll("\\", "/"),
    plan_sha256: plan.plan_sha256,
    findings: plan.findings,
  }, null, 2)}\n`);
  if (plan.findings.length) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
