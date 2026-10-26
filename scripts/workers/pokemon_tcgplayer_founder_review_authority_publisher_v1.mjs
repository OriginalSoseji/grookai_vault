import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  operationsSha256V1,
  publishCatalogWorkItemsV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  buildPokemonPricingMappingAuthorityReviewWorkItemV1,
  buildTcgplayerPricingCompletionAgentV1,
} from "../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs";
import { buildPokemonFounderReviewMappingAuthorityV1 } from
  "../audits/pokemon_tcgplayer_founder_review_mapping_authority_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

function parseArgs(argv) {
  const options = { publish: false };
  for (const token of argv) {
    if (token === "--publish") options.publish = true;
    else {
      const match = /^--(review-queue|out-dir|reviewed-at|source-pricing-run-id|source-sync-run-id|source-completed-at|source-run-uri)=(.+)$/.exec(token);
      if (!match || options[match[1]]) throw new Error(`Unknown or repeated argument: ${token}`);
      options[match[1]] = match[2];
    }
  }
  for (const key of ["review-queue", "out-dir", "reviewed-at", "source-pricing-run-id",
    "source-sync-run-id", "source-completed-at", "source-run-uri"]) {
    if (!options[key]) throw new Error(`--${key} is required`);
  }
  return options;
}

const json = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const jsonl = async (file) => (await fs.readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJson = async (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(options["out-dir"]);
  const packageDir = path.join(outDir, "authority");
  await fs.mkdir(outDir, { recursive: true });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
  if (execFileSync("git", ["status", "--porcelain", "--untracked-files=no"],
    { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim()) {
    throw new Error("Pokemon founder review authority publication requires a clean tracked worktree");
  }
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== head) {
    throw new Error("Pokemon founder review authority commit does not match GITHUB_SHA");
  }
  const receipt = await buildPokemonFounderReviewMappingAuthorityV1({
    reviewQueue: path.resolve(options["review-queue"]),
    outDir: packageDir,
    reviewedAt: new Date(options["reviewed-at"]).toISOString(),
  });
  const [reviewCandidates, exactMappingCandidates, masterMappingAuthority] = await Promise.all([
    json(path.join(packageDir, "review_candidates.json")),
    jsonl(path.join(packageDir, "selected_candidates.jsonl")),
    json(path.join(packageDir, "master_authority.json")),
  ]);
  const workItem = buildPokemonPricingMappingAuthorityReviewWorkItemV1({
    candidates: reviewCandidates,
    exactMappingCandidates,
    masterMappingAuthority,
    sourcePricingRunId: options["source-pricing-run-id"],
    sourceSyncRunId: options["source-sync-run-id"],
    sourceCompletedAt: options["source-completed-at"],
    sourceCommitSha: head,
    sourceRunUri: options["source-run-uri"],
  });
  const agent = buildTcgplayerPricingCompletionAgentV1();
  const credentials = {
    supabaseUrl: process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
  };
  let publicationReceipts = [];
  if (options.publish) {
    publicationReceipts = await publishCatalogWorkItemsV1({ agent, workItems: [workItem], ...credentials });
  }
  const summary = {
    version: "POKEMON_TCGPLAYER_FOUNDER_REVIEW_AUTHORITY_PUBLISHER_V1",
    mode: options.publish ? "publish" : "artifact_only",
    source_commit_sha: head,
    authority_receipt: receipt,
    work_item_key: workItem.work_item_key,
    work_item_plan_fingerprint: workItem.plan_fingerprint,
    work_item_fingerprint_sha256: operationsSha256V1(workItem),
    work_item_count: 1,
    published_count: publicationReceipts.length,
    canonical_writes: false,
    mapping_writes: false,
    publication_writes: false,
  };
  await writeJson(path.join(outDir, "agent_registration.json"), agent);
  await writeJson(path.join(outDir, "founder_work_item.json"), workItem);
  await writeJson(path.join(outDir, "publication_receipts.json"), publicationReceipts);
  await writeJson(path.join(outDir, "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
