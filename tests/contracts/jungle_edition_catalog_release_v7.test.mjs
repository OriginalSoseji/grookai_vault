import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {assertJungleHistoricalRowsV7, assertJungleConnectionV7, assertJungleAuthorityV7, assertJungleRollbackV7, jungleSchemaProjectionV7, JUNGLE_COUNTS_V7, JUNGLE_PROJECT_V7, JUNGLE_RELEASE_EXECUTION_V7} from '../../backend/catalog/jungle_edition_catalog_release_v7.mjs';

const sign = body => ({...body,fingerprint:hash(body)}), now=Date.parse('2026-10-05T12:00:00Z');
// Synthetic in-memory guard fixtures only. Never written as real authority or
// passed to a database connection; no test opens a production client.
const plan={target:'production',fingerprint:'a'.repeat(64),producer:{fingerprint:'b'.repeat(64)},reviewHolds:[],expiresAt:'2026-10-05T12:30:00Z'};
const boundaries={updates:0,deletes:0,ownedCopyWrites:0,sourceMappingWrites:0,pricingWrites:0,activeLinks:0};
const approvalText='SYNTHETIC UNIT TEST: '+plan.fingerprint+' '+plan.producer.fingerprint;
const authority=()=>sign({version:'JUNGLE_CATALOG_RELEASE_AUTHORITY_V7',status:'explicit_founder_approval',project_ref:JUNGLE_PROJECT_V7,planFingerprint:plan.fingerprint,producerFingerprint:plan.producer.fingerprint,counts:JUNGLE_COUNTS_V7,boundaries,modes:['rollback','apply'],approvalRecordRef:'TEST_FIXTURE_ONLY',approvalText,approvalRecordSha256:createHash('sha256').update(approvalText).digest('hex'),approvedAt:'2026-10-05T11:59:00Z',expiresAt:'2026-10-05T12:20:00Z'});
const receipt=()=>sign({version:JUNGLE_RELEASE_EXECUTION_V7,target:'production',project_ref:JUNGLE_PROJECT_V7,mode:'rollback',before:'before',after:'exact',writes:JUNGLE_COUNTS_V7,planFingerprint:plan.fingerprint,producerFingerprint:plan.producer.fingerprint,authorityFingerprint:authority().fingerprint,rollbackProven:true,independentReadback:true,dependenciesPreserved:true,committed:false,commitUncertain:false,rollbackUncertain:false,activation:false,finishedAt:'2026-10-05T11:59:30Z'});
const resign = (object, edit) => {const body=structuredClone(object);delete body.fingerprint;edit(body);return sign(body);};

test('exact synthetic authority shape and matching rollback receipt satisfy only structural guards',()=>{
  assertJungleAuthorityV7(authority(),plan,'rollback',now);assertJungleAuthorityV7(authority(),plan,'apply',now);assertJungleRollbackV7(receipt(),plan,authority(),now);
});
for(const [name,edit] of [
  ['wrong version',a=>a.version='JUNGLE_CATALOG_RELEASE_AUTHORITY_V3'],
  ['wrong status',a=>a.status='program_instruction'],
  ['wrong project',a=>a.project_ref='other'],
  ['changed plan',a=>a.planFingerprint='c'.repeat(64)],
  ['changed producer',a=>a.producerFingerprint='c'.repeat(64)],
  ['changed counts',a=>a.counts.card_prints=129],
  ['expanded boundaries',a=>a.boundaries.pricingWrites=1],
  ['unknown mode',a=>a.modes.push('publish')],
  ['missing mode',a=>a.modes=['rollback']],
  ['missing record',a=>a.approvalRecordRef=''],
  ['changed record hash',a=>a.approvalRecordSha256='f'.repeat(64)],
  ['general instruction',a=>a.approvalText='next step'],
  ['future approval',a=>a.approvedAt='2026-10-05T12:01:00Z'],
  ['old approval',a=>a.approvedAt='2026-10-05T10:00:00Z'],
  ['expired approval',a=>a.expiresAt='2026-10-05T11:59:00Z'],
  ['outlives plan',a=>a.expiresAt='2026-10-05T12:31:00Z'],
])test(name+' rejects even with a recomputed authority fingerprint',()=>assert.throws(()=>assertJungleAuthorityV7(resign(authority(),edit),plan,'apply',now)));
test('unresolved historical account review blocks structural authority',()=>assert.throws(()=>assertJungleAuthorityV7(authority(),{...plan,reviewHolds:['global:vault_item_instances']},'rollback',now),/account_review_pending/));
test('local qualification cannot issue production authority',()=>assert.throws(()=>assertJungleAuthorityV7(authority(),{...plan,target:'local_qualification'},'rollback',now)));
test('unsigned changed authority rejects',()=>{const a=authority();a.expiresAt='2026-10-05T12:29:00Z';assert.throws(()=>assertJungleAuthorityV7(a,plan,'rollback',now),/fingerprint_mismatch/);});
for(const [name,edit] of [
  ['old executor receipt',r=>r.version='JUNGLE_EDITION_CATALOG_RELEASE_EXECUTION_V5'],
  ['local receipt',r=>r.target='local_qualification'],
  ['other project',r=>r.project_ref='other'],
  ['read-only receipt',r=>r.mode='preflight'],
  ['zero-write rollback',r=>{r.before='exact';r.writes.card_prints=0;}],
  ['different plan',r=>r.planFingerprint='c'.repeat(64)],
  ['different producer',r=>r.producerFingerprint='c'.repeat(64)],
  ['different authority',r=>r.authorityFingerprint='c'.repeat(64)],
  ['rollback unproven',r=>r.rollbackProven=false],
  ['independent readback missing',r=>r.independentReadback=false],
  ['preservation missing',r=>r.dependenciesPreserved=false],
  ['committed receipt',r=>r.committed=true],
  ['uncertain commit',r=>r.commitUncertain=true],
  ['uncertain rollback',r=>r.rollbackUncertain=true],
  ['activation',r=>r.activation=true],
  ['future rollback',r=>r.finishedAt='2026-10-05T12:01:00Z'],
  ['stale rollback',r=>r.finishedAt='2026-10-05T10:00:00Z'],
])test(name+' cannot authorize an apply',()=>assert.throws(()=>assertJungleRollbackV7(resign(receipt(),edit),plan,authority(),now)));

const local=()=>({connectionParameters:{host:'127.0.0.1',port:55000,database:'postgres',user:'postgres'}});
test('only new qualification loopback coordinates are accepted',()=>assert.doesNotThrow(()=>assertJungleConnectionV7(local(),'local_qualification')));
for(const [name,edit]of [['prior populated lab',c=>c.port=54200],['host alias',c=>c.host='localhost'],['remote host',c=>c.host='aws-1-us-east-2.pooler.supabase.com'],['other database',c=>c.database='other'],['other role',c=>c.user='service_role']])test(name+' rejects as local qualification',()=>{const c=local();edit(c.connectionParameters);assert.throws(()=>assertJungleConnectionV7(c,'local_qualification'));});
test('local connection cannot be labeled production',()=>assert.throws(()=>assertJungleConnectionV7(local(),'production')));
test('unknown target rejects',()=>assert.throws(()=>assertJungleConnectionV7(local(),'staging')));
test('production-shaped connection without verified pinned TLS rejects',()=>assert.throws(()=>assertJungleConnectionV7({connectionParameters:{host:'aws-1-us-east-2.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.'+JUNGLE_PROJECT_V7,ssl:{rejectUnauthorized:false}}},'production')));
test('schema projection excludes only operational counters, not definitions, ACLs or OIDs',()=>{
  const raw={sanity:{cards:1},read_only:'on',LEDGER:[{version:'a'}],server_version:'17.6',ALL_RELATIONS_QUERY:[{oid:3,name:'table',definition:'original',page_size_estimate:10,row_count_estimate:20}],SECURITY:[{acl:['owner=arwdDxt/owner']}]};
  const before=jungleSchemaProjectionV7(raw), activity=structuredClone(raw);activity.sanity.cards=639;activity.read_only='off';activity.ALL_RELATIONS_QUERY[0].row_count_estimate=999;
  assert.deepEqual(jungleSchemaProjectionV7(activity),before);
  for(const edit of [r=>r.ALL_RELATIONS_QUERY[0].definition='changed',r=>r.ALL_RELATIONS_QUERY[0].oid=4,r=>r.SECURITY[0].acl=[]]){const changed=structuredClone(raw);edit(changed);assert.notDeepEqual(jungleSchemaProjectionV7(changed),before);}
  assert.equal(raw.ALL_RELATIONS_QUERY[0].row_count_estimate,20);
});
test('schema row ordering is immaterial but duplicate rows and nested order remain protected',()=>{
  const raw={sanity:{cards:1},read_only:'on',LEDGER:[],ALL_RELATIONS_QUERY:[],FUNCTIONS_QUERY:[{name:'f',args:['a','b'],definition:'first'},{name:'f',args:['b','a'],definition:'second'},{name:'f',args:['a','b'],definition:'first'}]};
  const expected=jungleSchemaProjectionV7(raw),reordered=structuredClone(raw);reordered.FUNCTIONS_QUERY.reverse();
  assert.deepEqual(jungleSchemaProjectionV7(reordered),expected);
  const missing=structuredClone(raw);missing.FUNCTIONS_QUERY.pop();assert.notDeepEqual(jungleSchemaProjectionV7(missing),expected);
  const nested=structuredClone(raw);nested.FUNCTIONS_QUERY[0].args.reverse();assert.notDeepEqual(jungleSchemaProjectionV7(nested),expected);
});
test('historical Date precision is explicit; full current records are never rewritten',()=>{
  const old=[{id:'a',created_at:'2025-11-16T06:32:35.437Z',name:'unchanged'}],current=[{...old[0],created_at:'2025-11-16T06:32:35.437741+00:00'}];
  const saved=structuredClone(current),report=assertJungleHistoricalRowsV7(current,old);
  assert.deepEqual(report.unrecordedSubmillisecondFields,[{id:'a',field:'created_at'}]);assert.deepEqual(current,saved);
  for(const change of [{created_at:'2025-11-16T06:32:35.438001Z'},{name:'changed'},{created_at:null}])assert.throws(()=>assertJungleHistoricalRowsV7([{...current[0],...change}],old));
  assert.throws(()=>assertJungleHistoricalRowsV7(current,[{...old[0],created_at:'2025-11-16T06:32:35.437000Z'}]));
  assert.throws(()=>assertJungleHistoricalRowsV7([...current,...current],old));
});
