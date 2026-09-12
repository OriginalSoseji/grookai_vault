import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(`../../${name}`,import.meta.url),'utf8');

test('Linux contract job installs the real web rendering dependencies before contracts',()=>{
  const workflow=read('.github/workflows/contracts-runtime-protection.yml');
  assert.ok(workflow.indexOf('npm ci --prefix apps/web --ignore-scripts')>0);
  assert.ok(workflow.indexOf('npm ci --prefix apps/web --ignore-scripts')<workflow.indexOf('run: npm run contracts:test'));
});

test('migration scope rejection executes the real script with a portable filesystem path',()=>{
  const source=read('tests/contracts/collector_isolated_migration_gate_v1.test.mjs');
  assert.ok(source.includes('fileURLToPath(gate)'));
  assert.ok(source.includes('assert.equal(result.status, 1)'));
  assert.ok(source.includes('requires only 20260912050000'));
});

test('collector fixture tools consume current CLI secret fields without changing targets',()=>{
  for(const file of ['collector-authenticated-smoke.mjs','collector-intake-smoke.mjs',
    'collector-media-memory-smoke.mjs','collector-shared-binder-smoke.mjs',
    'collector-fixture-runtime.mjs','prepare-collector-authenticated.mjs']){
    const source=read(`apps/web/scripts/${file}`);
    assert.match(source,/\b(?:status|local)\.SECRET_KEY\b/,file);
    assert.match(source,/assertCollectorStagingTarget|127\.0\.0\.1/,file);
  }
  const hosted=read('scripts/preview/verify_collector_hosted.mjs');
  assert.ok(hosted.includes("SECRET_KEY:keys.find(k=>k.type==='secret').api_key"));
  assert.ok(hosted.includes('verifyTarget()'));
});
