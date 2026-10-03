import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { readClassicSchemaFingerprint } from '../../backend/catalog/pokemon_classic_production_planning_v1.mjs';

// Extend only a newly created loopback proof clone. Original labs are templates,
// never mutation targets; no production/user dependency rows are exported.
export async function replayWorld2010Dependencies(db, inputDir, schemaFile, roles, out) {
  const target = (await db.query('select current_database() name,host(inet_server_addr()) address')).rows[0];
  assert.match(target.name, /^grookai_world2010_subset_canonical_[a-z0-9_]+$/);
  assert.ok(['127.0.0.1', '::1'].includes(target.address));
  const read = f => JSON.parse(fs.readFileSync(f)), sha = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const p = read(inputDir + '/replay-inputs.json'), receipt = read(inputDir + '/complete.json'), full = read(schemaFile);
  assert.equal(sha(schemaFile), receipt.input_sha256); assert.equal(hash(full.snapshot), full.fingerprint);
  const typeRows = read(path.join(path.dirname(schemaFile), 'world-dependency-column-types.json'));
  const sourceReceipt = read(path.join(path.dirname(schemaFile), 'complete.json'));
  assert.equal(sourceReceipt.status, 'world2010_dependency_baseline_independently_verified');
  assert.equal(sourceReceipt.column_types_fingerprint, hash(typeRows));
  const names = p.relations.map(r => r.relname), has = n => names.includes(n), q = s => '"' + s.replaceAll('"', '""') + '"';
  assert.deepEqual([...names].sort(), receipt.public_dependency_closure);
  assert.deepEqual([...new Set(typeRows.map(r => r.table_name))].sort(), [...names].sort());
  assert.ok(typeRows.every(r => r.schema === 'public')); assert.equal(typeRows.length, p.columns.length);
  for (const [k, field] of [['relations', 'relname'], ['columns', 'table_name'], ['constraints', 'table_name'], ['indexes', 'tablename'], ['triggers', 'table_name'], ['policies', 'tablename']]) {
    assert.deepEqual(p[k], full.snapshot[k].filter(r => has(r[field])), 'closure_source_drift:' + k);
  }
  const existing = (await db.query("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'")).rows.map(r => r.relname);
  const missing = names.filter(n => !existing.includes(n)), missingSet = new Set(missing), statements = [];
  const run = async sql => { statements.push(sql); return db.query(sql); };
  const translate = r => { assert.ok(r === 'public' || roles[r], 'unknown_replay_role:' + r); return r === 'public' ? 'public' : q(roles[r]); };
  const acl = async (kind, object, value, map) => {
    await run(`revoke all on ${kind} ${object} from public`);
    for (const m of (value ?? '').matchAll(/(?:^\{|,)([^=]*)=([a-zA-Z*]+)\/[^,}]+/g)) {
      const role = translate(m[1] || 'public');
      for (let i = 0; i < m[2].length; i++) {
        const char = m[2][i]; if (char === '*' || char === 'm') continue;
        assert.ok(map[char], 'unknown_replay_privilege');
        await run(`grant ${map[char]} on ${kind} ${object} to ${role}${m[2][i + 1] === '*' ? ' with grant option' : ''}`);
      }
    }
  };
  const functions = [];
  try {
    for (const table of missing) {
      const cols = p.columns.filter(c => c.table_name === table);
      for (const c of cols) {
        const seq = c.column_default?.match(/^nextval\('([a-z_]+)'::regclass\)$/)?.[1];
        if (seq) await run(`create sequence public.${q(seq)} start 20000000`);
        assert.ok(c.udt_schema === 'pg_catalog', 'additional_type_requires_explicit_replay:' + c.udt_schema + '.' + c.udt_name);
      }
      await run(`create table public.${q(table)} (${cols.map(c => `${q(c.column_name)} ${typeRows.find(r => r.table_name === table && r.column_name === c.column_name).type}${c.is_generated === 'ALWAYS' ? ' generated always as (' + c.generation_expression + ') stored' : ''}${c.is_identity === 'YES' ? ' generated ' + c.identity_generation + ' as identity' : ''}${c.is_nullable === 'NO' ? ' not null' : ''}${c.column_default ? ' default ' + c.column_default : ''}`).join(',')})`);
    }
    for (const fk of [false, true]) for (const c of p.constraints.filter(c => missingSet.has(c.table_name) && (c.contype === 'f') === fk)) {
      await run(`alter table public.${q(c.table_name)} add constraint ${q(c.conname)} ${c.definition}`);
    }
    for (const i of p.indexes.filter(i => missingSet.has(i.tablename))) {
      if (!(await db.query('select to_regclass($1) name', ['public.' + i.indexname])).rows[0].name) await run(i.indexdef);
    }
    for (const t of p.triggers.filter(t => missingSet.has(t.table_name))) {
      const signature = t.definition.match(/EXECUTE FUNCTION ([a-z_][a-z0-9_]*\(\))/)?.[1]; assert.ok(signature, 'trigger_function_shape');
      const f = full.snapshot.functions.find(f => f.signature === signature); assert.ok(f, 'missing_captured_trigger_function');
      if (!(await db.query('select to_regprocedure($1) name', [signature])).rows[0].name) {
        await run(f.definition); await run(`alter function ${f.signature} owner to ${translate(f.owner)}`);
        if (f.proacl !== null) await acl('function', f.signature, f.proacl, { X: 'execute' });
      }
      functions.push(f); await run(t.definition);
    }
    for (const r of p.relations.filter(r => missingSet.has(r.relname))) {
      const object = 'public.' + q(r.relname);
      await run(`alter table ${object} owner to ${translate(r.owner)}`);
      await acl('table', object, r.relacl, { r: 'select', a: 'insert', w: 'update', d: 'delete', D: 'truncate', x: 'references', t: 'trigger' });
      await run(`alter table ${object} ${r.relrowsecurity ? 'enable' : 'disable'} row level security`);
      await run(`alter table ${object} ${r.relforcerowsecurity ? 'force' : 'no force'} row level security`);
      for (const c of p.columns.filter(c => c.table_name === r.relname)) {
        const seq = c.column_default?.match(/^nextval\('([a-z_]+)'::regclass\)$/)?.[1];
        if (seq) {
          const meta = full.snapshot.relations.find(x => x.relname === seq); assert.ok(meta, 'captured_sequence_required');
          await run(`alter sequence public.${q(seq)} owner to ${translate(meta.owner)}`);
          await acl('sequence', 'public.' + q(seq), meta.relacl, { r: 'select', w: 'update', U: 'usage' });
        }
      }
    }
    for (const policy of p.policies.filter(r => missingSet.has(r.tablename))) {
      await run(`create policy ${q(policy.policyname)} on public.${q(policy.tablename)} as ${policy.permissive} for ${policy.cmd} to ${policy.roles.slice(1, -1).split(',').map(translate).join(',')}${policy.qual ? ' using (' + policy.qual + ')' : ''}${policy.with_check ? ' with check (' + policy.with_check + ')' : ''}`);
    }
    await db.query('begin isolation level repeatable read read only');
    const actual = (await readClassicSchemaFingerprint(db)).snapshot; await db.query('commit');
    const actualTypes = (await db.query(`select n.nspname schema,c.relname table_name,a.attname column_name,a.attnum,format_type(a.atttypid,a.atttypmod) type,
      a.attnotnull,a.attgenerated,a.attidentity from pg_class c join pg_namespace n on n.oid=c.relnamespace
      join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where n.nspname='public' and c.relname=any($1::text[])
      order by n.nspname,c.relname,a.attnum`, [names])).rows;
    const logicalTypes = rows => rows.map(({ attnum, ...r }) => r);
    assert.deepEqual(logicalTypes(actualTypes), logicalTypes(typeRows), 'actual_precision_or_type_drift');
    for (const [k, field] of [['columns', 'table_name'], ['constraints', 'table_name'], ['indexes', 'tablename'], ['triggers', 'table_name']]) {
      // Re-created relations omit production's dropped physical attribute slots.
      // Preserve live-column ordering and every captured logical attribute.
      const logical = rows => k === 'columns' ? rows.map(({ ordinal_position, ...r }) => r) : rows;
      assert.deepEqual(logical(actual[k].filter(r => has(r[field]))), logical(p[k]), 'actual_closure_schema_drift:' + k);
    }
    for (const r of p.relations) {
      const a = actual.relations.find(a => a.relname === r.relname); assert.equal(a.owner, roles[r.owner]);
      assert.equal(a.relrowsecurity, r.relrowsecurity); assert.equal(a.relforcerowsecurity, r.relforcerowsecurity);
    }
    for (const f of functions) {
      const a = actual.functions.find(a => a.signature === f.signature); assert.equal(a.definition, f.definition); assert.equal(a.owner, roles[f.owner]);
    }
    const normalizeRoles = r => ({ ...r, roles: '{' + r.roles.slice(1, -1).split(',').map(v => roles[v] ?? v).sort().join(',') + '}' });
    assert.deepEqual(actual.policies.filter(r => has(r.tablename)), p.policies.map(normalizeRoles), 'actual_closure_policy_drift');
    const result = { status: 'actual_world2010_inbound_schema_closure_replayed', database: target.name, schema_sha256: sha(schemaFile), input_sha256: sha(inputDir + '/replay-inputs.json'),
      missing_tables_added: missing, counts: Object.fromEntries(['relations', 'columns', 'constraints', 'indexes', 'triggers', 'policies'].map(k => [k, p[k].length])),
      independent_catalog_readback: true, production_writes: 0, limits: ['PostgreSQL16 clone; PostgreSQL17 MAINTAIN privilege unavailable', 'Dropped physical attribute slots omitted; live column order and captured logical attributes compared', 'No real Auth/HTTP or production performance proof', 'No production dependency payloads copied'] };
    result.column_types_fingerprint = hash(typeRows);
    fs.writeFileSync(out + '/dependency-schema.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); return result;
  } finally {
    fs.writeFileSync(out + '/dependency-schema-executed.sql', statements.join(';\n') + ';\n', { flag: 'wx' });
  }
}
