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
const ROOT = process.cwd();
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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.md');

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

function parentKey(setCode, number, name) {
  return [normalizeText(setCode), normalizeNumber(number), normalizeText(name)].join('|');
}

function numberKey(setCode, number) {
  return [normalizeText(setCode), normalizeNumber(number)].join('|');
}

function childKey(setCode, number, name, finishKey) {
  return [parentKey(setCode, number, name), normalizeText(finishKey)].join('|');
}

function parentIdentityKey(setCode, number, name, printedIdentityModifier, variantKey = '') {
  return [
    parentKey(setCode, number, name),
    normalizeText(printedIdentityModifier),
    normalizeText(variantKey),
  ].join('|');
}

function childIdentityKey(setCode, number, name, finishKey, printedIdentityModifier, variantKey = '') {
  return [
    childKey(setCode, number, name, finishKey),
    normalizeText(printedIdentityModifier),
    normalizeText(variantKey),
  ].join('|');
}

function stampedFactKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function nameCandidates(name) {
  const raw = String(name ?? '').trim();
  const strippedParenthetical = raw.replace(/\s+\([^)]*\)\s*$/, '').trim();
  return [...new Set([raw, strippedParenthetical].filter(Boolean))];
}

function displayNameComparable(value) {
  const raw = String(value ?? '')
    .replaceAll('α', 'alpha')
    .replaceAll('β', 'beta')
    .replaceAll('γ', 'gamma')
    .replaceAll('δ', 'delta');
  return normalizeText(raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bimposter\b/g, 'impostor')
    .replace(/\bteam aqua s technical machine\b/g, 'team aqua technical machine')
    .replace(/\bteam aqua'?s technical machine\b/g, 'team aqua technical machine')
    .replace(/\bteam magma s technical machine\b/g, 'team magma technical machine')
    .replace(/\bteam magma'?s technical machine\b/g, 'team magma technical machine')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function withoutLevelXSuffix(value) {
  return displayNameComparable(value).replace(/\s+lv\s*x$/i, '').trim();
}

function identityAliasPattern(masterName, liveName) {
  const master = displayNameComparable(masterName);
  const live = displayNameComparable(liveName);
  const liveWithoutLevelX = withoutLevelXSuffix(liveName);
  if (master === live) return 'equivalent_after_display_normalization';
  if (master === liveWithoutLevelX && /\blv\.?\s*x\b/i.test(String(liveName ?? ''))) {
    return 'master_name_missing_level_x_suffix';
  }
  if (
    master.replace(/\s+/g, '') === live.replace(/\s+/g, '')
    || withoutLevelXSuffix(masterName) === liveWithoutLevelX
  ) {
    return 'spacing_or_punctuation_variant';
  }
  return null;
}

function governedSetIdentityAliasPattern(setKey, masterName, liveName) {
  const directPattern = identityAliasPattern(masterName, liveName);
  if (directPattern) return directPattern;

  const master = displayNameComparable(masterName);
  const live = displayNameComparable(liveName);
  if (
    normalizeText(setKey) === 'pl2'
    && master.replace(/\s+4$/, ' e4') === live
    && /\s4$/.test(master)
    && /\se4$/.test(live)
  ) {
    return 'rising_rivals_elite_four_e4_alias';
  }
  if (
    normalizeText(setKey) === 'pl4'
    && (
      (master === 'zapdos' && live === 'zapdos g')
      || (master === 'porygon z' && live === 'porygon z g')
      || (master === 'beedrill' && live === 'beedrill g')
    )
  ) {
    return 'arceus_sp_g_suffix_source_label_alias';
  }

  return null;
}

function decomposedFinish(row) {
  if (row.finish_key === 'first_edition_normal') {
    return { finish_key: 'normal', printed_identity_modifier: 'edition:first_edition' };
  }
  if (row.finish_key === 'first_edition_holo') {
    return { finish_key: 'holo', printed_identity_modifier: 'edition:first_edition' };
  }
  return { finish_key: row.finish_key, printed_identity_modifier: '' };
}

function masterPrintingKey(row) {
  return childKey(row.set_key, row.card_number, row.card_name, row.finish_key);
}

function externalClaims(row) {
  const claims = [];
  for (const url of row.evidence_urls ?? []) {
    const pokemonApiMatch = String(url).match(/api\.pokemontcg\.io\/v2\/cards\/([^/?#]+)/i);
    if (pokemonApiMatch?.[1]) {
      claims.push({ source: 'pokemonapi', external_id: pokemonApiMatch[1] });
    }
  }
  return claims;
}

function liveNumbers(row) {
  return [...new Set([
    row.card_number,
    row.number,
    row.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
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

async function loadLiveCatalog() {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      card_prints: [],
      card_printings: [],
      active_finish_keys: [],
    };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const parents = await client.query(
      `select
         id::text,
         set_code,
         coalesce(number_plain, number) as card_number,
         number,
         number_plain,
         name,
         printed_identity_modifier,
         variant_key
       from public.card_prints
       where coalesce(set_code, '') <> ''`,
    );
    const children = await client.query(
      `select
         cpr.id::text as card_printing_id,
         cpr.card_print_id::text,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         cp.variant_key,
         cpr.finish_key
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       where coalesce(cp.set_code, '') <> ''`,
    );
    const finishes = await client.query(`select key from public.finish_keys where is_active = true`);
    const mappings = await client.query(
      `select source, external_id, card_print_id::text
       from public.external_mappings
       where active = true
         and source in ('pokemonapi')`,
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      card_prints: parents.rows,
      card_printings: children.rows,
      active_finish_keys: finishes.rows.map((row) => row.key),
      external_mappings: mappings.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      card_prints: [],
      card_printings: [],
      active_finish_keys: [],
      external_mappings: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildAliasMap(masterSets) {
  const aliasesBySetKey = new Map();
  for (const set of masterSets ?? []) {
    const aliases = new Set([
      set.key,
      set.tcgdex,
      set.pokemontcg,
      ...(set.manual_aliases ?? []),
      ...Object.values(set.source_aliases ?? {}),
    ].filter(Boolean).map(normalizeText));
    aliasesBySetKey.set(set.key, [...aliases]);
  }
  return aliasesBySetKey;
}

function aliasesForSet(setKey, aliasesBySetKey) {
  return aliasesBySetKey.get(setKey) ?? [normalizeText(setKey)];
}

function classifyMissing({
  masterPrintings,
  masterSets,
  live,
  suppressionKeys = new Set(),
  stampedIdentityByFactKey = new Map(),
  stampedGovernanceClosureByFactKey = new Map(),
}) {
  const aliasesBySetKey = buildAliasMap(masterSets);
  const parentsByExactKey = new Map();
  const parentsByIdentityKey = new Map();
  const parentsByNumberKey = new Map();
  const parentsById = new Map();
  const externalMappingsByKey = new Map();
  const finishesByParentId = new Map();
  const setCodes = new Set();
  const childKeys = new Set();
  const childIdentityKeys = new Set();
  const stampedIdentitySuppressed = [];
  const externalMappingSuppressed = [];
  const activeFinishKeys = new Set(live.active_finish_keys.map(normalizeText));

  for (const parent of live.card_prints) {
    parentsById.set(parent.id, parent);
    setCodes.add(normalizeText(parent.set_code));
    for (const number of liveNumbers(parent)) {
      const pKey = parentKey(parent.set_code, number, parent.name);
      const pIdentityKey = parentIdentityKey(
        parent.set_code,
        number,
        parent.name,
        parent.printed_identity_modifier,
        parent.variant_key,
      );
      const nKey = numberKey(parent.set_code, number);
      if (!parentsByExactKey.has(pKey)) parentsByExactKey.set(pKey, []);
      parentsByExactKey.get(pKey).push(parent);
      if (!parentsByIdentityKey.has(pIdentityKey)) parentsByIdentityKey.set(pIdentityKey, []);
      parentsByIdentityKey.get(pIdentityKey).push(parent);
      if (!parentsByNumberKey.has(nKey)) parentsByNumberKey.set(nKey, []);
      parentsByNumberKey.get(nKey).push(parent);
    }
  }

  for (const child of live.card_printings) {
    if (!finishesByParentId.has(child.card_print_id)) finishesByParentId.set(child.card_print_id, new Set());
    finishesByParentId.get(child.card_print_id).add(normalizeText(child.finish_key));
    for (const number of liveNumbers(child)) {
      childKeys.add(childKey(child.set_code, number, child.name, child.finish_key));
      childIdentityKeys.add(childIdentityKey(
        child.set_code,
        number,
        child.name,
        child.finish_key,
        child.printed_identity_modifier,
        child.variant_key,
      ));
    }
  }

  for (const mapping of live.external_mappings ?? []) {
    const key = `${normalizeText(mapping.source)}:${normalizeText(mapping.external_id)}`;
    if (!externalMappingsByKey.has(key)) externalMappingsByKey.set(key, []);
    externalMappingsByKey.get(key).push(mapping);
  }

  const classified = [];
  const identityAliasSuppressed = [];
  const stampedGovernanceClosed = [];
  for (const printing of masterPrintings.filter((row) => row.status === 'master_verified')) {
    if (suppressionKeys.has(masterPrintingKey(printing))) continue;
    const resolved = decomposedFinish(printing);
    const aliases = aliasesForSet(printing.set_key, aliasesBySetKey);
    if (normalizeText(printing.finish_key) === 'stamped') {
      const stampedIdentity = stampedIdentityByFactKey.get(stampedFactKey(printing));
      const routedVariantKey = stampedIdentity?.proposed_variant_key ?? stampedIdentity?.target_variant_key;
      const routedFinishKey = stampedIdentity?.target_finish_key ?? null;
      if (routedVariantKey && normalizeText(routedVariantKey) !== 'stamped') {
        const genericStampedParentAlias = aliases.find((alias) => (
          nameCandidates(printing.card_name).some((candidateName) => (
            (parentsByExactKey.get(parentKey(alias, printing.card_number, candidateName)) ?? [])
              .some((parent) => normalizeText(parent.variant_key) === 'stamped')
          ))
        ));
        if (genericStampedParentAlias) {
          const genericStampedParentMatches = nameCandidates(printing.card_name).flatMap((candidateName) => (
            parentsByExactKey.get(parentKey(genericStampedParentAlias, printing.card_number, candidateName)) ?? []
          )).filter((parent) => normalizeText(parent.variant_key) === 'stamped');
          stampedIdentitySuppressed.push({
            suppression_type: 'stamped_generic_parent_variant_upgrade_required',
            set_key: printing.set_key,
            set_name: printing.set_name,
            card_number: printing.card_number,
            card_name: printing.card_name,
            finish_key: printing.finish_key,
            proposed_variant_key: routedVariantKey,
            existing_variant_key: 'stamped',
            existing_parent_ids: genericStampedParentMatches.map((parent) => parent.id),
            target_finish_key: routedFinishKey,
            stamp_label: stampedIdentity.stamp_label ?? stampedIdentity.target_stamp_label,
            reason: 'Grookai already has a generic stamped parent for this fact. Do not insert a duplicate; route this through a future variant-key upgrade package after dependency checks.',
            sources: printing.sources ?? [],
            evidence_urls: printing.evidence_urls ?? [],
          });
          continue;
        }
      }
      if (routedVariantKey && routedFinishKey) {
        const stampedParentAlias = aliases.find((alias) => (
          nameCandidates(printing.card_name).some((candidateName) => (
            (parentsByExactKey.get(parentKey(alias, printing.card_number, candidateName)) ?? [])
              .some((parent) => normalizeText(parent.variant_key) === normalizeText(routedVariantKey))
          ))
        ));
        if (stampedParentAlias) {
          const stampedParentMatches = nameCandidates(printing.card_name).flatMap((candidateName) => (
            parentsByExactKey.get(parentKey(stampedParentAlias, printing.card_number, candidateName)) ?? []
          )).filter((parent) => normalizeText(parent.variant_key) === normalizeText(routedVariantKey));
          const stampedChildExists = stampedParentMatches.some((parent) => (
            childIdentityKeys.has(childIdentityKey(
                parent.set_code,
                printing.card_number,
                parent.name,
                routedFinishKey,
                parent.printed_identity_modifier,
                parent.variant_key,
            ))
          ));
          if (stampedChildExists) {
            stampedIdentitySuppressed.push({
              suppression_type: 'resolved_stamped_canonical_identity',
              set_key: printing.set_key,
              set_name: printing.set_name,
              card_number: printing.card_number,
              card_name: printing.card_name,
              finish_key: printing.finish_key,
              proposed_variant_key: routedVariantKey,
              target_finish_key: routedFinishKey,
              stamp_label: stampedIdentity.stamp_label ?? stampedIdentity.target_stamp_label,
              reason: 'A canonical stamped parent with the governed variant_key and routed active child finish exists; generic stamped finish blocker is resolved through canonical identity.',
              sources: printing.sources ?? [],
              evidence_urls: printing.evidence_urls ?? [],
            });
            continue;
          }
        }
      }
      const anyVariantParentAlias = aliases.find((alias) => (
        nameCandidates(printing.card_name).some((candidateName) => (
          (parentsByExactKey.get(parentKey(alias, printing.card_number, candidateName)) ?? [])
            .some((parent) => normalizeText(parent.variant_key))
        ))
      ));
      if (anyVariantParentAlias) {
        const variantParentMatches = nameCandidates(printing.card_name).flatMap((candidateName) => (
          parentsByExactKey.get(parentKey(anyVariantParentAlias, printing.card_number, candidateName)) ?? []
        )).filter((parent) => normalizeText(parent.variant_key));
        stampedIdentitySuppressed.push({
          suppression_type: 'stamped_existing_variant_parent_review_required',
          set_key: printing.set_key,
          set_name: printing.set_name,
          card_number: printing.card_number,
          card_name: printing.card_name,
          finish_key: printing.finish_key,
          proposed_variant_key: routedVariantKey ?? null,
          existing_variant_keys: [...new Set(variantParentMatches.map((parent) => normalizeText(parent.variant_key)))].sort(),
          existing_parent_ids: variantParentMatches.map((parent) => parent.id),
          target_finish_key: routedFinishKey,
          stamp_label: stampedIdentity?.stamp_label ?? stampedIdentity?.target_stamp_label ?? null,
          reason: 'Grookai already has one or more stamped/variant parents for this set-number-name slot. Do not insert a duplicate; route through identity/variant review with dependency checks.',
          sources: printing.sources ?? [],
          evidence_urls: printing.evidence_urls ?? [],
        });
        continue;
      }
      const governanceClosures = stampedGovernanceClosureByFactKey.get(stampedFactKey(printing)) ?? [];
      if (governanceClosures.length > 0) {
        stampedGovernanceClosed.push({
          suppression_type: 'stamped_governed_non_write_closure',
          set_key: printing.set_key,
          set_name: printing.set_name,
          card_number: printing.card_number,
          card_name: printing.card_name,
          finish_key: printing.finish_key,
          closure_statuses: [...new Set(governanceClosures.map((row) => row.closure_status ?? row.status ?? row.queue_status ?? 'closed_or_blocked_by_pkg18_governance'))].sort(),
          closure_reasons: [...new Set(governanceClosures.map((row) => row.closure_reason ?? row.recommended_next_action ?? row.reason ?? 'stamped_finish_taxonomy_governance'))].sort(),
          execution_buckets: [...new Set(governanceClosures.map((row) => row.execution_bucket ?? row.source_execution_bucket ?? 'pkg18_governance_closure'))].sort(),
          source_artifacts: [...new Set(governanceClosures.map((row) => row.source_artifact).filter(Boolean))].sort(),
          reason: 'PKG-18 stamped governance classified this stamped finish fact as non-write, blocked, source-exhausted, or manual-review-only. Do not count it as a DB write-ready missing row.',
          sources: printing.sources ?? [],
          evidence_urls: printing.evidence_urls ?? [],
        });
        continue;
      }
    }
    const existingChildAlias = aliases.find((alias) => (
      nameCandidates(printing.card_name).some((candidateName) => (
        resolved.printed_identity_modifier
          ? childIdentityKeys.has(childIdentityKey(
            alias,
            printing.card_number,
            candidateName,
            resolved.finish_key,
            resolved.printed_identity_modifier,
          ))
          : childKeys.has(childKey(alias, printing.card_number, candidateName, resolved.finish_key))
      ))
    ));
    if (existingChildAlias) continue;

    const existingParentAlias = aliases.find((alias) => (
      nameCandidates(printing.card_name).some((candidateName) => (
        resolved.printed_identity_modifier
          ? (parentsByIdentityKey.get(parentIdentityKey(
            alias,
            printing.card_number,
            candidateName,
            resolved.printed_identity_modifier,
          )) ?? []).length > 0
          : (parentsByExactKey.get(parentKey(alias, printing.card_number, candidateName)) ?? []).length > 0
      ))
    ));
    const exactParentMatches = existingParentAlias
      ? (
        nameCandidates(printing.card_name).flatMap((candidateName) => (
          resolved.printed_identity_modifier
            ? parentsByIdentityKey.get(parentIdentityKey(
              existingParentAlias,
              printing.card_number,
              candidateName,
              resolved.printed_identity_modifier,
            )) ?? []
            : parentsByExactKey.get(parentKey(existingParentAlias, printing.card_number, candidateName)) ?? []
        ))
      )
      : [];
    const sameNumberParents = aliases.flatMap((alias) => parentsByNumberKey.get(numberKey(alias, printing.card_number)) ?? []);
    const existingSetAlias = aliases.find((alias) => setCodes.has(normalizeText(alias)));
    const identityAliasMatch = sameNumberParents.find((parent) => (
      governedSetIdentityAliasPattern(printing.set_key, printing.card_name, parent.name)
      && nameCandidates(parent.name).some((candidateName) => (
        resolved.printed_identity_modifier
          ? childIdentityKeys.has(childIdentityKey(
            parent.set_code,
            printing.card_number,
            candidateName,
            resolved.finish_key,
            resolved.printed_identity_modifier,
            parent.variant_key,
          ))
          : childKeys.has(childKey(parent.set_code, printing.card_number, candidateName, resolved.finish_key))
      ))
    ));
    if (identityAliasMatch) {
      identityAliasSuppressed.push({
        suppression_type: governedSetIdentityAliasPattern(printing.set_key, printing.card_name, identityAliasMatch.name),
        set_key: printing.set_key,
        set_name: printing.set_name,
        card_number: printing.card_number,
        master_card_name: printing.card_name,
        live_card_name: identityAliasMatch.name,
        finish_key: printing.finish_key,
        live_set_code: identityAliasMatch.set_code,
        reason: 'Live DB already has the target finish on a same-number parent matched by governed display-name normalization.',
        sources: printing.sources ?? [],
        evidence_urls: printing.evidence_urls ?? [],
      });
      continue;
    }
    const externalMappingMatch = externalClaims(printing).flatMap((claim) => (
      externalMappingsByKey.get(`${normalizeText(claim.source)}:${normalizeText(claim.external_id)}`) ?? []
    )).find((mapping) => (
      finishesByParentId.get(mapping.card_print_id)?.has(normalizeText(resolved.finish_key))
    ));
    if (externalMappingMatch) {
      const parent = parentsById.get(externalMappingMatch.card_print_id);
      identityAliasSuppressed.push({
        suppression_type: 'external_mapping_number_alias',
        set_key: printing.set_key,
        set_name: printing.set_name,
        card_number: printing.card_number,
        master_card_name: printing.card_name,
        live_card_name: parent?.name ?? null,
        finish_key: printing.finish_key,
        live_set_code: parent?.set_code ?? null,
        live_card_number: parent?.number ?? parent?.number_plain ?? null,
        source: externalMappingMatch.source,
        external_id: externalMappingMatch.external_id,
        reason: 'Live DB already has the target finish on a parent linked by the exact external source card id; only card-number formatting differs.',
        sources: printing.sources ?? [],
        evidence_urls: printing.evidence_urls ?? [],
      });
      externalMappingSuppressed.push(printing);
      continue;
    }
    let lane = 'missing_parent_in_existing_set';
    let reason = 'The target set exists, but no exact parent card_print row matched set + number + name.';
    if (!activeFinishKeys.has(normalizeText(resolved.finish_key))) {
      lane = 'blocked_finish_taxonomy';
      reason = 'The Master Index finish key is not active in public.finish_keys.';
    } else if (existingParentAlias && exactParentMatches.length === 1) {
      lane = 'existing_parent_missing_child';
      reason = 'The exact parent exists and only the child card_printing finish row is missing.';
    } else if (existingParentAlias && exactParentMatches.length > 1) {
      lane = 'parent_identity_mismatch_same_number';
      reason = 'Multiple live parents match the exact set + number + name; identity must be adjudicated before child insertion.';
    } else if (!existingSetAlias) {
      lane = 'missing_set_or_set_alias';
      reason = 'No live card_print set_code matched the Master Index set key.';
    } else if (sameNumberParents.length > 0) {
      lane = 'parent_identity_mismatch_same_number';
      reason = 'A live parent exists with the same set + number, but the name does not match the Master Index.';
    }

    classified.push({
      lane,
      reason,
      set_key: printing.set_key,
      set_name: printing.set_name,
      card_number: printing.card_number,
      card_name: printing.card_name,
      finish_key: printing.finish_key,
      source_count: printing.source_count,
      sources: printing.sources ?? [],
      evidence_urls: printing.evidence_urls ?? [],
      set_aliases_checked: aliases,
      matched_parent_alias: existingParentAlias ?? null,
      exact_parent_match_count: exactParentMatches.length,
      matched_set_alias: existingSetAlias ?? null,
      same_number_live_names: sameNumberParents.slice(0, 5).map((row) => row.name),
    });
  }
  return { classified, identityAliasSuppressed, stampedIdentitySuppressed, stampedGovernanceClosed, externalMappingSuppressed };
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_lane[lane]?.slice(0, 8).map((row) => `${row.key}:${row.count}`).join(', ') ?? '',
  ]);
  const recommendedRows = report.recommended_next_packages.map((row) => [
    row.package_id,
    row.lane,
    row.candidate_rows,
    row.recommendation,
  ]);
  return `# English Master Index Remaining Missing Reconciliation Lanes V1

Read-only classification of remaining Master Index printings missing from Grookai after the latest controlled applies.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Host/Subset Suppression

- artifact: ${report.host_subset_duplicate_suppression.artifact}
- rows_loaded: ${report.host_subset_duplicate_suppression.rows_loaded}
- suppressed_master_printings: ${report.host_subset_duplicate_suppression.suppressed_master_printings}
- fingerprint: ${report.host_subset_duplicate_suppression.fingerprint ?? 'none'}

## Identity Alias Suppression

- suppressed_master_printings: ${report.identity_alias_suppression.suppressed_master_printings}
- by_type: ${JSON.stringify(report.identity_alias_suppression.by_type)}

## Summary

${markdownTable(['lane', 'rows', 'top_sets'], laneRows)}

## Recommended Next Packages

${markdownTable(['package_id', 'lane', 'candidate_rows', 'recommendation'], recommendedRows)}

## Principles

- Missing-from-Grookai is not insertion authority by itself.
- Existing-parent child inserts are safest, but this lane is currently reported separately from parent creation.
- Parent creation requires a set-scoped guarded package with collision checks and rollback proof.
- Name/number mismatches require identity adjudication before writes.
- Finish taxonomy blockers require finish strategy approval before writes.
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
const suppressionKeys = new Set((hostSubsetSuppression?.rows ?? []).map((row) => row.suppression_key));
const stampedReadinessRows = (stampedIdentityReadiness?.rows ?? [])
  .filter((row) => row.proposed_variant_key)
  .map((row) => [stampedFactKey(row), row]);
const stampedAdjudicationRows = (stampedGenericAdjudication?.rows ?? [])
  .filter((row) => row.adjudication_status === 'ready_for_guarded_reverse_stamped_identity_route')
  .map((row) => [stampedFactKey(row), row]);
const stampedBattleAcademyRows = (stampedBattleAcademyAdjudication?.rows ?? [])
  .filter((row) => row.adjudication_status === 'ready_for_guarded_normal_stamped_identity_route')
  .map((row) => [stampedFactKey(row), row]);
const stampedSameFinishAmbiguousRows = (stampedSameFinishAmbiguousAdjudication?.rows ?? [])
  .filter((row) => row.adjudication_status === 'ready_for_guarded_battle_academy_deck_mark_display_metadata_route')
  .map((row) => [stampedFactKey(row), {
    ...row,
    target_variant_key: row.proposed_variant_key,
    target_stamp_label: row.stamp_label,
  }]);
const stampedExistingCollisionRows = (stampedExistingCollisionClosure?.rows ?? [])
  .filter((row) => String(row.status ?? '').startsWith('already_satisfied_'))
  .map((row) => [stampedFactKey(row), row]);
const stampedIdentityByFactKey = new Map([
  ...stampedReadinessRows,
  ...stampedAdjudicationRows,
  ...stampedBattleAcademyRows,
  ...stampedSameFinishAmbiguousRows,
  ...stampedExistingCollisionRows,
]);
const stampedGovernanceClosureRows = [
  ...(stampedNoWriteGovernanceClosure?.closed_rows ?? []).map((row) => ({ ...row, source_artifact: STAMPED_NO_WRITE_GOVERNANCE_CLOSURE_JSON })),
  ...(stampedBaseParentResolutionClosure?.rows ?? []).map((row) => ({ ...row, source_artifact: STAMPED_BASE_PARENT_RESOLUTION_CLOSURE_JSON })),
  ...(stampedPrizePackFinishMappingClosure?.rows ?? []).map((row) => ({ ...row, source_artifact: STAMPED_PRIZE_PACK_FINISH_MAPPING_CLOSURE_JSON })),
  ...(stampedSourceAcquisitionClosure?.rows ?? []).map((row) => ({ ...row, source_artifact: STAMPED_SOURCE_ACQUISITION_CLOSURE_JSON })),
  ...(stampedConflictManualClosure?.rows ?? []).map((row) => ({ ...row, source_artifact: STAMPED_CONFLICT_MANUAL_CLOSURE_JSON })),
];
const stampedGovernanceClosureByFactKey = new Map();
for (const row of stampedGovernanceClosureRows) {
  const key = stampedFactKey(row);
  if (!stampedGovernanceClosureByFactKey.has(key)) stampedGovernanceClosureByFactKey.set(key, []);
  stampedGovernanceClosureByFactKey.get(key).push(row);
}
const live = await loadLiveCatalog();
const classification = live.available
  ? classifyMissing({
      masterPrintings: master.printings ?? [],
      masterSets: masterSets.sets ?? [],
      live,
      suppressionKeys,
      stampedIdentityByFactKey,
      stampedGovernanceClosureByFactKey,
    })
  : { classified: [], identityAliasSuppressed: [], stampedIdentitySuppressed: [], stampedGovernanceClosed: [] };
const classified = classification.classified;
const identityAliasSuppressed = classification.identityAliasSuppressed;
const stampedIdentitySuppressed = classification.stampedIdentitySuppressed;
const stampedGovernanceClosed = classification.stampedGovernanceClosed ?? [];
const externalMappingSuppressed = classification.externalMappingSuppressed ?? [];
const byLane = countBy(classified, (row) => row.lane);
const topSetsByLane = {};
for (const lane of Object.keys(byLane)) {
  topSetsByLane[lane] = topEntries(countBy(classified.filter((row) => row.lane === lane), (row) => row.set_key), 20);
}

const recommendedNextPackages = [
  {
    package_id: 'PKG-08A',
    lane: 'missing_parent_in_existing_set',
    candidate_rows: byLane.missing_parent_in_existing_set ?? 0,
    recommendation: 'Build set-scoped parent+child insert readiness for existing sets only; no deletes, merges, or identity updates.',
  },
  {
    package_id: 'PKG-08B',
    lane: 'parent_identity_mismatch_same_number',
    candidate_rows: byLane.parent_identity_mismatch_same_number ?? 0,
    recommendation: 'Build read-only identity adjudication first; do not write until exact parent strategy is proven.',
  },
  {
    package_id: 'PKG-08C',
    lane: 'missing_set_or_set_alias',
    candidate_rows: byLane.missing_set_or_set_alias ?? 0,
    recommendation: 'Build missing-set insert readiness only for fully master-verified sets with zero collisions.',
  },
  {
    package_id: 'PKG-08D',
    lane: 'blocked_finish_taxonomy',
    candidate_rows: byLane.blocked_finish_taxonomy ?? 0,
    recommendation: 'Resolve finish taxonomy strategy before any write package.',
  },
  {
    package_id: 'PKG-08E',
    lane: 'existing_parent_missing_child',
    candidate_rows: byLane.existing_parent_missing_child ?? 0,
    recommendation: 'If nonzero, reuse child-only insert guarded package pattern.',
  },
];

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_remaining_missing_reconciliation_lanes_v1',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    card_print_rows: live.card_prints.length,
    card_printing_rows: live.card_printings.length,
    external_mapping_rows: live.external_mappings?.length ?? 0,
    active_finish_keys: live.active_finish_keys,
  },
  host_subset_duplicate_suppression: {
    artifact: HOST_SUBSET_SUPPRESSION_JSON,
    available: Boolean(hostSubsetSuppression),
    rows_loaded: hostSubsetSuppression?.rows?.length ?? 0,
    suppressed_master_printings: suppressionKeys.size,
    fingerprint: hostSubsetSuppression?.fingerprint ?? null,
    summary: hostSubsetSuppression?.summary ?? null,
  },
  identity_alias_suppression: {
    suppressed_master_printings: identityAliasSuppressed.length,
    by_type: countBy(identityAliasSuppressed, (row) => row.suppression_type),
    rows: identityAliasSuppressed,
  },
  external_mapping_suppression: {
    suppressed_master_printings: externalMappingSuppressed.length,
    by_source: countBy(identityAliasSuppressed.filter((row) => row.suppression_type === 'external_mapping_number_alias'), (row) => row.source ?? 'unknown'),
  },
  stamped_identity_suppression: {
    artifact: STAMPED_IDENTITY_READINESS_JSON,
    supplemental_adjudication_artifact: STAMPED_GENERIC_ADJUDICATION_JSON,
    supplemental_battle_academy_adjudication_artifact: STAMPED_BATTLE_ACADEMY_ADJUDICATION_JSON,
    supplemental_same_finish_ambiguous_adjudication_artifact: STAMPED_SAME_FINISH_AMBIGUOUS_ADJUDICATION_JSON,
    available: Boolean(stampedIdentityReadiness),
    supplemental_adjudication_available: Boolean(stampedGenericAdjudication),
    supplemental_battle_academy_adjudication_available: Boolean(stampedBattleAcademyAdjudication),
    supplemental_same_finish_ambiguous_adjudication_available: Boolean(stampedSameFinishAmbiguousAdjudication),
    supplemental_same_finish_ambiguous_adjudication_rows: stampedSameFinishAmbiguousRows.length,
    supplemental_existing_collision_closure_artifact: STAMPED_EXISTING_COLLISION_CLOSURE_JSON,
    supplemental_existing_collision_closure_available: Boolean(stampedExistingCollisionClosure),
    supplemental_existing_collision_closure_rows: stampedExistingCollisionRows.length,
    resolved_master_printings: stampedIdentitySuppressed.length,
    by_variant_key: countBy(stampedIdentitySuppressed, (row) => row.proposed_variant_key),
    by_target_finish_key: countBy(stampedIdentitySuppressed, (row) => row.target_finish_key ?? 'any_active_child_finish'),
    rows: stampedIdentitySuppressed,
  },
  stamped_governance_closure: {
    artifacts: {
      no_write_governance: STAMPED_NO_WRITE_GOVERNANCE_CLOSURE_JSON,
      base_parent_resolution: STAMPED_BASE_PARENT_RESOLUTION_CLOSURE_JSON,
      prize_pack_finish_mapping: STAMPED_PRIZE_PACK_FINISH_MAPPING_CLOSURE_JSON,
      source_acquisition: STAMPED_SOURCE_ACQUISITION_CLOSURE_JSON,
      conflict_manual: STAMPED_CONFLICT_MANUAL_CLOSURE_JSON,
    },
    available: Boolean(
      stampedNoWriteGovernanceClosure
      || stampedBaseParentResolutionClosure
      || stampedPrizePackFinishMappingClosure
      || stampedSourceAcquisitionClosure
      || stampedConflictManualClosure
    ),
    source_rows_loaded: stampedGovernanceClosureRows.length,
    source_fact_keys_loaded: stampedGovernanceClosureByFactKey.size,
    governed_non_write_master_printings: stampedGovernanceClosed.length,
    by_closure_status: countBy(stampedGovernanceClosed.flatMap((row) => row.closure_statuses.map((status) => ({ status }))), (row) => row.status),
    by_execution_bucket: countBy(stampedGovernanceClosed.flatMap((row) => row.execution_buckets.map((bucket) => ({ bucket }))), (row) => row.bucket),
    rows: stampedGovernanceClosed,
  },
  summary: {
    master_verified_printings: (master.printings ?? []).filter((row) => row.status === 'master_verified').length,
    reconciliation_master_verified_printings: (master.printings ?? []).filter((row) => (
      row.status === 'master_verified' && !suppressionKeys.has(masterPrintingKey(row))
    )).length,
    remaining_missing_rows: classified.length,
    governed_stamped_non_write_rows: stampedGovernanceClosed.length,
    by_lane: byLane,
    top_sets_by_lane: topSetsByLane,
    by_finish: countBy(classified, (row) => row.finish_key),
  },
  recommended_next_packages: recommendedNextPackages,
  rows: classified,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  summary: report.summary,
  recommended_next_packages: report.recommended_next_packages,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
