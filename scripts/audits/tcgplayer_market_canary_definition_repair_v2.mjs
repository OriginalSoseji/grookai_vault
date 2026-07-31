import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateTcgplayerMarketCanaryDefinitionV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_PATH = path.join(
  REPO_ROOT,
  "backend",
  "pricing",
  "canaries",
  "tcgplayer_market_canary_100_v1.json",
);
const OUTPUT_PATH = path.join(
  REPO_ROOT,
  "backend",
  "pricing",
  "canaries",
  "tcgplayer_market_canary_100_v2.json",
);
const AUDIT_ROOT = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "pricing",
  "mee_pricing_platform_production_v1",
  "canary_definition_v2_repair_20260731",
);
const TARGET = {
  ordinal: 7,
  card_print_id: "d9f253c3-01ae-4149-a477-e11b674de5b8",
  old_card_printing_id: "15994d81-d30d-48fb-a484-75a7a07bc974",
  old_printing_gv_id: "GV-PK-SM-SM128-STD",
  old_finish: "normal",
  old_subtype: "Normal",
};
const REPLACEMENT = {
  card_printing_id: "69886a4a-0514-40ac-85f4-3a8aabac1750",
  printing_gv_id: "GV-PK-SM-SM128-HOLO",
  expected_finish: "holo",
  source_subtype_name: "Holofoil",
  expected_headline_usd: 5.72,
  selection_reason: "stability_repair_shadow_verified_same_card_holo",
  provenance_verification: {
    status: "passed",
    source_snapshot_id: "b75b40e9-e9ac-40c6-b63d-8b77c894cdf1",
    provenance_id: "e690f05a-ceaa-4fb1-bdfa-c0388e986299",
    qualification_decision_id: "5eee1506-2a86-4f15-a096-eebef59676dc",
    source_observation_id: "01110d73-e31d-43b2-b8a2-290e2344bd7e",
    source_artifact_id: "3cc97314-b72e-43ac-a091-fde2dfbe8bf8",
    source_artifact_hash:
      "efa5072cedd1d5f925df2697a81fbdc15d4f208d2f05d77f4208013b2059eb2c",
    source_row_hash:
      "4c6d2f6da48cc1b078f70f7d9e418a0a971878d9cfded93904701c5fe7c8d0b1",
    source_price_row_identity: "tcgplayer:168245:holofoil",
    source_mapping_id: "129672",
    variant_assignment_id: "04091521-c063-44fa-b75e-59c452e14e31",
    variant_assignment_version: "MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1",
  },
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

export function buildTcgplayerMarketCanaryDefinitionV2(source) {
  validateTcgplayerMarketCanaryDefinitionV1(source);
  const definition = structuredClone(source);
  const target = definition.printings.find(
    (printing) => printing.ordinal === TARGET.ordinal,
  );
  if (!target) throw new Error(`missing canary ordinal ${TARGET.ordinal}`);

  const expected = {
    card_print_id: TARGET.card_print_id,
    card_printing_id: TARGET.old_card_printing_id,
    printing_gv_id: TARGET.old_printing_gv_id,
    expected_finish: TARGET.old_finish,
    source_subtype_name: TARGET.old_subtype,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (target[field] !== value) {
      throw new Error(
        `canary repair target ${field} drifted: ${target[field]} expected ${value}`,
      );
    }
  }

  definition.canary_id = "TCGPLAYER_MARKET_CANARY_100_V2";
  definition.generator_version =
    "TCGPLAYER_MARKET_CANARY_STABILITY_REPAIR_GENERATOR_V2";
  definition.generated_at = "2026-07-31T09:56:00.000Z";
  definition.replaces_canary_id = source.canary_id;
  definition.replacement_reason =
    "The TCGPlayer Normal subtype for product 168245 disappeared from the 2026-07-31 current feed. Replace it with the already shadow-verified Holofoil child of the same canonical card.";
  definition.stratification_counts.finish.holo += 1;
  definition.stratification_counts.finish.normal -= 1;

  Object.assign(target, REPLACEMENT);
  target.provenance_verification = structuredClone(
    REPLACEMENT.provenance_verification,
  );
  target.replacement_evidence = {
    prior_source_identity: "tcgplayer:168245:normal",
    replacement_source_identity: "tcgplayer:168245:holofoil",
    shadow_run_id: source.source_shadow_run_id,
    shadow_run_key: source.source_shadow_run_key,
    shadow_state: "shadow_verified",
    current_source_run_id: "64a30384-0b42-412a-ada8-e1141b3dc6c5",
    current_source_run_key:
      "TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-31-warehouse",
    current_source_status: "completed",
    current_source_observed_on: "2026-07-31",
  };

  validateTcgplayerMarketCanaryDefinitionV1(definition);
  return definition;
}

async function main() {
  const sourceRaw = await fs.readFile(SOURCE_PATH, "utf8");
  const source = JSON.parse(sourceRaw);
  const definition = buildTcgplayerMarketCanaryDefinitionV2(source);
  const outputRaw = `${JSON.stringify(definition, null, 2)}\n`;
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.mkdir(AUDIT_ROOT, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, outputRaw);

  const summary = {
    audit_version: "TCGPLAYER_MARKET_CANARY_DEFINITION_REPAIR_V2",
    status: "passed",
    source_definition: relative(SOURCE_PATH),
    source_sha256: sha256(sourceRaw),
    repaired_definition: relative(OUTPUT_PATH),
    repaired_sha256: sha256(outputRaw),
    replaced_ordinal: TARGET.ordinal,
    replaced_source_identity: "tcgplayer:168245:normal",
    replacement_source_identity: "tcgplayer:168245:holofoil",
    expected_count: definition.expected_count,
    boundaries: {
      database_reads: false,
      database_writes: false,
      publication_activation: false,
      canonical_identity_writes: false,
    },
  };
  const summaryRaw = `${JSON.stringify(summary, null, 2)}\n`;
  const report = [
    "# TCGPlayer Market Canary Definition V2 Repair",
    "",
    `- Status: \`${summary.status}\``,
    `- Source definition: \`${summary.source_definition}\``,
    `- Repaired definition: \`${summary.repaired_definition}\``,
    `- Expected rows: \`${summary.expected_count}\``,
    `- Replaced source identity: \`${summary.replaced_source_identity}\``,
    `- Replacement source identity: \`${summary.replacement_source_identity}\``,
    "",
    "The removed Normal subtype is not carried forward as current evidence.",
    "The replacement Holofoil printing is the same canonical card and was",
    "already exact-mapped, visually verified, and shadow-verified in the",
    "same frozen source shadow cycle used by the original canary definition.",
    "",
    "No database write or publication activation occurred while generating",
    "this replacement definition.",
    "",
  ].join("\n");
  await fs.writeFile(path.join(AUDIT_ROOT, "summary.json"), summaryRaw);
  await fs.writeFile(path.join(AUDIT_ROOT, "REPORT.md"), report);
  await fs.writeFile(
    path.join(AUDIT_ROOT, "artifact_hashes.json"),
    `${JSON.stringify(
      {
        [relative(OUTPUT_PATH)]: sha256(outputRaw),
        "summary.json": sha256(summaryRaw),
        "REPORT.md": sha256(report),
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(summaryRaw);
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
