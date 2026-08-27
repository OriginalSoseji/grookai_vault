import crypto from "node:crypto";

export const COLLECTIBLE_SHADOW_ADAPTER_REGISTRY_VERSION =
  "COLLECTIBLE_SHADOW_ADAPTER_REGISTRY_V1";

export const COLLECTIBLE_DOMAINS = Object.freeze({
  TCG_CARD: "tcg_card",
  VINYL_FIGURE: "vinyl_figure",
  DIE_CAST_VEHICLE: "die_cast_vehicle",
  SPORTS_CARD: "sports_card",
  COMIC: "comic",
});

export const COLLECTIBLE_IDENTITY_CONTRACTS = Object.freeze({
  tcg_card_v1: {
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    required_coordinates: ["game", "language", "set_or_product", "collector_number"],
    variant_coordinates: ["finish", "rarity", "parallel", "stamp", "region"],
  },
  vinyl_figure_v1: {
    domain: COLLECTIBLE_DOMAINS.VINYL_FIGURE,
    required_coordinates: ["manufacturer", "product_line", "franchise", "character", "box_number"],
    variant_coordinates: ["mold", "chase", "finish", "exclusive", "sticker", "region", "packaging"],
  },
  die_cast_vehicle_v1: {
    domain: COLLECTIBLE_DOMAINS.DIE_CAST_VEHICLE,
    required_coordinates: ["manufacturer", "casting", "release_year", "series"],
    variant_coordinates: ["release_number", "color", "wheel_type", "base", "treasure_hunt", "exclusive", "region", "packaging"],
  },
  sports_card_v1: {
    domain: COLLECTIBLE_DOMAINS.SPORTS_CARD,
    required_coordinates: ["manufacturer", "year", "sport", "brand", "product", "subject", "card_number"],
    variant_coordinates: ["subset", "parallel", "serial_numbering", "autograph", "relic", "variation", "redemption"],
  },
  comic_v1: {
    domain: COLLECTIBLE_DOMAINS.COMIC,
    required_coordinates: ["publisher", "title", "volume", "issue_number", "printing", "cover"],
    variant_coordinates: ["format", "language", "retailer", "ratio", "upc", "isbn", "cover_artist"],
  },
});

function adapter({
  adapterId,
  catalogKey,
  displayName,
  domain,
  identityContract,
  officialSourceUrl,
  operator,
  sourceAuthority = "official_operator",
  executionStage = "official_probe_active",
  cadence = "daily",
  existingRuntime = null,
  notes = [],
}) {
  return {
    adapter_id: adapterId,
    catalog_key: catalogKey,
    display_name: displayName,
    domain,
    identity_contract: identityContract,
    operator,
    official_source_url: officialSourceUrl,
    source_authority: sourceAuthority,
    execution_stage: executionStage,
    poll_cadence: cadence,
    probe_enabled: executionStage === "official_probe_active",
    existing_runtime: existingRuntime,
    canonical_authority: false,
    persistence_policy: "hash_and_metadata_only",
    rights: {
      catalog_extraction: "terms_review_required",
      text_republication: "not_authorized",
      image_republication: "not_authorized",
      self_hosting: "not_authorized",
    },
    notes,
  };
}

export const COLLECTIBLE_SHADOW_ADAPTERS = Object.freeze([
  adapter({
    adapterId: "pokemon_existing_v1",
    catalogKey: "pokemon",
    displayName: "Pokemon",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/",
    operator: "The Pokemon Company International",
    executionStage: "managed_by_existing_runtime",
    existingRuntime: "universal_catalog_discovery_v1",
  }),
  adapter({
    adapterId: "mtg_existing_v1",
    catalogKey: "mtg",
    displayName: "Magic: The Gathering",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://scryfall.com/docs/api",
    operator: "Scryfall",
    sourceAuthority: "governed_community_reference",
    executionStage: "managed_by_existing_runtime",
    existingRuntime: "universal_catalog_discovery_v1",
  }),
  adapter({
    adapterId: "one_piece_existing_v1",
    catalogKey: "one_piece",
    displayName: "One Piece Card Game",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://en.onepiece-cardgame.com/cardlist/",
    operator: "Bandai",
    executionStage: "managed_by_existing_runtime",
    existingRuntime: "universal_catalog_discovery_v1",
  }),
  adapter({
    adapterId: "yugioh_official_v1",
    catalogKey: "yugioh",
    displayName: "Yu-Gi-Oh!",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://www.db.yugioh-card.com/yugiohdb/card_list.action?request_locale=en",
    operator: "Konami",
  }),
  adapter({
    adapterId: "digimon_official_v1",
    catalogKey: "digimon",
    displayName: "Digimon Card Game",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://world.digimoncard.com/cards/?search=true",
    operator: "Bandai",
  }),
  adapter({
    adapterId: "dragon_ball_super_masters_official_v1",
    catalogKey: "dragon_ball_super_masters",
    displayName: "Dragon Ball Super Card Game Masters",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://www.dbs-cardgame.com/us-en/cardlist/",
    operator: "Bandai",
  }),
  adapter({
    adapterId: "dragon_ball_super_fusion_world_official_v1",
    catalogKey: "dragon_ball_super_fusion_world",
    displayName: "Dragon Ball Super Card Game Fusion World",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://www.dbs-cardgame.com/fw/en/cardlist/?search=true",
    operator: "Bandai",
  }),
  adapter({
    adapterId: "star_wars_unlimited_official_v1",
    catalogKey: "star_wars_unlimited",
    displayName: "Star Wars: Unlimited",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://starwarsunlimited.com/cards",
    operator: "Fantasy Flight Games",
  }),
  adapter({
    adapterId: "lorcana_official_v1",
    catalogKey: "lorcana",
    displayName: "Disney Lorcana",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://cards.disneylorcana.com/en-US/",
    operator: "Ravensburger",
  }),
  adapter({
    adapterId: "flesh_and_blood_official_v1",
    catalogKey: "flesh_and_blood",
    displayName: "Flesh and Blood",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://fabtcg.com/en/resources/card-galleries/",
    operator: "Legend Story Studios",
  }),
  adapter({
    adapterId: "gundam_official_v1",
    catalogKey: "gundam",
    displayName: "Gundam Card Game",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://www.gundam-gcg.com/en/cards/",
    operator: "Bandai",
  }),
  adapter({
    adapterId: "union_arena_official_v1",
    catalogKey: "union_arena",
    displayName: "Union Arena",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://www.unionarena-tcg.com/na/cardlist/?search=true",
    operator: "Bandai",
  }),
  adapter({
    adapterId: "cardfight_vanguard_official_v1",
    catalogKey: "cardfight_vanguard",
    displayName: "Cardfight!! Vanguard",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://en.cf-vanguard.com/cardlist/cardsearch/",
    operator: "Bushiroad",
  }),
  adapter({
    adapterId: "weiss_schwarz_official_v1",
    catalogKey: "weiss_schwarz",
    displayName: "Weiss Schwarz",
    domain: COLLECTIBLE_DOMAINS.TCG_CARD,
    identityContract: "tcg_card_v1",
    officialSourceUrl: "https://en.ws-tcg.com/cardlist/list/",
    operator: "Bushiroad",
  }),
  adapter({
    adapterId: "funko_official_v1",
    catalogKey: "funko",
    displayName: "Funko",
    domain: COLLECTIBLE_DOMAINS.VINYL_FIGURE,
    identityContract: "vinyl_figure_v1",
    officialSourceUrl: "https://funko.com/all-funko-products/",
    operator: "Funko",
  }),
  adapter({
    adapterId: "hot_wheels_official_v1",
    catalogKey: "hot_wheels",
    displayName: "Hot Wheels",
    domain: COLLECTIBLE_DOMAINS.DIE_CAST_VEHICLE,
    identityContract: "die_cast_vehicle_v1",
    officialSourceUrl: "https://creations.mattel.com/pages/hot-wheels-collectors/en-us",
    operator: "Mattel",
  }),
  adapter({
    adapterId: "topps_official_checklists_v1",
    catalogKey: "sports_topps",
    displayName: "Topps Sports Cards",
    domain: COLLECTIBLE_DOMAINS.SPORTS_CARD,
    identityContract: "sports_card_v1",
    officialSourceUrl: "https://www.topps.com/pages/checklists",
    operator: "Topps/Fanatics",
  }),
  adapter({
    adapterId: "panini_official_checklists_v1",
    catalogKey: "sports_panini",
    displayName: "Panini Sports Cards",
    domain: COLLECTIBLE_DOMAINS.SPORTS_CARD,
    identityContract: "sports_card_v1",
    officialSourceUrl: "https://www.paniniamerica.net/checklist.html",
    operator: "Panini America",
  }),
  adapter({
    adapterId: "upper_deck_official_checklists_v1",
    catalogKey: "sports_upper_deck",
    displayName: "Upper Deck Sports Cards",
    domain: COLLECTIBLE_DOMAINS.SPORTS_CARD,
    identityContract: "sports_card_v1",
    officialSourceUrl: "https://upperdeck.com/checklists/",
    operator: "Upper Deck",
  }),
  adapter({
    adapterId: "comics_licensed_catalog_v1",
    catalogKey: "comics",
    displayName: "Comics",
    domain: COLLECTIBLE_DOMAINS.COMIC,
    identityContract: "comic_v1",
    officialSourceUrl: null,
    operator: "Multiple publishers",
    executionStage: "licensed_source_required",
    cadence: "disabled",
    notes: ["No single publisher source proves cross-publisher issue and cover identity."],
  }),
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function collectibleRegistryFingerprintV1(
  adapters = COLLECTIBLE_SHADOW_ADAPTERS,
) {
  return crypto.createHash("sha256").update(stableJson(adapters)).digest("hex");
}

export function validateCollectibleShadowAdapterRegistryV1(
  adapters = COLLECTIBLE_SHADOW_ADAPTERS,
) {
  const ids = new Set();
  const keys = new Set();
  for (const row of adapters) {
    if (!row.adapter_id || ids.has(row.adapter_id)) {
      throw new Error(`Duplicate or missing adapter_id: ${row.adapter_id}`);
    }
    if (!row.catalog_key || keys.has(row.catalog_key)) {
      throw new Error(`Duplicate or missing catalog_key: ${row.catalog_key}`);
    }
    ids.add(row.adapter_id);
    keys.add(row.catalog_key);
    const contract = COLLECTIBLE_IDENTITY_CONTRACTS[row.identity_contract];
    if (!contract || contract.domain !== row.domain) {
      throw new Error(`Identity contract mismatch: ${row.adapter_id}`);
    }
    if (row.canonical_authority !== false ||
        row.persistence_policy !== "hash_and_metadata_only") {
      throw new Error(`Adapter exceeds shadow authority: ${row.adapter_id}`);
    }
    if (row.probe_enabled && !/^https:\/\//.test(row.official_source_url ?? "")) {
      throw new Error(`Probe adapter requires HTTPS source: ${row.adapter_id}`);
    }
    if (row.rights?.image_republication !== "not_authorized" ||
        row.rights?.self_hosting !== "not_authorized") {
      throw new Error(`Unproven image authority: ${row.adapter_id}`);
    }
  }
  return {
    version: COLLECTIBLE_SHADOW_ADAPTER_REGISTRY_VERSION,
    adapter_count: adapters.length,
    probe_adapter_count: adapters.filter((row) => row.probe_enabled).length,
    blocked_adapter_count: adapters.filter((row) =>
      row.execution_stage === "licensed_source_required").length,
    by_domain: Object.fromEntries(Object.values(COLLECTIBLE_DOMAINS).map((domain) => [
      domain,
      adapters.filter((row) => row.domain === domain).length,
    ])),
    fingerprint_sha256: collectibleRegistryFingerprintV1(adapters),
  };
}

export function normalizeCollectibleShadowCandidateV1(adapterRow, candidate) {
  const contract = COLLECTIBLE_IDENTITY_CONTRACTS[adapterRow?.identity_contract];
  if (!contract || contract.domain !== adapterRow.domain) {
    throw new Error("Adapter identity contract is invalid");
  }
  const coordinates = candidate?.identity_coordinates;
  if (!coordinates || typeof coordinates !== "object" || Array.isArray(coordinates)) {
    throw new Error("identity_coordinates must be an object");
  }
  const missing = contract.required_coordinates.filter((key) =>
    String(coordinates[key] ?? "").trim() === "");
  const status = missing.length === 0 ? "identity_coordinates_complete" : "incomplete_candidate";
  return {
    shadow_candidate_id: `${adapterRow.adapter_id}:${String(candidate.source_candidate_id ?? "").trim()}`,
    adapter_id: adapterRow.adapter_id,
    catalog_key: adapterRow.catalog_key,
    domain: adapterRow.domain,
    source_candidate_id: String(candidate.source_candidate_id ?? "").trim(),
    source_url: String(candidate.source_url ?? adapterRow.official_source_url ?? "").trim(),
    label: String(candidate.label ?? "").trim(),
    identity_contract: adapterRow.identity_contract,
    identity_coordinates: coordinates,
    missing_required_coordinates: missing,
    status,
    authority: "shadow_evidence_not_canonical",
    canonical_authority: false,
    image_republication_authorized: false,
  };
}
