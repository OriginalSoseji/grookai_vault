import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),module={exports:{}};
const source=fs.readFileSync('apps/web/src/lib/search/completeNamedCardSearch.ts','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Set,Error});
const {fetchCompleteNamedCardRows:fetchRows}=module.exports;
test('a known name retains all RPC pages and passes caller game/language scope',async()=>{
 const rows=Array.from({length:131},(_,i)=>({id:String(i),name:'Wurmple',gv_id:'GV-PK-TEST-001'})),calls=[];
 const result=await fetchRows({rpc:async(name,args)=>{assert.equal(name,'search_game_card_prints_v4');calls.push(args);return {data:rows.slice(args.offset_in,args.offset_in+args.limit_in),error:null};}},{textQuery:'Wurmple common 7/1019',gameScope:'pokemon',languageScope:'ja'});
 assert.equal(result.length,131);assert.deepEqual(calls.map(c=>c.offset_in),[0,64,128]);
 assert.ok(calls.every(c=>c.q==='Wurmple'&&c.game_code_in==='pokemon'&&c.language_scope_in==='ja'));
});
test('unknown residual words do not become a partial card-name match',async()=>{
 assert.equal(await fetchRows({rpc:async()=>({data:[{id:'a',name:'Wurmple',gv_id:'GV-PK-TEST-001'}],error:null})},{textQuery:'Wurmple sparkly',gameScope:'pokemon'}),null);
 const calls=[];await fetchRows({rpc:async(_,a)=>{calls.push(a);return {data:[{id:'b',name:'Rare Candy',gv_id:'GV-PK-TEST-002'}],error:null};}},{textQuery:'Rare Candy common',gameScope:'pokemon',exactSetCode:'sv1'});
 assert.equal(calls[0].q,'Rare Candy');assert.equal(calls[0].set_code_in,'sv1');
});
test('later failures and offset-cap exhaustion never publish partial results',async()=>{
 let calls=0;await assert.rejects(()=>fetchRows({rpc:async()=>++calls===1?{data:Array.from({length:64},(_,i)=>({id:String(i),name:'Wurmple',gv_id:'GV-PK-TEST-001'})),error:null}:{data:null,error:{message:'catalog unavailable'}}},{textQuery:'Wurmple',gameScope:'pokemon'}),/catalog unavailable/);
 await assert.rejects(()=>fetchRows({rpc:async(_,a)=>({data:Array.from({length:64},(_,i)=>({id:String(a.offset_in+i),name:'Wurmple',gv_id:'GV-PK-TEST-001'})),error:null})},{textQuery:'Wurmple',gameScope:'pokemon'}),/too broad/);
});

test('game scope excludes Pocket without stopping at a partially eligible page',async()=>{
 const rows=Array.from({length:65},(_,i)=>({id:String(i),name:'Wurmple',gv_id:i===64?'GV-PK-TEST-003':'GV-TCGP-B1-003'}));
 const calls=[];
 const result=await fetchRows({rpc:async(_,a)=>{calls.push(a.offset_in);return {data:rows.slice(a.offset_in,a.offset_in+64),error:null};}},{textQuery:'Wurmple',gameScope:'pokemon'});
 assert.deepEqual(calls,[0,64]);assert.equal(result.length,1);assert.equal(result[0].id,'64');
});
