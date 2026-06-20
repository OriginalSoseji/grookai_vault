import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'remaining_special_gap_source_acquisition_v1.json');
const PLAN_JSON = path.join(AUDIT_DIR, 'special_finish_acquisition_plan_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'special_finish_source_extraction_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'special_finish_source_extraction_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04G-SPECIAL-FINISH-SOURCE-EXTRACTION';

const FINISH_PATTERNS = [
  {
    finish_key: 'reverse',
    confidence: 'exact_preserved_text',
    patterns: [
      /\breverse\s+holo(?:foil)?\b/i,
      /\breverse[-_ ]holo(?:foil)?\b/i,
      /\bmirror\s+reverse\s+holo(?:foil)?\b/i,
    ],
  },
  {
    finish_key: 'cosmos',
    confidence: 'exact_preserved_text',
    patterns: [/\bcosmos\s+holo(?:foil)?\b/i, /\bcosmos\b/i],
  },
  {
    finish_key: 'cracked_ice',
    confidence: 'exact_preserved_text',
    patterns: [/\bcracked[-_ ]ice\s+holo(?:foil)?\b/i, /\bcracked[-_ ]ice\b/i],
  },
  {
    finish_key: 'normal',
    confidence: 'exact_preserved_text',
    patterns: [/\bnon[-_ ]holo(?:foil)?\b/i, /\bnormal\b/i],
  },
  {
    finish_key: 'holo',
    confidence: 'exact_preserved_text',
    patterns: [/\bholofoil\b/i, /\bholo\b/i],
  },
];

const AMBIGUOUS_FINISH_PATTERNS = [
  /\bprice\s+list\b/i,
  /\bvariant row\b/i,
  /\bvariant\b/i,
  /\bstamp\b/i,
  /\bstaff\b/i,
  /\bchampionship\b/i,
  /\bleague\b/i,
  /\bwinner\b/i,
  /\bbattle road\b/i,
  /\bworlds\b/i,
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

function evidencePieces(row) {
  return [
    ...(row.evidence_labels ?? []).map((value) => ({ kind: 'label', value })),
    ...(row.evidence_urls ?? []).map((value) => ({ kind: 'url', value })),
  ].filter((piece) => String(piece.value ?? '').trim());
}

function exactIdentityTermsPresent(row, text) {
  const normalized = text.toLowerCase();
  const nameTerms = String(row.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2);
  const number = String(row.number ?? '').replace(/^0+(?=\d)/, '');
  const hasName = nameTerms.length === 0 || nameTerms.every((term) => normalized.includes(term));
  const hasNumber = !number || normalized.includes(number);
  return hasName && hasNumber;
}

function extractFinishClaims(row) {
  const pieces = evidencePieces(row);
  const claims = [];
  for (const piece of pieces) {
    const text = String(piece.value ?? '');
    const matchedForPiece = [];
    for (const finish of FINISH_PATTERNS) {
      const matchedPattern = finish.patterns.find((pattern) => pattern.test(text));
      if (!matchedPattern) continue;
      if (!exactIdentityTermsPresent(row, text) && piece.kind === 'url') continue;
      matchedForPiece.push({
        finish_key: finish.finish_key,
        confidence: finish.confidence,
        evidence_kind: piece.kind,
        evidence_text_or_url: text,
        matched_pattern: String(matchedPattern),
      });
    }

    const compoundKeys = new Set(['reverse', 'cosmos', 'cracked_ice']);
    const hasCompoundHolo = matchedForPiece.some((claim) => compoundKeys.has(claim.finish_key));
    claims.push(...matchedForPiece.filter((claim) => !(hasCompoundHolo && claim.finish_key === 'holo')));
  }

  const unique = new Map();
  for (const claim of claims) {
    const key = `${claim.finish_key}|${claim.evidence_kind}|${claim.evidence_text_or_url}`;
    unique.set(key, claim);
  }
  return [...unique.values()];
}

function classifyRow(row) {
  const claims = extractFinishClaims(row);
  const finishKeys = [...new Set(claims.map((claim) => claim.finish_key))];
  const text = evidencePieces(row).map((piece) => piece.value).join(' ');
  const hasEvidenceUrls = Number(row.evidence_url_count ?? 0) > 0;
  const hasAmbiguousSourceSignal = AMBIGUOUS_FINISH_PATTERNS.some((pattern) => pattern.test(text));

  if (finishKeys.length === 1) {
    return {
      extraction_status: 'exact_finish_extracted_from_preserved_evidence',
      extracted_finish_key: finishKeys[0],
      finish_claims: claims,
      blocked_reason: null,
    };
  }

  if (finishKeys.length > 1) {
    return {
      extraction_status: 'conflicting_preserved_finish_terms',
      extracted_finish_key: null,
      finish_claims: claims,
      blocked_reason: 'Multiple finish terms appear in preserved evidence; needs manual review before any child printing package.',
    };
  }

  if (hasEvidenceUrls && hasAmbiguousSourceSignal) {
    return {
      extraction_status: 'needs_live_page_capture_or_preserved_snapshot',
      extracted_finish_key: null,
      finish_claims: [],
      blocked_reason: 'Existing evidence supports identity/stamp family but does not preserve exact active finish.',
    };
  }

  if (hasEvidenceUrls) {
    return {
      extraction_status: 'evidence_url_without_finish_text',
      extracted_finish_key: null,
      finish_claims: [],
      blocked_reason: 'URL exists, but preserved label/URL text does not contain exact finish language.',
    };
  }

  return {
    extraction_status: 'no_existing_evidence_url',
    extracted_finish_key: null,
    finish_claims: [],
    blocked_reason: 'No preserved evidence URL exists for source extraction.',
  };
}

function buildRows(rows) {
  return rows.map((row) => {
    const classification = classifyRow(row);
    return {
      parent_id: row.parent_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      name: row.name,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      gv_id: row.gv_id,
      family: row.family,
      acquisition_bucket: row.acquisition_bucket,
      evidence_url_count: row.evidence_url_count,
      evidence_urls: row.evidence_urls ?? [],
      evidence_labels: row.evidence_labels ?? [],
      ...classification,
    };
  });
}

function renderMarkdown(report) {
  const exactRows = report.extracted_rows.filter((row) => row.extraction_status === 'exact_finish_extracted_from_preserved_evidence');
  return [
    '# Special Finish Source Extraction V1',
    '',
    'Read-only extraction from already-preserved evidence labels and URLs. This pass does not fetch live pages, does not insert child printings, and does not write to the database.',
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
        ['rows_scanned', report.summary.rows_scanned],
        ['exact_finish_extracted_from_preserved_evidence', report.summary.by_extraction_status.exact_finish_extracted_from_preserved_evidence ?? 0],
        ['needs_live_page_capture_or_preserved_snapshot', report.summary.by_extraction_status.needs_live_page_capture_or_preserved_snapshot ?? 0],
        ['evidence_url_without_finish_text', report.summary.by_extraction_status.evidence_url_without_finish_text ?? 0],
        ['no_existing_evidence_url', report.summary.by_extraction_status.no_existing_evidence_url ?? 0],
        ['conflicting_preserved_finish_terms', report.summary.by_extraction_status.conflicting_preserved_finish_terms ?? 0],
      ],
    ),
    '',
    '## Extracted Exact Finish Rows',
    '',
    exactRows.length
      ? markdownTable(
        ['set', 'number', 'name', 'family', 'finish', 'evidence'],
        exactRows.map((row) => [
          row.set_code,
          row.number,
          row.name,
          row.family,
          row.extracted_finish_key,
          row.finish_claims.map((claim) => claim.evidence_text_or_url).join('<br>'),
        ]),
      )
      : 'No exact finish rows were extracted from preserved evidence.',
    '',
    '## Next Move',
    '',
    '- Build a guarded dry-run only for the exact extracted rows if the operator accepts preserved text as sufficient evidence.',
    '- Separately build a live/snapshot capture pass for rows marked `needs_live_page_capture_or_preserved_snapshot`.',
    '- Do not promote rows where preserved evidence proves only stamp identity but not active finish.',
    '',
  ].join('\n');
}

async function main() {
  const [sourceReport, plan] = await Promise.all([
    readJson(SOURCE_JSON),
    readJson(PLAN_JSON),
  ]);

  const sourceRows = sourceReport.remaining_childless_special_parents ?? [];
  const extractedRows = buildRows(sourceRows);
  const exactRows = extractedRows.filter((row) => row.extraction_status === 'exact_finish_extracted_from_preserved_evidence');
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint: sourceReport.source_acquisition_fingerprint_sha256,
    plan_fingerprint: plan.fingerprint_sha256,
    exact_rows: exactRows.map((row) => ({
      parent_id: row.parent_id,
      finish_key: row.extracted_finish_key,
      claims: row.finish_claims.map((claim) => claim.evidence_text_or_url),
    })).sort((left, right) => left.parent_id.localeCompare(right.parent_id)),
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_preserved_evidence_extraction',
    fingerprint_sha256: fingerprint,
    input_artifacts: {
      remaining_special_gap_source_acquisition: rel(SOURCE_JSON),
      special_finish_acquisition_plan: rel(PLAN_JSON),
    },
    summary: {
      rows_scanned: extractedRows.length,
      by_extraction_status: countBy(extractedRows, (row) => row.extraction_status),
      exact_rows_by_finish: countBy(exactRows, (row) => row.extracted_finish_key),
      exact_rows_by_family: countBy(exactRows, (row) => row.family),
    },
    extraction_contract: {
      allowed: 'Only explicit finish text already preserved in evidence labels or URLs.',
      disallowed: [
        'Inferring normal from absence of finish text.',
        'Inferring finish from stamp family.',
        'Treating a marketplace/product URL as finish proof unless the preserved text includes the finish.',
        'Using live source volatility in this pass.',
      ],
    },
    extracted_rows: extractedRows,
    recommended_next_package: exactRows.length
      ? {
        package_id: 'MISSING-PROMO-04H-PRESERVED-FINISH-CHILD-INSERT-DRY-RUN',
        mode: 'guarded_dry_run_only',
        scope: `${exactRows.length} exact preserved-evidence child-printing candidates.`,
        real_apply_authorized: false,
      }
      : {
        package_id: 'MISSING-PROMO-04H-LIVE-FINISH-SNAPSHOT-CAPTURE',
        mode: 'read_only_source_capture',
        scope: 'Capture exact finish text from live source pages into preservation fixtures.',
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
