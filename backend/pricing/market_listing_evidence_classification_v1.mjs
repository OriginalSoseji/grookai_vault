export const MARKET_LISTING_EVIDENCE_CLASSIFICATION_VERSION = "MEE_MARKET_LISTING_EVIDENCE_CLASSIFICATION_V1";

const EXCLUSION_PATTERNS = Object.freeze({
  bulk: /\bbulk\b/i,
  lot: /\b(lot|lots|bundle|collection)\b/i,
  choose_your_card: /\b(choose|pick|you\s*pick|u\s*pick|select)\s+(your\s+)?cards?\b|\byou\s*(choose|pick)\b|\bu\s*pick\b|\bpick-your-card\b|\bpick\s+your\s+card\b|\byour\s+choice\b|\bchoose\s+your\b|\bcomplete\s+your\s+set\b/i,
  code_card: /\b(code|codes|tcgo|tcg online|live code)\b/i,
  proxy_custom: /\b(proxy|custom|fake|replica)\b/i,
  jumbo: /\b(jumbo|oversized)\b/i,
  sealed: /\b(booster|pack|box|etb|elite trainer|sealed|tin|unopened)\b/i,
  sleeve_accessory: /\b(sleeve|sleeves|binder|toploader|top loader|deck box|playmat|case|stand|card guard)\b/i,
  back_shown: /\b(back shown|card back shown|back only|reverse side shown)\b/i,
  foreign_language: /\b(japanese|jp\b|jpn\b|korean|chinese|s-chinese|simplified chinese|traditional chinese|thai|indonesian|french|german|spanish|italian|portuguese)\b/i,
  custom_fake: /\b(999\s*hp|fan\s*made|fanmade|fan\s*art|metal card|gold card|gold plated|orica|unofficial|novelty)\b/i,
  menu_listing: /\b(all available|all cards|card menu|you choose|choose from|commons uncommon|commons?\/uncommons?|holo\/reverse holo|rare holo\/reverse holo|vmax vstar|v\/vmax|gx ex|ex vmax|sir full art card|full art cards)\b/i,
  vague_listing: /\b(pokemon cards!|pokemon card single$|pokemon tcg holo trading card single card|trading card single card|ultra rare card, single card|unused near mint|water-type near mint|card game trading card game)\b/i,
  complete_set: /\b(complete set|master set|full set|complete your set|set filler)\b/i,
  minimum_order: /\b(minimum order|min order|\$\d+\s*minimum|save on \d+ or more)\b/i,
});

const GRADER_PATTERNS = Object.freeze({
  psa: /\bpsa\b|professional sports authenticator/i,
  cgc: /\bcgc\b|certified guaranty/i,
  bgs: /\bbgs\b|\bbeckett\b/i,
  sgc: /\bsgc\b/i,
  ace: /\bace\s+(?:grading|graded|[1-9](?:\.\d)?|10)\b/i,
});

const GRADE_PATTERN = /\b(?:gem\s*mint|mint|nm-mt|pristine)?\s*(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5)\b/i;

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function exclusionFlagsForListingTitle(title) {
  const flags = [];
  for (const [flag, pattern] of Object.entries(EXCLUSION_PATTERNS)) {
    if (pattern.test(title ?? "")) flags.push(flag);
  }
  return flags;
}

export function slabFeaturesForListing({ title, conditionText } = {}) {
  const haystack = compact(`${title ?? ""} ${conditionText ?? ""}`);
  const graders = Object.entries(GRADER_PATTERNS)
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([grader]) => grader);
  const gradeMatch = haystack.match(GRADE_PATTERN);
  const hasSlabLanguage = /\b(graded|slab|slabbed|encased|cert(?:ified)?|certification|graded card)\b/i.test(haystack);
  const isSlab = graders.length > 0 || hasSlabLanguage;

  return {
    is_slab: isSlab,
    graders,
    grade: gradeMatch?.[1] ?? null,
  };
}

export function classifyMarketListingEvidence({ title, conditionText } = {}) {
  const ingestionExclusionFlags = exclusionFlagsForListingTitle(title);
  const slab = slabFeaturesForListing({ title, conditionText });
  const tags = [];

  if (slab.is_slab) tags.push("slab");
  for (const grader of slab.graders) tags.push(`grader_${grader}`);
  if (slab.grade) tags.push(`grade_${slab.grade.replace(".", "_")}`);

  const listingEvidenceClass = slab.is_slab
    ? "slab"
    : ingestionExclusionFlags.length > 0
      ? "excluded_or_ambiguous"
      : "raw_single";

  return {
    listing_evidence_class: listingEvidenceClass,
    listing_evidence_tags: tags,
    slab_features: slab,
    ingestion_exclusion_flags: ingestionExclusionFlags,
  };
}
