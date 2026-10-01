import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),module={exports:{}};
const source=fs.readFileSync('apps/web/src/lib/search/completeNamedCardSearch.ts','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Set,Error});
const {fetchCompleteNamedCardRows:fetchRows}=module.exports;
const retain = module.exports.retainNamedCardFirstPage;

test('request-local first page avoids a duplicate read without shortening raw paging',async()=>{
 const rows=Array.from({length:513},(_,i)=>({id:String(i),name:'Pikachu',gv_id:i<512?'GV-TCGP-B1-003':'GV-PK-T-064'}));
 const calls=[];
 const result=await fetchRows({rpc:async(_,a)=>{calls.push(a.offset_in);return {data:rows.slice(a.offset_in,a.offset_in+512)};}},
  {textQuery:'Pika',gameScope:'pokemon',namedFirstPage:retain({query:'Pika',gameScope:'pokemon',rows:rows.slice(0,512)})});
 assert.deepEqual(calls,[512,1024,1536,2048]);assert.equal(result.length,1);assert.equal(result[0].id,'512');
});
test('a first page is never reused across differing query, game, language or set scopes',async()=>{
 for(const override of [{textQuery:'Pikachu'},{gameScope:'mtg'},{languageScope:'en'},{languageScope:'ja'},{exactSetCode:'base1'}]) {
  const calls=[];
  await fetchRows({rpc:async(_,a)=>{calls.push(a);return {data:[]};}},
   {textQuery:'Pika',gameScope:'pokemon',namedFirstPage:retain({query:'Pika',gameScope:'pokemon',rows:[]}),...override});
  assert.equal(calls.length,1);assert.equal(calls[0].offset_in,0);
 }
 // A caller without a retained probe always reads its own visible page.
 let reads=0;await fetchRows({rpc:async()=>{reads++;return {data:[]};}},{textQuery:'Pika',gameScope:'pokemon'});
 assert.equal(reads,1);
});
test('a reused full page still rejects failures and duplicates on subsequent pages',async()=>{
 const rows=Array.from({length:512},(_,i)=>({id:String(i),name:'Pikachu',gv_id:'GV-PK-T-001'}));
 const options={textQuery:'Pika',gameScope:'pokemon',namedFirstPage:retain({query:'Pika',gameScope:'pokemon',rows})};
 await assert.rejects(()=>fetchRows({rpc:async()=>({error:{message:'page failed'}})},options),/page failed/);
 await assert.rejects(()=>fetchRows({rpc:async()=>({data:[rows[0]]})},options),/could not advance/);
});
test('serialized or forged first pages cannot bypass caller-visible database reads',async()=>{
 const trusted=retain({query:'Pika',gameScope:'pokemon',rows:[{id:'forged',name:'Pikachu',gv_id:'GV-PK-T-001'}]});
 let reads=0;
 const result=await fetchRows({rpc:async()=>{reads++;return {data:[]};}},
  {textQuery:'Pika',gameScope:'pokemon',namedFirstPage:JSON.parse(JSON.stringify(trusted))});
 assert.equal(reads,1);assert.equal(result,null);
});

test('short fragments never start an exhaustive RPC scan',async()=>{
 for(const textQuery of ['a','p','pi','a p','Ｐ','ex common 7']) {
  const result=await fetchRows({rpc:async()=>{assert.fail('Broad fragments must remain bounded');}},{textQuery,gameScope:'pokemon'});
  assert.equal(result,null);
 }
});
test('a known name retains all RPC pages and passes caller game/language scope',async()=>{
 const rows=Array.from({length:1027},(_,i)=>({id:String(i),name:'Wurmple',gv_id:'GV-PK-TEST-001'})),calls=[];
 const result=await fetchRows({rpc:async(name,args)=>{assert.equal(name,'search_game_card_prints_v5');calls.push(args);return {data:rows.slice(args.offset_in,args.offset_in+args.limit_in),error:null};}},{textQuery:'Wurmple common 7/1019',gameScope:'pokemon',languageScope:'ja'});
 assert.equal(result.length,1027);assert.deepEqual(calls.map(c=>c.offset_in),[0,512,1024,1536,2048]);
 assert.ok(calls.every(c=>c.q==='Wurmple'&&c.game_code_in==='pokemon'&&c.language_scope_in==='ja'));
});
test('unknown residual words do not become a partial card-name match',async()=>{
 assert.equal(await fetchRows({rpc:async()=>({data:[{id:'a',name:'Wurmple',gv_id:'GV-PK-TEST-001'}],error:null})},{textQuery:'Wurmple sparkly',gameScope:'pokemon'}),null);
 const calls=[];await fetchRows({rpc:async(_,a)=>{calls.push(a);return {data:[{id:'b',name:'Rare Candy',gv_id:'GV-PK-TEST-002'}],error:null};}},{textQuery:'Rare Candy common',gameScope:'pokemon',exactSetCode:'sv1'});
 assert.equal(calls[0].q,'Rare Candy');assert.equal(calls[0].set_code_in,'sv1');
});
test('later failures and offset-cap exhaustion never publish partial results',async()=>{
 let calls=0;await assert.rejects(()=>fetchRows({rpc:async()=>++calls===1?{data:Array.from({length:512},(_,i)=>({id:String(i),name:'Wurmple',gv_id:'GV-PK-TEST-001'})),error:null}:{data:null,error:{message:'catalog unavailable'}}},{textQuery:'Wurmple',gameScope:'pokemon'}),/catalog unavailable/);
 await assert.rejects(()=>fetchRows({rpc:async(_,a)=>({data:Array.from({length:512},(_,i)=>({id:String(a.offset_in+i),name:'Wurmple',gv_id:'GV-PK-TEST-001'})),error:null})},{textQuery:'Wurmple',gameScope:'pokemon'}),/too broad/);
});

test('game scope excludes Pocket without stopping at a partially eligible page',async()=>{
 const rows=Array.from({length:513},(_,i)=>({id:String(i),name:'Wurmple',gv_id:i===512?'GV-PK-TEST-003':'GV-TCGP-B1-003'}));
 const calls=[];
 const result=await fetchRows({rpc:async(_,a)=>{calls.push(a.offset_in);return {data:rows.slice(a.offset_in,a.offset_in+512),error:null};}},{textQuery:'Wurmple',gameScope:'pokemon'});
 assert.deepEqual(calls,[0,512,1024,1536,2048]);assert.equal(result.length,1);assert.equal(result[0].id,'512');
});

test('partial names traverse every RPC page and exclude unrelated fuzzy candidates',async()=>{
 const rows=Array.from({length:1027},(_,i)=>({id:String(i),name:i===70?'Raichu':'Pikachu ex',gv_id:`GV-PK-TEST-${i}`}));
 const calls=[];
 const result=await fetchRows({rpc:async(_,a)=>{calls.push(a.offset_in);return {data:rows.slice(a.offset_in,a.offset_in+512),error:null};}},{textQuery:'Pika',gameScope:'pokemon'});
 assert.deepEqual(calls,[0,512,1024,1536,2048]);assert.equal(result.length,1026);assert.ok(result.every(r=>r.name==='Pikachu ex'));
 for(const q of ['Dark Chari','Chari Dark']) {
  const matched=await fetchRows({rpc:async()=>({data:[{id:'dark',name:'Dark Charizard',gv_id:'GV-PK-TEST-001'}]})},{textQuery:q,gameScope:'pokemon'});
  assert.equal(matched.length,1);
 }
});

test('pages overlap at most four reads and keep deterministic offset order',async()=>{
 const rows=Array.from({length:4800},(_,i)=>({id:String(i),name:'Pikachu',gv_id:`GV-PK-T-${i}`}));
 let active=0,maxActive=0;const calls=[];
 const result=await fetchRows({rpc:async(_,a)=>{
  assert.equal(a.set_code_in,'selected');assert.equal(a.language_scope_in,'en');
  calls.push(a.offset_in);active++;maxActive=Math.max(maxActive,active);
  await new Promise(r=>setTimeout(r,a.offset_in%2048===512?5:1));active--;
  return {data:rows.slice(a.offset_in,a.offset_in+512)};
 }},{textQuery:'Pika',gameScope:'pokemon',languageScope:'en',exactSetCode:'selected'});
 assert.deepEqual(Array.from(result,r=>r.id),rows.map(r=>r.id));
 assert.equal(maxActive,4);assert.equal(calls[0],0);
});

test('a short page finishes without waiting for unused speculative pages',async()=>{
 const full=Array.from({length:512},(_,i)=>({id:String(i),name:'Pikachu',gv_id:`GV-PK-T-${i}`}));
 const result=await fetchRows({rpc:async(_,a)=>{
  if(a.offset_in===0)return {data:full};
  if(a.offset_in===512)return {data:[{id:'last',name:'Pikachu',gv_id:'GV-PK-T-512'}]};
  if(a.offset_in===1024)throw new Error('irrelevant speculative failure');
  return new Promise(()=>{});
 }},{textQuery:'Pika',gameScope:'pokemon'});
 assert.equal(result.length,513);assert.equal(result.at(-1).id,'last');
});

test('duplicate pages fail rather than yielding apparently complete matches',async()=>{
 const full=Array.from({length:512},(_,i)=>({id:String(i),name:'Pikachu',gv_id:`GV-PK-T-${i}`}));
 await assert.rejects(()=>fetchRows({rpc:async()=>({data:full})},{textQuery:'Pika',gameScope:'pokemon'}),/could not advance/);
});

test('one-page and unknown-name searches never fan out',async()=>{
 for(const name of ['Pikachu','Raichu']){
  let calls=0;
  const result=await fetchRows({rpc:async()=>{calls++;return {data:[{id:'a',name,gv_id:'GV-PK-T-1'}]};}},
   {textQuery:'Pika',gameScope:'pokemon'});
  assert.equal(calls,1);assert.equal(result?.length??null,name==='Pikachu'?1:null);
 }
});

test('a broad 421-row name result completes in one bounded read',async()=>{
 const rows=Array.from({length:421},(_,i)=>({id:String(i),name:'Charizard',gv_id:'GV-PK-T-'+i}));
 let calls=0;const result=await fetchRows({rpc:async(name,a)=>{calls++;assert.equal(name,'search_game_card_prints_v5');assert.equal(a.limit_in,512);return {data:rows};}},{textQuery:'Char',gameScope:'pokemon'});
 assert.equal(result.length,421);assert.equal(calls,1);
});
