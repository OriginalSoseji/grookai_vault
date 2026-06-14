import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const SETS_JSON = path.join(AUDIT_DIR, 'english_master_index_sets_v1.json');
const HOST_SUBSET_SUPPRESSION_JSON = path.join(AUDIT_DIR, 'english_master_index_host_subset_duplicate_suppression_v1.json');
const STAMPED_IDENTITY_READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const STAMPED_GENERIC_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15b_stamped_generic_variant_adjudication_v1.json');
const STAMPED_BATTLE_ACADEMY_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15d_battle_academy_non_holo_adjudication_v1.json');
const STAMPED_EXISTING_COLLISION_CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg16a_existing_stamped_collision_readiness_v1.json');
const STAMPED_SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.json');
const STAMPED_NO_WRITE_GOVERNANCE_CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18ab_stamped_no_write_governance_closure_v1.json');
const STAMPED_BASE_PARENT_RESOLUTION_CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18c_stamped_base_parent_resolution_closure_v1.json');
const STAMPED_PRIZE_PACK_FINISH_MAPPING_CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18d_prize_pack_finish_mapping_closure_v1.json');
const STAMPED_SOURCE_ACQUISITION_CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json');
const STAMPED_CONFLICT_MANUAL_CLOSURE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18g_stamped_conflict_manual_closure_v1.json');
const STAMPED_ACTIVE_FINISH_WEB_EVIDENCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1.json');
const RESIDUAL_STAMPED_ACTIVE_FINISH_ROUTE_EVIDENCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40b_residual_stamped_active_finish_route_evidence_v1.json');
const RESIDUAL_ACTIVE_FINISH_REPLACEMENT_ROUTE_EVIDENCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg41a_residual_active_finish_replacement_master_index_delta_v1.json');
const FINAL_SOURCE_CLOSURE_ROUTE_EVIDENCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg42a_final_source_closure_master_index_delta_v1.json');
const SET_UNMAPPED_SCOPE_GOVERNANCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg21a_set_unmapped_scope_governance_v1.json');
const PRISMATIC_PARALLEL_FINISH_GOVERNANCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg24a_prismatic_parallel_finish_governance_v1.json');
const SUBSET_PARALLEL_SUPPORTED_FINISH_GOVERNANCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg25a_subset_parallel_supported_finish_governance_v1.json');
const PRODUCT_PROMO_SUPPORTED_FINISH_GOVERNANCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg26a_product_promo_supported_finish_governance_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.md');

const CHILD_DEPENDENCY_TABLES = [
  { table: 'vault_item_instances', column: 'card_printing_id', activeClause: 'archived_at is null' },
  { table: 'external_printing_mappings', column: 'card_printing_id' },
  { table: 'canon_warehouse_candidates', column: 'promoted_card_printing_id' },
  { table: 'card_printing_truth_reviews', column: 'card_printing_id' },
  { table: 'justtcg_grookai_mappings', column: 'card_printing_id' },
];

const DEPENDENCY_FIELD_BY_TABLE = {
  vault_item_instances: 'vault_item_instance_refs',
  external_printing_mappings: 'external_printing_mapping_refs',
  canon_warehouse_candidates: 'canon_warehouse_candidate_refs',
  card_printing_truth_reviews: 'truth_review_refs',
  justtcg_grookai_mappings: 'justtcg_mapping_refs',
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function normalizeFinish(value) {
  const finish = normalizeText(value);
  if (finish === 'reverse_holo') return 'reverse';
  if (finish === 'holofoil') return 'holo';
  return finish;
}

function normalizeIdentityModifier(value) {
  const modifier = normalizeText(value);
  return modifier === 'base' ? '' : modifier;
}

function normalizeVariantKey(value) {
  const variant = normalizeText(value);
  return variant === 'base' ? '' : variant;
}

function childIdentityKey(setCode, number, name, finishKey, printedIdentityModifier = '', variantKey = '') {
  return [
    normalizeText(setCode),
    normalizeNumber(number),
    normalizeText(name),
    normalizeFinish(finishKey),
    normalizeIdentityModifier(printedIdentityModifier),
    normalizeVariantKey(variantKey),
  ].join('|');
}

function cardIdentityKey(setCode, number, name, printedIdentityModifier = '', variantKey = '') {
  return [
    normalizeText(setCode),
    normalizeNumber(number),
    normalizeText(name),
    normalizeIdentityModifier(printedIdentityModifier),
    normalizeVariantKey(variantKey),
  ].join('|');
}

function plainCardKey(setCode, number, name) {
  return [
    normalizeText(setCode),
    normalizeNumber(number),
    foldNameForTriage(name),
  ].join('|');
}

function liveNumberAliases(row, canonicalSetKey) {
  const setKey = normalizeText(canonicalSetKey ?? row.canonical_set_key ?? row.set_code);
  const numbers = [
    row.card_number,
    row.number,
    row.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim());

  const aliases = [];
  if (setKey === 'bwp') {
    for (const number of numbers) {
      const value = String(number).trim();
      const bwMatch = /^BW0*(\d{1,3})$/i.exec(value);
      const plainMatch = /^0*(\d{1,3})$/.exec(value);
      const numericPart = bwMatch?.[1] ?? plainMatch?.[1];
      if (numericPart) aliases.push(`BW${numericPart.padStart(3, '0')}`);
    }
  }
  return aliases;
}

function liveNumbers(row, canonicalSetKey = row.canonical_set_key ?? row.set_code) {
  return [...new Set([
    row.card_number,
    row.number,
    row.number_plain,
    ...liveNumberAliases(row, canonicalSetKey),
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

function hasDuplicatedSubsetVariant(canonicalSetKey, number, variantKey) {
  const variant = normalizeVariantKey(variantKey);
  const setKey = normalizeText(canonicalSetKey);
  const normalizedNumber = normalizeText(normalizeNumber(number));

  return variant === 'tg' && (setKey.endsWith('tg') || normalizedNumber.startsWith('tg'));
}

function hasDuplicatedXyPromoSuffixVariant(canonicalSetKey, number, variantKey) {
  const variant = normalizeVariantKey(variantKey);
  const setKey = normalizeText(canonicalSetKey);
  const normalizedNumber = normalizeText(normalizeNumber(number));
  return setKey === 'xyp' && variant === 'xya' && /^xy\d+a$/.test(normalizedNumber);
}

function liveChildIdentityKeys(canonicalSetKey, row) {
  const variant = row.variant_key;
  return liveNumbers(row, canonicalSetKey).flatMap((number) => {
    const keys = [childIdentityKey(
      canonicalSetKey,
      number,
      row.card_name,
      row.finish_key,
      row.printed_identity_modifier,
      variant,
    )];
    const prefixMatch = /^number_prefix:(.+)$/i.exec(String(row.printed_identity_modifier ?? '').trim());
    if (prefixMatch && normalizeText(normalizeNumber(number)).startsWith(normalizeText(prefixMatch[1]))) {
      keys.push(childIdentityKey(
        canonicalSetKey,
        number,
        row.card_name,
        row.finish_key,
        '',
        variant,
      ));
    }
    if (hasDuplicatedSubsetVariant(canonicalSetKey, number, variant)) {
      keys.push(childIdentityKey(
        canonicalSetKey,
        number,
        row.card_name,
        row.finish_key,
        row.printed_identity_modifier,
        '',
      ));
      if (prefixMatch && normalizeText(normalizeNumber(number)).startsWith(normalizeText(prefixMatch[1]))) {
        keys.push(childIdentityKey(
          canonicalSetKey,
          number,
          row.card_name,
          row.finish_key,
          '',
          '',
        ));
      }
    }
    if (hasDuplicatedXyPromoSuffixVariant(canonicalSetKey, number, variant)) {
      keys.push(childIdentityKey(
        canonicalSetKey,
        number,
        row.card_name,
        row.finish_key,
        row.printed_identity_modifier,
        '',
      ));
    }
    return keys;
  });
}

function stampedFactKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function masterPrintingKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinish(row.finish_key),
  ].join('|');
}

function decomposedFinish(row) {
  if (normalizeFinish(row.finish_key) === 'first_edition_normal') {
    return { finish_key: 'normal', printed_identity_modifier: 'edition:first_edition', variant_key: '' };
  }
  if (normalizeFinish(row.finish_key) === 'first_edition_holo') {
    return { finish_key: 'holo', printed_identity_modifier: 'edition:first_edition', variant_key: '' };
  }
  return {
    finish_key: normalizeFinish(row.finish_key),
    printed_identity_modifier: '',
    variant_key: '',
  };
}

function foldNameForTriage(value) {
  return normalizeText(String(value ?? '')
    .replaceAll('α', 'alpha')
    .replaceAll('β', 'beta')
    .replaceAll('γ', 'gamma')
    .replaceAll('δ', 'delta')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bimposter\b/g, 'impostor')
    .replace(/\bteam aqua s technical machine\b/g, 'team aqua technical machine')
    .replace(/\bteam aqua'?s technical machine\b/g, 'team aqua technical machine')
    .replace(/\bteam magma s technical machine\b/g, 'team magma technical machine')
    .replace(/\bteam magma'?s technical machine\b/g, 'team magma technical machine')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildAliasMap(masterSets) {
  const aliasToSetKey = new Map();
  for (const set of masterSets ?? []) {
    const aliases = [
      set.key,
      set.set_name,
      set.tcgdex,
      set.pokemontcg,
      ...(set.manual_aliases ?? []),
      ...Object.values(set.source_aliases ?? {}),
    ];
    for (const alias of aliases) {
      const normalized = normalizeText(alias);
      if (normalized && !aliasToSetKey.has(normalized)) aliasToSetKey.set(normalized, set.key);
    }
  }
  return aliasToSetKey;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function topEntries(counts, limit = 30) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function unsupportedSetFamily(setCode) {
  const code = normalizeText(setCode);
  if (/^tk-/.test(code)) return 'deck_kit';
  if (/^mcd/.test(code) || /^\d{4}(sm|swsh|bw|xy)$/.test(code)) return 'mcdonalds';
  if (/^pop/.test(code)) return 'pop_series';
  if (['bp', 'np'].includes(code)) return 'early_promo_or_product';
  if (['basep', 'bwp', 'xyp', 'sma', 'smp', 'swshp', 'svp'].includes(code)) return 'promo_family';
  if (/tg$/.test(code)) return 'trainer_gallery_subset';
  if (['cel25c', 'swsh45sv'].includes(code)) return 'subset_alias';
  if (['g1', 'bw11', 'cel25', 'col1', 'dp7', 'pl1', 'pl2', 'pl3', 'pl4', 'swsh12.5'].includes(code)) {
    return 'subset_number_collision_family';
  }
  if (/^sv10\.5[wb]$/.test(code) || ['sv8pt5'].includes(code)) return 'modern_parallel_family';
  return 'standard_set';
}

function supportedCardFactForLiveRow(row, supportedCardFacts) {
  const combined = { finishes: new Set(), sources: new Set() };
  for (const number of liveNumbers(row, row.canonical_set_key ?? row.set_code)) {
    const fact = supportedCardFacts.get(plainCardKey(row.canonical_set_key ?? row.set_code, number, row.card_name));
    if (!fact) continue;
    for (const finish of fact.finishes) combined.finishes.add(finish);
    for (const source of fact.sources) combined.sources.add(source);
  }
  return combined.finishes.size > 0 ? combined : null;
}

function classifyUnsupported(row, supportedCardFacts) {
  const family = unsupportedSetFamily(row.canonical_set_key ?? row.set_code);
  const finish = normalizeFinish(row.finish_key);
  const fact = supportedCardFactForLiveRow(row, supportedCardFacts);
  const knownFinishes = fact ? [...fact.finishes].sort() : [];
  const dependencyTotal = Number(row.child_dependency_total ?? 0);

  if (!String(row.card_number ?? '').trim() || row.card_number === '?') {
    return { lane: 'invalid_or_unknown_card_number_review', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
  }
  if (dependencyTotal > 0) {
    return { lane: 'dependency_blocked_unsupported_child', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
  }
  if (['masterball', 'pokeball'].includes(finish)) {
    return { lane: 'parallel_finish_exact_source_review', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
  }
  if (['promo_family', 'deck_kit', 'mcdonalds', 'pop_series', 'early_promo_or_product'].includes(family)) {
    return { lane: 'product_or_promo_source_review', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
  }
  if (['trainer_gallery_subset', 'subset_alias', 'subset_number_collision_family', 'modern_parallel_family'].includes(family)) {
    return { lane: 'subset_or_parallel_identity_review', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
  }
  if (fact && ['reverse', 'holo', 'normal'].includes(finish)) {
    return { lane: `${finish}_overgeneration_candidate_no_dependencies`, cleanup_readiness: 'dry_run_candidate', known_index_finishes: knownFinishes };
  }
  if (fact) {
    return { lane: 'known_card_unsupported_finish_review', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
  }
  return { lane: 'source_coverage_or_alias_gap', cleanup_readiness: 'blocked', known_index_finishes: knownFinishes };
}

function buildStampedIdentityRows(...payloads) {
  return payloads.flatMap((payload) => {
    if (!payload) return [];
    return payload.rows ?? payload.closed_rows ?? [];
  });
}

function buildStampedIdentityMap({
  readiness,
  genericAdjudication,
  battleAcademyAdjudication,
  sameFinishAmbiguousAdjudication,
  existingCollisionClosure,
}) {
  const rows = [
    ...(readiness?.rows ?? []).filter((row) => row.proposed_variant_key),
    ...(genericAdjudication?.rows ?? []).filter((row) => row.adjudication_status === 'ready_for_guarded_reverse_stamped_identity_route'),
    ...(battleAcademyAdjudication?.rows ?? []).filter((row) => row.adjudication_status === 'ready_for_guarded_normal_stamped_identity_route'),
    ...(sameFinishAmbiguousAdjudication?.rows ?? [])
      .filter((row) => row.adjudication_status === 'ready_for_guarded_battle_academy_deck_mark_display_metadata_route')
      .map((row) => ({ ...row, target_variant_key: row.proposed_variant_key, target_stamp_label: row.stamp_label })),
    ...(existingCollisionClosure?.rows ?? []).filter((row) => String(row.status ?? '').startsWith('already_satisfied_')),
  ];
  return new Map(rows.map((row) => [stampedFactKey(row), row]));
}

function buildStampedGovernanceClosureMap(...payloads) {
  const rows = buildStampedIdentityRows(...payloads);
  const map = new Map();
  for (const row of rows) {
    const key = stampedFactKey(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function buildStampedActiveFinishRouteMap(...payloads) {
  const rows = payloads.flatMap((payload) => payload?.rows ?? []).filter((row) => (
    row.status === 'ready_for_guarded_dry_run'
    && normalizeFinish(row.accepted_finish_key)
    && normalizeVariantKey(row.variant_key)
    && Number(row.evidence_count ?? row.evidence?.length ?? 0) >= 2
  ));
  return new Map(rows.map((row) => [stampedFactKey(row), row]));
}

function buildSetUnmappedScopeGovernanceMap(payload) {
  return new Map((payload?.rows ?? []).map((row) => [row.card_printing_id, row]));
}

function buildParallelFinishGovernanceMap(payload) {
  return new Map((payload?.governed_rows ?? []).map((row) => [row.card_printing_id, row]));
}

function buildSubsetParallelSupportedFinishGovernanceMap(payload) {
  return new Map((payload?.governed_rows ?? []).map((row) => [row.card_printing_id, row]));
}

function buildProductPromoSupportedFinishGovernanceMap(payload) {
  return new Map((payload?.governed_rows ?? []).map((row) => [row.card_printing_id, row]));
}

function buildSupportedIndex({
  masterPrintings,
  masterSets,
  suppressionKeys,
  stampedIdentityByFactKey,
  stampedGovernanceClosureByFactKey,
  stampedActiveFinishRouteByFactKey,
}) {
  const supportedChildKeys = new Set();
  const supportedCardFacts = new Map();
  const nonWriteStampedFacts = [];
  const routedStampedFacts = [];
  const activeFinishRoutedStampedFacts = [];

  for (const row of masterPrintings.filter((printing) => printing.status === 'master_verified')) {
    if (suppressionKeys.has(masterPrintingKey(row))) continue;
    const setKey = normalizeText(row.set_key);
    const finish = normalizeFinish(row.finish_key);
    if (finish === 'stamped') {
      const stampedIdentity = stampedIdentityByFactKey.get(stampedFactKey(row));
      const routedVariantKey = stampedIdentity?.proposed_variant_key ?? stampedIdentity?.target_variant_key;
      const routedFinishKey = stampedIdentity?.target_finish_key;
      if (routedVariantKey && routedFinishKey) {
        supportedChildKeys.add(childIdentityKey(
          setKey,
          row.card_number,
          row.card_name,
          routedFinishKey,
          routedVariantKey,
          routedVariantKey,
        ));
        routedStampedFacts.push({ ...row, routed_finish_key: routedFinishKey, routed_variant_key: routedVariantKey });
      } else if (stampedActiveFinishRouteByFactKey.has(stampedFactKey(row))) {
        const activeFinishRoute = stampedActiveFinishRouteByFactKey.get(stampedFactKey(row));
        const activeFinishKey = normalizeFinish(activeFinishRoute.accepted_finish_key);
        const activeVariantKey = normalizeVariantKey(activeFinishRoute.variant_key);
        supportedChildKeys.add(childIdentityKey(
          setKey,
          row.card_number,
          row.card_name,
          activeFinishKey,
          activeVariantKey,
          activeVariantKey,
        ));
        activeFinishRoutedStampedFacts.push({
          ...row,
          routed_finish_key: activeFinishKey,
          routed_variant_key: activeVariantKey,
          route_status: activeFinishRoute.status,
          route_evidence_count: activeFinishRoute.evidence_count,
          route_source_families: activeFinishRoute.source_families ?? [],
        });
      } else if (stampedGovernanceClosureByFactKey.has(stampedFactKey(row))) {
        nonWriteStampedFacts.push(row);
      }
      continue;
    }
    const decomposed = decomposedFinish(row);
    supportedChildKeys.add(childIdentityKey(
      setKey,
      row.card_number,
      row.card_name,
      decomposed.finish_key,
      decomposed.printed_identity_modifier,
      decomposed.variant_key,
    ));
    const cardKey = plainCardKey(setKey, row.card_number, row.card_name);
    const fact = supportedCardFacts.get(cardKey) ?? { finishes: new Set(), sources: new Set() };
    fact.finishes.add(decomposed.finish_key);
    for (const source of row.sources ?? []) fact.sources.add(source);
    supportedCardFacts.set(cardKey, fact);
  }

  return {
    supportedChildKeys,
    supportedCardFacts,
    nonWriteStampedFacts,
    routedStampedFacts,
    activeFinishRoutedStampedFacts,
    master_set_count: masterSets.length,
  };
}

async function loadLiveCatalog() {
  const conn = connectionString();
  if (!conn) {
    return { available: false, reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.', rows: [] };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
         coalesce(cp.variant_key, '') as variant_key,
         cpr.id::text as card_printing_id,
         cpr.finish_key
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       where coalesce(cp.set_code, '') <> ''
       order by cp.set_code, coalesce(cp.number_plain, cp.number), cp.name, cpr.finish_key, cpr.id`,
    );
    const tableNames = CHILD_DEPENDENCY_TABLES.map((dep) => dep.table);
    const existingTablesResult = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])`,
      [tableNames],
    );
    const existingTables = new Set(existingTablesResult.rows.map((row) => row.table_name));
    const rowsByPrintingId = new Map(result.rows.map((row) => [row.card_printing_id, row]));
    for (const row of result.rows) {
      for (const field of Object.values(DEPENDENCY_FIELD_BY_TABLE)) row[field] = 0;
    }
    const ids = result.rows.map((row) => row.card_printing_id);
    for (const dep of CHILD_DEPENDENCY_TABLES) {
      if (!existingTables.has(dep.table)) continue;
      const where = dep.activeClause
        ? `${dep.column} = any($1::uuid[]) and ${dep.activeClause}`
        : `${dep.column} = any($1::uuid[])`;
      const depResult = await client.query(
        `select ${dep.column}::text as card_printing_id, count(*)::int as refs
         from public.${dep.table}
         where ${where}
         group by ${dep.column}`,
        [ids],
      );
      const field = DEPENDENCY_FIELD_BY_TABLE[dep.table];
      for (const depRow of depResult.rows) {
        const row = rowsByPrintingId.get(depRow.card_printing_id);
        if (row) row[field] = Number(depRow.refs);
      }
    }
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      rows: result.rows,
      dependency_tables_checked: tableNames,
      dependency_tables_available: [...existingTables].sort(),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [], dependency_tables_checked: [], dependency_tables_available: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_lane[lane]?.slice(0, 10).map((row) => `${row.key}:${row.count}`).join(', ') ?? '',
  ]);
  const readinessRows = Object.entries(report.summary.by_cleanup_readiness).map(([status, count]) => [status, count]);
  const candidateRows = report.next_dry_run_candidate_buckets.map((row) => [
    row.lane,
    row.rows,
    row.top_sets.map((item) => `${item.key}:${item.count}`).join(', '),
  ]);
  return `# English Master Index Current Unsupported Reconciliation Lanes V1

Current read-only classification of Grookai child printings that are not supported by the current Master Index reconciliation keyspace.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Current Summary

- live_card_printing_rows: ${report.live_read.card_printing_rows}
- supported_master_child_keys: ${report.summary.supported_master_child_keys}
- unsupported_rows: ${report.summary.unsupported_rows}
- set_unmapped_scope_governed_rows: ${report.summary.set_unmapped_scope_governed_rows}
- parallel_finish_governed_non_write_rows: ${report.summary.parallel_finish_governed_non_write_rows}
- subset_parallel_supported_finish_governed_non_write_rows: ${report.summary.subset_parallel_supported_finish_governed_non_write_rows}
- product_promo_supported_finish_governed_non_write_rows: ${report.summary.product_promo_supported_finish_governed_non_write_rows}
- governed_stamped_non_write_facts: ${report.summary.governed_stamped_non_write_facts}
- routed_stamped_identity_facts: ${report.summary.routed_stamped_identity_facts}
- routed_stamped_active_finish_facts: ${report.summary.routed_stamped_active_finish_facts}

## Cleanup Readiness

${markdownTable(['readiness', 'rows'], readinessRows)}

## Lanes

${markdownTable(['lane', 'rows', 'top_sets'], laneRows)}

## Next Dry-Run Candidate Buckets

${markdownTable(['lane', 'rows', 'top_sets'], candidateRows)}

## Principles

- This report is not deletion authority.
- Only dry_run_candidate rows may be considered for a future rollback-only cleanup package.
- Rows with dependencies, product/promo review, subset review, source coverage gaps, or parallel uncertainty remain blocked.
- Stamped facts governed as non-write Master Index facts are not considered missing DB rows.
`;
}

const master = await readJson(PRINTINGS_JSON);
const masterSets = await readJson(SETS_JSON);
const hostSubsetSuppression = await readOptionalJson(HOST_SUBSET_SUPPRESSION_JSON);
const stampedIdentityReadiness = await readOptionalJson(STAMPED_IDENTITY_READINESS_JSON);
const stampedGenericAdjudication = await readOptionalJson(STAMPED_GENERIC_ADJUDICATION_JSON);
const stampedBattleAcademyAdjudication = await readOptionalJson(STAMPED_BATTLE_ACADEMY_ADJUDICATION_JSON);
const stampedExistingCollisionClosure = await readOptionalJson(STAMPED_EXISTING_COLLISION_CLOSURE_JSON);
const stampedSameFinishAmbiguousAdjudication = await readOptionalJson(STAMPED_SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON);
const stampedNoWriteGovernanceClosure = await readOptionalJson(STAMPED_NO_WRITE_GOVERNANCE_CLOSURE_JSON);
const stampedBaseParentResolutionClosure = await readOptionalJson(STAMPED_BASE_PARENT_RESOLUTION_CLOSURE_JSON);
const stampedPrizePackFinishMappingClosure = await readOptionalJson(STAMPED_PRIZE_PACK_FINISH_MAPPING_CLOSURE_JSON);
const stampedSourceAcquisitionClosure = await readOptionalJson(STAMPED_SOURCE_ACQUISITION_CLOSURE_JSON);
const stampedConflictManualClosure = await readOptionalJson(STAMPED_CONFLICT_MANUAL_CLOSURE_JSON);
const stampedActiveFinishWebEvidence = await readOptionalJson(STAMPED_ACTIVE_FINISH_WEB_EVIDENCE_JSON);
const residualStampedActiveFinishRouteEvidence = await readOptionalJson(RESIDUAL_STAMPED_ACTIVE_FINISH_ROUTE_EVIDENCE_JSON);
const residualActiveFinishReplacementRouteEvidence = await readOptionalJson(RESIDUAL_ACTIVE_FINISH_REPLACEMENT_ROUTE_EVIDENCE_JSON);
const finalSourceClosureRouteEvidence = await readOptionalJson(FINAL_SOURCE_CLOSURE_ROUTE_EVIDENCE_JSON);
const setUnmappedScopeGovernance = await readOptionalJson(SET_UNMAPPED_SCOPE_GOVERNANCE_JSON);
const prismaticParallelFinishGovernance = await readOptionalJson(PRISMATIC_PARALLEL_FINISH_GOVERNANCE_JSON);
const subsetParallelSupportedFinishGovernance = await readOptionalJson(SUBSET_PARALLEL_SUPPORTED_FINISH_GOVERNANCE_JSON);
const productPromoSupportedFinishGovernance = await readOptionalJson(PRODUCT_PROMO_SUPPORTED_FINISH_GOVERNANCE_JSON);

const masterSetRows = masterSets.sets ?? [];
const aliasToSetKey = buildAliasMap(masterSetRows);
const suppressionKeys = new Set((hostSubsetSuppression?.rows ?? []).map((row) => row.suppression_key));
const stampedIdentityByFactKey = buildStampedIdentityMap({
  readiness: stampedIdentityReadiness,
  genericAdjudication: stampedGenericAdjudication,
  battleAcademyAdjudication: stampedBattleAcademyAdjudication,
  sameFinishAmbiguousAdjudication: stampedSameFinishAmbiguousAdjudication,
  existingCollisionClosure: stampedExistingCollisionClosure,
});
const stampedGovernanceClosureByFactKey = buildStampedGovernanceClosureMap(
  stampedNoWriteGovernanceClosure,
  stampedBaseParentResolutionClosure,
  stampedPrizePackFinishMappingClosure,
  stampedSourceAcquisitionClosure,
  stampedConflictManualClosure,
);
const stampedActiveFinishRouteByFactKey = buildStampedActiveFinishRouteMap(
  stampedActiveFinishWebEvidence,
  residualStampedActiveFinishRouteEvidence,
  residualActiveFinishReplacementRouteEvidence,
  finalSourceClosureRouteEvidence,
);
const supportedIndex = buildSupportedIndex({
  masterPrintings: master.printings ?? [],
  masterSets: masterSetRows,
  suppressionKeys,
  stampedIdentityByFactKey,
  stampedGovernanceClosureByFactKey,
  stampedActiveFinishRouteByFactKey,
});
const setUnmappedScopeGovernanceByPrintingId = buildSetUnmappedScopeGovernanceMap(setUnmappedScopeGovernance);
const parallelFinishGovernanceByPrintingId = buildParallelFinishGovernanceMap(prismaticParallelFinishGovernance);
const subsetParallelSupportedFinishGovernanceByPrintingId = buildSubsetParallelSupportedFinishGovernanceMap(subsetParallelSupportedFinishGovernance);
const productPromoSupportedFinishGovernanceByPrintingId = buildProductPromoSupportedFinishGovernanceMap(productPromoSupportedFinishGovernance);
const live = await loadLiveCatalog();
const unsupportedRows = [];
const setUnmappedRows = [];
const setUnmappedScopeGovernedRows = [];
const parallelFinishGovernedRows = [];
const subsetParallelSupportedFinishGovernedRows = [];
const productPromoSupportedFinishGovernedRows = [];
let supportedLiveRows = 0;

if (live.available) {
  for (const row of live.rows) {
    const canonicalSetKey = aliasToSetKey.get(normalizeText(row.set_code));
    if (!canonicalSetKey) {
      const governed = setUnmappedScopeGovernanceByPrintingId.get(row.card_printing_id);
      if (governed?.governance_status === 'scope_excluded_non_write') {
        setUnmappedScopeGovernedRows.push({
          lane: 'set_unmapped_scope_excluded_non_write',
          cleanup_readiness: 'scope_governed_non_write',
          governance_status: governed.governance_status,
          governance_category: governed.governance_category,
          recommended_action: governed.recommended_action,
          ...row,
        });
        continue;
      }
      setUnmappedRows.push({
        lane: 'set_unmapped',
        cleanup_readiness: 'blocked',
        governance_status: governed?.governance_status ?? 'not_governed',
        governance_category: governed?.governance_category ?? 'not_governed',
        ...row,
      });
      continue;
    }
    const subsetParallelSupportedFinishGovernance = subsetParallelSupportedFinishGovernanceByPrintingId.get(row.card_printing_id);
    if (subsetParallelSupportedFinishGovernance?.cleanup_readiness === 'governed_non_write') {
      subsetParallelSupportedFinishGovernedRows.push({
        lane: 'subset_parallel_supported_finish_governed_non_write',
        cleanup_readiness: 'governed_non_write',
        governance_status: subsetParallelSupportedFinishGovernance.governance_status,
        reason: subsetParallelSupportedFinishGovernance.reason,
        known_index_finishes: subsetParallelSupportedFinishGovernance.known_index_finishes ?? [],
        ...row,
        canonical_set_key: canonicalSetKey,
      });
      continue;
    }
    const productPromoSupportedFinishGovernance = productPromoSupportedFinishGovernanceByPrintingId.get(row.card_printing_id);
    if (productPromoSupportedFinishGovernance?.cleanup_readiness === 'governed_non_write') {
      productPromoSupportedFinishGovernedRows.push({
        lane: 'product_promo_supported_finish_governed_non_write',
        cleanup_readiness: 'governed_non_write',
        governance_status: productPromoSupportedFinishGovernance.governance_status,
        reason: productPromoSupportedFinishGovernance.reason,
        known_index_finishes: productPromoSupportedFinishGovernance.known_index_finishes ?? [],
        ...row,
        canonical_set_key: canonicalSetKey,
      });
      continue;
    }
    const parallelFinishGovernance = parallelFinishGovernanceByPrintingId.get(row.card_printing_id);
    if (parallelFinishGovernance?.cleanup_readiness === 'governed_non_write') {
      parallelFinishGovernedRows.push({
        lane: 'parallel_finish_source_governed_non_write',
        cleanup_readiness: 'governed_non_write',
        governance_status: parallelFinishGovernance.governance_status,
        source_key: parallelFinishGovernance.source_key,
        source_kind: parallelFinishGovernance.source_kind,
        source_url: parallelFinishGovernance.source_url,
        supporting_rule_source_url: parallelFinishGovernance.supporting_rule_source_url,
        evidence_label: parallelFinishGovernance.evidence_label,
        raw_snapshot_ref: parallelFinishGovernance.raw_snapshot_ref,
        ...row,
        canonical_set_key: canonicalSetKey,
      });
      continue;
    }
    const supportedChildKey = liveChildIdentityKeys(canonicalSetKey, row)
      .find((key) => supportedIndex.supportedChildKeys.has(key));
    if (supportedChildKey) {
      supportedLiveRows += 1;
      continue;
    }
    const dependencyTotal = CHILD_DEPENDENCY_TABLES.reduce((sum, dep) => {
      const field = {
        vault_item_instances: 'vault_item_instance_refs',
        external_printing_mappings: 'external_printing_mapping_refs',
        canon_warehouse_candidates: 'canon_warehouse_candidate_refs',
        card_printing_truth_reviews: 'truth_review_refs',
        justtcg_grookai_mappings: 'justtcg_mapping_refs',
      }[dep.table];
      return sum + Number(row[field] ?? 0);
    }, 0);
    const base = {
      ...row,
      canonical_set_key: canonicalSetKey,
      child_identity_key: childIdentityKey(
        canonicalSetKey,
        row.card_number,
        row.card_name,
        row.finish_key,
        row.printed_identity_modifier,
        row.variant_key,
      ),
      live_number_candidates: liveNumbers(row, canonicalSetKey),
      child_dependency_total: dependencyTotal,
    };
    const classification = classifyUnsupported(base, supportedIndex.supportedCardFacts);
    unsupportedRows.push({
      ...classification,
      ...base,
    });
  }
}

const allOpenRows = [...unsupportedRows, ...setUnmappedRows];
const byLane = countBy(allOpenRows, (row) => row.lane);
const topSetsByLane = {};
for (const lane of Object.keys(byLane)) {
  topSetsByLane[lane] = topEntries(countBy(allOpenRows.filter((row) => row.lane === lane), (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'), 20);
}
const dryRunCandidates = allOpenRows.filter((row) => row.cleanup_readiness === 'dry_run_candidate');
const candidateBuckets = Object.entries(countBy(dryRunCandidates, (row) => row.lane)).map(([lane, count]) => ({
  lane,
  rows: count,
  top_sets: topEntries(countBy(dryRunCandidates.filter((row) => row.lane === lane), (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'), 12),
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_current_unsupported_reconciliation_lanes_v1',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    card_printing_rows: live.rows.length,
  },
  source_artifacts: {
    printings: PRINTINGS_JSON,
    sets: SETS_JSON,
    host_subset_suppression: HOST_SUBSET_SUPPRESSION_JSON,
    stamped_identity_readiness: STAMPED_IDENTITY_READINESS_JSON,
    set_unmapped_scope_governance: SET_UNMAPPED_SCOPE_GOVERNANCE_JSON,
    stamped_governance_closure: [
      STAMPED_NO_WRITE_GOVERNANCE_CLOSURE_JSON,
      STAMPED_BASE_PARENT_RESOLUTION_CLOSURE_JSON,
      STAMPED_PRIZE_PACK_FINISH_MAPPING_CLOSURE_JSON,
      STAMPED_SOURCE_ACQUISITION_CLOSURE_JSON,
      STAMPED_CONFLICT_MANUAL_CLOSURE_JSON,
    ],
    stamped_active_finish_web_evidence: STAMPED_ACTIVE_FINISH_WEB_EVIDENCE_JSON,
    residual_stamped_active_finish_route_evidence: RESIDUAL_STAMPED_ACTIVE_FINISH_ROUTE_EVIDENCE_JSON,
    residual_active_finish_replacement_route_evidence: RESIDUAL_ACTIVE_FINISH_REPLACEMENT_ROUTE_EVIDENCE_JSON,
    final_source_closure_route_evidence: FINAL_SOURCE_CLOSURE_ROUTE_EVIDENCE_JSON,
    prismatic_parallel_finish_governance: PRISMATIC_PARALLEL_FINISH_GOVERNANCE_JSON,
    subset_parallel_supported_finish_governance: SUBSET_PARALLEL_SUPPORTED_FINISH_GOVERNANCE_JSON,
    product_promo_supported_finish_governance: PRODUCT_PROMO_SUPPORTED_FINISH_GOVERNANCE_JSON,
  },
  summary: {
    master_verified_printings: (master.printings ?? []).filter((row) => row.status === 'master_verified').length,
    supported_master_child_keys: supportedIndex.supportedChildKeys.size,
    supported_live_child_rows: supportedLiveRows,
    unsupported_rows: unsupportedRows.length,
    set_unmapped_rows: setUnmappedRows.length,
    set_unmapped_scope_governed_rows: setUnmappedScopeGovernedRows.length,
    parallel_finish_governed_non_write_rows: parallelFinishGovernedRows.length,
    subset_parallel_supported_finish_governed_non_write_rows: subsetParallelSupportedFinishGovernedRows.length,
    product_promo_supported_finish_governed_non_write_rows: productPromoSupportedFinishGovernedRows.length,
    governed_stamped_non_write_facts: supportedIndex.nonWriteStampedFacts.length,
    routed_stamped_identity_facts: supportedIndex.routedStampedFacts.length,
    routed_stamped_active_finish_facts: supportedIndex.activeFinishRoutedStampedFacts.length,
    by_lane: byLane,
    by_cleanup_readiness: countBy(allOpenRows, (row) => row.cleanup_readiness),
    by_finish: countBy(allOpenRows, (row) => row.finish_key ?? 'unknown'),
    top_sets_by_lane: topSetsByLane,
  },
  next_dry_run_candidate_buckets: candidateBuckets,
  set_unmapped_scope_governance: {
    available: Boolean(setUnmappedScopeGovernance),
    source_rows: setUnmappedScopeGovernance?.rows?.length ?? 0,
    governed_rows: setUnmappedScopeGovernedRows.length,
    by_governance_category: countBy(setUnmappedScopeGovernedRows, (row) => row.governance_category ?? 'unknown'),
    rows: setUnmappedScopeGovernedRows,
  },
  parallel_finish_governance: {
    available: Boolean(prismaticParallelFinishGovernance),
    source_rows: prismaticParallelFinishGovernance?.governed_rows?.length ?? 0,
    governed_rows: parallelFinishGovernedRows.length,
    by_governance_status: countBy(parallelFinishGovernedRows, (row) => row.governance_status ?? 'unknown'),
    by_finish: countBy(parallelFinishGovernedRows, (row) => row.finish_key ?? 'unknown'),
    rows: parallelFinishGovernedRows,
  },
  subset_parallel_supported_finish_governance: {
    available: Boolean(subsetParallelSupportedFinishGovernance),
    source_rows: subsetParallelSupportedFinishGovernance?.governed_rows?.length ?? 0,
    governed_rows: subsetParallelSupportedFinishGovernedRows.length,
    by_governance_status: countBy(subsetParallelSupportedFinishGovernedRows, (row) => row.governance_status ?? 'unknown'),
    by_set: countBy(subsetParallelSupportedFinishGovernedRows, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(subsetParallelSupportedFinishGovernedRows, (row) => row.finish_key ?? 'unknown'),
    rows: subsetParallelSupportedFinishGovernedRows,
  },
  product_promo_supported_finish_governance: {
    available: Boolean(productPromoSupportedFinishGovernance),
    source_rows: productPromoSupportedFinishGovernance?.governed_rows?.length ?? 0,
    governed_rows: productPromoSupportedFinishGovernedRows.length,
    by_governance_status: countBy(productPromoSupportedFinishGovernedRows, (row) => row.governance_status ?? 'unknown'),
    by_set: countBy(productPromoSupportedFinishGovernedRows, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(productPromoSupportedFinishGovernedRows, (row) => row.finish_key ?? 'unknown'),
    rows: productPromoSupportedFinishGovernedRows,
  },
  rows: allOpenRows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  summary: report.summary,
  next_dry_run_candidate_buckets: report.next_dry_run_candidate_buckets,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
