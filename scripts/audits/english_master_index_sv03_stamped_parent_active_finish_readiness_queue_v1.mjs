import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join('docs', 'audits', 'english_master_index_source_exhaustion_v1');
const ADDITIONAL_JSON = path.join(SOURCE_DIR, 'sv03_bulbapedia_additional_stamped_active_finish_v1', 'sv03_bulbapedia_additional_stamped_active_finish_v1.json');
const PRODUCT_JSON = path.join(SOURCE_DIR, 'sv03_product_family_stamped_finish_review_v1', 'sv03_product_family_stamped_finish_review_v1.json');
const OUT_BASENAME = 'english_master_index_sv03_stamped_parent_active_finish_readiness_queue_v1';
const OUT_JSON = path.join(MASTER_DIR, `${OUT_BASENAME}.json`);
const OUT_MD = path.join(MASTER_DIR, `${OUT_BASENAME}.md`);
const MIRROR_JSON = path.join(SOURCE_DIR, `${OUT_BASENAME}.json`);
const MIRROR_MD = path.join(SOURCE_DIR, `${OUT_BASENAME}.md`);

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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) counts[fn(row) || 'unknown'] = (counts[fn(row) || 'unknown'] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rowKey(row) {
  return [
    row.set_key,
    String(row.card_number ?? '').trim(),
    normalizeText(row.card_name),
  ].join('|');
}

function exactAdditionalEvidence(row) {
  return (row.observations ?? [])
    .filter((observation) => observation.status === 'accepted_active_finish_and_stamped_identity_review_candidate')
    .map((observation) => ({
      source_lane: 'bulbapedia_obsidian_flames_additional_cards',
      source_url: observation.source_url,
      proposed_finish_key: observation.accepted_finish_key,
      stamp_identity_keys: observation.stamp_identity_keys ?? [],
      evidence_label: observation.evidence_label,
      evidence_strength: 'same-row-active-finish-plus-stamped-identity',
    }));
}

function productEvidence(row) {
  return (row.observations ?? [])
    .filter((observation) => String(observation.status ?? '').startsWith('review_candidate_'))
    .map((observation) => {
      const identityByFamily = {
        trick_or_trade_2024: ['pikachu_jack_o_lantern_stamp'],
        holiday_calendar_2024: ['snowflake_symbol'],
        play_pokemon_prize_pack: ['play_pokemon_stamp'],
        bulbapedia_ex_regular_card_page: ['play_pokemon_stamp'],
      };
      return {
        source_lane: observation.source_family,
        source_url: observation.source_url,
        proposed_finish_key: observation.proposed_finish_key,
        stamp_identity_keys: identityByFamily[observation.source_family] ?? [],
        evidence_label: observation.evidence_label,
        evidence_strength: 'product-family-active-finish-review-candidate',
      };
    });
}

function chooseVariantKeys(row, evidence) {
  const identities = new Set([
    ...(row.stamp_identity_keys ?? []),
    ...evidence.flatMap((item) => item.stamp_identity_keys ?? []),
  ]);
  identities.delete('jumbo_stamp');
  return [...identities].sort();
}

function classify(row, targetVariantKey, evidence) {
  const finishes = [...new Set(evidence.map((item) => item.proposed_finish_key).filter(Boolean))].sort();
  const blockers = [];
  if (evidence.length === 0) blockers.push('no_active_finish_evidence');
  if (finishes.length === 0) blockers.push('no_proposed_active_finish');
  if (finishes.length > 1) blockers.push(`conflicting_active_finish_candidates:${finishes.join(',')}`);
  if (!targetVariantKey) blockers.push('no_specific_stamped_identity_key');
  if (targetVariantKey === 'jumbo_stamp') blockers.push('jumbo_identity_excluded_from_canonical_child_write');
  const hasSameRowEvidence = evidence.some((item) => item.evidence_strength === 'same-row-active-finish-plus-stamped-identity');
  const hasProductEvidence = evidence.some((item) => item.evidence_strength === 'product-family-active-finish-review-candidate');

  let readiness_status = 'blocked';
  if (blockers.length === 0 && hasSameRowEvidence && hasProductEvidence) {
    readiness_status = 'review_ready_multi_lane_active_finish';
  } else if (blockers.length === 0 && hasSameRowEvidence) {
    readiness_status = 'review_ready_same_row_source_only';
  } else if (blockers.length === 0 && hasProductEvidence) {
    readiness_status = 'review_ready_product_family_only';
  } else if (finishes.length > 1) {
    readiness_status = 'blocked_conflicting_active_finish_candidates';
  } else {
    readiness_status = 'blocked_active_finish_not_proven';
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    stamp_identity_keys: row.stamp_identity_keys ?? [],
    target_variant_key: targetVariantKey,
    candidate_variant_keys: targetVariantKey ? [targetVariantKey] : [],
    proposed_finish_keys: finishes,
    proposed_finish_key: finishes.length === 1 ? finishes[0] : null,
    readiness_status,
    blockers,
    write_ready_now: 0,
    evidence,
  };
}

function explodeByStampedIdentity(row) {
  const identities = chooseVariantKeys(row, row.evidence);
  if (identities.length === 0) {
    return [classify(row, null, row.evidence)];
  }
  return identities.map((identity) => classify(
    row,
    identity,
    row.evidence.filter((item) => (item.stamp_identity_keys ?? []).includes(identity)),
  ));
}

function renderMarkdown(report) {
  const summaryRows = [
    ['target_rows', report.summary.target_rows],
    ['review_ready_rows', report.summary.review_ready_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['conflict_rows', report.summary.conflict_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ];
  const rowTable = report.rows.map((row) => [
    row.card_number,
    row.card_name,
    row.readiness_status,
    row.candidate_variant_keys.join(', '),
    row.proposed_finish_keys.join(', '),
    row.blockers.join(', '),
  ]);
  return `# English Master Index SV03 Stamped Parent Active Finish Readiness Queue V1

Generated: ${report.generated_at}

Audit-only readiness queue. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Summary

${markdownTable(['metric', 'value'], summaryRows)}

## Status Counts

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_readiness_status))}

## Rows

${markdownTable(['number', 'card', 'readiness', 'variant_keys', 'finish', 'blockers'], rowTable)}

## Rule

Rows in this queue are not apply authority. A DB package still requires fresh DB snapshot, collision checks, guarded rollback-only dry-run, SQL hash, dry-run proof, and explicit approval. Rows with conflicting active finish candidates, jumbo-only identity, generic stamped identity, or product-family-only evidence remain blocked from write execution.
`;
}

async function main() {
  const [additional, product] = await Promise.all([
    readJson(ADDITIONAL_JSON),
    readJson(PRODUCT_JSON),
  ]);

  const byKey = new Map();
  for (const row of additional.results ?? []) {
    byKey.set(rowKey(row), {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      stamp_identity_keys: row.stamp_identity_keys ?? [],
      evidence: exactAdditionalEvidence(row),
    });
  }
  for (const row of product.results ?? []) {
    const key = rowKey(row);
    const target = byKey.get(key) ?? {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      stamp_identity_keys: row.stamp_identity_keys ?? [],
      evidence: [],
    };
    target.stamp_identity_keys = [...new Set([
      ...(target.stamp_identity_keys ?? []),
      ...(row.stamp_identity_keys ?? []),
    ])].sort();
    target.evidence.push(...productEvidence(row));
    byKey.set(key, target);
  }

  const rows = [...byKey.values()]
    .flatMap(explodeByStampedIdentity)
    .sort((left, right) => Number(left.card_number) - Number(right.card_number)
      || String(left.card_name).localeCompare(String(right.card_name)));
  const report = {
    version: OUT_BASENAME,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      additional_cards_review: ADDITIONAL_JSON.replaceAll('\\', '/'),
      product_family_review: PRODUCT_JSON.replaceAll('\\', '/'),
    },
    fingerprint_sha256: sha256(stableJson(rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      readiness_status: row.readiness_status,
      candidate_variant_keys: row.candidate_variant_keys,
      proposed_finish_keys: row.proposed_finish_keys,
      blockers: row.blockers,
    })))),
    summary: {
      target_rows: rows.length,
      review_ready_rows: rows.filter((row) => row.readiness_status.startsWith('review_ready_')).length,
      blocked_rows: rows.filter((row) => row.readiness_status.startsWith('blocked_')).length,
      conflict_rows: rows.filter((row) => row.readiness_status === 'blocked_conflicting_active_finish_candidates').length,
      write_ready_now: 0,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_proposed_finish: countBy(rows.flatMap((row) => row.proposed_finish_keys), (finish) => finish),
    },
    rows,
    safety_confirmation: {
      audit_only: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };
  const markdown = renderMarkdown(report);
  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, markdown);
  await writeJson(MIRROR_JSON, report);
  await writeText(MIRROR_MD, markdown);
  console.log(JSON.stringify({
    output_json: OUT_JSON,
    mirror_json: MIRROR_JSON,
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
