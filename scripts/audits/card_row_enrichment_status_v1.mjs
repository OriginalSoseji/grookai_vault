import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_status_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_status_v1.md');
const PARENT_GAPS_JSON = path.join(OUTPUT_DIR, 'card_parent_enrichment_gap_index_v1.json');
const CHILD_GAPS_JSON = path.join(OUTPUT_DIR, 'card_child_printing_enrichment_gap_index_v1.json');

function dbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((Number(numerator) / Number(denominator)) * 100).toFixed(2));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts).slice(0, limit).map(([key, rows]) => ({ key, rows }));
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function hashObject(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function parentMissingGroups(row) {
  const missing = [];
  if (isBlank(row.name) || isBlank(row.set_id) || isBlank(row.set_code) || isBlank(row.number) || isBlank(row.number_plain)) {
    missing.push('core_identity');
  }
  if (isBlank(row.gv_id)) missing.push('gv_id');
  if (Number(row.active_identity_count ?? 0) === 0) missing.push('active_identity');
  if (Number(row.child_printing_count ?? 0) === 0) missing.push('child_printings');
  if (Number(row.active_external_mapping_count ?? 0) === 0) missing.push('external_mapping');
  if (isBlank(row.rarity) && isBlank(row.artist) && isBlank(row.regulation_mark) && isBlank(row.variants)) {
    missing.push('catalog_metadata');
  }
  if (isBlank(row.parent_display_image) && Number(row.child_image_count ?? 0) === 0) {
    missing.push('display_image');
  }
  if (Number(row.price_count ?? 0) === 0) missing.push('active_price');
  if (Number(row.trait_count ?? 0) === 0) missing.push('traits');
  if (Number(row.species_count ?? 0) === 0) missing.push('species_link');
  return missing;
}

function childMissingGroups(row) {
  const missing = [];
  if (isBlank(row.finish_key)) missing.push('finish_key');
  if (row.finish_key_known !== true) missing.push('finish_key_not_active');
  if (isBlank(row.printing_gv_id)) missing.push('printing_gv_id');
  if (isBlank(row.provenance_source) && isBlank(row.provenance_ref)) missing.push('provenance');
  if (isBlank(row.child_display_image) && isBlank(row.parent_display_image)) missing.push('display_image');
  if (!isBlank(row.child_display_image) && isBlank(row.image_source)) missing.push('image_source');
  if (!isBlank(row.child_display_image) && isBlank(row.image_status)) missing.push('image_status');
  if (row.is_provisional === true) missing.push('provisional_printing');
  return missing;
}

function rowSegment(row) {
  const domain = String(row.identity_domain_default ?? '').trim();
  if (domain.startsWith('pokemon_eng')) return 'english_physical';
  if (domain === 'tcg_pocket_excluded') return 'tcg_pocket_excluded';
  if (!domain) return 'unclassified_identity_domain';
  return domain;
}

function coverage(total, rows, field) {
  const present = rows.filter((row) => !isBlank(row[field])).length;
  return { present, missing: total - present, percent: pct(present, total) };
}

function booleanCoverage(total, rows, fn) {
  const present = rows.filter(fn).length;
  return { present, missing: total - present, percent: pct(present, total) };
}

async function main() {
  const connectionString = dbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString });
  await client.connect();
  await client.query('set default_transaction_read_only = on');

  const parentResult = await client.query(`
    with active_identity as (
      select card_print_id, count(*)::int as active_identity_count
      from public.card_print_identity
      where is_active = true
      group by card_print_id
    ),
    mappings as (
      select card_print_id,
             count(*) filter (where active = true)::int as active_external_mapping_count,
             array_agg(distinct source order by source) filter (where active = true) as active_external_sources
      from public.external_mappings
      group by card_print_id
    ),
    child as (
      select card_print_id,
             count(*)::int as child_printing_count,
             count(*) filter (where coalesce(image_path, image_url, image_alt_url) is not null)::int as child_image_count,
             array_agg(distinct finish_key order by finish_key) as child_finish_keys
      from public.card_printings
      group by card_print_id
    ),
    prices as (
      select card_print_id, count(*)::int as price_count
      from public.card_print_active_prices
      group by card_print_id
    ),
    traits as (
      select card_print_id, count(*)::int as trait_count
      from public.card_print_traits
      group by card_print_id
    ),
    species as (
      select card_print_id, count(*) filter (where active = true)::int as species_count
      from public.card_print_species
      group by card_print_id
    ),
    cameos as (
      select card_print_id, count(*) filter (where active = true)::int as cameo_count
      from public.card_print_cameos
      group by card_print_id
    )
    select
      cp.id,
      cp.name,
      cp.set_id,
      cp.set_code,
      s.name as set_name,
      s.identity_domain_default,
      s.identity_model as set_identity_model_from_sets,
      cp.set_identity_model,
      cp.number,
      cp.number_plain,
      cp.printed_identity_modifier,
      cp.variant_key,
      cp.gv_id,
      cp.rarity,
      cp.artist,
      cp.regulation_mark,
      cp.variants,
      cp.tcgplayer_id,
      cp.external_ids,
      cp.image_source,
      cp.image_status,
      cp.image_note,
      cp.image_hash,
      cp.image_res,
      cp.image_last_checked_at,
      cp.representative_image_url,
      coalesce(cp.representative_image_url, cp.image_path, cp.image_url, cp.image_alt_url) as parent_display_image,
      s.release_date,
      s.printed_total as set_printed_total,
      s.logo_url as set_logo_url,
      s.symbol_url as set_symbol_url,
      coalesce(ai.active_identity_count, 0) as active_identity_count,
      coalesce(m.active_external_mapping_count, 0) as active_external_mapping_count,
      coalesce(m.active_external_sources, array[]::text[]) as active_external_sources,
      coalesce(child.child_printing_count, 0) as child_printing_count,
      coalesce(child.child_image_count, 0) as child_image_count,
      coalesce(child.child_finish_keys, array[]::text[]) as child_finish_keys,
      coalesce(prices.price_count, 0) as price_count,
      coalesce(traits.trait_count, 0) as trait_count,
      coalesce(species.species_count, 0) as species_count,
      coalesce(cameos.cameo_count, 0) as cameo_count
    from public.card_prints cp
    left join public.sets s on s.id = cp.set_id
    left join active_identity ai on ai.card_print_id = cp.id
    left join mappings m on m.card_print_id = cp.id
    left join child on child.card_print_id = cp.id
    left join prices on prices.card_print_id = cp.id
    left join traits on traits.card_print_id = cp.id
    left join species on species.card_print_id = cp.id
    left join cameos on cameos.card_print_id = cp.id
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.name, cp.id
  `);

  const childResult = await client.query(`
    select
      cpr.id,
      cpr.card_print_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.gv_id as parent_gv_id,
      cpr.finish_key,
      (fk.key is not null and fk.is_active = true) as finish_key_known,
      cpr.is_provisional,
      cpr.provenance_source,
      cpr.provenance_ref,
      cpr.created_by,
      cpr.printing_gv_id,
      cpr.image_source,
      cpr.image_status,
      cpr.image_note,
      s.identity_domain_default,
      coalesce(cpr.image_path, cpr.image_url, cpr.image_alt_url) as child_display_image,
      coalesce(cp.representative_image_url, cp.image_path, cp.image_url, cp.image_alt_url) as parent_display_image
    from public.card_printings cpr
    join public.card_prints cp on cp.id = cpr.card_print_id
    left join public.sets s on s.id = cp.set_id
    left join public.finish_keys fk on fk.key = cpr.finish_key
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.name, cpr.finish_key, cpr.id
  `);

  await client.end();

  const parents = parentResult.rows;
  const children = childResult.rows;
  for (const row of parents) row.segment = rowSegment(row);
  for (const row of children) row.segment = rowSegment(row);
  const totalParents = parents.length;
  const totalChildren = children.length;

  const parentGaps = parents.map((row) => ({
    card_print_id: row.id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    number_plain: row.number_plain,
    name: row.name,
    gv_id: row.gv_id,
    identity_domain_default: row.identity_domain_default,
    segment: row.segment,
    child_printing_count: Number(row.child_printing_count ?? 0),
    active_external_sources: row.active_external_sources ?? [],
    missing_groups: parentMissingGroups(row),
  })).filter((row) => row.missing_groups.length > 0);

  const childGaps = children.map((row) => ({
    card_printing_id: row.id,
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    finish_key: row.finish_key,
    printing_gv_id: row.printing_gv_id,
    segment: row.segment,
    missing_groups: childMissingGroups(row),
  })).filter((row) => row.missing_groups.length > 0);

  const parentGapCounts = countBy(parentGaps.flatMap((row) => row.missing_groups.map((group) => ({ group }))), (row) => row.group);
  const childGapCounts = countBy(childGaps.flatMap((row) => row.missing_groups.map((group) => ({ group }))), (row) => row.group);
  const englishParents = parents.filter((row) => row.segment === 'english_physical');
  const englishChildren = children.filter((row) => row.segment === 'english_physical');
  const englishParentGaps = parentGaps.filter((row) => row.segment === 'english_physical');
  const englishChildGaps = childGaps.filter((row) => row.segment === 'english_physical');

  const summary = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    target_tables: ['card_prints', 'card_printings', 'card_print_identity', 'external_mappings', 'card_print_active_prices', 'card_print_traits', 'card_print_species', 'card_print_cameos'],
    parent_rows: totalParents,
    child_printing_rows: totalChildren,
    parent_rows_by_segment: countBy(parents, (row) => row.segment),
    child_printing_rows_by_segment: countBy(children, (row) => row.segment),
    english_physical_parent_rows: englishParents.length,
    english_physical_child_printing_rows: englishChildren.length,
    parent_coverage: {
      name: coverage(totalParents, parents, 'name'),
      set_id: coverage(totalParents, parents, 'set_id'),
      set_code: coverage(totalParents, parents, 'set_code'),
      number: coverage(totalParents, parents, 'number'),
      number_plain: coverage(totalParents, parents, 'number_plain'),
      gv_id: coverage(totalParents, parents, 'gv_id'),
      active_identity: booleanCoverage(totalParents, parents, (row) => Number(row.active_identity_count ?? 0) > 0),
      child_printings: booleanCoverage(totalParents, parents, (row) => Number(row.child_printing_count ?? 0) > 0),
      active_external_mapping: booleanCoverage(totalParents, parents, (row) => Number(row.active_external_mapping_count ?? 0) > 0),
      rarity: coverage(totalParents, parents, 'rarity'),
      artist: coverage(totalParents, parents, 'artist'),
      regulation_mark: coverage(totalParents, parents, 'regulation_mark'),
      parent_or_representative_image: coverage(totalParents, parents, 'parent_display_image'),
      any_child_image: booleanCoverage(totalParents, parents, (row) => Number(row.child_image_count ?? 0) > 0),
      active_price: booleanCoverage(totalParents, parents, (row) => Number(row.price_count ?? 0) > 0),
      traits: booleanCoverage(totalParents, parents, (row) => Number(row.trait_count ?? 0) > 0),
      species_link: booleanCoverage(totalParents, parents, (row) => Number(row.species_count ?? 0) > 0),
      cameos: booleanCoverage(totalParents, parents, (row) => Number(row.cameo_count ?? 0) > 0),
    },
    child_coverage: {
      finish_key: coverage(totalChildren, children, 'finish_key'),
      active_finish_key: booleanCoverage(totalChildren, children, (row) => row.finish_key_known === true),
      printing_gv_id: coverage(totalChildren, children, 'printing_gv_id'),
      provenance: booleanCoverage(totalChildren, children, (row) => !isBlank(row.provenance_source) || !isBlank(row.provenance_ref)),
      child_display_image: coverage(totalChildren, children, 'child_display_image'),
      child_or_parent_display_image: booleanCoverage(totalChildren, children, (row) => !isBlank(row.child_display_image) || !isBlank(row.parent_display_image)),
      image_source_when_child_image_present: booleanCoverage(
        children.filter((row) => !isBlank(row.child_display_image)).length,
        children.filter((row) => !isBlank(row.child_display_image)),
        (row) => !isBlank(row.image_source)
      ),
      image_status_when_child_image_present: booleanCoverage(
        children.filter((row) => !isBlank(row.child_display_image)).length,
        children.filter((row) => !isBlank(row.child_display_image)),
        (row) => !isBlank(row.image_status)
      ),
      non_provisional: booleanCoverage(totalChildren, children, (row) => row.is_provisional !== true),
    },
    parent_gap_counts: parentGapCounts,
    child_gap_counts: childGapCounts,
    english_physical_parent_gap_counts: countBy(englishParentGaps.flatMap((row) => row.missing_groups.map((group) => ({ group }))), (row) => row.group),
    english_physical_child_gap_counts: countBy(englishChildGaps.flatMap((row) => row.missing_groups.map((group) => ({ group }))), (row) => row.group),
    parent_gap_rows: parentGaps.length,
    child_gap_rows: childGaps.length,
    english_physical_parent_gap_rows: englishParentGaps.length,
    english_physical_child_gap_rows: englishChildGaps.length,
    parent_gaps_by_set: topEntries(countBy(parentGaps, (row) => row.set_code), 30),
    child_gaps_by_set: topEntries(countBy(childGaps, (row) => row.set_code), 30),
    english_physical_parent_gaps_by_set: topEntries(countBy(englishParentGaps, (row) => row.set_code), 30),
    english_physical_child_gaps_by_set: topEntries(countBy(englishChildGaps, (row) => row.set_code), 30),
    external_source_coverage: countBy(parents.flatMap((row) => (row.active_external_sources ?? []).map((source) => ({ source }))), (row) => row.source),
    child_finish_distribution: countBy(children, (row) => row.finish_key),
  };
  summary.fingerprint = hashObject({
    parent_rows: summary.parent_rows,
    child_printing_rows: summary.child_printing_rows,
    parent_coverage: summary.parent_coverage,
    child_coverage: summary.child_coverage,
    parent_gap_counts: summary.parent_gap_counts,
    child_gap_counts: summary.child_gap_counts,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(PARENT_GAPS_JSON, `${JSON.stringify(parentGaps, null, 2)}\n`);
  await fs.writeFile(CHILD_GAPS_JSON, `${JSON.stringify(childGaps, null, 2)}\n`);

  const coverageRows = Object.entries(summary.parent_coverage).map(([field, value]) => ({ field, ...value }));
  const childRows = Object.entries(summary.child_coverage).map(([field, value]) => ({ field, ...value }));

  const md = [
    '# Card Row Enrichment Status V1',
    '',
    `Generated: ${summary.generated_at}`,
    '',
    'Read-only audit. No database writes, migrations, cleanup, quarantine, or image promotion were performed.',
    '',
    '## Summary',
    '',
    `- parent card_print rows: ${summary.parent_rows}`,
    `- child card_printings rows: ${summary.child_printing_rows}`,
    `- English physical parent rows: ${summary.english_physical_parent_rows}`,
    `- English physical child printing rows: ${summary.english_physical_child_printing_rows}`,
    `- parent rows with one or more enrichment gaps: ${summary.parent_gap_rows}`,
    `- child printing rows with one or more enrichment gaps: ${summary.child_gap_rows}`,
    `- English physical parent rows with one or more enrichment gaps: ${summary.english_physical_parent_gap_rows}`,
    `- English physical child printing rows with one or more enrichment gaps: ${summary.english_physical_child_gap_rows}`,
    `- fingerprint: ${summary.fingerprint}`,
    '',
    '## Row Segments',
    '',
    markdownTable(Object.entries(summary.parent_rows_by_segment).map(([segment, rows]) => ({ segment, parent_rows: rows, child_rows: summary.child_printing_rows_by_segment[segment] ?? 0 })), [
      { label: 'segment', value: (row) => row.segment },
      { label: 'parent rows', value: (row) => row.parent_rows },
      { label: 'child printing rows', value: (row) => row.child_rows },
    ]),
    '',
    '## Parent Row Coverage',
    '',
    markdownTable(coverageRows, [
      { label: 'field/group', value: (row) => row.field },
      { label: 'present', value: (row) => row.present },
      { label: 'missing', value: (row) => row.missing },
      { label: 'coverage', value: (row) => `${row.percent}%` },
    ]),
    '',
    '## Child Printing Coverage',
    '',
    markdownTable(childRows, [
      { label: 'field/group', value: (row) => row.field },
      { label: 'present', value: (row) => row.present },
      { label: 'missing', value: (row) => row.missing },
      { label: 'coverage', value: (row) => `${row.percent}%` },
    ]),
    '',
    '## Parent Gap Counts',
    '',
    markdownTable(Object.entries(summary.parent_gap_counts).map(([gap, rows]) => ({ gap, rows })), [
      { label: 'gap', value: (row) => row.gap },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Child Gap Counts',
    '',
    markdownTable(Object.entries(summary.child_gap_counts).map(([gap, rows]) => ({ gap, rows })), [
      { label: 'gap', value: (row) => row.gap },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## English Physical Parent Gap Counts',
    '',
    markdownTable(Object.entries(summary.english_physical_parent_gap_counts).map(([gap, rows]) => ({ gap, rows })), [
      { label: 'gap', value: (row) => row.gap },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## English Physical Child Gap Counts',
    '',
    markdownTable(Object.entries(summary.english_physical_child_gap_counts).map(([gap, rows]) => ({ gap, rows })), [
      { label: 'gap', value: (row) => row.gap },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Top Parent Gap Sets',
    '',
    markdownTable(summary.parent_gaps_by_set, [
      { label: 'set_code', value: (row) => row.key },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Top Child Gap Sets',
    '',
    markdownTable(summary.child_gaps_by_set, [
      { label: 'set_code', value: (row) => row.key },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Top English Physical Parent Gap Sets',
    '',
    markdownTable(summary.english_physical_parent_gaps_by_set, [
      { label: 'set_code', value: (row) => row.key },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Top English Physical Child Gap Sets',
    '',
    markdownTable(summary.english_physical_child_gaps_by_set, [
      { label: 'set_code', value: (row) => row.key },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Notes',
    '',
    '- `active_price`, `traits`, `species_link`, and `cameos` are enrichment surfaces, not necessarily canon blockers.',
    '- `display_image` gaps mean no parent/representative image and no child image were found for the row in the audited fields.',
    '- `child_or_parent_display_image` is the app-facing practical coverage measure for whether a child printing can display something honest.',
    '- Row-level gap indexes were written to JSON for follow-up planning.',
    '',
    '## Outputs',
    '',
    `- Summary JSON: \`${SUMMARY_JSON}\``,
    `- Parent gap index: \`${PARENT_GAPS_JSON}\``,
    `- Child printing gap index: \`${CHILD_GAPS_JSON}\``,
    '',
  ].join('\n');

  await fs.writeFile(SUMMARY_MD, md);

  console.log(JSON.stringify({
    summary_md: SUMMARY_MD,
    summary_json: SUMMARY_JSON,
    parent_gaps_json: PARENT_GAPS_JSON,
    child_gaps_json: CHILD_GAPS_JSON,
    parent_rows: summary.parent_rows,
    child_printing_rows: summary.child_printing_rows,
    parent_gap_rows: summary.parent_gap_rows,
    child_gap_rows: summary.child_gap_rows,
    fingerprint: summary.fingerprint,
  }, null, 2));
}

await main();
