import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { sha256 } from "../../backend/catalog/universal_catalog_discovery_v1.mjs";

export const CATALOG_INCREMENTAL_SUPERVISOR_VERSION =
  "CATALOG_INCREMENTAL_SUPERVISOR_V1";

function parseArgs(argv) {
  const options = {
    mode: "plan",
    asOf: new Date().toISOString().slice(0, 10),
    discoveryDir: null,
    outDir: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    maxTargets: 5,
    targetKey: null,
    outcomeEligibleOnly: false,
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--discovery-dir=")) options.discoveryDir = path.resolve(token.slice(16));
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else if (token.startsWith("--expected-head-sha=")) options.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--max-targets=")) options.maxTargets = Number(token.slice(14));
    else if (token.startsWith("--target-key=")) options.targetKey = token.slice(13);
    else if (token === "--outcome-eligible-only") options.outcomeEligibleOnly = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "dry-run", "apply"]).has(options.mode)) {
    throw new Error("--mode must be plan, dry-run, or apply");
  }
  if (!options.discoveryDir || !options.outDir) {
    throw new Error("--discovery-dir and --out-dir are required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  if (!Number.isInteger(options.maxTargets) || options.maxTargets < 1 || options.maxTargets > 10) {
    throw new Error("--max-targets must be between 1 and 10");
  }
  if (options.mode === "apply" && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("Apply requires --expected-head-sha");
  }
  if (options.targetKey && !/^[a-z0-9_:-]+$/i.test(options.targetKey)) {
    throw new Error("Invalid --target-key");
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export function catalogIncrementalTargetForGapV1(gap) {
  if (gap.status === "missing_set" && gap.game_code === "mtg" && gap.source_code) {
    return {
      key: `mtg:${String(gap.source_code).toLowerCase()}`,
      writer_key: "mtg_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/mtg_incremental_promotion_v1.mjs",
      target: { set_code: String(gap.source_code).toLowerCase() },
      args: [`--set-code=${String(gap.source_code).toLowerCase()}`],
    };
  }
  if (gap.status === "missing_set" && gap.game_code === "one_piece" &&
      gap.source_code && gap.source_set_id) {
    return {
      key: `one_piece:${String(gap.source_code).toUpperCase()}`,
      writer_key: "one_piece_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/one_piece_incremental_promotion_v1.mjs",
      target: {
        set_code: String(gap.source_code).toUpperCase(),
        official_series_id: String(gap.source_set_id),
      },
      args: [
        `--set-code=${String(gap.source_code).toUpperCase()}`,
        `--official-series-id=${gap.source_set_id}`,
      ],
    };
  }
  if (gap.status === "incomplete_cards" && gap.game_code === "pokemon" &&
      gap.source_id === "tcgdex_english_set_registry" &&
      gap.master_index_gate?.decision === "canonical_delta_eligible" &&
      gap.master_index_gate?.language === "en" &&
      (gap.count_evidence ?? []).some((evidence) =>
        evidence.authority === "english_master_index_completion_v1" &&
        evidence.scope === "full_set" &&
        Number(evidence.count) === Number(gap.expected_card_count)) &&
      gap.source_code && gap.database_code) {
    return {
      key: `pokemon_en:${String(gap.source_code).toLowerCase()}`,
      writer_key: "english_pokemon_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/english_pokemon_incremental_promotion_v1.mjs",
      target: {
        source_set_code: String(gap.source_code),
        database_set_code: String(gap.database_code),
      },
      args: [
        `--source-set-code=${gap.source_code}`,
        `--database-set-code=${gap.database_code}`,
      ],
    };
  }
  if (gap.status === "incomplete_cards" && gap.game_code === "pokemon" &&
      gap.source_id === "pokemon_card_official_jp_products" &&
      gap.master_index_gate?.decision === "canonical_delta_eligible" &&
      gap.master_index_gate?.language === "ja" &&
      (gap.count_evidence ?? []).some((evidence) =>
        evidence.authority === "tcgdex_japanese_structured_api" &&
        evidence.scope === "full_set") &&
      gap.source_code && gap.database_code && gap.source_set_id) {
    return {
      key: `pokemon_jpn:${String(gap.source_code).toUpperCase()}`,
      writer_key: "japanese_structured_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/catalog_incremental_promotion_v1.mjs",
      target: {
        pokemon_set_code: String(gap.source_code),
        pokemon_database_set_code: String(gap.database_code),
        pokemon_product_id: String(gap.source_set_id),
      },
      args: [
        `--pokemon-set-code=${gap.source_code}`,
        `--pokemon-db-set-code=${gap.database_code}`,
        `--pokemon-product-id=${gap.source_set_id}`,
        "--official-card-ids=",
      ],
    };
  }
  if (gap.status === "incomplete_cards" && gap.game_code === "pokemon" &&
      gap.source_id === "pokemon_card_official_jp_products" &&
      gap.master_index_gate?.decision === "canonical_delta_eligible" &&
      gap.master_index_gate?.language === "ja" &&
      (gap.count_evidence ?? []).some((evidence) =>
        evidence.authority === "limitless_jp_structured_checklist" &&
        evidence.scope === "numbered_base_set" &&
        Number(evidence.count) === Number(gap.expected_card_count)) &&
      gap.source_code && gap.database_code && gap.source_set_id) {
    return {
      key: `pokemon_jpn_official:${String(gap.source_code).toUpperCase()}`,
      writer_key: "japanese_official_incremental_promotion_v1",
      founder_outcome_eligible: false,
      worker: "scripts/workers/japanese_official_incremental_promotion_v1.mjs",
      requires_discovery_dir: true,
      target: {
        source_set_code: String(gap.source_code),
        database_set_code: String(gap.database_code),
        product_id: String(gap.source_set_id),
      },
      args: [
        `--source-set-code=${gap.source_code}`,
        `--database-set-code=${gap.database_code}`,
        `--product-id=${gap.source_set_id}`,
      ],
    };
  }
  return null;
}

export function buildCatalogIncrementalSupervisorPlanV1(gaps, maxTargets = 5, {
  targetKey = null,
  outcomeEligibleOnly = false,
} = {}) {
  const targets = [];
  const unsupported = [];
  const seen = new Set();
  for (const gap of gaps ?? []) {
    const target = catalogIncrementalTargetForGapV1(gap);
    if (!target) {
      unsupported.push({
        game_code: gap.game_code,
        status: gap.status,
        source_code: gap.source_code ?? null,
        reason: "no_exact_incremental_writer_for_gap_shape",
      });
      continue;
    }
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    if (targetKey && target.key !== targetKey) continue;
    if (outcomeEligibleOnly && target.founder_outcome_eligible !== true) continue;
    targets.push(target);
  }
  return {
    version: CATALOG_INCREMENTAL_SUPERVISOR_VERSION,
    requested_target_key: targetKey,
    outcome_eligible_only: outcomeEligibleOnly,
    targets: targets.slice(0, maxTargets),
    deferred_target_count: Math.max(0, targets.length - maxTargets),
    unsupported,
  };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

function executeTarget(options, target, targetDir) {
  const args = [
    target.worker,
    `--mode=${options.mode}`,
    `--as-of=${options.asOf}`,
    `--out-dir=${targetDir}`,
    ...target.args,
  ];
  if (target.requires_discovery_dir) {
    args.push(`--discovery-dir=${options.discoveryDir}`);
  }
  if (options.mode === "apply") args.push(`--expected-head-sha=${options.expectedHeadSha}`);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    target: target.key,
    worker: target.worker,
    exit_code: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
    artifact_directory: targetDir,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(options.outDir, { recursive: true });
  const gaps = await readJson(
    path.join(options.discoveryDir, "canonical_promotion_candidates.json"),
  );
  const discoverySummary = await readJson(path.join(options.discoveryDir, "summary.json"));
  const plan = {
    ...buildCatalogIncrementalSupervisorPlanV1(gaps, options.maxTargets, {
      targetKey: options.targetKey,
      outcomeEligibleOnly: options.outcomeEligibleOnly,
    }),
    mode: options.mode,
    as_of: options.asOf,
    expected_head_sha: options.expectedHeadSha,
    discovery_summary: discoverySummary,
    boundaries: {
      source: "frozen_master_index_gated_catalog_promotion_artifact",
      max_targets: options.maxTargets,
      child_workers_only: true,
      no_substitution: true,
      no_partial_set_repairs: true,
    },
  };
  if (options.targetKey && plan.targets.length !== 1) {
    throw new Error(`Exact supervisor target was not admitted: ${options.targetKey}`);
  }
  const planBody = await writeJson(path.join(options.outDir, "supervisor_plan.json"), plan);
  const results = [];
  for (const [index, target] of plan.targets.entries()) {
    const targetDir = path.join(options.outDir, "targets", `${String(index + 1).padStart(2, "0")}_${target.key.replace(/[^a-z0-9_-]+/gi, "_")}`);
    const result = executeTarget(options, target, targetDir);
    results.push(result);
    if (result.exit_code !== 0 && options.mode === "apply") break;
  }
  const failed = results.filter((result) => result.exit_code !== 0);
  const imageCandidates = [];
  for (const result of results.filter((row) => row.exit_code === 0)) {
    const manifestPath = path.join(result.artifact_directory, "image_candidate_manifest.json");
    try {
      const manifest = await readJson(manifestPath);
      for (const candidate of manifest.candidates ?? []) {
        imageCandidates.push({ target: result.target, ...candidate });
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const summary = {
    version: CATALOG_INCREMENTAL_SUPERVISOR_VERSION,
    mode: options.mode,
    status: failed.length > 0 ? "failed" : plan.deferred_target_count > 0
      ? "bounded_targets_remaining" : "completed",
    selected_target_count: plan.targets.length,
    completed_target_count: results.filter((result) => result.exit_code === 0).length,
    failed_target_count: failed.length,
    deferred_target_count: plan.deferred_target_count,
    unsupported_gap_count: plan.unsupported.length,
    pending_self_hosted_image_candidate_count: imageCandidates.length,
    targets: results.map((result) => ({
      target: result.target,
      worker: result.worker,
      exit_code: result.exit_code,
      artifact_directory: result.artifact_directory,
    })),
  };
  const resultsBody = await writeJson(path.join(options.outDir, "execution_results.json"), results);
  const imageBacklogBody = await writeJson(
    path.join(options.outDir, "image_candidate_backlog.json"),
    {
      version: CATALOG_INCREMENTAL_SUPERVISOR_VERSION,
      policy: "candidate_only_requires_separate_self_hosting_promotion",
      candidate_count: imageCandidates.length,
      candidates: imageCandidates,
    },
  );
  const summaryBody = await writeJson(path.join(options.outDir, "summary.json"), summary);
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts: [
      ["supervisor_plan.json", planBody],
      ["execution_results.json", resultsBody],
      ["image_candidate_backlog.json", imageBacklogBody],
      ["summary.json", summaryBody],
    ].map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
