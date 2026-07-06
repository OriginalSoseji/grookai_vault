import { createMarketEvidenceCandidateV1 } from './market_evidence_source_registry_v1.mjs';

const SOURCE = 'tcgcsv_reference';

const GROUP_NAME_ALIASES_BY_SET = {
  basep: ['WoTC Promo', 'Wizards Black Star Promos'],
  bwp: ['Black and White Promos', 'BW Black Star Promos'],
  dpp: ['Diamond and Pearl Promos', 'DP Black Star Promos'],
  hgssp: ['HGSS Promos', 'HGSS Black Star Promos'],
  hsp: ['HGSS Promos', 'HGSS Black Star Promos'],
  mep: ['ME: Mega Evolution Promo', 'MEP Black Star Promos'],
  np: ['Nintendo Promos', 'Nintendo Black Star Promos'],
  smp: ['SM Promos', 'SM Black Star Promos'],
  swshp: ['SWSH: Sword & Shield Promo Cards', 'SWSH Black Star Promos'],
  svp: ['SV: Scarlet & Violet Promo Cards', 'Scarlet & Violet Black Star Promos'],
  xyp: ['XY Promos', 'XY Black Star Promos'],
  '2023sv': ["McDonald's Promos 2023", "McDonald's Collection 2023"],
  '2024sv': ["McDonald's Promos 2024", "McDonald's Collection 2024"],
  mcd11: ["McDonald's Promos 2011", "McDonald's Collection 2011"],
  mcd12: ["McDonald's Promos 2012", "McDonald's Collection 2012"],
  mcd14: ["McDonald's Promos 2014", "McDonald's Collection 2014"],
  mcd15: ["McDonald's Promos 2015", "McDonald's Collection 2015"],
  mcd16: ["McDonald's Promos 2016", "McDonald's Collection 2016"],
  mcd17: ["McDonald's Promos 2017", "McDonald's Collection 2017"],
  mcd18: ["McDonald's Promos 2018", "McDonald's Collection 2018"],
  mcd19: ["McDonald's Promos 2019", "McDonald's Collection 2019"],
  mcd22: ["McDonald's Promos 2022", "McDonald's Collection 2022"],
  sm1: ['SM Base Set'],
  'tk-bw-e': ['BW Trainer Kit: Excadrill & Zoroark'],
  'tk-bw-z': ['BW Trainer Kit: Excadrill & Zoroark'],
  'tk-dp-l': ['DP Trainer Kit: Manaphy & Lucario'],
  'tk-dp-m': ['DP Trainer Kit: Manaphy & Lucario'],
  'tk-hs-g': ['HGSS Trainer Kit: Gyarados & Raichu'],
  'tk-hs-r': ['HGSS Trainer Kit: Gyarados & Raichu'],
  'tk-sm-l': ['SM Trainer Kit: Lycanroc & Alolan Raichu'],
  'tk-sm-r': ['SM Trainer Kit: Lycanroc & Alolan Raichu'],
};

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, 'lvx')
    .replace(/[''.:’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(String(value ?? '').replace(/\s*\([^)]*\)\s*/g, ' '))
    .replace(/\b(team aqua|team magma|team galactic) s\b/g, '$1')
    .replace(/\bimposter professor oak\b/g, 'impostor professor oak')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/^(sv|swsh|sm|xy|bw|dp|ex|me)\d+(?:pt\d+)?\s+/g, ' ')
    .replace(/^sve\s+/g, ' ')
    .replace(/^mep\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  const selected = raw.includes('/') ? raw.split('/')[0] : raw;
  return selected
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^([a-z]+)0+(\d)/, '$1$2')
    .replace(/^0+(?=\d)/, '');
}

function numberAliasesForItem(item) {
  const base = normalizeNumber(item.number_plain);
  const aliases = new Set([base].filter(Boolean));
  if (!base) return aliases;

  if (item.set_code === 'bwp') {
    aliases.add(`bw${base.replace(/^[a-z]+/, '')}`);
  }
  if (item.set_code === 'col1' && /\bSL\d+\b/i.test(String(item.gv_id ?? ''))) {
    aliases.add(`sl${base.replace(/^[a-z]+/, '')}`);
  }
  return aliases;
}

function extendedValue(product, name) {
  return product?.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function productCardName(product) {
  return String(product?.name ?? '')
    .replace(/\s*\(#?\d+\s*-\s*(?:non-?holo|holo)\)\s*/ig, ' ')
    .replace(/\s*-\s*(?:BW|SL)\d+\b.*$/i, ' ')
    .split(/\s+-\s+/)[0]
    .trim();
}

function finishFromSubtype(value) {
  const normalized = comparable(value);
  if (normalized === 'normal') return 'normal';
  if (normalized === 'holofoil' || normalized === 'holo') return 'holo';
  if (normalized === 'reverse holofoil' || normalized === 'reverse holo') return 'reverse_holo';
  if (normalized.includes('1st edition holo')) return 'first_edition_holo';
  if (normalized.includes('1st edition') || normalized.includes('first edition')) return 'first_edition';
  if (normalized.includes('cosmos')) return 'cosmos_holo';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  if (normalized.includes('stamp')) return 'stamped';
  return value ? String(value) : null;
}

function positivePrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number * 100) / 100;
}

function groupAliasesForItem(item) {
  const aliases = new Set([
    item.set_name,
    item.printed_set_name,
    item.set_code,
    ...(GROUP_NAME_ALIASES_BY_SET[item.set_code] ?? []),
  ].filter(Boolean).map(setComparable));
  return aliases;
}

export function matchingTcgcsvGroupsForItemV1(item, groups) {
  const aliases = groupAliasesForItem(item);
  return (groups ?? []).filter((group) => {
    const name = setComparable(group.name);
    for (const alias of aliases) {
      if (name === alias || name.endsWith(alias) || alias.endsWith(name)) return true;
    }
    return false;
  });
}

function metricEntries(price) {
  return [
    ['marketPrice', price.marketPrice],
    ['lowPrice', price.lowPrice],
    ['midPrice', price.midPrice],
    ['highPrice', price.highPrice],
    ['directLowPrice', price.directLowPrice],
  ]
    .map(([metric, rawPrice]) => ({ metric, raw_price: positivePrice(rawPrice) }))
    .filter((entry) => entry.raw_price !== null);
}

function productMatchesItem(item, product) {
  const productNumber = normalizeNumber(extendedValue(product, 'Number'));
  const itemNumberAliases = numberAliasesForItem(item);
  if (!productNumber || itemNumberAliases.size === 0 || !itemNumberAliases.has(productNumber)) {
    return false;
  }
  return cardComparable(productCardName(product)) === cardComparable(item.name);
}

function candidatesForItem({ item, groups, groupPayloadsByGroupId, generatedAt }) {
  const candidateEvidence = [];
  const matchedGroups = matchingTcgcsvGroupsForItemV1(item, groups);
  const matchedProducts = [];
  for (const group of matchedGroups) {
    const payload = groupPayloadsByGroupId?.[group.groupId] ?? groupPayloadsByGroupId?.[String(group.groupId)];
    const products = payload?.products ?? [];
    const prices = payload?.prices ?? [];
    const productsById = new Map(products.map((product) => [product.productId, product]));
    const matchedProductIds = new Set();
    for (const product of products) {
      if (productMatchesItem(item, product)) {
        matchedProductIds.add(product.productId);
        matchedProducts.push({
          group_id: group.groupId,
          product_id: product.productId,
          product_name: product.name,
          product_number: extendedValue(product, 'Number'),
        });
      }
    }
    for (const price of prices) {
      if (!matchedProductIds.has(price.productId)) continue;
      const product = productsById.get(price.productId);
      if (!product) continue;
      const finishHint = finishFromSubtype(price.subTypeName);
      for (const metric of metricEntries(price)) {
        candidateEvidence.push(createMarketEvidenceCandidateV1({
          card_print_id: item.card_print_id,
          gv_id: item.gv_id,
          source: SOURCE,
          source_type: 'reference_price',
          source_url: product.url ?? `https://tcgcsv.com/tcgplayer/3/${group.groupId}/products`,
          raw_title: `${product.name} | ${group.name} | ${price.subTypeName} ${metric.metric}`,
          raw_price: metric.raw_price,
          currency: 'USD',
          condition_hint: `tcgcsv:${metric.metric}`,
          finish_hint: finishHint,
          observed_at: generatedAt,
          match_confidence_hint: 'high',
          exclusion_flags: [],
          needs_review: true,
          raw_payload: {
            lane: 'tcgcsv_reference_v1',
            group_id: group.groupId,
            group_name: group.name,
            product_id: product.productId,
            product_name: product.name,
            product_number: extendedValue(product, 'Number'),
            product_rarity: extendedValue(product, 'Rarity'),
            product_modified_on: product.modifiedOn ?? null,
            subtype_name: price.subTypeName,
            metric: metric.metric,
            match_basis: 'tcgcsv_group_name_product_name_number',
          },
        }));
      }
    }
  }
  return { candidateEvidence, matchedGroups, matchedProducts };
}

export function acquireTcgcsvReferenceEvidenceV1({
  batch,
  groups,
  groupPayloadsByGroupId,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!batch || typeof batch !== 'object') {
    throw new Error('[market-evidence-tcgcsv] batch is required');
  }
  if (!Array.isArray(batch.items)) {
    throw new Error('[market-evidence-tcgcsv] batch.items must be an array');
  }
  if (!Array.isArray(groups)) {
    throw new Error('[market-evidence-tcgcsv] groups must be an array');
  }
  if (!groupPayloadsByGroupId || typeof groupPayloadsByGroupId !== 'object') {
    throw new Error('[market-evidence-tcgcsv] groupPayloadsByGroupId is required');
  }

  const items = batch.items.filter((item) => item.source === SOURCE);
  const candidateEvidence = [];
  const reviewedTargets = [];

  for (const item of items) {
    const result = candidatesForItem({ item, groups, groupPayloadsByGroupId, generatedAt });
    candidateEvidence.push(...result.candidateEvidence);
    const status = result.matchedGroups.length === 0
      ? 'no_tcgcsv_group_match'
      : (result.candidateEvidence.length > 0
        ? 'candidate_evidence_created'
        : (result.matchedProducts.length > 0 ? 'no_tcgcsv_price_rows_for_product' : 'no_tcgcsv_product_price_match'));
    reviewedTargets.push({
      card_print_id: item.card_print_id,
      gv_id: item.gv_id,
      name: item.name,
      set_code: item.set_code,
      set_name: item.set_name ?? null,
      number_plain: item.number_plain,
      status,
      matched_group_count: result.matchedGroups.length,
      matched_groups: result.matchedGroups.map((group) => ({ group_id: group.groupId, name: group.name })),
      matched_product_count: result.matchedProducts.length,
      matched_products: result.matchedProducts.slice(0, 10),
      candidate_count: result.candidateEvidence.length,
    });
  }

  const statusCounts = {};
  for (const target of reviewedTargets) {
    statusCounts[target.status] = (statusCounts[target.status] ?? 0) + 1;
  }

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1',
    mode: 'public_snapshot_reference_raw_evidence_only',
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
      raw_evidence_objects_created: true,
      raw_evidence_objects_persisted_to_db: false,
    },
    summary: {
      tcgcsv_targets: items.length,
      reviewed_targets: reviewedTargets.length,
      candidate_evidence_count: candidateEvidence.length,
      status_counts: statusCounts,
    },
    reviewed_targets: reviewedTargets,
    candidate_evidence: candidateEvidence,
  };
}
