import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return fs.readFileSync(relativePath, 'utf8');
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

test('founder ops dashboard has a report registry for launch, catalog, ingestion, market, product, and security', () => {
  const registry = read('apps/web/src/lib/founder/getFounderOpsReportRegistry.ts');
  const founderPage = read('apps/web/src/app/founder/page.tsx');
  const nextConfig = read('apps/web/next.config.mjs');
  const packageJson = json('package.json');
  const workflow = read('.github/workflows/founder-ops-dashboard.yml');

  for (const needle of [
    'runtime_preflight_v1.json',
    'runtime_health_v1.json',
    'quarantine_report_v1.json',
    'deferred_report_v1.json',
    'trend_history_v1.json',
    'image_surface_consistency_scan_v1.json',
    'self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json',
    'summary_v1.json',
    'english_master_index_completion_v1.json',
    'english_master_index_publishable_manifest_v1.json',
    'mee_nightly_droplet_worker_v1_2026-07-13T19-27-52-230Z.json',
    'grookai_beta_hardening_readiness_v1.json',
    'app_flow_prod_readiness_v1.json',
    'web_cohesion_link_integrity_v1.json',
    'release_readiness_matrix_20260517.json',
    'supabase_security_warn_remediation_v2_20260521.md',
  ]) {
    assert.match(registry, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(nextConfig, /founder_ops_dashboard_v1\/\*\.json/);
  for (const needle of [
    'image_surface_consistency_scan_v1.json',
    'self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json',
    'summary_v1.json',
    'english_master_index_completion_v1.json',
    'english_master_index_publishable_manifest_v1.json',
    'mee_nightly_droplet_worker_v1_2026-07-13T19-27-52-230Z.json',
    'grookai_beta_hardening_readiness_v1.json',
    'app_flow_prod_readiness_v1.json',
    'web_cohesion_link_integrity_v1.json',
    'release_readiness_matrix_20260517.json',
    'supabase_security_warn_remediation_v2_20260521.md',
  ]) {
    assert.match(nextConfig, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const category of ['Launch', 'Catalog', 'Ingestion', 'Market', 'Product', 'Security']) {
    assert.match(registry, new RegExp(`"${category}"`));
  }

  assert.match(founderPage, /Founder Ops Reports/);
  assert.match(founderPage, /getFounderOpsReportRegistry/);
  assert.match(founderPage, /statusToTone/);
  assert.match(founderPage, /trendMovementLabel/);
  assert.match(registry, /TREND_HISTORY_PATH/);
  assert.equal(
    packageJson.scripts['founder:ops:collect'],
    'node scripts/audits/founder_ops_dashboard_collect_v1.mjs',
  );
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /17 13 \* \* \*/);
  assert.match(workflow, /SUPABASE_DB_URL:\s*\${{\s*secrets\.SUPABASE_DB_URL\s*}}/);
  assert.match(workflow, /npm run founder:ops:collect/);
  assert.match(workflow, /docs\/audits\/founder_ops_dashboard_v1/);
});

test('founder ops runtime snapshots and trend history are clean parseable JSON artifacts', () => {
  for (const file of [
    'docs/audits/founder_ops_dashboard_v1/runtime_preflight_v1.json',
    'docs/audits/founder_ops_dashboard_v1/runtime_health_v1.json',
    'docs/audits/founder_ops_dashboard_v1/quarantine_report_v1.json',
    'docs/audits/founder_ops_dashboard_v1/deferred_report_v1.json',
  ]) {
    const parsed = json(file);
    assert.match(parsed.collected_at, /^\d{4}-\d{2}-\d{2}T/);
  }

  assert.equal(json('docs/audits/founder_ops_dashboard_v1/runtime_preflight_v1.json').summary.critical_fail_checks, 0);
  assert.equal(json('docs/audits/founder_ops_dashboard_v1/runtime_health_v1.json').ok, true);
  assert.equal(json('docs/audits/founder_ops_dashboard_v1/quarantine_report_v1.json').summary.unresolved_count, 0);
  assert.equal(json('docs/audits/founder_ops_dashboard_v1/deferred_report_v1.json').summary.total, 7);

  const trend = json('docs/audits/founder_ops_dashboard_v1/trend_history_v1.json');
  assert.equal(trend.schema_version, 1);
  assert.equal(trend.retention_days, 90);
  assert.ok(Array.isArray(trend.snapshots));
  assert.ok(trend.snapshots.length >= 1);
  const latest = trend.snapshots.at(-1);
  assert.match(latest.collected_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(Array.isArray(latest.cards));
  assert.equal(latest.cards.length, 14);
  assert.deepEqual(
    latest.cards.map((card) => card.id).sort(),
    [
      'app-flow',
      'beta-readiness',
      'deferred-debt',
      'image-hosting',
      'image-surface',
      'market-evidence',
      'master-index',
      'new-set-ingestion',
      'quarantine',
      'release-readiness',
      'runtime-health',
      'runtime-preflight',
      'supabase-security',
      'web-cohesion',
    ],
  );
});
