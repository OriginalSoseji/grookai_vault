export const MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_PLAN_VERSION = "MEE_09O_REMAINING_SINGLE_SOURCE_EXACT_SOURCE_PLAN_V1";
export const CURRENT_ROLLUP_VERSION = "MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1";

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function encodeQuery(value) {
  return encodeURIComponent(compact(value));
}

function quoted(value) {
  const text = compact(value);
  return text ? `"${text}"` : "";
}

function parseBattleRoad(gvId) {
  const match = /BATTLE-ROAD-(AUTUMN|SPRING)-(\d{4})-(\d)(?:ST|ND|RD)-PLACE-STAMP/i.exec(gvId ?? "");
  if (!match) return null;
  const placeLabel = { "1": "1st Place", "2": "2nd Place", "3": "3rd Place" }[match[3]] ?? `${match[3]} Place`;
  return {
    season: `${match[1].slice(0, 1).toUpperCase()}${match[1].slice(1).toLowerCase()}`,
    year: match[2],
    place: placeLabel,
  };
}

function cardFamily(target) {
  const gvId = target.gv_id ?? "";
  if (gvId.includes("BATTLE-ROAD-")) return "battle_road_victory_cup";
  if (/GV-PK-COL-SL\d+/i.test(gvId)) return "call_of_legends_shiny_legend";
  if (/GV-PK-PR-BLW-BW0[45]/i.test(gvId)) return "bw_black_star_promo";
  return "remaining_single_source";
}

function baseTermsForTarget(target) {
  const family = cardFamily(target);
  const name = compact(target.name);
  const number = compact(target.provider_number ?? target.number_plain);

  if (family === "battle_road_victory_cup") {
    const event = parseBattleRoad(target.gv_id);
    return compact([
      "Pokemon",
      quoted("Victory Cup"),
      quoted("Battle Road"),
      event ? quoted(`${event.season} ${event.year}`) : "",
      event ? quoted(event.place) : "",
      number ? `BW${number}` : "",
    ].filter(Boolean).join(" "));
  }

  if (family === "call_of_legends_shiny_legend") {
    return compact([
      "Pokemon",
      name,
      quoted("Call of Legends"),
      number,
      "Shiny",
      "SL",
    ].filter(Boolean).join(" "));
  }

  if (family === "bw_black_star_promo") {
    return compact([
      "Pokemon",
      name,
      number,
      quoted("Black Star Promo"),
    ].filter(Boolean).join(" "));
  }

  return compact(["Pokemon", name, target.set_code, number].filter(Boolean).join(" "));
}

function exclusionTerms({ sold = false } = {}) {
  const common = "-proxy -custom -reprint -replica -lot -bundle -sealed -pack -booster -japanese -spanish -german";
  return sold ? common : `${common} -psa -bgs -cgc -graded -slab`;
}

function ebayUrl(query, { sold = false } = {}) {
  const suffix = sold ? "&LH_Sold=1&LH_Complete=1" : "";
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeQuery(query)}${suffix}`;
}

function buildEvidenceRoute(target, source, queryText, { queryKind, sold = false }) {
  return {
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    source,
    source_type: source === "ebay_active" ? "active_listing" : "sold_comp_candidate",
    acquisition_mode: source === "ebay_active" ? "approved_api" : "approved_path_required",
    query_kind: queryKind,
    query_text: queryText,
    search_url_template: ebayUrl(queryText, { sold }),
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    query_status: "planned_not_fetched",
    inclusion_hints: [
      "pokemon_card",
      "exact_name_or_event_title",
      "exact_number_or_promo_number",
      "event_season_year_when_present",
      "placement_stamp_when_present",
    ],
    exclusion_hints: [
      "lot_or_bundle",
      "sealed_product",
      "proxy_or_reprint",
      "foreign_language",
      "graded_or_slab_for_raw_active",
      "wrong_event_year",
      "wrong_place_stamp",
      "wrong_promo_number",
    ],
    evidence_goal: source === "ebay_active"
      ? "active raw asking-price evidence candidates for review only"
      : "sold/completed comp candidates for review only",
  };
}

function manualReviewSeed(target) {
  return {
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    source: "manual_review_candidate",
    source_type: "manual_review_candidate",
    acquisition_mode: "operator_curated",
    query_kind: "operator_review_seed",
    query_text: compact([target.gv_id, target.name, target.provider_number ?? target.number_plain, cardFamily(target)].join(" ")),
    search_url_template: null,
    can_publish_price_directly: false,
    requires_review_before_truth: true,
    query_status: "planned_not_fetched",
    inclusion_hints: ["exact_variant_context", "event_stamp_text", "raw_or_sold_comp_evidence"],
    exclusion_hints: ["ambiguous_variant", "source_terms_unclear", "manual_review_required"],
    evidence_goal: "human review seed for high-value or exact event-stamped cards",
  };
}

function targetPlan(target, ordinal) {
  const baseTerms = baseTermsForTarget(target);
  const activeQuery = compact(`${baseTerms} ${exclusionTerms()}`);
  const soldQuery = compact(`${baseTerms} ${exclusionTerms({ sold: true })}`);
  const family = cardFamily(target);

  return {
    ordinal,
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    name: target.name,
    set_code: target.set_code ?? null,
    provider_number: target.provider_number ?? target.number_plain ?? null,
    number_plain: target.number_plain ?? null,
    rarity: target.rarity ?? null,
    family,
    priority_score: target.priority_score ?? null,
    existing_sources: target.existing_sources ?? [],
    worklist_reasons: target.reasons ?? [],
    base_terms: baseTerms,
    exact_routes: [
      buildEvidenceRoute(target, "ebay_active", activeQuery, { queryKind: "exact_event_or_promo_api_search_terms" }),
      buildEvidenceRoute(target, "ebay_sold_candidate", soldQuery, { queryKind: "exact_event_or_promo_sold_search_terms", sold: true }),
      manualReviewSeed(target),
    ],
  };
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function buildRemainingSingleSourceExactSourcePlanV1({
  worklist,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!worklist || typeof worklist !== "object") {
    throw new Error("[remaining-single-source-exact-plan] worklist is required");
  }
  if (worklist.rollup_version !== CURRENT_ROLLUP_VERSION) {
    throw new Error("[remaining-single-source-exact-plan] worklist rollup version mismatch");
  }
  if (!Array.isArray(worklist.first_wave_sample)) {
    throw new Error("[remaining-single-source-exact-plan] worklist.first_wave_sample must be an array");
  }

  const targets = worklist.first_wave_sample;
  const plans = targets.map((target, index) => targetPlan(target, index + 1));
  const routes = plans.flatMap((plan) => plan.exact_routes);
  const findings = [];

  if (targets.length !== 18) findings.push("target_count_mismatch");
  if (routes.some((route) => route.can_publish_price_directly !== false)) findings.push("direct_publish_route_detected");
  if (routes.some((route) => route.query_status !== "planned_not_fetched")) findings.push("route_not_planned_only");
  if (routes.some((route) => route.source !== "manual_review_candidate" && !route.search_url_template)) findings.push("missing_search_url_template");

  return {
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-PLAN-V1",
    generated_at: generatedAt,
    plan_version: MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_PLAN_VERSION,
    mode: "exact_source_query_plan_no_fetch_no_writes",
    rollup_version: worklist.rollup_version,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    summary: {
      target_count: targets.length,
      route_count: routes.length,
      source_counts: countBy(routes, (route) => route.source),
      family_counts: countBy(plans, (plan) => plan.family),
    },
    targets: plans,
    findings,
    ready: findings.length === 0,
  };
}
