import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CURRENT_NEXT_ACTION_QUEUE = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_next_action_queue_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_small_custom_stamp_preserved_crosscheck_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_small_custom_stamp_preserved_crosscheck_v1.md',
);

const SOURCE_ARTIFACTS = [
  'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json',
  'english_master_index_pkg15_stamped_explicit_finish_readiness_v1.json',
  'english_master_index_pkg15f_stamped_finish_source_attack_plan_v1.json',
  'english_master_index_pkg15g_remaining_stamped_source_exhaustion_v1.json',
  'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json',
  'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json',
  'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1.json',
  'english_master_index_pkg17i_stamped_remaining_blocker_triage_v1.json',
  'english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1.json',
  'english_master_index_pkg18_stamped_completion_governance_plan_v1.json',
  'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json',
  'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json',
  'english_master_index_stamped_special_next_action_queue_v1.json',
  'english_master_index_stamped_special_overnight_source_pass_v1.json',
  'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.json',
  'english_master_index_dv1_stamp_holo_second_wave_guarded_dry_run_v1.json',
  'english_master_index_pkg40b_residual_stamped_active_finish_route_evidence_v1.json',
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function rowKey(row) {
  return `${row.set_key}|${row.card_number}|${normalizeText(row.card_name)}`;
}

function variantValue(row) {
  return row.variant_key ?? row.proposed_variant_key ?? row.target_variant_key ?? null;
}

function stampValue(row) {
  return row.stamp_label ?? row.target_stamp_label ?? null;
}

function finishValue(row) {
  return row.accepted_finish_key
    ?? row.target_finish_key
    ?? row.finish_key
    ?? row.proposed_finish_key
    ?? row.adjudicated_finish_key
    ?? null;
}

function sourceListFrom(row, key) {
  const value = row[key];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return [];
}

function evidenceItems(row) {
  const evidence = row.evidence_records ?? row.evidence ?? [];
  if (Array.isArray(evidence)) return evidence.filter((item) => item && typeof item === 'object');
  if (evidence && typeof evidence === 'object') return [evidence];
  return [];
}

function urlsFromRow(row) {
  const urls = [
    ...sourceListFrom(row, 'source_url'),
    ...sourceListFrom(row, 'source_urls'),
    ...sourceListFrom(row, 'preserved_evidence_urls'),
    ...sourceListFrom(row, 'evidence_urls'),
  ];
  for (const evidence of evidenceItems(row)) {
    if (evidence?.source_url) urls.push(evidence.source_url);
    if (Array.isArray(evidence?.source_urls)) urls.push(...evidence.source_urls);
  }
  return [...new Set(urls)].sort();
}

function labelsFromRow(row) {
  const labels = [
    ...sourceListFrom(row, 'evidence_label'),
    ...sourceListFrom(row, 'evidence_labels'),
    ...sourceListFrom(row, 'preserved_evidence_labels'),
  ];
  for (const evidence of evidenceItems(row)) {
    if (evidence?.evidence_label) labels.push(evidence.evidence_label);
    if (evidence?.evidence_text_or_label) labels.push(evidence.evidence_text_or_label);
  }
  return [...new Set(labels.filter(Boolean))].sort();
}

function familiesFromRow(row, artifactName) {
  const families = [
    ...sourceListFrom(row, 'source_family'),
    ...sourceListFrom(row, 'source_families'),
    ...sourceListFrom(row, 'source_key'),
    ...sourceListFrom(row, 'preserved_evidence_sources'),
  ];
  for (const evidence of evidenceItems(row)) {
    if (evidence?.source_family) families.push(evidence.source_family);
    if (evidence?.source_key) families.push(evidence.source_key);
    if (evidence?.source_name) families.push(evidence.source_name);
  }
  if (!families.length) families.push(artifactName.replace(/^english_master_index_/, '').replace(/_v1\.json$/, ''));
  return [...new Set(families.filter(Boolean))].sort();
}

function flattenArtifactRows(value, bucket = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        const keys = Object.keys(item);
        if (
          keys.includes('set_key')
          && keys.includes('card_number')
          && (keys.includes('card_name') || keys.includes('name'))
        ) {
          bucket.push(item);
        }
        flattenArtifactRows(item, bucket);
      }
    }
    return bucket;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) flattenArtifactRows(item, bucket);
  }
  return bucket;
}

function variantMatches(target, candidate) {
  const targetVariant = normalizeText(variantValue(target));
  const candidateVariant = normalizeText(variantValue(candidate));
  const targetStamp = normalizeText(stampValue(target));
  const candidateStamp = normalizeText(stampValue(candidate));
  if (targetVariant && candidateVariant && targetVariant === candidateVariant) return true;
  if (targetStamp && candidateStamp && targetStamp === candidateStamp) return true;
  return false;
}

function evidenceFromCandidate(target, candidate, artifactName) {
  if (rowKey(target) !== rowKey(candidate)) return null;
  if (!variantMatches(target, candidate)) return null;

  const status = candidate.status
    ?? candidate.readiness_status
    ?? candidate.routing_status
    ?? candidate.queue_status
    ?? candidate.source_readiness_status
    ?? null;
  const finish = finishValue(candidate);
  const sourceFamilies = familiesFromRow(candidate, artifactName);
  const urls = urlsFromRow(candidate);
  const labels = labelsFromRow(candidate);

  return {
    artifact: artifactName,
    status,
    finish_key: finish,
    variant_key: variantValue(candidate),
    stamp_label: stampValue(candidate),
    source_families: sourceFamilies,
    source_urls: urls,
    evidence_labels: labels,
    readiness_blockers: candidate.blockers ?? [],
    package_ready: Boolean(
      candidate.target_child_id
      || candidate.target_parent_id
      || status === 'ready_for_guarded_dry_run'
      || candidate.write_ready_for_approval === true
    ),
  };
}

function classifyEvidence(evidence) {
  const exact = evidence.filter((item) => item.finish_key);
  const exactFamilies = new Set(exact.flatMap((item) => item.source_families));
  const hasPriorPackage = exact.some((item) => item.package_ready);
  const blocked = evidence.some((item) => {
    const status = normalizeText(item.status);
    return status.includes('blocked') || status.includes('ambiguous') || status.includes('conflict');
  });

  if (blocked && exactFamilies.size > 0) {
    return {
      crosscheck_status: 'exact_finish_seen_but_governance_blocked',
      source_count: exactFamilies.size,
      next_action: 'Do not promote. Exact finish appears in preserved context, but governance/status blockers must be adjudicated before any readiness package.',
    };
  }
  if (blocked) {
    return {
      crosscheck_status: 'manual_review_or_governance_blocked',
      source_count: exactFamilies.size,
      next_action: 'Do not promote. Existing preserved context is blocked, ambiguous, or conflicts with exact finish routing.',
    };
  }
  if (exactFamilies.size >= 2) {
    return {
      crosscheck_status: 'preserved_two_source_exact_finish_candidate',
      source_count: exactFamilies.size,
      next_action: 'Potential future guarded dry-run candidate after fresh collision/dependency check. No write is prepared here.',
    };
  }
  if (hasPriorPackage && exact.length > 0) {
    return {
      crosscheck_status: 'prior_guarded_package_exact_finish_candidate',
      source_count: exactFamilies.size,
      next_action: 'Prior guarded package evidence exists. Re-run fresh readiness before any approval packet because this report is no-write.',
    };
  }
  if (exactFamilies.size === 1) {
    return {
      crosscheck_status: 'single_source_exact_finish_needs_second_source',
      source_count: exactFamilies.size,
      next_action: 'Acquire one independent exact source for the same set, number, card, stamp, and finish.',
    };
  }
  if (evidence.length > 0) {
    return {
      crosscheck_status: 'preserved_variant_evidence_finish_unresolved',
      source_count: 0,
      next_action: 'Existing evidence supports identity or stamp context but not the active finish.',
    };
  }
  return {
    crosscheck_status: 'no_preserved_finish_evidence',
    source_count: 0,
    next_action: 'Fresh source acquisition required.',
  };
}

function buildMarkdown(report) {
  const usefulRows = report.rows.filter((row) => row.crosscheck_status !== 'no_preserved_finish_evidence');
  return `# Small Custom Stamp Preserved Evidence Crosscheck V1

Audit-only crosscheck of the current \`small_custom_stamp_exact_source\` queue against preserved stamped/special artifacts.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['preserved_two_source_exact_finish_candidate', report.summary.by_crosscheck_status.preserved_two_source_exact_finish_candidate ?? 0],
    ['prior_guarded_package_exact_finish_candidate', report.summary.by_crosscheck_status.prior_guarded_package_exact_finish_candidate ?? 0],
    ['single_source_exact_finish_needs_second_source', report.summary.by_crosscheck_status.single_source_exact_finish_needs_second_source ?? 0],
    ['exact_finish_seen_but_governance_blocked', report.summary.by_crosscheck_status.exact_finish_seen_but_governance_blocked ?? 0],
    ['manual_review_or_governance_blocked', report.summary.by_crosscheck_status.manual_review_or_governance_blocked ?? 0],
    ['preserved_variant_evidence_finish_unresolved', report.summary.by_crosscheck_status.preserved_variant_evidence_finish_unresolved ?? 0],
    ['no_preserved_finish_evidence', report.summary.by_crosscheck_status.no_preserved_finish_evidence ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Useful Preserved Leads

${markdownTable(
    ['status', 'set', 'number', 'card', 'stamp', 'finish evidence', 'source count', 'next action'],
    usefulRows.map((row) => [
      row.crosscheck_status,
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.evidence.map((item) => item.finish_key).filter(Boolean).join(', ') || 'unresolved',
      row.source_count,
      row.next_action,
    ]),
  )}

## Rows Still Needing Fresh Exact Sources

${markdownTable(
    ['set', 'number', 'card', 'stamp', 'first query'],
    report.rows
      .filter((row) => [
        'preserved_variant_evidence_finish_unresolved',
        'no_preserved_finish_evidence',
        'single_source_exact_finish_needs_second_source',
        'manual_review_or_governance_blocked',
        'exact_finish_seen_but_governance_blocked',
      ].includes(row.crosscheck_status))
      .slice(0, 60)
      .map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.stamp_label,
        row.search_queries?.[0] ?? '',
      ]),
  )}

## Safety

- No DB writes.
- No migrations.
- No SQL generated.
- Stamp identity evidence is not promoted into exact finish truth.
- Any candidate from prior artifacts still requires fresh guarded readiness before approval.
`;
}

async function main() {
  const currentNextActionQueue = await readJson(CURRENT_NEXT_ACTION_QUEUE);
  const targetRows = (currentNextActionQueue.rows ?? []).filter((row) => row.action_bucket === 'small_custom_stamp_exact_source');
  const evidenceByKey = new Map();
  const usedArtifacts = [];

  for (const artifactName of SOURCE_ARTIFACTS) {
    const artifactPath = path.join(AUDIT_DIR, artifactName);
    if (!(await pathExists(artifactPath))) continue;
    usedArtifacts.push(path.relative(ROOT, artifactPath).replaceAll('\\', '/'));
    const artifact = await readJson(artifactPath);
    for (const candidate of flattenArtifactRows(artifact)) {
      for (const target of targetRows) {
        const evidence = evidenceFromCandidate(target, candidate, artifactName);
        if (!evidence) continue;
        const key = `${rowKey(target)}|${normalizeText(target.variant_key)}|${normalizeText(target.stamp_label)}`;
        if (!evidenceByKey.has(key)) evidenceByKey.set(key, []);
        evidenceByKey.get(key).push(evidence);
      }
    }
  }

  const rows = targetRows.map((row) => {
    const key = `${rowKey(row)}|${normalizeText(row.variant_key)}|${normalizeText(row.stamp_label)}`;
    const evidence = [
      ...new Map((evidenceByKey.get(key) ?? []).map((item) => [
        stableJson({
          artifact: item.artifact,
          status: item.status,
          finish_key: item.finish_key,
          families: item.source_families,
          urls: item.source_urls,
        }),
        item,
      ])).values(),
    ];
    const classification = classifyEvidence(evidence);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      final_status: row.final_status,
      search_queries: row.search_queries,
      evidence,
      ...classification,
      write_ready_now: false,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_small_custom_stamp_preserved_crosscheck_v1',
    input_packet: path.relative(ROOT, CURRENT_NEXT_ACTION_QUEUE).replaceAll('\\', '/'),
    source_artifacts: usedArtifacts,
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      sql_generated: false,
    },
    summary: {
      target_rows: rows.length,
      write_ready_now: 0,
      by_crosscheck_status: countBy(rows, (row) => row.crosscheck_status),
      by_variant_key: countBy(rows, (row) => row.variant_key),
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      crosscheck_status: row.crosscheck_status,
      source_count: row.source_count,
      evidence: row.evidence.map((item) => ({
        artifact: item.artifact,
        finish_key: item.finish_key,
        status: item.status,
        source_families: item.source_families,
      })),
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    target_rows: report.summary.target_rows,
    by_crosscheck_status: report.summary.by_crosscheck_status,
    write_ready_now: report.summary.write_ready_now,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
