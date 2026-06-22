import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const QUEUE_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json';
const SETS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pkmngg_stamped_finish_acquisition_v1';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmngg_stamped_finish_v1';
const SOURCE_KEY = 'pkmngg_stamped_finish';
const SOURCE_KIND = 'collector_reference';
const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = { dryRun: false, limit: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--limit') {
      options.limit = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value);
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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) counts[fn(row)] = (counts[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function comparable(value) {
  return normalizeText(String(value ?? '')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).replace(/^0+/, '');
}

function pkmnggNumber(value) {
  const number = normalizeNumber(value);
  if (/^[A-Z]+[0-9]+$/i.test(number)) return number.toUpperCase();
  const match = number.match(/^([0-9]+)([a-z])$/i);
  if (match) return `${match[1].padStart(3, '0')}${match[2].toLowerCase()}`;
  if (/^[0-9]+$/.test(number)) return number.padStart(3, '0');
  return number;
}

function seriesSlug(setKey) {
  if (/^ex/.test(setKey)) return 'ex';
  if (/^dp|^dpp/.test(setKey)) return 'diamond-pearl';
  if (/^pl/.test(setKey)) return 'platinum';
  if (/^hgss/.test(setKey)) return 'heartgold-soulsilver';
  if (/^bw|^bwp/.test(setKey)) return 'black-white';
  if (/^xy|^xyp/.test(setKey)) return 'xy';
  if (/^sm|^smp|^sma/.test(setKey)) return 'sun-moon';
  if (/^swsh/.test(setKey)) return 'sword-shield';
  if (/^sv|^svp|^sve/.test(setKey)) return 'scarlet-violet';
  return null;
}

function setSlug(set) {
  return set?.source_aliases?.pkmncards ?? normalizeText(set?.set_name)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function variantPattern(row) {
  const key = normalizeText(row.variant_key ?? row.proposed_variant_key);
  const label = comparable(row.stamp_label);
  if (key === 'league_stamp') return /\bleague\b/;
  if (key === 'staff_stamp') return /\bstaff\b/;
  if (key === 'prerelease_stamp') return /\bpre\s*release\b|\bprerelease\b/;
  if (key === 'professor_program_stamp') return /\bprofessor\b/;
  if (key === 'prize_pack_stamp') return /\bprize\s+pack\b/;
  if (key === 'battle_academy_deck_mark') return /\bbattle\s+academy\b/;
  if (key === 'player_rewards_crosshatch_stamp') return /\bplayer\s+rewards\b|\bcrosshatch\b/;
  if (key.includes('halloween') || key.includes('jack_o_lantern')) return /\bhalloween\b|\bjack\b|\blantern\b|\btrick\b/;
  if (key.includes('staff')) return /\bstaff\b/;
  const terms = label.split(/\s+/).filter((term) => term.length > 2 && !['stamp', 'stamped', 'promo'].includes(term));
  if (terms.length) return new RegExp(terms.map((term) => `(?=.*\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`).join(''), 'i');
  return null;
}

function finishFromSubtype(value) {
  const text = comparable(value);
  if (/\breverse\s+holo/.test(text)) return 'reverse';
  if (/\bcosmos\b/.test(text)) return 'cosmos';
  if (/\bcracked\s+ice\b/.test(text)) return 'cracked_ice';
  if (/\bholo/.test(text)) return 'holo';
  if (/\bnormal\b|\bnon\s+holo/.test(text)) return 'normal';
  return null;
}

function extractVariantFacts(html) {
  const facts = [];
  const pattern = /"(?:label|description)":"([^"]+)".{0,240}?"tcgPlayerId":"([^"]+)","tcgPlayerSubtype":"([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    const label = match[1].replace(/\\"/g, '"');
    const subtype = match[3].replace(/\\"/g, '"');
    const finishKey = finishFromSubtype(subtype);
    if (!finishKey) continue;
    facts.push({
      label,
      tcgPlayerId: match[2],
      subtype,
      finish_key: finishKey,
    });
  }
  return facts;
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiAuditBot/1.0 source-verification',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return { ok: false, status: response.status, text: '' };
    return { ok: true, status: response.status, text: await response.text() };
  } catch (error) {
    if (error?.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      try {
        const escapedUrl = url.replace(/'/g, "''");
        const { stdout } = await execFileAsync('powershell', [
          '-NoProfile',
          '-Command',
          `$ProgressPreference='SilentlyContinue'; (Invoke-WebRequest -Uri '${escapedUrl}' -UseBasicParsing -TimeoutSec 20).Content`,
        ], { maxBuffer: 8 * 1024 * 1024 });
        return { ok: true, status: 'powershell_tls_fallback', text: stdout };
      } catch (fallbackError) {
        return {
          ok: false,
          status: `powershell_fetch_error:${fallbackError?.code ?? fallbackError?.name ?? 'unknown'}`,
          text: '',
        };
      }
    }
    return { ok: false, status: `fetch_error:${error?.cause?.code ?? error?.code ?? error?.name ?? 'unknown'}`, text: '' };
  }
}

function targetRows(queue, options) {
  const rows = (queue.rows ?? [])
    .filter((row) => row.queue_status === 'active_finish_required')
    .filter((row) => !row.live_satisfied)
    .filter((row) => row.action_bucket !== 'display_metadata_no_write')
    .filter((row) => row.variant_key && row.variant_key !== 'stamped')
    .filter((row) => ['league_finish_exact_source', 'event_staff_exact_source', 'prerelease_exact_finish_source', 'professor_program_exact_finish_source', 'small_custom_stamp_exact_source', 'halloween_base_parent_or_finish_resolution'].includes(row.action_bucket));
  return options.limit ? rows.slice(0, options.limit) : rows;
}

function fixtureRecord(row, fact, url, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: SOURCE_KIND,
    source_url: url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: normalizeNumber(row.card_number),
    card_name: row.card_name,
    finish_key: fact.finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `pkmn.gg exact variant subtype: ${fact.label} / ${fact.subtype}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pkmngg:${row.set_key}:${normalizeNumber(row.card_number)}:${row.variant_key}:${fact.tcgPlayerId}:${normalizeText(fact.subtype)}`,
    notes: 'Accepted only when pkmn.gg URL was deterministic for exact set/card number and embedded one matching stamped/variant label with one active TCGplayer subtype.',
  };
}

async function writeFixtures(rows, generatedAt, dryRun) {
  const accepted = rows.filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish');
  const bySet = new Map();
  for (const row of accepted) {
    if (!bySet.has(row.set_key)) bySet.set(row.set_key, []);
    bySet.get(row.set_key).push(fixtureRecord(row, row.accepted_fact, row.source_url, generatedAt));
  }
  const files = [];
  if (dryRun) return files;
  for (const [setKey, records] of bySet.entries()) {
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await writeJson(file, {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: SOURCE_KEY,
      source_kind: SOURCE_KIND,
      set_key: setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      records,
    });
    files.push(file.replace(/\\/g, '/'));
  }
  return files;
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, rows]) => [status, rows]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.accepted_finish_key, row.accepted_label, row.source_url]);
  return `# pkmn.gg Stamped Finish Acquisition V1

Audit-only source acquisition against the live stamped/special residual queue.

- db_writes_performed: false
- migrations_created: false
- target_rows: ${report.summary.target_rows}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: ${report.fingerprint_sha256}

## Status

${markdownTable(['status', 'rows'], statusRows)}

## Accepted Evidence

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'label', 'url'], acceptedRows) : 'No exact pkmn.gg stamped finish evidence was accepted.'}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [queue, setsPayload] = await Promise.all([readJson(QUEUE_JSON), readJson(SETS_JSON)]);
  const sets = new Map((setsPayload.rows ?? setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = targetRows(queue, options);

  const results = [];
  for (const row of targets) {
    const set = sets.get(row.set_key);
    const series = seriesSlug(row.set_key);
    const slug = setSlug(set);
    if (!set || !series || !slug) {
      results.push({ ...row, status: 'blocked_pkmngg_url_unmapped' });
      continue;
    }
    const url = `https://www.pkmn.gg/series/${series}/${slug}/${pkmnggNumber(row.card_number)}`;
    const fetched = await fetchText(url);
    if (!fetched.ok) {
      results.push({ ...row, status: 'blocked_pkmngg_fetch_failed', source_url: url, http_status: fetched.status });
      continue;
    }
    const pageTitleMatch = fetched.text.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = pageTitleMatch?.[1] ?? '';
    if (!comparable(pageTitle).includes(comparable(row.card_name))) {
      results.push({ ...row, status: 'blocked_pkmngg_page_identity_mismatch', source_url: url, page_title: pageTitle });
      continue;
    }
    const pattern = variantPattern(row);
    const matchingFacts = extractVariantFacts(fetched.text).filter((fact) => pattern?.test(comparable(`${fact.label} ${fact.subtype}`)));
    const finishKeys = [...new Set(matchingFacts.map((fact) => fact.finish_key))];
    if (matchingFacts.length === 0) {
      results.push({ ...row, status: 'blocked_no_pkmngg_variant_finish_match', source_url: url, pkmngg_fact_count: extractVariantFacts(fetched.text).length });
      continue;
    }
    if (finishKeys.length !== 1) {
      results.push({
        ...row,
        status: 'blocked_conflicting_pkmngg_finish_matches',
        source_url: url,
        candidate_facts: matchingFacts,
      });
      continue;
    }
    const acceptedFact = matchingFacts[0];
    results.push({
      ...row,
      status: 'accepted_exact_pkmngg_variant_finish',
      source_url: url,
      accepted_fact: acceptedFact,
      accepted_finish_key: acceptedFact.finish_key,
      accepted_label: acceptedFact.label,
      accepted_subtype: acceptedFact.subtype,
    });
  }

  const fixtureFiles = await writeFixtures(results, generatedAt, options.dryRun);
  const report = {
    version: 'english_master_index_pkmngg_stamped_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: SOURCE_KIND,
    input_artifact: QUEUE_JSON,
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    summary: {
      target_rows: targets.length,
      records_generated: results.filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish').length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(results.filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish'), (row) => row.accepted_finish_key),
      by_set: countBy(results.filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish'), (row) => row.set_key),
    },
    results,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    summary: report.summary,
    accepted: results
      .filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish')
      .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.accepted_finish_key, row.source_url]),
  }));

  await writeJson(path.join(REPORT_DIR, 'pkmngg_stamped_finish_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'pkmngg_stamped_finish_acquisition_v1.md'), renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.join(REPORT_DIR, 'pkmngg_stamped_finish_acquisition_v1.json').replace(/\\/g, '/'),
    output_md: path.join(REPORT_DIR, 'pkmngg_stamped_finish_acquisition_v1.md').replace(/\\/g, '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
