import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { assertFreshDependencyAbsence, inspectFreshAbsence } from '../../backend/catalog/pokemon_dependency_fresh_absence_v1.mjs';
import { EMPTY } from '../../backend/catalog/pokemon_dependency_lookup_v1.mjs';

const [name, out] = process.argv.slice(2);
assert.equal(process.argv.length, 4); assert.match(name ?? '', /^grookai_dependency_absence_[a-z0-9_]+$/); assert.ok(name.length <= 63);
const url = new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/postgres');
assert.ok(!fs.existsSync(out)); fs.mkdirSync(out);
const save = (file, value) => fs.writeFileSync(out + '/' + file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const admin = new pg.Client({ connectionString: url.href, ssl: false }); await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0);
await admin.query('create database ' + name); await admin.end(); url.pathname = '/' + name;
const connect = async () => { const c = new pg.Client({ connectionString: url.href, ssl: false }); await c.connect(); await c.query("set statement_timeout='10s'"); await c.query("set lock_timeout='1s'"); return c; };
const db = await connect(), other = await connect(), checks = [], runtimes = [];
const scope = (type, fresh) => ({ source_schema: 'public', source_table: 'absence_fixture', source_columns: [type === 'uuid' ? 'parent_id' : 'mapping_id'], type, fresh, existing: [], pending_generated_ids: false });
const allRows = "select count(*)::text count,encode(sha256(convert_to(string_agg(md5(to_jsonb(t)::text),'' order by id),'UTF8')),'hex') digest from absence_fixture t";
try {
  await db.query('create table absence_fixture(id bigint primary key,mapping_id bigint,parent_id uuid,active boolean not null,payload text not null)');
  await db.query("insert into absence_fixture select i,case when i<=200000 then i end,case when i<=200000 then md5(i::text)::uuid end,true,repeat(md5(i::text),8) from generate_series(1,250000) i");
  await db.query("insert into absence_fixture values (250001,1,md5('1')::uuid,false,'inactive duplicate')");
  await db.query('analyze absence_fixture');
  const baseline = (await db.query(allRows)).rows[0];
  const big = Array.from({ length: 102 }, (_, i) => String(-9223372036854775808n + BigInt(i)));
  const uuids = (await db.query("select md5(('absent'||i)::text)::uuid id from generate_series(1,102) i")).rows.map(r => r.id);
  await assert.rejects(() => assertFreshDependencyAbsence(db, scope('bigint', big)), /fresh_absence_unqualified/); checks.push('large unindexed absence refused');
  await db.query('create index absence_mapping_idx on absence_fixture(mapping_id)');
  await db.query('create index absence_parent_idx on absence_fixture(parent_id) where parent_id is not null');
  for (const [type, ids] of [['bigint', big], ['uuid', uuids]]) {
    for (const count of [102, 92]) {
      const s = scope(type, ids.slice(0, count)), before = performance.now();
      await db.query('begin isolation level repeatable read read only');
      const inspection = await inspectFreshAbsence(db, s); save(type + '-' + count + '-plan.json', inspection); assert.ok(inspection.qualified);
      assert.deepEqual(await assertFreshDependencyAbsence(db, s), EMPTY); await db.query('commit');
      runtimes.push({ type, count, duration_ms: performance.now() - before }); checks.push(type + count + ' actual absence returns exact EMPTY');
    }
    for (const at of [0, 101]) {
      await db.query('begin'); const s = scope(type, ids);
      await db.query(`insert into absence_fixture(id,${s.source_columns[0]},active,payload) values (300001,$1,false,'held inactive')`, [ids[at]]);
      await assert.rejects(() => assertFreshDependencyAbsence(db, s), /unexpected_fresh_dependency/);
      await db.query('rollback'); assert.deepEqual(await assertFreshDependencyAbsence(db, s), EMPTY);
      checks.push(type + ' inactive reference at selected ID ' + at + ' rejects; rollback restores absence');
    }
  }
  await assert.rejects(() => assertFreshDependencyAbsence(db, scope('bigint', ['1'])), /unexpected_fresh_dependency/);
  checks.push('duplicate active/inactive references never become empty hash');
  await assert.rejects(() => db.query('create unique index concurrently absence_invalid_idx on absence_fixture(mapping_id)'), e => e.code === '23505');
  await db.query('begin'); await db.query('drop index absence_mapping_idx');
  const invalid = await inspectFreshAbsence(db, scope('bigint', big)); save('invalid-index.json', invalid);
  assert.equal(invalid.metadata.indexes.find(i => i.name === 'absence_invalid_idx').valid, false);
  await assert.rejects(() => assertFreshDependencyAbsence(db, scope('bigint', big)), /fresh_absence_unqualified/);
  await db.query('rollback'); checks.push('actual invalid concurrent index and index removal refuse execution');
  await db.query('begin'); await db.query('set local role pg_read_all_data');
  await assert.rejects(() => assertFreshDependencyAbsence(db, scope('bigint', big)), /unrestricted_dependency_reader_required/);
  await db.query('rollback'); checks.push('actual restricted reader rejected before data query');
  await other.query('begin'); await other.query('lock table absence_fixture in access exclusive mode');
  await assert.rejects(() => assertFreshDependencyAbsence(db, scope('bigint', big)), e => e.code === '55P03');
  await other.query('rollback'); assert.deepEqual(await assertFreshDependencyAbsence(db, scope('bigint', big)), EMPTY);
  checks.push('concurrent exclusive lock reaches bounded timeout and rollback restores lookup');
  await db.query('begin isolation level repeatable read read only');
  assert.deepEqual(await assertFreshDependencyAbsence(db, scope('bigint', big)), EMPTY);
  await other.query('insert into absence_fixture values(300002,$1,null,false,$2)', [big[101], 'concurrent committed reference']);
  // A snapshot cannot see a later commit: callers still require their source
  // fence/locks and post-write independent reconciliation. This is not a lock.
  assert.deepEqual(await assertFreshDependencyAbsence(db, scope('bigint', big)), EMPTY); await db.query('commit');
  await assert.rejects(() => assertFreshDependencyAbsence(db, scope('bigint', big)), /unexpected_fresh_dependency/);
  await other.query('delete from absence_fixture where id=300002');
  checks.push('concurrent commit detected by new snapshot; repeatable-read limitation explicitly demonstrated');
  await other.query('begin isolation level repeatable read read only');
  assert.deepEqual((await other.query(allRows)).rows[0], baseline);
  assert.deepEqual(await assertFreshDependencyAbsence(other, scope('uuid', uuids)), EMPTY);
  assert.deepEqual(await assertFreshDependencyAbsence(other, scope('bigint', big)), EMPTY); await other.query('commit');
  checks.push('independent full250001-row preservation and both whole102 readbacks');
  save('complete.json', { status: 'fresh_only_absence_qualified_locally', database: name, checks, runtimes, rows: 250001,
    null_rows: 50000, production_writes: 0, production_runtime_qualified: false,
    limits: 'Synthetic PostgreSQL16; snapshot absence is not a concurrency fence, PG17/Auth replay, generated-ID qualification or production authority' });
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, database: name }));
} catch (e) { await db.query('rollback').catch(() => {}); await other.query('rollback').catch(() => {}); save('failure.json', { error: String(e.message), checks }); throw e; }
finally { await db.end(); await other.end(); }
