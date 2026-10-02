import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import {createCollectionImportHandler} from '../../supabase/functions/vault-import-collection-v2/handler.ts';
// Keep fixtures local: importing another test file would register its tests twice.
const row={'Product Name':'Synthetic card',Category:'Pokemon',Set:'151','Card Number':'65',Variance:'Reverse Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25','Portfolio Name':'Private'};
const toCsv=rows=>{const keys=Object.keys(rows[0]);return[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');};
const owner=randomUUID(),cardId=randomUUID(),printing=randomUUID(),requestId=randomUUID();
const selection={sourceIndices:[0],cardId,gvId:'GV-TEST',cardPrintingId:printing};
const namedFinishes=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_named_finishes_v1.json',import.meta.url)));
for(const c of namedFinishes)test('named source finish requires its exact governed child: '+c.name,async()=>{
 const source={...row,'Product Name':c.name,Variance:'Holofoil'};
 const options={card:{name:'Synthetic',identity_domain:'pokemon_eng_standard'},printing:{finish_key:c.finish??'holo'}};
 const f=fixture(options),response=await f.send({csvText:toCsv([source])});
 assert.equal(response.status,c.finish?200:400);
 if(!c.finish){assert.equal(f.writes.length,0);return;}
 assert.equal(f.writes[0].args.p_targets[0].finishKey,c.finish);assert.equal(f.writes[0].args.p_targets[0].cardPrintingId,printing);assert.deepEqual(f.writes[0].args.p_source_rows,[source]);
 for(const printingChange of [{finish_key:'holo'},{finish_key:'reverse'},{finish_is_active:false}]){
  const bad=fixture({...options,printing:{...options.printing,...printingChange}});assert.equal((await bad.send({csvText:toCsv([source])})).status,400);assert.equal(bad.writes.length,0);
 }
 for(const cardChange of [{identity_domain:'pokemon_jpn_standard'},{language:'ja'},{number:'66'},{name:c.name,identity_domain:'pokemon_jpn_standard'}]){
  const bad=fixture({...options,card:{...options.card,...cardChange}});assert.equal((await bad.send({csvText:toCsv([source])})).status,400);assert.equal(bad.writes.length,0);
 }
 const duplicate=fixture({...options,extraPrintings:[{id:randomUUID(),card_print_id:cardId,finish_key:c.finish,finish_is_active:true}]});
 assert.equal((await duplicate.send({csvText:toCsv([source])})).status,400);assert.equal(duplicate.writes.length,0);
 for(const change of [{Variance:'Normal'},{Variance:'Reverse Holofoil'},{Grade:'PSA 10'}]){
  const bad=fixture(options);assert.equal((await bad.send({csvText:toCsv([{...source,...change}])})).status,400);assert.equal(bad.writes.length,0);
 }
});
function fixture(options={}) {
 const writes=[],reads=[];
 const client={from:table=>{
  let after=null;const query={select:()=>query,in:()=>query,eq:()=>query,gt:(_,value)=>{after=value;return query;},order:()=>query,limit:async()=>{
   if(table==='card_print_identity') {
    reads.push({table,after});
    const rows=[...(options.identities??[])].sort((a,b)=>a.id.localeCompare(b.id));
    return {error:options.identityError??(options.identityLateError&&after?{}:null),data:rows.filter(r=>options.repeatIdentityPage||after===null||r.id>after).slice(0,1)};
   }
   reads.push({after});return {error:options.catalogError??null,data:after?[]:[{id:cardId,gv_id:'GV-TEST',name:'Synthetic card',number:'065/165',sets:{name:'151',game:'pokemon'},...options.card}]};
  }};return query;
 },rpc:async(name,args)=>{
  reads.push({name,args});return{error:options.printingError??null,data:args.p_offset?[]:[{id:printing,card_print_id:cardId,finish_key:'reverse',finish_is_active:true,...options.printing},...(options.extraPrintings??[])]};
 }};
 const handler=createCollectionImportHandler({requireUser:async()=>{if(options.authError)throw{code:options.authError};return{userId:owner,sb:client};},createServiceRoleClient:()=>({rpc:async(name,args)=>{
  writes.push({name,args});if(options.transportLoss)throw Error('response lost');
  return{error:options.rpcError??null,data:{success:true,requestId:args.p_request_id,sourceSha256:args.p_source_sha256,sourceRows:args.p_source_rows.length,reviewRows:args.p_source_rows.length-args.p_targets.reduce((n,t)=>n+t.sourceIndices.length,0),importedCards:args.p_targets.reduce((n,t)=>n+t.desiredQuantity,0),importedEntries:args.p_targets.length,
   targets:args.p_targets.map(t=>({...t,instanceIds:Array.from({length:t.desiredQuantity},()=>randomUUID())})),...options.response}};
 }})});
 return{writes,reads,send:(override={})=>handler(new Request('http://localhost/import',{method:'POST',body:JSON.stringify({ownerUserId:owner,requestId,csvText:toCsv([row]),targets:[selection],...override})}))};
}
test('one authenticated atomic save derives metadata from original CSV',async()=>{
 const f=fixture();const response=await f.send({targets:[{...selection,desiredQuantity:900,condition:'NM',acquisitionCost:999}]});
 assert.equal(response.status,200);assert.equal(f.writes.length,1);
 const {name,args}=f.writes[0];assert.equal(name,'admin_import_vault_collection_v2');assert.equal(args.p_user_id,owner);assert.equal(args.p_request_id,requestId);
 assert.equal(args.p_targets[0].desiredQuantity,2);assert.equal(args.p_targets[0].condition,'LP');assert.equal(args.p_targets[0].finishKey,'reverse');assert.equal(args.p_targets[0].acquisitionCost,4.25);assert.deepEqual(args.p_source_rows,[row]);
 assert.equal(f.reads.filter(r=>'after'in r).length,2);assert.deepEqual(f.reads.filter(r=>r.args).map(r=>r.args.p_offset),[0,1]);
});
for(const [name,override] of Object.entries({owner:{ownerUserId:randomUUID()},request:{requestId:'invalid'},duplicate:{targets:[selection,selection]},outOfRange:{targets:[{...selection,sourceIndices:[1]}]},fraction:{targets:[{...selection,sourceIndices:[0.5]}]},grade:{csvText:toCsv([{...row,Grade:'PSA 10'}])},mismatchedName:{csvText:toCsv([{...row,'Product Name':'Different'}])}}))test(`rejects ${name} before writer`,async()=>{const f=fixture();assert.ok((await f.send(override)).status>=400);assert.equal(f.writes.length,0);});
for(const options of [{authError:'invalid_jwt'},{authError:'server_misconfigured'},{catalogError:{}},{printingError:{}},{printing:{finish_key:'holo'}},{card:{sets:{name:'151',game:'mtg'}}},{extraPrintings:[{id:randomUUID(),card_print_id:cardId,finish_key:'reverse',finish_is_active:true}]}])test('unavailable or ambiguous identity fails closed',async()=>{const f=fixture(options);assert.ok((await f.send()).status>=400);assert.equal(f.writes.length,0);});
test('unresolved rows can be retained without creating inventory',async()=>{const f=fixture();const r=await f.send({targets:[],csvText:toCsv([{...row,Grade:'PSA 10'}])});assert.equal(r.status,200);assert.equal((await r.json()).reviewRows,1);assert.equal(f.writes[0].args.p_targets.length,0);});
test('different purchase metadata cannot collapse into one target',async()=>{const f=fixture();const r=await f.send({csvText:toCsv([row,{...row,'Average Cost Paid':'99'}]),targets:[{...selection,sourceIndices:[0,1]}]});assert.equal(r.status,400);assert.equal(f.writes.length,0);});
test('same-metadata records retain originals and sum only their quantities',async()=>{const f=fixture();assert.equal((await f.send({csvText:toCsv([row,{...row,Quantity:'3'}]),targets:[{...selection,sourceIndices:[1,0]}]})).status,200);assert.equal(f.writes[0].args.p_targets[0].desiredQuantity,5);assert.equal(f.writes[0].args.p_source_rows.length,2);});
for(const options of [{transportLoss:true},{rpcError:{}},{response:{requestId:randomUUID()}},{response:{targets:[]}},{response:{importedCards:900}}])test('uncertain result never reports successful import or falls back',async()=>{const f=fixture(options);const r=await f.send();assert.equal(r.status,503);assert.equal((await r.json()).error,'import_outcome_unconfirmed');assert.equal(f.writes.length,1);});

test('blank finish with multiple printings cannot bypass the native review',async()=>{
 const f=fixture({extraPrintings:[{id:randomUUID(),card_print_id:cardId,finish_key:'holo',finish_is_active:true}]});
 const r=await f.send({csvText:toCsv([{...row,Variance:''}]),targets:[{...selection,cardPrintingId:null}]});
 assert.equal(r.status,400);assert.equal((await r.json()).error,'import_printing_requires_review');assert.equal(f.writes.length,0);
});
test('blank finish resolves only a unique selected active printing',async()=>{
 const f=fixture();assert.equal((await f.send({csvText:toCsv([{...row,Variance:''}])})).status,200);
 assert.equal(f.writes[0].args.p_targets[0].finishKey,'reverse');
});
test('blank finish cannot save when no active printing exists',async()=>{
 const f=fixture({printing:{finish_is_active:false}});const r=await f.send({csvText:toCsv([{...row,Variance:''}])});
 assert.equal(r.status,400);assert.equal(f.writes.length,0);
});
test('expanded retained source is rejected before the writer',async()=>{
 const fields=Object.fromEntries(Array.from({length:180},(_,i)=>['Market Price '+i.toString().padStart(4,'0'),'']));
 const csvText=toCsv(Array.from({length:700},()=>({...row,...fields})));
 assert.ok(Buffer.byteLength(csvText)<1900000);
 const f=fixture();const r=await f.send({csvText,targets:[]});
 assert.equal(r.status,400);assert.equal((await r.json()).error,'import_size_limit');assert.equal(f.writes.length,0);
});

const identityCases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_mtg_identity_v1.json',import.meta.url)));
const setAliases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_set_aliases_v1.json',import.meta.url)));
const pokemonNameCases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_pokemon_name_v1.json',import.meta.url)));
const setScopes=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_set_scopes_v1.json',import.meta.url)));
for(const scope of setScopes)for(const catalog of scope.catalog)test(`set scope ${scope.source} validates ${catalog} before atomic writer`,async()=>{
 const number=scope.numberPrefix?'RC7':'65';
 const f=fixture({card:{number,sets:{name:catalog,game:scope.game}}});
 const source={...row,Category:scope.game,Set:scope.source,'Card Number':number};
 assert.equal((await f.send({csvText:toCsv([source])})).status,200);
 assert.deepEqual(f.writes[0].args.p_source_rows,[source]);
 assert.equal(f.writes[0].args.p_targets[0].cardPrintingId,printing);
});
for(const scope of setScopes)test(`set scope ${scope.source} rejects unsupported identity before writer`,async()=>{
 const number=scope.numberPrefix?'RC7':'65';
 for(const change of [{Set:scope.source+' (Japanese)'},{Set:scope.source+' (1st Edition)'},{Category:'yugioh'},{Grade:'PSA 10'},{Variance:'Holofoil'},{'Product Name':'Synthetic card (Full Art)'},...(scope.numberPrefix?[{'Card Number':'65'}]:[])]){
  const n=change['Card Number']??number;
  const f=fixture({card:{number:n,sets:{name:scope.catalog[0],game:scope.game}}});
  const source={...row,Category:scope.game,Set:scope.source,'Card Number':number,...change};
  assert.equal((await f.send({csvText:toCsv([source])})).status,400);
  assert.equal(f.writes.length,0);
 }
 if(scope.catalog.length>1){
  const f=fixture({card:{sets:{name:scope.catalog.at(-1),game:scope.game}}});
  assert.equal((await f.send({csvText:toCsv([{...row,Category:scope.game,Set:scope.catalog[0]}])})).status,400);
  assert.equal(f.writes.length,0);
 }
});
for(const {label,expected,input} of pokemonNameCases)test(`Pokemon name server enforcement: ${label}`,async()=>{
 const f=fixture({card:input.card});
 const source={...row,'Product Name':input.sourceName,'Card Number':input.sourceNumber,Category:input.game};
 const response=await f.send({csvText:toCsv([source])});
 assert.equal(response.status,expected?200:400);
 assert.equal(f.writes.length,expected?1:0);
 if(expected){assert.deepEqual(f.writes[0].args.p_source_rows,[source]);assert.equal(f.writes[0].args.p_targets[0].cardPrintingId,printing);}
});
for(const alias of setAliases)test(`set label ${alias.source} retains original source and exact printing`,async()=>{
 const f=fixture({card:{sets:{name:alias.catalog,game:'pokemon'}}});
 const source={...row,Set:alias.source};
 const response=await f.send({csvText:toCsv([source])});
 assert.equal(response.status,200);assert.deepEqual(f.writes[0].args.p_source_rows,[source]);
 assert.equal(f.writes[0].args.p_targets[0].cardPrintingId,printing);
});
for(const [label,source,card] of [
 ['wrong game',{Category:'MTG'},{}],
 ['different catalog set',{}, {sets:{name:'Sandstorm',game:'pokemon'}}],
 ['different collector number',{'Card Number':'66'},{}],
 ['different treatment',{'Product Name':'Synthetic card (Stamped)'},{}],
 ['different finish',{Variance:'Holofoil'},{}],
 ['graded copy',{Grade:'PSA 10'},{}],
 ['Japanese set',{Set:'EX Emerald (JP)'},{}],
 ['edition set',{Set:'EX Emerald (1st Edition)'},{}],
 ['partial set',{Set:'EX Emeral'},{}],
])test(`set alias rejects ${label} before atomic writer`,async()=>{
 const f=fixture({card:{sets:{name:'Emerald',game:'pokemon'},...card}});
 const response=await f.send({csvText:toCsv([{...row,Set:'EX Emerald',...source}])});
 assert.equal(response.status,400);assert.equal(f.writes.length,0);
});
for(const {label,expected,input} of identityCases.filter(c=>c.input.game==='mtg'))test(`server catalog validation: ${label}`,async()=>{
 const identities=structuredClone(input.identities).map((identity,index)=>({...identity,id:index===0?identity.id:'55555555-5555-4555-8555-555555555555',
  card_print_id:identity.card_print_id===input.card.id?cardId:identity.card_print_id}));
 const card={...input.card,id:cardId,gv_id:'GV-TEST',sets:{name:'Synthetic Set',game:'mtg'}};
 const f=fixture({card,identities,printing:{finish_key:'foil'}});
 const response=await f.send({csvText:toCsv([{...row,Category:'MTG',Set:'Synthetic Set','Product Name':input.sourceName,'Card Number':input.sourceNumber,Variance:'Foil'}])});
 assert.equal(response.status,expected?200:label==='wrong identity card_print_id'?503:400,label);assert.equal(f.writes.length,expected?1:0);
 if(expected)assert.equal(f.writes[0].args.p_source_rows[0]['Product Name'],input.sourceName);
});
for(const mode of ['unavailable','repeated','late-failure'])test(`identity read ${mode} never reaches writer`,async()=>{
 const input=structuredClone(identityCases[0].input),identity={...input.identities[0],card_print_id:cardId};
 const f=fixture({card:{...input.card,id:cardId,sets:{name:'Synthetic Set',game:'mtg'}},identities:[identity],printing:{finish_key:'foil'},identityError:mode==='unavailable'?{}:null,repeatIdentityPage:mode==='repeated',identityLateError:mode==='late-failure'});
 // The capped-page repeated case must fail after reading the first identity.
 const response=await f.send({csvText:toCsv([{...row,Category:'MTG',Set:'Synthetic Set','Product Name':input.sourceName,'Card Number':input.sourceNumber,Variance:'Foil'}])});
 assert.equal(response.status,503);assert.equal(f.writes.length,0);
});
