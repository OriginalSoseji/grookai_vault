import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

import '../../backend/env.mjs';
import { evaluateTcgplayerMarketQualificationV1 } from
  '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';

const root = process.cwd();
const authorityFingerprint = 'ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495';
const approval = `--approval=${authorityFingerprint}`;
const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes(approval)) {
  throw new Error(`production apply requires ${approval}`);
}

const migrations = [
  ['20261012193000', 'pokemon_tcgplayer_reviewed_finish_override_v1',
    '20261012193000_pokemon_tcgplayer_reviewed_finish_override_v1.sql',
    '124775b790b651be42cec06670a671b050f775d28030294b85149927bdb98f96'],
  ['20261013123000', 'pokemon_tcgplayer_gym_challenge_edition_assignment_v1',
    '20261013123000_pokemon_tcgplayer_gym_challenge_edition_assignment_v1.sql',
    '871209fb2c42862f51d0a09cd736e23a5d8aa87937904eddc22d63e25007b183'],
  ['20261014003500', 'pokemon_tcgplayer_gym_challenge_binding_identity_v2',
    '20261014003500_pokemon_tcgplayer_gym_challenge_binding_identity_v2.sql',
    'd4eaef81efe27b8fe235f0da45ffa1b0d95b698004ab1d803988177b1f0c2c56'],
];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonical = value => value.replace(/\r\n?/g, '\n');
const stripTransaction = value => canonical(value)
  .replace(/^\s*begin;\s*$/im, '')
  .replace(/^\s*commit;\s*$/im, '');
const loadedMigrations = [];
for (const [version, name, file, expectedHash] of migrations) {
  const sql = canonical(await fs.readFile(path.join(root, 'supabase', 'migrations', file), 'utf8'));
  assert.equal(sha256(sql), expectedHash, `${file} hash changed`);
  loadedMigrations.push({ version, name, sql });
}
const plan = JSON.parse(await fs.readFile(path.join(root, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02', 'rehearsal.json'), 'utf8'));
assert.equal(plan.authority_plan_fingerprint, authorityFingerprint);
assert.equal(plan.gym_rows.length, 4);

function productionUrl(raw) {
  const url = new URL(raw);
  const match = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
  if (match) {
    url.hostname = 'aws-1-us-east-2.pooler.supabase.com';
    url.port = '5432';
    url.username = `postgres.${match[1]}`;
  }
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('uselibpqcompat', 'true');
  return url.href;
}

const connectionString = productionUrl(process.env.SUPABASE_DB_URL ?? '');
const client = new pg.Client({
  connectionString,
  application_name: apply ? 'gym_edition_prod_apply_v1' : 'gym_edition_prod_dry_run_v1',
});
const outputRoot = path.join(root, 'artifacts', 'pokemon_tcgplayer_gym_release_v1');
await fs.mkdir(outputRoot, { recursive: true });

async function captureRelevantState() {
  const state = (await client.query(`select json_build_object(
    'migration_count',(select count(*) from supabase_migrations.schema_migrations),
    'migration_head',(select max(version) from supabase_migrations.schema_migrations),
    'target_migrations',(select coalesce(json_agg(version order by version),'[]'::json)
      from supabase_migrations.schema_migrations where version=any($1::text[])),
    'parents',(select coalesce(json_agg(to_jsonb(cp) order by cp.gv_id),'[]'::json)
      from public.card_prints cp where cp.gv_id=any($2::text[])),
    'identities',(select coalesce(json_agg(to_jsonb(i) order by i.id),'[]'::json)
      from public.card_print_identity i where i.id=any($3::uuid[])),
    'printings',(select coalesce(json_agg(to_jsonb(p) order by p.id),'[]'::json)
      from public.card_printings p where p.id=any($4::uuid[])),
    'gym_schema_present',to_regclass('public.tcgplayer_gym_challenge_edition_bindings_v1') is not null
  ) state`, [
    migrations.map(row => row[0]),
    plan.gym_rows.map(row => row.card_print.gv_id),
    plan.gym_rows.map(row => row.card_print_identity.id),
    plan.gym_rows.map(row => row.card_printing.id),
  ])).rows[0].state;
  state.bindings = [];
  state.assignments = [];
  if (state.gym_schema_present) {
    state.bindings = (await client.query(`select to_jsonb(b) value
      from public.tcgplayer_gym_challenge_edition_bindings_v1 b order by b.id`))
      .rows.map(row => row.value);
    state.assignments = (await client.query(`select to_jsonb(a) value
      from public.tcgplayer_gym_challenge_edition_assignments_v1 a order by a.id`))
      .rows.map(row => row.value);
  }
  return state;
}

async function latestSourceRun() {
  return (await client.query(`select id,finished_at,status,failed_count,sync_mode
    from public.tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed' and failed_count=0
    order by finished_at desc,created_at desc,id desc limit 1`)).rows[0];
}

async function preflight() {
  const server = (await client.query(`select current_database() database,current_user username,
    current_setting('transaction_read_only') read_only,host(inet_server_addr()) address`)).rows[0];
  assert.equal(server.database, 'postgres');
  assert.equal(server.username, 'postgres');
  const state = await captureRelevantState();
  assert.equal(state.migration_head, '20261012013000');
  assert.deepEqual(state.target_migrations, []);
  assert.deepEqual(state.parents, []);
  assert.deepEqual(state.identities, []);
  assert.deepEqual(state.printings, []);
  const run = await latestSourceRun();
  assert.ok(run);
  const sources = (await client.query(`select id,product_id,subtype_name,payload_hash,
      market_price,last_seen_run_id,source_artifact_id,observed_on
    from public.tcgcsv_source_price_daily_observations
    where last_seen_run_id=$1 and product_id=any($2::integer[])
    order by product_id,subtype_name`, [run.id, [85720,85721]])).rows;
  assert.equal(sources.length, 4);
  assert.deepEqual(sources.map(row => `${row.product_id}:${row.subtype_name}`), [
    '85720:1st Edition','85720:Unlimited','85721:1st Edition','85721:Unlimited',
  ]);
  assert.ok(sources.every(row => Number(row.market_price) > 0));
  const products = (await client.query(`select product_id,name,extended_data,source_active,
      catalog_metadata_status from public.tcgcsv_source_products
    where product_id=any($1::integer[]) order by product_id`, [[85720,85721]])).rows;
  assert.deepEqual(products.map(row => [row.product_id,row.name]), [
    [85720,"Giovanni's Nidoran F"],[85721,"Giovanni's Nidoran M"],
  ]);
  assert.ok(products.every(row => row.source_active && row.catalog_metadata_status === 'current'));
  return { server, state, run, sources, products };
}

async function applyMigrations() {
  for (const migration of loadedMigrations) {
    await client.query(stripTransaction(migration.sql));
    await client.query(`insert into supabase_migrations.schema_migrations
      (version,statements,name) values($1,$2::text[],$3)`,
    [migration.version, [stripTransaction(migration.sql)], migration.name]);
  }
}

async function insertReleaseRows(runId) {
  for (const row of plan.gym_rows) {
    const card = row.card_print;
    const identity = row.card_print_identity;
    const printing = row.card_printing;
    const binding = row.source_binding_template;
    await client.query(`insert into public.card_prints(
      id,set_id,set_code,name,number,number_plain,gv_id,identity_domain,
      set_identity_model,variant_key,printed_identity_modifier,external_ids,image_status)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
    [card.id,card.set_id,card.set_code,card.name,card.number,card.number_plain,card.gv_id,
      card.identity_domain,card.set_identity_model,card.variant_key,
      card.printed_identity_modifier,JSON.stringify(card.external_ids),card.image_status]);
    const identityHash = (await client.query(`select public.card_print_identity_hash_v1(
      $1,$2,$3,$4,$5,$6,$7::jsonb) hash`, [identity.identity_domain,
      identity.identity_key_version,identity.set_code_identity,identity.printed_number,
      identity.normalized_printed_name,identity.source_name_raw,
      JSON.stringify(identity.identity_payload)])).rows[0].hash;
    await client.query(`insert into public.card_print_identity(
      id,card_print_id,identity_domain,set_code_identity,printed_number,
      normalized_printed_name,source_name_raw,identity_payload,identity_key_version,
      identity_key_hash,is_active) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,true)`,
    [identity.id,identity.card_print_id,identity.identity_domain,identity.set_code_identity,
      identity.printed_number,identity.normalized_printed_name,identity.source_name_raw,
      JSON.stringify(identity.identity_payload),identity.identity_key_version,identityHash]);
    await client.query(`insert into public.card_printings(
      id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,
      provenance_ref,created_by) values($1,$2,$3,$4,false,$5,$6,$7)`,
    [printing.id,printing.card_print_id,printing.finish_key,printing.printing_gv_id,
      printing.provenance_source,printing.provenance_ref,printing.created_by]);
    await client.query(`insert into public.tcgplayer_gym_challenge_edition_bindings_v1(
      id,contract_version,source,category_id,group_id,product_id,source_subtype,
      source_products_payload_sha256,source_product_sha256,source_observation_id,
      source_price_row_hash,source_sync_run_id,card_print_id,card_printing_id,
      assigned_edition,assigned_finish_key,authority_plan_fingerprint,state,
      publishable,app_visible,market_truth)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        'staged',false,false,false)`,
    [binding.id,binding.contract_version,binding.source,binding.category_id,binding.group_id,
      binding.product_id,binding.source_subtype,binding.source_product_payload_sha256,
      binding.source_product_sha256,binding.source_observation_id,binding.source_price_row_hash,
      binding.source_sync_run_id,binding.card_print_id,binding.card_printing_id,
      binding.assigned_edition,binding.assigned_finish_key,authorityFingerprint]);
  }
  await client.query(`update public.tcgplayer_gym_challenge_edition_bindings_v1
    set state='active' where state='staged'`);
  const prepared = Number((await client.query(
    `select public.prepare_tcgplayer_gym_challenge_edition_assignments_v1($1) n`,
    [runId])).rows[0].n);
  assert.equal(prepared, 4);
  const candidates = (await client.query(`select *
    from public.v_tcgplayer_market_qualification_candidates_v4
    where source_sync_run_id=$1 and source_product_id=any($2::integer[])
      and source_subtype_name=any($3::text[])
    order by source_product_id,source_subtype_name`,
  [runId,[85720,85721],['1st Edition','Unlimited']])).rows;
  assert.equal(candidates.length, 4);
  const decisions = candidates.map(row => evaluateTcgplayerMarketQualificationV1(
    { ...row, source_group_name: 'Gym Challenge' }, { now: new Date() }));
  assert.ok(decisions.every(row => row.eligible),
    decisions.map(row => row.reason_codes).join(';'));
  return { prepared, candidates: candidates.map(row => ({
    source_observation_id: row.source_observation_id,
    source_product_id: row.source_product_id,
    source_subtype_name: row.source_subtype_name,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gym_edition_assignment_id: row.gym_edition_assignment_id,
    market_price: row.market_price,
  })) };
}

await client.connect();
let began = false;
try {
  await client.query('begin read only');
  const before = await preflight();
  await client.query('rollback');
  const timestamp = new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
  if (!apply) {
    const receipt = { version:'POKEMON_TCGPLAYER_GYM_RELEASE_PREFLIGHT_V1',
      status:'passed_read_only',authority_fingerprint:authorityFingerprint,
      latest_source_run_id:before.run.id,source_rows:before.sources.length,
      database_writes:0,price_publication_writes:0 };
    await fs.writeFile(path.join(outputRoot,`${timestamp}_preflight.json`),
      `${JSON.stringify(receipt,null,2)}\n`);
    console.log(JSON.stringify(receipt,null,2));
  } else {
    await client.query('begin isolation level serializable'); began = true;
    await client.query(`set local lock_timeout='10s'`);
    await client.query(`set local statement_timeout='10min'`);
    await client.query(`select pg_advisory_xact_lock(hashtext('pokemon_tcgplayer_gym_release_v1'))`);
    const run = await latestSourceRun();
    assert.equal(run.id, before.run.id, 'latest source run changed after preflight');
    await applyMigrations();
    const write = await insertReleaseRows(run.id);
    const inside = await captureRelevantState();
    assert.equal(inside.parents.length, 4);
    assert.equal(inside.identities.length, 4);
    assert.equal(inside.printings.length, 4);
    assert.equal(inside.bindings.length, 4);
    assert.equal(inside.assignments.length, 4);
    await client.query('commit'); began = false;
    const after = await captureRelevantState();
    const receipt = { version:'POKEMON_TCGPLAYER_GYM_RELEASE_APPLY_V1',status:'committed',
      authority_fingerprint:authorityFingerprint,source_run_id:run.id,
      migration_versions:migrations.map(row=>row[0]),write,
      committed_counts:{parents:after.parents.length,identities:after.identities.length,
        printings:after.printings.length,bindings:after.bindings.length,
        assignments:after.assignments.length},price_publication_writes:0,
      rollback_action:'retire the four binding IDs to hide every dependent current price'};
    await fs.writeFile(path.join(outputRoot,`${timestamp}_apply.json`),
      `${JSON.stringify(receipt,null,2)}\n`);
    console.log(JSON.stringify(receipt,null,2));
  }
} catch (error) {
  if (began) await client.query('rollback').catch(()=>{});
  throw error;
} finally {
  await client.end();
}
