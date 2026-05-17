import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const SOURCE_MATRIX_PATH = path.join(OUT_DIR, 'gv_id_mep_collision_manual_matrix_20260517.json');
const MATRIX_PATH = path.join(OUT_DIR, 'gv_id_mep_duplicate_resolution_design_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'gv_id_mep_duplicate_resolution_design_20260517.md');

const SET_CODE = 'mep';
const EXPECTED_PAIR_COUNT = 10;

const USER_OR_MARKET_REF_TABLES = new Set([
  'vault_items',
  'vault_item_instances',
  'shared_cards',
  'slab_certs',
  'pricing_watch',
  'justtcg_variants',
  'justtcg_variant_prices_latest',
  'justtcg_variant_price_snapshots',
]);

const PUBLIC_VIEW_NAMES = [
  'card_prints_public',
  'v_card_prints_web_v1',
  'v_card_search',
];

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeName(value = '') {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpokémon\b/g, 'pokemon')
    .replace(/[’'`]/g, '')
    .replace(/[—–-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  let text = cleanText(value);
  if (!text) return null;
  text = text.replace(/^#/, '').replace(/\s+/g, '');
  text = text.split('/')[0].toUpperCase();
  if (/^\d+$/.test(text)) return String(Number(text));
  const prefixed = text.match(/^([A-Z]+)0*([0-9]+)([A-Z]*)$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}${prefixed[3]}`;
  return text || null;
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
}

function sumRefs(refs, predicate = () => true) {
  return refs.filter(predicate).reduce((sum, row) => sum + Number(row.reference_rows ?? 0), 0);
}

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

async function loadSetSummary(client) {
  const { rows: setRows } = await client.query(
    `
      select
        id::text as set_id,
        code,
        name,
        printed_set_abbrev,
        printed_total,
        release_date::text as release_date,
        source
      from public.sets
      where game = 'pokemon'
        and code = $1
    `,
    [SET_CODE],
  );

  const { rows: cardRows } = await client.query(
    `
      select
        count(*)::int as total_card_prints,
        count(*) filter (where gv_id is not null and btrim(gv_id) <> '')::int as rows_with_gv_id,
        count(*) filter (where gv_id is null or btrim(gv_id) = '')::int as rows_missing_gv_id,
        count(*) filter (where number is null or btrim(number) = '')::int as rows_missing_number,
        count(distinct nullif(number, ''))::int as distinct_direct_numbers,
        count(distinct nullif(number_plain, ''))::int as distinct_number_plain_values
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.game = 'pokemon'
        and s.code = $1
    `,
    [SET_CODE],
  );

  const { rows: mappingRows } = await client.query(
    `
      select
        em.source,
        count(*)::int as mapping_rows,
        count(distinct em.card_print_id)::int as mapped_card_prints
      from public.external_mappings em
      join public.card_prints cp on cp.id = em.card_print_id
      join public.sets s on s.id = cp.set_id
      where s.game = 'pokemon'
        and s.code = $1
        and em.active = true
      group by em.source
      order by em.source
    `,
    [SET_CODE],
  );

  return {
    set_row: setRows[0] ?? null,
    card_counts: cardRows[0] ?? null,
    active_external_mapping_counts: mappingRows,
  };
}

async function loadCardRows(client, ids) {
  const { rows } = await client.query(
    `
      select
        cp.id::text as card_print_id,
        cp.set_id::text as set_id,
        s.code as set_code,
        s.name as set_name,
        s.printed_set_abbrev,
        cp.name as card_name,
        cp.number,
        cp.number_plain,
        cp.gv_id,
        cp.external_ids,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.identity_domain,
        cp.image_url,
        cp.representative_image_url,
        cp.image_status,
        cp.print_identity_key,
        cp.updated_at::text as updated_at
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where cp.id = any($1::uuid[])
      order by s.code, cp.number_plain nulls last, cp.number nulls last, cp.name
    `,
    [ids],
  );
  return rows;
}

async function loadExternalMappings(client, ids) {
  const { rows } = await client.query(
    `
      select
        id::text as external_mapping_id,
        card_print_id::text as card_print_id,
        source,
        external_id,
        active
      from public.external_mappings
      where card_print_id = any($1::uuid[])
      order by card_print_id, source, external_id
    `,
    [ids],
  );
  return rows;
}

async function loadIdentityRows(client, ids) {
  const { rows } = await client.query(
    `
      select
        id::text as card_print_identity_id,
        card_print_id::text as card_print_id,
        identity_domain,
        set_code_identity,
        printed_number,
        identity_key_version,
        identity_key_hash,
        is_active
      from public.card_print_identity
      where card_print_id = any($1::uuid[])
      order by card_print_id, is_active desc, id
    `,
    [ids],
  );
  return rows;
}

async function loadCardPrintFkCounts(client, ids) {
  const { rows: fkColumns } = await client.query(`
    select tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'card_prints'
      and ccu.column_name = 'id'
      and tc.table_schema = 'public'
    order by tc.table_name, kcu.column_name
  `);

  const output = [];
  for (const fk of fkColumns) {
    const { rows } = await client.query(
      `
        select
          ${quoteIdent(fk.column_name)}::text as card_print_id,
          count(*)::int as reference_rows
        from public.${quoteIdent(fk.table_name)}
        where ${quoteIdent(fk.column_name)} = any($1::uuid[])
        group by ${quoteIdent(fk.column_name)}
      `,
      [ids],
    );
    for (const row of rows) {
      output.push({
        card_print_id: row.card_print_id,
        table_name: fk.table_name,
        column_name: fk.column_name,
        reference_rows: row.reference_rows,
        user_or_market_ref: USER_OR_MARKET_REF_TABLES.has(fk.table_name),
      });
    }
  }
  return output;
}

async function loadViewInventory(client) {
  const inventory = [];
  for (const viewName of PUBLIC_VIEW_NAMES) {
    const { rows: objectRows } = await client.query('select to_regclass($1) as regclass', [`public.${viewName}`]);
    const tableAvailable = Boolean(objectRows[0]?.regclass);
    if (!tableAvailable) {
      inventory.push({
        object_name: viewName,
        table_available: false,
        columns: [],
        match_basis: null,
      });
      continue;
    }

    const { rows: columnRows } = await client.query(
      `
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
        order by ordinal_position
      `,
      [viewName],
    );
    const columns = columnRows.map((row) => row.column_name);
    const matchBasis = columns.includes('id')
      ? 'id'
      : columns.includes('card_print_id')
        ? 'card_print_id'
        : columns.includes('gv_id')
          ? 'gv_id'
          : null;

    inventory.push({
      object_name: viewName,
      table_available: tableAvailable,
      columns,
      match_basis: matchBasis,
    });
  }
  return inventory;
}

async function loadViewMembership(client, viewInventory, cards) {
  const ids = cards.map((card) => card.card_print_id);
  const gvIds = cards.map((card) => card.gv_id).filter(Boolean);
  const membership = {};

  for (const view of viewInventory) {
    membership[view.object_name] = {
      table_available: view.table_available,
      match_basis: view.match_basis,
      matched_keys: [],
      matched_count: 0,
    };

    if (!view.table_available || !view.match_basis) continue;

    const values = view.match_basis === 'gv_id' ? gvIds : ids;
    if (!values.length) continue;

    const { rows } = await client.query(
      `
        select distinct ${quoteIdent(view.match_basis)}::text as key
        from public.${quoteIdent(view.object_name)}
        where ${quoteIdent(view.match_basis)}::text = any($1::text[])
      `,
      [values],
    );

    membership[view.object_name].matched_keys = rows.map((row) => row.key).sort();
    membership[view.object_name].matched_count = rows.length;
  }

  return membership;
}

function sourceProfile(card, mappings) {
  const entries = [];
  const externalIds = card?.external_ids ?? {};
  for (const [source, externalId] of Object.entries(externalIds)) {
    if (cleanText(externalId)) {
      entries.push({
        carrier: `external_ids.${source}`,
        source,
        external_id: externalId,
        active: true,
      });
    }
  }
  for (const mapping of mappings) {
    if (cleanText(mapping.external_id)) {
      entries.push({
        carrier: `external_mappings.${mapping.source}`,
        external_mapping_id: mapping.external_mapping_id,
        source: mapping.source,
        external_id: mapping.external_id,
        active: Boolean(mapping.active),
      });
    }
  }
  return {
    active_mapping_sources: [...new Set(mappings.filter((row) => row.active).map((row) => row.source))].sort(),
    all_sources: [...new Set(entries.map((row) => row.source))].sort(),
    active_mapping_count: mappings.filter((row) => row.active).length,
    active_tcgdex_ids: [...new Set(entries.filter((row) => row.source === 'tcgdex').map((row) => row.external_id))].sort(),
    entries,
  };
}

function sideProfile(card, mappings, identities, refs, publicViews) {
  const viewMembership = {};
  for (const [viewName, view] of Object.entries(publicViews)) {
    const key = view.match_basis === 'gv_id' ? card?.gv_id : card?.card_print_id;
    viewMembership[viewName] = {
      table_available: view.table_available,
      match_basis: view.match_basis,
      present: Boolean(key && view.matched_keys.includes(String(key))),
    };
  }

  const userOrMarketRows = sumRefs(refs, (row) => row.user_or_market_ref);
  return {
    card_print_id: card?.card_print_id ?? null,
    card_name: card?.card_name ?? null,
    number: card?.number ?? null,
    number_plain: card?.number_plain ?? null,
    normalized_name: normalizeName(card?.card_name),
    normalized_number: normalizeNumber(card?.number_plain ?? card?.number),
    gv_id: cleanText(card?.gv_id),
    variant_key: cleanText(card?.variant_key),
    printed_identity_modifier: cleanText(card?.printed_identity_modifier),
    identity_domain: cleanText(card?.identity_domain),
    print_identity_key: cleanText(card?.print_identity_key),
    image_url: cleanText(card?.image_url),
    representative_image_url: cleanText(card?.representative_image_url),
    image_status: cleanText(card?.image_status),
    source_profile: sourceProfile(card, mappings),
    identity_rows: identities,
    active_identity_count: identities.filter((row) => row.is_active).length,
    active_identity_printed_numbers: [...new Set(identities.filter((row) => row.is_active).map((row) => row.printed_number).filter(Boolean))].sort(),
    fk_references: refs,
    total_fk_reference_rows: sumRefs(refs),
    user_or_market_reference_rows: userOrMarketRows,
    user_or_market_reference_tables: [...new Set(refs.filter((row) => row.user_or_market_ref).map((row) => `${row.table_name}.${row.column_name}`))].sort(),
    public_view_membership: viewMembership,
  };
}

function classifyPair(duplicate, survivor) {
  const blockers = [];
  const gates = {
    same_normalized_name: duplicate.normalized_name === survivor.normalized_name,
    same_normalized_printed_number: duplicate.normalized_number === survivor.normalized_number,
    duplicate_has_no_gv_id: !duplicate.gv_id,
    survivor_has_padded_public_gv_id: /^GV-PK-MEP-\d{3}$/.test(survivor.gv_id ?? ''),
    duplicate_has_no_user_or_market_refs: duplicate.user_or_market_reference_rows === 0,
    survivor_has_public_route_identity: Boolean(survivor.gv_id),
  };

  if (!gates.same_normalized_name) blockers.push('NAME_MISMATCH');
  if (!gates.same_normalized_printed_number) blockers.push('NUMBER_MISMATCH');
  if (!gates.duplicate_has_no_gv_id) blockers.push('DUPLICATE_ALREADY_HAS_GV_ID');
  if (!gates.survivor_has_padded_public_gv_id) blockers.push('SURVIVOR_MISSING_PADDED_PUBLIC_GV_ID');
  if (!gates.duplicate_has_no_user_or_market_refs) blockers.push('DUPLICATE_HAS_USER_OR_MARKET_REFERENCES');
  if (!gates.survivor_has_public_route_identity) blockers.push('SURVIVOR_NOT_PUBLICLY_ADDRESSABLE');

  const duplicateTcgdexIds = duplicate.source_profile.active_tcgdex_ids;
  const survivorTcgdexIds = survivor.source_profile.active_tcgdex_ids;
  const mappingAction =
    duplicateTcgdexIds.length > 0 && survivorTcgdexIds.length === 0
      ? 'PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR'
      : duplicateTcgdexIds.length > 0 && survivorTcgdexIds.length > 0
        ? 'MANUAL_TCGDEX_MAPPING_CONFLICT_REVIEW'
        : 'NO_TCGDEX_MAPPING_ACTION_DISCOVERED';

  if (mappingAction === 'MANUAL_TCGDEX_MAPPING_CONFLICT_REVIEW') blockers.push('SURVIVOR_ALREADY_HAS_TCGDEX_MAPPING');

  return {
    gates,
    blockers,
    design_class: blockers.length
      ? 'MANUAL_HARD_STOP'
      : 'PUBLIC_OWNER_SURVIVOR_WITH_SOURCE_PRESERVATION',
    canonical_survivor_recommendation: 'existing_public_owner',
    duplicate_row_recommendation: 'preserve_as_non_public_duplicate_until_supported_alias_or_quarantine_state_exists',
    mapping_preservation_action: mappingAction,
    future_gv_id_write_allowed: false,
    future_delete_allowed: false,
  };
}

function buildPairs(sourceRows, cardsById, mappingsById, identitiesById, refsById, publicViews) {
  return sourceRows.map((sourceRow) => {
    const duplicateId = sourceRow.card_print_id;
    const survivorId = sourceRow.semantic_duplicate_public_owner?.card_print_id;
    const duplicate = sideProfile(
      cardsById.get(duplicateId),
      mappingsById.get(duplicateId) ?? [],
      identitiesById.get(duplicateId) ?? [],
      refsById.get(duplicateId) ?? [],
      publicViews,
    );
    const survivor = sideProfile(
      cardsById.get(survivorId),
      mappingsById.get(survivorId) ?? [],
      identitiesById.get(survivorId) ?? [],
      refsById.get(survivorId) ?? [],
      publicViews,
    );
    return {
      printed_identity_key: `${duplicate.normalized_name}|${duplicate.normalized_number}`,
      rejected_generated_gv_id: sourceRow.generated_but_rejected_gv_id,
      existing_public_gv_id: survivor.gv_id,
      duplicate,
      survivor,
      ...classifyPair(duplicate, survivor),
    };
  });
}

function summarizePairs(pairs, fkCounts) {
  const duplicateRows = pairs.map((pair) => pair.duplicate);
  const survivorRows = pairs.map((pair) => pair.survivor);
  return {
    duplicate_pairs_audited: pairs.length,
    existing_public_owner_survivor_candidates: pairs.filter((pair) => pair.canonical_survivor_recommendation === 'existing_public_owner').length,
    pairs_with_same_normalized_name_and_number: pairs.filter((pair) => pair.gates.same_normalized_name && pair.gates.same_normalized_printed_number).length,
    duplicate_rows_with_gv_id: duplicateRows.filter((row) => row.gv_id).length,
    duplicate_rows_with_user_or_market_refs: duplicateRows.filter((row) => row.user_or_market_reference_rows > 0).length,
    duplicate_user_or_market_reference_rows: duplicateRows.reduce((sum, row) => sum + Number(row.user_or_market_reference_rows ?? 0), 0),
    survivor_rows_with_gv_id: survivorRows.filter((row) => row.gv_id).length,
    survivor_rows_with_user_or_market_refs: survivorRows.filter((row) => row.user_or_market_reference_rows > 0).length,
    survivor_user_or_market_reference_rows: survivorRows.reduce((sum, row) => sum + Number(row.user_or_market_reference_rows ?? 0), 0),
    pairs_requiring_tcgdex_mapping_preservation: pairs.filter((pair) => pair.mapping_preservation_action === 'PRESERVE_BY_FUTURE_MAPPING_REASSIGNMENT_TO_SURVIVOR').length,
    manual_hard_stop_pairs: pairs.filter((pair) => pair.design_class === 'MANUAL_HARD_STOP').length,
    future_gv_id_writes_recommended: 0,
    future_deletes_allowed: 0,
    design_class_counts: countBy(pairs, (pair) => pair.design_class),
    mapping_action_counts: countBy(pairs, (pair) => pair.mapping_preservation_action),
    fk_reference_table_counts: countBy(fkCounts, (row) => `${row.table_name}.${row.column_name}`),
  };
}

function renderMarkdown(matrix) {
  const lines = [];
  const summary = matrix.summary;

  lines.push('# MEP Duplicate Resolution Design - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write duplicate-resolution design only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, generated GV-ID writes, card movement, set changes, identity rewrites, mapping movement, public route loosening, missing-card backfill, variant work, deploys, or production mutation.');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Define the future cleanup shape for the 10 `mep` rows blocked by duplicate public owners and padding-convention collisions. These rows are not GV-ID backfill candidates. They are duplicate public-identity candidates where existing padded public owners already hold `GV-PK-MEP-001` through `GV-PK-MEP-010`.');
  lines.push('');
  lines.push('## Source Evidence');
  lines.push('');
  for (const source of matrix.generated_from) lines.push(`- \`${source}\``);
  lines.push('- live read-only Supabase queries inside `begin transaction read only`');
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Value'],
    [
      ['Set code', `\`${matrix.set_summary.set_row?.code ?? SET_CODE}\``],
      ['Set name', matrix.set_summary.set_row?.name ?? ''],
      ['Printed abbreviation', matrix.set_summary.set_row?.printed_set_abbrev ?? ''],
      ['Total DB card_prints', matrix.set_summary.card_counts?.total_card_prints ?? 0],
      ['Rows with gv_id', matrix.set_summary.card_counts?.rows_with_gv_id ?? 0],
      ['Rows missing gv_id', matrix.set_summary.card_counts?.rows_missing_gv_id ?? 0],
      ['Distinct direct numbers', matrix.set_summary.card_counts?.distinct_direct_numbers ?? 0],
    ],
  ));
  lines.push('');
  lines.push('Active mapping sources in the full `mep` set:');
  lines.push('');
  lines.push(renderTable(
    ['Source', 'Mapping rows', 'Mapped card_prints'],
    matrix.set_summary.active_external_mapping_counts.map((row) => [
      row.source,
      row.mapping_rows,
      row.mapped_card_prints,
    ]),
  ));
  lines.push('');
  lines.push('## Design Summary');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Duplicate pairs audited', summary.duplicate_pairs_audited],
      ['Existing public-owner survivor candidates', summary.existing_public_owner_survivor_candidates],
      ['Pairs with same normalized name and number', summary.pairs_with_same_normalized_name_and_number],
      ['Duplicate rows with gv_id', summary.duplicate_rows_with_gv_id],
      ['Duplicate rows with user/market refs', summary.duplicate_rows_with_user_or_market_refs],
      ['Survivor rows with gv_id', summary.survivor_rows_with_gv_id],
      ['Survivor rows with user/market refs', summary.survivor_rows_with_user_or_market_refs],
      ['Pairs requiring TCGdex mapping preservation', summary.pairs_requiring_tcgdex_mapping_preservation],
      ['Manual hard-stop pairs', summary.manual_hard_stop_pairs],
      ['Future GV-ID writes recommended', summary.future_gv_id_writes_recommended],
      ['Future deletes allowed', summary.future_deletes_allowed],
    ],
  ));
  lines.push('');
  lines.push('## Canonical Survivor Selection Rules');
  lines.push('');
  lines.push('The future canonical survivor candidate for each pair is the existing public owner row when all gates continue to pass:');
  lines.push('');
  lines.push('- survivor owns padded stable public `gv_id` in the `GV-PK-MEP-00N` format;');
  lines.push('- duplicate row has no `gv_id`;');
  lines.push('- duplicate and survivor share normalized card name;');
  lines.push('- duplicate unpadded number and survivor padded number normalize to the same printed identity;');
  lines.push('- duplicate row has no user, vault, pricing, or market references;');
  lines.push('- survivor public route identity remains active;');
  lines.push('- no active source mapping would become active on two `card_prints` rows after preservation.');
  lines.push('');
  lines.push('The duplicate row should not become survivor merely because it owns TCGdex source evidence. Source evidence should be preserved onto the public survivor only after a separate prewrite gate proves the mapping move is safe.');
  lines.push('');
  lines.push('## Pair Matrix');
  lines.push('');
  lines.push(renderTable(
    ['Card', 'Duplicate #', 'Survivor #', 'Public survivor', 'Design class', 'Mapping action', 'Dup refs', 'Survivor refs'],
    matrix.pairs.map((pair) => [
      pair.duplicate.card_name,
      pair.duplicate.number,
      pair.survivor.number,
      pair.survivor.gv_id,
      pair.design_class,
      pair.mapping_preservation_action,
      pair.duplicate.user_or_market_reference_rows,
      pair.survivor.user_or_market_reference_rows,
    ]),
  ));
  lines.push('');
  lines.push('## Mapping Preservation');
  lines.push('');
  lines.push('The duplicate side carries the source evidence that made this lane visible. Future cleanup must preserve active TCGdex mappings and any `external_ids.tcgdex` evidence. The likely future action is to reassign the active TCGdex mapping from the duplicate row to the existing public survivor row, but that is not authorized here.');
  lines.push('');
  lines.push('Required future mapping gates:');
  lines.push('');
  lines.push('- verify every duplicate row still owns exactly the expected active TCGdex external id;');
  lines.push('- verify the public survivor does not already own a conflicting active TCGdex mapping;');
  lines.push('- verify `(source, external_id)` uniqueness remains one active owner after the planned move;');
  lines.push('- snapshot all external mappings and `external_ids` payloads for both sides;');
  lines.push('- preserve original duplicate row ids in the execution checkpoint.');
  lines.push('');
  lines.push('## Public/Search Surface Impact');
  lines.push('');
  lines.push('Live read-only evidence shows the 20 `mep` rows appear in app-facing search/web views by internal row identity, while only the padded survivor rows have stable public `gv_id` values. Future cleanup must keep `/card/[gv_id]` strict and must verify search prefers or resolves to the padded public-owner rows after source preservation.');
  lines.push('');
  lines.push(renderTable(
    ['Surface', 'Available', 'Match basis', 'Matched rows'],
    Object.entries(matrix.public_view_membership).map(([surface, view]) => [
      surface,
      view.table_available,
      view.match_basis ?? '',
      view.matched_count,
    ]),
  ));
  lines.push('');
  lines.push('This is not a reason to expose duplicate rows publicly. It is a future verification requirement: no stable `gv_id`, no public card route; search should not create a second public identity for the duplicate/source-shadow row.');
  lines.push('');
  lines.push('## Vault, Pricing, And Reference Preservation');
  lines.push('');
  lines.push('Current evidence shows the duplicate side has no user/market references. The survivor side may own public, vault, pricing, or derived references and must remain the public owner. A future write plan must treat survivor references as authoritative and must not move them away from the padded public owner.');
  lines.push('');
  lines.push('If any duplicate-side user, vault, pricing, or market reference appears in a fresh prewrite gate, that pair leaves the lightweight mapping-preservation lane and becomes a manual hard stop.');
  lines.push('');
  lines.push('## Future Write-Plan Shape');
  lines.push('');
  lines.push('A future executable plan, if separately approved, should be split into guarded phases:');
  lines.push('');
  lines.push('1. Snapshot duplicate and survivor rows, mappings, identity rows, public view membership, and all FK references.');
  lines.push('2. Reassign only approved active TCGdex source mappings from duplicate rows to survivor rows after uniqueness checks.');
  lines.push('3. Preserve duplicate rows as non-public duplicate/source-shadow rows until a supported alias/quarantine marker exists.');
  lines.push('4. Do not assign `GV-PK-MEP-1` through `GV-PK-MEP-10`.');
  lines.push('5. Do not delete card rows.');
  lines.push('');
  lines.push('## Rollback Strategy');
  lines.push('');
  lines.push('Any future transaction must be reversible without deletes. Rollback must restore:');
  lines.push('');
  lines.push('- TCGdex mapping ownership to the original duplicate row;');
  lines.push('- any active/inactive mapping flags changed by the future transaction;');
  lines.push('- duplicate and survivor `card_prints` fields if any approved non-public marker changes later;');
  lines.push('- FK references to their original card_print ids if a future manual referenced-row lane ever exists;');
  lines.push('- public route behavior for the padded survivor IDs.');
  lines.push('');
  lines.push('## Hard Stop Gates');
  lines.push('');
  lines.push('Stop before any future execution if:');
  lines.push('');
  lines.push('- pair count is not exactly 10;');
  lines.push('- any duplicate row has or gains a `gv_id`;');
  lines.push('- any survivor loses its padded `GV-PK-MEP-00N` public ID;');
  lines.push('- any normalized name or number pair no longer matches;');
  lines.push('- any duplicate row has user/vault/pricing/market references;');
  lines.push('- any survivor already owns a conflicting active TCGdex mapping;');
  lines.push('- any future plan includes delete statements;');
  lines.push('- any future plan loosens public web gates or exposes rows without stable `gv_id`;');
  lines.push('- rollback snapshots are missing.');
  lines.push('');
  lines.push('## Post-Write Audit Queries');
  lines.push('');
  lines.push('Future post-write checks must prove:');
  lines.push('');
  lines.push('- `GV-PK-MEP-001` through `GV-PK-MEP-010` still resolve to the same public survivor rows;');
  lines.push('- no unpadded `GV-PK-MEP-1` through `GV-PK-MEP-10` IDs exist;');
  lines.push('- active TCGdex mappings resolve to exactly one approved survivor row each;');
  lines.push('- duplicate rows remain non-public and without `gv_id`;');
  lines.push('- no card_print rows were deleted;');
  lines.push('- no set rows changed;');
  lines.push('- no missing-card backfill, variant work, or card movement occurred.');
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No generated GV-ID backfill.');
  lines.push('- No mapping movement.');
  lines.push('- No public route gate loosening.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = JSON.parse(await fs.readFile(SOURCE_MATRIX_PATH, 'utf8'));
  const sourceRows = source.rows ?? [];
  if (sourceRows.length !== EXPECTED_PAIR_COUNT) {
    throw new Error(`Expected ${EXPECTED_PAIR_COUNT} ${SET_CODE} collision rows, found ${sourceRows.length}.`);
  }

  const duplicateIds = sourceRows.map((row) => row.card_print_id);
  const survivorIds = sourceRows.map((row) => row.semantic_duplicate_public_owner?.card_print_id);
  if (survivorIds.some((id) => !id)) {
    throw new Error('Every MEP row must have a semantic duplicate public owner before design generation.');
  }
  const allIds = [...new Set([...duplicateIds, ...survivorIds])].sort();

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    application_name: 'gv_id_mep_duplicate_resolution_design_v1:readonly',
    statement_timeout: 120000,
  });

  let matrix;
  await client.connect();
  try {
    await client.query('begin transaction read only');

    const setSummary = await loadSetSummary(client);
    const cards = await loadCardRows(client, allIds);
    const mappings = await loadExternalMappings(client, allIds);
    const identities = await loadIdentityRows(client, allIds);
    const fkCounts = await loadCardPrintFkCounts(client, allIds);
    const viewInventory = await loadViewInventory(client);
    const publicViewMembership = await loadViewMembership(client, viewInventory, cards);

    await client.query('rollback');

    const cardsById = new Map(cards.map((row) => [row.card_print_id, row]));
    const mappingsById = groupBy(mappings, (row) => row.card_print_id);
    const identitiesById = groupBy(identities, (row) => row.card_print_id);
    const refsById = groupBy(fkCounts, (row) => row.card_print_id);
    const pairs = buildPairs(sourceRows, cardsById, mappingsById, identitiesById, refsById, publicViewMembership);

    matrix = {
      status: 'NO_WRITE_MEP_DUPLICATE_RESOLUTION_DESIGN_ONLY',
      generated_at: new Date().toISOString(),
      generated_from: [
        'docs/plans/pokemon_db_remediation_v1/gv_id_generation_backfill_evidence_20260517.json',
        'docs/plans/pokemon_db_remediation_v1/gv_id_mep_collision_manual_pack_20260517.md',
        'docs/plans/pokemon_db_remediation_v1/gv_id_mep_collision_manual_matrix_20260517.json',
        'live_read_only_supabase_evidence_2026-05-17',
      ],
      scope: {
        set_code: SET_CODE,
        set_name: source.scope?.set_name ?? setSummary.set_row?.name ?? 'MEP Black Star Promos',
        duplicate_rows: duplicateIds.length,
        survivor_rows: new Set(survivorIds).size,
        no_write: true,
      },
      set_summary: setSummary,
      public_view_inventory: viewInventory,
      public_view_membership: publicViewMembership,
      summary: summarizePairs(pairs, fkCounts),
      pairs,
      future_write_boundary: {
        eligible_for_immediate_execution: false,
        recommended_immediate_writes: 0,
        allowed_future_operation_if_separately_authorized: 'source mapping preservation only after fresh prewrite gate',
        explicitly_out_of_scope: [
          'card_prints.gv_id writes',
          'card_print deletes',
          'set changes',
          'number changes',
          'public route gate loosening',
          'missing-card backfill',
          'variant changes',
          'image work',
        ],
      },
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  await fs.writeFile(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`);
  await fs.writeFile(REPORT_PATH, renderMarkdown(matrix));

  console.log(JSON.stringify({
    status: matrix.status,
    duplicate_pairs_audited: matrix.summary.duplicate_pairs_audited,
    public_owner_survivor_candidates: matrix.summary.existing_public_owner_survivor_candidates,
    manual_hard_stop_pairs: matrix.summary.manual_hard_stop_pairs,
    pairs_requiring_tcgdex_mapping_preservation: matrix.summary.pairs_requiring_tcgdex_mapping_preservation,
    recommended_immediate_writes: matrix.summary.future_gv_id_writes_recommended,
  }, null, 2));
}

await main();
