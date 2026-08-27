import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildCatalogShadowReconciliationV1,
  CATALOG_SHADOW_AUTOMATION_VERSION,
  CATALOG_SHADOW_MODE,
} from "../../backend/catalog/catalog_shadow_automation_v1.mjs";
import { sha256 } from "../../backend/catalog/universal_catalog_discovery_v1.mjs";

function parseArgs(argv) {
  const options = {
    discoveryDir: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    outDir: null,
  };
  for (const token of argv) {
    if (token.startsWith("--discovery-dir=")) {
      options.discoveryDir = path.resolve(token.slice(16));
    } else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!options.discoveryDir || !options.outDir) {
    throw new Error("--discovery-dir and --out-dir are required");
  }
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a 40-character lowercase SHA");
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, body);
  return body;
}

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (process.env.CATALOG_AUTOMATION_MODE !== CATALOG_SHADOW_MODE) {
    throw new Error(
      `CATALOG_AUTOMATION_MODE must equal ${CATALOG_SHADOW_MODE}`,
    );
  }

  const [
    actionableGaps,
    discoverySummary,
    masterIndexCandidates,
    promotionCandidates,
  ] = await Promise.all([
    readJson(path.join(options.discoveryDir, "actionable_gaps.json")),
    readJson(path.join(options.discoveryDir, "summary.json")),
    readJson(path.join(
      options.discoveryDir,
      "pokemon_master_index_update_candidates.json",
    )),
    readJson(path.join(options.discoveryDir, "canonical_promotion_candidates.json")),
  ]);

  const result = buildCatalogShadowReconciliationV1({
    actionableGaps,
    actualHeadSha: currentHeadSha(),
    discoverySummary,
    expectedHeadSha: options.expectedHeadSha,
    masterIndexCandidates,
    promotionCandidates,
  });
  const runPlan = {
    version: CATALOG_SHADOW_AUTOMATION_VERSION,
    mode: CATALOG_SHADOW_MODE,
    expected_head_sha: result.expected_head_sha,
    actual_head_sha: result.actual_head_sha,
    boundaries: result.boundaries,
  };
  const summary = {
    version: CATALOG_SHADOW_AUTOMATION_VERSION,
    mode: CATALOG_SHADOW_MODE,
    status: "completed",
    counts: result.counts,
    boundaries: result.boundaries,
  };

  const artifacts = [];
  for (const [artifactPath, value] of [
    ["run_plan.json", runPlan],
    ["shadow_candidate_queue.json", {
      version: CATALOG_SHADOW_AUTOMATION_VERSION,
      authority: "evidence_only_not_canonical",
      candidate_count: result.queue.length,
      candidates: result.queue,
    }],
    ["summary.json", summary],
  ]) {
    const body = await writeJson(path.join(options.outDir, artifactPath), value);
    artifacts.push({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    });
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
