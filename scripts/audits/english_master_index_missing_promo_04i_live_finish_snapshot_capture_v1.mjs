import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const EXTRACTION_JSON = path.join(AUDIT_DIR, 'special_finish_source_extraction_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'live_finish_snapshot_capture_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'live_finish_snapshot_capture_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04I-LIVE-FINISH-SNAPSHOT-CAPTURE';

const FINISH_TERMS = [
  'reverse holo',
  'reverse holofoil',
  'rev holo',
  'holofoil',
  'holo',
  'non holo',
  'normal',
  'cosmos',
  'cracked ice',
];

const VARIANT_TERMS = [
  'staff',
  'regional',
  'city championship',
  'league',
  'prize pack',
  'winner',
  'battle road',
  'worlds',
  'wotc',
  'jumbo',
  'stamp',
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

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceKey(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host.split('.')[0];
}

function rowSearchTerms(row) {
  return [
    row.name,
    row.number,
    row.variant_key,
    row.printed_identity_modifier,
    row.family,
    ...FINISH_TERMS,
    ...VARIANT_TERMS,
  ].filter(Boolean);
}

function fetchUrlSnapshot(url, terms) {
  const psScript = `
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
$url = $env:GROOKAI_AUDIT_URL
$terms = ($env:GROOKAI_AUDIT_TERMS -split '\\|') | Where-Object { $_ -and $_.Trim().Length -gt 0 }
$response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 25 -Headers @{ 'User-Agent' = 'GrookaiVaultAudit/1.0' }
$content = [string]$response.Content
$title = ''
if ($content -match '<title[^>]*>([\\s\\S]*?)</title>') { $title = ($Matches[1] -replace '\\s+', ' ').Trim() }
$text = $content -replace '<script[\\s\\S]*?</script>', ' ' -replace '<style[\\s\\S]*?</style>', ' ' -replace '<[^>]+>', ' '
$text = $text -replace '&nbsp;', ' ' -replace '&amp;', '&' -replace '&#x25BC;', ' ' -replace '&#x25B2;', ' ' -replace '\\s+', ' '
$snips = New-Object System.Collections.Generic.List[object]
foreach ($term in $terms) {
  $start = 0
  $seen = 0
  while ($seen -lt 2) {
    $idx = $text.IndexOf($term, $start, [System.StringComparison]::OrdinalIgnoreCase)
    if ($idx -lt 0) { break }
    $s = [Math]::Max(0, $idx - 180)
    $l = [Math]::Min(420, $text.Length - $s)
    $snips.Add([pscustomobject]@{ term = $term; snippet = $text.Substring($s, $l).Trim() })
    $start = $idx + $term.Length
    $seen += 1
  }
}
[pscustomobject]@{
  status = [int]$response.StatusCode
  title = $title
  content_length = $content.Length
  snippets = $snips
} | ConvertTo-Json -Depth 5 -Compress
`;
  try {
    const stdout = execFileSync('powershell', ['-NoProfile', '-Command', psScript], {
      cwd: ROOT,
      timeout: 45000,
      env: {
        ...process.env,
        GROOKAI_AUDIT_URL: url,
        GROOKAI_AUDIT_TERMS: terms.map((term) => String(term).replaceAll('|', ' ')).join('|'),
      },
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 4,
    });
    return {
      source_url: url,
      source_key: sourceKey(url),
      fetch_status: 'fetched',
      ...JSON.parse(stdout),
    };
  } catch (error) {
    return {
      source_url: url,
      source_key: sourceKey(url),
      fetch_status: 'failed',
      error: error.message,
    };
  }
}

function finishKeysFromText(value) {
  const text = normalizeText(value);
  const finishes = new Set();
  if (/\breverse holo(?:foil)?\b/.test(text) || /\brev holo\b/.test(text)) finishes.add('reverse');
  if (/\bcosmos\b/.test(text)) finishes.add('cosmos');
  if (/\bcracked ice\b/.test(text)) finishes.add('cracked_ice');
  if (/\bnon holo(?:foil)?\b/.test(text) || /\bnormal\b/.test(text)) finishes.add('normal');
  if (/\bholofoil\b/.test(text) || /\bholo\b/.test(text)) finishes.add('holo');
  if (finishes.has('reverse')) finishes.delete('holo');
  if (finishes.has('cosmos')) finishes.delete('holo');
  if (finishes.has('cracked_ice')) finishes.delete('holo');
  return [...finishes];
}

function expectedVariantTokens(row) {
  const token = normalizeText(`${row.variant_key ?? ''} ${row.printed_identity_modifier ?? ''} ${row.family ?? ''}`);
  if (token.includes('regional')) return ['regional'];
  if (token.includes('city')) return ['city'];
  if (token.includes('staff')) return ['staff'];
  if (token.includes('league')) return ['league'];
  if (token.includes('prize pack')) return ['prize', 'pack'];
  if (token.includes('wotc')) return ['wotc'];
  if (token.includes('jumbo')) return ['jumbo'];
  if (token.includes('stamp')) return ['stamp'];
  return [];
}

function classifyRowCapture(row, snapshots) {
  const rowTerms = [normalizeText(row.name), normalizeText(row.number)].filter(Boolean);
  const expectedTokens = expectedVariantTokens(row);
  const candidates = [];

  for (const snapshot of snapshots) {
    if (snapshot.fetch_status !== 'fetched') continue;
    for (const snippetRow of snapshot.snippets ?? []) {
      const text = normalizeText(`${snapshot.title} ${snippetRow.snippet}`);
      const finishes = finishKeysFromText(text);
      if (!finishes.length) continue;
      const hasIdentity = rowTerms.every((term) => text.includes(term));
      const hasVariant = expectedTokens.length === 0 || expectedTokens.every((term) => text.includes(term));
      const hasStaffButNotExpected = text.includes('staff') && !expectedTokens.includes('staff');
      const hasJumbo = text.includes('jumbo');
      candidates.push({
        source_url: snapshot.source_url,
        source_key: snapshot.source_key,
        finish_keys: finishes,
        has_identity_terms: hasIdentity,
        has_expected_variant_terms: hasVariant,
        risk_flags: [
          hasStaffButNotExpected ? 'staff_term_present_but_not_expected_variant' : null,
          hasJumbo && !normalizeText(row.variant_key).includes('jumbo') ? 'jumbo_term_present' : null,
        ].filter(Boolean),
        evidence_term: snippetRow.term,
        evidence_snippet: snippetRow.snippet,
      });
    }
  }

  const safeCandidates = candidates.filter((candidate) => (
    candidate.has_identity_terms
    && candidate.has_expected_variant_terms
    && candidate.risk_flags.length === 0
    && candidate.finish_keys.length === 1
  ));
  const safeFinishKeys = [...new Set(safeCandidates.flatMap((candidate) => candidate.finish_keys))];

  if (safeFinishKeys.length === 1) {
    return {
      capture_status: 'exact_finish_review_candidate',
      extracted_finish_key: safeFinishKeys[0],
      evidence_candidates: safeCandidates,
      review_candidates: candidates,
      blocked_reason: null,
    };
  }

  if (candidates.length) {
    return {
      capture_status: 'finish_terms_found_but_not_promotion_safe',
      extracted_finish_key: null,
      evidence_candidates: [],
      review_candidates: candidates,
      blocked_reason: 'Live page text contains finish terms, but identity/variant/risk checks are not clean enough for promotion.',
    };
  }

  return {
    capture_status: 'no_finish_terms_captured',
    extracted_finish_key: null,
    evidence_candidates: [],
    review_candidates: [],
    blocked_reason: 'Fetched pages did not expose exact finish text in captured snippets.',
  };
}

function renderMarkdown(report) {
  return [
    '# Live Finish Snapshot Capture V1',
    '',
    'Read-only live source capture for rows that already had evidence URLs but no preserved exact finish text. This stores only status, titles, and short review snippets; no page dumps are stored.',
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
        ['unique_urls_attempted', report.summary.unique_urls_attempted],
        ['urls_fetched', report.summary.urls_fetched],
        ['urls_failed', report.summary.urls_failed],
        ['exact_finish_review_candidates', report.summary.by_capture_status.exact_finish_review_candidate ?? 0],
        ['finish_terms_found_but_not_promotion_safe', report.summary.by_capture_status.finish_terms_found_but_not_promotion_safe ?? 0],
        ['no_finish_terms_captured', report.summary.by_capture_status.no_finish_terms_captured ?? 0],
      ],
    ),
    '',
    '## Review Candidates',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant', 'status', 'finish', 'reason'],
      report.rows.map((row) => [
        row.set_code,
        row.number,
        row.name,
        row.variant_key || row.printed_identity_modifier || row.family,
        row.capture_status,
        row.extracted_finish_key || '-',
        row.blocked_reason || '-',
      ]),
    ),
    '',
    '## Next Move',
    '',
    '- Do not apply from this artifact directly.',
    '- Human-review exact finish candidates before creating any guarded child insert package.',
    '- Rows with staff/jumbo/variant mismatch signals must stay blocked.',
    '',
  ].join('\n');
}

async function main() {
  const extractionReport = await readJson(EXTRACTION_JSON);
  const rows = (extractionReport.extracted_rows ?? [])
    .filter((row) => row.extraction_status === 'needs_live_page_capture_or_preserved_snapshot');

  const urls = [...new Set(rows.flatMap((row) => row.evidence_urls ?? []))];
  const termsByUrl = new Map(urls.map((url) => [url, new Set(FINISH_TERMS.concat(VARIANT_TERMS))]));
  for (const row of rows) {
    for (const url of row.evidence_urls ?? []) {
      for (const term of rowSearchTerms(row)) termsByUrl.get(url)?.add(term);
    }
  }

  const snapshots = urls.map((url) => fetchUrlSnapshot(url, [...termsByUrl.get(url)]));
  const snapshotsByUrl = new Map(snapshots.map((snapshot) => [snapshot.source_url, snapshot]));
  const capturedRows = rows.map((row) => {
    const rowSnapshots = (row.evidence_urls ?? []).map((url) => snapshotsByUrl.get(url)).filter(Boolean);
    return {
      parent_id: row.parent_id,
      set_code: row.set_code,
      number: row.number,
      name: row.name,
      family: row.family,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      gv_id: row.gv_id,
      evidence_urls: row.evidence_urls,
      ...classifyRowCapture(row, rowSnapshots),
    };
  });

  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_extraction_fingerprint: extractionReport.fingerprint_sha256,
    snapshots: snapshots.map((snapshot) => ({
      source_url: snapshot.source_url,
      fetch_status: snapshot.fetch_status,
      status: snapshot.status,
      title: snapshot.title,
      content_length: snapshot.content_length,
      snippet_count: snapshot.snippets?.length ?? 0,
    })),
    captured_rows: capturedRows.map((row) => ({
      parent_id: row.parent_id,
      capture_status: row.capture_status,
      extracted_finish_key: row.extracted_finish_key,
    })),
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_live_source_capture',
    fingerprint_sha256: fingerprint,
    input_artifacts: {
      special_finish_source_extraction: rel(EXTRACTION_JSON),
    },
    summary: {
      rows_scanned: rows.length,
      unique_urls_attempted: urls.length,
      urls_fetched: snapshots.filter((snapshot) => snapshot.fetch_status === 'fetched').length,
      urls_failed: snapshots.filter((snapshot) => snapshot.fetch_status !== 'fetched').length,
      by_capture_status: countBy(capturedRows, (row) => row.capture_status),
      by_family: countBy(capturedRows, (row) => row.family),
    },
    source_snapshots: snapshots,
    rows: capturedRows,
    recommended_next_package: {
      package_id: 'MISSING-PROMO-04J-LIVE-CAPTURE-HUMAN-REVIEW',
      mode: 'manual_review_then_guarded_dry_run_if_clean',
      scope: 'Review exact_finish_review_candidate rows and exclude any variant mismatch before dry-run.',
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
