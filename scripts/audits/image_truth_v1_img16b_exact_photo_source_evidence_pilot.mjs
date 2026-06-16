import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img16a_exact_photo_acquisition_plan_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img16b_exact_photo_source_evidence_pilot_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img16b_exact_photo_source_evidence_pilot_v1.md');

const PACKAGE_ID = 'IMG-16B-EXACT-PHOTO-SOURCE-EVIDENCE-PILOT';
const PILOT_SIZE = 25;
const execFileAsync = promisify(execFile);

const FINISH_LABELS = {
  cosmos: ['cosmos', 'cosmos holo', 'cosmos holofoil'],
  cracked_ice: ['cracked ice', 'cracked ice holo', 'cracked ice holofoil'],
  pokeball: ['poke ball', 'pokeball', 'poke ball reverse'],
  masterball: ['master ball', 'masterball', 'master ball reverse'],
  rocket_reverse: ['rocket reverse', 'team rocket reverse'],
  reverse: ['reverse', 'reverse holo', 'reverse holofoil'],
  holo: ['holo', 'holofoil'],
  normal: ['normal'],
};

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeLoose(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function hashObject(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function short(value, length = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function htmlDecode(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cardNeedles(row) {
  return [
    normalizeLoose(row.card_name),
    normalizeLoose(row.number),
    ...FINISH_LABELS[normalize(row.finish_key)] ?? [normalizeLoose(row.finish_key)],
  ].filter(Boolean);
}

function extractImageUrls(html) {
  const urls = new Set();
  const patterns = [
    /https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:png|jpe?g|webp)(?:\?[^"'<>\\\s]*)?/gi,
    /https?:\\?\/\\?\/images\.scrydex\.com\/pokemon\/[^"'<>\\\s]+/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      urls.add(htmlDecode(match[0].replaceAll('\\/', '/')));
    }
  }
  return [...urls].filter((url) => !url.includes('PokeAPI/sprites'));
}

function detectBlocked(html, status) {
  const text = normalize(html);
  if (status >= 400) return `http_${status}`;
  if (text.includes('just a moment') && text.includes('cloudflare')) return 'cloudflare_challenge';
  if (text.includes('enable javascript and cookies to continue') && text.includes('challenge-platform')) return 'cloudflare_challenge';
  return null;
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'GrookaiImageTruthAudit/1.0 audit-only no-db-writes',
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      html: await response.text(),
      error: null,
      fetch_method: 'node_fetch',
    };
  } catch (error) {
    if (process.platform === 'win32') {
      try {
        const result = await execFileAsync('curl.exe', [
          '--ssl-no-revoke',
          '--location',
          '--silent',
          '--show-error',
          '--max-time',
          '35',
          '--user-agent',
          'GrookaiImageTruthAudit/1.0 audit-only no-db-writes',
          url,
        ], { maxBuffer: 10 * 1024 * 1024 });
        return {
          ok: true,
          status: 200,
          final_url: url,
          html: result.stdout,
          error: null,
          fetch_method: 'curl_ssl_no_revoke_fallback',
        };
      } catch (curlError) {
        return {
          ok: false,
          status: null,
          final_url: url,
          html: '',
          error: `node_fetch_failed:${error?.message ?? String(error)};curl_failed:${curlError?.message ?? String(curlError)}`,
          fetch_method: 'node_fetch_then_curl_failed',
        };
      }
    }
    return {
      ok: false,
      status: null,
      final_url: url,
      html: '',
      error: error?.message ?? String(error),
      fetch_method: 'node_fetch_failed',
    };
  }
}

function classifyPage(row, fetchResult) {
  const html = fetchResult.html ?? '';
  const blockReason = detectBlocked(html, fetchResult.status ?? 0);
  if (fetchResult.error) {
    return {
      status: 'source_unavailable',
      reason: 'fetch_error',
      detail: fetchResult.error,
      page_contains_card_identity: false,
      page_contains_finish_label: false,
      candidate_image_urls: [],
      exact_image_ready: false,
    };
  }
  if (blockReason) {
    return {
      status: 'source_unavailable',
      reason: blockReason,
      detail: 'Source page could not be evaluated by the audit fetcher.',
      page_contains_card_identity: false,
      page_contains_finish_label: false,
      candidate_image_urls: [],
      exact_image_ready: false,
    };
  }

  const looseHtml = normalizeLoose(htmlDecode(html));
  const nameNeedle = normalizeLoose(row.card_name);
  const numberNeedle = normalizeLoose(row.number);
  const finishNeedles = FINISH_LABELS[normalize(row.finish_key)] ?? [normalizeLoose(row.finish_key)];
  const pageContainsCardIdentity = looseHtml.includes(nameNeedle) && looseHtml.includes(numberNeedle);
  const pageContainsFinishLabel = finishNeedles.some((needle) => looseHtml.includes(normalizeLoose(needle)));
  const candidateImageUrls = extractImageUrls(html).slice(0, 30);

  const variantSpecificImages = candidateImageUrls.filter((url) => {
    const looseUrl = normalizeLoose(url);
    return finishNeedles.some((needle) => looseUrl.includes(normalizeLoose(needle)));
  });

  if (pageContainsCardIdentity && pageContainsFinishLabel && variantSpecificImages.length > 0) {
    return {
      status: 'candidate_exact_asset_needs_visual_review',
      reason: 'variant_label_and_variant_specific_image_url_detected',
      detail: 'The page contains card identity, finish label, and at least one image URL whose path appears variant-specific. Human visual review is still required before upload.',
      page_contains_card_identity: true,
      page_contains_finish_label: true,
      candidate_image_urls: variantSpecificImages,
      exact_image_ready: false,
    };
  }

  if (pageContainsCardIdentity && pageContainsFinishLabel && candidateImageUrls.length > 0) {
    return {
      status: 'blocked_variant_label_without_exact_asset',
      reason: 'source_proves_variant_but_image_urls_are_card_level_or_unproven',
      detail: 'The page supports the finish/variant label, but no image URL proves the exact variant visual.',
      page_contains_card_identity: true,
      page_contains_finish_label: true,
      candidate_image_urls: candidateImageUrls.slice(0, 10),
      exact_image_ready: false,
    };
  }

  return {
    status: 'blocked_no_exact_page_proof',
    reason: 'page_missing_card_identity_finish_label_or_image_asset',
    detail: `Needles: ${cardNeedles(row).join(', ')}`,
    page_contains_card_identity: pageContainsCardIdentity,
    page_contains_finish_label: pageContainsFinishLabel,
    candidate_image_urls: candidateImageUrls.slice(0, 10),
    exact_image_ready: false,
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function main() {
  const input = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  const rows = (input.acquisition_queues?.exact_photo_needed_source_evidence_exists ?? []).slice(0, PILOT_SIZE);
  const probed = [];

  for (const row of rows) {
    const fetched = await fetchText(row.source_url);
    const classification = classifyPage(row, fetched);
    probed.push({
      ...row,
      package_id: PACKAGE_ID,
      fetched_status: fetched.status,
      fetched_url: fetched.final_url,
      fetch_method: fetched.fetch_method,
      fetched_html_sha256: fetched.html ? crypto.createHash('sha256').update(fetched.html).digest('hex') : null,
      fetched_html_excerpt: fetched.html ? short(fetched.html, 240) : null,
      ...classification,
    });
  }

  const exactReadyRows = probed.filter((row) => row.status === 'candidate_exact_asset_needs_visual_review');
  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    input_plan: INPUT_JSON,
    requested_rows: PILOT_SIZE,
    source_rows: rows.length,
    exact_ready_rows: 0,
    candidate_exact_asset_needs_visual_review_rows: exactReadyRows.length,
    blocked_rows: probed.length - exactReadyRows.length,
    by_status: countBy(probed, (row) => row.status),
    by_reason: countBy(probed, (row) => row.reason),
    by_source_family: countBy(probed, (row) => row.source_family),
    rows: probed,
  };
  report.fingerprint = hashObject({
    package_id: report.package_id,
    source_rows: report.source_rows,
    by_status: report.by_status,
    by_reason: report.by_reason,
    row_keys: probed.map((row) => [row.card_printing_id, row.status, row.reason, row.fetched_html_sha256]),
  });

  const md = [
    '# Image Truth IMG-16B Exact Photo Source Evidence Pilot V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'This is audit-only. It fetches source pages and writes reports only. It does not upload images, update DB rows, create migrations, clean up, quarantine, or promote image confidence.',
    '',
    '## Summary',
    '',
    `- source_rows: ${report.source_rows}`,
    `- exact_ready_rows: ${report.exact_ready_rows}`,
    `- candidate_exact_asset_needs_visual_review_rows: ${report.candidate_exact_asset_needs_visual_review_rows}`,
    `- blocked_rows: ${report.blocked_rows}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- storage_uploads_performed: ${report.storage_uploads_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    `- parent_overwrite_allowed: ${report.parent_overwrite_allowed}`,
    `- fingerprint: ${report.fingerprint}`,
    '',
    '## Status Counts',
    '',
    markdownTable(Object.entries(report.by_status).map(([status, rows]) => ({ status, rows })), [
      { label: 'status', value: (row) => row.status },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Reason Counts',
    '',
    markdownTable(Object.entries(report.by_reason).map(([reason, rows]) => ({ reason, rows })), [
      { label: 'reason', value: (row) => row.reason },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Row Results',
    '',
    markdownTable(probed, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'card', value: (row) => row.card_name },
      { label: 'finish', value: (row) => row.finish_key },
      { label: 'source', value: (row) => row.source_family },
      { label: 'status', value: (row) => row.status },
      { label: 'reason', value: (row) => row.reason },
    ]),
    '',
    '## Decision',
    '',
    'No row from this pilot is ready for image apply. The source pages prove or support variant existence, but the discovered image assets are card-level or otherwise not proven to show the exact finish.',
    '',
    '## Guardrail',
    '',
    'A source can prove that a variant exists without proving that its displayed image is an exact variant asset. Those two facts remain separate.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    source_rows: report.source_rows,
    exact_ready_rows: report.exact_ready_rows,
    candidate_exact_asset_needs_visual_review_rows: report.candidate_exact_asset_needs_visual_review_rows,
    blocked_rows: report.blocked_rows,
    by_status: report.by_status,
    fingerprint: report.fingerprint,
  }, null, 2));
}

await main();
