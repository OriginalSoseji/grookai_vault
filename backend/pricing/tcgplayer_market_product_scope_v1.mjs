export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_1 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_1";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_4 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_4";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_5 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_5";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_6 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_6";

export const TCGPLAYER_MARKET_V1_1_GROUP_SCOPE_RULES = Object.freeze([
  {
    id: "world_championship_deck",
    scope_result: "special_variant_v1_1",
    pattern: /^world championship decks$/i,
  },
  {
    id: "ambiguous_mixed_group",
    scope_result: "unsupported_product_kind",
    pattern: /^miscellaneous cards & products$/i,
  },
  {
    id: "stamped_special_variant",
    scope_result: "special_variant_v1_1",
    pattern: /^(prize pack series cards|league & championship cards)$/i,
  },
  {
    id: "deck_exclusive_special_variant",
    scope_result: "special_variant_v1_1",
    pattern:
      /^(deck exclusives|battle academy(?: 2022| 2024)?|my first battle|ex battle stadium)$/i,
  },
  {
    id: "deck_exclusive_special_variant",
    scope_result: "special_variant_v1_1",
    pattern: /trainer kit/i,
  },
  {
    id: "oversized_object",
    scope_result: "unsupported_product_kind",
    pattern: /^(jumbo cards|first partner pack)$/i,
  },
  {
    id: "distribution_special_variant",
    scope_result: "special_variant_v1_1",
    pattern: /^(blister exclusives|alternate art promos)$/i,
  },
  {
    id: "special_reprint_product",
    scope_result: "special_variant_v1_1",
    pattern: /^trading card game classic$/i,
  },
  {
    id: "special_distribution_set",
    scope_result: "special_variant_v1_1",
    pattern: /^trick or trade booster bundle(?: 2023| 2024)?$/i,
  },
  {
    id: "special_print_run",
    scope_result: "special_variant_v1_1",
    pattern: /^base set \(shadowless\)$/i,
  },
]);

const SPECIAL_VARIANT_RULES_V1_1 = Object.freeze([
  {
    id: "ball_pattern_print",
    pattern:
      /\((?:(?:poke|pok[eé]|master|dusk|love|friend|quick) ball|team rocket)(?: pattern)?\)/i,
  },
  {
    id: "energy_symbol_pattern_print",
    pattern: /\(energy symbol pattern\)/i,
  },
  {
    id: "event_or_distribution_stamp",
    pattern:
      /(?:\(|\[| - )(?:staff|pre-?release|winner|league (?:stamp|stamped)|release event|stamped)(?:\)|\]|$)/i,
  },
  {
    id: "pokemon_center_print",
    pattern: /(?:\(|\[| - )(?:pok[eé]mon center)(?:\)|\]|$)/i,
  },
  {
    id: "special_holo_treatment",
    pattern:
      /(?:\(|\[| - )(?:cosmos|cracked ice|tinsel|galaxy|confetti) holo(?:foil)?(?:\)|\]|$)/i,
  },
  {
    id: "distribution_packaging_variant",
    pattern:
      /\([^)]*\b(?:collector'?s?(?: carry)? tin|series collector'?s? tin|blister exclusive|deck exclusive)\b[^)]*\)/i,
  },
]);

const SPECIAL_VARIANT_RULES_V1_2 = Object.freeze(
  SPECIAL_VARIANT_RULES_V1_1.map((rule) =>
    rule.id === "event_or_distribution_stamp"
      ? {
          ...rule,
          pattern:
            /(?:\(|\[| - )[^)\]]*\b(?:staff|pre-?release|winner|league (?:stamp|stamped)|release event|stamped)\b[^)\]]*(?:\)|\]|$)/i,
        }
      : rule,
  ),
);

const UNSUPPORTED_PRODUCT_RULES_V1_3 = Object.freeze([
  {
    id: "sealed_or_packaged_product",
    pattern:
      /\b(?:booster (?:box|pack|bundle)|elite trainer box|collection box|binder collection|poster collection|tech sticker collection|premium collection|special collection|figure collection|build (?:&|and) battle(?: box)?|collector chest|theme deck|battle deck|league battle deck|starter deck|structure deck|deck box|blister|tin|sealed)\b/i,
  },
  {
    id: "bulk_or_display_product",
    pattern:
      /\b(?:booster case|display box|display case|case of|art set|multi-?pack|lot of)\b/i,
  },
  {
    id: "accessory_or_non_card_product",
    pattern:
      /\b(?:code card|playmat|card sleeves?|portfolio|mini portfolio|binder|album|poster|sticker collection|calendar|coin|token|pin collection|figure|plush)\b/i,
  },
]);

const UNSUPPORTED_PRODUCT_RULES_V1_4 = Object.freeze([
  ...UNSUPPORTED_PRODUCT_RULES_V1_3,
  {
    id: "sealed_or_packaged_product_v1_4",
    pattern:
      /(?:\b(?:fat|intro|booster|pre-?release|sample|launch) packs?\b|\bbox(?:es)?\b|\bdecks?\b|\bset of (?:two|three|four|five|six|seven|eight|nine|ten|\d+)\b|\bdisplay\b|\bbundles?\b|\bkits?\b|\bcase\b|\bcollections?\b|^secret lair\b)/i,
  },
]);

const UNSUPPORTED_PRODUCT_RULES_V1_5 = Object.freeze([
  ...UNSUPPORTED_PRODUCT_RULES_V1_4,
  {
    id: "sealed_pack_family_v1_5",
    pattern:
      /(?:\b(?:theme|collector|draft|set|play) boosters?\b|\b(?:tournament|promo|fun|mini|sampling|preview|battle|gift|play|draft|omega|hanger|edition|clash) packs?\b|\b\d+\s*[- ]\s*(?:booster\s+)?packs?\b|\bbooster (?:two|three|four|five|six|seven|eight|nine|ten) pack\b|\bpack\s+blisters?\b|\bblisters?\b|\bcartons?\b)/i,
  },
  {
    id: "sealed_starter_family_v1_5",
    pattern:
      /(?:\bstarter (?:set|game)\b|\b(?:2|two)[- ]player(?: cd-rom)? starter(?: set)?\b|^introductory two-player set$)/i,
  },
  {
    id: "sealed_event_family_v1_5",
    pattern: /(?:\bpre-?release\b|\bland station\b|\bdraft night\b)/i,
  },
  {
    id: "sealed_boxed_edition_family_v1_5",
    pattern:
      /(?:\bgame night\b.*\bset\b|\b(?:planeswalkers?|collector) set\b|\bsdcc\b.*\b(?:exclusive\b.*)?set\b|\bmythic edition\b|^ravnica: clue edition$|^global series\b|^commander 20\d{2} -)/i,
  },
]);

function text(value) {
  return String(value ?? "").trim();
}

function evidence(row) {
  return row?.evidence && typeof row.evidence === "object"
    ? row.evidence
    : {};
}

function firstMatch(rules, value) {
  return rules.find((rule) => rule.pattern.test(value)) ?? null;
}

function result({
  scopeResult,
  ruleId = null,
  productName,
  groupName,
  hasPrintedNumberEvidence,
  policyVersion,
}) {
  return {
    policy_version: policyVersion,
    scope_result: scopeResult,
    in_scope: scopeResult === "in_scope",
    reason_code: scopeResult === "in_scope" ? null : scopeResult,
    rule_id: ruleId,
    evidence: {
      source_product_name: productName || null,
      source_group_name: groupName || null,
      has_printed_number_evidence: hasPrintedNumberEvidence,
    },
  };
}

function classifyTcgplayerMarketProductScope(row, {
  policyVersion,
  specialVariantRules,
  groupScopeRules = TCGPLAYER_MARKET_V1_1_GROUP_SCOPE_RULES,
  unsupportedProductRules = UNSUPPORTED_PRODUCT_RULES_V1_3,
}) {
  const rowEvidence = evidence(row);
  const productName = text(
    row.source_product_name ?? rowEvidence.source_product_name,
  );
  const groupName = text(row.source_group_name ?? rowEvidence.source_group_name);
  const cardRarity = text(row.card_rarity ?? rowEvidence.card_rarity);
  const hasPrintedNumberEvidence =
    (row.has_printed_number_evidence ??
      rowEvidence.has_printed_number_evidence) === true;

  const groupRule = firstMatch(
    groupScopeRules,
    groupName,
  );
  if (groupRule) {
    return result({
      scopeResult: groupRule.scope_result,
      ruleId: groupRule.id,
      productName,
      groupName,
      hasPrintedNumberEvidence,
      policyVersion,
    });
  }

  const specialVariantRule = firstMatch(specialVariantRules, productName);
  if (specialVariantRule) {
    return result({
      scopeResult: "special_variant_v1_1",
      ruleId: specialVariantRule.id,
      productName,
      groupName,
      hasPrintedNumberEvidence,
      policyVersion,
    });
  }

  if (/\bcode card\b/i.test(cardRarity)) {
    return result({
      scopeResult: "unsupported_product_kind",
      ruleId: "code_card_rarity",
      productName,
      groupName,
      hasPrintedNumberEvidence,
      policyVersion,
    });
  }

  const unsupportedProductRule = firstMatch(
    unsupportedProductRules,
    productName,
  );
  if (!hasPrintedNumberEvidence && unsupportedProductRule) {
    return result({
      scopeResult: "unsupported_product_kind",
      ruleId: unsupportedProductRule.id,
      productName,
      groupName,
      hasPrintedNumberEvidence,
      policyVersion,
    });
  }

  return result({
    scopeResult: "in_scope",
    productName,
    groupName,
    hasPrintedNumberEvidence,
    policyVersion,
  });
}

export function classifyTcgplayerMarketProductScopeV1_1(row = {}) {
  return classifyTcgplayerMarketProductScope(row, {
    policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_1,
    specialVariantRules: SPECIAL_VARIANT_RULES_V1_1,
  });
}

export function classifyTcgplayerMarketProductScopeV1_2(row = {}) {
  return classifyTcgplayerMarketProductScope(row, {
    policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2,
    specialVariantRules: SPECIAL_VARIANT_RULES_V1_2,
  });
}

export function classifyTcgplayerMarketProductScopeV1_3(row = {}) {
  if (Number(row.category_id) === 1) {
    return classifyTcgplayerMarketProductScope(row, {
      policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3,
      specialVariantRules: [],
      groupScopeRules: [],
    });
  }
  return classifyTcgplayerMarketProductScope(row, {
    policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3,
    specialVariantRules: SPECIAL_VARIANT_RULES_V1_2,
  });
}

export function classifyTcgplayerMarketProductScopeV1_4(row = {}) {
  if (Number(row.category_id) === 1) {
    return classifyTcgplayerMarketProductScope(row, {
      policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_4,
      specialVariantRules: [],
      groupScopeRules: [],
      unsupportedProductRules: UNSUPPORTED_PRODUCT_RULES_V1_4,
    });
  }
  return classifyTcgplayerMarketProductScope(row, {
    policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_4,
    specialVariantRules: SPECIAL_VARIANT_RULES_V1_2,
    unsupportedProductRules: UNSUPPORTED_PRODUCT_RULES_V1_4,
  });
}

export function classifyTcgplayerMarketProductScopeV1_5(row = {}) {
  if (Number(row.category_id) === 1) {
    return classifyTcgplayerMarketProductScope(row, {
      policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_5,
      specialVariantRules: [],
      groupScopeRules: [],
      unsupportedProductRules: UNSUPPORTED_PRODUCT_RULES_V1_5,
    });
  }
  return classifyTcgplayerMarketProductScope(row, {
    policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_5,
    specialVariantRules: SPECIAL_VARIANT_RULES_V1_2,
    unsupportedProductRules: UNSUPPORTED_PRODUCT_RULES_V1_5,
  });
}

// Preserve the earlier classifiers for replay. A provider's explicit Cosmo
// treatment is a review hold; its generic Holofoil bucket grants no authority.
export function classifyTcgplayerMarketProductScopeV1_6(row = {}) {
  const prior = classifyTcgplayerMarketProductScopeV1_5(row);
  const rowEvidence = evidence(row);
  const category = Number(row.category_id ?? rowEvidence.category_id);
  const productName = text(row.source_product_name ?? rowEvidence.source_product_name);
  if (category !== 3 || !prior.in_scope ||
      !/(?:\(|\[| - )cosmo holo(?:foil)?(?:\)|\]|$)/i.test(productName)) return prior;
  return result({
    scopeResult: "special_variant_v1_1",
    ruleId: "special_holo_treatment",
    productName,
    groupName: text(row.source_group_name ?? rowEvidence.source_group_name),
    hasPrintedNumberEvidence: (row.has_printed_number_evidence ?? rowEvidence.has_printed_number_evidence) === true,
    policyVersion: TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_6,
  });
}

// Exact cross-game product identities carry their own variant authority. Keep
// packaged-product exclusions without applying English Pokemon variant rules.
export function classifyTcgplayerMarketProductScopeV2(row={}) {
  if (![68,85].includes(Number(row.category_id))) return classifyTcgplayerMarketProductScopeV1_6(row);
  return classifyTcgplayerMarketProductScope(row, {
    policyVersion: 'TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V2',
    specialVariantRules: [], groupScopeRules: [],
    unsupportedProductRules: UNSUPPORTED_PRODUCT_RULES_V1_5,
  });
}

// Existing V2 SQL binds this exact product, its official printed number and
// unique canonical parent/finish. A collection/event label in an individual
// card's title is not evidence that the row is a sealed product. Require the
// independently retained card-type/number fields as well as that governed lane.
export function governedOnePieceSingleCardEvidenceV1(row={}) {
  const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  const meta=row.source_mapping_meta;
  if (Number(row.category_id)!==68 || row.identity_domain!=='one_piece_eng_print' ||
      row.mapping_method!=='governed_cross_tcg_exact_finish_v2' ||
      !['source_mapping_count','card_print_mapping_count','card_printing_mapping_count','identity_domain_count'].every(k=>Number(row[k])===1) ||
      !/^[1-9]\d*$/.test(String(row.cross_tcg_source_mapping_id??'')) ||
      ['cross_tcg_printing_mapping_id','source_mapping_id','variant_assignment_id','edition_assignment_id','gym_edition_assignment_id','mtg_printing_mapping_id'].some(k=>row[k]!=null) ||
      row.variant_assignment_status!=='exact_child_finish' || row.variant_assignment_version!=='CROSS_TCG_EXACT_FINISH_V2' ||
      !uuid.test(row.card_print_id??'') || !uuid.test(row.card_printing_id??'') || !text(row.gv_id) || !text(row.printing_gv_id) ||
      !['normal','foil'].includes(row.finish_key) || row.normalized_finish_key!==row.finish_key || text(row.source_subtype_name).toLowerCase()!==row.finish_key ||
      row.source_product_active!==true || row.source_product_catalog_status!=='current' ||
      !Number.isSafeInteger(Number(row.source_product_id)) || Number(row.source_product_id)<=0 ||
      !Number.isSafeInteger(Number(row.group_id)) || Number(row.group_id)<=0 ||
      meta?.mapping_authority!=='exact_durable_source_product_with_official_number_name' ||
      meta.promotion_plan_version!=='ONE_PIECE_COMPLETE_ENGLISH_NUMBERED_PARENT_PROMOTION_PLAN_V1' ||
      !uuid.test(meta.durable_staging_row_id??'') || Number(meta.source_group_id)!==Number(row.group_id)) return null;
  const fields=row.source_product_extended_data;
  if(!Array.isArray(fields))return null;
  const values=name=>fields.filter(f=>text(f?.name).toLowerCase()===name).map(f=>text(f.value));
  const numbers=values('number'),types=values('cardtype');
  if(numbers.length!==1 || types.length!==1 ||
      !/^(?:(?:OP|ST|EB|PRB)\d{2}|P)-\d{3}$/i.test(numbers[0]) ||
      !['leader','character','event','stage'].includes(types[0].toLowerCase())) return null;
  return {version:'GOVERNED_ONE_PIECE_SINGLE_CARD_EVIDENCE_V1',source_product_id:Number(row.source_product_id),source_group_id:Number(row.group_id),source_mapping_id:String(row.cross_tcg_source_mapping_id),durable_staging_row_id:meta.durable_staging_row_id,printed_number:numbers[0].toUpperCase(),card_type:types[0].toLowerCase(),number_match_authority:'v_cross_tcg_market_targets_v2'};
}

export function classifyTcgplayerMarketProductScopeV2_1(row={}) {
  const prior=classifyTcgplayerMarketProductScopeV2(row);
  if(prior.reason_code!=='unsupported_product_kind')return prior;
  const proof=governedOnePieceSingleCardEvidenceV1(row);
  if(!proof)return prior;
  return {...result({scopeResult:'in_scope',ruleId:'governed_one_piece_numbered_single',productName:text(row.source_product_name),groupName:text(row.source_group_name),hasPrintedNumberEvidence:true,policyVersion:'TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V2_1'}),governed_single_card_evidence:proof};
}
