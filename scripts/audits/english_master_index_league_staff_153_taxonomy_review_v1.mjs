import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const QUEUE_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_league_staff_153_taxonomy_review_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_league_staff_153_taxonomy_review_v1.md');

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function renderMarkdown(report) {
  return `# League Staff 153 Taxonomy Review V1

Audit-only taxonomy review for the single League Stamp row that had one exact finish source.

## Decision

Do not promote.

The sources support that Vivid Voltage League Staff #153 has a Reverse Holo / reverse foil lane, but the additional sources do not support the queued \`league_cup_staff_stamp\` label. They point to Professor Program / generic reverse wording instead.

## Target

${markdownTable(['field', 'value'], [
    ['set_key', report.target.set_key],
    ['set_name', report.target.set_name],
    ['card_number', report.target.card_number],
    ['card_name', report.target.card_name],
    ['queued_variant_key', report.target.variant_key],
    ['queued_stamp_label', report.target.stamp_label],
    ['candidate_finish_key', report.candidate_finish_key],
    ['review_status', report.review_status],
  ])}

## Evidence

${markdownTable(
    ['source', 'source kind', 'supports finish', 'supports queued stamp', 'observed label', 'url'],
    report.evidence_sources.map((row) => [
      row.source_key,
      row.source_kind,
      row.supports_finish_key ?? '',
      row.supports_queued_stamp,
      row.observed_stamp_or_variant_label,
      row.source_url,
    ]),
  )}

## Reason

- PriceCharting supports a reverse-holo page for League Staff #153.
- Pokellector text says Reverse Holo Professor Program Stamp, not League Cup Staff Stamp.
- Misprint related text also points to Professor Program wording for League Staff-Reverse Foil.
- Official Pokemon confirms only the base Vivid Voltage card identity, not a stamped variant.

The row remains a taxonomy blocker, not a write candidate.

## Safety

- No DB writes.
- No migrations.
- No parent inserts.
- No child inserts.
- No promotion from mismatched stamp labels.
`;
}

async function main() {
  const queue = await readJson(QUEUE_JSON);
  const target = (queue.rows ?? []).find((row) => (
    row.set_key === 'swsh4' &&
    String(row.card_number) === '153' &&
    row.card_name === 'League Staff' &&
    row.variant_key === 'league_cup_staff_stamp'
  ));

  if (!target) throw new Error('Target League Staff #153 league_cup_staff_stamp row not found in next action queue.');

  const evidenceSources = [
    {
      source_key: 'pricecharting_reverse_holo',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/game/pokemon-vivid-voltage/league-staff-reverse-holo-153',
      supports_finish_key: 'reverse',
      supports_queued_stamp: false,
      observed_stamp_or_variant_label: 'League Staff [Reverse Holo]',
      evidence_label: 'PriceCharting reverse-holo page for League Staff #153.',
    },
    {
      source_key: 'pokellector_card_page',
      source_kind: 'collector_reference',
      source_url: 'https://www.pokellector.com/Vivid-Voltage-Expansion/League-Staff-Card-153',
      supports_finish_key: 'reverse',
      supports_queued_stamp: false,
      observed_stamp_or_variant_label: 'Reverse Holo Professor Program Stamp',
      evidence_label: 'Pokellector page text identifies Reverse Holo Professor Program Stamp, not League Cup Staff Stamp.',
    },
    {
      source_key: 'misprint_related_marketplace_text',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.misprint.com/card/13658702',
      supports_finish_key: 'reverse',
      supports_queued_stamp: false,
      observed_stamp_or_variant_label: 'League Staff-Reverse Foil Professor Program',
      evidence_label: 'Misprint related listing text points to Professor Program wording.',
    },
    {
      source_key: 'official_pokemon_card_database',
      source_kind: 'official_gallery',
      source_url: 'https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/swsh4/153/',
      supports_finish_key: null,
      supports_queued_stamp: false,
      observed_stamp_or_variant_label: 'Base Vivid Voltage League Staff identity only',
      evidence_label: 'Official card page confirms base card identity only.',
    },
  ];

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_league_staff_153_taxonomy_review_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      queue_json: rel(QUEUE_JSON),
    },
    target: {
      set_key: target.set_key,
      set_name: target.set_name,
      card_number: target.card_number,
      card_name: target.card_name,
      variant_key: target.variant_key,
      stamp_label: target.stamp_label,
    },
    candidate_finish_key: 'reverse',
    review_status: 'finish_supported_but_queued_stamp_label_not_supported',
    recommended_action: 'Do not promote the league_cup_staff_stamp row. Create/adjudicate a separate professor_program_stamp lane only if the Master Index source standard is satisfied.',
    evidence_sources: evidenceSources,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    target: report.target,
    candidate_finish_key: report.candidate_finish_key,
    review_status: report.review_status,
    evidence_sources: report.evidence_sources,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    review_status: report.review_status,
    write_ready_now: report.write_ready_now,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
