import fs from "node:fs/promises";
import path from "node:path";

import "../../backend/env.mjs";
import {
  buildCatalogDiscoveryAgentV1,
  buildCatalogSetWorkItemKeyV1,
  buildCatalogSetWorkItemsV1,
  operationsSha256V1,
  publishCatalogWorkItemsV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  buildCatalogSetOutcomeAgentV1,
  buildCatalogSetOutcomeWorkItemV1,
} from "../../backend/operations/catalog_founder_outcome_v1.mjs";
import {
  catalogIncrementalTargetForGapV1,
} from "./catalog_incremental_supervisor_v1.mjs";

function parseArgs(argv) {
  const options = {
    discoveryDir: null,
    outDir: null,
    outcomePackagesFile: null,
    publish: false,
  };
  for (const token of argv) {
    if (token.startsWith("--discovery-dir=")) options.discoveryDir = token.slice(16);
    else if (token.startsWith("--out-dir=")) options.outDir = token.slice(10);
    else if (token.startsWith("--outcome-packages-file=")) {
      options.outcomePackagesFile = path.resolve(token.slice(24));
    }
    else if (token === "--publish") options.publish = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.discoveryDir) throw new Error("--discovery-dir is required");
  options.outDir ??= path.join(options.discoveryDir, "founder_work_items");
  return options;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [candidates, summary, artifactHashes] = await Promise.all([
    readJson(path.join(options.discoveryDir, "canonical_promotion_candidates.json")),
    readJson(path.join(options.discoveryDir, "summary.json")),
    readJson(path.join(options.discoveryDir, "artifact_hashes.json")),
  ]);
  const reviewAgent = buildCatalogDiscoveryAgentV1();
  const outcomeAgent = buildCatalogSetOutcomeAgentV1();
  const sourceCommitSha = process.env.GITHUB_SHA ?? process.env.COMMIT_SHA ?? null;
  const sourceRunUri = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
  const outcomePackages = options.outcomePackagesFile
    ? await readJson(options.outcomePackagesFile)
    : [];
  const candidateByTargetKey = new Map();
  for (const candidate of candidates) {
    const targetKey = catalogIncrementalTargetForGapV1(candidate)?.key;
    if (!targetKey) continue;
    if (candidateByTargetKey.has(targetKey)) {
      throw new Error(`Catalog candidates contain duplicate target: ${targetKey}`);
    }
    candidateByTargetKey.set(targetKey, candidate);
  }
  const candidateTargetKeys = new Set(candidateByTargetKey.keys());
  const executableTargetKeys = new Set(outcomePackages.map((row) => row.target_key));
  if (executableTargetKeys.size !== outcomePackages.length) {
    throw new Error("Catalog outcome packages contain duplicate targets");
  }
  for (const outcomePackage of outcomePackages) {
    if (!candidateTargetKeys.has(outcomePackage.target_key)) {
      throw new Error(`Catalog outcome target is absent from this discovery run: ${outcomePackage.target_key}`);
    }
    if (outcomePackage.source_commit_sha !== sourceCommitSha) {
      throw new Error("Catalog outcome package source commit does not match the publishing run");
    }
    if (process.env.GITHUB_RUN_ID && outcomePackage.source_run_id !== process.env.GITHUB_RUN_ID) {
      throw new Error("Catalog outcome package source run does not match the publishing run");
    }
  }
  const reviewCandidates = candidates.filter((candidate) => {
    const target = catalogIncrementalTargetForGapV1(candidate);
    return !target || !executableTargetKeys.has(target.key);
  });
  const reviewWorkItems = buildCatalogSetWorkItemsV1({
    candidates: reviewCandidates,
    discoverySummary: summary,
    artifactHashes,
    sourceCommitSha,
    sourceRunUri,
  });
  const outcomeWorkItems = outcomePackages.map((outcomePackage) =>
    buildCatalogSetOutcomeWorkItemV1({ outcomePackage, sourceRunUri }));
  const reviewSupersessions = outcomePackages.map((outcomePackage, index) => ({
    replacement_work_item_key: outcomeWorkItems[index].work_item_key,
    review_work_item_keys: [buildCatalogSetWorkItemKeyV1(
      candidateByTargetKey.get(outcomePackage.target_key),
    )],
  }));
  const workItems = [...outcomeWorkItems, ...reviewWorkItems];
  await fs.mkdir(options.outDir, { recursive: true });
  await writeJson(path.join(options.outDir, "agent_registration.json"), [
    outcomeAgent,
    reviewAgent,
  ]);
  await writeJson(path.join(options.outDir, "founder_work_items.json"), workItems);

  let receipts = [];
  if (options.publish) {
    const credentials = {
      supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
    };
    if (outcomeWorkItems.length > 0) {
      receipts.push(...await publishCatalogWorkItemsV1({
        agent: outcomeAgent,
        workItems: outcomeWorkItems,
        reviewSupersessions,
        ...credentials,
      }));
    }
    if (reviewWorkItems.length > 0) {
      receipts.push(...await publishCatalogWorkItemsV1({
        agent: reviewAgent,
        workItems: reviewWorkItems,
        ...credentials,
      }));
    }
    await writeJson(path.join(options.outDir, "publication_receipts.json"), receipts);
  }
  const supersededReviewWorkItemCount = receipts.reduce((total, row) =>
    total + Number(row.review_supersession_receipt?.[0]?.superseded_review_count ?? 0), 0);
  const report = {
    version: "CATALOG_FOUNDER_WORK_ITEM_PUBLISHER_V1",
    mode: options.publish ? "publish" : "artifact_only",
    source_commit_sha: sourceCommitSha,
    source_run_uri: sourceRunUri,
    candidate_count: candidates.length,
    work_item_count: workItems.length,
    executable_outcome_work_item_count: outcomeWorkItems.length,
    review_only_work_item_count: reviewWorkItems.length,
    review_supersession_request_count: reviewSupersessions.length,
    superseded_review_work_item_count: supersededReviewWorkItemCount,
    published_count: receipts.length,
    database_writes: options.publish,
    canonical_writes: false,
    storage_writes: false,
    writer_dispatches: false,
    work_item_fingerprint_sha256: operationsSha256V1(workItems),
  };
  await writeJson(path.join(options.outDir, "summary.json"), report);
  const hashes = {};
  for (const name of (await fs.readdir(options.outDir)).filter((name) => name !== "artifact_hashes.json").sort()) {
    hashes[name] = operationsSha256V1(await fs.readFile(path.join(options.outDir, name)));
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), hashes);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[catalog-founder-work-item-publisher] ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
