import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_apply_v1",
  "production_apply_v1_independent_verify", "readback.json");
const SOURCE_SHA256 =
  "ffd53870da7602ad8e3ca703c343696bf3510d64a7caf70270f9f44d7e67dc18";
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_staged_identity_review_v1",
  "starter_deck_1_review_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) args.expectedHeadSha = arg.slice(20);
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function reviewRow(row) {
  const payload = row.payload;
  const blockers = [];
  if (payload.language?.explicit !== true) blockers.push("language_authority_unverified");
  if (payload.source_image_policy !== "self_hosted_and_hashed") {
    blockers.push("image_not_self_hosted_and_hashed");
  }
  let reviewLane;
  if (row.record_class === "sealed_product_candidate") {
    reviewLane = "sealed_product_identity_review";
    blockers.push("sealed_identity_payload_not_defined");
    if (payload.product_signals?.sealed?.includes("set_of_multiple")) {
      blockers.push("multi_product_bundle_requires_separate_contract");
    }
  } else if (row.single_card_kind === "don_card") {
    reviewLane = "don_card_variant_identity_review";
    blockers.push("unnumbered_don_identity_requires_variant_contract");
  } else {
    reviewLane = "numbered_card_parent_identity_review";
  }
  return {
    row_ordinal: Number(row.row_ordinal),
    staging_row_id: row.id,
    source_product_id: Number(row.source_product_id),
    source_product_name: payload.source_product_name,
    review_lane: reviewLane,
    record_class: row.record_class,
    single_card_kind: row.single_card_kind,
    proposed_parent_gv_id: payload.parent_gv_id,
    identity_domain: payload.identity_domain,
    identity_key_version: payload.identity_key_version,
    identity_key_hash: payload.identity_key_hash,
    card_number: payload.card_evidence?.number ?? null,
    card_type: payload.card_evidence?.card_type ?? null,
    rarity: payload.card_evidence?.rarity ?? null,
    language: payload.language,
    release: payload.release,
    source_image_reference: payload.source_image_reference,
    source_image_policy: payload.source_image_policy,
    source_price_lanes: payload.source_price_lanes,
    blockers,
    review_status: "requires_separate_promotion_contract",
    canonical_write_authorized: false,
    sealed_write_authorized: false,
    publishable: false,
  };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = { commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current") };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean review producer");
  }
  const sourceText = await fs.readFile(SOURCE, "utf8");
  if (sha256(sourceText) !== SOURCE_SHA256) throw new Error("Readback source changed");
  const source = JSON.parse(sourceText);
  const rows = source.rows.rows.map(reviewRow);
  if (rows.length !== 21 || rows.some((row) => row.blockers.length === 0 ||
      row.canonical_write_authorized || row.sealed_write_authorized || row.publishable)) {
    throw new Error("Review packet boundary failed");
  }
  const counts = {
    total: rows.length,
    numbered_cards: rows.filter((row) =>
      row.review_lane === "numbered_card_parent_identity_review").length,
    don_cards: rows.filter((row) =>
      row.review_lane === "don_card_variant_identity_review").length,
    sealed_products: rows.filter((row) =>
      row.review_lane === "sealed_product_identity_review").length,
    inferred_language: rows.filter((row) => row.language.explicit !== true).length,
    images_not_self_hosted: rows.filter((row) =>
      row.source_image_policy !== "self_hosted_and_hashed").length,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const rowsBody = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  await fs.writeFile(path.join(args.outDir, "review_rows.jsonl"), rowsBody, "utf8");
  const summary = { version: "ONE_PIECE_CANONICAL_IMPORT_STAGED_IDENTITY_REVIEW_V1",
    status: "review_packet_complete_no_promotion_authority", repository,
    source_readback_sha256: SOURCE_SHA256, counts,
    promotion_ready_rows: 0, database_connections: 0, database_writes: 0,
    exact_next_gate: "define language authority, self-host images, and freeze separate numbered-card, DON, and sealed identity contracts" };
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const table = rows.map((row) => `| ${row.row_ordinal} | ${row.source_product_id} | ` +
    `${row.source_product_name.replaceAll("|", "\\|")} | ${row.card_number ?? "-"} | ` +
    `${row.review_lane} | ${row.blockers.join(", ")} |`).join("\n");
  const reportBody = `# One Piece Staged Identity Review V1\n\n` +
    `- Rows: \`${counts.total}\`\n- Numbered cards: \`${counts.numbered_cards}\`\n` +
    `- DON!! cards: \`${counts.don_cards}\`\n- Sealed candidates: \`${counts.sealed_products}\`\n` +
    `- Promotion-ready rows: \`0\`\n- Database writes: \`0\`\n\n` +
    `| # | TCGPlayer ID | Product | Number | Review lane | Blockers |\n` +
    `|---:|---:|---|---|---|---|\n${table}\n`;
  await fs.writeFile(path.join(args.outDir, "REVIEW_PACKET.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", artifacts: [
      ["review_rows.jsonl", rowsBody], ["summary.json", summaryBody],
      ["REVIEW_PACKET.md", reportBody],
    ].map(([artifactPath, body]) => ({ path: artifactPath,
      bytes: Buffer.byteLength(body), sha256: sha256(body) })),
    bound_input: { path: path.relative(ROOT, SOURCE).replaceAll("\\", "/"),
      bytes: Buffer.byteLength(sourceText), sha256: SOURCE_SHA256 },
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status, counts,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
