// Real IndexedDB durability and competing-tab proof; no app backend or network access.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {owner,first,second,request,ack} from '../../tests/fixtures/event_journal_cases_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_event_closeout_20261008');
const require=createRequire(root+'apps/web/package.json'),ts=require('typescript'),{chromium}=require('@playwright/test');
const hash=b=>createHash('sha256').update(b).digest('hex'),base='C:/grookai_vault_operator_artifacts/product_event_closeout_20261008',out=base+'/journal-browser-'+Date.now();fs.mkdirSync(out);
const files=['apps/web/src/lib/sales/eventJournalStore.ts','apps/web/src/lib/sales/eventJournal.mjs','apps/web/src/lib/sales/vendorEvents.mjs'];
const sourceHashes=Object.fromEntries(files.map(p=>[p,hash(fs.readFileSync(root+p))]));
const storeSource=fs.readFileSync(root+files[0],'utf8'),compiled=ts.transpileModule(storeSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,strict:true}}).outputText;
const routes=new Map([
 ['/',{type:'text/html',body:'<!doctype html><title>Local event journal proof</title><script type="module" src="/boot.js"></script>'}],
 ['/store.js',{type:'text/javascript',body:compiled}],
 ['/eventJournal.mjs',{type:'text/javascript',body:fs.readFileSync(root+files[1],'utf8')}],
 ['/vendorEvents.mjs',{type:'text/javascript',body:fs.readFileSync(root+files[2],'utf8')}],
 ['/boot.js',{type:'text/javascript',body:"import {EventJournalStore} from '/store.js';window.eventAllowed=true;window.eventStore=owner=>new EventJournalStore(owner,()=>{if(!window.eventAllowed)throw Error('Account changed');});window.eventReady=true;"}],
]);
const server=http.createServer((req,res)=>{const row=routes.get(req.url);if(!row){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':row.type,'Cache-Control':'no-store'});res.end(row.body);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),out,origin,sourceHashes,consumed:true,productionWrites:0,backendRequests:0});
let context;
async function launch(){const c=await chromium.launchPersistentContext(out+'/browser-profile',{headless:true,serviceWorkers:'block'});await c.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());return c;}
async function page(){const p=await context.newPage();await p.goto(origin);await p.waitForFunction(()=>window.eventReady);return p;}
try{
 context=await launch();const a=await page(),b=await page();
 const alternate=structuredClone(request);alternate.requestId=second;
 const change=(wire,revision)=>({ownerId:owner,expectedLocalRevision:null,nextLocalRevision:revision,action:'stage',request:wire});
 const race=await Promise.all([a.evaluate(async x=>{try{return {value:await window.eventStore(x.ownerId).change(x)};}catch(error){return {error:error.message};}},change(request,first)),b.evaluate(async x=>{try{return {value:await window.eventStore(x.ownerId).change(x)};}catch(error){return {error:error.message};}},change(alternate,second))]);
 assert.equal(race.filter(r=>r.value).length,1);assert.equal(race.filter(r=>r.error).length,1);const saved=race.find(r=>r.value).value;
 assert.deepEqual(await a.evaluate(owner=>window.eventStore(owner).read(),owner),saved);
 const other='33333333-3333-4333-8333-333333333333';
 assert.equal(await a.evaluate(owner=>window.eventStore(owner).read(),other),null);
 const frozen=await a.evaluate(async({owner,request,revision})=>{const store=window.eventStore(owner),wire=structuredClone(request),before=JSON.stringify(wire),saving=store.change({ownerId:owner,expectedLocalRevision:null,nextLocalRevision:revision,action:'stage',request:wire});wire.operation.name='Changed after save click';const row=await saving;return {before,after:JSON.stringify(row.pending)};},{owner:other,request,revision:first});assert.equal(frozen.after,frozen.before);
 save('before-restart.json',{saved,freezeOnClick:true});await context.close();context=null;
 context=await launch();const reopened=await page();assert.deepEqual(await reopened.evaluate(owner=>window.eventStore(owner).read(),owner),saved);
 const next='44444444-4444-4444-8444-444444444444',acknowledgement={...ack,requestId:saved.pending.requestId,operation:saved.pending.operation};
 const resolving={ownerId:owner,expectedLocalRevision:saved.localRevision,nextLocalRevision:next,action:'acknowledge',request:saved.pending,acknowledgement};
 const failedWrite=await reopened.evaluate(async change=>{
  const store=window.eventStore(change.ownerId),before=await store.read(),original=IDBObjectStore.prototype.put;let refused=false;
  IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic quota failure','QuotaExceededError');};
  try{await store.change(change);}catch{refused=true;}finally{IDBObjectStore.prototype.put=original;}
  return {before,after:await store.read(),refused};
 },resolving);assert.equal(failedWrite.refused,true);assert.deepEqual(failedWrite.before,failedWrite.after);assert.deepEqual(failedWrite.after,saved);
 const cleared=await reopened.evaluate(x=>window.eventStore(x.ownerId).change(x),resolving);assert.equal(cleared.pending,null);
 const fifth='55555555-5555-4555-8555-555555555555',sixth='66666666-6666-4666-8666-666666666666';
 const staged=await reopened.evaluate(x=>window.eventStore(x.ownerId).change(x),{ownerId:owner,expectedLocalRevision:next,nextLocalRevision:fifth,action:'stage',request});
 for(const edit of [{action:'discardRejected'},{action:'reject',request,code:'NETWORK'},resolving]){
  const refused=await reopened.evaluate(async x=>{try{await window.eventStore(x.ownerId).change(x);return false;}catch{return true;}},{ownerId:owner,expectedLocalRevision:fifth,nextLocalRevision:sixth,...edit});assert.equal(refused,true);
  assert.deepEqual(await reopened.evaluate(owner=>window.eventStore(owner).read(),owner),staged);
 }
 const switched=await reopened.evaluate(async owner=>{const store=window.eventStore(owner),reading=store.read();window.eventAllowed=false;let refused=false;try{await reading;}catch{refused=true;}finally{window.eventAllowed=true;}return {refused,after:await store.read()};},owner);assert.equal(switched.refused,true);assert.deepEqual(switched.after,staged);
 const rejected=await reopened.evaluate(x=>window.eventStore(x.ownerId).change(x),{ownerId:owner,expectedLocalRevision:fifth,nextLocalRevision:sixth,action:'reject',request,code:'PT409'});assert.deepEqual(rejected.pending,request);
 const discarded=await reopened.evaluate(x=>window.eventStore(x.ownerId).change(x),{ownerId:owner,expectedLocalRevision:sixth,nextLocalRevision:first,action:'discardRejected'});assert.equal(discarded.pending,null);
 for(const [p,digest]of Object.entries(sourceHashes))assert.equal(hash(fs.readFileSync(root+p)),digest,p);
 save('result.json',{at:new Date().toISOString(),status:'passed',sourceHashes,competingTabs:true,processRestart:true,accountIsolation:true,freezeBeforeAwait:true,failedAcknowledgementWriteRetainsRequest:true,uncertainRequestCannotDiscard:true,staleAcknowledgementCannotClearNewRequest:true,lateAccountReadRefused:true,explicitRejectedDiscard:true,productionWrites:0,backendRequests:0});
 console.log(JSON.stringify({status:'passed',out}));
}finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));}
