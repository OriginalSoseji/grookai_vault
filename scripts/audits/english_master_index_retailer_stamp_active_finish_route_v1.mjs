import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const EMI_DIR = path.join(ROOT, "docs", "audits", "verified_master_set_index_v1", "english_master_index_v1");
const GAP_JSON = path.join(EMI_DIR, "retailer_stamp_gap_audit_v1", "retailer_stamp_gap_audit_v1.json");
const OUT_DIR = path.join(EMI_DIR, "retailer_stamp_active_finish_route_v1");
const OUT_JSON = path.join(OUT_DIR, "retailer_stamp_active_finish_route_v1.json");
const OUT_MD = path.join(OUT_DIR, "retailer_stamp_active_finish_route_v1.md");

const PACKAGE_ID = "RETAILER-STAMP-01-ACTIVE-FINISH-ROUTE-READINESS";

dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, "apps", "web", ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

const ROUTE_FIXTURES = [
  {
    set_key: "bw10",
    card_number: "14",
    card_name: "Squirtle",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url: "https://pokecardvalues.co.uk/cards/squirtle-14-101-non-holo-build-a-bear-plasma-blast/bw10-14-2-18/",
        evidence_label: "Squirtle 14/101 Non-Holo Build-A-Bear",
      },
      {
        source_key: "pokumon_promo_database",
        source_kind: "collector_reference",
        source_url: "https://pokumon.com/card/build-a-bear-squirtle-14-101-build-a-bear-workshop-special-print/",
        evidence_label: "Build-A-Bear Squirtle special print, Non-holo",
      },
    ],
  },
  {
    set_key: "bw11",
    card_number: "17",
    card_name: "Charmander",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url:
          "https://pokecardvalues.co.uk/cards/charmander-17-113-non-holo-build-a-bear-legendary-treasures/bw11-17-2-18/",
        evidence_label: "Charmander 17/113 Non-Holo Build-A-Bear",
      },
      {
        source_key: "pricecharting_listing_evidence",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-legendary-treasures/charmander-17",
        evidence_label: "PriceCharting listings include Charmander Build-A-Bear 17/113 under non-holo base card context",
      },
    ],
  },
  {
    set_key: "bw5",
    card_number: "1",
    card_name: "Bulbasaur",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url: "https://pokecardvalues.co.uk/cards/bulbasaur-1-108-non-holo-build-a-bear-dark-explorers/bw5-1-2-18/",
        evidence_label: "Bulbasaur 1/108 Non-Holo Build-A-Bear",
      },
      {
        source_key: "bulbapedia_card_page_release_info",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Bulbasaur_(Dark_Explorers_1)",
        evidence_label: "Release information documents the Build-A-Bear stamped variant",
      },
    ],
  },
  {
    set_key: "g1",
    card_number: "8",
    card_name: "Tangela",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "bulbapedia_set_list",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Generations_(TCG)",
        evidence_label: 'Generations additional cards list: Tangela 8/83 Holo "Toys R Us" stamp promo',
      },
      {
        source_key: "bulbapedia_toys_r_us_promos",
        source_kind: "human_readable_checklist",
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Toys_%22R%22_Us_Promotional_cards_%28TCG%29',
        evidence_label: "Toys R Us promotional card list includes Tangela 8/83",
      },
    ],
  },
  {
    set_key: "g1",
    card_number: "22",
    card_name: "Magikarp",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "bulbapedia_set_list",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Generations_(TCG)",
        evidence_label: 'Generations additional cards list: Magikarp 22/83 Holo "Toys R Us" stamp promo',
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-generations/magikarp-toys-r-us-22",
        evidence_label: "PriceCharting exact Toys R Us Magikarp product",
      },
    ],
  },
  {
    set_key: "g1",
    card_number: "26",
    card_name: "Pikachu",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "bulbapedia_set_list",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Generations_(TCG)",
        evidence_label: 'Generations additional cards list: Pikachu 26/83 Holo "Toys R Us" stamp promo',
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-generations/pikachu-toys-r-us-26",
        evidence_label: "PriceCharting exact Toys R Us Pikachu product",
      },
    ],
  },
  {
    set_key: "g1",
    card_number: "32",
    card_name: "Slowpoke",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "bulbapedia_set_list",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Generations_(TCG)",
        evidence_label: 'Generations additional cards list: Slowpoke 32/83 Holo "Toys R Us" stamp promo',
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-generations/slowpoke-toys-r-us-32",
        evidence_label: "PriceCharting exact Toys R Us Slowpoke product",
      },
    ],
  },
  {
    set_key: "g1",
    card_number: "50",
    card_name: "Clefairy",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "bulbapedia_set_list",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Generations_(TCG)",
        evidence_label: 'Generations additional cards list: Clefairy 50/83 Holo "Toys R Us" stamp promo',
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-generations/clefairy-toys-r-us-50",
        evidence_label: "PriceCharting exact Toys R Us Clefairy product",
      },
    ],
  },
  {
    set_key: "g1",
    card_number: "53",
    card_name: "Meowth",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "bulbapedia_set_list",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Generations_(TCG)",
        evidence_label: 'Generations additional cards list: Meowth 53/83 Holo "Toys R Us" stamp promo',
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-generations/meowth-toys-r-us-53",
        evidence_label: "PriceCharting exact Toys R Us Meowth product",
      },
    ],
  },
  {
    set_key: "sm1",
    card_number: "28",
    card_name: "Psyduck",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url: "https://pokecardvalues.co.uk/cards/psyduck-28-149-non-holo-build-a-bear-sun-moon/sm1-28-2-18/",
        evidence_label: "Psyduck 28/149 Non-Holo Build-A-Bear",
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-sun-%26-moon/psyduck-build-a-bear-28",
        evidence_label: "PriceCharting exact Build-A-Bear Psyduck product",
      },
    ],
  },
  {
    set_key: "sm1",
    card_number: "64",
    card_name: "Cosmog",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "cosmos",
    evidence: [
      {
        source_key: "pricecharting_stamped_active_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-promo/cosmog-toys-r-us-64",
        evidence_label: "PriceCharting exact Toys R Us Cosmog product includes Cosmos Holo listing text",
      },
      {
        source_key: "pokedata_stamped_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pokedata.io/card/Miscellaneous%2BPromos/Cosmog%2BToys%2BR%2BUs%2B64",
        evidence_label: "PokeDATA references Toys R Us Cosmog 64 with Cosmos Holo promo listing",
      },
    ],
  },
  {
    set_key: "sm1",
    card_number: "90",
    card_name: "Snubbull",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url: "https://pokecardvalues.co.uk/cards/snubbull-90-149-non-holo-build-a-bear-sun-moon/sm1-90-2-18/",
        evidence_label: "Snubbull 90/149 Non-Holo Build-A-Bear",
      },
      {
        source_key: "pricecharting_listing_evidence",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-sun-%26-moon/snubbull-90",
        evidence_label: "PriceCharting listings include Build-A-Bear Snubbull 90/149 under base non-holo context",
      },
    ],
  },
  {
    set_key: "sm3",
    card_number: "110",
    card_name: "Stufful",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "holo",
    evidence: [
      {
        source_key: "pricecharting_stamped_active_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-burning-shadows/stufful-toys-r-us-110",
        evidence_label: "PriceCharting exact Toys R Us Stufful product includes Holo listing text",
      },
      {
        source_key: "facetofacegames_stamped_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://facetofacegames.com/products/stufful-110147-toys-r-us-promo-holo",
        evidence_label: "Face to Face Games exact Toys R Us Stufful product title includes Holo",
      },
    ],
  },
  {
    set_key: "sm4",
    card_number: "71",
    card_name: "Jigglypuff",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "facetofacegames_stamped_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://facetofacegames.com/products/jigglypuff-71111-build-a-bear-promo-non-holo",
        evidence_label: "Jigglypuff 71/111 Build-a-Bear Promo Non-Holo",
      },
      {
        source_key: "pokumon_promo_database",
        source_kind: "collector_reference",
        source_url: "https://pokumon.com/card/build-a-bear-jigglypuff-71-111-build-a-bear-workshop-special-print/",
        evidence_label: "Build-A-Bear Jigglypuff special print, Non-holo",
      },
    ],
  },
  {
    set_key: "xy12",
    card_number: "41",
    card_name: "Electabuzz",
    variant_key: "toys_r_us_stamp",
    accepted_finish_key: "cosmos",
    evidence: [
      {
        source_key: "pricecharting_stamped_active_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-evolutions/electabuzz-toys-r-us-41",
        evidence_label: "PriceCharting exact Toys R Us Electabuzz product includes Cosmos/Holo listing text",
      },
      {
        source_key: "pokedata_stamped_finish",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pokedata.io/card/Miscellaneous%2BPromos/Electabuzz%2BToys%2BR%2BUs%2B41",
        evidence_label: "PokeDATA references Toys R Us Electabuzz 41/108 Holo promo",
      },
    ],
  },
  {
    set_key: "xy2",
    card_number: "80",
    card_name: "Snorlax",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "facetofacegames_stamped_finish",
        source_kind: "marketplace_checklist",
        source_url:
          "https://facetofacegames.com/products/snorlax-80106-promo-build-a-bear-workshop-xy2msp-80-non-holo",
        evidence_label: "Snorlax 80/106 Build-A-Bear Workshop, Finish: Non-Holo",
      },
      {
        source_key: "pokumon_promo_database",
        source_kind: "collector_reference",
        source_url: "https://pokumon.com/card/build-a-bear-snorlax-80-106-build-a-bear-workshop-special-print/",
        evidence_label: "Build-A-Bear Snorlax special print, Non-holo",
      },
    ],
  },
  {
    set_key: "xy5",
    card_number: "20",
    card_name: "Vulpix",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "bulbapedia_card_page_release_info",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Vulpix_(Primal_Clash_20)",
        evidence_label: "Release information says the Build-A-Bear stamped version is Non Holofoil",
      },
      {
        source_key: "pricecharting_csv_product",
        source_kind: "marketplace_checklist",
        source_url: "https://www.pricecharting.com/game/pokemon-primal-clash/vulpix-build-a-bear-20",
        evidence_label: "PriceCharting exact Build-A-Bear Vulpix product",
      },
    ],
  },
  {
    set_key: "xy6",
    card_number: "67",
    card_name: "Meowth",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url: "https://pokecardvalues.co.uk/cards/meowth-67-108-non-holo-unlimited-roaring-skies/xy6-67-2-1/",
        evidence_label: "Poke Card Values lists Meowth 67/108 Build-A-Bear as Non-Holo",
      },
      {
        source_key: "bulbapedia_card_page_release_info",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Meowth_(Roaring_Skies_67)",
        evidence_label: "Release information documents the Build-A-Bear stamped variant",
      },
    ],
  },
  {
    set_key: "xy7",
    card_number: "63",
    card_name: "Eevee",
    variant_key: "build_a_bear_workshop_stamp",
    accepted_finish_key: "normal",
    evidence: [
      {
        source_key: "pokecardvalues_stamped_finish",
        source_kind: "collector_reference",
        source_url: "https://pokecardvalues.co.uk/cards/eevee-63-98-non-holo-build-a-bear-ancient-origins/xy7-63-2-18/",
        evidence_label: "Eevee 63/98 Non-Holo Build-A-Bear",
      },
      {
        source_key: "bulbapedia_card_page_release_info",
        source_kind: "human_readable_checklist",
        source_url: "https://bulbapedia.bulbagarden.net/wiki/Eevee_(Ancient_Origins_63)",
        evidence_label: "Release information documents the Build-A-Bear stamped variant",
      },
    ],
  },
];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function targetKey(row) {
  return [row.set_key, row.card_number, row.card_name, row.variant_key].map(normalizeKey).join("|");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase read credentials.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function detectTargetVariant(row) {
  const variant = normalizeKey(row.variant_key);
  const modifier = normalizeKey(row.printed_identity_modifier);
  if (variant.includes("build") || modifier.includes("build")) return "build_a_bear_workshop_stamp";
  if (variant.includes("toys") || modifier.includes("toys")) return "toys_r_us_stamp";
  return null;
}

async function fetchDbContext(fixtures) {
  const supabase = getSupabaseClient();
  const setCodes = Array.from(new Set(fixtures.map((row) => row.set_key)));
  const rows = [];
  const pageSize = 1000;
  for (const setCode of setCodes) {
    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("card_prints")
        .select("id,gv_id,set_code,name,number,variant_key,printed_identity_modifier,card_printings(id,finish_key,printing_gv_id)")
        .eq("set_code", setCode)
        .range(from, to);
      if (error) throw new Error(`[retailer-stamp-route] DB read failed for ${setCode}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
  }
  return rows;
}

function matchingBaseParents(dbRows, fixture) {
  return dbRows.filter(
    (row) =>
      normalizeKey(row.set_code) === normalizeKey(fixture.set_key) &&
      normalizeKey(row.number) === normalizeKey(fixture.card_number) &&
      normalizeKey(row.name) === normalizeKey(fixture.card_name) &&
      !detectTargetVariant(row),
  );
}

function matchingTargetParents(dbRows, fixture) {
  return dbRows.filter(
    (row) =>
      normalizeKey(row.set_code) === normalizeKey(fixture.set_key) &&
      normalizeKey(row.number) === normalizeKey(fixture.card_number) &&
      normalizeKey(row.name) === normalizeKey(fixture.card_name) &&
      detectTargetVariant(row) === fixture.variant_key,
  );
}

function routeClassification(row) {
  if (row.target_parent_rows.length > 0) return "target_parent_already_exists_review_before_insert";
  if (row.base_parent_rows.length !== 1) return "blocked_base_parent_not_unique";
  if (row.evidence.length < 2) return "blocked_evidence_count";
  return "ready_for_guarded_dry_run";
}

function renderMarkdown(report) {
  const rows = report.rows
    .map(
      (row) =>
        `| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label} | ${row.accepted_finish_key} | ${row.classification} | ${row.evidence
          .map((item) => item.source_url)
          .join("<br>")} |`,
    )
    .join("\n");

  return `# Retailer Stamp Active Finish Route V1

Generated: ${report.generated_at}

Audit-only active-finish routing for Build-A-Bear Workshop and Toys R Us stamped cards.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- package_id: ${report.package_id}
- fingerprint_sha256: ${report.fingerprint_sha256}
- route_rows: ${report.summary.route_rows}
- ready_for_guarded_dry_run: ${report.summary.ready_for_guarded_dry_run}
- blocked_or_review_rows: ${report.summary.blocked_or_review_rows}
- build_a_bear_workshop_stamp: ${report.summary.by_variant_key.build_a_bear_workshop_stamp ?? 0}
- toys_r_us_stamp: ${report.summary.by_variant_key.toys_r_us_stamp ?? 0}

## Rows

| set | number | card | stamp | active finish | classification | evidence |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

async function main() {
  const gap = JSON.parse(await fs.readFile(GAP_JSON, "utf8"));
  const gapKeys = new Set(gap.rows.map(targetKey));
  const missingFixtureRows = ROUTE_FIXTURES.filter((row) => !gapKeys.has(targetKey(row)));
  if (missingFixtureRows.length > 0) {
    throw new Error(`Fixture row(s) not present in retailer gap audit: ${missingFixtureRows.map(targetKey).join(", ")}`);
  }

  const dbRows = await fetchDbContext(ROUTE_FIXTURES);
  const rows = ROUTE_FIXTURES.map((fixture) => {
    const row = {
      ...fixture,
      stamp_label:
        fixture.variant_key === "build_a_bear_workshop_stamp" ? "Build-A-Bear Workshop Stamp" : "Toys R Us Stamp",
      base_parent_rows: matchingBaseParents(dbRows, fixture).map((item) => ({
        card_print_id: item.id,
        gv_id: item.gv_id,
        child_finishes: (item.card_printings ?? []).map((child) => child.finish_key).sort(),
      })),
      target_parent_rows: matchingTargetParents(dbRows, fixture).map((item) => ({
        card_print_id: item.id,
        gv_id: item.gv_id,
        child_finishes: (item.card_printings ?? []).map((child) => child.finish_key).sort(),
      })),
    };
    return { ...row, classification: routeClassification(row) };
  }).sort((left, right) => targetKey(left).localeCompare(targetKey(right)));

  const byVariantKey = {};
  const byClassification = {};
  for (const row of rows) {
    byVariantKey[row.variant_key] = (byVariantKey[row.variant_key] ?? 0) + 1;
    byClassification[row.classification] = (byClassification[row.classification] ?? 0) + 1;
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: "retailer_stamp_active_finish_route_v1",
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_gap_report: path.relative(ROOT, GAP_JSON),
    summary: {
      route_rows: rows.length,
      ready_for_guarded_dry_run: byClassification.ready_for_guarded_dry_run ?? 0,
      blocked_or_review_rows: rows.length - (byClassification.ready_for_guarded_dry_run ?? 0),
      by_variant_key: byVariantKey,
      by_classification: byClassification,
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(
    stableJson({
      package_id: PACKAGE_ID,
      rows: rows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        variant_key: row.variant_key,
        accepted_finish_key: row.accepted_finish_key,
        classification: row.classification,
        evidence_urls: row.evidence.map((item) => item.source_url),
      })),
    }),
  );

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, renderMarkdown(report));

  console.log(
    JSON.stringify(
      {
        output_json: path.relative(ROOT, OUT_JSON),
        output_md: path.relative(ROOT, OUT_MD),
        fingerprint_sha256: report.fingerprint_sha256,
        summary: report.summary,
        db_writes_performed: false,
        migrations_created: false,
      },
      null,
      2,
    ),
  );

  if (report.summary.blocked_or_review_rows > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
