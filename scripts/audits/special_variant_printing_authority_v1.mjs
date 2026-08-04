import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

export const VERSION = 'SPECIAL_VARIANT_PRINTING_AUTHORITY_V1';
export const INPUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_coverage_v1',
  'special_variant_printing_coverage_v1.json',
);
export const MASTER_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_printings_v1.json',
);
export const SETS_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_sets_v1.json',
);
export const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'special_variant_printing_authority_v1');
export const OUT_JSON = path.join(OUT_DIR, 'special_variant_printing_authority_v1.json');
export const OUT_MD = path.join(OUT_DIR, 'special_variant_printing_authority_v1.md');

const QUEUE_STATUS = 'missing_child_reference_finish_evidence_review_required';
const TARGET_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);
const VARIANT_STOP_WORDS = new Set([
  'stamp', 'stamped', 'promo', 'pokemon', 'card', 'cards', 'and', 'the', 'series',
]);
const REST_CHUNK_SIZE = 100;
const REST_PAGE_SIZE = 1000;
const OBSERVATION_LOOKBACK_DAYS = 45;

function backendClient() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeText(value) {
  return clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/pok[eé]mon/g, 'pokemon')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNumber(value) {
  const normalized = normalizeText(value).replace(/\s+/g, '');
  return normalized.replace(/^0+(?=\d)/, '');
}

export function finishFromSubtype(value) {
  const normalized = normalizeText(value);
  if (['normal', 'regular', 'unlimited normal'].includes(normalized)) return 'normal';
  if (['holofoil', 'holo', 'foil'].includes(normalized)) return 'holo';
  if (['reverse holofoil', 'reverse holo'].includes(normalized)) return 'reverse';
  if (normalized.includes('cosmos')) return 'cosmos';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  return null;
}

function extendedValue(product, names) {
  const allowed = new Set(names.map(normalizeText));
  return (product?.extended_data ?? []).find((entry) => (
    allowed.has(normalizeText(entry?.name)) || allowed.has(normalizeText(entry?.displayName))
  ))?.value ?? null;
}

export function productNumber(product) {
  return clean(extendedValue(product, ['Number', 'Card Number']));
}

function comparableCardName(value) {
  return normalizeText(value)
    .replace(/\b(?:prerelease|pre release|staff|winner|league|promo|holofoil|holo|reverse|cosmos)\b/g, ' ')
    .replace(/\b\d+\s+\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cardNameMatches(expectedName, product) {
  const expected = normalizeText(expectedName);
  const title = normalizeText(product?.name ?? product?.clean_name);
  if (!expected || !title) return false;
  return title === expected || title.startsWith(`${expected} `);
}

function tokenPresent(text, token) {
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

function derivedVariantTokens(variantKey) {
  return normalizeText(variantKey)
    .split(' ')
    .filter((token) => token.length > 1 && !VARIANT_STOP_WORDS.has(token));
}

export function variantTitleMatches(variantKey, productTitle) {
  const key = normalizeText(variantKey).replace(/\s+/g, '_');
  const title = normalizeText(productTitle);
  const prerelease = /\bpre\s*release\b|\bprerelease\b/.test(title);
  const staff = /\bstaff\b/.test(title);

  if (key === 'prerelease_stamp') return prerelease && !staff;
  if (key === 'staff_prerelease_stamp') return prerelease && staff;
  if (key === 'staff_stamp') return staff && !prerelease;
  if (key === 'play_pokemon_stamp') {
    return /\bplay\s+pokemon\b|\bpokemon\s+league\b|\bleague\s+promo\b/.test(title)
      && !/\bprize\s+pack\b/.test(title);
  }
  if (key === 'e_league_stamp') return /\bleague\b/.test(title) && !/\bwinner\b/.test(title);
  if (key === 'e_league_winner_stamp') return /\bleague\b/.test(title) && /\bwinner\b/.test(title);

  const required = derivedVariantTokens(key);
  return required.length > 0 && required.every((token) => tokenPresent(title, token));
}

export function justTcgProductId(payload) {
  const value = payload?.tcgplayerId ?? payload?.tcgplayer_id ?? payload?.tcgplayerProductId;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function expectedFinishKeys(row) {
  return [...new Set([
    ...(row.reference_only_candidate_finishes ?? []),
    ...(row.source_finish_evidence ?? []).map((item) => item.finish_key),
  ].filter((finish) => TARGET_FINISHES.has(finish)))].sort();
}

function exactMasterRows(masterRows, row) {
  const setKey = normalizeText(row.set_code);
  const number = normalizeNumber(row.number);
  const name = normalizeText(row.name);
  return masterRows.filter((fact) => (
    fact.status === 'master_verified'
    && normalizeText(fact.set_key) === setKey
    && normalizeNumber(fact.card_number) === number
    && normalizeText(fact.card_name) === name
  ));
}

function verifiedSetTotals(setRecord) {
  const values = [];
  for (const source of Object.values(setRecord?.source_totals ?? {})) {
    for (const key of ['printed_total', 'official', 'total']) {
      const value = Number(source?.[key]);
      if (Number.isInteger(value) && value > 0) values.push(value);
    }
  }
  return [...new Set(values)].sort((a, b) => a - b);
}

export function denominatorSupported(product, setRecord) {
  const number = productNumber(product);
  if (!number.includes('/')) return true;
  const denominator = Number(number.split('/')[1]?.replace(/\D/g, ''));
  return Number.isInteger(denominator) && verifiedSetTotals(setRecord).includes(denominator);
}

export function classifyAuthority({ row, discoveryPayload, product, observations, masterRows, setRecord }) {
  const discoveryProductId = justTcgProductId(discoveryPayload);
  const expectedFinishes = expectedFinishKeys(row);
  const masterMatches = exactMasterRows(masterRows, row);
  const masterFinishes = [...new Set(masterMatches.map((fact) => fact.finish_key))].sort();
  const observedFinishes = [...new Set(
    (observations ?? []).map((observation) => finishFromSubtype(observation.subtype_name)).filter(Boolean),
  )].sort();
  const checks = {
    discovery_product_id_present: discoveryProductId !== null,
    tcgcsv_product_present: Boolean(product),
    product_id_equal: Boolean(product) && Number(product.product_id) === discoveryProductId,
    catalog_evidence_current: Boolean(product)
      && product.source_active === true
      && product.catalog_metadata_status === 'current'
      && Number(product.category_id) === 3
      && Boolean(clean(product.payload_hash)),
    card_name_exact: Boolean(product) && cardNameMatches(row.name, product),
    card_number_exact: Boolean(product) && normalizeNumber(productNumber(product)) === normalizeNumber(discoveryPayload?.number ?? row.number),
    card_denominator_verified: Boolean(product) && denominatorSupported(product, setRecord),
    variant_title_exact: Boolean(product) && variantTitleMatches(row.variant_key, product.name ?? product.clean_name),
    finish_subtype_present: observedFinishes.length > 0,
    finish_evidence_hashed: (observations ?? []).length > 0
      && (observations ?? []).every((observation) => Boolean(clean(observation.payload_hash))),
    finish_agrees_with_discovery: expectedFinishes.length > 0
      && expectedFinishes.every((finish) => observedFinishes.includes(finish)),
    master_card_exact: masterMatches.length > 0,
    master_variant_or_finish_support: masterFinishes.includes('stamped')
      || expectedFinishes.some((finish) => masterFinishes.includes(finish)),
  };

  let status;
  const blockers = [];
  if (!checks.discovery_product_id_present) {
    status = 'discovery_handle_missing';
    blockers.push('justtcg_payload_missing_tcgplayer_product_id');
  } else if (!checks.tcgcsv_product_present) {
    status = 'tcgcsv_product_missing';
    blockers.push('matching_tcgcsv_product_not_in_warehouse');
  } else if (!checks.product_id_equal || !checks.catalog_evidence_current || !checks.card_name_exact || !checks.card_number_exact || !checks.card_denominator_verified || !checks.variant_title_exact) {
    status = 'identity_or_finish_conflict';
    if (!checks.product_id_equal) blockers.push('tcgplayer_product_id_mismatch');
    if (!checks.catalog_evidence_current) blockers.push('tcgcsv_catalog_evidence_not_current_or_hashed');
    if (!checks.card_name_exact) blockers.push('card_name_mismatch');
    if (!checks.card_number_exact) blockers.push('card_number_mismatch');
    if (!checks.card_denominator_verified) blockers.push('card_denominator_not_supported_by_verified_set_totals');
    if (!checks.variant_title_exact) blockers.push('special_variant_not_explicit_in_product_title');
  } else if (!checks.finish_subtype_present || !checks.finish_evidence_hashed) {
    status = 'variant_identity_corroborated_finish_needs_second_source';
    blockers.push(checks.finish_subtype_present
      ? 'tcgcsv_finish_evidence_not_hashed'
      : 'tcgcsv_exact_finish_subtype_missing');
  } else if (!checks.finish_agrees_with_discovery) {
    status = 'identity_or_finish_conflict';
    blockers.push('tcgcsv_finish_conflicts_with_discovery_finish');
  } else if (!checks.master_card_exact || !checks.master_variant_or_finish_support) {
    status = 'variant_identity_corroborated_finish_needs_second_source';
    blockers.push(checks.master_card_exact
      ? 'master_index_has_no_variant_or_target_finish_support'
      : 'master_index_exact_card_missing');
  } else {
    status = 'authoritative_candidate_ready_for_guarded_dry_run';
  }

  return {
    status,
    blockers,
    checks,
    discovery_product_id: discoveryProductId,
    expected_finishes: expectedFinishes,
    observed_finishes: observedFinishes,
    master_finishes: masterFinishes,
    master_evidence: masterMatches.map((fact) => ({
      finish_key: fact.finish_key,
      sources: fact.sources,
      source_authorities: fact.source_authorities,
      evidence_urls: fact.evidence_urls,
    })),
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => (
    Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0])
  )));
}

function escapeCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function table(rows, columns, limit = 100) {
  if (rows.length === 0) return '_None._';
  const visible = rows.slice(0, limit);
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...visible.map((row) => `| ${columns.map((column) => escapeCell(column.value(row))).join(' | ')} |`),
    ...(rows.length > limit ? [`\n_${rows.length - limit} additional rows are preserved in JSON._`] : []),
  ].join('\n');
}

function chunks(values, size = REST_CHUNK_SIZE) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function requireSelect(query, context) {
  const { data, error } = await query;
  if (error) throw new Error(`${context}: ${error.message}`);
  return data ?? [];
}

async function loadDatabaseEvidence(client, cardPrintIds, observationCutoff) {
  const mappings = [];
  for (const batch of chunks(cardPrintIds)) {
    mappings.push(...await requireSelect(
      client
        .from('external_mappings')
        .select('card_print_id,external_id')
        .eq('source', 'justtcg')
        .eq('active', true)
        .in('card_print_id', batch),
      'load JustTCG mappings',
    ));
  }

  const payloadByExternalId = new Map();
  for (const batch of chunks([...new Set(mappings.map((row) => row.external_id))])) {
    const imports = await requireSelect(
      client
        .from('raw_imports')
        .select('payload')
        .eq('source', 'justtcg')
        .eq('payload->>_kind', 'card')
        .in('payload->>_external_id', batch),
      'load JustTCG discovery payloads',
    );
    for (const row of imports) payloadByExternalId.set(row.payload?._external_id, row.payload);
  }

  const sourceRows = mappings.map((mapping) => ({
    ...mapping,
    payload: payloadByExternalId.get(mapping.external_id) ?? null,
  }));
  const sourceByCard = new Map(sourceRows.map((row) => [row.card_print_id, row]));
  const productIds = [...new Set(sourceRows.map((row) => justTcgProductId(row.payload)).filter(Boolean))];
  if (productIds.length === 0) return { sourceByCard, productById: new Map(), observationsByProduct: new Map() };

  const products = [];
  for (const batch of chunks(productIds)) {
    products.push(...await requireSelect(
      client
        .from('tcgcsv_source_products')
        .select('product_id,category_id,group_id,name,clean_name,source_url,source_modified_on,extended_data,payload_hash,source_active,catalog_metadata_status')
        .in('product_id', batch),
      'load TCGCSV products',
    ));
  }

  const groupIds = [...new Set(products.map((product) => product.group_id).filter(Number.isInteger))];
  const groups = [];
  for (const batch of chunks(groupIds)) {
    groups.push(...await requireSelect(
      client.from('tcgcsv_source_groups').select('group_id,name').in('group_id', batch),
      'load TCGCSV groups',
    ));
  }
  const groupById = new Map(groups.map((group) => [group.group_id, group.name]));
  for (const product of products) product.group_name = groupById.get(product.group_id) ?? null;

  const observationRows = [];
  for (const batch of chunks(productIds)) {
    for (let offset = 0; ; offset += REST_PAGE_SIZE) {
      const page = await requireSelect(
        client
          .from('tcgcsv_source_price_daily_observations')
          .select('product_id,group_id,subtype_name,subtype_name_normalized,observed_on,payload_hash,source_archive_path')
          .in('product_id', batch)
          .gte('observed_on', observationCutoff)
          .order('observed_on', { ascending: false })
          .range(offset, offset + REST_PAGE_SIZE - 1),
        'load TCGCSV finish observations',
      );
      observationRows.push(...page);
      if (page.length < REST_PAGE_SIZE) break;
    }
  }

  const observationsByProduct = new Map();
  const observedSubtypes = new Set();
  for (const observation of observationRows) {
    const identity = `${observation.product_id}:${observation.subtype_name_normalized}`;
    if (observedSubtypes.has(identity)) continue;
    observedSubtypes.add(identity);
    const list = observationsByProduct.get(observation.product_id) ?? [];
    list.push(observation);
    observationsByProduct.set(observation.product_id, list);
  }
  return {
    sourceByCard,
    productById: new Map(products.map((product) => [product.product_id, product])),
    observationsByProduct,
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => ({ status, count }));
  const readyRows = report.rows.filter((row) => row.status === 'authoritative_candidate_ready_for_guarded_dry_run');
  const blockedRows = report.rows.filter((row) => row.status !== 'authoritative_candidate_ready_for_guarded_dry_run');
  return `# Special Variant Printing Authority V1

Generated: ${report.generated_at}

## Boundary

- Read-only service-role SELECT access: yes
- Database writes: none
- Canonical rows changed: 0
- Child printing rows changed: 0
- JustTCG authority: prohibited; discovery handle only
- Automatic apply authorization: none

## Authority Rule

${report.authority_rule}

## Summary

${table(statusRows, [
    { label: 'Status', value: (row) => row.status },
    { label: 'Rows', value: (row) => row.count },
  ])}

- Queue rows: ${report.summary.queue_rows}
- TCGCSV products found: ${report.summary.tcgcsv_products_found}
- Exact finish observations found: ${report.summary.rows_with_finish_observations}
- Guarded dry-run candidates: ${report.summary.guarded_dry_run_candidates}
- Blocked rows: ${report.summary.blocked_rows}

## Guarded Dry-Run Candidates

These rows have enough evidence to enter a separate no-write child-printing dry run. They are not applied by this audit.

${table(readyRows, [
    { label: 'GV-ID', value: (row) => row.gv_id },
    { label: 'Card', value: (row) => `${row.name} ${row.number}` },
    { label: 'Variant', value: (row) => row.variant_key },
    { label: 'Finish', value: (row) => row.authority.observed_finishes.join(', ') },
    { label: 'TCGplayer Product', value: (row) => row.authority.discovery_product_id },
    { label: 'Source title', value: (row) => row.tcgcsv_product?.name },
  ], 150)}

## Blocked Queue

${table(blockedRows, [
    { label: 'GV-ID', value: (row) => row.gv_id },
    { label: 'Variant', value: (row) => row.variant_key },
    { label: 'Status', value: (row) => row.status },
    { label: 'Blocker', value: (row) => row.authority.blockers.join(', ') },
  ], 150)}

## Next Gate

Generate a separate guarded, read-only child-printing dry-run manifest from only the accepted candidate rows. Before any write, require per-row invariants, collision checks, provenance payloads, rollback SQL, and exact post-apply readback design.
`;
}

export async function main() {
  const [coverage, master, sets] = await Promise.all([
    JSON.parse(await fs.readFile(INPUT_JSON, 'utf8')),
    JSON.parse(await fs.readFile(MASTER_JSON, 'utf8')),
    JSON.parse(await fs.readFile(SETS_JSON, 'utf8')),
  ]);
  const setByKey = new Map((sets.sets ?? []).map((set) => [normalizeText(set.key), set]));
  const queue = (coverage.rows ?? []).filter((row) => row.status === QUEUE_STATUS);
  const observationCutoff = new Date(Date.now() - OBSERVATION_LOOKBACK_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const evidence = await loadDatabaseEvidence(
    backendClient(),
    queue.map((row) => row.card_print_id),
    observationCutoff,
  );

  const rows = queue.map((row) => {
    const discovery = evidence.sourceByCard.get(row.card_print_id) ?? null;
    const productId = justTcgProductId(discovery?.payload);
    const product = evidence.productById.get(productId) ?? null;
    const observations = evidence.observationsByProduct.get(productId) ?? [];
    const authority = classifyAuthority({
      row,
      discoveryPayload: discovery?.payload,
      product,
      observations,
      masterRows: master.printings ?? [],
      setRecord: setByKey.get(normalizeText(row.set_code)),
    });
    return {
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      status: authority.status,
      authority,
      discovery_evidence: discovery ? {
        source: 'justtcg',
        authority: 'discovery_only',
        external_id: discovery.external_id,
        tcgplayer_product_id: productId,
        product_name: discovery.payload?.name ?? null,
        card_number: discovery.payload?.number ?? null,
        payload_hash: sha256(JSON.stringify(discovery.payload)),
      } : null,
      tcgcsv_product: product ? {
        source: 'tcgcsv_tcgplayer_catalog',
        authority: 'exact_external_catalog_mapping',
        product_id: product.product_id,
        name: product.name,
        clean_name: product.clean_name,
        group_id: product.group_id,
        group_name: product.group_name,
        card_number: productNumber(product),
        source_url: product.source_url,
        source_modified_on: product.source_modified_on,
        payload_hash: product.payload_hash,
        source_active: product.source_active,
        catalog_metadata_status: product.catalog_metadata_status,
      } : null,
      tcgcsv_finish_observations: observations.map((observation) => ({
        product_id: observation.product_id,
        subtype_name: observation.subtype_name,
        finish_key: finishFromSubtype(observation.subtype_name),
        observed_on: observation.observed_on,
        payload_hash: observation.payload_hash,
        source_archive_path: observation.source_archive_path,
      })),
    };
  });

  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: 'read_only_authority_reconciliation',
    db_writes_performed: false,
    canonical_rows_changed: 0,
    child_rows_changed: 0,
    authority_rule: 'A candidate requires an exact TCGCSV/TCGplayer catalog product, matching card name and full number, independently verified set denominator when present, explicit special-variant title, exact catalog finish subtype, agreement with discovery finish, and verified Master Index variant-or-finish support. JustTCG is discovery-only and can never qualify a row by itself.',
    input: {
      coverage_version: coverage.version,
      coverage_fingerprint_sha256: coverage.fingerprint_sha256,
      queue_status: QUEUE_STATUS,
      master_version: master.version,
      master_generated_at: master.generated_at,
      set_registry_version: sets.version,
      set_registry_generated_at: sets.generated_at,
      tcgcsv_observation_cutoff: observationCutoff,
    },
    summary: {
      queue_rows: rows.length,
      by_status: countBy(rows, (row) => row.status),
      by_variant: countBy(rows, (row) => row.variant_key),
      tcgcsv_products_found: rows.filter((row) => row.tcgcsv_product).length,
      rows_with_finish_observations: rows.filter((row) => row.tcgcsv_finish_observations.length > 0).length,
      guarded_dry_run_candidates: rows.filter((row) => row.status === 'authoritative_candidate_ready_for_guarded_dry_run').length,
      blocked_rows: rows.filter((row) => row.status !== 'authoritative_candidate_ready_for_guarded_dry_run').length,
    },
    rows,
  };
  const report = { ...reportBase, fingerprint_sha256: sha256(JSON.stringify(reportBase.rows)) };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(OUT_MD, renderMarkdown(report)),
  ]);
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
