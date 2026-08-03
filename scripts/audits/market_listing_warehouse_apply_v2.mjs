import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXPECTED_SCHEMA_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

async function hashJsonLines(filePath) {
  const hash = createHash("sha256");
  const rl = readline.createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) hash.update(`${JSON.stringify(stable(JSON.parse(line)))}\n`);
  return hash.digest("hex");
}

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    planPath: argv.find((entry) => entry.startsWith("--plan="))?.slice("--plan=".length) ?? null,
  };
}

export async function validateMarketListingWarehouseApplyPlanV2({ plan, repoRoot = REPO_ROOT } = {}) {
  const findings = [];
  if (plan?.package_id !== "MARKET-LISTING-ACQUISITION-WAREHOUSE-BACKFILL-PLAN-V2") findings.push("unexpected_plan_package");
  if (plan?.ready_for_apply_approval !== true) findings.push("plan_not_ready");
  if ((plan?.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if (plan?.schema_migration_hash_sha256 !== EXPECTED_SCHEMA_HASH) findings.push("schema_hash_mismatch");
  if (plan?.boundary?.db_writes !== false) findings.push("plan_db_write_boundary_failed");
  if (plan?.boundary?.card_candidate_writes !== false) findings.push("card_candidate_write_boundary_failed");
  if (plan?.boundary?.canonical_assignment_writes !== false) findings.push("canonical_assignment_write_boundary_failed");
  if ((plan?.proposed_table_row_counts?.market_listing_card_candidates ?? -1) !== 0) findings.push("card_candidate_rows_present");
  if ((plan?.proposed_table_row_counts?.market_listing_rollups ?? -1) !== 0) findings.push("rollup_rows_present");

  for (const [key, configuredPath] of Object.entries(plan?.row_files ?? {})) {
    const filePath = path.resolve(repoRoot, configuredPath);
    if (!existsSync(filePath)) {
      findings.push(`missing_row_file:${key}`);
      continue;
    }
    const actualHash = await hashJsonLines(filePath);
    if (actualHash !== plan?.row_file_hashes_sha256?.[key]) findings.push(`row_file_hash_mismatch:${key}`);
  }
  return [...new Set(findings)];
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.planPath) throw new Error("[market-listing-warehouse-apply-v2] --plan is required");
  const planPath = path.resolve(REPO_ROOT, args.planPath);
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const findings = await validateMarketListingWarehouseApplyPlanV2({ plan });
  if (!args.apply) {
    return {
      package_id: "MARKET-LISTING-WAREHOUSE-APPLY-PREFLIGHT-V2",
      mode: "local_preflight_no_db_writes",
      plan_path: planPath,
      findings,
      ready_for_separate_apply_approval: findings.length === 0,
      boundary: { provider_calls: false, db_writes: false, canonical_assignment_writes: false, public_pricing: false },
    };
  }
  if (process.env.MEE_WAREHOUSE_V2_ALLOW_APPLY !== "1") {
    throw new Error("[market-listing-warehouse-apply-v2] MEE_WAREHOUSE_V2_ALLOW_APPLY=1 is required");
  }
  if (findings.length > 0) throw new Error(`[market-listing-warehouse-apply-v2] plan validation failed: ${findings.join(",")}`);
  const child = spawnSync(process.execPath, [
    "scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs",
    "--apply",
    "--allow-dynamic-plan",
    `--plan=${planPath}`,
  ], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (child.status !== 0) throw new Error(`[market-listing-warehouse-apply-v2] delegated append-only apply failed: ${(child.stderr ?? child.stdout ?? "").slice(-2000)}`);
  return JSON.parse(child.stdout);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2))
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
