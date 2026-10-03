import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import { pokemonCoverageDatabaseTarget, readPokemonWarehouseSnapshot, reconcilePokemonWarehouse } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import { buildGroupDiscoveryIntakePlan, readGroupRawReceipts } from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';
import { loadClassicCanonicalBundle, assertClassicBundleFilesUnchanged } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { bindClassicIdentityHashes, assertClassicCanonicalAbsence } from '../../backend/catalog/pokemon_classic_canonical_admission_v1.mjs';
import { VERSION, PROJECT, captureClassicProducer, assertClassicProducerUnchanged, readClassicSchemaFingerprint,
  buildClassicProductionObservation, verifyClassicProductionObservation } from '../../backend/catalog/pokemon_classic_production_planning_v1.mjs';

import { loadClassicFrozenPackage, buildClassicFrozenPlan, classicFrozenPackageBinding, assertClassicFrozenPackageUnchanged } from '../../backend/catalog/pokemon_classic_frozen_package_v1.mjs';

// No apply mode, ledger mutation, historical-plan input or authorization switch.
const args = new Map();
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(scope|staging-dir|observation|ca-file|out-dir)=(.+)$/);
  assert.ok(m && !args.has(m[1]), 'unique_scope_staging_observation_ca_output_arguments_required'); args.set(m[1], path.resolve(m[2]));
}
assert.equal(args.size, 5);
const root = fileURLToPath(new URL('../../', import.meta.url)), out = args.get('out-dir');
assert.ok(!fs.existsSync(out), 'new_immutable_output_required');
assert.ok(out !== args.get('staging-dir') && !out.startsWith(args.get('staging-dir') + path.sep));
fs.mkdirSync(out);
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const run = { version: VERSION, run_id: randomUUID(), at: new Date().toISOString(), mode: 'read_only_plan', production_writes: 0 };
save('start.json', run);
let db, reader, phase = 'target_validation';
try {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local', quiet: true });
  assert.equal(new URL(process.env.SUPABASE_URL).hostname, `${PROJECT}.supabase.co`);
  assert.match(fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8'), /project_id = "ycdxbpibncqcchqiihfz"/);
  const target = pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL);
  const config = { connectionString: target.toString(), ssl: { rejectUnauthorized: true, ca: fs.readFileSync(args.get('ca-file'), 'utf8') },
    connectionTimeoutMillis: 15000, options: '-c default_transaction_read_only=on', application_name: 'pokemon_classic_production_plan_v1' };
  const producer = await captureClassicProducer(root); save('producer.json', producer);
  const begin = async client => {
    await client.connect(); await client.query('begin isolation level repeatable read read only');
    await client.query("set local statement_timeout='90s'"); await client.query("set local lock_timeout='5s'");
  };
  db = new pg.Client(config); await begin(db); phase = 'environment_and_whole_group';
  const sanity = (await db.query(`select (select count(*)::int from card_prints) cards,
    (select count(*)::int from sets) sets,(select count(*)::int from card_print_traits) traits`)).rows[0];
  assert.ok(sanity.cards >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000, 'canonical_environment_gate');
  save('environment.json', { project: PROJECT, observed_at: new Date().toISOString(), sanity, verified_tls: true, read_only: true });
  const coverage = reconcilePokemonWarehouse(await readPokemonWarehouseSnapshot(db), { observedAt: new Date().toISOString() });
  const scope = JSON.parse(fs.readFileSync(args.get('scope')));
  assert.deepEqual(Object.keys(scope).sort(), ['category_id', 'expected_product_ids', 'group_id']);
  assert.equal(scope.category_id, 3); assert.equal(scope.group_id, 23323); assert.equal(scope.expected_product_ids.length, 103);
  const products = (await db.query('select * from public.tcgcsv_source_products where category_id=3 and group_id=23323 order by product_id')).rows;
  const discovery = (await db.query('select * from public.external_discovery_candidates where tcgplayer_id=any($1::text[]) order by id', [products.map(p => String(p.product_id))])).rows;
  const raw_receipts = await readGroupRawReceipts(db, products, discovery);
  const ingress = buildGroupDiscoveryIntakePlan({ observed_at: coverage.observed_at, ...scope, products, discovery, raw_receipts,
    coverage_rows: coverage.rows.filter(r => Number(r.category_id) === 3 && Number(r.group_id) === 23323) });
  save('ingress.json', ingress); save('coverage-summary.json', coverage.summary);
  save('group-coverage.json', coverage.rows.filter(r => Number(r.category_id) === 3 && Number(r.group_id) === 23323));
  save('gamestop.json', coverage.rows.filter(r => r.retailer === 'gamestop'));
  save('species.json', (await db.query('select id,national_dex_number,display_name from pokemon_species where active order by national_dex_number,id')).rows);
  phase = 'source_replay_and_collision_checks';
  const frozen = loadClassicFrozenPackage(root); save('package-binding.json', classicFrozenPackageBinding(frozen));
  const bundle = loadClassicCanonicalBundle({ stagingDir: args.get('staging-dir'), speciesFile: path.join(out, 'species.json'),
    observationFile: args.get('observation'), qualificationAt: frozen.qualification_at });
  const built = buildClassicFrozenPlan(bundle, ingress, frozen), plan = built.plan;
  await bindClassicIdentityHashes(db, plan); await assertClassicCanonicalAbsence(db, plan);
  const schema = await readClassicSchemaFingerprint(db); save('schema.json', schema);
  const observation = buildClassicProductionObservation({ plan, schema, producer, sanity, coverage: coverage.summary, observedAt: coverage.observed_at, frozenBinding: classicFrozenPackageBinding(frozen) });
  await db.query('commit'); await db.end(); db = null;
  save('plan.json', plan); save('observation.json', observation);
  for (const manifest of plan.manifests) save(manifest.set_code + '-manifest.json', manifest);
  fs.mkdirSync(path.join(out, 'reviews'));
  for (const [ref, bytes] of built.reviewArtifacts) fs.writeFileSync(path.join(out, ref), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'classic-master-projection.json'), built.masterBytes, { flag: 'wx' });
  phase = 'independent_read_only_verification';
  reader = new pg.Client({ ...config, application_name: 'pokemon_classic_plan_independent_readback_v1' }); await begin(reader);
  const readback = await verifyClassicProductionObservation(reader, observation, plan, bundle, frozen);
  await reader.query('commit'); await reader.end(); reader = null;
  assertClassicBundleFilesUnchanged(bundle); assertClassicFrozenPackageUnchanged(frozen); await assertClassicProducerUnchanged(root, producer);
  save('independent-readback.json', { ...readback, at: new Date().toISOString() });
  save('input-hashes.json', [...bundle.inputHashes].map(([file, sha256]) => ({ file, sha256 })));
  const complete = { ...run, at: new Date().toISOString(), status: 'whole102_production_observation_qualified',
    plan_fingerprint: plan.fingerprint, observation_fingerprint: observation.fingerprint,
    schema_fingerprint: schema.fingerprint, schema_relations: schema.snapshot.relations.length, schema_functions: schema.snapshot.functions.length,
    producer_fingerprint: producer.fingerprint, producer_committed: producer.clean, frozen_package_fingerprint: frozen.fingerprint, source_reviewed_at: frozen.qualification_at, sanity, coverage: coverage.summary,
    counts: observation.counts, retained: 81, new_ingress: 21, independently_verified: true, open_gates: observation.open_gates,
    production_apply_enabled: false, task_complete: false };
  save('complete.json', complete); console.log(JSON.stringify(complete));
} catch (error) {
  for (const client of [db, reader]) if (client) { await client.query('rollback').catch(() => {}); await client.end().catch(() => {}); }
  const failure = { ...run, at: new Date().toISOString(), status: 'stopped', phase, error_code: error.code || 'CLASSIC_PLANNING_STOPPED',
    // Never serialize connections, environment, driver objects or SQL parameters.
    error_detail: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted database URL]'),
    unknown_write: false, recovery: 'Preserve this directory; resolve the exact failure and use a new observation directory.' };
  save('failure.json', failure); console.error(JSON.stringify(failure)); process.exitCode = 1;
}
