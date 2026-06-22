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
const PRESERVED_ABSORPTION = path.join(
  AUDIT_DIR,
  'english_master_index_pkg17o_league_preserved_evidence_absorption_v1.json',
);
const POKEMONFLASHFIRE_SOURCE = path.join(
  AUDIT_DIR,
  'english_master_index_pkg17p_pokemonflashfire_league_reverse_source_v1.json',
);
const POKEMONFLASHFIRE_LIVE = path.join(
  AUDIT_DIR,
  'english_master_index_pkg18o_pokemonflashfire_live_league_reverse_source_v1.json',
);
const POKESCOPE_LIVE = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'pokescope_live_league_variant_acquisition_v1',
  'pokescope_live_league_variant_acquisition_v1.json',
);
const LEAGUE_STAFF_153_TAXONOMY_REVIEW = path.join(
  AUDIT_DIR,
  'english_master_index_league_staff_153_taxonomy_review_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_league_finish_preserved_crosscheck_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_league_finish_preserved_crosscheck_v1.md',
);

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

function rowVariantKey(row) {
  return `${rowKey(row)}|${row.variant_key ?? ''}`;
}

function sourceUrlsFromEvidence(row) {
  const urls = [];
  for (const evidence of row.evidence_records ?? []) {
    if (evidence.source_url) urls.push(evidence.source_url);
  }
  if (row.source_urls) urls.push(...row.source_urls);
  if (row.source_url) urls.push(row.source_url);
  return [...new Set(urls)].sort();
}

function sourceFamiliesFromEvidence(row) {
  const families = [];
  for (const evidence of row.evidence_records ?? []) {
    if (evidence.source_family) families.push(evidence.source_family);
    else if (evidence.source_key) families.push(evidence.source_key);
  }
  if (row.source_key) families.push(row.source_key);
  return [...new Set(families)].sort();
}

function addEvidence(map, sourceName, row, fields = {}) {
  const key = rowKey(row);
  if (!map.has(key)) map.set(key, []);
  map.get(key).push({
    source_name: sourceName,
    readiness_status: row.readiness_status ?? row.status ?? row.evidence_type ?? null,
    finish_key: row.finish_key ?? row.proposed_finish_key ?? null,
    source_urls: sourceUrlsFromEvidence(row),
    source_families: sourceFamiliesFromEvidence(row),
    evidence_label: row.evidence_label ?? row.evidence_text_or_label ?? null,
    reason: row.reason ?? null,
    ...fields,
  });
}

function classifyRow(row, evidence) {
  const taxonomyConflict = evidence.find((item) => item.readiness_status === 'finish_supported_but_queued_stamp_label_not_supported');
  if (taxonomyConflict) {
    return {
      crosscheck_status: 'manual_review_or_governance_blocked',
      next_action: 'Do not promote. Exact finish is supported, but source labels do not support the queued stamp lane.',
      source_count: 0,
    };
  }

  const exactFinishEvidence = evidence.filter((item) => item.finish_key && item.finish_key !== 'unknown');
  const exactSourceFamilies = new Set(exactFinishEvidence.flatMap((item) => item.source_families.length ? item.source_families : [item.source_name]));
  const hasManualReview = evidence.some((item) => String(item.readiness_status).includes('manual_review') || item.reason);
  const hasCrosshatchGovernance = evidence.some((item) => item.readiness_status === 'crosshatch_alias_governance_required_before_dry_run');
  const hasAbsorptionSingleSource = evidence.some((item) => item.readiness_status === 'single_source_exact_active_finish_second_source_needed');

  if (hasManualReview || hasCrosshatchGovernance) {
    return {
      crosscheck_status: 'manual_review_or_governance_blocked',
      next_action: 'Do not promote. Review variant/stamp taxonomy and source context before dry-run.',
      source_count: exactSourceFamilies.size,
    };
  }
  if (exactSourceFamilies.size >= 2) {
    return {
      crosscheck_status: 'preserved_evidence_two_source_candidate',
      next_action: 'Potential dry-run candidate after collision/dependency guard.',
      source_count: exactSourceFamilies.size,
    };
  }
  if (hasAbsorptionSingleSource || exactSourceFamilies.size === 1) {
    return {
      crosscheck_status: 'single_source_exact_finish_still_needs_second_source',
      next_action: 'Acquire one independent exact source for same set, number, card, stamp, and finish.',
      source_count: exactSourceFamilies.size,
    };
  }
  if (evidence.length > 0) {
    return {
      crosscheck_status: 'preserved_variant_evidence_finish_unresolved',
      next_action: 'Existing preserved evidence does not prove exact active finish.',
      source_count: 0,
    };
  }
  return {
    crosscheck_status: 'no_preserved_finish_evidence',
    next_action: 'Fresh source acquisition required.',
    source_count: 0,
  };
}

function buildMarkdown(report) {
  return `# League Finish Preserved Evidence Crosscheck V1

Audit-only crosscheck of the current \`league_finish_exact_source\` queue against preserved league source artifacts.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['two_source_candidates', report.summary.by_crosscheck_status.preserved_evidence_two_source_candidate ?? 0],
    ['single_source_exact_finish_still_needs_second_source', report.summary.by_crosscheck_status.single_source_exact_finish_still_needs_second_source ?? 0],
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
    ['status', 'set', 'number', 'card', 'stamp', 'finish', 'sources', 'next action'],
    report.rows
      .filter((row) => row.crosscheck_status !== 'no_preserved_finish_evidence')
      .map((row) => [
        row.crosscheck_status,
        row.set_key,
        row.card_number,
        row.card_name,
        row.stamp_label,
        row.evidence.map((item) => item.finish_key).filter(Boolean).join(', ') || 'unresolved',
        row.evidence.flatMap((item) => item.source_urls).join(' ; ') || 'none',
        row.next_action,
      ]),
  )}

## Rows Still Needing Fresh Source Acquisition

${markdownTable(
    ['set', 'number', 'card', 'stamp', 'first query'],
    report.rows
      .filter((row) => row.crosscheck_status === 'no_preserved_finish_evidence')
      .slice(0, 50)
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
- No promotion from preserved evidence alone.
- Manual-review/context-conflict rows remain blocked.
`;
}

async function main() {
  const currentNextActionQueue = await readJson(CURRENT_NEXT_ACTION_QUEUE);
  const leagueRows = (currentNextActionQueue.rows ?? []).filter((row) => row.action_bucket === 'league_finish_exact_source');
  const preserved = await readJson(PRESERVED_ABSORPTION);
  const pokemonflashfire = await readJson(POKEMONFLASHFIRE_SOURCE);
  const pokemonflashfireLive = await readJson(POKEMONFLASHFIRE_LIVE);
  const pokescopeLive = await readJson(POKESCOPE_LIVE);
  const leagueStaff153TaxonomyReview = await readJson(LEAGUE_STAFF_153_TAXONOMY_REVIEW);

  const evidenceByKey = new Map();
  for (const row of preserved.rows ?? []) addEvidence(evidenceByKey, 'pkg17o_preserved_absorption', row);
  for (const row of pokemonflashfire.records ?? []) addEvidence(evidenceByKey, 'pkg17p_pokemonflashfire_fixture', row);
  for (const row of pokemonflashfireLive.review_rows ?? []) addEvidence(evidenceByKey, 'pkg18o_pokemonflashfire_live_review', row);
  for (const row of pokescopeLive.rows ?? []) addEvidence(evidenceByKey, 'pokescope_live_variant_acquisition', row);
  if (leagueStaff153TaxonomyReview?.target) {
    const key = rowKey(leagueStaff153TaxonomyReview.target);
    if (!evidenceByKey.has(key)) evidenceByKey.set(key, []);
    evidenceByKey.get(key).push({
      source_name: 'league_staff_153_taxonomy_review',
      readiness_status: leagueStaff153TaxonomyReview.review_status,
      finish_key: leagueStaff153TaxonomyReview.candidate_finish_key,
      source_urls: leagueStaff153TaxonomyReview.evidence_sources.map((row) => row.source_url),
      source_families: leagueStaff153TaxonomyReview.evidence_sources.map((row) => row.source_key),
      evidence_label: 'League Staff #153 exact finish is supported, but queued stamp label is not supported.',
      reason: leagueStaff153TaxonomyReview.recommended_action,
      variant_key: leagueStaff153TaxonomyReview.target.variant_key,
    });
  }

  const rows = leagueRows.map((row) => {
    const evidence = evidenceByKey.get(rowKey(row)) ?? [];
    const classification = classifyRow(row, evidence);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      search_queries: row.search_queries,
      evidence,
      ...classification,
      write_ready_now: false,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_league_finish_preserved_crosscheck_v1',
    input_packet: path.relative(ROOT, CURRENT_NEXT_ACTION_QUEUE).replaceAll('\\', '/'),
    source_artifacts: [
      path.relative(ROOT, PRESERVED_ABSORPTION).replaceAll('\\', '/'),
      path.relative(ROOT, POKEMONFLASHFIRE_SOURCE).replaceAll('\\', '/'),
      path.relative(ROOT, POKEMONFLASHFIRE_LIVE).replaceAll('\\', '/'),
      path.relative(ROOT, POKESCOPE_LIVE).replaceAll('\\', '/'),
      path.relative(ROOT, LEAGUE_STAFF_153_TAXONOMY_REVIEW).replaceAll('\\', '/'),
    ],
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
      target_rows: rows.length,
      write_ready_now: 0,
      by_crosscheck_status: countBy(rows, (row) => row.crosscheck_status),
      by_set: countBy(rows, (row) => row.set_key),
      by_source_count: countBy(rows, (row) => String(row.source_count)),
    },
    rows,
  };

  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      crosscheck_status: row.crosscheck_status,
      source_count: row.source_count,
      evidence: row.evidence.map((item) => ({
        source_name: item.source_name,
        readiness_status: item.readiness_status,
        finish_key: item.finish_key,
        source_urls: item.source_urls,
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
