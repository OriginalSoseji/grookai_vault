import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const REVIEW_JSON = path.join(AUDIT_DIR, 'live_capture_human_review_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'second_source_finish_acquisition_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'second_source_finish_acquisition_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04K-SECOND-SOURCE-FINISH-ACQUISITION';

const ACQUIRED_FINISH_ROWS = [
  {
    parent_id: '542686fb-9987-4003-b83b-b1eda3d75c73',
    set_code: 'dp1',
    number: '98',
    name: 'Shinx',
    variant_key: 'city_championships_stamp',
    family: 'championship_stamp',
    finish_key: 'normal',
    evidence_status: 'approved_for_guarded_dry_run',
    acquisition_reason: 'Resolved live reverse ambiguity by using exact non-holo City Championships sources for the stamped variant.',
    evidence_sources: [
      {
        source_key: 'pokecardvalues',
        source_kind: 'collector_reference',
        source_url: 'https://pokecardvalues.co.uk/cards/shinx-98-130-non-holo-city-championships-diamond-pearl/dp1-98-2-23/',
        evidence_label: 'Shinx - 98/130 - Non-Holo - City Championships - Promo',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pokumon',
        source_kind: 'collector_reference',
        source_url: 'https://pokumon.com/card/shinx-98-130-city-championships-special-print/',
        evidence_label: 'Shinx (98/130 City Championships Special Print) - Non-holo City Championships promo',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-diamond-%26-pearl/shinx-city-championships-98',
        evidence_label: 'Shinx #98/130 Diamond & Pearl Non-Holo City Championships listing title evidence',
        evidence_type: 'finish_presence',
      },
    ],
  },
  {
    parent_id: 'd5a6eb73-48d5-4173-a2bd-d091545efefa',
    set_code: 'swsh9',
    number: '123',
    name: 'Arceus VSTAR',
    variant_key: 'league_stamp',
    family: 'league_stamp',
    finish_key: 'holo',
    evidence_status: 'approved_for_guarded_dry_run',
    acquisition_reason: 'Second source acquired: Magic Madhouse exact Prize Pack League Promo product page identifies the card and rarity as Rare Holo VSTAR.',
    evidence_sources: [
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-brilliant-stars/arceus-vstar-league-promo-123',
        evidence_label: 'Arceus VSTAR [League Promo] #123 sale title: Pokemon Brilliant Stars Holo Ultra Rare League Promo 123/172',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'magic_madhouse',
        source_kind: 'marketplace_checklist',
        source_url: 'https://magicmadhouse.co.uk/pokemon-brilliant-stars-123-172-arceus-vstar-prize-pack-league-promo',
        evidence_label: 'Brilliant Stars 123/172 Arceus VSTAR (Prize Pack League Promo); rarity Rare Holo VSTAR',
        evidence_type: 'finish_presence',
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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function renderMarkdown(report) {
  return [
    '# Second Source Finish Acquisition V1',
    '',
    'Read-only source acquisition for live-capture review rows. This promotes evidence status only inside the report; it does not write to the database.',
    '',
    '## Safety',
    '',
    markdownTable(
      ['check', 'value'],
      [
        ['db_writes_performed', String(report.db_writes_performed)],
        ['migrations_created', String(report.migrations_created)],
        ['cleanup_performed', String(report.cleanup_performed)],
        ['real_apply_performed', String(report.real_apply_performed)],
      ],
    ),
    '',
    '## Approved Dry-Run Candidates',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant', 'finish', 'sources', 'reason'],
      report.acquired_finish_rows.map((row) => [
        row.set_code,
        row.number,
        row.name,
        row.variant_key || row.family,
        row.finish_key,
        row.evidence_sources.map((source) => source.source_key).join(', '),
        row.acquisition_reason,
      ]),
    ),
    '',
    '## Next Move',
    '',
    '- Build a guarded rollback-only dry-run for only the approved rows.',
    '- Do not apply until dry-run proof is generated and explicitly approved.',
    '- Keep all other live-capture rows blocked.',
    '',
  ].join('\n');
}

async function main() {
  const review = await readJson(REVIEW_JSON);
  const reviewedParentIds = new Set((review.review_rows ?? []).map((row) => row.parent_id));
  const acquiredRows = ACQUIRED_FINISH_ROWS.map((row) => ({
    ...row,
    review_artifact_parent_present: reviewedParentIds.has(row.parent_id),
  }));
  const missingReviewRows = acquiredRows.filter((row) => !row.review_artifact_parent_present);
  if (missingReviewRows.length) {
    throw new Error(`Acquired rows missing from 04J review artifact: ${missingReviewRows.map((row) => row.parent_id).join(', ')}`);
  }

  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    review_fingerprint: review.fingerprint_sha256,
    acquired_rows: acquiredRows.map((row) => ({
      parent_id: row.parent_id,
      finish_key: row.finish_key,
      evidence_urls: row.evidence_sources.map((source) => source.source_url),
      evidence_labels: row.evidence_sources.map((source) => source.evidence_label),
    })),
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_second_source_acquisition',
    fingerprint_sha256: fingerprint,
    input_artifacts: {
      live_capture_human_review: rel(REVIEW_JSON),
    },
    summary: {
      acquired_finish_rows: acquiredRows.length,
      approved_for_guarded_dry_run: acquiredRows.filter((row) => row.evidence_status === 'approved_for_guarded_dry_run').length,
      by_finish: countBy(acquiredRows, (row) => row.finish_key),
      by_family: countBy(acquiredRows, (row) => row.family),
    },
    acquired_finish_rows: acquiredRows,
    recommended_next_package: {
      package_id: 'MISSING-PROMO-04L-SECOND-SOURCE-FINISH-CHILD-INSERT-DRY-RUN',
      mode: 'guarded_rollback_dry_run',
      scope: `${acquiredRows.length} child-only card_printing candidates from second-source finish acquisition.`,
      real_apply_authorized: false,
    },
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_performed: false,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    fingerprint_sha256: fingerprint,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    summary: report.summary,
    recommended_next_package: report.recommended_next_package,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
