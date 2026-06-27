import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1";
export const EXPECTED_PACKAGE_FINGERPRINT = "c2c4a7de394de8abbc3b4f6361e648f2741a6995eef03bfc505cda737e2edbd9";
export const EXPECTED_ROW_MANIFEST_HASH = "963575b361071c26c573bbc300163bbe1385df2b8742d048864ddeba324cd9bc";
export const EXPECTED_SOURCE_READBACK_FINGERPRINT = "3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PLAN_PREFIX = "mee_11s_market_listing_card_candidate_rollup_plan_";

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    readbackOnly: argv.includes("--readback-only"),
    allowDynamicPlan: argv.includes("--allow-dynamic-plan"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? null,
  };
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest(factory, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await factory();
      if (result?.error && /fetch failed|network|terminated|timeout/i.test(result.error.message ?? "")) {
        lastError = result.error;
        if (attempt === attempts) return result;
        await sleep(500 * attempt);
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function latestPlanPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const candidates = files
    .filter((fileName) => fileName.startsWith(PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-candidate-rollup-apply] no ${PLAN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

async function readPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? await latestPlanPath());
  const data = JSON.parse(await fs.readFile(resolved, "utf8"));
  data.row_files = Object.fromEntries(Object.entries(data.row_files ?? {})
    .map(([key, value]) => [key, path.resolve(REPO_ROOT, value)]));
  return { path: resolved, data };
}

async function* readJsonLines(filePath) {
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

async function collectColumn(filePath, getValue) {
  const values = [];
  for await (const row of readJsonLines(filePath)) {
    const value = getValue(row);
    if (value) values.push(value);
  }
  return values;
}

async function existingIds(supabase, table, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id")
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] id collision check failed for ${table}: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found.map((row) => row.id);
}

async function existingCandidateHashes(supabase, hashes) {
  const found = [];
  for (let index = 0; index < hashes.length; index += 100) {
    const chunk = hashes.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from("market_listing_card_candidates")
      .select("id,candidate_hash")
      .eq("source", "ebay_active")
      .in("candidate_hash", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] candidate hash collision check failed: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found;
}

async function existingRollupKeys(supabase, rollupRowsPath) {
  const rows = [];
  for await (const row of readJsonLines(rollupRowsPath)) rows.push(row);
  const cardPrintIds = [...new Set(rows.map((row) => row.card_print_id).filter(Boolean))];
  const found = [];
  for (let index = 0; index < cardPrintIds.length; index += 100) {
    const chunk = cardPrintIds.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from("market_listing_rollups")
      .select("id,source,rollup_version,rollup_window,card_print_id")
      .eq("source", "ebay_active")
      .in("card_print_id", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] rollup key collision check failed: ${error.message}`);
    found.push(...(data ?? []));
  }
  const plannedKeys = new Set(rows.map((row) => `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`));
  return found.filter((row) => plannedKeys.has(`${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`));
}

async function collisionSummary(supabase, plan) {
  const candidateIds = await collectColumn(plan.row_files.cardCandidateRows, (row) => row.id);
  const rollupIds = await collectColumn(plan.row_files.rollupRows, (row) => row.id);
  const candidateHashes = await collectColumn(plan.row_files.cardCandidateRows, (row) => row.candidate_hash);
  const candidateIdCollisions = await existingIds(supabase, "market_listing_card_candidates", candidateIds);
  const rollupIdCollisions = await existingIds(supabase, "market_listing_rollups", rollupIds);
  const candidateHashCollisions = await existingCandidateHashes(supabase, candidateHashes);
  const rollupKeyCollisions = await existingRollupKeys(supabase, plan.row_files.rollupRows);
  return {
    checked: true,
    candidate_id_collision_count: candidateIdCollisions.length,
    rollup_id_collision_count: rollupIdCollisions.length,
    candidate_hash_collision_count: candidateHashCollisions.length,
    rollup_key_collision_count: rollupKeyCollisions.length,
    candidate_id_collision_ids: candidateIdCollisions,
    rollup_id_collision_ids: rollupIdCollisions,
    candidate_hash_collision_hashes: candidateHashCollisions.map((row) => row.candidate_hash),
    rollup_key_collision_keys: rollupKeyCollisions.map((row) => `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`),
    candidate_id_collision_samples: candidateIdCollisions.slice(0, 10),
    rollup_id_collision_samples: rollupIdCollisions.slice(0, 10),
    candidate_hash_collision_samples: candidateHashCollisions.slice(0, 10),
    rollup_key_collision_samples: rollupKeyCollisions.slice(0, 10),
  };
}

function validatePlan(plan, collision, args) {
  const findings = [];
  if (!args.allowDynamicPlan) {
    if (plan.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
    if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
    if (plan.source_readback_fingerprint_sha256 !== EXPECTED_SOURCE_READBACK_FINGERPRINT) findings.push("source_readback_fingerprint_mismatch");
  }
  if (plan.ready_for_apply_approval !== true) findings.push("plan_not_ready_for_apply");
  if ((plan.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if (!args.allowDynamicPlan) {
    if (!args.readbackOnly && (collision?.candidate_id_collision_count ?? 0) > 0) findings.push("candidate_id_collisions_detected");
    if (!args.readbackOnly && (collision?.rollup_id_collision_count ?? 0) > 0) findings.push("rollup_id_collisions_detected");
    if (!args.readbackOnly && (collision?.candidate_hash_collision_count ?? 0) > 0) findings.push("candidate_hash_collisions_detected");
    if (!args.readbackOnly && (collision?.rollup_key_collision_count ?? 0) > 0) findings.push("rollup_key_collisions_detected");
  }
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return findings;
}

async function insertJsonlRows(supabase, table, filePath, chunkSize, options = {}) {
  let inserted = 0;
  let skipped = 0;
  let chunk = [];
  const progressEvery = options.progressEvery ?? 10_000;
  async function flush() {
    if (!chunk.length) return;
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .insert(chunk)
      .select("id"));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] insert failed for ${table}: ${error.message}`);
    inserted += data?.length ?? chunk.length;
    if (inserted % progressEvery < chunk.length) {
      console.error(`[market-listing-candidate-rollup-apply] inserted ${inserted} into ${table}`);
    }
    chunk = [];
  }
  for await (const row of readJsonLines(filePath)) {
    if (options.skipRow?.(row)) {
      skipped += 1;
      continue;
    }
    chunk.push(row);
    if (chunk.length >= chunkSize) await flush();
  }
  await flush();
  return { inserted, skipped };
}

function buildDynamicSkipState(collision) {
  const candidateIds = new Set(collision.candidate_id_collision_ids ?? []);
  const rollupIds = new Set(collision.rollup_id_collision_ids ?? []);
  const candidateHashes = new Set(collision.candidate_hash_collision_hashes ?? []);
  const rollupKeys = new Set(collision.rollup_key_collision_keys ?? []);
  return {
    candidateIds,
    candidateHashes,
    rollupIds,
    rollupKeys,
  };
}

function skipRowForTable(table, row, state) {
  if (table === "market_listing_card_candidates") {
    return state.candidateIds.has(row.id) || state.candidateHashes.has(row.candidate_hash);
  }
  if (table === "market_listing_rollups") {
    const key = `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`;
    return state.rollupIds.has(row.id) || state.rollupKeys.has(key);
  }
  return false;
}

function publicCollisionSummary(collision) {
  const {
    candidate_id_collision_ids,
    rollup_id_collision_ids,
    candidate_hash_collision_hashes,
    rollup_key_collision_keys,
    ...publicSummary
  } = collision ?? {};
  return publicSummary;
}

async function applyRows(supabase, plan, args, collision) {
  const dynamicSkipState = args.allowDynamicPlan ? buildDynamicSkipState(collision) : null;
  return {
    market_listing_card_candidates: await insertJsonlRows(
      supabase,
      "market_listing_card_candidates",
      plan.row_files.cardCandidateRows,
      500,
      {
        skipRow: dynamicSkipState
          ? (row) => skipRowForTable("market_listing_card_candidates", row, dynamicSkipState)
          : null,
      },
    ),
    market_listing_rollups: await insertJsonlRows(
      supabase,
      "market_listing_rollups",
      plan.row_files.rollupRows,
      500,
      {
        skipRow: dynamicSkipState
          ? (row) => skipRowForTable("market_listing_rollups", row, dynamicSkipState)
          : null,
      },
    ),
  };
}

async function countByIds(supabase, table, ids) {
  let total = 0;
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { count, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-candidate-rollup-apply] readback failed for ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

async function readbackCounts(supabase, plan) {
  const candidateIds = await collectColumn(plan.row_files.cardCandidateRows, (row) => row.id);
  const rollupIds = await collectColumn(plan.row_files.rollupRows, (row) => row.id);
  return {
    market_listing_card_candidates: await countByIds(supabase, "market_listing_card_candidates", candidateIds),
    market_listing_rollups: await countByIds(supabase, "market_listing_rollups", rollupIds),
  };
}

function expectedReadbackCounts(plan) {
  return {
    market_listing_card_candidates: plan.proposed_table_row_counts.market_listing_card_candidates,
    market_listing_rollups: plan.proposed_table_row_counts.market_listing_rollups,
  };
}

function readbackMatchesExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => readback?.[table] === count);
}

function renderMarkdown(report) {
  return [
    "# MEE-11T Market Listing Card Candidate Rollup Apply",
    "",
    `- Applied by this invocation: \`${report.applied}\``,
    `- Remote rows verified: \`${report.remote_rows_verified}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    "",
    "## Inserted Rows",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...(Object.keys(report.apply_result?.inserted ?? {}).length
      ? Object.entries(report.apply_result.inserted).map(([table, count]) => `| \`${table}\` | ${count} |`)
      : ["| none in this invocation | 0 |"]),
    "",
    "## Readback Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.readback_counts ?? {}).map(([table, count]) => `| \`${table}\` | ${count} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const plan = await readPlan(args.planPath);
  const supabase = createBackendClient();
  const collision = args.readbackOnly ? { checked: false } : await collisionSummary(supabase, plan.data);
  const findings = validatePlan(plan.data, collision, args);
  let applyResult = null;
  let readback = null;
  const expectedReadback = expectedReadbackCounts(plan.data);

  if (args.apply && findings.length === 0) {
    const inserted = await applyRows(supabase, plan.data, args, collision);
    applyResult = { inserted };
    readback = await readbackCounts(supabase, plan.data);
  } else if (args.readbackOnly) {
    readback = await readbackCounts(supabase, plan.data);
  }

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    applied: Boolean(applyResult),
    remote_rows_verified: readbackMatchesExpected(readback, expectedReadback),
    mode: args.apply ? "apply" : args.readbackOnly ? "readback_only" : "dry_run",
    plan_artifact: rel(plan.path),
    package_fingerprint_sha256: plan.data.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.data.row_manifest_hash_sha256,
    source_readback_fingerprint_sha256: plan.data.source_readback_fingerprint_sha256,
    proposed_table_row_counts: plan.data.proposed_table_row_counts,
    expected_readback_counts: expectedReadback,
    remote_collision_summary: publicCollisionSummary(collision),
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: Boolean(applyResult),
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    findings,
    apply_result: applyResult,
    readback_counts: readback,
  };

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11t_market_listing_card_candidate_rollup_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11t_market_listing_card_candidate_rollup_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    remote_rows_verified: report.remote_rows_verified,
    findings: report.findings,
    apply_result: report.apply_result,
    readback_counts: report.readback_counts,
    remote_collision_summary: report.remote_collision_summary,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
  }, null, 2));

  if (!report.applied && !report.remote_rows_verified) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
