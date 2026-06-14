import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_EXHAUSTION_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const WAREHOUSE_CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'warehouse');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const OUTPUT_DIR = path.join(SOURCE_EXHAUSTION_DIR, 'pkg17i2_stamp_label_source_acquisition_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'pkg17i2_stamp_label_source_acquisition_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'pkg17i2_stamp_label_source_acquisition_v1.md');

const PACKAGE_ID = 'PKG-17I2-STAMP-LABEL-SOURCE-ACQUISITION';
const EXCLUDED_DIR_PARTS = new Set(['node_modules', '.git', 'build', '.dart_tool']);

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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedName(value) {
  return normalizeText(text(value)).replace(/[^a-z0-9]+/g, ' ').trim();
}

function numberPlain(value) {
  const first = text(value).split('/')[0].trim();
  const stripped = first.replace(/^0+(?=\d)/, '');
  return stripped || first;
}

function targetKey(row) {
  return [
    row.set_key,
    numberPlain(row.card_number),
    normalizedName(row.card_name),
  ].join('|');
}

function sourceKeyFromObject(object) {
  const setKey = text(object.set_key)
    || text(object.effective_set_code)
    || text(object.set_code)
    || text(object.target_set_key);
  const number = text(object.card_number)
    || text(object.source_card_number)
    || text(object.printed_number)
    || text(object.number)
    || text(object.source_number_plain);
  const name = text(object.card_name) || text(object.name);
  if (!setKey || !number || !name) return null;
  return [setKey, numberPlain(number), normalizedName(name)].join('|');
}

function stampLabelFromObject(object) {
  return text(object.stamp_label)
    || text(object.expanded_stamp_label)
    || text(object.target_stamp_label)
    || text(object.proposed_stamp_label);
}

function variantKeyFromObject(object) {
  return text(object.variant_key)
    || text(object.expanded_variant_key)
    || text(object.target_variant_key)
    || text(object.proposed_variant_key);
}

function sourceUrlFromObject(object) {
  const urls = [
    object.source_url,
    object.url,
    ...(Array.isArray(object.source_urls) ? object.source_urls : []),
    ...(Array.isArray(object.preserved_evidence_urls) ? object.preserved_evidence_urls : []),
  ].filter(Boolean).map(String);
  return urls[0] ?? null;
}

function sourceKindFromObject(object, filePath) {
  return text(object.source_kind)
    || text(object.source_key)
    || (filePath.includes('checkpoints/warehouse') ? 'internal_warehouse_checkpoint' : 'audit_artifact');
}

function evidenceLabelFromObject(object) {
  return text(object.evidence_label)
    || text(object.notes)
    || text(object.label)
    || text(object.raw_snapshot_ref)
    || null;
}

function walkObjects(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, visitor);
    return;
  }
  if (!value || typeof value !== 'object') return;
  visitor(value);
  for (const child of Object.values(value)) walkObjects(child, visitor);
}

async function listJsonFiles(startDir) {
  const files = [];
  async function visit(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (EXCLUDED_DIR_PARTS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(full);
      }
    }
  }
  await visit(startDir);
  return files;
}

async function loadCandidateRows(targetKeys) {
  const files = [
    ...(await listJsonFiles(SOURCE_EXHAUSTION_DIR)),
    ...(await listJsonFiles(WAREHOUSE_CHECKPOINT_DIR)),
  ];
  const candidates = [];
  for (const filePath of files) {
    let parsed;
    try {
      parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      continue;
    }
    walkObjects(parsed, (object) => {
      const stampLabel = stampLabelFromObject(object);
      const variantKey = variantKeyFromObject(object);
      if (!stampLabel && !variantKey) return;
      const key = sourceKeyFromObject(object);
      if (!key || !targetKeys.has(key)) return;
      candidates.push({
        match_key: key,
        stamp_label: stampLabel || null,
        variant_key: variantKey || null,
        source_url: sourceUrlFromObject(object),
        source_kind: sourceKindFromObject(object, filePath),
        source_file: rel(filePath),
        evidence_label: evidenceLabelFromObject(object),
      });
    });
  }
  return candidates;
}

function classifyTarget(row, candidates) {
  const labels = [...new Set(candidates.map((candidate) => candidate.stamp_label).filter(Boolean))].sort();
  const variants = [...new Set(candidates.map((candidate) => candidate.variant_key).filter(Boolean))].sort();
  const externalEvidence = candidates.filter((candidate) => candidate.source_url);
  const externalLabels = [...new Set(externalEvidence.map((candidate) => candidate.stamp_label).filter(Boolean))].sort();

  let status = 'blocked_no_candidate_label_found';
  const blockers = [];
  if (labels.length === 1 && externalLabels.length === 1 && externalLabels[0] === labels[0]) {
    status = 'candidate_external_exact_label_found';
    blockers.push('requires_independent_review_before_write');
  } else if (labels.length === 1) {
    status = 'candidate_internal_checkpoint_label_found';
    blockers.push('internal_checkpoint_not_external_truth');
  } else if (labels.length > 1) {
    status = 'blocked_conflicting_candidate_labels';
    blockers.push(`conflicting_candidate_labels_${labels.join('_')}`);
  } else if (variants.length > 0) {
    status = 'blocked_variant_key_without_label';
    blockers.push('variant_key_without_human_label');
  } else {
    blockers.push('no_matching_stamp_label_source_found');
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    status,
    candidate_stamp_labels: labels,
    candidate_variant_keys: variants,
    candidate_source_count: candidates.length,
    external_candidate_source_count: externalEvidence.length,
    blockers,
    evidence: candidates.slice(0, 12),
    write_ready_now: 0,
  };
}

function sourceFamily(filePath) {
  const normalized = filePath.toLowerCase();
  if (normalized.includes('tcgcsv')) return 'tcgcsv';
  if (normalized.includes('pricecharting')) return 'pricecharting';
  if (normalized.includes('pokecardvalues')) return 'pokecardvalues';
  if (normalized.includes('pokescope')) return 'pokescope';
  if (normalized.includes('binderbuilder')) return 'binderbuilder';
  if (normalized.includes('bulbapedia')) return 'bulbapedia';
  if (normalized.includes('manual_web')) return 'manual_web';
  if (normalized.includes('checkpoints/warehouse')) return 'warehouse_checkpoint';
  return 'other';
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const setRows = Object.entries(report.summary.by_set).slice(0, 20).map(([set, count]) => [set, count]);
  const sourceRows = Object.entries(report.summary.by_source_family).map(([family, count]) => [family, count]);
  const candidateRows = report.rows
    .filter((row) => row.status !== 'blocked_no_candidate_label_found')
    .slice(0, 80)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.finish_key ?? '',
      row.status,
      row.candidate_stamp_labels.join(', '),
      row.external_candidate_source_count,
    ]);

  return `# PKG-17I2 Stamp Label Source Acquisition V1

Audit-only mining pass for rows where Grookai has generic stamped evidence but lacks an exact stamp label.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- target_rows: ${report.summary.target_rows}
- candidate_external_exact_label_found: ${report.summary.by_status.candidate_external_exact_label_found ?? 0}
- candidate_internal_checkpoint_label_found: ${report.summary.by_status.candidate_internal_checkpoint_label_found ?? 0}
- blocked_conflicting_candidate_labels: ${report.summary.by_status.blocked_conflicting_candidate_labels ?? 0}
- blocked_no_candidate_label_found: ${report.summary.by_status.blocked_no_candidate_label_found ?? 0}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Status Counts

${markdownTable(['status', 'rows'], statusRows)}

## Source Families Seen

${markdownTable(['source_family', 'candidate rows'], sourceRows)}

## Top Sets

${markdownTable(['set', 'rows'], setRows)}

## Candidate Label Rows

${candidateRows.length ? markdownTable(['set', 'number', 'card', 'finish', 'status', 'candidate labels', 'external sources'], candidateRows) : 'No candidate stamp labels were found in existing artifacts.'}

## Rule

This report does not promote rows. Candidate labels from prior artifacts must become a separate readiness package with explicit source URLs, evidence labels, rollback-only dry-run, fingerprint, and approval before any write.
`;
}

async function main() {
  const queue = await readJson(INPUT_JSON);
  const targets = (queue.rows ?? []).filter((row) => row.queue_status === 'stamp_identity_label_needed');
  const targetKeys = new Set(targets.map(targetKey));
  const candidates = await loadCandidateRows(targetKeys);
  const candidatesByKey = new Map();
  for (const candidate of candidates) {
    const list = candidatesByKey.get(candidate.match_key) ?? [];
    list.push(candidate);
    candidatesByKey.set(candidate.match_key, list);
  }
  const rows = targets.map((row) => classifyTarget(row, candidatesByKey.get(targetKey(row)) ?? []));
  const sourceFamilies = candidates.map((candidate) => sourceFamily(candidate.source_file));
  const payload = {
    input_fingerprint: queue.fingerprint_sha256,
    rows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'pkg17i2_stamp_label_source_acquisition_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifact: rel(INPUT_JSON),
    scanned_roots: [rel(SOURCE_EXHAUSTION_DIR), rel(WAREHOUSE_CHECKPOINT_DIR)],
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: targets.length,
      candidate_objects_matched: candidates.length,
      unique_rows_with_candidates: rows.filter((row) => row.candidate_source_count > 0).length,
      unique_rows_with_external_candidates: rows.filter((row) => row.external_candidate_source_count > 0).length,
      by_status: countBy(rows, (row) => row.status),
      by_set: countBy(rows, (row) => row.set_key),
      by_source_family: countBy(sourceFamilies.map((family) => ({ family })), (row) => row.family),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
