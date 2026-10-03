import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { dependencyLookupQuery, inspectDependencyLookup, measureDependencyLookup } from '../../backend/catalog/pokemon_dependency_lookup_v1.mjs';

const [name, out] = process.argv.slice(2);
assert.match(name ?? '', /^grookai_dependency_lookup_[a-z0-9_]+$/); assert.ok(name.length <= 63);
const url = new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/postgres');
assert.ok(!fs.existsSync(out)); fs.mkdirSync(out);
const save = (name, value) => fs.writeFileSync(out + '/' + name, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const admin = new pg.Client({ connectionString: url.href, ssl: false }); await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0);
await admin.query('create database ' + name); await admin.end(); url.pathname = '/' + name;
const db = new pg.Client({ connectionString: url.href, ssl: false }); await db.connect();
const scope = { source_schema: 'public', source_table: 'lookup_fixture', source_columns: ['mapping_id'], type: 'bigint' };
const checks = [], ids102 = Array.from({ length: 102 }, (_, i) => String(i + 1)), ids92 = ids102.slice(0, 92);
try {
  await db.query("set statement_timeout='30s'"); await db.query("set lock_timeout='3s'");
  await db.query('create table lookup_fixture(id bigint primary key,mapping_id bigint not null,payload text not null)');
  await db.query("insert into lookup_fixture select i,i,repeat(md5(i::text),8) from generate_series(1,250000) i");
  await db.query('analyze lookup_fixture');
  const baseline = (await db.query("select count(*)::text count,encode(sha256(convert_to(string_agg(md5(to_jsonb(t)::text),'' order by id),'UTF8')),'hex') digest from lookup_fixture t")).rows[0];
  await db.query('begin isolation level repeatable read read only');
  const before = await inspectDependencyLookup(db, scope, ids102); save('unindexed.json', before);
  assert.equal(before.qualified, false); assert.ok(before.reasons.includes('large_sequential_scan'));
  await assert.rejects(() => measureDependencyLookup(db, scope, ids102), /dependency_lookup_unqualified/);
  await db.query('commit'); checks.push('250000-row nonempty102 unindexed scan rejected before aggregate execution');
  // Synthetic fixture index only. This is not a migration or production payload.
  await db.query('create index lookup_mapping_idx on lookup_fixture(mapping_id)');
  for (const ids of [ids102, ids92]) {
    await db.query('begin isolation level repeatable read read only');
    const inspection = await inspectDependencyLookup(db, scope, ids); save('indexed-' + ids.length + '.json', inspection); assert.equal(inspection.qualified, true);
    assert.equal(inspection.classification, 'indexed_plan_within_bounds');
    const start = performance.now(), measured = await measureDependencyLookup(db, scope, ids);
    const expected = (await db.query(dependencyLookupQuery(scope, ids), [ids])).rows[0];
    assert.deepEqual(measured, expected); assert.equal(measured.count, String(ids.length));
    save('runtime-' + ids.length + '.json', { ids: ids.length, measured, duration_ms: performance.now() - start, production_runtime: false });
    await db.query('commit'); checks.push('whole' + ids.length + ' indexed fixture digest exactly agrees with independent aggregate');
  }
  await db.query('begin'); await db.query('drop index lookup_mapping_idx');
  await assert.rejects(() => measureDependencyLookup(db, scope, ids92), /dependency_lookup_unqualified/);
  await db.query('rollback');
  assert.equal((await inspectDependencyLookup(db, scope, ids92)).qualified, true); checks.push('index removal immediately rejected; rollback restores qualification');
  const missing = Array.from({ length: 102 }, (_, i) => String(9223372036854775807n - BigInt(i)));
  assert.equal((await measureDependencyLookup(db, scope, missing)).count, '0'); checks.push('nonempty absent signed-bigint-limit lookup actually executed');
  await db.query('begin'); await db.query("update lookup_fixture set payload='changed' where id=1");
  const changed = await measureDependencyLookup(db, scope, ids92); await db.query('rollback');
  const original = await measureDependencyLookup(db, scope, ids92); assert.notEqual(changed.digest, original.digest); checks.push('payload changes detected; rollback preserves original rows');
  const independent = new pg.Client({ connectionString: url.href, ssl: false }); await independent.connect();
  await independent.query('begin isolation level repeatable read read only');
  await independent.query("set local statement_timeout='30s'");
  assert.deepEqual((await independent.query("select count(*)::text count,encode(sha256(convert_to(string_agg(md5(to_jsonb(t)::text),'' order by id),'UTF8')),'hex') digest from lookup_fixture t")).rows[0], baseline);
  assert.deepEqual(await measureDependencyLookup(independent, scope, ids92), original);
  await independent.query('commit'); await independent.end(); checks.push('independent full250000-row preservation and indexed digest readback');
  save('complete.json', { status: 'synthetic_large_lookup_qualified', database: name, checks, fixture_rows: 250000, fixture_table_bytes: before.metadata.table_bytes, production_schema_writes: 0, production_runtime_qualified: false, limits: 'PostgreSQL16 synthetic table/index; no migration, Supabase17 replay or actual production load proof' });
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, database: name }));
} catch (e) { save('failure.json', { error: String(e.message), checks }); throw e; }
finally { await db.end(); }
