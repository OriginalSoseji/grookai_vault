import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const INPUT_QUEUE = path.join(OUTPUT_DIR, 'image_truth_high_quality_upgrade_queue_v1.json');
const PROBE_JSON = path.join(OUTPUT_DIR, 'image_truth_high_quality_probe_results_v1.json');
const PROBE_MD = path.join(OUTPUT_DIR, 'image_truth_high_quality_probe_results_v1.md');
const VERIFIED_JSON = path.join(OUTPUT_DIR, 'image_truth_high_quality_verified_upgrade_queue_v1.json');
const VERIFIED_MD = path.join(OUTPUT_DIR, 'image_truth_high_quality_verified_upgrade_queue_v1.md');

function argValue(name, fallback = null) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const LIMIT = Number(argValue('--limit', '0'));
const CONCURRENCY = Math.max(1, Number(argValue('--concurrency', '32')) || 32);
const TIMEOUT_MS = Math.max(1000, Number(argValue('--timeout-ms', '8000')) || 8000);
const execFileAsync = promisify(execFile);

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function intHeader(headers, name) {
  const value = headers.get(name);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function probeUrl(url) {
  const normalizedUrl = clean(url);
  if (!normalizedUrl) {
    return {
      ok: false,
      status: null,
      content_type: null,
      content_length: null,
      reason: 'missing_url',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let response = await fetch(normalizedUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; high-quality-probe)',
      },
    });

    if (response.status === 405 || response.status === 403) {
      clearTimeout(timeout);
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), TIMEOUT_MS);
      try {
        response = await fetch(normalizedUrl, {
          method: 'GET',
          signal: getController.signal,
          headers: {
            'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; high-quality-probe)',
            range: 'bytes=0-0',
          },
        });
      } finally {
        clearTimeout(getTimeout);
      }
    }

    const contentType = response.headers.get('content-type');
    const contentLength = intHeader(response.headers, 'content-length');
    const ok = response.ok && String(contentType ?? '').toLowerCase().startsWith('image/');
    return {
      ok,
      status: response.status,
      content_type: contentType,
      content_length: contentLength,
      reason: ok ? 'image_url_available' : `non_image_or_unavailable_status_${response.status}`,
    };
  } catch (error) {
    const fallback = await probeUrlWithPowerShell(normalizedUrl);
    if (fallback) return fallback;
    return {
      ok: false,
      status: null,
      content_type: null,
      content_length: null,
      reason: error instanceof Error ? error.name : 'probe_error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeUrlWithPowerShell(url) {
  if (process.platform !== 'win32') return null;

  const command = [
    '& {',
    'param($u)',
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    'try {',
    '$response = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -TimeoutSec 15;',
    '$status = [int]$response.StatusCode;',
    '$type = ($response.Headers["Content-Type"] -join ",");',
    '$length = ($response.Headers["Content-Length"] -join ",");',
    '[Console]::Out.Write(($status.ToString()) + "`n" + $type + "`n" + $length);',
    '} catch {',
    '[Console]::Out.Write("0`n`n");',
    '}',
    '}',
  ].join(' ');

  try {
    const result = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url], {
      maxBuffer: 128 * 1024,
      timeout: Math.max(TIMEOUT_MS + 5000, 20000),
    });
    const [statusText, contentType, contentLengthText] = String(result.stdout ?? '').split(/\r?\n/);
    const status = Number(statusText);
    const contentLength = Number(contentLengthText);
    const ok = status >= 200 && status < 300 && String(contentType ?? '').toLowerCase().includes('image/');
    return {
      ok,
      status: Number.isFinite(status) ? status : null,
      content_type: clean(contentType),
      content_length: Number.isFinite(contentLength) ? contentLength : null,
      reason: ok ? 'image_url_available_powershell' : `powershell_unavailable_status_${statusText || 'unknown'}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      content_type: null,
      content_length: null,
      reason: error instanceof Error ? `powershell_${error.name}` : 'powershell_probe_error',
    };
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
      if ((currentIndex + 1) % 500 === 0) {
        console.log(`[probe] ${currentIndex + 1}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function groupCount(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function main() {
  const raw = await fs.readFile(INPUT_QUEUE, 'utf8');
  const queue = JSON.parse(raw);
  const targets = LIMIT > 0 ? queue.slice(0, LIMIT) : queue;
  const startedAt = new Date().toISOString();

  const results = await mapWithConcurrency(targets, CONCURRENCY, async (row) => {
    const candidateProbe = await probeUrl(row.candidate_parent_url);
    return {
      ...row,
      probe: candidateProbe,
      probe_status: candidateProbe.ok ? 'verified_available_image' : 'blocked_unavailable_or_non_image',
    };
  });

  const verified = results.filter((row) => row.probe?.ok);
  const blocked = results.filter((row) => !row.probe?.ok);
  const report = {
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    mode: 'audit_only_no_db_writes',
    input_queue: INPUT_QUEUE,
    input_rows: queue.length,
    probed_rows: results.length,
    verified_rows: verified.length,
    blocked_rows: blocked.length,
    concurrency: CONCURRENCY,
    timeout_ms: TIMEOUT_MS,
    limit: LIMIT,
    probe_status_counts: groupCount(results, (row) => row.probe_status),
    probe_reason_counts: groupCount(results, (row) => row.probe?.reason),
    bucket_counts: groupCount(results, (row) => row.bucket),
    verified_bucket_counts: groupCount(verified, (row) => row.bucket),
    blocked_sample: blocked.slice(0, 200),
    verified_sample: verified.slice(0, 200),
    safety: {
      db_writes_performed: false,
      image_uploads_performed: false,
      migrations_created: false,
      parent_overwrites_performed: false,
      child_image_exactness_changed: false,
    },
  };

  await fs.writeFile(PROBE_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(VERIFIED_JSON, `${JSON.stringify(verified, null, 2)}\n`);

  const md = [
    '# Image Truth High Quality Probe Results V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Mode: audit only. No DB writes. No image uploads. No migrations.',
    '',
    '## Summary',
    '',
    `- input queue rows: ${report.input_rows}`,
    `- probed rows: ${report.probed_rows}`,
    `- verified available image rows: ${report.verified_rows}`,
    `- blocked/unavailable rows: ${report.blocked_rows}`,
    `- concurrency: ${report.concurrency}`,
    `- timeout ms: ${report.timeout_ms}`,
    '',
    '## Probe Status Counts',
    '',
    '| status | rows |',
    '| --- | ---: |',
    ...Object.entries(report.probe_status_counts).map(([status, count]) => `| ${status} | ${count} |`),
    '',
    '## Bucket Counts',
    '',
    '| bucket | rows | verified |',
    '| --- | ---: | ---: |',
    ...Object.entries(report.bucket_counts).map(([bucket, count]) =>
      `| ${bucket} | ${count} | ${report.verified_bucket_counts[bucket] ?? 0} |`
    ),
    '',
    '## Safety',
    '',
    '- db_writes_performed: false',
    '- image_uploads_performed: false',
    '- migrations_created: false',
    '- parent_overwrites_performed: false',
    '- child_image_exactness_changed: false',
    '',
  ].join('\n');

  const verifiedMd = [
    '# Image Truth High Quality Verified Upgrade Queue V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Mode: audit only. This is not an apply plan.',
    '',
    '| set | number | card | bucket | candidate | content length |',
    '| --- | --- | --- | --- | --- | ---: |',
    ...verified.slice(0, 1000).map((row) =>
      `| ${row.set_code ?? ''} | ${row.number ?? ''} | ${String(row.card_name ?? '').replaceAll('|', '\\|')} | ${row.bucket} | ${row.candidate_parent_url} | ${row.probe?.content_length ?? ''} |`
    ),
    '',
  ].join('\n');

  await fs.writeFile(PROBE_MD, `${md}\n`);
  await fs.writeFile(VERIFIED_MD, `${verifiedMd}\n`);

  console.log(JSON.stringify({
    output: [PROBE_JSON, PROBE_MD, VERIFIED_JSON, VERIFIED_MD],
    probed_rows: report.probed_rows,
    verified_rows: report.verified_rows,
    blocked_rows: report.blocked_rows,
    probe_status_counts: report.probe_status_counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
