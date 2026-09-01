import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import "../../backend/env.mjs";
import {
  callOperationsRpcV1,
  operationsSha256V1,
  publishCatalogWorkItemsV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  buildTkSmRFounderApplyAgentV1,
  buildTkSmRFounderApplyWorkItemV1,
} from "../../backend/operations/tk_sm_r_founder_apply_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const AUDIT_DIR = path.join(
  ROOT, "docs", "audits", "catalog_incremental_promotion", "tk_sm_r_hidden_set_v1",
);

function parseArgs(argv) {
  const options = {
    publish: false,
    outDir: path.join(AUDIT_DIR, "founder_apply_publication"),
  };
  for (const token of argv) {
    if (token === "--publish") options.publish = true;
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceCommitSha = git("rev-parse", "HEAD");
  const trackedStatus = git("status", "--short", "--untracked-files=no");
  if (options.publish && trackedStatus) throw new Error("Publication requires a clean tracked worktree");
  if (options.publish && process.env.GITHUB_SHA && process.env.GITHUB_SHA !== sourceCommitSha) {
    throw new Error("Publication commit does not match GITHUB_SHA");
  }
  const manifestFile = path.join(AUDIT_DIR, "founder_apply_manifest.json");
  const packageFile = path.join(AUDIT_DIR, "package_manifest.json");
  const [manifestBytes, packageBytes] = await Promise.all([
    fs.readFile(manifestFile),
    fs.readFile(packageFile),
  ]);
  const manifest = JSON.parse(manifestBytes);
  const sourceRunUri = `https://github.com/OriginalSoseji/grookai_vault/commit/${sourceCommitSha}`;
  const createdAt = git("show", "-s", "--format=%cI", sourceCommitSha);
  const agent = buildTkSmRFounderApplyAgentV1();
  const workItem = buildTkSmRFounderApplyWorkItemV1({
    manifest,
    executorManifestSha256: operationsSha256V1(manifestBytes),
    packageManifestSha256: operationsSha256V1(packageBytes),
    sourceCommitSha,
    sourceRunUri,
    createdAt,
  });
  await fs.mkdir(options.outDir, { recursive: true });
  await writeJson(path.join(options.outDir, "agent_registration.json"), agent);
  await writeJson(path.join(options.outDir, "founder_work_item.json"), workItem);

  let receipts = [];
  if (options.publish) {
    receipts = await publishCatalogWorkItemsV1({
      agent,
      workItems: [workItem],
      supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
    });
    await writeJson(path.join(options.outDir, "publication_receipts.json"), receipts);
    await callOperationsRpcV1({
      supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
      functionName: "operations_agent_heartbeat_v1",
      body: {
        p_heartbeat: {
          agent_key: agent.agent_key,
          run_key: `tk-sm-r-publisher-${sourceCommitSha.slice(0, 12)}`,
          status: "succeeded",
          source_commit_sha: sourceCommitSha,
          source_run_uri: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
            ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
            : sourceRunUri,
          summary: { work_item_count: 1, published_count: receipts.length },
        },
      },
    });
  }
  const report = {
    version: "TK_SM_R_FOUNDER_APPLY_PUBLISHER_V1",
    mode: options.publish ? "publish" : "artifact_only",
    source_commit_sha: sourceCommitSha,
    plan_fingerprint: workItem.plan_fingerprint,
    payload_fingerprint_sha256: manifest.payload_fingerprint_sha256,
    work_item_key: workItem.work_item_key,
    execution_enabled: true,
    published_count: receipts.length,
    canonical_writes: false,
    storage_writes: false,
  };
  await writeJson(path.join(options.outDir, "summary.json"), report);
  const artifactHashes = {};
  for (const name of (await fs.readdir(options.outDir)).filter((name) => name !== "artifact_hashes.json").sort()) {
    artifactHashes[name] = operationsSha256V1(await fs.readFile(path.join(options.outDir, name)));
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), artifactHashes);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
