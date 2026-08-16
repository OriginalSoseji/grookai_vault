import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateMtgPricingReadinessV1 } from "../../backend/pricing/mtg_pricing_readiness_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "MTG_PRICING_READINESS_AUDIT_V1";

function parseArgs(argv) {
  const args = { snapshot: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--snapshot=")) {
      args.snapshot = path.resolve(arg.slice("--snapshot=".length));
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    }
  }
  if (!args.snapshot) throw new Error("--snapshot=<production_snapshot.json> is required");
  return args;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function timestampSegment(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

function markdown(summary) {
  const { source, canonical, mappings, readiness } = summary;
  const lines = [
    "# MTG Pricing V1 Production Readiness",
    "",
    `- Audit: \`${summary.audit_version}\``,
    `- Recorded at: \`${summary.recorded_at}\``,
    `- Commit: \`${summary.repository.commit_sha}\``,
    `- Branch: \`${summary.repository.branch}\``,
    `- Result: **${readiness.status.toUpperCase()}**`,
    `- Database writes: \`0\``,
    "",
    "## Production Truth",
    "",
    `- TCGPlayer Magic category: \`${source.category_id}\` (${source.category_display_name})`,
    `- Active source groups: \`${source.active_group_count}\``,
    `- Active source products: \`${source.active_product_count}\``,
    `- Products with images: \`${source.product_image_count}\``,
    `- Raw-single candidates from source card fields: \`${source.raw_single_candidate_count}\``,
    `- Latest observed market date: \`${source.latest_observed_on}\``,
    `- Latest source price rows: \`${source.latest_price_row_count}\``,
    `- Positive TCGPlayer marketPrice rows: \`${source.latest_positive_market_price_count}\``,
    `- Canonical MTG games: \`${canonical.game_count}\``,
    `- Canonical MTG sets: \`${canonical.set_count}\``,
    `- Canonical MTG card prints: \`${canonical.card_print_count}\``,
    `- Exact MTG printing mappings: \`${mappings.exact_mapping_count}\``,
    `- Published MTG snapshots: \`${mappings.published_snapshot_count}\``,
    "",
    "## Finish Lanes",
    "",
    ...summary.source_subtypes.map(
      (row) =>
        `- \`${row.subtype_name_normalized}\`: ${row.price_row_count} rows, ${row.positive_market_price_count} positive market prices`,
    ),
    "",
    "The source currently exposes Normal and Foil market lanes. Grookai's canonical finish vocabulary has Pokémon finishes but no `foil` key, so MTG finish mapping cannot reuse the current publication policy unchanged.",
    "",
    "## Readiness Gates",
    "",
    "| Gate | Status | Blocker |",
    "|---|---|---|",
    ...readiness.gates.map(
      (gate) =>
        `| \`${gate.id}\` | ${gate.status} | ${gate.blocker ?? "none"} |`,
    ),
    "",
    "## Decision",
    "",
    "The MTG source catalog and current market prices are already warehoused and fresh. The canonical MTG product does not yet exist in Grookai: there is no MTG game, set, card-print, printing, or exact source mapping lane. Source rows are evidence, not canonical identity, and must not be published through name matching.",
    "",
    `Exact next gate: **${readiness.next_gate}**.`,
    "",
    "That gate must define the MTG canonical source, immutable card identity, treatment-versus-finish model, language policy, image authority, and exact TCGPlayer product mapping before any write plan is produced.",
    "",
    "## Boundaries",
    "",
    "- The production snapshot ran inside a read-only transaction.",
    "- No migration, canonical import, mapping, price publication, client change, or scheduler change occurred.",
    "- Sealed products, slabs, non-English cards, treatments, and ambiguous products remain source evidence only.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshot = JSON.parse(await fs.readFile(args.snapshot, "utf8"));
  if (snapshot?.read_only_proof?.transaction_read_only !== true) {
    throw new Error("Production snapshot does not prove a read-only transaction");
  }

  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const recordedAt = new Date().toISOString();
  const outDir =
    args.outDir ??
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "mtg_pricing_readiness_v1",
      timestampSegment(new Date()),
    );
  await fs.mkdir(outDir, { recursive: true });

  const readiness = evaluateMtgPricingReadinessV1(snapshot);
  const summary = {
    audit_version: AUDIT_VERSION,
    recorded_at: recordedAt,
    repository: { commit_sha: commitSha, branch },
    source_snapshot_version: snapshot.snapshot_version,
    read_only_proof: snapshot.read_only_proof,
    source: snapshot.source,
    source_subtypes: snapshot.source_subtypes,
    source_signals: snapshot.source_signals,
    canonical: snapshot.canonical,
    mappings: snapshot.mappings,
    readiness,
  };
  const runPlan = {
    audit_version: AUDIT_VERSION,
    commit_sha: commitSha,
    branch,
    mode: "read_only_production_audit",
    target: "TCGPlayer Magic category 1 and Grookai canonical MTG readiness",
    boundaries: {
      database_writes: false,
      migrations: false,
      canonical_import: false,
      mapping_apply: false,
      publication: false,
      scheduler_changes: false,
      client_changes: false,
    },
  };

  const snapshotBody = await writeJson(
    path.join(outDir, "production_snapshot.json"),
    snapshot,
  );
  const planBody = await writeJson(path.join(outDir, "run_plan.json"), runPlan);
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), summary);
  const reportBody = markdown(summary);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");

  const hashes = {
    hash_algorithm: "sha256",
    artifacts: {
      "production_snapshot.json": sha256(snapshotBody),
      "run_plan.json": sha256(planBody),
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  };
  await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
  process.stdout.write(
    `${JSON.stringify({ out_dir: outDir, status: readiness.status, next_gate: readiness.next_gate })}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

