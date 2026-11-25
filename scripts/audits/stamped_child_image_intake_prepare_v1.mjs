// Read-only source-intake preparation. No upload, mutation, approval or executor dispatch.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {Client} from 'pg';
import dotenv from 'dotenv';
import {stampedChildImageManifestV1 as manifest, stampedChildImageIntakeKeysV1, assertStampedImageOriginalV1, readStampedImageSourceContextV1, buildStampedChildImageIntakePlanV1, assertStampedChildImagePlanV1, PROJECT, VERSION} from '../../backend/warehouse/stamped_child_image_intake_v1.mjs';
import {stampedChildImageIntakeCodeBindingV1} from '../../backend/warehouse/stamped_child_image_intake_code_binding_v1.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Only --config <private-file> is accepted');
assert.equal(args[0], '--config');
const config = JSON.parse(fs.readFileSync(args[1], 'utf8').replace(/^\uFEFF/, ''));
assert.deepEqual(Object.keys(config).sort(), ['caFile','codeFingerprint','databaseEnvFile','imageFiles','outDir','sourceContextFiles']);
assert.equal(process.version, 'v22.23.5');
assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0');
assert.equal(stampedChildImageIntakeCodeBindingV1().fingerprint, config.codeFingerprint, 'Source changed');
assert.deepEqual(Object.keys(config.imageFiles).sort(), manifest.targets.map(t => t.printingId).sort());
for (const target of manifest.targets) assertStampedImageOriginalV1(target, fs.readFileSync(config.imageFiles[target.printingId]));
assert.deepEqual(Object.keys(config.sourceContextFiles).sort(), manifest.targets.map(t => t.printingId).sort());
const sourceContexts = Object.fromEntries(manifest.targets.map(target => [target.printingId, readStampedImageSourceContextV1(target, fs.readFileSync(config.sourceContextFiles[target.printingId]))]));
const env = dotenv.parse(fs.readFileSync(config.databaseEnvFile));
assert.equal(env.SUPABASE_URL, 'https://' + PROJECT + '.supabase.co');
assert.equal(fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8').match(/^project_id\s*=\s*"([^"]+)"/m)?.[1], PROJECT);
const url = new URL(env.SUPABASE_DB_URL);
assert.equal(url.pathname, '/postgres');
assert.equal(url.port || '5432', '5432');
assert.ok((url.hostname === `db.${PROJECT}.supabase.co` && decodeURIComponent(url.username) === 'postgres') ||
  (url.hostname === 'aws-1-us-east-2.pooler.supabase.com' && decodeURIComponent(url.username) === `postgres.${PROJECT}`));
const out = path.resolve(config.outDir), artifactRoot = 'C:/grookai_vault_operator_artifacts';
const relative = path.relative(artifactRoot, out);
assert.ok(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
assert.equal(fs.existsSync(out), false, 'Retain every previous preparation');
fs.mkdirSync(out, {recursive:true});
const client = new Client({host:url.hostname,port:5432,database:'postgres',user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),
  ssl:{rejectUnauthorized:true,ca:fs.readFileSync(config.caFile,'utf8')},options:'-c default_transaction_read_only=on -c lock_timeout=3000',
  connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000,application_name:'stamped_child_image_intake_prepare_readonly_v1'});
const report = {version:VERSION,startedAt:new Date().toISOString(),pass:false,productionWrites:0,storageWrites:0,founderApproved:false,executionReady:false,codeFingerprint:config.codeFingerprint};
try {
  await client.connect();
  assert.equal(client.connection.stream.authorized, true);
  await client.query('begin isolation level repeatable read read only');
  assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only, 'on');
  report.sanity = (await client.query('select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits')).rows[0];
  assert.ok(report.sanity.cards >= 40000 && report.sanity.sets >= 150 && report.sanity.traits >= 5000, 'Environment mismatch — fix before proceeding.');
  const actors = (await client.query(`select distinct u.id user_id,e.role,e.is_active,encode(extensions.digest(jsonb_build_object('entitlement_id',e.id,'user_id',u.id,'role',e.role,'is_active',e.is_active)::text,'sha256'),'hex') entitlement_fingerprint
    from auth.users u join public.user_entitlements e on e.user_id=u.id or(e.user_id is null and lower(e.email)=lower(u.email))
    where e.is_active and e.role='founder' order by u.id limit 2`)).rows;
  assert.equal(actors.length, 1, 'Resolve the real founder identity before preparing intake');
  const actor = {userId:actors[0].user_id,authUserId:actors[0].user_id,role:actors[0].role,isActive:actors[0].is_active,entitlementFingerprint:actors[0].entitlement_fingerprint};
  const parentIds = manifest.targets.map(t => t.parentId), childIds = manifest.targets.map(t => t.printingId), keys = manifest.targets.map(stampedChildImageIntakeKeysV1);
  const rows = async (sql, values) => (await client.query(sql, values)).rows.map(r => r.row);
  const before = {};
  before.parents = await rows('select to_jsonb(t) row from public.card_prints t where id=any($1::uuid[]) order by id', [parentIds]);
  before.children = await rows('select to_jsonb(t) row from public.card_printings t where id=any($1::uuid[]) order by id', [childIds]);
  before.identities = await rows('select to_jsonb(t) row from public.card_print_identity t where card_print_id=any($1::uuid[]) and is_active order by id', [parentIds]);
  before.existingCandidates = await rows(`select to_jsonb(t) row from public.canon_warehouse_candidates t where id=any($1::uuid[]) or
    (submission_intent='MISSING_IMAGE' and(reference_hints_payload->>'card_gv_id'=any($2::text[]) or reference_hints_payload->>'printing_reference'=any($3::text[]))) order by id`,
    [keys.map(k => k.candidateId),manifest.targets.map(t => t.parentGvId),manifest.targets.flatMap(t => [t.printingId,t.printingGvId])]);
  before.existingRawReceipts = await rows('select to_jsonb(t) row from public.raw_imports t where id=any($1::bigint[]) order by id', [keys.map(k => k.rawId)]);
  before.existingEvidence = await rows('select to_jsonb(t) row from public.canon_warehouse_candidate_evidence t where candidate_id=any($1::uuid[]) or id=any($2::uuid[]) order by id', [keys.map(k => k.candidateId),keys.map(k => k.evidenceId)]);
  before.existingEvents = await rows('select to_jsonb(t) row from public.canon_warehouse_candidate_events t where candidate_id=any($1::uuid[]) or id=any($2::uuid[]) order by id', [keys.map(k => k.candidateId),keys.map(k => k.eventId)]);
  before.existingObjects = await rows('select to_jsonb(t) row from storage.objects t where bucket_id=$1 and name=any($2::text[]) order by id', [manifest.bucket,keys.map(k => k.storagePath)]);
  const buckets = (await client.query('select id,public from storage.buckets where id=$1', [manifest.bucket])).rows;
  assert.equal(buckets.length, 1);before.bucket = buckets[0];
  const tables = ['raw_imports','canon_warehouse_candidates','canon_warehouse_candidate_evidence','canon_warehouse_candidate_events','contract_violations'];
  before.schema = {};
  before.schema.columns = (await client.query('select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema=\'public\' and table_name=any($1::text[]) order by table_name,ordinal_position', [tables])).rows;
  before.schema.constraints = (await client.query(`select c.relname table_name,k.conname,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,k.conname`, [tables])).rows;
  before.schema.triggers = (await client.query(`select c.relname table_name,t.tgname,pg_get_triggerdef(t.oid) definition,pg_get_functiondef(t.tgfoid) function_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) and not t.tgisinternal order by c.relname,t.tgname`, [tables])).rows;
  const observedAt = (await client.query('select clock_timestamp() observed_at')).rows[0].observed_at.toISOString();
  const proposedRuns=['stage_raw','rollback','apply','replay'].map(mode=>({mode,runId:randomUUID()}));
  const plan = buildStampedChildImageIntakePlanV1({before,actor,sourceContexts,proposedRuns,codeFingerprint:config.codeFingerprint,observedAt});
  assertStampedChildImagePlanV1(plan);
  await client.query('rollback');
  assert.equal(stampedChildImageIntakeCodeBindingV1().fingerprint, config.codeFingerprint, 'Source changed during preparation');
  const compressed = gzipSync(Buffer.from(JSON.stringify(plan)));
  fs.writeFileSync(path.join(out, 'plan.private.json.gz'), compressed, {flag:'wx'});
  Object.assign(report, {pass:true,verifiedTls:true,serverEnforcedReadOnly:true,founderIdentityVerified:true,originalImagesVerified:33,existingParents:33,existingChildren:33,planFingerprint:plan.fingerprint,planSha256:createHash('sha256').update(compressed).digest('hex'),proposedEffects:plan.proposedEffects,
    next:'Qualify a separate guarded raw-intake executor and immutable Storage adapter. This prepared plan grants no production write authority and cannot approve, normalize, stage or promote images.'});
} catch (error) {
  await client.query('rollback').catch(() => {});
  report.error = {code:error.code,message:String(error.message).slice(0,1600)};
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report,null,2)+'\n', {flag:'wx'});
  console.log(JSON.stringify(report));
}
