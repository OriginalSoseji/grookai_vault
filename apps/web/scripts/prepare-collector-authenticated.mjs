import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { assertCollectorStagingTarget } from '../src/lib/collectorStaging.mjs';

const status = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', 'supabase status -o json'], {
  cwd: new URL('../../../', import.meta.url), encoding: 'utf8', stdio: ['ignore','pipe','pipe'],
}));
assertCollectorStagingTarget(status.API_URL);
const db = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false } });
const sample = await db.from('card_prints').select('id', { count: 'exact', head: true });
assert.equal(sample.error, null);
assert.equal(sample.count, 326, 'Unexpected sample database; stop without writes.');
const keys = ['schema_internal','personal','custom','set_binders'];
const before = await db.from('binder_feature_flags').select('flag_key,enabled').in('flag_key', keys);
if (before.error) throw before.error;
assert.equal(before.data.length, keys.length);
if (!process.argv.includes('--apply-local')) {
  console.log(JSON.stringify({ mode: 'plan', endpoint: status.API_URL, sampleCards: sample.count, before: before.data, enable: keys }));
} else {
  const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/binder-flags-${Date.now()}.json`;
  mkdirSync(new URL('.', `file:///${out}`), { recursive: true });
  writeFileSync(out, JSON.stringify({ endpoint: status.API_URL, before: before.data, enable: keys }, null, 2));
  const change = await db.from('binder_feature_flags').update({ enabled: true }).in('flag_key', keys);
  if (change.error) throw change.error;
  const after = await db.from('binder_feature_flags').select('flag_key,enabled').in('flag_key', keys);
  if (after.error) throw after.error;
  assert.equal(after.data.length, keys.length);
  assert.ok(after.data.every(row => row.enabled));
  writeFileSync(out, JSON.stringify({ endpoint: status.API_URL, before: before.data, after: after.data }, null, 2));
  console.log(JSON.stringify({ appliedLocalOnly: true, flags: after.data, receipt: out }));
}
