import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/migrations/20260907160000_production_function_source_replay_reconciliation_v1.sql', 'utf8');
const manifest = JSON.parse(sql.split('$manifest$')[1]);

test('reconciliation is bound to exactly 32 unique frozen overloads', () => {
  assert.equal(manifest.length, 32);
  assert.equal(new Set(manifest.map(m => `${m.name}(${m.args})`)).size, 32);
  for (const item of manifest) {
    assert.match(item.name, /^[a-z_][a-z0-9_]*$/);
    assert.match(item.replay_sha256, /^[a-f0-9]{64}$/);
    assert.match(item.production_sha256, /^[a-f0-9]{64}$/);
    assert.notEqual(item.replay_sha256, item.production_sha256);
  }
});

test('production-equivalent definitions skip EXECUTE, and unrecognized definitions fail closed', () => {
  assert.match(sql, /if actual_sha256 = item\.production_sha256 then\s+continue;/);
  assert.match(sql, /if actual_sha256 <> item\.replay_sha256 then\s+raise exception/);
  assert.ok(sql.indexOf("'reconciliation definition drift") < sql.indexOf('execute replacement;'));
  assert.match(sql, /if target_oid is null then\s+raise exception/);
  assert.match(sql, /pg_get_function_identity_arguments\(p\.oid\) = item\.args/);
});

test('replacement and readback both require exact production bytes', () => {
  assert.match(sql, /sha256\(convert_to\(replacement, 'UTF8'\)\).*<> item\.production_sha256/);
  assert.match(sql, /sha256\(convert_to\(pg_get_functiondef\(target_oid\), 'UTF8'\)\).*<> item\.production_sha256/);
  assert.match(sql, /replace\(body, E'\\n', E'\\r\\n'\)/);
  assert.doesNotMatch(sql, /replace\(definition, E'\\n'/);
});

test('no data, views, grants, owners or direct system-catalog mutations are included', () => {
  const executable = sql.replace(/^--.*$/gm, '');
  assert.doesNotMatch(executable, /\b(?:insert\s+into|update\s+\w|delete\s+from|truncate|drop\s+|grant\s+|revoke\s+|alter\s+table)\b/i);
  assert.match(executable, /^\s*begin;/);
  assert.match(executable, /commit;\s*$/);
  assert.equal((executable.match(/execute replacement;/g) ?? []).length, 1);
});
