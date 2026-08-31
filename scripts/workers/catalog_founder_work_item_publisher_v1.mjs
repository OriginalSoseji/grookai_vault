import fs from "node:fs/promises";
import path from "node:path";

import "../../backend/env.mjs";
import {
  buildCatalogDiscoveryAgentV1,
  buildCatalogSetWorkItemsV1,
  operationsSha256V1,
  publishCatalogWorkItemsV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";

function parseArgs(argv) {
  const options = { discoveryDir: null, outDir: null, publish: false };
  for (const token of argv) {
    if (token.startsWith("--discovery-dir=")) options.discoveryDir = token.slice(16);
    else if (token.startsWith("--out-dir=")) options.outDir = token.slice(10);
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
  const agent = buildCatalogDiscoveryAgentV1();
  const sourceCommitSha = process.env.GITHUB_SHA ?? process.env.COMMIT_SHA ?? null;
  const sourceRunUri = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
  const workItems = buildCatalogSetWorkItemsV1({
    candidates,
    discoverySummary: summary,
    artifactHashes,
    sourceCommitSha,
    sourceRunUri,
  });
  await fs.mkdir(options.outDir, { recursive: true });
  await writeJson(path.join(options.outDir, "agent_registration.json"), agent);
  await writeJson(path.join(options.outDir, "founder_work_items.json"), workItems);

  let receipts = [];
  if (options.publish) {
    receipts = await publishCatalogWorkItemsV1({
      agent,
      workItems,
      supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
      serviceRoleKey: process.env.PROD_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    await writeJson(path.join(options.outDir, "publication_receipts.json"), receipts);
  }
  const report = {
    version: "CATALOG_FOUNDER_WORK_ITEM_PUBLISHER_V1",
    mode: options.publish ? "publish" : "artifact_only",
    source_commit_sha: sourceCommitSha,
    source_run_uri: sourceRunUri,
    candidate_count: candidates.length,
    work_item_count: workItems.length,
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
