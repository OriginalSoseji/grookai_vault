import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { dependencyLookupQuery, inspectDependencyLookup, measureDependencyLookup } from '../../backend/catalog/pokemon_dependency_lookup_v1.mjs';

const [name, out] = process.argv.slice(2);
assert.equal(process.argv.length, 4);
assert.match(name ?? '', /^grookai_dependency_nonnull_[a-z0-9_]+$/); assert.ok(name.length <= 63);
const url = new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/postgres');
assert.ok(!fs.existsSync(out)); fs.mkdirSync(out);
const save = (file, value) => fs.writeFileSync(out + '/' + file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const admin = new pg.Client({ connectionString: url.href, ssl: false }); await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0);
await admin.query('create database ' + name); await admin.end(); url.pathname = '/' + name;
const db = new pg.Client({ connectionString: url.href, ssl: false }); await db.connect();
const checks = [], runtimes = [];
const bigintScope = { source_schema: 'public', source_table: 'nonnull_fixture', source_columns: ['mapping_id'], type: 'bigint' };
const uuidScope = { ...bigintScope, source_columns: ['parent_id'], type: 'uuid' };
const allRows = "select count(*)::text count,encode(sha256(convert_to(string_agg(md5(to_jsonb(t)::text),'' order by id),'UTF8')),'hex') digest from nonnull_fixture t";
try {
  await db.query("set statement_timeout='30s'"); await db.query("set lock_timeout='3s'");
  await db.query('create table nonnull_fixture(id bigint primary key,mapping_id bigint,parent_id uuid,active boolean not null,payload text not null)');
  await db.query("insert into nonnull_fixture select i,case when i<=200000 then i end,case when i<=200000 then md5(i::text)::uuid end,true,repeat(md5(i::text),8) from generate_series(1,250000) i");
  await db.query("insert into nonnull_fixture select 250000+i,i,md5(i::text)::uuid,false,repeat(md5(('inactive'||i)::text),8) from generate_series(1,102) i");
  await db.query('analyze nonnull_fixture');
  const baseline = (await db.query(allRows)).rows[0];
  const ids102 = Array.from({ length: 102 }, (_, i) => String(i + 1));
  const uuid102 = (await db.query('select parent_id from nonnull_fixture where id=any($1::bigint[]) order by id', [ids102])).rows.map(r => r.parent_id);
  const before = await inspectDependencyLookup(db, bigintScope, ids102); save('unindexed.json', before);
  assert.equal(before.qualified, false); checks.push('large unindexed fixture rejected');
  assert.equal((await db.query('select count(*)::int n from nonnull_fixture where mapping_id is null')).rows[0].n, 50000);
  await db.query('create index nonnull_mapping_idx on nonnull_fixture(mapping_id) where mapping_id is not null');
  await db.query('create index nonnull_parent_idx on nonnull_fixture(parent_id) where parent_id is not null');
  for (const [scope, ids] of [[bigintScope, ids102], [bigintScope, ids102.slice(0, 92)], [uuidScope, uuid102], [uuidScope, uuid102.slice(0, 92)]]) {
    await db.query('begin isolation level repeatable read read only');
    const label = scope.type + '-' + ids.length, inspection = await inspectDependencyLookup(db, scope, ids);
    save('inspection-' + label + '.json', inspection); assert.equal(inspection.qualified, true);
    assert.equal(inspection.classification, 'indexed_plan_within_bounds');
    const start = performance.now(), measured = await measureDependencyLookup(db, scope, ids);
    // Independent full-row digest uses a different membership formulation. It
    // includes duplicate FK references and inactive records without any filter.
    const expected = (await db.query(`select count(*)::text count,
      encode(sha256(convert_to(coalesce(string_agg(h,'|' order by h),''),'UTF8')),'hex') digest from
      (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h from nonnull_fixture t
       join unnest($1::${scope.type}[]) selected(id) on t.${scope.source_columns[0]}=selected.id) full_scope`, [ids])).rows[0];
    assert.deepEqual(measured, expected); assert.equal(measured.count, String(2 * ids.length));
    runtimes.push({ label, measured, duration_ms: performance.now() - start });
    assert.deepEqual((await db.query(dependencyLookupQuery(scope, ids), [ids])).rows[0], measured);
    await db.query('commit'); checks.push(label + ' exact digest includes inactive duplicate references and excludes only NULLs');
  }
  for (const [label, predicate] of [['wrong-column', 'parent_id IS NOT NULL'], ['and-active', 'mapping_id IS NOT NULL AND active'], ['or-active', 'mapping_id IS NOT NULL OR active'], ['active-only', 'active']]) {
    await db.query('begin'); await db.query('drop index nonnull_mapping_idx');
    await db.query('create index nonnull_wrong_idx on nonnull_fixture(mapping_id) where ' + predicate);
    const inspected = await inspectDependencyLookup(db, bigintScope, ids102); save(label + '.json', inspected);
    assert.equal(inspected.qualified, false); await assert.rejects(() => measureDependencyLookup(db, bigintScope, ids102), /dependency_lookup_unqualified/);
    await db.query('rollback'); assert.equal((await inspectDependencyLookup(db, bigintScope, ids102)).qualified, true);
    checks.push(label + ' rejected before aggregate; rollback restores exact index');
  }
  // A genuinely failed concurrent build leaves an invalid catalog index. Never
  // update pg_catalog to simulate validity flags, even in this isolated lab.
  await assert.rejects(() => db.query('create unique index concurrently nonnull_invalid_idx on nonnull_fixture(mapping_id) where mapping_id is not null'), e => e.code === '23505');
  await db.query('begin'); await db.query('drop index nonnull_mapping_idx');
  const invalid = await inspectDependencyLookup(db, bigintScope, ids102); save('invalid-concurrent-index.json', invalid);
  assert.equal(invalid.metadata.indexes.find(i => i.name === 'nonnull_invalid_idx').valid, false);
  assert.equal(invalid.qualified, false); await assert.rejects(() => measureDependencyLookup(db, bigintScope, ids102), /dependency_lookup_unqualified/);
  await db.query('rollback'); checks.push('real failed concurrent unique partial index cannot qualify lookup');
  await db.query('begin'); await db.query('drop index nonnull_mapping_idx');
  await assert.rejects(() => measureDependencyLookup(db, bigintScope, ids102), /dependency_lookup_unqualified/);
  await db.query('rollback'); checks.push('exact index removal detected without cached qualification');
  const original = await measureDependencyLookup(db, bigintScope, ids102);
  await db.query('begin'); await db.query("update nonnull_fixture set payload='changed inactive dependency' where id=250001");
  assert.notEqual((await measureDependencyLookup(db, bigintScope, ids102)).digest, original.digest);
  await db.query('rollback'); checks.push('inactive dependency payload mutation detected and rolled back');
  assert.equal((await measureDependencyLookup(db, bigintScope, ids102.map((_, i) => String(9223372036854775807n - BigInt(i))))).count, '0');
  checks.push('nonempty absent extreme bigint IDs executed with partial index');
  const independent = new pg.Client({ connectionString: url.href, ssl: false }); await independent.connect();
  try {
    await independent.query('begin isolation level repeatable read read only'); await independent.query("set local statement_timeout='30s'");
    assert.deepEqual((await independent.query(allRows)).rows[0], baseline);
    assert.deepEqual(await measureDependencyLookup(independent, bigintScope, ids102), original);
    await independent.query('commit');
  } finally { await independent.end(); }
  checks.push('independent full250102-row preservation and nonnull lookup readback');
  save('complete.json', { status: 'exact_nonnull_partial_lookup_qualified_locally', database: name, checks, runtimes,
    fixture_rows: 250102, null_rows: 50000, inactive_duplicate_references: 102, fixture_table_bytes: before.metadata.table_bytes,
    production_writes: 0, production_runtime_qualified: false, limits: 'Synthetic PostgreSQL16 table/index; no migration or Supabase17/production-load proof' });
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, database: name }));
} catch (e) { await db.query('rollback').catch(() => {}); save('failure.json', { error: String(e.message), checks }); throw e; }
finally { await db.end(); }
