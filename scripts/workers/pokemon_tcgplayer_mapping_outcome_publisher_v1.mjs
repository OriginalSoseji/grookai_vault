import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  operationsSha256V1,
  publishCatalogWorkItemsV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  buildPokemonTcgplayerMappingAuthorityV1,
  buildPokemonTcgplayerMappingOutcomeAgentV1,
  buildPokemonTcgplayerMappingOutcomePackageV1,
  buildPokemonTcgplayerMappingOutcomeWorkItemV1,
} from "../../backend/operations/pokemon_tcgplayer_mapping_outcome_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const REVIEW_PREFIX = "pokemon-pricing-mapping-review:";
const OUTCOME_PREFIX = "pokemon-tcgplayer-mapping-outcome:";

function parseArgs(argv) {
  const options = { publish: false, outDir: null, limit: 5 };
  for (const token of argv) {
    if (token === "--publish") options.publish = true;
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else if (token.startsWith("--limit=")) options.limit = Number(token.slice(8));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 20) {
    throw new Error("--limit must be between 1 and 20");
  }
  return options;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function credentials() {
  const supabaseUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  if (!/^https:\/\//.test(String(supabaseUrl ?? "")) || !String(serviceRoleKey ?? "").trim()) {
    throw new Error("Pokemon mapping outcome publisher requires Supabase service credentials");
  }
  return { supabaseUrl: String(supabaseUrl).replace(/\/$/, ""), serviceRoleKey };
}

async function approvedReviews(client) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await client.from("founder_work_items")
      .select("id,work_item_key,work_item_type,action_type,version,state,plan_payload,plan_fingerprint,decided_at,operations_agents!inner(agent_key)")
      .eq("state", "approved")
      .like("work_item_key", `${REVIEW_PREFIX}%`)
      .eq("operations_agents.agent_key", "tcgplayer-pricing-completion-v1")
      .order("decided_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !Array.isArray(page)) {
      throw new Error(`Approved Pokemon mapping review read failed: ${error?.message ?? "unknown"}`);
    }
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows.map((row) => ({
    ...row,
    agent_key: row.operations_agents?.agent_key,
  }));
}

async function existingOutcomeKeys(client) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await client.from("founder_work_items")
      .select("id,work_item_key")
      .like("work_item_key", `${OUTCOME_PREFIX}%`)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !Array.isArray(page)) {
      throw new Error(`Existing Pokemon mapping outcome read failed: ${error?.message ?? "unknown"}`);
    }
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return new Set(rows.map((row) => String(row.work_item_key)));
}

async function runPreflight({ authority, itemDir, headSha }) {
  const inputDir = path.join(itemDir, "input");
  const outDir = path.join(itemDir, "preflight");
  const authorityFile = path.join(inputDir, "authority.json");
  await writeJson(authorityFile, authority);
  await fs.mkdir(outDir, { recursive: true });
  const env = {
    ...process.env,
    ENABLE_CANON_MAINTENANCE_MODE: "true",
    CANON_MAINTENANCE_MODE: "EXPLICIT",
    CANON_MAINTENANCE_DRY_RUN: "true",
    CANON_MAINTENANCE_TASK: "backend/maintenance/pokemon_tcgplayer_mapping_outcome_apply_v1.mjs",
    POKEMON_TCGPLAYER_MAPPING_PLAN_PATH: authorityFile,
    POKEMON_TCGPLAYER_MAPPING_EXPECTED_FINGERPRINT: authority.authority_fingerprint_sha256,
    POKEMON_TCGPLAYER_MAPPING_EXPECTED_COMMIT_SHA: headSha,
    POKEMON_TCGPLAYER_MAPPING_OUTPUT_ROOT: outDir,
  };
  const execution = spawnSync(process.execPath, ["backend/maintenance/run_canon_maintenance_v1.mjs"], {
    cwd: ROOT,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  await writeJson(path.join(itemDir, "preflight_process.json"), {
    exit_code: execution.status,
    signal: execution.signal,
    stdout: execution.stdout,
    stderr: execution.stderr,
  });
  if (execution.status !== 0) {
    throw new Error(`Pokemon mapping preflight failed (${execution.status}): ${String(execution.stderr ?? "").slice(-2000)}`);
  }
  return JSON.parse(await fs.readFile(path.join(outDir, "summary.json"), "utf8"));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const creds = credentials();
  const client = createBackendClient();
  const headSha = git("rev-parse", "HEAD");
  if (git("status", "--porcelain", "--untracked-files=no")) {
    throw new Error("Pokemon mapping outcome publication requires a clean tracked worktree");
  }
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== headSha) {
    throw new Error("Pokemon mapping outcome publication commit does not match GITHUB_SHA");
  }
  const [reviews, existingKeys] = await Promise.all([
    approvedReviews(client),
    existingOutcomeKeys(client),
  ]);
  const sourceRunUri = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : `https://github.com/OriginalSoseji/grookai_vault/commit/${headSha}`;
  const workItems = [];
  const packages = [];
  const skipped = [];
  for (const review of reviews) {
    const sourceSyncRunId = String(review.plan_payload?.source_sync_run_id ?? "").trim();
    const outcomeKey = `${OUTCOME_PREFIX}${sourceSyncRunId}`;
    if (existingKeys.has(outcomeKey)) {
      skipped.push({ review_work_item_id: review.id, outcome_key: outcomeKey, reason: "outcome_already_exists" });
      continue;
    }
    if (workItems.length >= options.limit) {
      skipped.push({ review_work_item_id: review.id, outcome_key: outcomeKey, reason: "bounded_run_limit" });
      continue;
    }
    let authority;
    try {
      authority = buildPokemonTcgplayerMappingAuthorityV1({ review, sourceCommitSha: headSha });
    } catch (error) {
      skipped.push({
        review_work_item_id: review.id,
        outcome_key: outcomeKey,
        reason: "reviewed_master_mapping_authority_not_ready",
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    const itemDir = path.join(options.outDir, sourceSyncRunId);
    const preflight = await runPreflight({ authority, itemDir, headSha });
    const outcomePackage = buildPokemonTcgplayerMappingOutcomePackageV1({ authority, preflight });
    const workItem = buildPokemonTcgplayerMappingOutcomeWorkItemV1({
      outcomePackage,
      sourceRunUri,
    });
    packages.push(outcomePackage);
    workItems.push(workItem);
    await writeJson(path.join(itemDir, "outcome_package.json"), outcomePackage);
    await writeJson(path.join(itemDir, "founder_work_item.json"), workItem);
  }
  const agent = buildPokemonTcgplayerMappingOutcomeAgentV1();
  let receipts = [];
  if (options.publish && workItems.length > 0) {
    receipts = await publishCatalogWorkItemsV1({
      agent,
      workItems,
      supabaseUrl: creds.supabaseUrl,
      serviceRoleKey: creds.serviceRoleKey,
    });
  }
  const summary = {
    version: "POKEMON_TCGPLAYER_MAPPING_OUTCOME_PUBLISHER_V1",
    mode: options.publish ? "publish" : "artifact_only",
    source_commit_sha: headSha,
    approved_review_count: reviews.length,
    existing_outcome_count: skipped.filter((row) => row.reason === "outcome_already_exists").length,
    blocked_review_count: skipped.filter((row) =>
      row.reason === "reviewed_master_mapping_authority_not_ready").length,
    deferred_review_count: skipped.filter((row) => row.reason === "bounded_run_limit").length,
    preflight_passed_count: packages.length,
    work_item_count: workItems.length,
    published_count: receipts.length,
    mapping_count: packages.reduce((total, pkg) => total + pkg.authority.expected_mapping_count, 0),
    canonical_writes: false,
    work_item_fingerprint_sha256: operationsSha256V1(workItems),
  };
  await writeJson(path.join(options.outDir, "agent_registration.json"), agent);
  await writeJson(path.join(options.outDir, "founder_work_items.json"), workItems);
  await writeJson(path.join(options.outDir, "publication_receipts.json"), receipts);
  await writeJson(path.join(options.outDir, "skipped_reviews.json"), skipped);
  await writeJson(path.join(options.outDir, "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
