import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const INPUT_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json';
const BLUEPRINT_CACHE = 'docs/audits/english_master_index_source_exhaustion_v1/cardtrader_acquisition_v1/cache/cardtrader_blueprints_pokemon.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_stamped_finish_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/cardtrader_stamped_finish_acquisition_v1';
const SOURCE_KEY = 'cardtrader_stamped_finish';
const SOURCE_URL = 'https://www.cardtrader.com/en/manasearch/5/blueprints.json';

const ACTIVE_CHILD_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);
const BLOCKED_SOURCE_FAMILY_PATTERNS = [
  /\bprize pack\b/i,
];

function parseArgs(argv) {
  const options = { dryRun: false, sets: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) counts[fn(row)] = (counts[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/\benglish\b/g, ' ')
    .replace(/\bblack star promos?\b/g, 'black star promo')
    .replace(/\bpromos?\b/g, 'promo')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardTraderUrl(id) {
  return `https://www.cardtrader.com/en/cards/${encodeURIComponent(id)}`;
}

function parseBlueprintName(value) {
  const decoded = decodeHtml(value);
  const [nameAndVariant, numberPart] = decoded.split(/\s+\|\s+/);
  if (!nameAndVariant || !numberPart) return null;
  const [cardName, ...variantParts] = nameAndVariant.split(/\s+-\s+/);
  return {
    card_name: cardName?.trim() ?? '',
    variant_label: variantParts.join(' - ').trim(),
    card_number: numberPart.trim().replace(/^[A-Z]{2,}\s+/i, ''),
  };
}

function finishFromLabel(value) {
  const label = comparable(value);
  if (/\bnon\s*holo\b|\bnonholo\b/.test(label)) return 'normal';
  if (/\bcosmos\s+holo\b/.test(label)) return 'cosmos';
  if (/\bcracked\s+ice\b/.test(label)) return 'cracked_ice';
  if (/\breverse\s+holo\b/.test(label)) return 'reverse';
  if (/\bholo\b|\bholographic\b/.test(label)) return 'holo';
  return null;
}

function blueprintFact(row) {
  if (row.g !== 5 || !row.n || !row.x) return null;
  const parsed = parseBlueprintName(row.n);
  if (!parsed) return null;
  const finishKey = finishFromLabel(`${parsed.variant_label} ${row.id}`);
  if (!ACTIVE_CHILD_FINISHES.has(finishKey)) return null;
  return {
    source_id: row.id,
    source_url: cardTraderUrl(row.id),
    source_title: decodeHtml(row.n),
    set_name: decodeHtml(row.x),
    card_number: normalizeNumber(parsed.card_number),
    card_name: parsed.card_name,
    variant_label: parsed.variant_label,
    finish_key: finishKey,
    raw: row,
  };
}

function rowKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    comparable(row.card_name),
    normalizeText(row.proposed_variant_key ?? row.variant_key),
  ].join('|');
}

function targetRows(report, options) {
  return (report.rows ?? [])
    .map((row) => ({
      ...row,
      proposed_variant_key: row.proposed_variant_key ?? row.variant_key,
    }))
    .filter((row) => (
      row.routing_status === 'blocked_missing_exact_finish_phrase'
      || row.queue_status === 'active_finish_required'
    ))
    .filter((row) => row.proposed_variant_key && row.proposed_variant_key !== 'stamped')
    .filter((row) => row.action_bucket !== 'display_metadata_no_write')
    .filter((row) => !row.live_satisfied)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function setMatches(row, blueprint) {
  const left = setComparable(row.set_name);
  const right = setComparable(blueprint.set_name);
  return left === right || left.includes(right) || right.includes(left);
}

function variantMatches(row, blueprint) {
  const label = comparable(`${blueprint.variant_label} ${blueprint.source_id}`);
  const variantKey = normalizeText(row.proposed_variant_key ?? row.variant_key);
  const stampLabel = comparable(row.stamp_label);

  if (variantKey === 'jr_stamp_rally') return /\bjr\s+stamp\s+rally\b/.test(label);
  if (variantKey === 'staff_stamp') return /\bstaff\b/.test(label);
  if (variantKey === 'prerelease_stamp') return /\bpre\s*release\b|\bprerelease\b/.test(label) && !/\bstaff\b/.test(label);
  if (variantKey === 'battle_academy_deck_mark') return /\bbattle\s+academy\b/.test(label);
  if (variantKey === 'play_pokemon_stamp') return /\bplay\b/.test(label) && /\bpokemon\b/.test(label);
  if (stampLabel) {
    const terms = stampLabel.split(/\s+/).filter((term) => term.length > 2);
    if (terms.length >= 2 && terms.every((term) => label.includes(term))) return true;
  }
  return false;
}

function sourceFamilyBlocker(row, blueprint) {
  const label = `${blueprint.variant_label} ${blueprint.source_id}`;
  for (const pattern of BLOCKED_SOURCE_FAMILY_PATTERNS) {
    if (pattern.test(label)) return 'blocked_source_family_mismatch_prize_pack';
  }
  if (row.proposed_variant_key === 'battle_academy_deck_mark') {
    return 'blocked_battle_academy_deck_mark_identity_not_exact_enough';
  }
  return null;
}

function findMatches(targets, blueprints) {
  const blueprintFacts = blueprints.map(blueprintFact).filter(Boolean);
  const results = [];
  const recordsBySet = new Map();

  for (const target of targets) {
    const candidates = blueprintFacts.filter((blueprint) => (
      setMatches(target, blueprint)
      && normalizeNumber(blueprint.card_number) === normalizeNumber(target.card_number)
      && comparable(blueprint.card_name) === comparable(target.card_name)
      && variantMatches(target, blueprint)
    ));
    const blockedCandidates = candidates
      .map((candidate) => ({ candidate, blocker: sourceFamilyBlocker(target, candidate) }))
      .filter((entry) => entry.blocker);
    const usableCandidates = candidates.filter((candidate) => !sourceFamilyBlocker(target, candidate));

    if (usableCandidates.length === 0) {
      results.push({
        ...target,
        status: blockedCandidates.length > 0 ? blockedCandidates[0].blocker : 'no_exact_cardtrader_match',
        candidate_count: candidates.length,
        candidate_titles: candidates.slice(0, 8).map((candidate) => candidate.source_title),
        source_urls: candidates.slice(0, 8).map((candidate) => candidate.source_url),
      });
      continue;
    }

    const finishKeys = [...new Set(usableCandidates.map((candidate) => candidate.finish_key))].sort();
    if (usableCandidates.length !== 1 || finishKeys.length !== 1) {
      results.push({
        ...target,
        status: 'blocked_multiple_matching_stamp_variants',
        candidate_count: usableCandidates.length,
        candidate_finish_keys: finishKeys,
        candidate_titles: usableCandidates.slice(0, 8).map((candidate) => candidate.source_title),
        source_urls: usableCandidates.slice(0, 8).map((candidate) => candidate.source_url),
      });
      continue;
    }

    const accepted = usableCandidates[0];
    if (!(target.base_parent_child_finishes ?? []).includes(accepted.finish_key)) {
      results.push({
        ...target,
        status: 'blocked_claimed_finish_not_on_base_parent',
        accepted_finish_key: accepted.finish_key,
        candidate_titles: [accepted.source_title],
        source_urls: [accepted.source_url],
      });
      continue;
    }

    const record = {
      source_key: SOURCE_KEY,
      source_kind: 'marketplace_checklist',
      source_url: accepted.source_url,
      set_key: target.set_key,
      set_name: target.set_name,
      card_number: target.card_number,
      card_name: target.card_name,
      finish_key: accepted.finish_key,
      rarity: null,
      evidence_type: 'finish_presence',
      evidence_label: `CardTrader exact stamped finish: ${accepted.source_title}`,
      language: 'en',
      retrieved_at: null,
      raw_snapshot_ref: `cardtrader_blueprint:${accepted.source_id}`,
      notes: 'Exact stamped active-finish evidence accepted only when CardTrader had one matching set/card/number/stamp-family title with an explicit active finish phrase.',
    };
    if (!recordsBySet.has(target.set_key)) recordsBySet.set(target.set_key, []);
    recordsBySet.get(target.set_key).push(record);
    results.push({
      ...target,
      status: 'accepted_exact_finish_match',
      accepted_finish_key: accepted.finish_key,
      accepted_source_title: accepted.source_title,
      accepted_source_url: accepted.source_url,
      accepted_raw_snapshot_ref: record.raw_snapshot_ref,
      candidate_count: 1,
    });
  }

  return { blueprintFacts, recordsBySet, results };
}

async function writeFixtures(recordsBySet, generatedAt, dryRun) {
  const fixtureFiles = [];
  if (dryRun) return fixtureFiles;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  for (const [setKey, records] of recordsBySet.entries()) {
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    const deduped = [...new Map(records.map((record) => [
      `${normalizeText(record.set_key)}|${normalizeNumber(record.card_number)}|${comparable(record.card_name)}|${normalizeText(record.finish_key)}|${record.raw_snapshot_ref}`,
      { ...record, retrieved_at: generatedAt },
    ])).values()];
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `${SOURCE_KEY}_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: SOURCE_URL,
      source_status: 'available_generated',
      set_key: setKey,
      set_name: deduped[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      generation_note: 'Generated from CardTrader Pokemon blueprint cache. Exact set/card-number/card-name/stamp-family/active-finish matches only.',
      records: deduped,
    };
    await writeJson(file, fixture);
    fixtureFiles.push(file);
  }
  return fixtureFiles;
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'accepted_exact_finish_match')
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.proposed_variant_key,
      row.accepted_finish_key,
      row.accepted_source_url,
    ]);
  const blockedRows = report.results
    .filter((row) => row.status !== 'accepted_exact_finish_match')
    .slice(0, 80)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.proposed_variant_key,
      row.status,
      row.candidate_count ?? 0,
    ]);

  return `# CardTrader Stamped Finish Acquisition V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

## Safety

- dry_run: ${report.dry_run}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- target_rows: ${report.summary.target_rows}
- cardtrader_blueprint_rows: ${report.summary.cardtrader_blueprint_rows}
- parsed_blueprint_finish_rows: ${report.summary.parsed_blueprint_finish_rows}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Accepted Exact Matches

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'source'], acceptedRows) : 'No exact matches were accepted.'}

## Blocked Sample

${blockedRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'status', 'candidate_count'], blockedRows) : 'No blocked rows.'}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [input, blueprints] = await Promise.all([
    readJson(INPUT_JSON),
    readJson(BLUEPRINT_CACHE),
  ]);
  const targets = targetRows(input, options);
  const { blueprintFacts, recordsBySet, results } = findMatches(targets, blueprints);
  const fixtureFiles = await writeFixtures(recordsBySet, generatedAt, options.dryRun);
  const accepted = results.filter((row) => row.status === 'accepted_exact_finish_match');
  const payloadForFingerprint = accepted.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    accepted_finish_key: row.accepted_finish_key,
    accepted_source_url: row.accepted_source_url,
  }));
  const report = {
    version: 'english_master_index_cardtrader_stamped_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: SOURCE_URL,
    rule: 'Only exact CardTrader Pokemon blueprint matches on set, card number, card name, stamp family, and explicit active finish label emit fixture evidence.',
    blocked_rule: 'Battle Academy deck-mark rows and Prize Pack source-family rows are review-only because they do not safely prove the target stamped identity.',
    fingerprint_sha256: sha256(stableJson(payloadForFingerprint)),
    summary: {
      target_rows: targets.length,
      cardtrader_blueprint_rows: blueprints.length,
      parsed_blueprint_finish_rows: blueprintFacts.length,
      records_generated: accepted.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(accepted, (row) => row.accepted_finish_key),
      by_variant: countBy(results, (row) => row.proposed_variant_key),
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };

  await writeJson(path.join(REPORT_DIR, 'cardtrader_stamped_finish_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'cardtrader_stamped_finish_acquisition_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
