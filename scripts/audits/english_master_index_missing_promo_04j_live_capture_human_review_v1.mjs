import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const LIVE_CAPTURE_JSON = path.join(AUDIT_DIR, 'live_finish_snapshot_capture_v1.json');
const ENRICHMENT_BLOCKER_JSON = 'docs/audits/card_row_enrichment_v1/card_row_enrichment_residual_blocker_audit_v1.json';
const OUTPUT_JSON = path.join(AUDIT_DIR, 'live_capture_human_review_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'live_capture_human_review_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04J-LIVE-CAPTURE-HUMAN-REVIEW';

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

function findCardPrintEvidence(root, parentId) {
  const hits = [];
  function walk(value) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (value.card_print_id === parentId) hits.push(value);
    for (const child of Object.values(value)) walk(child);
  }
  walk(root);
  return hits;
}

function reviewDecision(row, enrichmentEvidence) {
  if (row.parent_id === '542686fb-9987-4003-b83b-b1eda3d75c73') {
    return {
      review_status: 'blocked_conflicting_finish_evidence',
      candidate_finish_key: row.extracted_finish_key,
      approved_finish_key: null,
      reason: 'Live Bulbapedia snippet places reverse holo, City Championships stamp, Staff stamp, and Japanese Cosmos context in adjacent prose. Existing preserved enrichment evidence explicitly identifies the City Championships special print as non-holo, so reverse cannot be promoted.',
      required_next_evidence: 'Resolve City Championships Shinx finish using a dedicated source pair that explicitly says Shinx 98/130 City Championships stamp + finish. If non-holo remains authoritative, build a separate normal child dry-run rather than reverse.',
      conflicting_evidence: enrichmentEvidence.flatMap((hit) => hit.external_ids?.verified_master_index_v1?.evidence_context?.matching_manual_web_finish_context ?? []),
    };
  }

  if (row.parent_id === 'd5a6eb73-48d5-4173-a2bd-d091545efefa') {
    return {
      review_status: 'blocked_needs_second_source',
      candidate_finish_key: row.extracted_finish_key,
      approved_finish_key: null,
      reason: 'The only clean League Promo finish signal is a PriceCharting/eBay-derived title. ThePriceDex confirms base Arceus VSTAR #123 is Rare Holo VSTAR, but does not independently prove the League-stamped variant finish.',
      required_next_evidence: 'Find one additional independent source that explicitly says Arceus VSTAR 123/172 League Promo/League Stamp + Holo/Rare Holo VSTAR.',
      conflicting_evidence: [],
    };
  }

  return {
    review_status: 'blocked_unreviewed_candidate',
    candidate_finish_key: row.extracted_finish_key,
    approved_finish_key: null,
    reason: 'No explicit review rule exists for this live-capture candidate.',
    required_next_evidence: 'Manual review required before dry-run.',
    conflicting_evidence: [],
  };
}

function renderMarkdown(report) {
  return [
    '# Live Capture Human Review V1',
    '',
    'Manual governance pass over live-capture finish candidates. This report is intentionally conservative: no child-printing dry-run is created unless finish evidence is clean and independently supported.',
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
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['reviewed_candidates', report.summary.reviewed_candidates],
        ['approved_for_dry_run', report.summary.by_review_status.approved_for_dry_run ?? 0],
        ['blocked_conflicting_finish_evidence', report.summary.by_review_status.blocked_conflicting_finish_evidence ?? 0],
        ['blocked_needs_second_source', report.summary.by_review_status.blocked_needs_second_source ?? 0],
      ],
    ),
    '',
    '## Decisions',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant', 'candidate finish', 'decision', 'reason'],
      report.review_rows.map((row) => [
        row.set_code,
        row.number,
        row.name,
        row.variant_key || row.printed_identity_modifier || row.family,
        row.candidate_finish_key || '-',
        row.review_status,
        row.reason,
      ]),
    ),
    '',
    '## Next Move',
    '',
    '- Do not apply either reviewed candidate from the live capture artifact.',
    '- Shinx needs conflict resolution before any child finish insert.',
    '- Arceus VSTAR League Promo needs a second independent exact finish source.',
    '',
  ].join('\n');
}

async function main() {
  const [liveCapture, enrichmentBlocker] = await Promise.all([
    readJson(LIVE_CAPTURE_JSON),
    readJson(ENRICHMENT_BLOCKER_JSON),
  ]);

  const candidates = (liveCapture.rows ?? []).filter((row) => row.capture_status === 'exact_finish_review_candidate');
  const reviewRows = candidates.map((row) => {
    const enrichmentEvidence = findCardPrintEvidence(enrichmentBlocker, row.parent_id);
    return {
      parent_id: row.parent_id,
      set_code: row.set_code,
      number: row.number,
      name: row.name,
      family: row.family,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      gv_id: row.gv_id,
      live_capture_status: row.capture_status,
      live_capture_evidence_candidates: row.evidence_candidates,
      enrichment_evidence: enrichmentEvidence.map((hit) => ({
        card_print_id: hit.card_print_id,
        gv_id: hit.gv_id,
        evidence_context: hit.external_ids?.verified_master_index_v1?.evidence_context ?? null,
        independent_finish_sources: hit.external_ids?.verified_master_index_v1?.independent_finish_sources ?? [],
      })),
      ...reviewDecision(row, enrichmentEvidence),
    };
  });

  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    live_capture_fingerprint: liveCapture.fingerprint_sha256,
    review_rows: reviewRows.map((row) => ({
      parent_id: row.parent_id,
      candidate_finish_key: row.candidate_finish_key,
      approved_finish_key: row.approved_finish_key,
      review_status: row.review_status,
      reason: row.reason,
    })),
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_human_review_governance',
    fingerprint_sha256: fingerprint,
    input_artifacts: {
      live_finish_snapshot_capture: rel(LIVE_CAPTURE_JSON),
      enrichment_residual_blocker_audit: rel(ENRICHMENT_BLOCKER_JSON),
    },
    summary: {
      reviewed_candidates: reviewRows.length,
      by_review_status: countBy(reviewRows, (row) => row.review_status),
      approved_for_dry_run_count: reviewRows.filter((row) => row.review_status === 'approved_for_dry_run').length,
    },
    review_rows: reviewRows,
    recommended_next_package: {
      package_id: 'MISSING-PROMO-04K-SECOND-SOURCE-FINISH-ACQUISITION',
      mode: 'read_only_source_acquisition',
      scope: 'Resolve blocked review candidates and continue exact finish acquisition for remaining special/stamped parents.',
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
