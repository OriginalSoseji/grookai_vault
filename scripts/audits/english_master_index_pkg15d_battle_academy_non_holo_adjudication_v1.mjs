import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const ROUTING_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15d_battle_academy_non_holo_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15d_battle_academy_non_holo_adjudication_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260611_pkg15d_battle_academy_non_holo_adjudication_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-15D-BATTLE-ACADEMY-NON-HOLO-ADJUDICATION';

const EXACT_ADJUDICATIONS = {
  'smp|SM65|alolan raichu': {
    target_variant_key: 'battle_academy_deck_mark',
    target_stamp_label: 'Battle Academy Deck Mark',
    target_finish_key: 'normal',
    stamp_family: 'Battle Academy 2020',
    evidence: [
      {
        source_key: 'bulbapedia_battle_academy_2020',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2020_(TCG)',
        evidence_label: 'Battle Academy 2020 page states Non Holofoil print x2 of SM Black Star Promos Alolan Raichu and decklist row lists Alolan Raichu [SM Promo 65; Non Holofoil].',
        supports: ['card_identity', 'stamp_family', 'normal_finish'],
      },
      {
        source_key: 'pricecharting_promo_product_sales',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/alolan-raichu-sm65',
        evidence_label: 'PriceCharting exact Alolan Raichu SM65 product includes Battle Academy stamped and non-holo sale labels.',
        supports: ['card_identity', 'stamp_family', 'normal_finish_review_support'],
      },
    ],
  },
};

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function factKey(row) {
  return [row.set_key, row.card_number, normalizeText(row.card_name)].join('|');
}

function classify(row) {
  const adjudication = EXACT_ADJUDICATIONS[factKey(row)];
  if (!adjudication) {
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      original_variant_key: row.proposed_variant_key,
      original_stamp_label: row.stamp_label,
      target_variant_key: null,
      target_stamp_label: null,
      target_finish_key: null,
      adjudication_status: 'blocked_no_exact_non_holo_source',
      blockers: ['no_exact_non_holo_adjudication'],
      evidence: [],
    };
  }

  const blockers = [];
  if (!(row.base_parent_child_finishes ?? []).includes(adjudication.target_finish_key)) {
    blockers.push(`base_parent_missing_${adjudication.target_finish_key}_finish`);
  }
  if (row.proposed_variant_key !== adjudication.target_variant_key) {
    blockers.push('variant_key_mismatch');
  }
  if (adjudication.evidence.length < 2) {
    blockers.push('source_count_below_two');
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    original_variant_key: row.proposed_variant_key,
    original_stamp_label: row.stamp_label,
    target_variant_key: adjudication.target_variant_key,
    target_stamp_label: adjudication.target_stamp_label,
    target_finish_key: adjudication.target_finish_key,
    stamp_family: adjudication.stamp_family,
    base_parent_ids: row.base_parent_ids ?? [],
    base_parent_child_finishes: row.base_parent_child_finishes ?? [],
    evidence: adjudication.evidence,
    adjudication_status: blockers.length === 0
      ? 'ready_for_guarded_normal_stamped_identity_route'
      : 'blocked_after_adjudication',
    blockers,
    write_shape_after_approval: blockers.length === 0
      ? 'insert stamped canonical parent with deterministic variant_key plus normal child printing'
      : 'none',
  };
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_adjudication_status).map(([status, count]) => [status, count]);
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.original_variant_key,
    row.target_variant_key ?? '',
    row.target_finish_key ?? '',
    row.adjudication_status,
  ]);

  return `# PKG-15D Battle Academy Non-Holo Adjudication V1

Audit-only adjudication for Battle Academy deck-mark stamped blockers. This accepts only exact card-level Non Holofoil evidence and does not infer finish from deck membership.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- reviewed_rows: ${report.summary.reviewed_rows}
- ready_rows_after_adjudication: ${report.summary.ready_rows_after_adjudication}
- blocked_rows_after_adjudication: ${report.summary.blocked_rows_after_adjudication}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['adjudication_status', 'rows'], summaryRows)}

## Rows

${markdownTable(['set', 'number', 'name', 'original_variant', 'target_variant', 'target_finish', 'status'], rows)}
`;
}

function checkpointMarkdown(report) {
  return `# PKG-15D Battle Academy Non-Holo Adjudication Checkpoint V1

- package_id: ${report.package_id}
- generated_at: ${report.generated_at}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`
- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## Outcome

- ready_rows_after_adjudication: ${report.summary.ready_rows_after_adjudication}
- blocked_rows_after_adjudication: ${report.summary.blocked_rows_after_adjudication}

Only exact Battle Academy Non Holofoil source evidence is accepted. Deck membership alone remains blocked.
`;
}

function updateCheckpointIndex() {
  const line = '| 2026-06-11 | [PKG-15D Battle Academy Non-Holo Adjudication Checkpoint V1](20260611_pkg15d_battle_academy_non_holo_adjudication_checkpoint_v1.md) | Audit-only Battle Academy deck-mark finish adjudication; 1 exact Non Holofoil row ready, broad deck membership remains blocked. No writes or migrations. |';
  const current = fsSync.existsSync(CHECKPOINT_INDEX) ? fsSync.readFileSync(CHECKPOINT_INDEX, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260611_pkg15d_battle_academy_non_holo_adjudication_checkpoint_v1.md')) {
    fsSync.writeFileSync(CHECKPOINT_INDEX, current.split('\n').map((existingLine) => (
      existingLine.includes('20260611_pkg15d_battle_academy_non_holo_adjudication_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const routing = await readJson(ROUTING_JSON);
  const sourceRows = (routing.rows ?? []).filter((row) => row.proposed_variant_key === 'battle_academy_deck_mark');
  const rows = sourceRows.map(classify);
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    target_variant_key: row.target_variant_key,
    target_finish_key: row.target_finish_key,
    adjudication_status: row.adjudication_status,
    evidence_urls: row.evidence.map((source) => source.source_url).sort(),
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15d_battle_academy_non_holo_adjudication_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_finish_routing_readiness: path.relative(ROOT, ROUTING_JSON).replaceAll(path.sep, '/'),
    },
    summary: {
      reviewed_rows: rows.length,
      ready_rows_after_adjudication: rows.filter((row) => row.adjudication_status === 'ready_for_guarded_normal_stamped_identity_route').length,
      blocked_rows_after_adjudication: rows.filter((row) => row.adjudication_status !== 'ready_for_guarded_normal_stamped_identity_route').length,
      by_adjudication_status: countBy(rows, (row) => row.adjudication_status),
      by_target_variant_key: countBy(rows, (row) => row.target_variant_key ?? 'none'),
      by_target_finish_key: countBy(rows, (row) => row.target_finish_key ?? 'none'),
    },
    governance_rules: [
      'Battle Academy deck membership is not finish evidence by itself.',
      'Only exact Non Holofoil checklist language can route Battle Academy deck-mark rows to normal.',
      'Marketplace sale titles are support context only unless exact set, number, name, stamp, and finish are present.',
    ],
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson(payload));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, checkpointMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    reviewed_rows: report.summary.reviewed_rows,
    ready_rows_after_adjudication: report.summary.ready_rows_after_adjudication,
    blocked_rows_after_adjudication: report.summary.blocked_rows_after_adjudication,
    fingerprint_sha256: report.fingerprint_sha256,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
