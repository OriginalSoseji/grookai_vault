// Read-only qualification of existing authority, not a portfolio capture or migration.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
const root = 'C:/gv_product_portfolio_history_20261008';
const base = 'C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008';
const parent = 'C:/gv_product_cost_history_20261008';
const commit = 'f19d39f20f35e030fffc9379d0d2eb1d854d6966';
const project = 'costhist-rel-full-436-v1-20261008';
const hash = b => createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p));
assert.equal(process.argv.length, 2);
assert.equal(fs.realpathSync('.').replaceAll('\\', '/').toLowerCase(), root.toLowerCase());
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
assert.equal(git(root, 'rev-parse', 'HEAD'), commit);
assert.equal(git(parent, 'rev-parse', 'HEAD'), commit);
assert.equal(git(parent, 'status', '--porcelain'), '');
const baseline = read(base + '/BASELINE_429.json');
assert.equal(baseline.status, 'passed'); assert.equal(baseline.comparison.normalizedBytes, 0);
assert.equal(baseline.sourceMigrations, 437); assert.equal(baseline.productionWrites, 0);
const freeze = read('C:/grookai_vault_operator_artifacts/product_cost_history_20261008/full-437-v1/freeze.json');
assert.equal(Object.keys(freeze.sourceHashes).length, 437);
assert.equal(fs.readdirSync(root + '/supabase/migrations').filter(n => n.endsWith('.sql')).length, 437);
for (const [name, digest] of Object.entries(freeze.sourceHashes)) {
  assert.equal(hash(fs.readFileSync(root + '/supabase/migrations/' + name)), digest, name);
}
const docker = (...args) => JSON.parse(execFileSync('docker', args, { encoding: 'utf8', windowsHide: true }));
const container = docker('inspect', 'supabase_db_' + project)[0];
assert.equal(container.State.Running, true);
assert.equal(container.Config.Image, 'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [project]);
assert.equal(docker('network', 'inspect', project)[0].Internal, true);
const out = base + '/authority-' + Date.now(); fs.mkdirSync(out);
const client = new pg.Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:35260/postgres?options=-c%20default_transaction_read_only%3Don', connectionTimeoutMillis: 10000 });
let connected = false;
try {
  await client.connect(); connected = true;
  await client.query('begin isolation level repeatable read read only');
  await client.query("set local statement_timeout='30s'");
  const environment = (await client.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
  assert.equal(environment.address, container.NetworkSettings.Networks[project].IPAddress);
  assert.equal(environment.readonly, 'on'); assert.equal(environment.migrations, 436);
  const constraints = (await client.query(`select conrelid::regclass::text relation,conname name,pg_get_constraintdef(oid) definition
    from pg_constraint where conrelid in ('public.vault_item_instances'::regclass,'public.market_price_publication_snapshots'::regclass)
    order by conrelid::regclass::text,conname`)).rows;
  assert.ok(constraints.some(c => c.name === 'vault_item_instances_identity_anchor_exactly_one' && /num_nonnulls/.test(c.definition)));
  assert.ok(constraints.some(c => c.relation === 'vault_item_instances' && /user_id.*REFERENCES auth.users\(id\) ON DELETE CASCADE/.test(c.definition)));
  const numeric = (await client.query("select atttypmod from pg_attribute where attrelid='public.market_price_publication_snapshots'::regclass and attname='market_price'")).rows[0];
  assert.equal(numeric.atttypmod, -1);
  const objects = (await client.query(`select 'view' kind,c.relname name,pg_get_viewdef(c.oid,true) definition from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('v_market_price_current_v1','vault_sealed_current_evidence_v1')
    union all select 'function',p.proname,pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('get_market_pricing_read_model_v1','get_owned_sealed_totals_v1','get_market_price_history_v1')
    order by kind,name`)).rows;
  assert.equal(objects.length, 5);
  const raw = objects.find(o => o.name === 'v_market_price_current_v1').definition;
  for (const marker of ['market_price_current_publication', 'reconciliation_state', 'reviewed_invalidation', 'jungle_edition_price_row_valid_v1', 'hidden_pending_review']) assert.ok(raw.includes(marker), marker);
  const sealed = objects.find(o => o.name === 'vault_sealed_current_evidence_v1').definition;
  for (const marker of ['sealed_product_release_pointer', 'qualification', 'observed_on', 'image_release']) assert.ok(sealed.includes(marker), marker);
  const arithmetic = (await client.query(`select sum(v)::text exact_before,round(sum(v),2)::text display_before
    from (values (0.014::numeric),(0.014::numeric),(0.014::numeric)) x(v)`)).rows[0];
  assert.deepEqual(arithmetic, { exact_before: '0.042', display_before: '0.04' });
  const special = (await client.query("select ('NaN'::numeric > 0) nan_passes_positive_check,('Infinity'::numeric > 0) infinity_passes_positive_check,round(-0.005::numeric,2)::text negative_half,('9007199254740993.000000000000000000000003'::numeric-'9007199254740993.000000000000000000000001'::numeric)::text tiny_difference")).rows[0];
  assert.equal(special.nan_passes_positive_check, true); assert.equal(special.infinity_passes_positive_check, true);
  assert.equal(special.negative_half, '-0.01'); assert.equal(special.tiny_difference, '0.000000000000000000000002');
  const historyAuthorities = (await client.query("select tablename from pg_tables where schemaname='public' and tablename ~ '(portfolio|vault_value_history|collection_value_history)' order by tablename")).rows;
  assert.deepEqual(historyAuthorities, []);
  await client.query('rollback');
  fs.writeFileSync(out + '/schema.private.json', JSON.stringify({ constraints, objects }, null, 2), { flag: 'wx' });
  const receipt = { status: 'passed', at: new Date().toISOString(), project, environment,
    producerSha256: hash(fs.readFileSync(import.meta.filename)), baselineSha256: hash(fs.readFileSync(base + '/BASELINE_429.json')),
    existingMigrationsUnchanged: 437, schemaEvidenceSha256: hash(fs.readFileSync(out + '/schema.private.json')),
    objectHashes: Object.fromEntries(objects.map(o => [o.name, hash(o.definition)])), arithmetic, special,
    portfolioTablesFound: 0, numericUnrestricted: true, ownerCascadePresent: true, allAnchorsPreserved: true,
    productionWrites: 0, localWrites: 0, captureRuntimeQualified: false, out };
  fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2), { flag: 'wx' });
  fs.writeFileSync(base + '/AUTHORITY_REVIEW_V1.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ status: receipt.status, out, localWrites: 0, productionWrites: 0 }));
} catch (error) {
  fs.writeFileSync(out + '/failure.json', JSON.stringify({ status: 'failed', at: new Date().toISOString(), message: error.message,
    productionWrites: 0, localWrites: 0 }, null, 2), { flag: 'wx' }); throw error;
} finally {
  if (connected) await client.query('rollback').catch(() => {});
  await client.end();
}
