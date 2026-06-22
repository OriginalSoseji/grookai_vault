import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const QUEUE_PATH = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json',
);
const OUT_DIR = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/second_source_needed_finish_evidence_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'second_source_needed_finish_evidence_v1.json');
const OUT_MD = path.join(OUT_DIR, 'second_source_needed_finish_evidence_v1.md');
const FIXTURE_DIR = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_second_source_needed_finish_evidence_v1',
);

const TARGETS = [
  {
    set_key: 'bw3',
    set_name: 'Noble Victories',
    card_number: '80',
    card_name: 'Escavalier',
    variant_key: 'national_championships_staff_stamp',
    stamp_label: 'National Championships Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_escavalier_staff_national_reverse_80',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/escavalier-80-101-reverse-holo-staff-national-championships-noble-victories/bw3-80-3-80/',
        required_terms: ['Escavalier', '80/101', 'Reverse Holo', 'Staff National Championships'],
      },
      {
        source_key: 'thewasteland_escavalier_crosshatch_national_80',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.thewastelandgaming.com/catalog/pokmon_singles-organized_play_promos/escavalier__80101__promotional__crosshatch_holo_national_championships_2011/512013',
        required_terms: ['Escavalier', '80/101', 'Crosshatch Holo', 'National Championships'],
        review_only_reason: 'Uses crosshatch/holo wording; useful corroboration but not emitted as active reverse finish fixture.',
      },
    ],
  },
  {
    set_key: 'bw5',
    set_name: 'Dark Explorers',
    card_number: '25',
    card_name: 'Vaporeon',
    variant_key: 'states_championships_staff_stamp',
    stamp_label: 'States Championships Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_vaporeon_staff_states_reverse_25',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/vaporeon-25-108-reverse-holo-staff-states-championships-dark-explorers/bw5-25-3-84/',
        required_terms: ['Vaporeon', '25/108', 'Reverse Holo', 'Staff States Championships'],
      },
    ],
  },
  {
    set_key: 'bw5',
    set_name: 'Dark Explorers',
    card_number: '37',
    card_name: 'Jolteon',
    variant_key: 'regional_championships_staff_stamp',
    stamp_label: 'Regional Championships Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_jolteon_staff_regional_reverse_37',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/jolteon-37-108-reverse-holo-staff-regional-championships-dark-explorers/bw5-37-3-83/',
        required_terms: ['Jolteon', '37/108', 'Reverse Holo', 'Staff Regional Championships'],
      },
      {
        source_key: 'pricecharting_jolteon_staff_regional_37',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-dark-explorers/jolteon-staff-regional-championship-37',
        required_terms: ['Jolteon', 'Staff Regional Championship', '#37'],
        review_only_reason: 'Exact identity but page title does not independently state Reverse Holo in stable details.',
      },
    ],
  },
  {
    set_key: 'bw5',
    set_name: 'Dark Explorers',
    card_number: '84',
    card_name: 'Eevee',
    variant_key: 'city_championships_staff_stamp',
    stamp_label: 'City Championships Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_eevee_staff_city_reverse_84',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/eevee-84-108-reverse-holo-staff-city-championships-dark-explorers/bw5-84-3-75/',
        required_terms: ['Eevee', '84/108', 'Reverse Holo', 'Staff City Championships'],
      },
    ],
  },
  {
    set_key: 'dp1',
    set_name: 'Diamond & Pearl',
    card_number: '52',
    card_name: 'Luxio',
    variant_key: 'staff_prerelease_stamp',
    stamp_label: 'Staff Prerelease Stamp',
    finish_key: 'normal',
    sources: [
      {
        source_key: 'pokecardvalues_luxio_staff_prerelease_normal_52',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/luxio-52-130-non-holo-staff-prerelease-diamond-pearl/dp1-52-2-82/',
        required_terms: ['Luxio', '52/130', 'Non-Holo', 'Staff Prerelease'],
      },
    ],
  },
  {
    set_key: 'dp1',
    set_name: 'Diamond & Pearl',
    card_number: '52',
    card_name: 'Luxio',
    variant_key: 'states_championships_staff_stamp',
    stamp_label: 'States Championships Staff Stamp',
    finish_key: 'normal',
    sources: [
      {
        source_key: 'pokecardvalues_luxio_staff_states_normal_52',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/luxio-52-130-non-holo-staff-states-championships-diamond-pearl/dp1-52-2-84/',
        required_terms: ['Luxio', '52/130', 'Non-Holo', 'Staff States Championships'],
      },
    ],
  },
  {
    set_key: 'me02',
    set_name: 'Phantasmal Flames',
    card_number: '26',
    card_name: 'Suicune',
    variant_key: 'eb_games_stamp',
    stamp_label: 'EB Games Stamp',
    finish_key: 'holo',
    sources: [
      {
        source_key: 'hobbyscan_suicune_eb_games_holo_26',
        source_kind: 'collector_reference',
        source_url: 'https://www.hobbyscan.com/card/379797',
        required_terms: ['Suicune', '026', 'Phantasmal Flames', 'Holo', 'EB Games Stamp'],
        review_only_reason: 'Conflicts with other public source language using Cosmo/Cosmos for the same stamped row.',
      },
      {
        source_key: 'magicmadhouse_suicune_eb_games_cosmo_26',
        source_kind: 'marketplace_checklist',
        source_url: 'https://magicmadhouse.co.uk/pokemon-1/?page=21',
        required_terms: ['ME Phantasmal Flames', '026/094', 'Suicune', 'Cosmo Holo EB Games Stamp'],
        review_only_reason: 'Supports Cosmos/Cosmo wording, not current queue finish_key=holo.',
      },
    ],
  },
  {
    set_key: 'sm6',
    set_name: 'Forbidden Light',
    card_number: '102',
    card_name: 'Beast Ring',
    variant_key: 'league_staff_stamp',
    stamp_label: 'League Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_beast_ring_staff_league_reverse_102',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/beast-ring-102-131-reverse-holo-staff-league-promo-forbidden-light/sm6-102-3-78/',
        required_terms: ['Beast Ring', '102/131', 'Reverse Holo', 'Staff League Promo'],
      },
      {
        source_key: 'pricecharting_beast_ring_league_promo_102',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-forbidden-light/beast-ring-league-promo-102',
        required_terms: ['Beast Ring', '102/131', 'Reverse Holo', 'League Promo'],
        review_only_reason: 'Corroborates league reverse family but not staff variant.',
      },
    ],
  },
  {
    set_key: 'xy10',
    set_name: 'Fates Collide',
    card_number: '94',
    card_name: 'Chaos Tower',
    variant_key: 'national_championships_staff_stamp',
    stamp_label: 'National Championships Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_chaos_tower_staff_national_reverse_94',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/chaos-tower-94-124-reverse-holo-staff-national-championships-fates-collide/xy10-94-3-80/',
        required_terms: ['Chaos Tower', '94/124', 'Reverse Holo', 'Staff National Championships'],
      },
      {
        source_key: 'pricecharting_chaos_tower_94_sales_context',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-fates-collide/chaos-tower-94',
        required_terms: ['Chaos Tower', '94/124', 'National Championships Staff'],
        review_only_reason: 'Sales context corroborates staff national identity but not clean active finish details.',
      },
    ],
  },
  {
    set_key: 'xy8',
    set_name: 'BREAKthrough',
    card_number: '145',
    card_name: 'Parallel City',
    variant_key: 'city_championships_staff_stamp',
    stamp_label: 'City Championships Staff Stamp',
    finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_parallel_city_staff_city_reverse_145',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/parallel-city-145-162-reverse-holo-staff-city-championships-breakthrough/xy8-145-3-75/',
        required_terms: ['Parallel City', '145/162', 'Reverse Holo', 'Staff City Championships'],
      },
      {
        source_key: 'collectorsedition101_parallel_city_staff_city_reverse_145',
        source_kind: 'marketplace_checklist',
        source_url: 'https://collectorsedition101.com/products/3754424023',
        required_terms: ['Parallel City', '145/162', 'Reverse Holo', 'City Championships STAFF'],
      },
    ],
  },
];

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

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-')
    .replace(/Pokémon/g, 'Pokemon')
    .replace(/\u00a0/g, ' ');
}

function normalized(value) {
  return decodeHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiSourceAudit/1.0 (+audit-only; no purchase automation)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return decodeHtml(await response.text());
  } catch (error) {
    const script = [
      '$ProgressPreference = "SilentlyContinue";',
      '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
      `$r = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -TimeoutSec 30;`,
      '$r.Content',
    ].join(' ');
    try {
      return decodeHtml(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
        encoding: 'utf8',
        maxBuffer: 12 * 1024 * 1024,
      }));
    } catch (fallbackError) {
      throw new Error(`${error.message}; powershell_fallback_failed:${fallbackError.status ?? 'unknown'}`);
    }
  }
}

async function inspect(source) {
  try {
    const html = await fetchText(source.source_url);
    const body = normalized(html);
    const term_results = source.required_terms.map((term) => ({
      term,
      found: body.includes(normalized(term)),
    }));
    return {
      ...source,
      fetch_status: 'fetched',
      term_results,
      all_required_terms_found: term_results.every((result) => result.found),
    };
  } catch (error) {
    return {
      ...source,
      fetch_status: `fetch_failed:${error.message}`,
      term_results: source.required_terms.map((term) => ({ term, found: false })),
      all_required_terms_found: false,
    };
  }
}

function queueRows(queue) {
  return (queue.rows || queue.queue || queue.items || []).filter((row) => row.action_bucket === 'second_source_needed');
}

function classify(target, source_checks) {
  const exact = source_checks.filter((source) => source.all_required_terms_found && !source.review_only_reason);
  const review = source_checks.filter((source) => source.all_required_terms_found && source.review_only_reason);
  if (target.set_key === 'me02') {
    return {
      status: 'manual_finish_taxonomy_conflict_no_write',
      exact_second_source_count: 0,
      review_source_count: source_checks.filter((source) => source.all_required_terms_found).length,
      decision_reason: 'Sources disagree between Holo and Cosmo/Cosmos wording for Suicune EB Games Stamp; fail closed until finish taxonomy is adjudicated.',
    };
  }
  if (exact.length) {
    return {
      status: 'source_ready_candidate_no_db_write',
      exact_second_source_count: exact.length,
      review_source_count: review.length,
      decision_reason: 'At least one independent exact source proves set, number, card name, stamp family, and active finish.',
    };
  }
  if (review.length) {
    return {
      status: 'review_only_no_write',
      exact_second_source_count: 0,
      review_source_count: review.length,
      decision_reason: 'Only review-context source evidence was found; not enough for promotion.',
    };
  }
  return {
    status: 'source_exhausted_no_second_source_no_write',
    exact_second_source_count: 0,
    review_source_count: 0,
    decision_reason: 'No checked source met exact source terms.',
  };
}

function fixtureRecords(results) {
  return results
    .filter((row) => row.classification.status === 'source_ready_candidate_no_db_write')
    .flatMap((row) => row.source_checks
      .filter((source) => source.all_required_terms_found && !source.review_only_reason)
      .map((source) => ({
        source_key: 'second_source_needed_finish_evidence_v1',
        source_kind: source.source_kind,
        source_url: source.source_url,
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        rarity: null,
        evidence_type: 'finish_presence',
        evidence_label: `${source.source_key}: exact ${row.stamp_label} active finish ${row.finish_key}`,
        language: 'en',
        retrieved_at: row.retrieved_at,
        raw_snapshot_ref: `second_source_needed_finish_evidence_v1:${row.set_key}:${row.card_number}:${row.variant_key}:${source.source_key}`,
        notes: 'Audit-only second-source fixture. Accepted only when source text proves exact set/card identity, stamp/variant family, and active finish.',
      })));
}

function mdTable(columns, rows) {
  if (!rows.length) return '_None._\n';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n') + '\n';
}

function buildMarkdown(report) {
  return `# Second Source Needed Finish Evidence V1

Audit-only pass for stamped/special rows that already had one preserved source and needed a second independent exact source.

No DB writes, migrations, applies, deletes, parent inserts, child inserts, or identity inserts were performed.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['target_queue_rows', report.summary.target_queue_rows],
    ['source_ready_candidates', report.summary.source_ready_candidates],
    ['manual_finish_taxonomy_conflicts', report.summary.manual_finish_taxonomy_conflicts],
    ['review_only_rows', report.summary.review_only_rows],
    ['fixture_records_written', report.summary.fixture_records_written],
    ['write_ready_created', report.summary.write_ready_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Results

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'card', value: (row) => row.card_name },
    { label: 'stamp', value: (row) => row.stamp_label },
    { label: 'finish', value: (row) => row.finish_key },
    { label: 'status', value: (row) => row.classification.status },
    { label: 'reason', value: (row) => row.classification.decision_reason },
  ], report.results)}

## Source Checks

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'source', value: (row) => row.source_key },
    { label: 'status', value: (row) => row.fetch_status },
    { label: 'all_terms', value: (row) => row.all_required_terms_found },
    { label: 'review_only', value: (row) => row.review_only_reason ? 'yes' : 'no' },
    { label: 'url', value: (row) => row.source_url },
  ], report.results.flatMap((row) => row.source_checks.map((source) => ({ ...source, set_key: row.set_key, card_number: row.card_number }))))}

## Guardrails

- No write package is created by this report.
- Suicune EB Games remains blocked because source wording conflicts between Holo and Cosmo/Cosmos.
- Review-only crosshatch/holo wording is preserved but not promoted as active finish truth when it does not match the queue finish exactly.
`;
}

async function main() {
  const queue = await readJson(QUEUE_PATH);
  const rows = queueRows(queue);
  const retrieved_at = new Date().toISOString();
  const results = [];

  for (const target of TARGETS) {
    const source_checks = [];
    for (const source of target.sources) {
      source_checks.push(await inspect(source));
    }
    const classification = classify(target, source_checks);
    const queue_row = rows.find((row) => (
      row.set_key === target.set_key
      && row.card_number === target.card_number
      && row.variant_key === target.variant_key
    )) || null;
    results.push({
      ...target,
      queue_row_present: Boolean(queue_row),
      retrieved_at,
      source_checks,
      classification,
    });
  }

  const fixture_records = fixtureRecords(results);
  if (fixture_records.length) {
    const bySet = Map.groupBy(fixture_records, (record) => record.set_key);
    for (const [setKey, records] of bySet) {
      await writeJson(path.join(FIXTURE_DIR, `${setKey}.json`), {
        schema_version: 'verified_master_set_index_source_fixture_v1',
        source_key: 'second_source_needed_finish_evidence_v1',
        generated_at: retrieved_at,
        generation_note: 'Audit-only second-source active finish evidence for stamped/special queue rows. No copyrighted page dumps stored.',
        records,
      });
    }
  }

  const summary = {
    target_queue_rows: rows.length,
    source_ready_candidates: results.filter((row) => row.classification.status === 'source_ready_candidate_no_db_write').length,
    manual_finish_taxonomy_conflicts: results.filter((row) => row.classification.status === 'manual_finish_taxonomy_conflict_no_write').length,
    review_only_rows: results.filter((row) => row.classification.status === 'review_only_no_write').length,
    fixture_records_written: fixture_records.length,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_created: 0,
  };

  const fingerprintPayload = {
    summary,
    results: results.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      classification: row.classification,
      source_checks: row.source_checks.map((source) => ({
        source_key: source.source_key,
        source_url: source.source_url,
        fetch_status: source.fetch_status,
        all_required_terms_found: source.all_required_terms_found,
        review_only_reason: source.review_only_reason,
      })),
    })),
    fixture_records,
  };
  const report = {
    report_name: 'second_source_needed_finish_evidence_v1',
    generated_at: retrieved_at,
    objective: 'Audit-only source acquisition for stamped/special rows needing one more independent exact finish source.',
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    summary,
    fixture_output_dir: fixture_records.length ? path.relative(ROOT, FIXTURE_DIR).replace(/\\/g, '/') : null,
    results,
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
  };

  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    report: path.relative(ROOT, OUT_JSON),
    markdown: path.relative(ROOT, OUT_MD),
    fixture_records_written: fixture_records.length,
    source_ready_candidates: summary.source_ready_candidates,
    manual_finish_taxonomy_conflicts: summary.manual_finish_taxonomy_conflicts,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
