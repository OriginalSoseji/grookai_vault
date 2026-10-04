import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
const ts=createRequire(import.meta.url)('typescript');
const source=ts.createSourceFile('getExploreRows.ts',fs.readFileSync('apps/web/src/lib/explore/getExploreRows.ts','utf8'),ts.ScriptTarget.Latest,true);
const names=['fetchCardRowsBySetCode','fetchCardRowsByIds','fetchCardRowsByStructuredTextQuery','fetchSmartDiscoveryChildRows','uniqueValues','chunkArray'];
const code=source.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(source)).join('\n')+`\n({${names.join(',')}});`;
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json'));
const legacy=fixture.legacy_card_print_id;
const cards=[{id:legacy,gv_id:'GV-PK-JU-1'},...fixture.options.map(o=>({id:o.card_print_id,gv_id:o.gv_id}))].map(row=>({...row,name:'Clefable',set_code:'base2'}));
const children=cards.map((row,index)=>({id:'child-'+index,card_print_id:row.id,printing_gv_id:row.gv_id+'-HOLO',card_prints:row,finish_key:'holo'}));
function harness({failed=false}={}){
 const requests=[];
 const client=createClient('https://fixture.invalid','fixture-key',{auth:{persistSession:false},global:{fetch:async(url)=>{
  const u=new URL(url);requests.push(u);const table=u.pathname.split('/').at(-1),p=u.searchParams;
  if(failed&&table.startsWith('v_'))return new Response(JSON.stringify({message:'Discovery unavailable'}),{status:503,headers:{'content-type':'application/json'}});
  let data=table.includes('printings')?children:cards;
  if(table.startsWith('v_'))data=data.filter(row=>(row.card_print_id??row.id)!==legacy);
  for(const column of ['id','card_print_id','gv_id','set_code']){const filter=p.get(column);if(filter?.startsWith('eq.'))data=data.filter(row=>row[column]===filter.slice(3));if(filter?.startsWith('in.'))data=data.filter(row=>filter.includes(row[column]));}
  const from=Number(p.get('offset')??0),limit=Number(p.get('limit')??1000);data=data.slice(from,from+limit);
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 }}});
 const api=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
  createServerComponentClient:async()=>client,SET_FETCH_PAGE_SIZE:1,GENERIC_TOKENS:new Set(),SMART_FILTER_DISCOVERY_LIMIT:160,
  normalizeFinishKeys:values=>values??[],applySmartDiscoveryImageQueryFilter:request=>request,
  getPublicCardPrintingOptions:async(_client,ids)=>children.filter(row=>ids.includes(row.card_print_id)),
  mapSmartChildRowToCardPrintLookupRow:row=>({...row.card_prints,printing_gv_id:row.printing_gv_id}),
 });
 return{api,requests};
}
test('Explore set discovery reads both complete pages after excluding legacy',async()=>{
 const h=harness(),rows=await h.api.fetchCardRowsBySetCode('base2');
 assert.deepEqual(Array.from(rows,row=>row.id),cards.slice(1).map(row=>row.id));
 assert.equal(h.requests.length,3);assert.ok(h.requests.every(u=>u.pathname.endsWith('/v_card_prints_discovery_v1')));
});
test('ordinary structured text selects discovery while exact GV-ID keeps legacy',async()=>{
 const h=harness();const ordinary=await h.api.fetchCardRowsByStructuredTextQuery({directGvId:null,significantTextTokens:['Clefable'],textTokens:[]});assert.equal(ordinary.length,2);
 const exact=await h.api.fetchCardRowsByStructuredTextQuery({directGvId:'GV-PK-JU-1',significantTextTokens:[],textTokens:[]});assert.equal(exact.length,1);assert.equal(exact[0].id,legacy);
});
test('owned hydration retains all three catalog identities',async()=>{
 const h=harness(),rows=await h.api.fetchCardRowsByIds(cards.map(row=>row.id));assert.equal(rows.length,3);assert.ok(rows.some(row=>row.id===legacy));assert.ok(h.requests.every(u=>u.pathname.endsWith('/card_prints')));
});
test('smart finish discovery excludes legacy but owned finish filtering retains it',async()=>{
 const h=harness();const ordinary=await h.api.fetchSmartDiscoveryChildRows({},cards);assert.equal(ordinary.length,2);
 const owned=await h.api.fetchSmartDiscoveryChildRows({},cards,false,true);assert.equal(owned.length,3);assert.ok(owned.some(row=>row.id===legacy));
});
test('discovery failure never falls back to raw catalog rows',async()=>{
 const h=harness({failed:true});await assert.rejects(h.api.fetchCardRowsBySetCode('base2'),/Discovery unavailable/);assert.equal(h.requests.length,1);
});
test('owned smart-filter caller explicitly requests the retained child scope',()=>{
 const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='getExploreRowsForOwnedSmartFilterDiscovery').getText(source);
 assert.match(fn,/fetchSmartDiscoveryChildRows\(options, parentRows, false, true\)/);
});
