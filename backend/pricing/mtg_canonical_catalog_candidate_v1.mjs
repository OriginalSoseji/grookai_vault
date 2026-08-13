import { createHash } from "node:crypto";

export const MTG_CANONICAL_CATALOG_CANDIDATE_V1 =
  "MTG_CANONICAL_CATALOG_CANDIDATE_V1";

function clean(value) {
  return String(value ?? "").trim();
}

function cleanLower(value) {
  return clean(value).toLowerCase();
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).map(cleanLower).filter(Boolean))].sort();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function scryfallCardPaperEligibilityV1(card = {}) {
  const reasons = [];
  const games = uniqueSorted(card.games);
  const lang = cleanLower(card.lang);
  if (lang !== "en") reasons.push("not_english");
  if (!games.includes("paper")) reasons.push("not_paper");
  if (card.digital === true) reasons.push("digital_only");
  if (!clean(card.id)) reasons.push("missing_scryfall_print_id");
  if (!clean(card.set_id)) reasons.push("missing_scryfall_set_id");
  if (!clean(card.set)) reasons.push("missing_set_code");
  if (!clean(card.collector_number)) reasons.push("missing_collector_number");
  if (!clean(card.name)) reasons.push("missing_name");
  return { eligible: reasons.length === 0, reasons };
}

export function scryfallTcgplayerLinksV1(card = {}) {
  const links = [];
  if (Number.isInteger(card.tcgplayer_id) && card.tcgplayer_id > 0) {
    const expectedFinishFamily = uniqueSorted(card.finishes).filter(
      (finish) => finish !== "etched",
    );
    links.push({
      product_id: card.tcgplayer_id,
      source_role: "tcgplayer_standard_product",
      expected_finish_family: expectedFinishFamily,
      expected_source_subtypes: expectedFinishFamily
        .map((finish) => (finish === "nonfoil" ? "normal" : finish))
        .filter((finish) => finish === "normal" || finish === "foil")
        .sort(),
    });
  }
  if (Number.isInteger(card.tcgplayer_etched_id) && card.tcgplayer_etched_id > 0) {
    links.push({
      product_id: card.tcgplayer_etched_id,
      source_role: "tcgplayer_etched_product",
      expected_finish_family: ["etched"],
      expected_source_subtypes: [],
    });
  }
  return links.sort((left, right) => left.product_id - right.product_id);
}

function faceImageUris(card) {
  if (card?.image_uris && typeof card.image_uris === "object") {
    return [card.image_uris];
  }
  return (card?.card_faces ?? [])
    .map((face) => face?.image_uris)
    .filter((value) => value && typeof value === "object");
}

export function buildMtgCanonicalCandidateV1(card = {}) {
  const eligibility = scryfallCardPaperEligibilityV1(card);
  if (!eligibility.eligible) {
    return {
      status: "excluded",
      exclusion_reasons: eligibility.reasons,
      scryfall_id: clean(card.id) || null,
    };
  }

  const finishes = uniqueSorted(card.finishes);
  const imageUris = faceImageUris(card);
  const identityPayload = {
    scryfall_print_id: clean(card.id),
    scryfall_oracle_id: clean(card.oracle_id) || null,
    scryfall_set_id: clean(card.set_id),
    set_code: cleanLower(card.set),
    collector_number: clean(card.collector_number),
    language: cleanLower(card.lang),
    name: clean(card.name),
    layout: cleanLower(card.layout) || null,
    frame: cleanLower(card.frame) || null,
    frame_effects: uniqueSorted(card.frame_effects),
    border_color: cleanLower(card.border_color) || null,
    security_stamp: cleanLower(card.security_stamp) || null,
    full_art: card.full_art === true,
    textless: card.textless === true,
    promo: card.promo === true,
    promo_types: uniqueSorted(card.promo_types),
    variation: card.variation === true,
    variation_of: clean(card.variation_of) || null,
    finishes,
  };
  const identitySerialization = JSON.stringify(identityPayload);
  const exactLinks = scryfallTcgplayerLinksV1(card);

  return {
    status: "candidate",
    candidate_version: MTG_CANONICAL_CATALOG_CANDIDATE_V1,
    identity_domain: "mtg_eng_paper_print",
    identity_key_version: "MTG_ENG_PAPER_PRINT_IDENTITY_V1",
    identity_key_hash: sha256(identitySerialization),
    identity_payload: identityPayload,
    set: {
      source_set_id: clean(card.set_id),
      code: cleanLower(card.set),
      name: clean(card.set_name),
      set_type: cleanLower(card.set_type) || null,
      released_at: clean(card.released_at) || null,
    },
    card: {
      source_print_id: clean(card.id),
      source_oracle_id: clean(card.oracle_id) || null,
      name: clean(card.name),
      collector_number: clean(card.collector_number),
      language: cleanLower(card.lang),
      rarity: cleanLower(card.rarity) || null,
      artist: clean(card.artist) || null,
      layout: cleanLower(card.layout) || null,
      type_line: clean(card.type_line) || null,
    },
    printing_finishes: finishes,
    exact_source_links: exactLinks,
    source_images: imageUris.map((uris, faceIndex) => ({
      face_index: faceIndex,
      normal: clean(uris.normal) || null,
      large: clean(uris.large) || null,
      png: clean(uris.png) || null,
    })),
    source_image_policy: "reference_only_until_self_hosted_and_hashed",
    publishable: false,
    requires_schema_gate: true,
    requires_apply_gate: true,
  };
}

export function reconcileMtgCatalogCandidatesV1(cards = [], sourceProducts = []) {
  const candidates = cards.map(buildMtgCanonicalCandidateV1);
  const accepted = candidates.filter((row) => row.status === "candidate");
  const productIds = new Set(
    sourceProducts
      .map((row) => Number(row.product_id))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
  const linkOwners = new Map();
  for (const candidate of accepted) {
    for (const link of candidate.exact_source_links) {
      const subtypes =
        link.expected_source_subtypes.length > 0
          ? link.expected_source_subtypes
          : ["etched"];
      for (const subtype of subtypes) {
        const identity = `${link.product_id}:${subtype}`;
        const owners = linkOwners.get(identity) ?? [];
        owners.push(candidate.card.source_print_id);
        linkOwners.set(identity, owners);
      }
    }
  }

  const links = [...linkOwners.entries()].map(([identity, owners]) => {
    const [productId, subtype] = identity.split(":");
    return {
    source_price_row_identity: identity,
    product_id: Number(productId),
    source_subtype: subtype,
    owner_count: owners.length,
    source_print_ids: owners.sort(),
    warehouse_present: productIds.has(Number(productId)),
  }});
  const collisions = links.filter((link) => link.owner_count !== 1);

  return {
    candidate_version: MTG_CANONICAL_CATALOG_CANDIDATE_V1,
    input_card_count: cards.length,
    eligible_candidate_count: accepted.length,
    excluded_count: candidates.length - accepted.length,
    exact_tcgplayer_price_lane_count: links.length,
    warehouse_present_price_lane_count: links.filter((link) => link.warehouse_present).length,
    warehouse_missing_price_lane_count: links.filter((link) => !link.warehouse_present).length,
    exact_link_collision_count: collisions.length,
    collision_source_price_rows: collisions
      .map((link) => link.source_price_row_identity)
      .sort(),
    publishable: false,
  };
}
