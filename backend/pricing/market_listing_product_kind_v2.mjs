export const MARKET_LISTING_PRODUCT_KIND_VERSION = "MEE_MARKET_LISTING_PRODUCT_KIND_V2";

export const MARKET_LISTING_PRODUCT_KINDS = Object.freeze([
  "raw_single",
  "graded_single",
  "sealed_product",
  "lot_or_bundle",
  "accessory",
  "unknown",
]);

const INDIVIDUAL_CARD_CATEGORY_ID = "183454";
const GRADED_CONDITION_IDS = new Set(["2750"]);

const GRADER_PATTERNS = Object.freeze({
  psa: /\bpsa\b|professional sports authenticator/i,
  cgc: /\bcgc\b|certified guaranty/i,
  bgs: /\bbgs\b|\bbeckett\b/i,
  sgc: /\bsgc\b/i,
  ace: /\bace\s+(?:grading|graded|[1-9](?:\.\d)?|10)\b/i,
});

const GRADE_PATTERN = /\b(?:gem\s*mint|mint|nm-mt|pristine)?\s*(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5)\b/i;
const GRADED_LANGUAGE = /\b(graded|slab|slabbed|encased|cert(?:ified|ification)?|graded card)\b/i;
const ACCESSORY_LANGUAGE = /\b(sleeves?|binder|top ?loader|deck box|playmat|card guard|display stand|storage case)\b/i;
const LOT_LANGUAGE = /\b(bulk|lot|bundle|collection of|complete set|master set|full set|you pick|choose your|pick your)\b/i;
const SEALED_PRODUCT_LANGUAGE = /\b(?:factory\s+sealed|brand\s+new\s+sealed|unopened)\b|\b(?:booster|blister|theme|battle|starter|build\s*&?\s*battle)\s+(?:box|pack|bundle|deck|kit)\b|\b(?:elite\s+trainer|collection|trainer\s+toolkit|premium\s+collection|collector)\s+box\b|\b(?:etb|tin)\b/i;
const EXPLICIT_CARD_LANGUAGE = /\b(single\s+card|promo\s+card|trading\s+card|pokemon\s+card)\b|\b\d{1,4}\s*\/\s*\d{1,4}\b/i;
const FALSE_SEALED_CONTEXT = /\b(pack\s+fresh|fresh\s+from\s+(?:a\s+)?pack|etb\s+promo|box\s+topper\s+card|tin\s+promo)\b/i;
const SEALED_PACKAGING_LANGUAGE = /\b(factory\s+sealed|brand\s+new\s+sealed|sealed|unopened)\b/i;

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function categoryRows(itemCategories) {
  if (!Array.isArray(itemCategories)) return [];
  return itemCategories
    .map((entry) => typeof entry === "string"
      ? { category_id: entry, category_name: null }
      : {
          category_id: String(entry?.categoryId ?? entry?.category_id ?? "").trim() || null,
          category_name: compact(entry?.categoryName ?? entry?.category_name) || null,
        })
    .filter((entry) => entry.category_id || entry.category_name);
}

function categoryMatchesProductKind(categories, expectedProductKind) {
  const kindPattern = expectedProductKind === "sealed_product"
    ? /\b(sealed|booster|box|pack|deck|kit|tin)\b/i
    : expectedProductKind === "graded_single"
      ? /\b(graded|professional grading)\b/i
      : null;
  return kindPattern ? categories.some((entry) => kindPattern.test(entry.category_name ?? "")) : false;
}

function graderFeatures(haystack) {
  const graders = Object.entries(GRADER_PATTERNS)
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([grader]) => grader);
  const gradeMatch = haystack.match(GRADE_PATTERN);
  return {
    graders,
    grade: gradeMatch?.[1] ?? null,
    has_graded_language: GRADED_LANGUAGE.test(haystack),
  };
}

function result({ productKind, confidence, evidence, graders, categories, packaging }) {
  const assignmentDomain = productKind === "sealed_product"
    ? "sealed_product"
    : productKind === "raw_single" || productKind === "graded_single"
      ? "card_printing"
      : null;
  const listingEvidenceClass = productKind === "graded_single"
    ? "slab"
    : productKind === "raw_single"
      ? "raw_single"
      : productKind;
  const tags = [`product_kind_${productKind}`];
  for (const grader of graders.graders) tags.push(`grader_${grader}`);
  if (graders.grade) tags.push(`grade_${graders.grade.replace(".", "_")}`);

  return {
    product_kind_version: MARKET_LISTING_PRODUCT_KIND_VERSION,
    product_kind: productKind,
    product_kind_confidence: confidence,
    product_kind_evidence: evidence,
    assignment_domain: assignmentDomain,
    canonical_assignment_status: "deferred",
    warehouse_eligible: true,
    pricing_publication_eligible: false,
    listing_evidence_class: listingEvidenceClass,
    listing_evidence_tags: tags,
    slab_features: {
      is_slab: productKind === "graded_single",
      graders: graders.graders,
      grade: graders.grade,
    },
    provider_categories: categories,
    packaging_state: packaging.state,
    packaging_state_confidence: packaging.confidence,
    packaging_state_evidence: packaging.evidence,
    ingestion_exclusion_flags: productKind === "raw_single" || productKind === "graded_single"
      ? []
      : ["exclude_from_card_single_pricing", `product_kind_${productKind}`],
  };
}

export function classifyMarketListingProductKindV2({
  title,
  conditionText,
  conditionId,
  itemCategories,
  acquisitionProductKind,
  acquisitionCategoryIds = [],
} = {}) {
  const normalizedTitle = compact(title);
  const normalizedCondition = compact(conditionText);
  const haystack = compact(`${normalizedTitle} ${normalizedCondition}`);
  const categories = categoryRows(itemCategories);
  const categoryIds = new Set([
    ...categories.map((entry) => entry.category_id),
    ...acquisitionCategoryIds.map(String),
  ].filter(Boolean));
  const graders = graderFeatures(haystack);
  const evidence = [];
  const packaging = SEALED_PACKAGING_LANGUAGE.test(normalizedTitle)
    ? {
        state: "sealed",
        confidence: 0.92,
        evidence: [{ signal: "sealed_packaging_title_language", strength: "high" }],
      }
    : {
        state: "not_observed",
        confidence: null,
        evidence: [],
      };

  if (ACCESSORY_LANGUAGE.test(normalizedTitle)) {
    evidence.push({ signal: "accessory_title_language", strength: "high" });
    return result({ productKind: "accessory", confidence: 0.98, evidence, graders, categories, packaging });
  }
  if (LOT_LANGUAGE.test(normalizedTitle) && !SEALED_PRODUCT_LANGUAGE.test(normalizedTitle)) {
    evidence.push({ signal: "lot_or_bundle_title_language", strength: "high" });
    return result({ productKind: "lot_or_bundle", confidence: 0.96, evidence, graders, categories, packaging });
  }

  const providerSaysGraded = GRADED_CONDITION_IDS.has(String(conditionId ?? "")) || /\bgraded\b/i.test(normalizedCondition);
  if (providerSaysGraded || graders.graders.length > 0 || graders.has_graded_language) {
    if (providerSaysGraded) evidence.push({ signal: "provider_graded_condition", value: String(conditionId ?? normalizedCondition), strength: "high" });
    if (graders.graders.length > 0) evidence.push({ signal: "recognized_grader", value: graders.graders, strength: "high" });
    if (graders.has_graded_language) evidence.push({ signal: "graded_title_language", strength: "medium" });
    return result({ productKind: "graded_single", confidence: providerSaysGraded || graders.graders.length > 0 ? 0.99 : 0.9, evidence, graders, categories, packaging });
  }

  const sealedLanguage = SEALED_PRODUCT_LANGUAGE.test(normalizedTitle);
  const falseSealedContext = FALSE_SEALED_CONTEXT.test(normalizedTitle);
  const explicitCard = EXPLICIT_CARD_LANGUAGE.test(normalizedTitle);
  const sealedRoute = acquisitionProductKind === "sealed_product";
  const sealedCategory = categoryMatchesProductKind(categories, "sealed_product");
  if (sealedLanguage && !falseSealedContext && !explicitCard) {
    evidence.push({ signal: "sealed_product_title_language", strength: "high" });
    if (sealedRoute) evidence.push({ signal: "sealed_acquisition_route", strength: "medium" });
    if (sealedCategory) evidence.push({ signal: "provider_sealed_category", strength: "high" });
    return result({ productKind: "sealed_product", confidence: sealedCategory ? 0.99 : sealedRoute ? 0.96 : 0.9, evidence, graders, categories, packaging });
  }

  if (categoryIds.has(INDIVIDUAL_CARD_CATEGORY_ID) || acquisitionProductKind === "raw_single" || acquisitionProductKind === "graded_single") {
    evidence.push({ signal: "individual_card_acquisition_context", value: INDIVIDUAL_CARD_CATEGORY_ID, strength: "medium" });
    if (falseSealedContext) evidence.push({ signal: "sealed_phrase_suppressed_by_card_context", strength: "high" });
    return result({ productKind: "raw_single", confidence: explicitCard ? 0.98 : 0.85, evidence, graders, categories, packaging });
  }

  evidence.push({ signal: "insufficient_product_kind_evidence", strength: "low" });
  return result({ productKind: "unknown", confidence: 0.25, evidence, graders, categories, packaging });
}
