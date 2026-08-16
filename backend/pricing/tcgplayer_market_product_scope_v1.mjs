export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_1 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_1";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_2";
export const TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3 =
  "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3";

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

const UNSUPPORTED_PRODUCT_RULES = Object.freeze([
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
    UNSUPPORTED_PRODUCT_RULES,
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
