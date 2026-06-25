import { createMarketEvidenceCandidateV1 } from './market_evidence_source_registry_v1.mjs';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\btrading card game\b/g, ' ')
    .replace(/\bcard game\b/g, ' ')
    .replace(/\bbase set\b/g, 'base')
    .replace(/\blv\s*\.?\s*x\b/g, 'lv x')
    .replace(/[''.:’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  const fraction = raw.match(/^([A-Za-z]*\s*0*[0-9]+[A-Za-z]?)(?:\s*\/\s*[0-9A-Za-z]+)?$/);
  const selected = fraction ? fraction[1] : raw;
  return selected
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^([a-z]+)0+(\d)/, '$1$2')
    .replace(/^0+(?=\d)/, '');
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\blv\s*\.?\s*x\b/g, 'lv-x')
    .replace(/[''.:’]/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseMoney(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '$0.00' || text === 'N/A') {
    return null;
  }
  const number = Number(text.replace(/[$,]/g, ''));
  if (!Number.isFinite(number) || number < 0) {
    return null;
  }
  return Math.round(number * 100) / 100;
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows
    .filter((entry) => entry.length > 1)
    .map((entry) => Object.fromEntries(headers.map((header, index) => [header, entry[index] ?? ''])));
}

function parseProductName(productName) {
  const raw = String(productName ?? '').trim();
  const match = raw.match(/^(?<name>.+?)\s*(?<variants>(?:\[[^\]]+\]\s*)*)#(?<number>[A-Za-z0-9./-]+)(?:\b|$)/);
  if (!match?.groups) {
    return null;
  }
  const variantLabels = [...match.groups.variants.matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim());
  return {
    raw,
    name: match.groups.name.trim(),
    number: normalizeNumber(match.groups.number),
    variant_labels: variantLabels,
  };
}

function sourceUrl(row) {
  return `https://www.pricecharting.com/game/${slug(row['console-name'])}/${slug(row['product-name'])}`;
}

function candidateTitle(row) {
  return `${row['product-name']} | ${row['console-name']}`.trim();
}

const PRICECHARTING_PROMO_SET_ALIASES = new Map([
  ['bwp', ['Pokemon Promo', 'Pokemon Black Star Promo', 'Black Star Promo']],
  ['dpp', ['Pokemon Promo', 'Pokemon Diamond Pearl Promo', 'Pokemon DP Promo']],
  ['hgssp', ['Pokemon Promo', 'Pokemon HGSS Promo']],
  ['np', ['Pokemon Promo', 'Pokemon Nintendo Promo']],
  ['smp', ['Pokemon Promo', 'Pokemon Sun Moon Promo', 'Pokemon SM Promo']],
  ['svp', ['Pokemon Promo', 'Pokemon Scarlet Violet Promo', 'Pokemon SV Promo']],
  ['swshp', ['Pokemon Promo', 'Pokemon Sword Shield Promo', 'Pokemon SWSH Promo']],
  ['xyp', ['Pokemon Promo', 'Pokemon XY Promo']],
]);

const PRICECHARTING_PROMO_NUMBER_PREFIXES = new Map([
  ['bwp', ['bw']],
  ['dpp', ['dp']],
  ['hgssp', ['hgss']],
  ['np', ['np']],
  ['smp', ['sm']],
  ['svp', ['svp', 'sv']],
  ['swshp', ['swsh']],
  ['xyp', ['xy']],
]);

function setAliasesForTarget(target, setCatalog) {
  const aliases = new Set();
  const code = String(target.set_code ?? '').trim();
  if (code) {
    aliases.add(code);
  }
  const setInfo = code ? setCatalog?.[code] : null;
  if (setInfo?.name) {
    aliases.add(setInfo.name);
  }
  if (setInfo?.printed_name) {
    aliases.add(setInfo.printed_name);
  }
  for (const alias of PRICECHARTING_PROMO_SET_ALIASES.get(code) ?? []) {
    aliases.add(alias);
  }

  // Minimal offline fallbacks for the first MEE priority rows.
  if (code === 'base1') {
    aliases.add('Base');
    aliases.add('Base Set');
    aliases.add('Pokemon Base Set');
  }
  if (code === 'base1-shadowless') {
    aliases.add('Base');
    aliases.add('Base Set');
    aliases.add('Pokemon Base Set');
  }
  if (code === 'base1-1st-edition') {
    aliases.add('Base');
    aliases.add('Base Set');
    aliases.add('Pokemon Base Set');
  }
  if (code === 'base1-1999-2000') {
    aliases.add('Base');
    aliases.add('Base Set');
    aliases.add('Pokemon Base Set');
  }

  return Array.from(aliases).map(normalizeText).filter(Boolean);
}

function numberAliasesForTarget(target) {
  const aliases = new Set();
  const exactNumber = normalizeNumber(target.number_plain);
  if (exactNumber) {
    aliases.add(exactNumber);
  }

  const code = String(target.set_code ?? '').trim();
  const prefixes = PRICECHARTING_PROMO_NUMBER_PREFIXES.get(code) ?? [];
  const digits = exactNumber.replace(/^[a-z]+/, '');
  if (digits && prefixes.length > 0) {
    for (const prefix of prefixes) {
      aliases.add(normalizeNumber(`${prefix}${digits}`));
    }
  }

  return aliases;
}

function numberMatchReason(target, parsed) {
  const rowNumber = normalizeNumber(parsed.number);
  const targetExact = normalizeNumber(target.number_plain);
  if (rowNumber === targetExact) {
    return { ok: true, reason: 'number_matched' };
  }
  const aliases = numberAliasesForTarget(target);
  if (aliases.has(rowNumber)) {
    return { ok: true, reason: 'number_prefix_alias_matched' };
  }
  return { ok: false, reason: `number_mismatch:${parsed.number}` };
}

function setMatches(target, row, setCatalog) {
  const rowSet = normalizeText(row['console-name']);
  const aliases = setAliasesForTarget(target, setCatalog);
  if (!rowSet || aliases.length === 0) {
    return { ok: false, reason: 'set_alias_unavailable' };
  }
  for (const alias of aliases) {
    if (rowSet === alias || rowSet.endsWith(` ${alias}`) || alias.endsWith(` ${rowSet}`)) {
      return { ok: true, reason: 'set_alias_matched' };
    }
  }
  return { ok: false, reason: `set_mismatch:${row['console-name']}` };
}

function finishHintFromProduct(parsed) {
  const text = normalizeText(parsed.variant_labels.join(' '));
  if (!text) {
    return null;
  }
  if (text.includes('reverse')) return 'reverse_holo';
  if (text.includes('holo')) return 'holo';
  if (text.includes('1st') || text.includes('first edition')) return 'first_edition';
  if (text.includes('stamped') || text.includes('stamp')) return 'stamped';
  return parsed.variant_labels.join(', ');
}

function variantExclusionFlags(target, parsed, setVerified) {
  const flags = [];
  if (!setVerified) {
    flags.push('wrong_set');
  }

  const targetSetCode = normalizeText(target.set_code);
  const variantText = normalizeText(parsed.variant_labels.join(' '));
  if (!variantText) {
    return flags;
  }

  flags.push('ambiguous_variant');
  const printRunVariant = /\b(1999\s*2000|1st\s*edition|first\s*edition|shadowless)\b/.test(variantText);
  const targetPrintRunMatches =
    (variantText.includes('1st edition') && targetSetCode.includes('1st edition'))
    || (variantText.includes('first edition') && targetSetCode.includes('1st edition'))
    || (variantText.includes('1999 2000') && targetSetCode.includes('1999 2000'))
    || (variantText.includes('shadowless') && targetSetCode.includes('shadowless'));
  if (printRunVariant && !targetPrintRunMatches) {
    flags.push('wrong_print_run');
  }

  return Array.from(new Set(flags)).sort();
}

function conditionCandidates(row) {
  return [
    { field: 'loose-price', condition_hint: 'loose_ungraded' },
    { field: 'graded-price', condition_hint: 'graded_reference' },
    { field: 'new-price', condition_hint: 'sealed_or_new_reference' },
  ].map((entry) => ({
    ...entry,
    raw_price: parseMoney(row[entry.field]),
  })).filter((entry) => entry.raw_price !== null);
}

function scoreMatch(target, row, parsed, setCatalog) {
  const nameMatches = normalizeText(parsed.name) === normalizeText(target.name);
  const numberMatch = numberMatchReason(target, parsed);
  const setMatch = setMatches(target, row, setCatalog);
  if (!nameMatches) return { ok: false, score: 0, reason: `name_mismatch:${parsed.name}` };
  if (!numberMatch.ok) return { ok: false, score: 0, reason: numberMatch.reason };

  let score = 20;
  const reasons = ['name_matched', numberMatch.reason];
  if (setMatch.ok) {
    score += 40;
    reasons.push(setMatch.reason);
  } else {
    score -= 10;
    reasons.push(setMatch.reason);
  }
  if (parsed.variant_labels.length === 0) {
    score += 10;
    reasons.push('base_product_label');
  } else {
    score += 5;
    reasons.push('variant_product_label');
  }
  if (parseMoney(row['loose-price']) !== null) {
    score += 5;
    reasons.push('loose_price_present');
  }

  return {
    ok: score >= 50,
    score,
    reason: reasons.join(';'),
    set_verified: setMatch.ok,
  };
}

export function parsePriceChartingCsvRowsV1(rawCsv) {
  return parseCsv(rawCsv)
    .filter((row) => /^Pokemon Card$/i.test(row.genre ?? ''))
    .map((row) => ({
      row,
      parsed: parseProductName(row['product-name']),
    }))
    .filter((entry) => entry.parsed);
}

export function acquirePriceChartingCsvEvidenceV1({
  batch,
  csvRows,
  setCatalog = {},
  generatedAt = new Date().toISOString(),
  maxCandidatesPerTarget = 3,
} = {}) {
  if (!batch || typeof batch !== 'object') {
    throw new Error('[market-evidence-pricecharting-csv] batch is required');
  }
  if (!Array.isArray(batch.items)) {
    throw new Error('[market-evidence-pricecharting-csv] batch.items must be an array');
  }
  if (!Array.isArray(csvRows)) {
    throw new Error('[market-evidence-pricecharting-csv] csvRows must be an array');
  }
  if (!Number.isInteger(maxCandidatesPerTarget) || maxCandidatesPerTarget < 1) {
    throw new Error('[market-evidence-pricecharting-csv] maxCandidatesPerTarget must be a positive integer');
  }

  const pricechartingItems = batch.items.filter((item) => item.source === 'pricecharting_reference');
  const candidateEvidence = [];
  const reviewedTargets = [];

  for (const item of pricechartingItems) {
    const matches = csvRows
      .map((entry) => ({
        entry,
        validation: scoreMatch(item, entry.row, entry.parsed, setCatalog),
      }))
      .filter((entry) => entry.validation.ok)
      .sort((left, right) => right.validation.score - left.validation.score)
      .slice(0, maxCandidatesPerTarget);

    reviewedTargets.push({
      card_print_id: item.card_print_id,
      gv_id: item.gv_id,
      name: item.name,
      set_code: item.set_code,
      number_plain: item.number_plain,
      status: matches.length > 0 ? 'candidate_evidence_created' : 'no_pricecharting_csv_match',
      match_count: matches.length,
      best_match_score: matches[0]?.validation.score ?? null,
      best_match_reason: matches[0]?.validation.reason ?? null,
    });

    for (const match of matches) {
      const prices = conditionCandidates(match.entry.row);
      const exclusionFlags = variantExclusionFlags(item, match.entry.parsed, match.validation.set_verified);
      const confidence = exclusionFlags.length > 0
        ? 'medium'
        : (match.validation.set_verified ? 'high' : 'medium');
      for (const price of prices) {
        candidateEvidence.push(createMarketEvidenceCandidateV1({
          card_print_id: item.card_print_id,
          gv_id: item.gv_id,
          source: 'pricecharting_reference',
          source_type: 'reference_price',
          source_url: sourceUrl(match.entry.row),
          raw_title: candidateTitle(match.entry.row),
          raw_price: price.raw_price,
          currency: 'USD',
          condition_hint: price.condition_hint,
          finish_hint: finishHintFromProduct(match.entry.parsed),
          observed_at: generatedAt,
          match_confidence_hint: confidence,
          exclusion_flags: exclusionFlags,
          needs_review: true,
          raw_payload: {
            lane: 'pricecharting_csv_reference_v1',
            product_id: match.entry.row.id ?? null,
            console_name: match.entry.row['console-name'],
            product_name: match.entry.row['product-name'],
            price_field: price.field,
            sales_volume: match.entry.row['sales-volume'] || null,
            release_date: match.entry.row['release-date'] || null,
            match_score: match.validation.score,
            match_reason: match.validation.reason,
            variant_exclusion_flags: exclusionFlags,
            set_verified: match.validation.set_verified,
            csv_snapshot_kind: 'local_file',
          },
        }));
      }
    }
  }

  const statusCounts = {};
  for (const target of reviewedTargets) {
    statusCounts[target.status] = (statusCounts[target.status] ?? 0) + 1;
  }

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-04D_PRICECHARTING_CSV_RAW_EVIDENCE_V1',
    mode: 'local_csv_raw_evidence_only',
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
      pricecharting_targets: pricechartingItems.length,
      reviewed_targets: reviewedTargets.length,
      candidate_evidence_count: candidateEvidence.length,
      status_counts: statusCounts,
    },
    reviewed_targets: reviewedTargets,
    candidate_evidence: candidateEvidence,
  };
}
