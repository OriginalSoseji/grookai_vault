import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'stamped_special_web_variant_discovery_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_evidence_acquisition_packet_v1.json');
const OUTPUT_JSON = path.join(SOURCE_DIR, 'stamped_special_web_variant_discovery_v1.json');
const OUTPUT_MD = path.join(SOURCE_DIR, 'stamped_special_web_variant_discovery_v1.md');

const PACKAGE_ID = 'STAMPED-SPECIAL-WEB-VARIANT-DISCOVERY-V1';
const MAX_ROWS = Number(process.env.STAMPED_SPECIAL_WEB_DISCOVERY_LIMIT ?? 0);
const REQUEST_DELAY_MS = Number(process.env.STAMPED_SPECIAL_WEB_DISCOVERY_DELAY_MS ?? 250);
const ACTIVE_FINISH_LABELS = [
  ['reverse', /\b(reverse holofoil|reverse holo|reverse foil|reverse)\b/i],
  ['holo', /\b(holofoil|holo foil|holo)\b/i],
  ['normal', /\b(non[- ]?holo|normal|regular)\b/i],
  ['cosmos', /\b(cosmos holo|cosmos)\b/i],
  ['cracked_ice', /\b(cracked ice)\b/i],
];

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
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeNumberForUrl(value) {
  return String(value ?? '').trim().replace(/^0+(?=\d)/, '');
}

function pokescopeUrl(row) {
  const number = encodeURIComponent(normalizeNumberForUrl(row.card_number));
  return `https://pokescope.app/card/${row.set_key}-${number}/`;
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[.:’']/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]()]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function scrydexUrl(row) {
  const number = encodeURIComponent(normalizeNumberForUrl(row.card_number));
  return `https://scrydex.com/pokemon/cards/${slug(row.set_name ?? row.set_key)}/${row.set_key}-${number}`;
}

function comparable(value) {
  return normalizeText(String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bpok[eé]mon\b/g, 'pokemon')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value) {
  return comparable(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function stampMatchers(row) {
  const rawLabels = [
    row.stamp_label,
    row.variant_key,
  ].filter(Boolean);
  const normalized = rawLabels.map((value) => comparable(value));
  const compact = normalized.map((value) => value.replace(/[^a-z0-9]+/g, ''));
  const importantWords = [...new Set(rawLabels.flatMap(words).filter((word) => (
    word.length >= 4
    && !['stamp', 'stamped', 'pokemon', 'pokémon', 'promo', 'program', 'card'].includes(word)
  )))];
  return { normalized, compact, importantWords };
}

function htmlText(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectVariant(text, row) {
  const sourceText = comparable(text);
  const sourceCompact = sourceText.replace(/[^a-z0-9]+/g, '');
  const matchers = stampMatchers(row);

  for (const value of matchers.normalized) {
    if (value && sourceText.includes(value)) return true;
  }
  for (const value of matchers.compact) {
    if (value && sourceCompact.includes(value)) return true;
  }

  if (matchers.importantWords.length >= 2) {
    const found = matchers.importantWords.filter((word) => sourceText.includes(word));
    return found.length >= Math.min(3, matchers.importantWords.length);
  }
  return false;
}

function detectedFinishLabels(text) {
  const found = [];
  for (const [finish, pattern] of ACTIVE_FINISH_LABELS) {
    if (pattern.test(text)) found.push(finish);
  }
  return [...new Set(found)];
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiVaultAudit/1.0 (+https://grookaivault.com)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body,
      fetch_method: 'node_fetch',
    };
  } catch (error) {
    if (!String(error?.cause?.code ?? error?.message ?? '').includes('UNABLE_TO_VERIFY')) throw error;
    const psUrl = JSON.stringify(url).replace(/'/g, "''");
    const script = [
      '$ProgressPreference = "SilentlyContinue";',
      '$Headers = @{ "User-Agent" = "GrookaiVaultAudit/1.0 (+https://grookaivault.com)"; "Accept" = "text/html,application/xhtml+xml" };',
      `$Response = Invoke-WebRequest -Uri '${psUrl.slice(1, -1)}' -UseBasicParsing -Headers $Headers -TimeoutSec 30;`,
      'Write-Output ("__STATUS__" + [int]$Response.StatusCode);',
      'Write-Output $Response.Content;',
    ].join(' ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], {
      cwd: ROOT,
      maxBuffer: 10 * 1024 * 1024,
    });
    const marker = stdout.match(/^__STATUS__(\d+)\r?\n/);
    const status = marker ? Number(marker[1]) : 200;
    const body = marker ? stdout.slice(marker[0].length) : stdout;
    return {
      ok: status >= 200 && status < 300,
      status,
      body,
      fetch_method: 'powershell_invoke_webrequest',
    };
  }
}

function targetRows(input) {
  const rows = input.sample_open_write_possible_rows?.length
    ? input.sample_open_write_possible_rows
    : [];
  const allRows = input.open_rows ?? input.rows ?? [];
  const candidates = allRows.length ? allRows : rows;
  return candidates
    .filter((row) => row.live_satisfied !== true)
    .filter((row) => row.write_effect !== 'no_write')
    .filter((row) => row.stamp_label || row.variant_key)
    .filter((row) => row.set_key && row.card_number && row.card_name)
    .filter((row) => ['bucket_05_variant_family_source_acquisition_bulk', 'bucket_06_second_source_acquisition_bulk', undefined].includes(row.execution_bucket))
    .slice(0, MAX_ROWS > 0 ? MAX_ROWS : undefined);
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = targetRows(input);
  const results = [];

  for (const [index, row] of rows.entries()) {
    const sources = [
      ['pokescope_card_page', pokescopeUrl(row)],
      ['scrydex_card_page', scrydexUrl(row)],
    ];
    let result;
    try {
      const sourceResults = [];
      for (const [sourceKey, sourceUrl] of sources) {
        try {
          const fetched = await fetchText(sourceUrl);
          const text = htmlText(fetched.body);
          const exactCardPage = fetched.ok
            && comparable(text).includes(comparable(row.card_name))
            && comparable(text).includes(comparable(row.set_name ?? row.set_key));
          const variantFound = exactCardPage && detectVariant(text, row);
          sourceResults.push({
            source_key: sourceKey,
            source_kind: 'collector_reference',
            source_url: sourceUrl,
            http_status: fetched.status,
            fetch_method: fetched.fetch_method,
            exact_card_page: Boolean(exactCardPage),
            variant_label_found: Boolean(variantFound),
            detected_finish_labels: exactCardPage ? detectedFinishLabels(text) : [],
          });
        } catch (error) {
          sourceResults.push({
            source_key: sourceKey,
            source_kind: 'collector_reference',
            source_url: sourceUrl,
            exact_card_page: false,
            variant_label_found: false,
            detected_finish_labels: [],
            error: error.message,
          });
        }
      }

      const exactSources = sourceResults.filter((source) => source.exact_card_page);
      const variantSources = sourceResults.filter((source) => source.variant_label_found);
      const finishLabels = [...new Set(sourceResults.flatMap((source) => source.detected_finish_labels))];
      const status = variantSources.length >= 2
        ? 'multi_source_variant_found_finish_unresolved'
        : variantSources.length === 1
          ? 'variant_found_finish_unresolved'
          : exactSources.length > 0
            ? 'exact_card_page_no_variant_label'
            : 'source_page_not_exact_card';

      result = {
        status,
        source_results: sourceResults,
        source_urls: sourceResults.map((source) => source.source_url),
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        variant_key: row.variant_key,
        stamp_label: row.stamp_label,
        finish_key: row.finish_key,
        exact_source_count: exactSources.length,
        variant_source_count: variantSources.length,
        detected_finish_labels: finishLabels,
        promotable: false,
        reason_not_promotable: variantSources.length
          ? 'One or more source pages support the exact variant label on the exact card page, but do not independently bind that variant to one active finish.'
          : 'No exact stamp/variant evidence was found on this source page.',
      };
    } catch (error) {
      result = {
        status: 'fetch_error',
        source_urls: sources.map(([, sourceUrl]) => sourceUrl),
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        variant_key: row.variant_key,
        stamp_label: row.stamp_label,
        finish_key: row.finish_key,
        promotable: false,
        error: error.message,
      };
    }
    results.push(result);
    if (REQUEST_DELAY_MS > 0 && index < rows.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  const variantRows = results.filter((row) => ['variant_found_finish_unresolved', 'multi_source_variant_found_finish_unresolved'].includes(row.status));
  const output = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    input_artifact: rel(INPUT_JSON),
    input_fingerprint_sha256: input.fingerprint_sha256 ?? null,
    source: {
      source_key: 'pokescope_card_page_and_scrydex_card_page',
      source_kind: 'collector_reference',
      source_usage: 'review evidence only',
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      promotable_records_written: 0,
    },
    summary: {
      target_rows: rows.length,
      source_rows_checked: results.length,
      variant_found_finish_unresolved: variantRows.length,
      multi_source_variant_found_finish_unresolved: results.filter((row) => row.status === 'multi_source_variant_found_finish_unresolved').length,
      promotable_rows: 0,
      by_status: countBy(results, (row) => row.status),
      variant_found_by_family: countBy(variantRows, (row) => row.variant_key),
      variant_found_by_set: countBy(variantRows, (row) => row.set_key),
    },
    rows: results,
  };
  output.fingerprint_sha256 = sha256(stableJson({
    package_id: output.package_id,
    summary: output.summary,
    rows: output.rows.map((row) => ({
      status: row.status,
      source_urls: row.source_urls,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
    })),
  }));

  await writeJson(OUTPUT_JSON, output);

  const variantSample = variantRows.slice(0, 25).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label ?? row.variant_key,
    row.variant_source_count,
    row.detected_finish_labels.join(', ') || '(not bound)',
    row.source_urls.join(' ; '),
  ]);
  const md = [
    '# Stamped/Special Web Variant Discovery V1',
    '',
    `Generated: ${output.generated_at}`,
    '',
    'This is audit-only source discovery. It does not create promotable evidence rows because the source pages found so far usually confirm a variant label without independently binding that variant to an active finish.',
    '',
    '## Safety',
    '',
    '- db_writes_performed: false',
    '- migrations_created: false',
    '- apply_performed: false',
    '- cleanup_performed: false',
    '- promotable_records_written: 0',
    '',
    '## Summary',
    '',
    `- target_rows: ${output.summary.target_rows}`,
    `- variant_found_finish_unresolved: ${output.summary.variant_found_finish_unresolved}`,
    `- multi_source_variant_found_finish_unresolved: ${output.summary.multi_source_variant_found_finish_unresolved}`,
    `- promotable_rows: ${output.summary.promotable_rows}`,
    '',
    '## By Status',
    '',
    markdownTable(['status', 'count'], Object.entries(output.summary.by_status).map(([key, count]) => [key, count])),
    '',
    '## Variant Evidence Found, Finish Still Unresolved',
    '',
    variantSample.length
      ? markdownTable(['set', 'number', 'card', 'variant/stamp', 'variant sources', 'finish labels on page', 'sources'], variantSample)
      : 'No exact variant labels found.',
    '',
    '## Governance Note',
    '',
    'These rows may help future manual review, but they must not be promoted until another source or the same source clearly proves exact set + card number + card name + exact stamp/variant + active finish.',
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: output.fingerprint_sha256,
    summary: output.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
