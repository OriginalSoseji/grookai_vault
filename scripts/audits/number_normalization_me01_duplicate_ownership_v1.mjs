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
const SOURCE_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_collision_investigation_matrix_20260517.json');
const MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_me01_duplicate_ownership_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'number_normalization_me01_duplicate_ownership_20260517.md');

const SET_CODE = 'me01';

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

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
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

async function fetchSetSummary(client) {
  const { rows: setRows } = await client.query(
    `
      select
        id::text as set_id,
        code,
        name,
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
        count(*) filter (where number is null or btrim(number) = '')::int as missing_number_rows,
        count(*) filter (where number_plain is null or btrim(number_plain) = '')::int as missing_number_plain_rows,
        count(distinct nullif(number, ''))::int as distinct_direct_numbers,
        count(distinct nullif(number_plain, ''))::int as distinct_number_plain_values
      from public.card_prints
      join public.sets s on s.id = card_prints.set_id
      where s.game = 'pokemon'
        and s.code = $1
    `,
    [SET_CODE],
  );

  const { rows: sourceRows } = await client.query(
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
    active_external_mapping_counts: sourceRows,
  };
}

async function fetchCardRows(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `
      select
        cp.id::text as card_print_id,
        cp.set_id::text as set_id,
        s.code as set_code,
        s.name as set_name,
        cp.name as card_name,
        cp.number,
        cp.number_plain,
        cp.external_ids,
        cp.variant_key,
        cp.variants,
        cp.print_identity_key,
        cp.gv_id,
        cp.updated_at::text as updated_at
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where cp.id = any($1::uuid[])
      order by cp.set_code, cp.number_plain nulls last, cp.name
    `,
    [ids],
  );
  return rows;
}

async function fetchExternalMappings(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `
      select
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

async function fetchIdentityRows(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `
      select
        id::text as card_print_identity_id,
        card_print_id::text as card_print_id,
        printed_number,
        is_active
      from public.card_print_identity
      where card_print_id = any($1::uuid[])
      order by card_print_id, is_active desc, id
    `,
    [ids],
  );
  return rows;
}

async function fetchCardPrintFkCounts(client, ids) {
  if (!ids.length) return [];
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
    const sql = `
      select
        ${quoteIdent(fk.column_name)}::text as card_print_id,
        count(*)::int as reference_rows
      from public.${quoteIdent(fk.table_name)}
      where ${quoteIdent(fk.column_name)} = any($1::uuid[])
      group by ${quoteIdent(fk.column_name)}
    `;
    const { rows } = await client.query(sql, [ids]);
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
        source: mapping.source,
        external_id: mapping.external_id,
        active: Boolean(mapping.active),
      });
    }
  }
  return {
    active_mapping_sources: [...new Set(mappings.filter((row) => row.active).map((row) => row.source))].sort(),
    all_sources: [...new Set(entries.map((row) => row.source))].sort(),
    entries,
    active_mapping_count: mappings.filter((row) => row.active).length,
    active_tcgdex_ids: [...new Set(entries.filter((row) => row.source === 'tcgdex').map((row) => row.external_id))].sort(),
  };
}

function sideProfile(card, mappings, identities, refs) {
  return {
    card_print_id: card?.card_print_id ?? null,
    card_name: card?.card_name ?? null,
    number: card?.number ?? null,
    number_plain: card?.number_plain ?? null,
    normalized_name: normalizeName(card?.card_name),
    normalized_number: normalizeNumber(card?.number ?? card?.number_plain),
    variant_key: card?.variant_key ?? null,
    gv_id: card?.gv_id ?? null,
    print_identity_key: card?.print_identity_key ?? null,
    source_profile: sourceProfile(card, mappings),
    identity_rows: identities,
    active_identity_count: identities.filter((row) => row.is_active).length,
    fk_references: refs,
    total_fk_reference_rows: sumRefs(refs),
    user_or_market_reference_rows: sumRefs(refs, (row) => row.user_or_market_ref),
    user_or_market_reference_tables: [...new Set(refs.filter((row) => row.user_or_market_ref).map((row) => `${row.table_name}.${row.column_name}`))].sort(),
  };
}

function classifyPair(candidate, incumbent, proposedNumber) {
  const sameName = candidate.normalized_name === incumbent.normalized_name;
  const sameNumber = normalizeNumber(proposedNumber) === normalizeNumber(incumbent.number ?? incumbent.number_plain);
  const candidateTcgdexOnly =
    candidate.source_profile.active_mapping_sources.length === 1 &&
    candidate.source_profile.active_mapping_sources[0] === 'tcgdex';
  const incumbentMarketOwned =
    incumbent.source_profile.active_mapping_sources.includes('justtcg') &&
    incumbent.source_profile.active_mapping_sources.includes('tcgplayer');

  if (candidate.user_or_market_reference_rows > 0) return 'DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES';
  if (sameName && sameNumber && candidateTcgdexOnly && incumbentMarketOwned) return 'DUPLICATE_CANDIDATE_NO_USER_MARKET_REFS';
  if (sameName && sameNumber) return 'DUPLICATE_CANDIDATE_SOURCE_REVIEW';
  return 'AMBIGUOUS_PAIR_REVIEW_REQUIRED';
}

function buildPairs(sourceItems, cardById, mappingsById, identitiesById, refsById) {
  return sourceItems.map((item) => {
    const collision = item.collisions[0];
    const candidateCard = cardById.get(item.card_print_id);
    const incumbentCard = cardById.get(collision.existing_card_print_id);
    const candidate = sideProfile(
      candidateCard,
      mappingsById.get(item.card_print_id) ?? [],
      identitiesById.get(item.card_print_id) ?? [],
      refsById.get(item.card_print_id) ?? [],
    );
    const incumbent = sideProfile(
      incumbentCard,
      mappingsById.get(collision.existing_card_print_id) ?? [],
      identitiesById.get(collision.existing_card_print_id) ?? [],
      refsById.get(collision.existing_card_print_id) ?? [],
    );
    const ownershipClass = classifyPair(candidate, incumbent, item.proposed_number);
    const recommendedNextAction =
      ownershipClass === 'DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES'
        ? 'Hard stop for automated cleanup. Preserve candidate row and design a user/market-reference-safe ownership plan before any future merge, deactivate, mapping transfer, or number update.'
        : 'Keep blocked from number normalization. Future work may design a duplicate-ownership resolution plan that preserves TCGdex mapping evidence and incumbent market/source ownership.';

    return {
      proposed_number: item.proposed_number,
      card_name: item.card_name,
      ownership_class: ownershipClass,
      future_number_normalization_allowed: false,
      future_delete_or_merge_allowed: false,
      recommended_next_action: recommendedNextAction,
      candidate,
      incumbent,
      same_normalized_name: candidate.normalized_name === incumbent.normalized_name,
      same_normalized_number: normalizeNumber(item.proposed_number) === incumbent.normalized_number,
    };
  });
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

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# ME01 Duplicate Ownership Pack - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write ownership evidence. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Investigate the `me01` Mega Evolution duplicate ownership lane from the number-normalization collision pack. All 83 `me01` collision rows looked like likely duplicate import rows; this pack proves the candidate side, incumbent side, source ownership, and user/market-reference blast radius before any future cleanup design.');
  lines.push('');
  lines.push('## Source Inputs');
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
      ['Printed total', matrix.set_summary.set_row?.printed_total ?? ''],
      ['Total DB card_prints', matrix.set_summary.card_counts?.total_card_prints ?? 0],
      ['Missing direct-number rows', matrix.set_summary.card_counts?.missing_number_rows ?? 0],
      ['Distinct direct numbers', matrix.set_summary.card_counts?.distinct_direct_numbers ?? 0],
    ],
  ));
  lines.push('');
  lines.push('Active mapping sources in the full `me01` set:');
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
  lines.push('## Ownership Summary');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Duplicate pairs audited', matrix.summary.duplicate_pairs_audited],
      ['Candidate rows missing number', matrix.summary.candidate_missing_number_rows],
      ['Incumbent rows with direct number', matrix.summary.incumbent_numbered_rows],
      ['Candidate rows with active TCGdex mapping only', matrix.summary.candidate_tcgdex_only_rows],
      ['Incumbent rows with JustTCG and TCGPlayer mappings', matrix.summary.incumbent_justtcg_tcgplayer_rows],
      ['Pairs with same normalized name and number', matrix.summary.same_name_and_number_pairs],
      ['Candidate rows with user/market refs', matrix.summary.candidate_rows_with_user_or_market_refs],
      ['Candidate user/market reference rows', matrix.summary.candidate_user_or_market_reference_rows],
      ['Recommended immediate writes', 0],
    ],
  ));
  lines.push('');
  lines.push('## Ownership Classes');
  lines.push('');
  lines.push(renderTable(
    ['Class', 'Count', 'Meaning'],
    Object.entries(matrix.summary.ownership_class_counts).map(([klass, count]) => [
      klass,
      count,
      klass === 'DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES'
        ? 'Duplicate-looking candidate row has user/market references and must become a hard-stop subcase.'
        : 'Duplicate-looking candidate row has no user/market refs; still no cleanup without a future ownership plan.',
    ]),
  ));
  lines.push('');
  lines.push('## User/Market Reference Hard Stops');
  lines.push('');
  const hardStops = matrix.pairs.filter((pair) => pair.ownership_class === 'DUPLICATE_CANDIDATE_WITH_USER_MARKET_REFERENCES');
  if (!hardStops.length) {
    lines.push('_None._');
  } else {
    lines.push(renderTable(
      ['Candidate', 'Number', 'Candidate refs', 'Ref tables', 'Incumbent refs'],
      hardStops.map((pair) => [
        pair.card_name,
        pair.proposed_number,
        pair.candidate.user_or_market_reference_rows,
        pair.candidate.user_or_market_reference_tables.join(', '),
        pair.incumbent.user_or_market_reference_rows,
      ]),
    ));
  }
  lines.push('');
  lines.push('## Pair Matrix');
  lines.push('');
  lines.push(renderTable(
    ['Number', 'Card', 'Class', 'Candidate sources', 'Incumbent sources', 'Candidate refs', 'Incumbent refs'],
    matrix.pairs.map((pair) => [
      pair.proposed_number,
      pair.card_name,
      pair.ownership_class,
      pair.candidate.source_profile.active_mapping_sources.join(', '),
      pair.incumbent.source_profile.active_mapping_sources.join(', '),
      pair.candidate.user_or_market_reference_rows,
      pair.incumbent.user_or_market_reference_rows,
    ]),
  ));
  lines.push('');
  lines.push('## Conclusions');
  lines.push('');
  lines.push('- Do not number-normalize the 83 `me01` candidate rows. They collide one-for-one with incumbent numbered rows.');
  lines.push('- The candidate side is the TCGdex-only side; the incumbent side is the numbered JustTCG/TCGPlayer side.');
  lines.push('- The evidence supports treating most `me01` rows as duplicate import candidates, not missing-number rows.');
  lines.push('- Mega Camerupt ex and Mega Lucario ex are hard-stop subcases because the TCGdex candidate rows already have vault/pricing references.');
  lines.push('- Any future cleanup must be a separate duplicate-ownership plan with explicit preservation of user references, identities, traits, printings, mappings, and rollback checks. It must not be bundled into number normalization.');
  lines.push('');
  lines.push('## Next No-Write Step');
  lines.push('');
  lines.push('Draft a future duplicate-ownership write-plan shape only after deciding whether TCGdex mappings should be transferred to incumbent rows, whether candidate rows should remain as aliases/quarantine, and how user/market references on the two hard-stop rows would be preserved. No execution is authorized.');
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No card movement.');
  lines.push('- No set changes.');
  lines.push('- No identity rewrites.');
  lines.push('- No mapping movement.');
  lines.push('- No missing-card backfill.');
  lines.push('- No variant changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const sourceRaw = await fs.readFile(SOURCE_MATRIX_PATH, 'utf8');
  const source = JSON.parse(sourceRaw);
  const sourceItems = source.items.filter((item) => item.set_code === SET_CODE);
  if (sourceItems.length !== 83) {
    throw new Error(`Expected 83 ${SET_CODE} duplicate candidates, found ${sourceItems.length}.`);
  }

  const candidateIds = sourceItems.map((item) => item.card_print_id);
  const incumbentIds = [...new Set(sourceItems.flatMap((item) => item.collisions.map((collision) => collision.existing_card_print_id)))].sort();
  const allIds = [...new Set([...candidateIds, ...incumbentIds])].sort();

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    application_name: 'number_normalization_me01_duplicate_ownership_v1:readonly',
    statement_timeout: 120000,
  });

  let matrix;
  await client.connect();
  try {
    await client.query('begin transaction read only');

    const [setSummary, cards, mappings, identities, fkCounts] = await Promise.all([
      fetchSetSummary(client),
      fetchCardRows(client, allIds),
      fetchExternalMappings(client, allIds),
      fetchIdentityRows(client, allIds),
      fetchCardPrintFkCounts(client, allIds),
    ]);

    const cardById = new Map(cards.map((row) => [row.card_print_id, row]));
    const mappingsById = groupBy(mappings, (row) => row.card_print_id);
    const identitiesById = groupBy(identities, (row) => row.card_print_id);
    const refsById = groupBy(fkCounts, (row) => row.card_print_id);
    const pairs = buildPairs(sourceItems, cardById, mappingsById, identitiesById, refsById);

    await client.query('rollback');

    const candidateRows = pairs.map((pair) => pair.candidate);
    const incumbentRows = pairs.map((pair) => pair.incumbent);
    const candidateTcgdexOnlyRows = candidateRows.filter((row) => {
      return row.source_profile.active_mapping_sources.length === 1 && row.source_profile.active_mapping_sources[0] === 'tcgdex';
    });
    const incumbentMarketRows = incumbentRows.filter((row) => {
      return row.source_profile.active_mapping_sources.includes('justtcg') && row.source_profile.active_mapping_sources.includes('tcgplayer');
    });

    matrix = {
      status: 'NO_WRITE_ME01_DUPLICATE_OWNERSHIP_PACK_ONLY',
      generated_at: new Date().toISOString(),
      generated_from: [
        'docs/plans/pokemon_db_remediation_v1/number_normalization_collision_investigation_20260517.md',
        'docs/plans/pokemon_db_remediation_v1/number_normalization_collision_investigation_matrix_20260517.json',
        'live_read_only_supabase_evidence_2026-05-17',
      ],
      scope: {
        set_code: SET_CODE,
        set_name: setSummary.set_row?.name ?? 'Mega Evolution',
        candidate_rows: candidateIds.length,
        incumbent_rows: incumbentIds.length,
      },
      set_summary: setSummary,
      summary: {
        duplicate_pairs_audited: pairs.length,
        candidate_missing_number_rows: candidateRows.filter((row) => !cleanText(row.number) && !cleanText(row.number_plain)).length,
        incumbent_numbered_rows: incumbentRows.filter((row) => cleanText(row.number) && cleanText(row.number_plain)).length,
        candidate_tcgdex_only_rows: candidateTcgdexOnlyRows.length,
        incumbent_justtcg_tcgplayer_rows: incumbentMarketRows.length,
        same_name_and_number_pairs: pairs.filter((pair) => pair.same_normalized_name && pair.same_normalized_number).length,
        candidate_rows_with_user_or_market_refs: candidateRows.filter((row) => row.user_or_market_reference_rows > 0).length,
        candidate_user_or_market_reference_rows: candidateRows.reduce((sum, row) => sum + Number(row.user_or_market_reference_rows ?? 0), 0),
        incumbent_rows_with_user_or_market_refs: incumbentRows.filter((row) => row.user_or_market_reference_rows > 0).length,
        incumbent_user_or_market_reference_rows: incumbentRows.reduce((sum, row) => sum + Number(row.user_or_market_reference_rows ?? 0), 0),
        ownership_class_counts: countBy(pairs, (pair) => pair.ownership_class),
        candidate_active_mapping_source_counts: countBy(candidateRows.flatMap((row) => row.source_profile.active_mapping_sources), (sourceName) => sourceName),
        incumbent_active_mapping_source_counts: countBy(incumbentRows.flatMap((row) => row.source_profile.active_mapping_sources), (sourceName) => sourceName),
        recommended_immediate_writes: 0,
      },
      fk_reference_table_counts: countBy(fkCounts, (row) => `${row.table_name}.${row.column_name}`),
      pairs,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, renderMarkdown(matrix), 'utf8');

  console.log(JSON.stringify(matrix.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
