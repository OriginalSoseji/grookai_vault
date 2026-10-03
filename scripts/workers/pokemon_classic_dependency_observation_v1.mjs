import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { pokemonCoverageDatabaseTarget } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import { loadClassicCanonicalBundle } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { loadClassicFrozenPackage } from '../../backend/catalog/pokemon_classic_frozen_package_v1.mjs';
import { assertClassicProducerUnchanged, verifyClassicProductionObservation } from '../../backend/catalog/pokemon_classic_production_planning_v1.mjs';
import { readClassicInboundCatalog, observeClassicDependencies } from '../../backend/catalog/pokemon_classic_dependency_preservation_v1.mjs';

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(state-dir|observation-dir|ca-file|out-dir)=(.+)$/);
  assert.ok(m && !args.has(m[1]), 'unique_readonly_arguments_required'); args.set(m[1], path.resolve(m[2]));
}
assert.equal(args.size, 4);
const root = fileURLToPath(new URL('../../', import.meta.url)), out = args.get('out-dir'), state = args.get('state-dir');
assert.ok(!fs.existsSync(out), 'new_immutable_output_required'); fs.mkdirSync(out);
const read = file => JSON.parse(fs.readFileSync(file));
const save = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
let db;
try {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local', quiet: true });
  assert.equal(new URL(process.env.SUPABASE_URL).hostname, 'ycdxbpibncqcchqiihfz.supabase.co');
  assert.match(fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8'), /project_id = "ycdxbpibncqcchqiihfz"/);
  const source = args.get('observation-dir'), observation = read(source + '/observation.json'), plan = read(source + '/plan.json');
  assert.equal(read(source + '/complete.json').status, 'whole102_production_observation_qualified');
  const frozen = loadClassicFrozenPackage(root);
  const bundle = loadClassicCanonicalBundle({ qualificationAt: frozen.qualification_at, stagingDir: state + '/classic-finish-staging-v3',
    speciesFile: source + '/species.json', observationFile: state + '/classic-family-evidence-v2/clv032-physical-domain-observation.json' });
  const config = { connectionString: pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL).href,
    ssl: { rejectUnauthorized: true, ca: fs.readFileSync(args.get('ca-file'), 'utf8') }, connectionTimeoutMillis: 15000,
    options: '-c default_transaction_read_only=on', application_name: 'classic_dependency_readonly_v1' };
  let first, catalog;
  for (let pass = 0; pass < 2; pass++) {
    await assertClassicProducerUnchanged(root, observation.producer);
    db = new pg.Client(config); await db.connect(); await db.query('begin isolation level repeatable read read only');
    await db.query("set local statement_timeout='30s'"); await db.query("set local lock_timeout='3s'");
    await verifyClassicProductionObservation(db, observation, plan, bundle, frozen);
    const current = await readClassicInboundCatalog(db);
    if (pass === 0) { catalog = current; save('catalog.json', catalog); }
    else assert.deepEqual(current, catalog, 'independent_catalog_drift');
    const result = await observeClassicDependencies(db, plan, current);
    await db.query('commit'); await db.end(); db = null;
    if (pass === 0) { first = result; save('baseline.json', result); }
    else { assert.deepEqual(result, first, 'independent_dependency_drift'); save('independent-readback.json', result); }
  }
  await assertClassicProducerUnchanged(root, observation.producer);
  const receipt = { at: new Date().toISOString(), status: 'outside_dependency_baseline_independently_verified',
    canonical_fingerprint: plan.fingerprint, catalog_fingerprint: catalog.fingerprint, baseline_fingerprint: first.fingerprint,
    all_inbound_constraints: catalog.rows.length, outside_constraints: first.rows.length,
    pending_generated_constraints: first.rows.filter(r => r.pending_generated_ids).length,
    unvalidated_constraints: first.rows.filter(r => !r.validated).map(r => r.key),
    retained_dependency_rows: first.rows.reduce((n, r) => n + BigInt(r.retained.count), 0n).toString(),
    production_writes: 0, independently_verified: true, verified_tls: true, read_only: true,
    full_application_replay: false, production_apply_authority: false };
  save('receipt.json', receipt); console.log(JSON.stringify(receipt));
} catch (error) {
  if (db) { await db.query('rollback').catch(() => {}); await db.end().catch(() => {}); }
  save('failure.json', { at: new Date().toISOString(), message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]'), production_writes: 0 });
  console.error('Read-only dependency observation stopped; see immutable failure.json'); process.exitCode = 1;
}
