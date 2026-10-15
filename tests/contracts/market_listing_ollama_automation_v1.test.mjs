import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('automation advances by bounded warehouse pages', () => {
  const exporter = fs.readFileSync(
    path.join(ROOT, 'scripts/audits/market_listing_bounded_review_export_v1.mjs'),
    'utf8',
  );
  const worker = fs.readFileSync(
    path.join(ROOT, 'scripts/workers/market_listing_ollama_automation_v1.mjs'),
    'utf8',
  );
  assert.match(exporter, /offset-per-bucket/);
  assert.match(exporter, /bucket_rank > \$\{offsetPerBucket\}/);
  assert.match(worker, /next_offset_per_bucket/);
  assert.match(worker, /automation_key/);
});

test('automation writes only internal price review events', () => {
  const worker = fs.readFileSync(
    path.join(ROOT, 'scripts/workers/market_listing_ollama_automation_v1.mjs'),
    'utf8',
  );
  assert.match(worker, /market_evidence_price_review_events/);
  assert.match(worker, /approve_internal_price_signal/);
  assert.match(worker, /can_publish_price_directly: false/);
  assert.match(worker, /public_price_publication: false/);
  assert.match(worker, /pricing_observations_writes: false/);
  assert.match(worker, /dryRun/);
});

test('slab evidence is routed to a separate non-public review lane', () => {
  const worker = fs.readFileSync(
    path.join(ROOT, 'scripts/workers/market_listing_ollama_automation_v1.mjs'),
    'utf8',
  );
  const migration = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261015110000_mee_slab_price_review_events_v1.sql'),
    'utf8',
  );
  assert.match(worker, /market_evidence_slab_review_events/);
  assert.match(worker, /slab_candidates/);
  assert.match(worker, /special_lane_hold/);
  assert.match(worker, /MEE_SLAB_APPROVAL_POLICY_V1/);
  assert.match(worker, /blocked_missing_normalized_grade_identity/);
  assert.match(worker, /grader_identity_per_listing/);
  assert.match(worker, /can_auto_approve: false/);
  assert.doesNotMatch(worker, /slab_lane_requires_separate_policy/);
  assert.match(migration, /evidence_lane = 'slab'/);
  assert.match(migration, /market_evidence_slab_review_events_no_public_boundary_check/);
  assert.match(migration, /grant select, insert on public\.market_evidence_slab_review_events to service_role/);
});

test('slab review queue is founder-gated and read-only', () => {
  const migration = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261015120000_mee_slab_review_queue_rpc_v1.sql'),
    'utf8',
  );
  assert.match(migration, /get_market_evidence_slab_review_queue_v1/);
  assert.match(migration, /current_user_has_founder_entitlement_v1/);
  assert.match(migration, /founder_access_required/);
  assert.match(migration, /revoke all on function/);
  assert.match(migration, /from public, anon, authenticated/);
  assert.match(migration, /grant execute on function/);
  assert.match(migration, /limit least\(greatest\(coalesce\(p_limit, 100\), 1\), 250\)/);
  assert.doesNotMatch(migration, /insert into|update public\.|delete from/);
});

test('slab listing identity is normalized behind a service-role read model', () => {
  const migration = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261015130000_mee_slab_listing_identity_read_model_v1.sql'),
    'utf8',
  );
  assert.match(migration, /v_market_evidence_slab_listing_identity_v1/);
  assert.match(migration, /normalize_slab_grader_v1/);
  assert.match(migration, /identity_status/);
  assert.match(migration, /missing_grader/);
  assert.match(migration, /missing_grade/);
  assert.match(migration, /revoke all on public\.v_market_evidence_slab_listing_identity_v1/);
  assert.match(migration, /grant select on public\.v_market_evidence_slab_listing_identity_v1 to service_role/);
  assert.doesNotMatch(migration, /pricing_observations|market_truth|publishable = true/);
});

test('scheduled wrapper runs the repository automation command', () => {
  const script = fs.readFileSync(
    path.join(ROOT, 'scripts/ops/market_evidence_ollama_automation_v1.ps1'),
    'utf8',
  );
  assert.match(script, /pricing:market:ollama:automation/);
  assert.match(script, /Set-Location \$repoRoot/);
  assert.match(script, /mee_ollama_scheduled_logs/);
  assert.match(script, /\$ErrorActionPreference = 'Continue'/);
  assert.match(script, /\$exitCode = \$LASTEXITCODE/);
  assert.match(script, /if \(\$DryRun\).*--dry-run/);
});

test('approved MEE signals have a signed-in-only pricing read model', () => {
  const migration = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261015100000_mee_internal_price_read_model_v1.sql'),
    'utf8',
  );
  assert.match(migration, /get_market_evidence_pricing_read_model_v1/);
  assert.match(migration, /security definer/);
  assert.match(migration, /revoke all on function/);
  assert.match(migration, /to authenticated, service_role/);
  assert.match(migration, /candidate_median is not null/);
  assert.match(migration, /signal_at >= now\(\) - interval '14 days'/);
});
