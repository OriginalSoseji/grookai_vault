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
  'docs/audits/english_master_index_source_exhaustion_v1/small_custom_stamp_web_evidence_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'small_custom_stamp_web_evidence_v1.json');
const OUT_MD = path.join(OUT_DIR, 'small_custom_stamp_web_evidence_v1.md');
const FIXTURE_DIR = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_small_custom_stamp_web_evidence_v1',
);

const TARGETS = [
  {
    set_key: 'ex10',
    set_name: 'Unseen Forces',
    card_number: '29',
    card_name: 'Lugia',
    variant_key: 'pokemon_rocks_america_stamped_2005',
    stamp_label: 'Pokemon Rocks America Stamped; 2005',
    sources: [
      {
        source_key: 'pokecardvalues_lugia_rocks_america_non_holo_29',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/lugia-29-115-non-holo-exclusive-unseen-forces/ex10-29-2-30/',
        required_terms: ['Lugia', '29/115', 'Non-Holo', 'Pokemon Rocks America Promo'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'facetofacegames_lugia_rocks_america_non_holo_29',
        source_kind: 'marketplace_checklist',
        source_url: 'https://facetofacegames.com/en-us/products/lugia-29115-promo-pokemon-rocks-america-2005-ex10msp-29-non-holo',
        required_terms: ['Lugia', 'Pokemon Rocks America 2005', 'Finish: Non-Holo', 'Collector #: 29/115'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
      },
    ],
  },
  {
    set_key: 'ex9',
    set_name: 'Emerald',
    card_number: '60',
    card_name: 'Pikachu',
    variant_key: 'san_diego_comic_con_international_stamped_2005',
    stamp_label: 'San Diego Comic Con International Stamped; 2005',
    sources: [
      {
        source_key: 'pokecardvalues_pikachu_sdcc_non_holo_60',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/pikachu-60-106-non-holo-comic-con-promo-emerald/ex9-60-2-24/',
        required_terms: ['Pikachu', '60/106', 'Non-Holo', 'Comic Con Promo', 'San Diego Comic Con promo'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting_pikachu_comic_con_60',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-emerald/pikachu-comic-con-promo-60',
        required_terms: ['Pikachu', 'Comic Con Promo', '60/106'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'ex9',
    set_name: 'Emerald',
    card_number: '70',
    card_name: 'Treecko',
    variant_key: 'indianapolis_gencon_stamped_2005',
    stamp_label: 'Indianapolis GenCon Stamped; 2005',
    sources: [
      {
        source_key: 'pokecardvalues_treecko_gencon_non_holo_70',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/treecko-70-106-non-holo-exclusive-emerald/ex9-70-2-30/',
        required_terms: ['Treecko', '70/106', 'Non-Holo', 'GenCon'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting_treecko_gencon_70',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/treecko-gencon-70',
        required_terms: ['Treecko', 'GenCon', '70/106'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'ex12',
    set_name: 'Legend Maker',
    card_number: '5',
    card_name: 'Gengar',
    variant_key: 'gym_challenge_stamped_2006_2007',
    stamp_label: 'Gym Challenge Stamped; 2006 2007',
    sources: [
      {
        source_key: 'pricecharting_gengar_gym_challenge_5',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-legend-maker/gengar-gym-challenge-5',
        required_terms: ['Gengar', 'Gym Challenge', '#5'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'sportscardinvestor_gengar_reverse_holo_gym_challenge_context_5',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.sportscardinvestor.com/cards/gengar-pokemon/2006-ex-legend-maker-reverse-holo-05-92',
        required_terms: ['Gengar', 'Reverse Holo', '05/92', 'Promo (Gym Challenge)'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
        review_only_reason: 'Page discusses reverse holo and Promo (Gym Challenge) as tracked variations, but does not isolate the Gym Challenge variant as the exact active finish cleanly enough for promotion.',
      },
    ],
  },
  {
    set_key: 'ex11',
    set_name: 'Delta Species',
    card_number: '64',
    card_name: 'Ditto',
    variant_key: 'games_expo_stamped_2007',
    stamp_label: 'Games Expo Stamped; 2007',
    sources: [
      {
        source_key: 'pricecharting_ditto_games_expo_64',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-delta-species/ditto-games-expo-64',
        required_terms: ['Ditto', 'Games Expo', '64/113'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'landrypop_ditto_games_expo_64',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.landrypop.com/auctions/2026/03/pokemon-30-icons-rarities-grails/224',
        required_terms: ['Ditto', 'Games Expo 2007', '64/113'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
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
  return (queue.rows || queue.queue || queue.items || []).filter((row) => row.action_bucket === 'small_custom_stamp_exact_source');
}

function classify(sourceChecks) {
  const exact = sourceChecks.filter((source) => source.all_required_terms_found && source.claimed_finish_key && !source.review_only_reason);
  const identity = sourceChecks.filter((source) => source.all_required_terms_found && !source.claimed_finish_key && !source.review_only_reason);
  const review = sourceChecks.filter((source) => source.all_required_terms_found && source.review_only_reason);
  const finishes = [...new Set(exact.map((source) => source.claimed_finish_key))].sort();

  if (finishes.length === 1) {
    return {
      status: 'source_ready_candidate_no_db_write',
      recommended_finish_key: finishes[0],
      exact_finish_source_count: exact.length,
      identity_source_count: identity.length,
      review_source_count: review.length,
      decision_reason: 'At least one source proves exact small-custom stamp identity and active finish. Source-delta must still decide whether this is useful.',
    };
  }
  if (identity.length || review.length) {
    return {
      status: 'identity_or_review_supported_finish_unproven_no_write',
      recommended_finish_key: null,
      exact_finish_source_count: 0,
      identity_source_count: identity.length,
      review_source_count: review.length,
      decision_reason: 'Source evidence supports identity or review context, but active finish is not clean enough for promotion.',
    };
  }
  return {
    status: 'source_exhausted_no_exact_source_no_write',
    recommended_finish_key: null,
    exact_finish_source_count: 0,
    identity_source_count: 0,
    review_source_count: 0,
    decision_reason: 'No checked source met exact terms.',
  };
}

function fixtureRecords(results) {
  return results
    .filter((row) => row.classification.status === 'source_ready_candidate_no_db_write')
    .flatMap((row) => row.source_checks
      .filter((source) => source.all_required_terms_found && source.claimed_finish_key && !source.review_only_reason)
      .map((source) => ({
        source_key: 'small_custom_stamp_web_evidence_v1',
        source_kind: source.source_kind,
        source_url: source.source_url,
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: source.claimed_finish_key,
        rarity: null,
        evidence_type: 'finish_presence',
        evidence_label: `${source.source_key}: exact ${row.stamp_label} active finish ${source.claimed_finish_key}`,
        language: 'en',
        retrieved_at: row.retrieved_at,
        raw_snapshot_ref: `small_custom_stamp_web_evidence_v1:${row.set_key}:${row.card_number}:${row.variant_key}:${source.source_key}`,
        notes: 'Audit-only small-custom stamp web evidence. No copyrighted page dumps stored.',
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
  return `# Small Custom Stamp Web Evidence V1

Audit-only fresh web evidence pass for selected small-custom stamp rows.

No DB writes, migrations, applies, cleanup, quarantine, parent inserts, child inserts, or identity inserts were performed.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['target_queue_rows', report.summary.target_queue_rows],
    ['targets_in_script', report.summary.targets_in_script],
    ['source_ready_candidates', report.summary.source_ready_candidates],
    ['identity_or_review_supported_finish_unproven', report.summary.identity_or_review_supported_finish_unproven],
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
    { label: 'finish', value: (row) => row.classification.recommended_finish_key ?? '' },
    { label: 'status', value: (row) => row.classification.status },
    { label: 'reason', value: (row) => row.classification.decision_reason },
  ], report.results)}

## Source Checks

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'source', value: (row) => row.source_key },
    { label: 'all_terms', value: (row) => row.all_required_terms_found },
    { label: 'finish', value: (row) => row.claimed_finish_key ?? '' },
    { label: 'review_only', value: (row) => row.review_only_reason ? 'yes' : 'no' },
    { label: 'url', value: (row) => row.source_url },
  ], report.results.flatMap((row) => row.source_checks.map((source) => ({ ...source, set_key: row.set_key, card_number: row.card_number }))))}
`;
}

async function main() {
  const queue = await readJson(QUEUE_PATH);
  const rows = queueRows(queue);
  const retrieved_at = new Date().toISOString();
  const results = [];

  for (const target of TARGETS) {
    const queueRow = rows.find((row) =>
      row.set_key === target.set_key &&
      String(row.card_number) === target.card_number &&
      row.card_name === target.card_name &&
      row.variant_key === target.variant_key);
    const source_checks = [];
    for (const source of target.sources) source_checks.push(await inspect(source));
    results.push({
      ...target,
      queue_row_present: Boolean(queueRow),
      retrieved_at,
      source_checks,
      classification: classify(source_checks),
    });
  }

  const records = fixtureRecords(results);
  const bySet = new Map();
  for (const record of records) {
    if (!bySet.has(record.set_key)) bySet.set(record.set_key, []);
    bySet.get(record.set_key).push(record);
  }

  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  for (const [setKey, setRecords] of bySet.entries()) {
    await writeJson(path.join(FIXTURE_DIR, `${setKey}.json`), {
      schema_version: 'verified_master_set_index_source_fixture_v1',
      source_key: 'small_custom_stamp_web_evidence_v1',
      generated_at: retrieved_at,
      generation_note: 'Audit-only small-custom stamp web evidence. No copyrighted page dumps stored.',
      records: setRecords,
    });
  }

  const summary = {
    target_queue_rows: rows.length,
    targets_in_script: TARGETS.length,
    queue_targets_matched: results.filter((row) => row.queue_row_present).length,
    source_ready_candidates: results.filter((row) => row.classification.status === 'source_ready_candidate_no_db_write').length,
    identity_or_review_supported_finish_unproven: results.filter((row) => row.classification.status === 'identity_or_review_supported_finish_unproven_no_write').length,
    fixture_records_written: records.length,
    write_ready_created: 0,
  };

  const report = {
    generated_at: retrieved_at,
    version: 'small_custom_stamp_web_evidence_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    inputs: {
      queue_path: path.relative(ROOT, QUEUE_PATH).replaceAll('\\', '/'),
      fixture_dir: path.relative(ROOT, FIXTURE_DIR).replaceAll('\\', '/'),
    },
    summary,
    results,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary,
    results: results.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      classification: row.classification,
      source_checks: row.source_checks.map((source) => ({
        source_key: source.source_key,
        all_required_terms_found: source.all_required_terms_found,
        claimed_finish_key: source.claimed_finish_key ?? null,
        review_only: Boolean(source.review_only_reason),
      })),
    })),
  }));

  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    out_json: path.relative(ROOT, OUT_JSON).replaceAll('\\', '/'),
    out_md: path.relative(ROOT, OUT_MD).replaceAll('\\', '/'),
    fixture_dir: path.relative(ROOT, FIXTURE_DIR).replaceAll('\\', '/'),
    summary,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
