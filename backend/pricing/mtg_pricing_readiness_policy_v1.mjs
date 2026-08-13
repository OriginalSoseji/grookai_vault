export const MTG_PRICING_READINESS_POLICY_V1 =
  "MTG_PRICING_READINESS_POLICY_V1";

export const MTG_TCGPLAYER_CATEGORY_ID = 1;

const PACKAGED_PRODUCT_TERMS = [
  "booster box",
  "booster case",
  "booster pack",
  "bundle",
  "collector booster",
  "commander deck",
  "deck box",
  "display",
  "gift edition",
  "play booster",
  "prerelease pack",
  "starter kit",
  "theme deck",
];

const LANGUAGE_MARKERS = [
  "chinese",
  "french",
  "german",
  "italian",
  "japanese",
  "korean",
  "portuguese",
  "russian",
  "spanish",
];

const TREATMENT_TERMS = [
  "borderless",
  "etched",
  "extended art",
  "galaxy foil",
  "halo foil",
  "retro frame",
  "serialized",
  "showcase",
  "surge foil",
];

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function numeric(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extendedDataEntries(product) {
  return Array.isArray(product?.extended_data) ? product.extended_data : [];
}

function extendedDataValue(product, fieldName) {
  const target = lower(fieldName);
  const entry = extendedDataEntries(product).find(
    (candidate) => lower(candidate?.name) === target,
  );
  return clean(entry?.value);
}

function matchedTerms(value, terms) {
  const normalized = lower(value);
  return terms.filter((term) => normalized.includes(term));
}

export function classifyMtgSourceProductV1(product = {}) {
  const name = clean(product.name ?? product.clean_name);
  const number = extendedDataValue(product, "Number");
  const rarity = extendedDataValue(product, "Rarity");
  const subtype = extendedDataValue(product, "SubType");
  const packagingSignals = matchedTerms(name, PACKAGED_PRODUCT_TERMS);
  const languageSignals = matchedTerms(name, LANGUAGE_MARKERS);
  const treatmentSignals = matchedTerms(name, TREATMENT_TERMS);
  const hasCardEvidence = Boolean(number && (rarity || subtype));

  let sourceClass = "unresolved_product_kind";
  if (packagingSignals.length > 0 && !hasCardEvidence) {
    sourceClass = "packaged_or_sealed_candidate";
  } else if (hasCardEvidence) {
    sourceClass = "raw_single_candidate";
  }

  return {
    policy_version: MTG_PRICING_READINESS_POLICY_V1,
    source_class: sourceClass,
    candidate_only: true,
    publishable: false,
    number: number || null,
    rarity: rarity || null,
    subtype: subtype || null,
    packaging_signals: packagingSignals,
    language_signals: languageSignals,
    treatment_signals: treatmentSignals,
    requires_canonical_identity: true,
    requires_exact_finish_mapping: true,
  };
}

function gate(id, pass, evidence, blocker) {
  return {
    id,
    status: pass ? "pass" : "blocked",
    evidence,
    blocker: pass ? null : blocker,
  };
}

export function evaluateMtgPricingReadinessV1(snapshot = {}) {
  const source = snapshot.source ?? {};
  const canonical = snapshot.canonical ?? {};
  const mappings = snapshot.mappings ?? {};
  const finishKeys = new Set(
    (canonical.finish_keys ?? []).map((entry) =>
      lower(typeof entry === "string" ? entry : entry?.key),
    ),
  );

  const gates = [
    gate(
      "mtg_source_category_current",
      numeric(source.category_id) === MTG_TCGPLAYER_CATEGORY_ID &&
        source.source_active === true,
      { category_id: source.category_id ?? null, source_active: source.source_active ?? null },
      "TCGPlayer Magic category 1 is not current in the warehouse.",
    ),
    gate(
      "mtg_source_groups_present",
      numeric(source.active_group_count) > 0,
      { active_group_count: numeric(source.active_group_count) },
      "No active Magic source groups are available.",
    ),
    gate(
      "mtg_source_products_present",
      numeric(source.active_product_count) > 0,
      { active_product_count: numeric(source.active_product_count) },
      "No active Magic source products are available.",
    ),
    gate(
      "mtg_current_market_prices_present",
      numeric(source.latest_positive_market_price_count) > 0,
      {
        observed_on: source.latest_observed_on ?? null,
        positive_market_price_count: numeric(
          source.latest_positive_market_price_count,
        ),
      },
      "No positive current Magic marketPrice observations are available.",
    ),
    gate(
      "mtg_canonical_game_present",
      numeric(canonical.game_count) === 1,
      { game_count: numeric(canonical.game_count) },
      "Grookai has no single canonical MTG game identity.",
    ),
    gate(
      "mtg_canonical_sets_present",
      numeric(canonical.set_count) > 0,
      { set_count: numeric(canonical.set_count) },
      "Grookai has no canonical MTG sets.",
    ),
    gate(
      "mtg_canonical_card_prints_present",
      numeric(canonical.card_print_count) > 0,
      { card_print_count: numeric(canonical.card_print_count) },
      "Grookai has no canonical MTG card prints.",
    ),
    gate(
      "mtg_finish_vocabulary_present",
      finishKeys.has("normal") && finishKeys.has("foil"),
      { finish_keys: [...finishKeys].sort() },
      "The canonical finish vocabulary does not yet contain both normal and foil MTG lanes.",
    ),
    gate(
      "mtg_exact_source_mappings_present",
      numeric(mappings.exact_mapping_count) > 0,
      { exact_mapping_count: numeric(mappings.exact_mapping_count) },
      "No exact MTG source-product to canonical-printing mappings exist.",
    ),
    gate(
      "mtg_publication_isolated",
      numeric(mappings.published_snapshot_count) === 0,
      { published_snapshot_count: numeric(mappings.published_snapshot_count) },
      "MTG rows are already present in the Pokémon-only publication lane.",
    ),
  ];

  const blockers = gates.filter((entry) => entry.status === "blocked");
  const sourceReady = gates.slice(0, 4).every((entry) => entry.status === "pass");
  const canonicalReady = gates
    .slice(4, 8)
    .every((entry) => entry.status === "pass");
  const mappingReady = gates[8].status === "pass";

  let nextGate = "bounded_mtg_publication_canary_plan";
  if (!sourceReady) nextGate = "repair_mtg_source_warehouse_coverage";
  else if (!canonicalReady) nextGate = "mtg_canonical_catalog_import_contract";
  else if (!mappingReady) nextGate = "mtg_exact_mapping_canary_plan";

  return {
    policy_version: MTG_PRICING_READINESS_POLICY_V1,
    status: blockers.length === 0 ? "ready" : "blocked",
    source_ready: sourceReady,
    canonical_ready: canonicalReady,
    exact_mapping_ready: mappingReady,
    publication_ready: blockers.length === 0,
    next_gate: nextGate,
    gates,
    blocker_ids: blockers.map((entry) => entry.id),
  };
}

