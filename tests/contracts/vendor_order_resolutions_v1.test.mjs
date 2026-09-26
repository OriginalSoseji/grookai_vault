import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {resolutionCommand,resolutionStatus,availableResolutionActions,RESOLUTION_TERMS} from '../../apps/web/src/lib/orders/orderResolutions.shared.ts';
import {resolutionHandler} from '../../apps/web/src/lib/orders/orderResolutions.ts';
import {resolutionRuntimeEnabled} from '../../apps/web/src/lib/orders/orderResolutionsRuntimePolicy.ts';
import {resolutionQueueCursor} from '../../apps/web/src/lib/orders/orderResolutionQueue.ts';
const orderId=randomUUID(),caseId=randomUUID(),hash='a'.repeat(64),date='2026-09-22T17:00:00.000Z',origin='http://127.0.0.1:24840';
const command=()=>({action:'agree',orderId,caseId,requestId:randomUUID(),expectedSequence:1,termsHash:hash});
const status=()=>({schema:'VENDOR_ORDER_RESOLUTIONS_V1',orderId,role:'buyer',writesEnabled:true,canRequest:false,clearsFinancialHolds:false,permitsFulfillment:false,
 cases:[{caseId,termsVersion:RESOLUTION_TERMS,termsHash:hash,totalAmountMinor:1234,currency:'usd',state:'requested',sequence:1,basisCurrent:true,createdAt:date,
 events:[{requestId:caseId,sequence:1,action:'request',role:'seller',recordedAt:date}]}]});
test('request and response commands preserve exact retry identity',()=>{const c=command();assert.deepEqual(resolutionCommand(c),c);const p={action:'request',orderId,requestId:caseId};assert.deepEqual(resolutionCommand(p),p);});
for(const [name,edit] of [
 ['owner field',v=>v.ownerId=orderId],['role flag',v=>v.role='operator'],['approval flag',v=>v.approved=true],['amount',v=>v.amountMinor=1],
 ['provider identity',v=>v.refundId='re_forged'],['clearance',v=>v.clearsFinancialHolds=true],['zero sequence',v=>v.expectedSequence=0],
 ['fractional sequence',v=>v.expectedSequence=1.5],['oversized sequence',v=>v.expectedSequence=9],['hash',v=>v.termsHash='bad'],
 ['case',v=>v.caseId='other'],['unknown action',v=>v.action='clear_holds'],['request response fields',v=>v.action='request'],
])test(`command rejects ${name}`,()=>{const c=command();edit(c);assert.throws(()=>resolutionCommand(c));});
test('display state keeps consent, operator review and clearance separate',()=>{
 const s=resolutionStatus(status());assert.equal(s.clearsFinancialHolds,false);assert.deepEqual(availableResolutionActions(s.cases[0],'buyer'),['agree','decline']);
 assert.deepEqual(availableResolutionActions({...s.cases[0],basisCurrent:false},'buyer'),['decline']);
 assert.deepEqual(availableResolutionActions({...s.cases[0],state:'agreed'},'operator'),['accept','reject']);
 assert.deepEqual(availableResolutionActions({...s.cases[0],state:'agreed',basisCurrent:false},'operator'),['reject']);
 assert.deepEqual(availableResolutionActions({...s.cases[0],state:'accepted'},'buyer'),['withdraw']);
});
for(const [name,edit] of [
 ['financial clearance',s=>s.clearsFinancialHolds=true],['fulfillment',s=>s.permitsFulfillment=true],['buyer proposes',s=>s.canRequest=true],
 ['case count',s=>s.cases=Array(21).fill(s.cases[0])],['duplicate case',s=>s.cases.push(s.cases[0])],['wrong total',s=>s.cases[0].totalAmountMinor=-1],
 ['invented agreement',s=>s.cases[0].state='agreed'],['actor substitution',s=>s.cases[0].events[0].role='buyer'],
 ['missing event',s=>s.cases[0].sequence=2],['unknown terms',s=>s.cases[0].termsVersion='custom'],['unknown state',s=>s.cases[0].state='paid'],
])test(`status rejects ${name}`,()=>{const s=status();edit(s);assert.throws(()=>resolutionStatus(s));});
test('impossible operator acceptance without recorded buyer agreement is rejected',()=>{const s=status(),c=s.cases[0];c.sequence=2;c.state='accepted';c.events.push({requestId:randomUUID(),sequence:2,role:'operator',action:'accept',recordedAt:date});assert.throws(()=>resolutionStatus(s));});
function fixture(){const f={actor:randomUUID(),enabled:true,calls:[]};f.handler=resolutionHandler({origin:()=>origin,authenticate:async()=>f.actor,enabled:()=>f.enabled,
 admin:()=>{f.calls.push('admin');return {rpc:async(name,p)=>{f.calls.push({name,p});return {data:p.p_case_id,error:null};}};},
 refundService:()=>({requestResolution:async(...args)=>{f.calls.push(args);return {caseId:args[1]};}})});return f;}
const req=(body,headers={origin},url=origin+'/api/vendor-orders/resolutions')=>new Request(url,{method:'POST',headers,body:JSON.stringify(body)});
test('handler derives actual actor and returns private no-store response',async()=>{const f=fixture(),r=await f.handler(req(command()));assert.equal(r.status,200);assert.equal(f.calls[1].p.p_actor_id,f.actor);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');});
test('request uses sealed refund service with actual actor',async()=>{const f=fixture();assert.equal((await f.handler(req({action:'request',orderId,requestId:caseId}))).status,200);assert.deepEqual(f.calls,[[orderId,caseId,f.actor]]);});
for(const headers of [{},{origin:'https://evil.test'},{origin:origin+'.evil.test'}])test(`origin rejection before service ${JSON.stringify(headers)}`,async()=>{const f=fixture();assert.equal((await f.handler(req(command(),headers))).status,403);assert.deepEqual(f.calls,[]);});
test('signed out, disabled, forged actor and query strings cannot construct service',async()=>{
 for(const kind of ['auth','disabled','forged','query']){const f=fixture(),c=command();if(kind==='auth')f.actor=null;if(kind==='disabled')f.enabled=false;if(kind==='forged')c.actorId=randomUUID();
  const r=await f.handler(req(c,{origin},origin+'/api/vendor-orders/resolutions'+(kind==='query'?'?approve=true':'')));assert.equal(r.status,{auth:401,disabled:503,forged:400,query:400}[kind]);assert.deepEqual(f.calls,[]);}
});
const env=()=>({GROOKAI_VENDOR_ORDER_RESOLUTIONS_ENABLED:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_STAGING:'true',GROOKAI_DISABLE_TELEMETRY:'1',SUPABASE_URL:'http://127.0.0.1:15439'});
test('runtime is explicitly off by default and fixed to isolated lab',()=>{assert.equal(resolutionRuntimeEnabled({},origin),false);assert.equal(resolutionRuntimeEnabled(env(),origin),true);assert.throws(()=>resolutionRuntimeEnabled(env(),'https://grookaivault.com'));});
for(const [key,value] of [['SUPABASE_URL','https://production.supabase.co'],['VERCEL','1'],['VERCEL_ENV','preview'],['GROOKAI_DISABLE_TELEMETRY','0'],['NEXT_PUBLIC_STOREFRONT_LOCAL_TEST','false'],['NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING','true']])test(`runtime rejects ${key}`,()=>{assert.throws(()=>resolutionRuntimeEnabled({...env(),[key]:value},origin));});
test('review cursor keeps microsecond precision and rejects filter injection',()=>{
 const c={created:'2026-09-22T17:00:00.123456+00:00',id:caseId},encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 assert.deepEqual(resolutionQueueCursor(encode(c)),c);assert.throws(()=>resolutionQueueCursor(encode({...c,created:'x),id.neq.null'})));assert.throws(()=>resolutionQueueCursor('!'));assert.throws(()=>resolutionQueueCursor(encode({...c,extra:true})));
});
