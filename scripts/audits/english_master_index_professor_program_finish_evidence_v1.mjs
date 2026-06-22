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
  'docs/audits/english_master_index_source_exhaustion_v1/professor_program_finish_evidence_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'professor_program_finish_evidence_v1.json');
const OUT_MD = path.join(OUT_DIR, 'professor_program_finish_evidence_v1.md');
const FIXTURE_DIR = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_professor_program_finish_evidence_v1',
);

const TARGETS = [
  {
    set_key: 'dp3',
    set_name: 'Secret Wonders',
    card_number: '122',
    card_name: "Professor Oak's Visit",
    pkmngg_finish_key: 'normal',
    sources: [
      {
        source_key: 'pricecharting_professor_oaks_visit_professor_program_122',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-secret-wonders/professor-oak%27s-visit-professor-program-122',
        required_terms: ["Professor Oak's Visit", 'Professor Program', '122'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'collectorsedition101_professor_oaks_visit_professor_program',
        source_kind: 'marketplace_checklist',
        source_url: 'https://collectorsedition101.com/products/51347384',
        required_terms: ["Professor Oak's Visit", 'Professor Program', '122'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'ex15',
    set_name: 'Dragon Frontiers',
    card_number: '79',
    card_name: "Professor Elm's Training Method",
    pkmngg_finish_key: 'normal',
    sources: [
      {
        source_key: 'gemtracker_professor_elms_training_method_professor_program_79',
        source_kind: 'collector_reference',
        source_url: 'https://gemtracker.co/en/pokemon/en/ex/ex-miscellaneous-promos/item/card/79-professor-elms-training-method/2004301/universal-population-report?version=31971',
        required_terms: ["Professor Elm's Training Method", 'Dragon Frontiers', 'Professor Program'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'pricecharting_professor_elms_training_method_79',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/pt/game/pokemon-dragon-frontiers/professor-elm%27s-training-method-79',
        required_terms: ["Professor Elm's Training Method", '79/101', 'Professor Program'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'ex6',
    set_name: 'FireRed & LeafGreen',
    card_number: '98',
    card_name: "Prof. Oak's Research",
    pkmngg_finish_key: 'normal',
    sources: [
      {
        source_key: 'sportscardinvestor_prof_oaks_research_professor_program_98',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.sportscardinvestor.com/cards/prof.-oak-s-research-pokemon/2004-ex-firered-leafgreen-promo-professor-program-098-112',
        required_terms: ["Prof. Oak's Research", 'Professor Program', '098/112'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'dextcg_prof_oaks_research_professor_program_98',
        source_kind: 'collector_reference',
        source_url: 'https://dextcg.com/cards/ex6-98?countryCode=US',
        required_terms: ["Prof. Oak's Research", 'Professor Program', 'Normal', 'Reverse Holo'],
        claimed_finish_key: null,
        evidence_type: 'variant_presence',
      },
    ],
  },
  {
    set_key: 'hgss1',
    set_name: 'HeartGold & SoulSilver',
    card_number: '100',
    card_name: "Professor Elm's Training Method",
    pkmngg_finish_key: 'reverse',
    sources: [
      {
        source_key: 'pokecardvalues_professor_elms_training_method_professor_program_reverse_100',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/professor-elms-training-method-100-123-non-holo-unlimited-heartgold-soulsilver/hgss1-100-2-1/',
        required_terms: ["Professor Elm's Training Method", '100/123', 'Professor Program', 'Reverse Holo'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'alt_professor_elms_training_method_crosshatch_professor_program_100',
        source_kind: 'marketplace_checklist',
        source_url: 'https://alt.xyz/itm/216cea7b-387f-438f-9f5c-ef97a8531771/external',
        required_terms: ["Professor Elm's Training Method", 'Professor Program', 'Crosshatch Holo', '100'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
    ],
  },
  {
    set_key: 'sv02',
    set_name: 'Paldea Evolved',
    card_number: '66',
    card_name: 'Voltorb',
    pkmngg_finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_voltorb_professor_program_66',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-paldea-evolved/voltorb-professor-program-66',
        required_terms: ['Voltorb', 'Professor Program', '66'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'pokebeach_voltorb_professor_program_66',
        source_kind: 'collector_reference',
        source_url: 'https://www.pokebeach.com/2024/06/special-151-voltorb-promos-awarded-to-tournament-staff-among-the-rarest-english-cards-ever-printed',
        required_terms: ['Voltorb', 'Paldea Evolved', '#66', 'Professor Program stamp'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'swsh1',
    set_name: 'Sword & Shield',
    card_number: '175',
    card_name: 'Pokémon Catcher',
    pkmngg_finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_pokemon_catcher_cinderace_stamp_175',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-2022-battle-academy/pokemon-catcher-cinderace-stamp-175',
        required_terms: ['Pokemon Catcher', 'Cinderace Stamp', '175'],
        claimed_finish_key: 'stamped',
        evidence_type: 'non_professor_stamp_presence',
        conflicting_variant_key: 'cinderace_deck_stamp',
      },
    ],
  },
  {
    set_key: 'swsh1',
    set_name: 'Sword & Shield',
    card_number: '177',
    card_name: 'Potion',
    pkmngg_finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_potion_cinderace_stamp_177',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-2022-battle-academy/potion-42-cinderace-stamp-177',
        required_terms: ['Potion', 'Cinderace Stamp', '177'],
        claimed_finish_key: 'stamped',
        evidence_type: 'non_professor_stamp_presence',
        conflicting_variant_key: 'cinderace_deck_stamp',
      },
      {
        source_key: 'nwcardgames_potion_pikachu_stamp_177',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.nwcardgames.com/collections/pokemon-singles/products/potion-177-202-pikachu-stamp-18-battle-academy-2022',
        required_terms: ['Potion', '177/202', 'Pikachu Stamp'],
        claimed_finish_key: 'stamped',
        evidence_type: 'non_professor_stamp_presence',
        conflicting_variant_key: 'pikachu_deck_stamp',
      },
    ],
  },
  {
    set_key: 'swsh8',
    set_name: 'Fusion Strike',
    card_number: '29',
    card_name: 'Vulpix',
    pkmngg_finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_vulpix_cinderace_stamp_29',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-2022-battle-academy/vulpix-31-cinderace-stamped-29',
        required_terms: ['Vulpix', 'Cinderace Stamped', '29'],
        claimed_finish_key: 'stamped',
        evidence_type: 'non_professor_stamp_presence',
        conflicting_variant_key: 'cinderace_deck_stamp',
      },
    ],
  },
  {
    set_key: 'swsh8',
    set_name: 'Fusion Strike',
    card_number: '46',
    card_name: 'Sizzlipede',
    pkmngg_finish_key: null,
    sources: [
      {
        source_key: 'pricecharting_sizzlipede_cinderace_stamp_46',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-2022-battle-academy/sizzlipede-17-cinderace-stamped-46',
        required_terms: ['Sizzlipede', 'Cinderace Stamped', '46'],
        claimed_finish_key: 'stamped',
        evidence_type: 'non_professor_stamp_presence',
        conflicting_variant_key: 'cinderace_deck_stamp',
      },
      {
        source_key: 'bulbapedia_fusion_strike_additional_cards',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Fusion_Strike_(TCG)',
        required_terms: ['Sizzlipede', '46', 'Pikachu Deck stamp', 'Battle Academy 2022 exclusive'],
        claimed_finish_key: 'stamped',
        evidence_type: 'non_professor_stamp_presence',
        conflicting_variant_key: 'pikachu_deck_stamp',
      },
    ],
  },
  {
    set_key: 'swsh9',
    set_name: 'Brilliant Stars',
    card_number: '147',
    card_name: "Professor's Research",
    pkmngg_finish_key: 'reverse',
    sources: [
      {
        source_key: 'magicmadhouse_professors_research_professor_program_147',
        source_kind: 'marketplace_checklist',
        source_url: 'https://magicmadhouse.co.uk/pokemon-brilliant-stars-147-172-professors-research-rowan-professor-program-league-promo',
        required_terms: ["Professor's Research", '147/172', 'Professor Program'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'pricecharting_professors_research_professor_program_147',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/search-products?q=professors+research+147&type=prices',
        required_terms: ["Professor's Research", 'Professor Program', '147'],
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
    .replace(/Pokémon/g, 'Pokemon');
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
  return (queue.rows || queue.queue || queue.items || []).filter((row) => (
    row.action_bucket === 'professor_program_exact_finish_source'
    && TARGETS.some((target) => target.set_key === row.set_key && target.card_number === row.card_number)
  ));
}

function classify(target, source_checks) {
  const fetched = source_checks.filter((source) => source.all_required_terms_found);
  const exact_finish_sources = fetched.filter((source) => source.evidence_type === 'finish_presence' && source.claimed_finish_key);
  const non_professor = fetched.filter((source) => source.evidence_type === 'non_professor_stamp_presence');
  const finish_keys = [...new Set(exact_finish_sources.map((source) => source.claimed_finish_key))].sort();

  if (non_professor.length && !target.pkmngg_finish_key) {
    return {
      status: 'queue_taxonomy_issue_no_write',
      accepted_source_count: fetched.length,
      exact_finish_source_count: 0,
      claimed_finish_keys: [...new Set(non_professor.map((source) => source.claimed_finish_key).filter(Boolean))].sort(),
      conflicting_variant_keys: [...new Set(non_professor.map((source) => source.conflicting_variant_key).filter(Boolean))].sort(),
      decision_reason: 'Fetched source evidence supports a deck/product stamp, not Professor Program. Do not insert as Professor Program.',
    };
  }

  if (target.pkmngg_finish_key && exact_finish_sources.length >= 1 && finish_keys.length === 1 && finish_keys[0] === target.pkmngg_finish_key) {
    return {
      status: 'source_ready_candidate_no_db_write',
      accepted_source_count: fetched.length,
      exact_finish_source_count: exact_finish_sources.length + 1,
      claimed_finish_keys: finish_keys,
      decision_reason: 'Existing pkmn.gg exact finish fixture and one fetched second source agree on active finish.',
    };
  }

  if (target.pkmngg_finish_key && fetched.length >= 1) {
    return {
      status: 'identity_supported_finish_still_single_source_no_write',
      accepted_source_count: fetched.length,
      exact_finish_source_count: 1,
      claimed_finish_keys: [target.pkmngg_finish_key],
      decision_reason: 'Existing pkmn.gg fixture supports active finish, but fetched sources only corroborate identity or variant family.',
    };
  }

  if (fetched.length >= 1) {
    return {
      status: 'identity_supported_active_finish_unproven_no_write',
      accepted_source_count: fetched.length,
      exact_finish_source_count: 0,
      claimed_finish_keys: [],
      decision_reason: 'Fetched sources corroborate identity/stamp family but not exact active finish.',
    };
  }

  return {
    status: 'source_exhausted_no_exact_evidence_no_write',
    accepted_source_count: 0,
    exact_finish_source_count: 0,
    claimed_finish_keys: [],
    decision_reason: 'No fetched source met all required exact terms.',
  };
}

function fixtureRecords(results) {
  const ready = results.filter((row) => row.classification.status === 'source_ready_candidate_no_db_write');
  return ready.flatMap((row) => row.source_checks
    .filter((source) => source.all_required_terms_found && source.evidence_type === 'finish_presence')
    .map((source) => ({
      source_key: 'professor_program_finish_evidence_v1',
      source_kind: source.source_kind,
      source_url: source.source_url,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: source.claimed_finish_key,
      rarity: null,
      evidence_type: 'finish_presence',
      evidence_label: `${source.source_key}: exact Professor Program active finish ${source.claimed_finish_key}`,
      language: 'en',
      retrieved_at: row.retrieved_at,
      raw_snapshot_ref: `professor_program_finish_evidence_v1:${row.set_key}:${row.card_number}:${source.source_key}`,
      notes: 'Audit-only second-source fixture. Accepted only when source text proves set/card identity, Professor Program stamp, and active finish.',
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
  return `# Professor Program Finish Evidence V1

Audit-only pass for the Professor Program stamped/special queue bucket.

No DB writes, migrations, applies, deletes, parent inserts, child inserts, or identity inserts were performed.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['target_queue_rows', report.summary.target_queue_rows],
    ['source_ready_candidates', report.summary.source_ready_candidates],
    ['identity_supported_finish_still_single_source', report.summary.identity_supported_finish_still_single_source],
    ['identity_supported_active_finish_unproven', report.summary.identity_supported_active_finish_unproven],
    ['queue_taxonomy_issues', report.summary.queue_taxonomy_issues],
    ['fixture_records_written', report.summary.fixture_records_written],
    ['write_ready_created', report.summary.write_ready_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Results

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'card', value: (row) => row.card_name },
    { label: 'status', value: (row) => row.classification.status },
    { label: 'finish', value: (row) => row.classification.claimed_finish_keys.join(', ') },
    { label: 'reason', value: (row) => row.classification.decision_reason },
  ], report.results)}

## Source Checks

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'source', value: (row) => row.source_key },
    { label: 'status', value: (row) => row.fetch_status },
    { label: 'all_terms', value: (row) => row.all_required_terms_found },
    { label: 'claimed_finish', value: (row) => row.claimed_finish_key || '' },
    { label: 'url', value: (row) => row.source_url },
  ], report.results.flatMap((row) => row.source_checks.map((source) => ({ ...source, set_key: row.set_key, card_number: row.card_number }))))}

## Guardrails

- Existing pkmn.gg evidence is not enough by itself to create a DB write package.
- Identity-only Professor Program evidence does not prove active finish.
- Battle Academy deck stamps are not Professor Program rows.
- This pass emitted only audit artifacts and one fixture packet for rows with second-source active finish evidence.
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
    const queue_row = rows.find((row) => row.set_key === target.set_key && row.card_number === target.card_number) || null;
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
        source_key: 'professor_program_finish_evidence_v1',
        generated_at: retrieved_at,
        generation_note: 'Audit-only Professor Program second-source active finish evidence. No copyrighted page dumps stored.',
        records,
      });
    }
  }

  const summary = {
    target_queue_rows: rows.length,
    source_ready_candidates: results.filter((row) => row.classification.status === 'source_ready_candidate_no_db_write').length,
    identity_supported_finish_still_single_source: results.filter((row) => row.classification.status === 'identity_supported_finish_still_single_source_no_write').length,
    identity_supported_active_finish_unproven: results.filter((row) => row.classification.status === 'identity_supported_active_finish_unproven_no_write').length,
    queue_taxonomy_issues: results.filter((row) => row.classification.status === 'queue_taxonomy_issue_no_write').length,
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
      classification: row.classification,
      source_checks: row.source_checks.map((source) => ({
        source_key: source.source_key,
        source_url: source.source_url,
        fetch_status: source.fetch_status,
        all_required_terms_found: source.all_required_terms_found,
        claimed_finish_key: source.claimed_finish_key,
        evidence_type: source.evidence_type,
      })),
    })),
    fixture_records,
  };
  const report = {
    report_name: 'professor_program_finish_evidence_v1',
    generated_at: retrieved_at,
    objective: 'Audit-only source acquisition for Professor Program exact active finish evidence.',
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
    queue_taxonomy_issues: summary.queue_taxonomy_issues,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
