import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { pokemonCoverageDatabaseTarget } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import { captureClassicProducer, assertClassicProducerUnchanged, readClassicSchemaFingerprint } from '../../backend/catalog/pokemon_classic_production_planning_v1.mjs';
import { readClassicInboundCatalog, classicDependencyScopes } from '../../backend/catalog/pokemon_classic_dependency_preservation_v1.mjs';
import { readWorld2010InboundCatalog, world2010DependencyScopes } from '../../backend/catalog/pokemon_world2010_dependency_preservation_v1.mjs';
import { inspectDependencyLookup } from '../../backend/catalog/pokemon_dependency_lookup_v1.mjs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(classic-plan|world-plan|ca-file|out-dir)=(.+)$/);
  assert.ok(m && !args.has(m[1]), 'unique_readonly_arguments_required'); args.set(m[1], path.resolve(m[2]));
}
assert.equal(args.size, 4, 'four_explicit_readonly_arguments_required');
const root = fileURLToPath(new URL('../../', import.meta.url)), out = args.get('out-dir');
assert.ok(!fs.existsSync(out), 'new_immutable_output_required'); fs.mkdirSync(out);
const read = f => JSON.parse(fs.readFileSync(f)), save = (f, v) => fs.writeFileSync(path.join(out, f), JSON.stringify(v, null, 2) + '\n', { flag: 'wx' });
let db;
try {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local', quiet: true });
  assert.equal(new URL(process.env.SUPABASE_URL).hostname, 'ycdxbpibncqcchqiihfz.supabase.co');
  assert.match(fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8'), /project_id = "ycdxbpibncqcchqiihfz"/);
  const classic = read(args.get('classic-plan')), world = read(args.get('world-plan'));
  const producer = await captureClassicProducer(root); save('producer.json', producer);
  const config = { connectionString: pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL).href,
    ssl: { rejectUnauthorized: true, ca: fs.readFileSync(args.get('ca-file'), 'utf8') }, connectionTimeoutMillis: 15000,
    options: '-c default_transaction_read_only=on', application_name: 'pokemon_dependency_lookup_explain_v1' };
  let first, stableFirst;
  for (let pass = 0; pass < 2; pass++) {
    db = new pg.Client(config); await db.connect(); await db.query('begin isolation level repeatable read read only');
    await db.query("set local statement_timeout='10s'"); await db.query("set local lock_timeout='3s'");
    const sanity = (await db.query('select (select count(*)::int from card_prints) cards,(select count(*)::int from sets) sets,(select count(*)::int from card_print_traits) traits')).rows[0];
    assert.ok(sanity.cards >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000, 'canonical_environment_gate');
    assert.equal((await db.query('select rolbypassrls or rolsuper unrestricted from pg_roles where rolname=current_user')).rows[0].unrestricted, true);
    const cc = await readClassicInboundCatalog(db), wc = await readWorld2010InboundCatalog(db), results = [];
    for (const [group, scopes, count] of [['classic102', classicDependencyScopes(classic, cc), 102], ['world92', world2010DependencyScopes(world, wc), 92]]) {
      for (const scope of scopes) {
        // Prospective probes are explicitly NOT generated IDs, absence readback,
        // performance proof or apply authority. They exercise a nonempty plan.
        const probeCount = scope.target_table === 'ingestion_jobs' ? (group === 'classic102' ? 1 : 2)
          : scope.target_table === 'raw_imports' ? (group === 'classic102' ? 21 : 83) : count;
        const probes = scope.pending_generated_ids ? Array.from({ length: probeCount }, (_, i) => String(9223372036854775807n - BigInt(i))) : [];
        const ids = [...new Set([...scope.fresh, ...scope.existing, ...probes])];
        assert.ok(ids.length, 'all_dependency_scopes_require_nonempty_plan');
        results.push({ group, constraint: scope.constraint_name, target: scope.target_table,
          prospective_probe_ids: probes.length, actual_generated_ids: false,
          inspection: await inspectDependencyLookup(db, scope, ids) });
      }
    }
    const schema = await readClassicSchemaFingerprint(db);
    const result = { sanity, catalogs: { classic: cc, world: wc }, schema_fingerprint: schema.fingerprint, results };
    await db.query('commit'); await db.end(); db = null;
    save(pass ? 'independent.json' : 'first.json', result);
    // Costs and heap growth can vary with healthy ingestion. Catalog/index
    // definitions, policy decisions and exact scopes must independently agree.
    const stable = { sanity, catalogs: result.catalogs, schema_fingerprint: result.schema_fingerprint,
      results: results.map(r => ({ group: r.group, constraint: r.constraint, target: r.target,
        prospective_probe_ids: r.prospective_probe_ids, relation: r.inspection.relation,
        ids_fingerprint: r.inspection.ids_fingerprint, query_fingerprint: r.inspection.query_fingerprint,
        indexes: r.inspection.metadata.indexes, qualified: r.inspection.qualified, classification: r.inspection.classification, reasons: r.inspection.reasons })) };
    if (pass) assert.deepEqual(stable, stableFirst, 'independent_lookup_policy_or_schema_drift');
    else { first = result; stableFirst = stable; }
  }
  await assertClassicProducerUnchanged(root, producer);
  const blocked = first.results.filter(r => !r.inspection.qualified);
  const receipt = { at: new Date().toISOString(), status: blocked.length ? 'nonempty_plan_inventory_with_explicit_blockers' : 'nonempty_plan_inventory_qualified_runtime_pending',
    producer_fingerprint: producer.fingerprint, schema_fingerprint: first.schema_fingerprint, sanity: first.sanity,
    scopes: first.results.length, qualified_plans: first.results.length - blocked.length,
    blocked: blocked.map(r => ({ group: r.group, relation: r.inspection.relation, column: r.inspection.column, reasons: r.inspection.reasons })),
    independent_connections: 2, verified_tls: true, read_only: true, dependency_aggregates_executed: 0,
    actual_generated_ids: false, production_runtime_qualified: false, production_schema_writes: 0, relationships_repaired: 0, production_apply_authority: false };
  save('complete.json', receipt); console.log(JSON.stringify(receipt));
} catch (e) {
  if (db) { await db.query('rollback').catch(() => {}); await db.end().catch(() => {}); }
  save('failure.json', { at: new Date().toISOString(), message: String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]'), production_writes: 0 });
  console.error('Dependency lookup observation stopped; see immutable failure.json'); process.exitCode = 1;
}
