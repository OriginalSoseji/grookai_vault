import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const sourceRoot=fileURLToPath(new URL('../../apps/web/src/',import.meta.url));
const lookupFile=path.join(sourceRoot,'lib/explore/getExploreRows.ts');
const greninja={id:'greninja-081',gv_id:'GV-PK-MEP-081',name:'Mega Greninja ex',number:'081',number_plain:'081',set_code:'mep',variant_key:'',printed_identity_modifier:null};

// Execute the real normalizer and collector lookup with an in-memory read-only
// PostgREST fixture. Image/pricing enrichment is outside this lookup boundary.
function harness(rows,{error=null}={}){
 const requests=[],operations=[];
 const client={from(table){
  assert.equal(table,'card_prints');
  const filters=[];
  return {select(){return this;},eq(field,value){operations.push({operator:'eq',field,value});filters.push(row=>row[field]===value);return this;},
   ilike(field,pattern){operations.push({operator:'ilike',field,value:pattern});const value=new RegExp('^'+pattern.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replaceAll('%','.*').replaceAll('_','.')+'$','i');filters.push(row=>value.test(String(row[field]??'')));return this;},
   not(field,operator,pattern){assert.equal(operator,'ilike');const prefix=pattern.replaceAll('%','').toLowerCase();filters.push(row=>!String(row[field]??'').toLowerCase().startsWith(prefix));return this;},
   limit(n){requests.push({table,filters:filters.length,limit:n});return Promise.resolve({data:rows.filter(row=>filters.every(f=>f(row))).slice(0,n),error});}};
 }};
 const mocks={
  '@/lib/supabase/server':{createServerComponentClient:async()=>client},
  '@/lib/canon/resolveCardImageFieldsV1':{},'@/lib/pricing/getPublicPricingByCardIds':{},
  '@/lib/cards/childDisplayImageFallbacks':{},'@/lib/cards/getPublicCardPrintingOptions':{},
 };
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const source=readFileSync(file,'utf8')+(file===lookupFile?'\nexports.collectorLookupForTest={buildResolverQuery,fetchCollectorScopedTextRows};':'');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const localRequire=id=>{
   if(Object.hasOwn(mocks,id))return mocks[id];
   if(id==='server-only')return {};
   if(id.startsWith('@/')){const target=path.join(sourceRoot,id.slice(2));return id.endsWith('.json')?JSON.parse(readFileSync(target,'utf8')):load(target+'.ts');}
   if(id.startsWith('.')){const target=path.resolve(path.dirname(file),id);return id.endsWith('.json')?JSON.parse(readFileSync(target,'utf8')):load(target+'.ts');}
   return require(id);
  };
  vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,process,console,URL,Map,Set},{filename:file});
  return module.exports;
 }
 const {normalizeQuery}=load(path.join(sourceRoot,'lib/resolver/normalizeQuery.ts'));
 const api=load(lookupFile).collectorLookupForTest;
 return {requests,operations,query:raw=>api.buildResolverQuery(normalizeQuery(raw)),
  lookup:(raw,scope='en')=>api.fetchCollectorScopedTextRows(api.buildResolverQuery(normalizeQuery(raw)),scope)};
}

for(const query of ['mega greninja 081','mega greninja 81','081 mega greninja','Mega Greninja ex #081']){
 test(`name plus collector number finds the canonical padded row: ${query}`,async()=>{
  const h=harness([greninja,{...greninja,id:'wrong-number',number:'022',number_plain:'022'},
   {...greninja,id:'wrong-name',name:'Mega Gengar ex'},
   {...greninja,id:'number-substring',number:'1081',number_plain:'1081'},
   {...greninja,id:'japanese',gv_id:'GV-PK-JPN-MEP-081'}]);
  assert.deepEqual(Array.from(await h.lookup(query),row=>row.id),['greninja-081']);
  assert.ok(h.query(query).textTokens.every(token=>!/^\d+$/.test(token)));
  assert.ok(h.requests.every(request=>request.limit<=64));
 });
}

test('a padded query also finds an unpadded canonical number',async()=>{
 const h=harness([{...greninja,number:'81',number_plain:'81'}]);
 assert.deepEqual(Array.from(await h.lookup('mega greninja 081'),row=>row.id),['greninja-081']);
});

test('text-only queries keep all name tokens',()=>{
 const h=harness([]);
 assert.deepEqual(Array.from(h.query('Mega Greninja ex').textTokens),['mega','greninja','ex']);
 assert.equal(h.query('Mega Greninja ex').numberTokens.length,0);
});

test('alphanumeric collector identities stay exact',async()=>{
 const correct={...greninja,id:'charizard-tg03',name:'Charizard',number:'tg03',number_plain:'3',gv_id:'GV-PK-LOR-TG03'};
 const h=harness([correct,{...correct,id:'wrong-prefix',number:'GG03',number_plain:'3'},
  {...correct,id:'extra-suffix',number:'TG03A'}]);
 assert.deepEqual(Array.from(await h.lookup('charizard TG03'),row=>row.id),['charizard-tg03']);
});

test('collector suffixes remain case-insensitive without collapsing sibling suffixes',async()=>{
 const correct={...greninja,id:'charizard-tg03a',name:'Charizard',number:'tg03a',number_plain:'3'};
 const h=harness([correct,{...correct,id:'wrong-suffix',number:'TG03B'},
  {...correct,id:'missing-suffix',number:'TG03'}]);
 assert.deepEqual(Array.from(await h.lookup('charizard TG03A'),row=>row.id),['charizard-tg03a']);
});

test('numeric collector filters use exact comparisons for both printed number columns',async()=>{
 const h=harness([greninja]);await h.lookup('mega greninja 081');
 const numericFilters=h.operations.filter(op=>['number','number_plain'].includes(op.field));
 assert.equal(numericFilters.length,4);
 assert.ok(numericFilters.every(op=>op.operator==='eq'));
 assert.deepEqual([...new Set(numericFilters.map(op=>op.value))].sort(),['081','81']);
});

test('fraction queries preserve their printed total evidence',async()=>{
 const h=harness([{...greninja,id:'blastoise',name:'Blastoise ex',number:'009',number_plain:'009'}]);
 const q=h.query('blastoise 009/165');
 assert.deepEqual(Array.from(q.fractionTokens),['009/165']);
 assert.deepEqual(Array.from(await h.lookup('blastoise 009/165'),row=>row.id),['blastoise']);
});

test('lookup errors propagate rather than claiming the catalog has no card',async()=>{
 const h=harness([],{error:{message:'catalog unavailable'}});
 await assert.rejects(h.lookup('mega greninja 081'),/catalog unavailable/);
});
