import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'special_variant_discovery_v1',
);
const QA_PATH = path.join(OUT_DIR, 'special_variant_web_display_qa_v1.json');
const OUT_JSON = path.join(OUT_DIR, 'special_variant_web_route_smoke_v1.json');
const OUT_MD = path.join(OUT_DIR, 'special_variant_web_route_smoke_v1.md');

const BASE_URL = process.env.GROOKAI_WEB_BASE_URL ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

async function fetchRoute(row) {
  const url = new URL(row.route_path, BASE_URL).toString();
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
      },
    });
    const body = await response.text();
    const duration_ms = Math.round(performance.now() - startedAt);
    const normalizedBody = normalizeHtml(body);
    const expectedLabel = String(row.display_label ?? '').trim();
    const expectedName = String(row.card_name ?? '').trim();
    const issues = [];

    if (response.status !== 200) issues.push(`status_${response.status}`);
    if (expectedLabel && !normalizedBody.includes(expectedLabel.toLowerCase())) {
      issues.push('expected_label_missing_in_html');
    }
    if (expectedName && !normalizedBody.includes(expectedName.toLowerCase())) {
      issues.push('card_name_missing_in_html');
    }

    return {
      candidate_key: row.candidate_key,
      gv_id: row.gv_id,
      route_path: row.route_path,
      url,
      status_code: response.status,
      duration_ms,
      expected_label: expectedLabel,
      expected_name: expectedName,
      html_bytes: body.length,
      status: issues.length ? 'needs_follow_up' : 'route_ready',
      issues,
    };
  } catch (error) {
    return {
      candidate_key: row.candidate_key,
      gv_id: row.gv_id,
      route_path: row.route_path,
      url,
      status_code: null,
      duration_ms: Math.round(performance.now() - startedAt),
      expected_label: row.display_label ?? null,
      expected_name: row.card_name ?? null,
      html_bytes: 0,
      status: 'needs_follow_up',
      issues: [`fetch_failed:${error.message}`],
    };
  }
}

async function main() {
  const qa = JSON.parse(await fs.readFile(QA_PATH, 'utf8'));
  const sourceRows = (qa.rows ?? []).filter((row) => row.status === 'display_ready' && row.route_path);

  const rows = [];
  for (const row of sourceRows) {
    rows.push(await fetchRoute(row));
  }

  const followUpRows = rows.filter((row) => row.issues.length);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'SPECIAL_VARIANT_WEB_ROUTE_SMOKE_V1',
    mode: 'read_only_http_route_smoke',
    base_url: BASE_URL,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_display_qa_fingerprint: qa.fingerprint_sha256,
    fingerprint_sha256: sha256(JSON.stringify(rows)),
    summary: {
      attempted_routes: rows.length,
      route_ready_rows: rows.filter((row) => row.status === 'route_ready').length,
      needs_follow_up_rows: followUpRows.length,
      slowest_duration_ms: rows.reduce((max, row) => Math.max(max, row.duration_ms), 0),
    },
    rows,
  };

  const markdown = [
    '# Special Variant Web Route Smoke V1',
    '',
    `Base URL: \`${BASE_URL}\``,
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
    `- Attempted routes: ${report.summary.attempted_routes}`,
    `- Route-ready rows: ${report.summary.route_ready_rows}`,
    `- Needs follow-up rows: ${report.summary.needs_follow_up_rows}`,
    `- Slowest route: ${report.summary.slowest_duration_ms} ms`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Follow-Up Rows',
    '',
    markdownTable(followUpRows, [
      { label: 'Candidate', value: (row) => row.candidate_key },
      { label: 'Route', value: (row) => row.route_path },
      { label: 'HTTP', value: (row) => row.status_code ?? '' },
      { label: 'Issues', value: (row) => row.issues.join(', ') },
    ]),
    '',
    '## Route-Ready Sample',
    '',
    markdownTable(rows.filter((row) => row.status === 'route_ready').slice(0, 25), [
      { label: 'Candidate', value: (row) => row.candidate_key },
      { label: 'Route', value: (row) => row.route_path },
      { label: 'HTTP', value: (row) => row.status_code },
      { label: 'ms', value: (row) => row.duration_ms },
    ]),
    '',
  ].join('\n');

  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, markdown);

  console.log(JSON.stringify(report.summary, null, 2));
  if (followUpRows.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
