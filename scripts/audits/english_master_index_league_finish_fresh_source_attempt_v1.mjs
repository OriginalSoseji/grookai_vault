import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_league_finish_preserved_crosscheck_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_league_finish_fresh_source_attempt_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_league_finish_fresh_source_attempt_v1.md');

const SOURCE_ATTEMPTS = [
  {
    set_key: 'sv10',
    card_number: '81',
    card_name: "Team Rocket's Mewtwo ex",
    searched_for_variant: 'league_stamp',
    searched_for_stamp_label: 'League Stamp',
    source_key: 'pricecharting_destined_rivals_prize_pack',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pricecharting.com/game/pokemon-destined-rivals/team-rocket%27s-mewtwo-ex-prize-pack-81',
    evidence_label: "PriceCharting page labels Team Rocket's Mewtwo ex #81 as Prize Pack, with eBay listings mentioning Prize Pack / Play Stamp.",
    observed_variant_or_stamp: 'prize_pack_or_play_stamp',
    observed_finish_key: null,
    source_result: 'wrong_variant_not_accepted',
    notes: 'This is useful for Prize Pack/Play Stamp governance, but it does not prove the current League Stamp target.',
  },
  {
    set_key: 'swsh4',
    card_number: '153',
    card_name: 'League Staff',
    searched_for_variant: 'league_cup_staff_stamp',
    searched_for_stamp_label: 'League Cup Staff Stamp',
    source_key: 'misprint_related_marketplace_data',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.misprint.com/card/5767993?authority=Ungraded&scale=MP',
    evidence_label: 'Misprint related marketplace row references 2020 #153 League Staff-Reverse Foil Professor Program Pokemon Sword & Shield Vivid Voltage.',
    observed_variant_or_stamp: 'professor_program_or_league_staff',
    observed_finish_key: 'reverse',
    source_result: 'finish_supported_taxonomy_review_required',
    notes: 'Supports reverse finish as an independent source, but label taxonomy conflicts with the target League Cup Staff Stamp lane. Do not promote until taxonomy is adjudicated.',
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function rowKey(row) {
  return `${row.set_key}|${row.card_number}|${String(row.card_name).toLowerCase()}`;
}

function buildMarkdown(report) {
  return `# League Finish Fresh Source Attempt V1

Audit-only fresh source attempt for the smallest current league-finish targets.

## Summary

${markdownTable(['metric', 'value'], [
    ['source_attempts', report.summary.source_attempts],
    ['accepted_promotable_evidence', report.summary.accepted_promotable_evidence],
    ['wrong_variant_not_accepted', report.summary.by_source_result.wrong_variant_not_accepted ?? 0],
    ['finish_supported_taxonomy_review_required', report.summary.by_source_result.finish_supported_taxonomy_review_required ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Source Attempts

${markdownTable(
    ['result', 'set', 'number', 'card', 'target stamp', 'observed', 'finish', 'source', 'notes'],
    report.rows.map((row) => [
      row.source_result,
      row.set_key,
      row.card_number,
      row.card_name,
      row.searched_for_stamp_label,
      row.observed_variant_or_stamp,
      row.observed_finish_key ?? 'unresolved',
      row.source_url,
      row.notes,
    ]),
  )}

## Decision

- Team Rocket's Mewtwo ex #81 is not accepted for the League Stamp lane because the found source supports Prize Pack / Play Stamp context.
- League Staff #153 remains blocked because the fresh source supports reverse finish but introduces Professor Program / League Staff taxonomy ambiguity.
- No evidence from this attempt is promotable without adjudication or another exact source.

## Safety

- No DB writes.
- No migrations.
- No parent inserts.
- No child inserts.
- No generic promotion from marketplace titles.
`;
}

async function main() {
  const crosscheck = await readJson(INPUT_JSON);
  const currentTargetsByKey = new Map((crosscheck.rows ?? []).map((row) => [rowKey(row), row]));
  const rows = SOURCE_ATTEMPTS.map((attempt) => ({
    ...attempt,
    current_target_found: currentTargetsByKey.has(rowKey(attempt)),
    current_crosscheck_status: currentTargetsByKey.get(rowKey(attempt))?.crosscheck_status ?? null,
    write_ready_now: false,
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_league_finish_fresh_source_attempt_v1',
    input_report: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
    },
    summary: {
      source_attempts: rows.length,
      accepted_promotable_evidence: 0,
      write_ready_now: 0,
      by_source_result: countBy(rows, (row) => row.source_result),
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      source_key: row.source_key,
      source_result: row.source_result,
      observed_finish_key: row.observed_finish_key,
      observed_variant_or_stamp: row.observed_variant_or_stamp,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    source_attempts: report.summary.source_attempts,
    accepted_promotable_evidence: report.summary.accepted_promotable_evidence,
    by_source_result: report.summary.by_source_result,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
