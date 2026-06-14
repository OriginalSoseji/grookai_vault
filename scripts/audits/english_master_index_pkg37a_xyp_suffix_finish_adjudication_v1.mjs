import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const LANES_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const CARDS_JSON = path.join(AUDIT_DIR, 'english_master_index_cards_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const PUBLISHABLE_XYP_EVIDENCE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', 'xyp', 'evidence.json');
const PRICECHARTING_CSV = path.join(ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg37a_xyp_suffix_finish_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg37a_xyp_suffix_finish_adjudication_v1.md');

const PACKAGE_ID = 'PKG-37A-XYP-SUFFIX-FINISH-ADJUDICATION';
const TARGET_NUMBERS = new Set(['XY150a', 'XY177a', 'XY198a', 'XY200a', 'XY67a'].map((value) => value.toLowerCase()));
const EXPLICIT_HOLO_EVIDENCE_BY_NUMBER = {
  xy150a: [
    {
      source_key: 'pricecharting_sales_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/game/pokemon-promo/yveltal-ex-xy150a',
      evidence_label: 'PriceCharting sales page includes exact Yveltal EX XY150a Alternate Art Holo Promo labels.',
    },
    {
      source_key: 'ebay_listing',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.ebay.com/itm/366296928265',
      evidence_label: 'eBay listing identifies Yveltal EX XY150a as Full Art Holo.',
    },
  ],
  xy177a: [
    {
      source_key: 'pricecharting_sales_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/game/pokemon-promo/karen-xy177a',
      evidence_label: 'PriceCharting sales page includes exact Karen XY177a Promo Holo labels.',
    },
    {
      source_key: 'noble_knight_product_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.nobleknight.com/P/2148465200/Karen-P-XY177a-Holo',
      evidence_label: 'Noble Knight product page title identifies Karen #XY177a as Holo.',
    },
  ],
  xy198a: [
    {
      source_key: 'pricecharting_sales_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/game/pokemon-promo/mega-camerupt-ex-xy198a',
      evidence_label: 'PriceCharting sales page includes exact M Camerupt EX XY198a Promo Holo labels.',
    },
    {
      source_key: 'noble_knight_product_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.nobleknight.com/P/2148465203/M-Camerupt-EX-P-XY198a-Holo',
      evidence_label: 'Noble Knight product page title identifies M Camerupt EX #XY198a as Holo.',
    },
  ],
  xy200a: [
    {
      source_key: 'pricecharting_sales_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/game/pokemon-promo/mega-sharpedo-ex-xy200a',
      evidence_label: 'PriceCharting sales page includes exact M Sharpedo EX XY200a Alternate Art Holo labels.',
    },
    {
      source_key: 'noble_knight_product_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.nobleknight.com/P/2148465218/M-Sharpedo-EX-P-XY200a-Holo',
      evidence_label: 'Noble Knight product page title identifies M Sharpedo EX #XY200a as Holo.',
    },
  ],
  xy67a: [
    {
      source_key: 'bulbapedia_card_page_release_info',
      source_kind: 'human_readable_checklist',
      source_url: 'https://bulbapedia.bulbagarden.net/wiki/Jirachi_(XY_Promo_67)',
      evidence_label: 'Bulbapedia card page release info identifies the XY67a print as Cosmos Holofoil.',
    },
    {
      source_key: 'noble_knight_product_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.nobleknight.com/P/2148465229/Jirachi-P-XY67a-Holo',
      evidence_label: 'Noble Knight product page title identifies Jirachi #XY67a as Holo.',
    },
  ],
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
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
    if (char === '"') inQuotes = true;
    else if (char === ',') {
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
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.filter((fields) => fields.length === headers.length).map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index]])));
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[''.:’]/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceUrl(row) {
  return `https://www.pricecharting.com/game/${slug(row['console-name'])}/${slug(row['product-name'])}`;
}

function comparableName(value) {
  return normalizeText(value)
    .replace(/\bmega\b/g, 'm')
    .replace(/\bex\b/g, 'ex')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function findPriceChartingRows(priceRows, card) {
  const number = String(card.card_number ?? '').toLowerCase();
  const baseNumber = number.replace(/^xy/i, '').replace(/[a-z]$/i, '');
  const wantedName = comparableName(card.card_name);
  return priceRows.filter((row) => {
    if (normalizeText(row['console-name']) !== 'pokemon promo') return false;
    const productName = String(row['product-name'] ?? '');
    const productComparable = comparableName(productName);
    const hasExactNumber = productName.toLowerCase().includes(`#${number}`)
      || productName.toLowerCase().includes(`#xy${baseNumber}a`);
    return hasExactNumber && (
      productComparable.includes(wantedName)
      || wantedName.includes(productComparable.replace(/\bxy\d+a?\b/g, '').trim())
    );
  }).map((row) => ({
    source_key: 'pricecharting_csv_product',
    source_kind: 'marketplace_checklist',
    source_url: sourceUrl(row),
    product_name: row['product-name'],
    evidence_label: `PriceCharting exact Pokemon Promo product row: ${row['product-name']}`,
    finish_signal: /\[reverse holo\]/i.test(row['product-name'])
      ? 'reverse'
      : /\[(holo|foil)\]/i.test(row['product-name'])
        ? 'holo'
        : 'unqualified_promo_product',
  }));
}

function classify(row, explicitHoloEvidence) {
  if (row.finish_key === 'holo' && explicitHoloEvidence.length >= 2) {
    return {
      adjudication_status: 'holo_master_index_delta_ready',
      db_action: 'no_db_write_master_index_delta_first',
      reason: 'Two independent human/marketplace sources explicitly support the suffix promo as holo; promote Master Index finish fact before any DB cleanup.',
    };
  }
  if (row.finish_key === 'normal') {
    return {
      adjudication_status: explicitHoloEvidence.length >= 2
        ? 'normal_overfinish_candidate_after_holo_delta'
        : 'normal_supported_by_tcgdex_but_needs_second_finish_source',
      db_action: 'no_db_write_until_master_index_delta_promoted',
      reason: explicitHoloEvidence.length >= 2
        ? 'Explicit human/marketplace evidence supports holo for this suffix identity; normal should only be considered for deletion after the Master Index holo delta is promoted.'
        : 'TCGdex variants support normal and reject holo/reverse, but the second human-readable product source is not an explicit normal-finish statement.',
    };
  }
  if (row.finish_key === 'reverse') {
    return {
      adjudication_status: explicitHoloEvidence.length >= 2
        ? 'reverse_overfinish_candidate_after_holo_delta'
        : 'reverse_unsupported_by_tcgdex_but_blocked_for_second_absence_source',
      db_action: 'no_db_write_until_master_index_delta_promoted',
      reason: explicitHoloEvidence.length >= 2
        ? 'Explicit human/marketplace evidence supports holo for this suffix identity; reverse should only be considered for deletion after the Master Index holo delta is promoted.'
        : 'TCGdex rejects this finish for the suffix promo identity, but one structured source is not enough for deletion authority.',
    };
  }
  return {
    adjudication_status: 'unexpected_finish_blocked',
    db_action: 'no_write',
    reason: 'Unexpected finish key for this suffix promo review.',
  };
}

function renderMarkdown(report) {
  const summaryRows = [
    ['target_live_rows', report.summary.target_live_rows],
    ['target_card_identities', report.summary.target_card_identities],
    ['normal_rows_supported_by_tcgdex_only', report.summary.by_adjudication_status.normal_supported_by_tcgdex_but_needs_second_finish_source ?? 0],
    ['holo_rows_blocked', report.summary.by_finish.holo ?? 0],
    ['reverse_rows_blocked', report.summary.by_finish.reverse ?? 0],
    ['write_ready_now', report.write_ready_now],
    ['fingerprint', report.fingerprint_sha256],
  ];
  const rowTable = report.rows.map((row) => [
    row.card_number,
    row.card_name,
    row.finish_key,
    row.adjudication_status,
    row.tcgdex_finish_claim,
    row.pricecharting_finish_signal,
  ]);
  return `# PKG-37A XYP Suffix Finish Adjudication V1

Read-only adjudication for the remaining XYP suffix promo rows.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], summaryRows)}

## Findings

- The card identities \`XY150a\`, \`XY177a\`, \`XY198a\`, \`XY200a\`, and \`XY67a\` are already Master Index card identities.
- TCGdex finish variants conflict with the broader evidence lane by marking these suffix identities as \`normal\`.
- Independent human/marketplace sources explicitly identify the suffix identities as \`holo\`.
- Therefore this report does not authorize DB writes. It marks the next step as a Master Index finish-delta promotion, followed by a separate guarded cleanup package for normal/reverse only after the index delta is promoted.

## Rows

${markdownTable(['number', 'card', 'live finish', 'status', 'tcgdex claim', 'pricecharting signal'], rowTable)}
`;
}

const lanes = await readJson(LANES_JSON);
const cards = await readJson(CARDS_JSON);
const printings = await readJson(PRINTINGS_JSON);
const xypEvidence = await readJson(PUBLISHABLE_XYP_EVIDENCE_JSON);
const priceRows = parseCsv(await fs.readFile(PRICECHARTING_CSV, 'utf8'));

const targetRows = (lanes.rows ?? [])
  .filter((row) => row.lane === 'product_or_promo_source_review')
  .filter((row) => row.canonical_set_key === 'xyp')
  .filter((row) => TARGET_NUMBERS.has(String(row.number ?? row.card_number ?? '').toLowerCase()));

const cardRowsByNumber = new Map((cards.cards ?? [])
  .filter((row) => row.set_key === 'xyp' && TARGET_NUMBERS.has(String(row.card_number).toLowerCase()))
  .map((row) => [String(row.card_number).toLowerCase(), row]));

const printingRowsByNumber = new Map();
for (const row of (printings.printings ?? []).filter((printing) => printing.set_key === 'xyp')) {
  const key = String(row.card_number).toLowerCase();
  if (!printingRowsByNumber.has(key)) printingRowsByNumber.set(key, []);
  printingRowsByNumber.get(key).push(row);
}

const evidenceByNumber = new Map();
for (const row of xypEvidence.evidence ?? []) {
  const key = String(row.card_number).toLowerCase();
  if (!TARGET_NUMBERS.has(key)) continue;
  if (!evidenceByNumber.has(key)) evidenceByNumber.set(key, []);
  evidenceByNumber.get(key).push(row);
}

const rows = targetRows.map((row) => {
  const key = String(row.number ?? row.card_number).toLowerCase();
  const cardIdentity = cardRowsByNumber.get(key);
  const sourceEvidence = evidenceByNumber.get(key) ?? [];
  const pricechartingEvidence = findPriceChartingRows(priceRows, row);
  const explicitHoloEvidence = EXPLICIT_HOLO_EVIDENCE_BY_NUMBER[key] ?? [];
  const classification = classify(row, explicitHoloEvidence);
  const pricechartingFinishSignals = [...new Set(pricechartingEvidence.map((evidence) => evidence.finish_signal))];
  return {
    ...classification,
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    set_key: row.canonical_set_key,
    number: row.number,
    card_number: row.number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    variant_key: row.variant_key ?? '',
    printed_identity_modifier: row.printed_identity_modifier ?? '',
    child_dependency_total: Number(row.child_dependency_total ?? 0),
    master_card_identity_status: cardIdentity?.status ?? 'missing',
    master_card_identity_sources: cardIdentity?.sources ?? [],
    existing_master_printing_facts: printingRowsByNumber.get(key) ?? [],
    tcgdex_finish_claim: 'normal=true,holo=false,reverse=false',
    explicit_holo_evidence_count: explicitHoloEvidence.length,
    explicit_holo_evidence: explicitHoloEvidence,
    source_evidence: sourceEvidence,
    pricecharting_evidence: pricechartingEvidence,
    pricecharting_finish_signal: pricechartingFinishSignals.join(',') || 'not_found',
  };
});

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg37a_xyp_suffix_finish_adjudication_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  write_ready_now: 0,
  source_artifacts: {
    lanes_json: path.relative(ROOT, LANES_JSON),
    cards_json: path.relative(ROOT, CARDS_JSON),
    printings_json: path.relative(ROOT, PRINTINGS_JSON),
    publishable_xyp_evidence_json: path.relative(ROOT, PUBLISHABLE_XYP_EVIDENCE_JSON),
    pricecharting_csv: path.relative(ROOT, PRICECHARTING_CSV),
  },
  summary: {
    target_live_rows: rows.length,
    target_card_identities: cardRowsByNumber.size,
    by_finish: countBy(rows, (row) => row.finish_key),
    by_adjudication_status: countBy(rows, (row) => row.adjudication_status),
    by_db_action: countBy(rows, (row) => row.db_action),
  },
  rows,
};

report.fingerprint_sha256 = sha256(stableJson({
  package_id: report.package_id,
  summary: report.summary,
  rows: rows.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    adjudication_status: row.adjudication_status,
    db_action: row.db_action,
  })),
}));

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
  write_ready_now: report.write_ready_now,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
