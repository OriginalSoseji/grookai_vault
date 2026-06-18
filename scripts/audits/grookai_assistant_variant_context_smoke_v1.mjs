import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'apps', 'web', 'src', 'lib', 'cards', 'variantOriginPublicCopy.generated.json');
const ROUTE_PATH = path.join(ROOT, 'apps', 'web', 'src', 'app', 'api', 'assistant', 'variant-explanation-context', 'route.ts');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'ui_cohesion_v1');
const OUT_JSON = path.join(OUT_DIR, 'grookai_assistant_variant_context_smoke_v1.json');
const OUT_MD = path.join(OUT_DIR, 'grookai_assistant_variant_context_smoke_v1.md');

const REQUIRED_FAMILY_KEYS = [
  'build_a_bear_workshop_stamp',
  'base_pikachu_print_run',
  'jungle_no_symbol_error',
  'pokemon_together_stamp',
  'toys_r_us_stamp',
];

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

function familyStatus(family) {
  const issues = [];
  if (!family) {
    return {
      status: 'missing_family',
      issues: ['family_missing'],
    };
  }

  for (const key of ['family_label', 'variant_category', 'why_it_exists', 'why_collectors_care', 'how_to_identify', 'grookai_rule']) {
    if (typeof family[key] !== 'string' || family[key].trim().length < 8) {
      issues.push(`missing_or_short:${key}`);
    }
  }

  if (typeof family.confidence !== 'string' || family.confidence.trim().length === 0) {
    issues.push('missing_or_short:confidence');
  }

  if (!Array.isArray(family.source_urls) || family.source_urls.length === 0) {
    issues.push('missing_source_urls');
  }

  return {
    status: issues.length ? 'needs_follow_up' : 'ready',
    issues,
  };
}

function routeReadOnlyIssues(source) {
  const checks = [
    ['insert', /(?:supabase|admin|client)\s*\.\s*from\s*\([^)]*\)\s*\.\s*insert\s*\(/i],
    ['update', /(?:supabase|admin|client)\s*\.\s*from\s*\([^)]*\)\s*\.\s*update\s*\(/i],
    ['upsert', /(?:supabase|admin|client)\s*\.\s*from\s*\([^)]*\)\s*\.\s*upsert\s*\(/i],
    ['delete', /(?:supabase|admin|client)\s*\.\s*from\s*\([^)]*\)\s*\.\s*delete\s*\(/i],
    ['rpc', /(?:supabase|admin|client)\s*\.\s*rpc\s*\(/i],
  ];

  return checks.filter(([, pattern]) => pattern.test(source)).map(([label]) => `route_contains_${label}`);
}

function renderMarkdown(report) {
  return [
    '# Grookai Assistant Variant Context Smoke V1',
    '',
    'Read-only smoke report for the grounded variant explanation context layer.',
    '',
    '```text',
    'db_writes_performed: false',
    'migrations_created: false',
    'cleanup_performed: false',
    'quarantine_performed: false',
    'model_calls_performed: false',
    '```',
    '',
    '## Summary',
    '',
    `- Required families: ${report.summary.required_families}`,
    `- Ready families: ${report.summary.ready_families}`,
    `- Needs follow-up: ${report.summary.needs_follow_up_families}`,
    `- Public copy rows: ${report.source_summary.public_copy_safe_parent_rows}`,
    `- Public copy families: ${report.source_summary.public_copy_safe_families}`,
    `- Route read-only: ${report.summary.route_read_only ? 'yes' : 'no'}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Family Readiness',
    '',
    markdownTable(report.required_family_rows, [
      { label: 'Family', value: (row) => row.family_key },
      { label: 'Label', value: (row) => row.family_label ?? '' },
      { label: 'Status', value: (row) => row.status },
      { label: 'Issues', value: (row) => row.issues.join(', ') || 'none' },
      { label: 'Sources', value: (row) => row.source_url_count ?? 0 },
    ]),
    '',
  ].join('\n');
}

async function main() {
  const [sourceRaw, routeSource] = await Promise.all([
    fs.readFile(SOURCE_PATH, 'utf8'),
    fs.readFile(ROUTE_PATH, 'utf8'),
  ]);
  const source = JSON.parse(sourceRaw);
  const families = source.families ?? {};
  const routeIssues = routeReadOnlyIssues(routeSource);
  const requiredFamilyRows = REQUIRED_FAMILY_KEYS.map((familyKey) => {
    const family = families[familyKey];
    const status = familyStatus(family);
    return {
      family_key: familyKey,
      family_label: family?.family_label ?? null,
      variant_category: family?.variant_category ?? null,
      confidence: family?.confidence ?? null,
      status: status.status,
      issues: status.issues,
      source_url_count: Array.isArray(family?.source_urls) ? family.source_urls.length : 0,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    version: 'GROOKAI_ASSISTANT_VARIANT_CONTEXT_SMOKE_V1',
    mode: 'read_only_source_and_route_smoke',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    model_calls_performed: false,
    source_fingerprint_sha256: source.source_fingerprint_sha256,
    source_summary: source.summary ?? {},
    route_read_only_issues: routeIssues,
    required_family_rows: requiredFamilyRows,
    summary: {
      required_families: requiredFamilyRows.length,
      ready_families: requiredFamilyRows.filter((row) => row.status === 'ready').length,
      needs_follow_up_families: requiredFamilyRows.filter((row) => row.status !== 'ready').length,
      route_read_only: routeIssues.length === 0,
    },
  };
  report.fingerprint_sha256 = sha256(JSON.stringify({
    source_fingerprint_sha256: report.source_fingerprint_sha256,
    route_read_only_issues: report.route_read_only_issues,
    required_family_rows: report.required_family_rows,
  }));

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, renderMarkdown(report));

  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.summary.route_read_only || report.summary.needs_follow_up_families > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
