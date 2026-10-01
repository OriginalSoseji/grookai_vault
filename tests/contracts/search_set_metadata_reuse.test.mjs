import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=fs.readFileSync('apps/web/src/lib/explore/getExploreRows.ts','utf8');
const reader=source.slice(source.indexOf('async function fetchPublicSetMetadata('),source.indexOf('\nexport async function getExploreRowsPacketWithTiming('));
function load(db){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(reader+'\nexport {fetchPublicSetMetadata};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  module,exports:module.exports,createServerComponentClient:async()=>db,
  uniqueValues:v=>[...new Set(v)],chunkArray:(v,n)=>Array.from({length:Math.ceil(v.length/n)},(_,i)=>v.slice(i*n,(i+1)*n)),
  getReleaseYear:v=>v?Number(v.slice(0,4)):undefined,
 });return module.exports.fetchPublicSetMetadata;
}
test('request metadata is reused, missing codes still use caller-visible reads, and requests do not share data',async()=>{
 const calls=[];
 const db={from:table=>{assert.equal(table,'sets');return{select:()=>({in:async(field,codes)=>{
  assert.equal(field,'code');calls.push([...codes]);return{data:[{code:'other',name:'Other Game',printed_total:55,release_date:'2021-01-01',identity_model:'standard'}]};
 }})};}};
 const fetch=load(db),catalog=[{id:'1',code:'base1',name:'Base Set',printed_total:102,release_date:'1999-01-09',identity_model:'standard'}];
 const first=await fetch(['base1'],catalog);assert.equal(calls.length,0);assert.equal(first.get('base1').printed_total,102);
 const mixed=await fetch(['base1','other'],catalog);assert.deepEqual(calls,[['other']]);assert.equal(mixed.get('other').release_year,2021);
 await fetch(['base1'],[]);assert.deepEqual(calls,[['other'],['base1']]);
 await assert.rejects(load({from:()=>({select:()=>({in:async()=>({error:{message:'offline'}})})})})(['missing'],catalog),/offline/);
});
