import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../scripts/schema/audit_collector_schema_baseline_v1.mjs',import.meta.url),'utf8');
test('baseline compares equal applied ledgers separately from the one frozen pending migration',()=>{
  assert.ok(source.includes("assert.deepEqual(replayLedger, productionLedger"));
  assert.ok(source.includes("assert.deepEqual(expected,['20260912050000']"));
  assert.ok(source.includes('5626c20bf8a422d5143a770478cfb2b2621c8fcac851b85363aafd2d7deef5ad'));
  assert.ok(source.includes('source_changed_during_audit'));
  assert.ok(source.includes('tool_changed_during_audit'));
});
test('diagnostic uses read-only connections and never executes generated SQL',()=>{
  assert.ok(source.includes('begin isolation level repeatable read read only'));
  assert.ok(source.includes("'on'"));
  assert.ok(source.includes("'isolated_replay_port_mismatch'"));
  assert.ok(source.includes('production_writes: 0'));
  assert.doesNotMatch(source,/migration\.apply\s*\(|query\((?:rawSql|normalizedSql)\)/);
  assert.ok(source.includes("assert.equal(normalizedSql.trim(),''"));
});
test('security and exact definitions cannot be replaced with just a migration count check',()=>{
  for(const text of ['reconcileKnownTableColumnOrderV1','assert.deepEqual(securityReplay, securityProduction',
    'forcerowsecurity','p.proacl','a.attacl','pg_get_function_identity_arguments',
    'raw_diagnostic_diff.sql','reconciled_diagnostic_diff.sql'])assert.ok(source.includes(text),text);
});
