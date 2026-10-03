import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { pokemonCoverageDatabaseTarget } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import { captureClassicProducer, assertClassicProducerUnchanged, readClassicSchemaFingerprint } from '../../backend/catalog/pokemon_classic_production_planning_v1.mjs';
import { assertWorld2010RelationshipExecution, reconcileWorld2010Relationships } from '../../backend/catalog/pokemon_world2010_relationship_execution_v1.mjs';
import { readWorld2010InboundCatalog, observeWorld2010Dependencies } from '../../backend/catalog/pokemon_world2010_dependency_preservation_v1.mjs';
import { loadSubsetOriginals } from '../audits/pokemon_world2010_subset_ingress_v1.mjs';
import { projectionHash as hash } from '../../backend/catalog/pokemon_world2010_identity_projection_v1.mjs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(plan-dir|ca-file|out-dir)=(.+)$/);
  assert.ok(m && !args.has(m[1]), 'unique_readonly_arguments_required'); args.set(m[1], path.resolve(m[2]));
}
assert.equal(args.size, 3, 'three_explicit_readonly_arguments_required');
const root = fileURLToPath(new URL('../../', import.meta.url)), out = args.get('out-dir');
assert.ok(!fs.existsSync(out), 'new_immutable_output_required'); fs.mkdirSync(out);
const read = f => JSON.parse(fs.readFileSync(f)), save = (f, v) => fs.writeFileSync(path.join(out, f), JSON.stringify(v, null, 2) + '\n', { flag: 'wx' });
let db;
try {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local', quiet: true });
  assert.equal(new URL(process.env.SUPABASE_URL).hostname, 'ycdxbpibncqcchqiihfz.supabase.co');
  assert.match(fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8'), /project_id = "ycdxbpibncqcchqiihfz"/);
  const plan = read(args.get('plan-dir') + '/plan.json'), originals = loadSubsetOriginals();
  assertWorld2010RelationshipExecution(plan, originals);
  const producer = await captureClassicProducer(root); save('producer.json', producer);
  const active = read(path.join(root, 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_cards_v1.json'));
  for (const row of plan.input.active_cards) assert.deepEqual(active.cards.find(c => c.key === row.key), row, 'active_master_identity_drift');
  const config = { connectionString: pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL).href,
    ssl: { rejectUnauthorized: true, ca: fs.readFileSync(args.get('ca-file'), 'utf8') }, connectionTimeoutMillis: 15000,
    options: '-c default_transaction_read_only=on', application_name: 'world2010_dependency_readonly_v1' };
  let first;
  for (let pass = 0; pass < 2; pass++) {
    db = new pg.Client(config); await db.connect(); await db.query('begin isolation level repeatable read read only');
    await db.query("set local statement_timeout='30s'"); await db.query("set local lock_timeout='3s'");
    const sanity = (await db.query('select (select count(*)::int from card_prints) cards,(select count(*)::int from sets) sets,(select count(*)::int from card_print_traits) traits')).rows[0];
    assert.ok(sanity.cards >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000, 'canonical_environment_gate');
    const relationship = await reconcileWorld2010Relationships(db, plan); assert.equal(relationship.status, 'absent', 'production_relationship_requires_separate_reconciliation');
    const catalog = await readWorld2010InboundCatalog(db), baseline = await observeWorld2010Dependencies(db, plan, originals, catalog);
    const schema = await readClassicSchemaFingerprint(db);
    const roots = [...new Set([...catalog.write_tables, ...catalog.rows.filter(r => r.source_schema === 'public').map(r => r.source_table)])];
    const columnTypes = (await db.query(`with recursive closure(oid) as (
      select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[])
      union select k.confrelid from closure r join pg_constraint k on k.conrelid=r.oid and k.contype='f')
      select n.nspname schema,c.relname table_name,a.attname column_name,a.attnum,format_type(a.atttypid,a.atttypmod) type,
        a.attnotnull,a.attgenerated,a.attidentity
      from closure r join pg_class c on c.oid=r.oid join pg_namespace n on n.oid=c.relnamespace
      join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
      order by n.nspname,c.relname,a.attnum`, [roots])).rows;
    const result = { sanity, relationship, catalog, baseline, schema_fingerprint: schema.fingerprint, column_types_fingerprint: hash(columnTypes) };
    await db.query('commit'); await db.end(); db = null;
    save(pass ? 'independent-readback.json' : 'baseline.json', result);
    if (pass) assert.deepEqual(result, first, 'independent_dependency_drift');
    else { first = result; save('schema.json', schema); save('world-dependency-column-types.json', columnTypes); }
  }
  await assertClassicProducerUnchanged(root, producer);
  const receipt = { at: new Date().toISOString(), status: 'world2010_dependency_baseline_independently_verified',
    plan_fingerprint: plan.fingerprint, producer_fingerprint: producer.fingerprint, schema_fingerprint: first.schema_fingerprint,
    sanity: first.sanity, inbound_constraints: first.catalog.rows.length, outside_constraints: first.baseline.rows.length,
    column_types_fingerprint: first.column_types_fingerprint,
    retained_raw_ids: 90, pending_generated_constraints: first.baseline.rows.filter(r => r.pending_generated_ids).length,
    retained_dependency_rows: first.baseline.rows.reduce((n, r) => n + BigInt(r.retained.count), 0n).toString(),
    independent_connections: 2, verified_tls: true, read_only: true, production_writes: 0, relationships_repaired: 0,
    nonempty_generated_mapping_performance_qualified: false, production_apply_authority: false };
  save('complete.json', receipt); console.log(JSON.stringify(receipt));
} catch (e) {
  if (db) { await db.query('rollback').catch(() => {}); await db.end().catch(() => {}); }
  save('failure.json', { at: new Date().toISOString(), message: String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]'), production_writes: 0 });
  console.error('World2010 read-only dependency observation stopped; see immutable failure.json'); process.exitCode = 1;
}
