import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'variant_origin_index_v1');
const OUT_JSON = path.join(OUT_DIR, 'variant_origin_web_display_smoke_v1.json');
const OUT_MD = path.join(OUT_DIR, 'variant_origin_web_display_smoke_v1.md');

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

const CASES = [
  {
    case_key: 'source_backed_special_variant',
    url_path: '/card/GV-PK-BASE2-1-NO-SYMBOL',
    expected: {
      contains: ['Variant Origin', 'Jungle No Symbol Error', 'Why it exists', 'Why collectors care', 'Source-backed modeling'],
      not_contains: [],
    },
  },
  {
    case_key: 'ordinary_parent_no_origin_panel',
    url_path: '/card/GV-PK-BASE1-58',
    expected: {
      contains: [],
      not_contains: ['Variant Origin', 'Source-backed modeling'],
    },
  },
];

function getArgValue(name) {
  const prefix = `${name}=`;
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0 && process.argv[exactIndex + 1]) return process.argv[exactIndex + 1];
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : undefined;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function markdownTable(rows, columns) {
  if (!rows.length) return 'None.';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const sep = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => {
    const value = column.value(row);
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  }).join(' |')} |`);
  return [header, sep, ...body].join('\n');
}

async function fetchCase(baseUrl, testCase) {
  const url = new URL(testCase.url_path, baseUrl).toString();
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(url, { redirect: 'manual' });
  } catch (error) {
    return {
      case_key: testCase.case_key,
      url,
      status: 'fail',
      http_status: null,
      elapsed_ms: Date.now() - startedAt,
      failures: [`request_failed:${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const html = await response.text();
  const failures = [];
  if (response.status < 200 || response.status >= 300) {
    failures.push(`unexpected_http_status:${response.status}`);
  }

  for (const needle of testCase.expected.contains) {
    if (!html.includes(needle)) failures.push(`missing:${needle}`);
  }

  for (const needle of testCase.expected.not_contains) {
    if (html.includes(needle)) failures.push(`unexpected:${needle}`);
  }

  return {
    case_key: testCase.case_key,
    url,
    status: failures.length ? 'fail' : 'pass',
    http_status: response.status,
    elapsed_ms: Date.now() - startedAt,
    failures,
  };
}

function renderMarkdown(report) {
  return [
    '# Variant Origin Web Display Smoke V1',
    '',
    'Read-only route smoke test for the card-detail Variant Origin panel.',
    '',
    '```text',
    'db_writes_performed: false',
    'migrations_created: false',
    'cleanup_performed: false',
    'quarantine_performed: false',
    '```',
    '',
    '## Summary',
    '',
    `- Base URL: ${report.base_url}`,
    `- Cases: ${report.summary.total_cases}`,
    `- Passed: ${report.summary.passed_cases}`,
    `- Failed: ${report.summary.failed_cases}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Cases',
    '',
    markdownTable(report.cases, [
      { label: 'Case', value: (row) => row.case_key },
      { label: 'Status', value: (row) => row.status },
      { label: 'HTTP', value: (row) => row.http_status ?? 'n/a' },
      { label: 'Elapsed ms', value: (row) => row.elapsed_ms },
      { label: 'Failures', value: (row) => row.failures.join('; ') || 'none' },
      { label: 'URL', value: (row) => row.url },
    ]),
    '',
  ].join('\n');
}

async function main() {
  const baseUrl = getArgValue('--base-url') ?? process.env.GROOKAI_WEB_BASE_URL ?? DEFAULT_BASE_URL;
  const cases = [];
  for (const testCase of CASES) {
    cases.push(await fetchCase(baseUrl, testCase));
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'VARIANT_ORIGIN_WEB_DISPLAY_SMOKE_V1',
    mode: 'read_only_web_smoke',
    base_url: baseUrl,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    summary: {
      total_cases: cases.length,
      passed_cases: cases.filter((row) => row.status === 'pass').length,
      failed_cases: cases.filter((row) => row.status !== 'pass').length,
    },
    cases,
  };
  report.fingerprint_sha256 = sha256(JSON.stringify({
    base_url: report.base_url,
    cases: report.cases.map((row) => ({
      case_key: row.case_key,
      status: row.status,
      http_status: row.http_status,
      failures: row.failures,
    })),
  }));

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, renderMarkdown(report));

  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.failed_cases > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
