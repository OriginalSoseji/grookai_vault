import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { hashClassicCommandOutput } from './pokemon_classic_producer_hash_v1.mjs';
import { buildClassicFrozenPlan, classicFrozenPackageBinding, assertClassicFrozenPackageUnchanged } from './pokemon_classic_frozen_package_v1.mjs';
import { sha256 } from './pokemon_classic_identity_evidence_v1.mjs';
import { printingManifestHash as hash } from './printing_completeness_gate_v1.mjs';
import { assertClassicCanonicalPlan, assertClassicCanonicalAbsence } from './pokemon_classic_canonical_admission_v1.mjs';
import { assertClassicBundleFilesUnchanged } from './pokemon_classic_canonical_bundle_v1.mjs';
import { verifyGroupPreservation } from './pokemon_warehouse_group_intake_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_PRODUCTION_PLANNING_V1';
export const PROJECT = 'ycdxbpibncqcchqiihfz';
export const BRANCH = 'pokemon-relationship-repair-20261002/work';
export const OPEN_GATES = Object.freeze([
  'normal_hooks_commit_push', 'full_application_auth_http_proof',
  'public_image_readiness', 'production_lock_performance', 'governed_production_executor_and_receipts',
]);

// This is an evidence planner, with no apply switch and no authority conversion.
// HEAD alone does not bind an uncommitted candidate. Bind the complete diff and
// all nonignored untracked bytes too, without exporting their contents.
export async function captureClassicProducer(root) {
  const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 128 * 1024 * 1024 });
  const branch = git('branch', '--show-current').toString().trim(); assert.equal(branch, BRANCH);
  const status = git('status', '--porcelain=v1', '-z');
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z').toString().split('\0').filter(Boolean).sort()
    .map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(root, file))) }));
  const diff = await hashClassicCommandOutput('git', ['diff', '--no-ext-diff', '--binary', 'HEAD', '--'], { cwd: root });
  const body = { branch, head: git('rev-parse', 'HEAD').toString().trim(), tree: git('rev-parse', 'HEAD^{tree}').toString().trim(),
    clean: status.length === 0, status_sha256: sha256(status),
    diff_sha256: diff.sha256, diff_bytes: diff.bytes, untracked };
  return { ...body, fingerprint: hash(body) };
}

export async function assertClassicProducerUnchanged(root, before) {
  assert.deepEqual(await captureClassicProducer(root), before, 'producer_source_changed_during_planning');
}

export async function assertClassicReadOnlyTransaction(db) {
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only, 'on', 'read_only_transaction_required');
  assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation, 'repeatable read', 'repeatable_read_required');
}

// Bind database-owned definitions, policies and grants, not only migration IDs.
// This is a schema observation, never a claim that all dependencies were replayed.
export async function readClassicSchemaFingerprint(db) {
  await assertClassicReadOnlyTransaction(db);
  const q = async sql => (await db.query(sql)).rows;
  const snapshot = {
    relations: await q(`select c.relname,c.relkind,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl,
      case when c.relkind in ('v','m') then pg_get_viewdef(c.oid,true) end view_definition
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p','v','m','S') order by c.relname`),
    columns: await q(`select table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,
      column_default,is_generated,generation_expression,is_identity,identity_generation,collation_name
      from information_schema.columns where table_schema='public' order by table_name,ordinal_position`),
    constraints: await q(`select c.conrelid::regclass::text table_name,c.conname,c.contype,c.convalidated,
      pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace
      where n.nspname='public' order by table_name,c.conname`),
    indexes: await q(`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`),
    triggers: await q(`select t.tgrelid::regclass::text table_name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition
      from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and not t.tgisinternal order by table_name,t.tgname`),
    functions: await q(`select n.nspname,p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proleakproof,p.proacl,pg_get_functiondef(p.oid) definition
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind in ('f','p')
      and (n.nspname='public' or (n.nspname='auth' and p.proname in ('role','uid','jwt')))
      order by n.nspname,signature`),
    policies: await q(`select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
      where schemaname='public' order by tablename,policyname`),
    enums: await q(`select t.typname,e.enumlabel,e.enumsortorder from pg_type t join pg_enum e on e.enumtypid=t.oid
      join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' order by t.typname,e.enumsortorder`),
    extensions: await q('select extname,extversion from pg_extension order by extname'),
    schemas: await q("select nspname,pg_get_userbyid(nspowner) owner,nspacl from pg_namespace where nspname in ('public','auth') order by nspname"),
    roles: await q('select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls from pg_roles order by rolname'),
    memberships: await q('select pg_get_userbyid(roleid) role,pg_get_userbyid(member) member,pg_get_userbyid(grantor) grantor,admin_option,inherit_option,set_option from pg_auth_members order by role,member,grantor'),
    default_acls: await q("select pg_get_userbyid(d.defaclrole) owner,coalesce(n.nspname,'*') schema,d.defaclobjtype,d.defaclacl from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace where d.defaclnamespace=0 or n.nspname in ('public','auth') order by owner,schema,d.defaclobjtype"),
    database_acl: await q('select pg_get_userbyid(datdba) owner,datacl from pg_database where datname=current_database()'),
  };
  return { snapshot, fingerprint: hash(snapshot) };
}

export function buildClassicProductionObservation({ plan, schema, producer, sanity, coverage, observedAt, frozenBinding }) {
  assert.ok(Number.isFinite(Date.parse(observedAt)));
  assert.ok(sanity.cards >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000, 'canonical_environment_gate');
  assert.equal(schema.fingerprint, hash(schema.snapshot), 'schema_fingerprint_mismatch');
  const { fingerprint: producerHash, ...source } = producer;
  assert.equal(producerHash, hash(source), 'producer_fingerprint_mismatch'); assert.equal(producer.branch, BRANCH);
  assert.equal(plan.production_apply_enabled, false);
  const { fingerprint: frozenHash, ...frozenBody } = frozenBinding;
  assert.equal(frozenHash, hash(frozenBody), 'frozen_package_binding_tamper');
  assert.equal(frozenBinding.qualification_at, plan.qualification_at, 'source_review_time_mismatch');
  assert.equal(frozenBinding.production_apply_enabled, false);
  const { fingerprint, ...body } = plan; assert.equal(fingerprint, hash(body), 'canonical_plan_fingerprint_mismatch');
  const value = { version: VERSION, project: PROJECT, observed_at: observedAt, status: 'read_only_production_candidate',
    production_apply_enabled: false, production_writes: 0, canonical_fingerprint: plan.fingerprint,
    ingress_fingerprint: plan.ingress.fingerprint, schema_fingerprint: schema.fingerprint, producer,
    artifact_hashes: plan.artifact_hashes, frozen_package: frozenBinding, active_master_binding_verified: true, sanity, coverage,
    counts: Object.fromEntries(Object.entries(plan.tables).map(([t, rows]) => [t, rows.length])),
    scope: { category_id: 3, group_id: 23323, numbered_cards: 102, retained_lineages: 81, new_ingress: 21,
      held_source_products: 1, outside_standard_scope_jumbo: 1 },
    open_gates: [...OPEN_GATES], public_exposure: 'Pokemon defaults public; production insertion is not private staging',
    authority: { actor_type: 'automated_agent', human_signature: null,
      standing_task: 'Pokemon relationship repair owner', meaning: 'qualification only; no executable approval or writer' } };
  return { ...value, fingerprint: hash(value) };
}

export async function verifyClassicProductionObservation(db, observation, plan, bundle, frozen) {
  await assertClassicReadOnlyTransaction(db);
  assertClassicFrozenPackageUnchanged(frozen); buildClassicFrozenPlan(bundle, plan.ingress, frozen);
  assertClassicCanonicalPlan(plan, bundle); assertClassicBundleFilesUnchanged(bundle);
  const schema = await readClassicSchemaFingerprint(db);
  assert.equal(schema.fingerprint, observation.schema_fingerprint, 'live_schema_drift');
  assert.deepEqual(observation, buildClassicProductionObservation({ plan, schema, producer: observation.producer,
    sanity: observation.sanity, coverage: observation.coverage, observedAt: observation.observed_at, frozenBinding: classicFrozenPackageBinding(frozen) }), 'production_observation_tamper');
  await verifyGroupPreservation(db, plan.ingress);
  await assertClassicCanonicalAbsence(db, plan);
  // An unknown/partial ingress outcome must not be interpreted as absence merely
  // because the canonical parents are absent. New raw receipts are checked by
  // verifyGroupPreservation, and even a complete planned ingress stops here.
  assert.equal((await db.query('select 1 from public.external_discovery_candidates where id=any($1::uuid[]) limit 1',
    [plan.ingress.entries.map(r => r.candidate_id)])).rowCount, 0, 'planned_ingress_already_present_reconcile_before_retry');
  return { status: 'independently_verified_absent_candidate', canonical_rows_present: 0, new_ingress_rows_present: 0,
    retained_lineages: 81, schema_fingerprint: schema.fingerprint, production_writes: 0 };
}
