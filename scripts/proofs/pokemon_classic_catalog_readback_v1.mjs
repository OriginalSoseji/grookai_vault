import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';

// Independent local catalog proof from a completed canonical proof clone.
// Production URLs, existing output directories and arbitrary templates fail closed.
const [inputDir, template, name, out] = process.argv.slice(2);
assert.match(template ?? '', /^grookai_classic_canonical_proof_[a-z0-9_]+$/);
assert.match(name ?? '', /^grookai_classic_catalog_proof_[a-z0-9_]+$/); assert.ok(out); fs.mkdirSync(out);
const save = (file, value) => fs.writeFileSync(out + '/' + file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const read = file => JSON.parse(fs.readFileSync(file));
const schema = read(inputDir + '/schema.json'), plan = read(inputDir + '/plan.json');
assert.equal(schema.fingerprint, hash(schema.snapshot));
const snapshot = schema.snapshot;
const url = new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/postgres');
const config = { connectionString: url.toString(), ssl: false, connectionTimeoutMillis: 15000 };
const admin = new pg.Client(config); await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0, 'fresh_database_required');
await admin.query(`create database ${name} template ${template}`); await admin.end();
url.pathname = '/' + name; config.connectionString = url.toString();
const db = new pg.Client(config); await db.connect(); const checks = [], observations = [];
try {
  await db.query('create schema auth');
  for (const f of snapshot.functions.filter(f => f.nspname === 'auth' && /^(auth\.)?role\(/.test(f.signature))) await db.query(f.definition);
  const additionalTables = ['catalog_game_release_controls', 'catalog_set_release_controls', 'card_print_cameos'];
  for (const table of additionalTables) {
    const columns = snapshot.columns.filter(c => c.table_name === table); assert.ok(columns.length);
    await db.query(`create table public.${table} (${columns.map(c => {
      assert.match(c.column_name, /^[a-z_]+$/);
      const type = c.data_type === 'ARRAY' ? c.udt_name.slice(1) + '[]' : c.udt_name; assert.match(type, /^[a-z0-9_]+(?:\[\])?$/);
      return `${c.column_name} ${type}${c.is_nullable === 'NO' ? ' not null' : ''}${c.column_default ? ' default ' + c.column_default : ''}`;
    }).join(',')})`);
    for (const c of snapshot.constraints.filter(c => c.table_name === table && c.contype !== 'f'))
      await db.query(`alter table public.${table} add constraint ${c.conname} ${c.definition}`);
  }
  const view = snapshot.relations.find(r => r.relname === 'v_card_print_cameos_public_v1'); assert.ok(view.view_definition);
  await db.query('create view public.v_card_print_cameos_public_v1 as ' + view.view_definition);
  const wanted = new Set(['get_public_catalog_sets_v2', 'get_search_set_catalog_v1', 'get_public_card_printing_options_v1',
    'search_game_card_prints_v4', 'search_game_card_prints_v5', 'search_print_identity_v1']);
  const selected = new Map();
  for (const name of wanted) {
    const found = snapshot.functions.filter(f => f.nspname === 'public' && f.signature.split('(')[0] === name); assert.ok(found.length, 'missing_function:' + name);
    for (const f of found) {
      selected.set(f.signature, f);
      for (const m of f.definition.matchAll(/public\.([a-z0-9_]+)\s*\(/g)) wanted.add(m[1]);
    }
  }
  let pending = [...selected.values()];
  while (pending.length) {
    const next = []; let progressed = 0;
    for (const f of pending) {
      try { await db.query(f.definition); progressed++; }
      catch (error) { if (!['42883', '42P01'].includes(error.code)) throw error; next.push(f); }
    }
    assert.ok(progressed, 'unresolved_dependencies:' + next.map(f => f.signature).join(',')); pending = next;
  }
  save('source-bindings.json', { schema_fingerprint: schema.fingerprint, function_hashes: [...selected].map(([signature, f]) => ({ signature, sha256: hash(f.definition) })),
    additional_tables: additionalTables, omitted_foreign_keys: snapshot.constraints.filter(c => additionalTables.includes(c.table_name) && c.contype === 'f'),
    readback_source_sha256: hash(fs.readFileSync(new URL(import.meta.url), 'utf8')) });
  const ids = plan.tables.card_prints.map(p => p.id), expectedSets = plan.tables.sets.map(p => p.code).sort();
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const search = async (set, query = null, lang = 'en', number = null) => q('select id,gv_id,number,set_code from public.search_game_card_prints_v4($1,$2,$3,$4,null,$5,64,0)', ['pokemon', query, set, number, lang]);
  const options = async () => q('select id,card_print_id,printing_gv_id from public.get_public_card_printing_options_v1($1::uuid[],1000,0)', [ids]);
  const expectedIds = rows => rows.map(r => r.id).sort();
  for (const role of ['anon', 'authenticated']) {
    await db.query('begin read only'); await db.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    const sets = await q("select code,card_count from public.get_public_catalog_sets_v2('pokemon') where code=any($1::text[]) order by code", [expectedSets]);
    assert.deepEqual(sets, expectedSets.map(code => ({ code, card_count: '34' })));
    const catalog = (await q("select get_search_set_catalog_v1('pokemon') data"))[0].data; assert.equal(catalog.complete, true);
    assert.deepEqual(catalog.sets.filter(s => expectedSets.includes(s.code)).map(s => s.code).sort(), expectedSets);
    for (const set of expectedSets) {
      const expected = plan.tables.card_prints.filter(p => p.set_code === set);
      assert.deepEqual(expectedIds(await search(set)), expectedIds(expected));
      assert.equal((await search(set, null, 'ja')).length, 0);
      const identity = await q('select parent_gv_id,printing_gv_id,object_type from public.search_print_identity_v1(null,$1,null,null,1000,0)', [set]);
      assert.deepEqual(identity.filter(r => r.object_type === 'parent_print').map(r => r.parent_gv_id).sort(), expected.map(p => p.gv_id).sort());
      assert.deepEqual(identity.filter(r => r.object_type === 'child_printing').map(r => r.printing_gv_id).sort(), expected.map(p => p.gv_id + '-HOLO').sort());
      for (const card of expected) {
        assert.deepEqual(expectedIds(await search(null, card.gv_id)), [card.id]);
        assert.deepEqual(expectedIds(await search(set, card.name, 'en', card.number)), [card.id]);
      }
    }
    assert.deepEqual(expectedIds(await options()), expectedIds(plan.tables.card_printings));
    await db.query('commit'); checks.push(role + ':3 exact34 catalogs,102 exact parent/child search documents,102 exact GVID and102 name-coordinate matches, Japanese exclusions and102 Holo options');
  }
  for (const [label, sql, args, expected] of [
    ['suppressed parent', "update card_prints set data_quality_flags='{\"app_visibility_v1\":{\"status\":\"suppressed\"}}' where id=$1", [ids[0]], 101],
    ['hidden review', "update card_printing_truth_reviews set public_visibility='hidden_pending_review' where card_printing_id=$1", [plan.tables.card_printings[0].id], 101],
    ['inactive finish', "update finish_keys set is_active=false where key='holo'", [], 0],
  ]) {
    await db.query('begin'); await db.query(sql, args); assert.equal((await options()).length, expected);
    if (label === 'suppressed parent') assert.equal((await search(null, plan.tables.card_prints[0].gv_id)).length, 0);
    // Preserve actual identity-search behavior independently of the options RPC.
    const identity = await q('select * from public.search_print_identity_v1($1,null,null,null,1000,0)', [plan.tables.card_printings[0].printing_gv_id]);
    observations.push({ scenario: label, printing_options: expected, identity_search_rows: identity.length });
    await db.query('rollback'); checks.push(label + ' excluded by actual options policy');
  }
  save('readback.json', { catalogs: expectedSets, parents: ids, children: plan.tables.card_printings.map(p => p.id), observations });
  save('proof.json', { status: 'passed', at: new Date().toISOString(), database: name, template, checks, observations,
    schema_fingerprint: schema.fingerprint, production_writes: 0, real_auth_or_http: false,
    limitations: ['SQL request-role claims only; no real login, JWT, HTTP, grants/RLS or website proof.',
      'Catalog/cameo foreign keys to unrelated application/Auth tables inventoried but not replayed; full application replay remains required.',
      'Image pointers remain absent; canonical candidate is not collector-complete.',
      'Identity-search child visibility and printing-options visibility are measured separately; inherited discrepancies are not silently declared fixed.'] });
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, observations, production_writes: 0 }));
} catch (error) {
  await db.query('rollback'); save('failure.json', { at: new Date().toISOString(), error: error.message, code: error.code, checks }); throw error;
} finally { await db.end(); }
