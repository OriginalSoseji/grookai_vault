import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const JUNGLE_BINDING_RELEASE_V1 = 'JUNGLE_EDITION_BINDING_RELEASE_V1';
export const JUNGLE_BINDING_PROJECT_REF_V1 = 'ycdxbpibncqcchqiihfz';
export const JUNGLE_BINDING_ROW_COUNT_V1 = 128;

const HEX64 = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EXPECTED_BOUNDARIES = Object.freeze({
  insert_bindings: 128,
  activate_existing_links: 128,
  create_cards: false,
  create_printings: false,
  vault_writes: false,
  assignment_writes: false,
  price_publication: false,
  schema_changes: false,
});
const LOCK_KEY = 'grookai:jungle-edition-binding-release:v1';
const TARGET_IDENTITY_SQL = `select current_database()::text database_name,current_user::text database_user,
  host(inet_server_addr())::text server_address,current_setting('server_version_num')::int server_version_num,
  (select oid::int from pg_database where datname=current_database()) database_oid,
  (select system_identifier::text from pg_control_system()) system_identifier,
  (select count(*)::int from supabase_migrations.schema_migrations) migration_count,
  (select max(version)::text from supabase_migrations.schema_migrations) migration_head`;
const SCHEMA_STATE_QUERIES = Object.freeze({
  columns: "select table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,is_generated,generation_expression,numeric_precision,numeric_scale from information_schema.columns where table_schema='public' order by table_name,ordinal_position",
  functions: "select p.proname,pg_get_function_identity_arguments(p.oid) args,p.proowner::regrole::text owner,p.proacl::text,p.proconfig,p.prosecdef,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p') order by 1,2",
  views: "select c.relname,pg_get_viewdef(c.oid,true) definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m') order by 1",
  constraints: "select c.relname,k.conname,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by 1,2",
  triggers: "select c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by 1,2",
});
const SECURITY_STATE_QUERIES = Object.freeze({
  relations: `select c.relname,c.relkind,c.relowner::regrole::text owner,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,
    (select jsonb_agg(jsonb_build_object('grantor',a.grantor::regrole::text,'grantee',case when a.grantee=0 then 'PUBLIC' else a.grantee::regrole::text end,'privilege',a.privilege_type,'grantable',a.is_grantable)
      order by a.grantor::regrole::text,a.grantee::regrole::text,a.privilege_type,a.is_grantable)
      from aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a) acl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','S') order by 1`,
  policies: "select * from pg_policies where schemaname='public' order by tablename,policyname",
  indexes: "select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname",
  enums: "select t.typname,e.enumlabel,e.enumsortorder from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' order by t.typname,e.enumsortorder",
});

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function jungleBindingFingerprintV1(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function releaseBody(plan) {
  return {
    version: plan.version,
    project_ref: plan.project_ref,
    at: plan.at,
    physical_manifest_fingerprint: plan.physical_manifest_fingerprint,
    physical_manifest_file_sha256: plan.physical_manifest_file_sha256,
    source_review_sha256: plan.source_review_sha256,
    schema_capture_sha256: plan.schema_capture_sha256,
    schema_security_sha256: plan.schema_security_sha256,
    target: plan.target,
    source_sync_run_id: plan.source_sync_run_id,
    source_finished_at: plan.source_finished_at,
    snapshot_at: plan.snapshot_at,
    boundaries: plan.boundaries,
    rows: plan.rows,
  };
}

function assertUnique(rows, key) {
  assert.equal(new Set(rows.map((row) => String(row[key]))).size, rows.length, `duplicate_${key}`);
}

function assertTimestamp(value, name) {
  assert.equal(typeof value, 'string', `${name}_required`);
  assert.ok(Number.isFinite(Date.parse(value)), `${name}_invalid`);
}

export function sealJungleBindingReleaseV1(draft, { at = new Date().toISOString() } = {}) {
  const body = releaseBody({
    ...draft,
    version: JUNGLE_BINDING_RELEASE_V1,
    at,
    boundaries: structuredClone(EXPECTED_BOUNDARIES),
  });
  const plan_fingerprint = jungleBindingFingerprintV1(body);
  const plan = {
    ...body,
    plan_fingerprint,
    review_ref: `${JUNGLE_BINDING_RELEASE_V1}:${plan_fingerprint}`,
    status: 'sealed_execution_plan',
    executable: true,
  };
  assertJungleBindingReleaseV1(plan, { expectedFingerprint: plan_fingerprint, allowExpiredSource: true });
  return plan;
}

export function assertJungleBindingReleaseV1(plan, {
  expectedFingerprint,
  now = Date.now(),
  allowExpiredSource = false,
} = {}) {
  assert.match(String(expectedFingerprint ?? ''), HEX64, 'expected_plan_fingerprint_required');
  assert.equal(plan?.version, JUNGLE_BINDING_RELEASE_V1, 'release_version_mismatch');
  assert.equal(plan.project_ref, JUNGLE_BINDING_PROJECT_REF_V1, 'project_ref_mismatch');
  assert.equal(plan.status, 'sealed_execution_plan', 'plan_not_sealed');
  assert.equal(plan.executable, true, 'plan_not_executable');
  assert.deepEqual(plan.boundaries, EXPECTED_BOUNDARIES, 'release_boundary_mismatch');
  assertTimestamp(plan.at, 'plan_at');
  assertTimestamp(plan.source_finished_at, 'source_finished_at');
  assertTimestamp(plan.snapshot_at, 'snapshot_at');
  for (const key of ['physical_manifest_fingerprint', 'physical_manifest_file_sha256', 'source_review_sha256', 'schema_capture_sha256', 'schema_security_sha256']) {
    assert.match(String(plan[key] ?? ''), HEX64, `${key}_invalid`);
  }
  assert.ok(plan.target && typeof plan.target === 'object' && !Array.isArray(plan.target), 'target_attestation_required');
  assert.ok(['production', 'local_rehearsal'].includes(plan.target.environment), 'target_environment_invalid');
  assert.equal(plan.target.project_ref, plan.target.environment === 'production' ? JUNGLE_BINDING_PROJECT_REF_V1 : null, 'target_project_ref_mismatch');
  for (const key of ['connection_host', 'connection_database', 'connection_user', 'database_name', 'database_user', 'server_address', 'system_identifier', 'migration_head']) {
    assert.equal(typeof plan.target[key], 'string', `target_${key}_required`);
    assert.ok(plan.target[key].length > 0, `target_${key}_required`);
  }
  for (const key of ['connection_port', 'server_version_num', 'database_oid', 'migration_count']) {
    assert.ok(Number.isSafeInteger(plan.target[key]) && plan.target[key] > 0, `target_${key}_invalid`);
  }
  for (const key of ['schema_state_fingerprint', 'security_state_fingerprint']) {
    assert.match(String(plan.target[key] ?? ''), HEX64, `target_${key}_invalid`);
  }
  if (plan.target.environment === 'production') {
    assert.equal(plan.target.connection_host, 'aws-1-us-east-2.pooler.supabase.com', 'production_connection_host_mismatch');
    assert.equal(plan.target.connection_user, `postgres.${JUNGLE_BINDING_PROJECT_REF_V1}`, 'production_connection_user_mismatch');
    assert.equal(plan.target.connection_database, 'postgres', 'production_connection_database_mismatch');
    assert.ok([5432, 6543].includes(plan.target.connection_port), 'production_connection_port_mismatch');
  } else {
    assert.ok(['127.0.0.1', 'localhost'].includes(plan.target.connection_host), 'rehearsal_connection_host_mismatch');
    assert.equal(plan.target.connection_user, 'postgres', 'rehearsal_connection_user_mismatch');
  }
  assert.match(String(plan.source_sync_run_id ?? ''), UUID, 'source_sync_run_id_invalid');
  assert.equal(Array.isArray(plan.rows) ? plan.rows.length : -1, JUNGLE_BINDING_ROW_COUNT_V1, 'binding_row_count_mismatch');
  assertUnique(plan.rows, 'id');
  assertUnique(plan.rows, 'identity_link_id');
  assertUnique(plan.rows, 'card_print_id');
  assertUnique(plan.rows, 'card_printing_id');
  assertUnique(plan.rows, 'gv_id');
  assertUnique(plan.rows, 'source_observation_id');
  for (const row of plan.rows) {
    for (const key of ['id', 'identity_link_id', 'card_print_id', 'card_printing_id', 'source_observation_id', 'source_artifact_id']) {
      assert.match(String(row[key] ?? ''), UUID, `${key}_invalid`);
    }
    for (const key of ['source_product_payload_hash', 'manifest_sha256', 'source_row_hash']) {
      assert.match(String(row[key] ?? ''), HEX64, `${key}_invalid`);
    }
    assert.equal(row.manifest_sha256, plan.physical_manifest_fingerprint, 'row_manifest_mismatch');
    assert.ok(Number.isSafeInteger(row.product_id) && row.product_id > 0, 'product_id_invalid');
    assert.ok(['first_edition', 'unlimited'].includes(row.edition), 'edition_invalid');
    assert.ok(['normal', 'holo'].includes(row.finish_key), 'finish_key_invalid');
    const subtype = `${row.edition === 'first_edition' ? '1st Edition' : 'Unlimited'}${row.finish_key === 'holo' ? ' Holofoil' : ''}`;
    assert.equal(row.source_subtype, subtype, 'source_subtype_mismatch');
    assert.equal(row.expected_link_state, 'staged', 'link_must_start_staged');
    assert.equal(row.binding_state, 'active', 'binding_must_finish_active');
  }
  const fingerprint = jungleBindingFingerprintV1(releaseBody(plan));
  assert.equal(plan.plan_fingerprint, fingerprint, 'plan_fingerprint_mismatch');
  assert.equal(expectedFingerprint, fingerprint, 'expected_plan_fingerprint_mismatch');
  assert.equal(plan.review_ref, `${JUNGLE_BINDING_RELEASE_V1}:${fingerprint}`, 'review_ref_mismatch');
  if (!allowExpiredSource) {
    const age = now - Date.parse(plan.source_finished_at);
    assert.ok(Number.isFinite(age) && age >= 0 && age < 36 * 60 * 60 * 1000, 'source_evidence_stale_or_future');
    assert.ok(Date.parse(plan.snapshot_at) <= now + 6 * 60 * 1000, 'snapshot_from_future');
  }
  return plan;
}

function connectionTarget(client) {
  const parameters = client?.connectionParameters ?? {};
  const connection_user = String(parameters.user ?? '');
  const projectMatch = /^postgres\.([a-z0-9]+)$/.exec(connection_user);
  const connection_host = String(parameters.host ?? '');
  const environment = projectMatch?.[1] === JUNGLE_BINDING_PROJECT_REF_V1
    && connection_host === 'aws-1-us-east-2.pooler.supabase.com'
    ? 'production'
    : (['127.0.0.1', 'localhost'].includes(connection_host) && connection_user === 'postgres'
        ? 'local_rehearsal'
        : 'unrecognized');
  return {
    environment,
    project_ref: environment === 'production' ? projectMatch[1] : null,
    connection_host,
    connection_port: Number(parameters.port),
    connection_database: String(parameters.database ?? ''),
    connection_user,
  };
}

async function captureRows(client, queries) {
  const result = {};
  for (const [name, sql] of Object.entries(queries)) result[name] = (await client.query(sql)).rows;
  return result;
}

export async function captureJungleBindingTargetV1(client) {
  const identity = (await client.query(TARGET_IDENTITY_SQL)).rows[0];
  assert.ok(identity, 'target_identity_unavailable');
  const schemaState = await captureRows(client, SCHEMA_STATE_QUERIES);
  const securityState = await captureRows(client, SECURITY_STATE_QUERIES);
  const actual = {
    ...connectionTarget(client),
    database_name: String(identity.database_name ?? ''),
    database_user: String(identity.database_user ?? ''),
    server_address: String(identity.server_address ?? ''),
    server_version_num: Number(identity.server_version_num),
    database_oid: Number(identity.database_oid),
    system_identifier: String(identity.system_identifier ?? ''),
    migration_count: Number(identity.migration_count),
    migration_head: String(identity.migration_head ?? ''),
    schema_state_fingerprint: jungleBindingFingerprintV1(schemaState),
    security_state_fingerprint: jungleBindingFingerprintV1(securityState),
  };
  return actual;
}

export async function attestJungleBindingTargetV1(client, plan) {
  const actual = await captureJungleBindingTargetV1(client);
  assert.deepEqual(actual, plan.target, 'connected_database_attestation_mismatch');
  return actual;
}

function jsonRows(plan) {
  return JSON.stringify(plan.rows);
}

async function readSelected(client, plan) {
  const values = jsonRows(plan);
  const links = (await client.query(`
    with planned as (select * from jsonb_to_recordset($1::jsonb) as p(
      identity_link_id uuid,card_print_id uuid,card_printing_id uuid,gv_id text,
      edition text,finish_key text,expected_link_state text))
    select l.id::text identity_link_id,l.card_print_id::text card_print_id,
      l.card_printing_id::text card_printing_id,c.gv_id,l.edition,l.finish_key,l.state
    from planned p join public.jungle_edition_identity_links_v1 l on l.id=p.identity_link_id
      join public.card_prints c on c.id=l.card_print_id
    order by l.id`, [values])).rows;
  const bindings = (await client.query(`
    with planned as (select * from jsonb_to_recordset($1::jsonb) as p(
      id uuid,identity_link_id uuid,product_id integer,source_subtype text,
      source_product_payload_hash text,manifest_sha256 text))
    select b.id::text,b.identity_link_id::text,b.product_id,b.source_subtype,
      b.source_product_payload_hash,b.manifest_sha256,b.review_ref,b.state
    from planned p join public.tcgplayer_jungle_edition_bindings_v1 b on b.id=p.id
    order by b.id`, [values])).rows;
  const collisions = (await client.query(`
    with planned as (select * from jsonb_to_recordset($1::jsonb) as p(
      id uuid,identity_link_id uuid,product_id integer,source_subtype text))
    select count(*)::int n from public.tcgplayer_jungle_edition_bindings_v1 b
    where exists(select 1 from planned p where b.id=p.id or b.identity_link_id=p.identity_link_id
      or (b.source='tcgplayer' and b.category_id=3 and b.product_id=p.product_id and b.source_subtype=p.source_subtype))`, [values])).rows[0].n;
  const assignments = (await client.query(`
    with planned as (select id from jsonb_to_recordset($1::jsonb) as p(id uuid))
    select count(*)::int n from public.tcgplayer_jungle_edition_assignments_v1 a
    where a.binding_id in (select id from planned)`, [values])).rows[0].n;
  return { links, bindings, collisions, assignments };
}

function expectedLinks(plan, state) {
  return [...plan.rows].sort((a, b) => a.identity_link_id.localeCompare(b.identity_link_id)).map((row) => ({
    identity_link_id: row.identity_link_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gv_id: row.gv_id,
    edition: row.edition,
    finish_key: row.finish_key,
    state,
  }));
}

function expectedBindings(plan) {
  return [...plan.rows].sort((a, b) => a.id.localeCompare(b.id)).map((row) => ({
    id: row.id,
    identity_link_id: row.identity_link_id,
    product_id: row.product_id,
    source_subtype: row.source_subtype,
    source_product_payload_hash: row.source_product_payload_hash,
    manifest_sha256: row.manifest_sha256,
    review_ref: plan.review_ref,
    state: 'active',
  }));
}

function classifySelected(plan, selected) {
  assert.equal(selected.assignments, 0, 'unexpected_jungle_assignment_rows');
  if (selected.bindings.length === 0 && selected.collisions === 0) {
    assert.deepEqual(selected.links, expectedLinks(plan, 'staged'), 'staged_link_drift');
    return 'before';
  }
  assert.deepEqual(selected.links, expectedLinks(plan, 'active'), 'active_link_drift');
  assert.deepEqual(selected.bindings, expectedBindings(plan), 'binding_row_drift');
  assert.equal(selected.collisions, JUNGLE_BINDING_ROW_COUNT_V1, 'binding_collision_drift');
  return 'exact';
}

async function assertRuntimeSource(client, plan) {
  const rows = (await client.query(`
    with planned as (select * from jsonb_to_recordset($1::jsonb) as p(
      identity_link_id uuid,card_print_id uuid,card_printing_id uuid,gv_id text,
      edition text,finish_key text,product_id integer,source_subtype text,
      source_product_payload_hash text,source_observation_id uuid,source_row_hash text,
      source_artifact_id uuid,manifest_sha256 text))
    select p.identity_link_id::text,p.card_print_id::text,p.card_printing_id::text,p.gv_id,
      p.edition,p.finish_key,p.product_id,p.source_subtype,p.source_product_payload_hash,
      p.source_observation_id::text,p.source_row_hash,p.source_artifact_id::text,p.manifest_sha256,
      l.state link_state,(public.jungle_edition_link_valid_v1(l.id,true)) link_valid,
      product.payload_hash product_hash,product.source_active,product.catalog_metadata_status,
      observation.payload_hash observation_hash,observation.last_seen_run_id::text source_sync_run_id,
      observation.source_artifact_id::text observation_artifact_id,
      run.status source_run_status,run.failed_count,run.finished_at,
      artifact.sha256 artifact_hash,artifact.http_status,artifact.byte_size
    from planned p
    join public.jungle_edition_identity_links_v1 l on l.id=p.identity_link_id
      and l.card_print_id=p.card_print_id and l.card_printing_id=p.card_printing_id
      and l.edition=p.edition and l.finish_key=p.finish_key and l.manifest_sha256=p.manifest_sha256
    join public.card_prints card on card.id=p.card_print_id and card.gv_id=p.gv_id
    join public.tcgcsv_source_products product on product.product_id=p.product_id
    join public.tcgcsv_source_price_daily_observations observation on observation.id=p.source_observation_id
      and observation.product_id=p.product_id and observation.subtype_name=p.source_subtype
    join public.tcgcsv_source_sync_runs run on run.id=observation.last_seen_run_id
    join public.tcgcsv_source_artifacts artifact on artifact.id=observation.source_artifact_id
    order by p.identity_link_id`, [jsonRows(plan)])).rows;
  assert.equal(rows.length, JUNGLE_BINDING_ROW_COUNT_V1, 'runtime_source_join_incomplete');
  for (const row of rows) {
    const expected = plan.rows.find((item) => item.identity_link_id === row.identity_link_id);
    assert.ok(expected, 'unexpected_runtime_row');
    assert.equal(row.product_hash, expected.source_product_payload_hash, 'source_product_hash_drift');
    assert.equal(row.observation_hash, expected.source_row_hash, 'source_observation_hash_drift');
    assert.equal(row.source_sync_run_id, plan.source_sync_run_id, 'source_run_drift');
    assert.equal(row.observation_artifact_id, expected.source_artifact_id, 'source_artifact_drift');
    assert.equal(row.source_active, true, 'source_product_inactive');
    assert.equal(row.catalog_metadata_status, 'current', 'source_product_metadata_not_current');
    assert.equal(row.source_run_status, 'completed', 'source_run_not_completed');
    assert.equal(row.failed_count, 0, 'source_run_has_failures');
    assert.equal(row.link_valid, true, 'identity_link_validation_failed');
    assert.equal(Math.floor(Date.parse(row.finished_at) / 1000), Math.floor(Date.parse(plan.source_finished_at) / 1000), 'source_finished_at_drift');
    assert.equal(row.http_status, 200, 'source_artifact_http_failure');
    assert.ok(Number(row.byte_size) > 0, 'source_artifact_empty');
    assert.match(row.artifact_hash, HEX64, 'source_artifact_hash_invalid');
  }
  return rows;
}

async function assertActiveRelease(client, plan) {
  await assertRuntimeSource(client, plan);
  const activeBindings = (await client.query(`select count(*)::int n
    from public.tcgplayer_jungle_edition_bindings_v1
    where id=any($1::uuid[]) and public.tcgplayer_jungle_binding_valid_v1(id,true)`,
    [plan.rows.map((row) => row.id)])).rows[0].n;
  assert.equal(activeBindings, JUNGLE_BINDING_ROW_COUNT_V1, 'active_binding_validation_failed');
}

async function writeStats(client) {
  return (await client.query(`select schemaname,relname,n_tup_ins::int,n_tup_upd::int,n_tup_del::int
    from pg_stat_xact_all_tables
    where schemaname in ('public','auth','storage','supabase_migrations')
      and (n_tup_ins<>0 or n_tup_upd<>0 or n_tup_del<>0)
    order by schemaname,relname`)).rows;
}

function assertBoundedWrites(stats) {
  assert.deepEqual(stats, [
    { schemaname: 'public', relname: 'jungle_edition_identity_links_v1', n_tup_ins: 0, n_tup_upd: 128, n_tup_del: 0 },
    { schemaname: 'public', relname: 'tcgplayer_jungle_edition_bindings_v1', n_tup_ins: 128, n_tup_upd: 128, n_tup_del: 0 },
  ], 'unexpected_transaction_write_scope');
}

function writeDelta(before, after) {
  const key = (row) => `${row.schemaname}.${row.relname}`;
  const prior = new Map(before.map((row) => [key(row), row]));
  return after.map((row) => {
    const old = prior.get(key(row)) ?? { n_tup_ins: 0, n_tup_upd: 0, n_tup_del: 0 };
    return {
      schemaname: row.schemaname,
      relname: row.relname,
      n_tup_ins: row.n_tup_ins - old.n_tup_ins,
      n_tup_upd: row.n_tup_upd - old.n_tup_upd,
      n_tup_del: row.n_tup_del - old.n_tup_del,
    };
  }).filter((row) => row.n_tup_ins !== 0 || row.n_tup_upd !== 0 || row.n_tup_del !== 0);
}

async function begin(client, readOnly = false) {
  await client.query(`begin isolation level serializable${readOnly ? ' read only' : ''}`);
  await client.query("set local timezone='UTC'; set local statement_timeout='45s'; set local lock_timeout='3s'");
}

export async function readJungleBindingReleaseV1(client, plan, { expectedFingerprint } = {}) {
  assertJungleBindingReleaseV1(plan, { expectedFingerprint, allowExpiredSource: true });
  await attestJungleBindingTargetV1(client, plan);
  const selected = await readSelected(client, plan);
  const state = classifySelected(plan, selected);
  if (state === 'exact') await assertActiveRelease(client, plan);
  return { state, selected };
}

export async function executeJungleBindingReleaseV1({
  client,
  plan,
  expectedFingerprint,
  mode = 'preflight',
  now = Date.now(),
  onPhase = async () => {},
}) {
  assert.ok(['preflight', 'rollback', 'apply', 'readback'].includes(mode), 'unknown_execution_mode');
  assertJungleBindingReleaseV1(plan, { expectedFingerprint, now, allowExpiredSource: mode === 'readback' });
  const readOnly = mode === 'preflight' || mode === 'readback';
  let transactionOpen = false;
  let commitStarted = false;
  try {
    await begin(client, readOnly);
    transactionOpen = true;
    await attestJungleBindingTargetV1(client, plan);
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [LOCK_KEY]);
    const before = await readSelected(client, plan);
    const beforeState = classifySelected(plan, before);
    if (mode === 'readback') {
      assert.equal(beforeState, 'exact', 'release_not_exact');
      await assertActiveRelease(client, plan);
      await client.query('commit');
      transactionOpen = false;
      return { mode, before: beforeState, after: beforeState, writes: [], committed: false, independentReadback: true };
    }
    assert.equal(beforeState, 'before', 'release_already_applied_or_partial');
    await assertRuntimeSource(client, plan);
    if (mode === 'preflight') {
      await client.query('commit');
      transactionOpen = false;
      return { mode, before: beforeState, after: beforeState, writes: [], committed: false };
    }
    const writeBaseline = await writeStats(client);
    await onPhase('before_bindings');
    await client.query(`
      insert into public.tcgplayer_jungle_edition_bindings_v1
        (id,identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state)
      select p.id,p.identity_link_id,p.product_id,p.source_subtype,p.source_product_payload_hash,
        p.manifest_sha256,$2,'staged'
      from jsonb_to_recordset($1::jsonb) as p(id uuid,identity_link_id uuid,product_id integer,
        source_subtype text,source_product_payload_hash text,manifest_sha256 text)
      order by p.id`, [jsonRows(plan), plan.review_ref]);
    assert.equal((await client.query(`select count(*)::int n from public.tcgplayer_jungle_edition_bindings_v1
      where id=any($1::uuid[]) and state='staged' and public.tcgplayer_jungle_binding_valid_v1(id,false)`, [plan.rows.map((row) => row.id)])).rows[0].n, 128, 'staged_binding_validation_failed');
    await onPhase('after_bindings');
    const activatedLinks = await client.query(`update public.jungle_edition_identity_links_v1 set state='active'
      where id=any($1::uuid[]) and state='staged'`, [plan.rows.map((row) => row.identity_link_id)]);
    assert.equal(activatedLinks.rowCount, 128, 'link_activation_count_mismatch');
    await onPhase('after_links');
    const activatedBindings = await client.query(`update public.tcgplayer_jungle_edition_bindings_v1 set state='active'
      where id=any($1::uuid[]) and state='staged'`, [plan.rows.map((row) => row.id)]);
    assert.equal(activatedBindings.rowCount, 128, 'binding_activation_count_mismatch');
    await onPhase('after_activation');
    const after = await readSelected(client, plan);
    assert.equal(classifySelected(plan, after), 'exact');
    assert.equal((await client.query(`select count(*)::int n from public.tcgplayer_jungle_edition_bindings_v1
      where id=any($1::uuid[]) and public.tcgplayer_jungle_binding_valid_v1(id,true)`, [plan.rows.map((row) => row.id)])).rows[0].n, 128, 'active_binding_validation_failed');
    const writes = writeDelta(writeBaseline, await writeStats(client));
    assertBoundedWrites(writes);
    await onPhase('before_finish');
    if (mode === 'rollback') {
      await client.query('rollback');
      transactionOpen = false;
      const independent = await readJungleBindingReleaseV1(client, plan, { expectedFingerprint });
      assert.equal(independent.state, 'before', 'rollback_independent_readback_failed');
      return { mode, before: beforeState, after: 'exact', writes, committed: false, rollbackProven: true, postTransactionReadback: true };
    }
    commitStarted = true;
    await client.query('commit');
    transactionOpen = false;
    const independent = await readJungleBindingReleaseV1(client, plan, { expectedFingerprint });
    assert.equal(independent.state, 'exact', 'commit_independent_readback_failed');
    return { mode, before: beforeState, after: 'exact', writes, committed: true, postTransactionReadback: true };
  } catch (error) {
    if (transactionOpen && !commitStarted) await client.query('rollback').catch(() => {});
    if (commitStarted) {
      error.commitUncertain = true;
      error.independentReadbackRequired = true;
    } else {
      error.commitUncertain = false;
    }
    throw error;
  }
}
