import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import * as m from '../../backend/pricing/japanese_reviewed_price_links_v4.mjs';

const schema=JSON.parse(fs.readFileSync(new URL('../../docs/catalog/japanese_reviewed_price_links_v2/schema524.json',import.meta.url))),now=Date.parse(m.SNAPSHOT.source.run.finished_at)+18*3600000,time=new Date(now).toISOString();
const fixture=()=>({...structuredClone(m.SNAPSHOT),parent_mappings:[],printing_mappings:[],raw:[],prerequisite:{regular29_correct:29,regular29_audit_present:true,predecessor_audit_absent:true}});
const freeze=state=>m.freezePriceLinkPlanV4({schema,state,observedAt:time});
const plan=freeze(fixture()),code=m.priceLinkCodeBindingV4();
const after=()=>({...fixture(),printing_mappings:structuredClone(plan.mappings),raw:[structuredClone(plan.raw)]});
const reseal=body=>({...body,fingerprint:hash(body)});
function authority(overrides={}){return reseal({version:'JAPANESE_REVIEWED_PRICE_LINK_AUTHORITY_V4',status:'explicit_founder_approval',project_ref:m.PROJECT,plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,expected:m.EXPECTED,boundaries:m.BOUNDARIES,modes:['rollback','apply'],owner_decision_sha256:'1'.repeat(64),issued_at:new Date(now-1000).toISOString(),expires_at:new Date(now+3600000).toISOString(),preflight_flag_explicitly_authorized:true,...overrides});}

test('4916 exact prior reviewed provider identities select only existing verified children',()=>{
 assert.equal(m.REGISTRY.targets.length,4916);assert.equal(new Set(m.PRODUCTS).size,4916);assert.equal(new Set(m.PARENTS).size,4916);assert.equal(new Set(m.PRINTINGS).size,4916);assert.equal(new Set(m.MAPPING_IDS).size,4916);
 assert.equal(m.assertPriceLinkFactsV4(fixture(),{now}).existing_printings,4916);
 for(const t of m.REGISTRY.targets){const r=m.SNAPSHOT.reviews.find(x=>x.id===t.review_id),q=m.SNAPSHOT.source.prior_quotes.find(x=>x.id===t.prior_observation_id);assert.equal(r.evidence.source_observation_id,q.id);assert.equal(q.product_id,t.product_id);assert.equal(q.subtype_name,t.source_subtype);assert.equal(r.evidence.finish_key,t.finish_key);assert.ok(r.evidence.official_assertion_keys.length);}
});
test('existing mapping collision guard keeps exact split-part semantics in a set join',()=>{
 const sql=m.PRINTING_MAPPING_STATE_SQL_V4;
 assert.match(sql,/with product_ids as materialized\(select distinct unnest\(\$3::text\[\]\) product_id\)/);
 assert.match(sql,/exists\(select 1 from product_ids p where split_part\(t\.external_id,':',1\)=p\.product_id\)/);
 assert.doesNotMatch(sql,/split_part\([^)]*\)=any\(/);
 assert.match(sql,/order by t\.id$/);
});
test('complete610-file producer, exact524 metadata and original source amounts are bound',()=>{
 assert.equal(code.files.length,610);assert.equal(new Set(code.files.map(x=>x.file)).size,610);assert.equal(m.assertPriceLinkSchemaV4(schema).schema_fingerprint,m.REGISTRY.schema_fingerprint);assert.equal(plan.code_fingerprint,code.fingerprint);
 assert.deepEqual(plan.expected,{printing_mapping_inserts:4916,raw_inserts:1});assert.ok(Object.values(plan.boundaries).every(x=>x===0));assert.equal(m.classifyPriceLinkStateV4(plan,fixture()),'before');assert.equal(m.classifyPriceLinkStateV4(plan,after()),'exact');
});
for(const[name,mutate]of[
 ['provisional printing',s=>{s.printings[0].is_provisional=true;}],
 ['wrong physical finish',s=>{s.printings[0].finish_key='reverse';}],
 ['printing missing',s=>{s.printings.pop();}],
 ['new unreviewed child',s=>{s.printings.push({...s.printings[0],id:'00000000-0000-4000-8000-000000000000'});}],
 ['parent number changed',s=>{s.parents[0].number='999';}],
 ['parent variant changed',s=>{s.parents[0].variant_key='guessed';}],
 ['stamp inferred',s=>{s.parents[0].printed_identity_modifier='stamp';}],
 ['wrong language',s=>{s.parents[0].identity_domain='pokemon';}],
 ['two active identities',s=>{const id=s.identities.find(x=>x.is_active);s.identities.push({...id,id:'00000000-0000-4000-8000-000000000000'});}],
 ['identity evidence changed',s=>{s.identities.find(x=>x.is_active).identity_key_hash='0'.repeat(64);}],
 ['physical review hidden',s=>{s.reviews[0].public_visibility='hidden_pending_review';}],
 ['physical review revoked',s=>{s.reviews[0].review_status='unverifiable';}],
 ['review source reassigned',s=>{s.reviews[0].evidence.source_observation_id=s.reviews[1].evidence.source_observation_id;}],
 ['old provider subtype reassigned',s=>{s.source.prior_quotes[0].subtype_name='Reverse Holofoil';}],
 ['current quote substituted',s=>{s.source.current_quotes[0].market_price=0.001;}],
 ['zero market quote',s=>{s.source.current_quotes[0].market_price=0;}],
 ['currency conversion',s=>{s.source.current_quotes[0].currency='EUR';}],
 ['partial quote scope',s=>{s.source.current_quotes.pop();}],
 ['source artifact changed',s=>{s.source.artifacts[0].sha256='0'.repeat(64);}],
 ['new generation',s=>{s.source.run.id='00000000-0000-4000-8000-000000000000';}],
 ['source failure',s=>{s.source.run.failed_count=1;}],
 ['canonical alias',s=>{s.aliases.push({legacy_card_print_id:m.PARENTS[0]});}],
 ['approved inbound alias revoked',s=>{s.aliases[0].authority_status='pending';}],
 ['approved inbound alias moved',s=>{s.aliases[0].canonical_card_print_id=m.PARENTS[0];}],
 ['legacy alias selected',s=>{s.aliases[0].legacy_card_print_id=m.PARENTS[0];}],
 ['alias primary printed number changed',s=>{s.aliases[0].authority_decision.official_printed_number='999';}],
 ['pre-existing parent mapping',s=>{s.parent_mappings.push({source:'tcgplayer',external_id:String(m.PRODUCTS[0]),active:false});}],
 ['regular29 prerequisite incomplete',s=>{s.prerequisite.regular29_correct=28;}],
 ['regular29 private audit absent',s=>{s.prerequisite.regular29_audit_present=false;}],
 ['unreviewed state field',s=>{s.guessed_owner_state={};}],
])test('fails closed: '+name,()=>{const s=fixture();mutate(s);assert.throws(()=>freeze(s));});

test('source window stays36h; mapping timestamps do not refresh the quotes',()=>{
 assert.throws(()=>m.assertPriceLinkFactsV4(fixture(),{now:Date.parse(m.SNAPSHOT.source.run.finished_at)+36*3600000}),/stale|future/);
 assert.throws(()=>m.assertPriceLinkFactsV4(fixture(),{now:Date.parse(m.SNAPSHOT.source.run.finished_at)-1}),/stale|future/);
 for(const row of plan.mappings){assert.match(row.synced_at,/\.\d{6}Z$/);assert.equal(row.meta.source_sync_run_id,m.SNAPSHOT.source.run.id);}
 assert.deepEqual(plan.state_before.source.current_quotes,m.SNAPSHOT.source.current_quotes);
});
for(const active of[true,false])test('existing '+(active?'active':'inactive')+' printing link is not overwritten/reactivated',()=>{const s=fixture();s.printing_mappings.push({...plan.mappings[0],active});assert.throws(()=>freeze(s),/Existing/);});
test('private audit collision is not overwritten',()=>{const s=fixture();s.raw.push({...plan.raw,payload:{unrelated:true}});assert.throws(()=>freeze(s),/collision/);});
for(const[name,mutate]of[
 ['extra migration',s=>s.base.canonical.ledger.push('20990101000000')],
 ['mapping trigger',s=>s.printing_mapping.triggers.push({name:'side_effect'})],
 ['mapping rewrite rule',s=>s.printing_mapping.rules.push({name:'side_effect'})],
 ['new mapping column',s=>s.printing_mapping.columns.push({column_name:'owner_id'})],
 ['changed view body',s=>{s.views[0].definition+=' ';}],
 ['changed subtype helper',s=>{s.subtype_function[0].definition+=' ';}],
 ['anonymous grant',s=>{s.printing_mapping.security[0].acl+='anon=r';}],
 ['retention reader drift',s=>{s.base.retention[0].definition+=' ';}],
])test('metadata/effect drift blocks: '+name,()=>{const s=structuredClone(schema);mutate(s);assert.throws(()=>m.assertPriceLinkSchemaV4(s));});
for(const[name,mutate]of[
 ['partial links',s=>s.printing_mappings.pop()],
 ['missing audit',s=>{s.raw=[];}],
 ['changed audit',s=>{s.raw[0].notes+=' changed';}],
 ['foreign link',s=>{s.printing_mappings[0].external_id='1';}],
 ['wrong finish hint',s=>{s.printing_mappings[0].meta.source_subtype='Reverse Holofoil';}],
 ['microsecond timestamp drift',s=>{s.printing_mappings[0].synced_at=s.printing_mappings[0].synced_at.replace(/000Z$/,'001Z');}],
 ['disabled link',s=>{s.printing_mappings[0].active=false;}],
])test('partial/altered durable state rejects: '+name,()=>{const s=after();mutate(s);assert.throws(()=>m.classifyPriceLinkStateV4(plan,s));});
test('rehashed changed plan cannot substitute another destination',()=>{const p=structuredClone(plan);p.mappings[0].card_printing_id=m.PRINTINGS[1];const{fingerprint,...body}=p;const altered=reseal(body);assert.throws(()=>m.assertPriceLinkPlanV4(altered,altered.fingerprint));});
test('old regular29 authority and unapproved scope are not Japanese insertion authority',()=>{
 const opts={plan,codeFingerprint:code.fingerprint,mode:'apply',now};m.assertPriceLinkAuthorityV4(authority(),opts);
 for(const patch of[{version:'JAPANESE_REVIEWED_PRICE_LINK_AUTHORITY_V1'},{version:'REGULAR_PRODUCT_MAPPING_524_AUTHORITY_V1'},{code_fingerprint:'0'.repeat(64)},{plan_fingerprint:'0'.repeat(64)},{expected:{printing_mapping_inserts:428,raw_inserts:1}},{boundaries:{...m.BOUNDARIES,printing_writes:1}},{modes:['apply']},{preflight_flag_explicitly_authorized:false},{expires_at:new Date(now).toISOString()},{expires_at:new Date(now+25*3600000).toISOString()}])assert.throws(()=>m.assertPriceLinkAuthorityV4(authority(patch),opts));
 assert.throws(()=>m.assertPriceLinkAuthorityV4(null,opts));
});
test('production apply needs an actual same-plan rollback under1h, never a fixture',()=>{
 const r={version:m.VERSION,project_ref:m.PROJECT,environment:'production',mode:'rollback',rollback_proven:true,committed:false,commit_uncertain:false,plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,writes:m.EXPECTED,before_state_fingerprint:'a',rollback_state_fingerprint:'a',finished_at:new Date(now-1000).toISOString()},opts={plan,codeFingerprint:code.fingerprint,now};m.assertPriceLinkRollbackV4(r,opts);
 for(const patch of[{environment:'local_qualification'},{committed:true},{commit_uncertain:true},{rollback_proven:false},{rollback_state_fingerprint:'b'},{plan_fingerprint:'0'.repeat(64)},{writes:{printing_mapping_inserts:426,raw_inserts:1}},{finished_at:new Date(now-3600000).toISOString()},{finished_at:new Date(now+1).toISOString()}])assert.throws(()=>m.assertPriceLinkRollbackV4({...r,...patch},opts));
});
test('local fault path refuses non-owned database and production host before queries',async()=>{
 for(const patch of[{host:'db.'+m.PROJECT+'.supabase.co'},{database:'postgres'},{port:5432}]){let calls=0;const c={connectionParameters:{host:'127.0.0.1',port:55340,user:'postgres',database:m.QUALIFICATION_DATABASE,...patch},query(){calls++;throw Error('No query permitted');}};await assert.rejects(m.qualifyPriceLinksV4({client:c,plan,mode:'apply',fault:'duplicate_raw_after_insert',codeFingerprint:code.fingerprint}));assert.equal(calls,0);}
});
test('CLI mutations require scoped acknowledgement before credentials/release files',()=>{
 const env={...process.env};delete env.GROOKAI_PREFLIGHT_ACK;const cli=fileURLToPath(new URL('../../scripts/audits/japanese_reviewed_price_links_v4.mjs',import.meta.url));assert.throws(()=>execFileSync(process.execPath,[cli,'--mode=apply','--out-dir=ignored','--code-fingerprint='+code.fingerprint],{env,windowsHide:true,stdio:'pipe'}),e=>e.status===1&&String(e.stderr).includes('Scoped GROOKAI_PREFLIGHT_ACK=1'));
});
test('current-source contract preserves exact decisions, stamp holds and no publication authority',()=>{const text=fs.readFileSync(new URL('../../docs/contracts/JAPANESE_REVIEWED_PRICE_LINKS_V4.md',import.meta.url),'utf8');for(const phrase of['no production authority','no upsert','36-hour','new ordinary exact owner decision','GROOKAI_PREFLIGHT_ACK=1','not a full durable shadow','All32 stamp'])assert.ok(text.includes(phrase),phrase);});


test('new complete generation and changed legitimate provider amount make a NEW plan, never mutate the prior sealed plan',()=>{const s=fixture(),prior=freeze(s),next=structuredClone(s);next.source.run.id='00000000-0000-4000-8000-000000000249';for(const q of next.source.current_quotes)q.last_seen_run_id=next.source.run.id;const q=next.source.current_quotes[0];q.market_price='1.2345';q.raw_payload.marketPrice=1.2345;q.payload_hash=hash(q.raw_payload);const changed=freeze(next);assert.notEqual(changed.fingerprint,prior.fingerprint);assert.equal(changed.mappings.find(x=>x.external_id===String(q.product_id)).meta.source_sync_run_id,next.source.run.id);const mutated=structuredClone(prior);mutated.state_before.source=next.source;const{fingerprint,...body}=mutated;assert.throws(()=>m.assertPriceLinkPlanV4(reseal(body),hash(body)));});
test('raw provider amount/hash mismatch and old programme receipt are rejected',()=>{for(const mutate of[s=>{s.source.current_quotes[0].raw_payload.marketPrice=1000;},s=>{s.source.products[0].raw_payload.guessed=true;},s=>{s.prerequisite.predecessor_audit_absent=false;}]){const s=fixture();mutate(s);assert.throws(()=>freeze(s));}});
test('the three known unavailable quotes remain identity joins with explicit missing/null metadata',()=>{const s=fixture(),wanted=[570051,571943,630237];s.source.current_quotes=s.source.current_quotes.filter(q=>!wanted.slice(0,2).includes(q.product_id));const q=s.source.current_quotes.find(q=>q.product_id===wanted[2]);q.market_price=null;q.raw_payload.marketPrice=null;q.payload_hash=hash(q.raw_payload);const p=freeze(s);for(const id of wanted){const row=p.mappings.find(x=>x.external_id===String(id));assert.equal(row.meta.publication_hold_reason,'current_source_quote_unavailable');assert.equal(row.meta.current_quote_status,id===wanted[2]?'unpriced':'missing');assert.equal(row.meta.current_source_observation_id,id===wanted[2]?q.id:null);}assert.equal(p.mappings.length,4916);assert.equal(m.EXPECTED.price_writes,undefined);});
