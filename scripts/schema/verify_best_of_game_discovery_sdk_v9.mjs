// Actual official PostgREST SDK against the one task-owned internal REST server.
import fs from'node:fs';import{gunzipSync}from'node:zlib';
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import{fileURLToPath}from'node:url';
import{PostgrestClient}from'@supabase/postgrest-js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const binding=JSON.parse(fs.readFileSync(root+'/scripts/schema/best_of_game_discovery_candidate_v9.json'));
const facts=JSON.parse(fs.readFileSync(root+'/docs/catalog/best_of_game_discovery_v1/classification.json'));
const url=new URL(process.env.LOCAL_BOG_REST_URL??'');
assert.equal(url.pathname,'/');assert.equal(url.protocol,'http:');assert.equal(url.hostname,'bog-identity-518-rest-v9');assert.equal(url.port,'3000');
assert.equal(process.env.LOCAL_BOG_PROOF_DIR,'/proof');assert.ok(process.env.LOCAL_BOG_ANON_KEY);
for(const k of Object.keys(process.env).filter(k=>/^SUPABASE_/.test(k)))assert.equal(process.env[k],undefined,'Local SDK verification must receive no Supabase environment variables');
const out='/proof/result.json';assert.equal(fs.existsSync(out),false);
const sdk=new PostgrestClient(url.origin,{headers:{apikey:process.env.LOCAL_BOG_ANON_KEY,Authorization:'Bearer '+process.env.LOCAL_BOG_ANON_KEY}});
const report={pass:false,productionWrites:0,localWrites:0,actualSdk:'@supabase/postgrest-js',anonymousOnly:true,startedAt:new Date().toISOString(),candidateSha256:binding.candidateBundleSha256,sourceSha256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),apiCases:[]};
const wantedParents=[...facts.pairs.map(p=>p.canonical.gv_id),...facts.protectedWinnerParents.map(p=>p.gv_id)].sort();
const wantedChildren=facts.pairs.map(p=>p.retainedCanonicalChild.printing_gv_id).sort();
async function rpc(name,args){
 const t=performance.now(),response=await sdk.rpc(name,args),ms=Math.round(performance.now()-t);
 report.apiCases.push({name,ms,rows:Array.isArray(response.data)?response.data.length:undefined,error:response.error?.code??null});
 assert.ifError(response.error);assert.ok(ms<3000,name+' exceeds unchanged3s API budget');return response.data;
}
try{
 report.readiness=[];
 for(let i=0;i<40;i++){
  const probe=await sdk.from('sets').select('id').limit(1);
  report.readiness.push({attempt:i+1,ready:!probe.error,error:probe.error?.code??null});
  if(!probe.error)break;
  if(i===39)throw new Error('Owned local REST schema did not become ready');
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 const catalog=await rpc('get_public_catalog_sets_v2',{p_game_code:'pokemon'});
 assert.deepEqual(catalog.filter(x=>['bog','bp'].includes(x.code)).map(x=>({code:x.code,n:Number(x.card_count)})),[{code:'bp',n:13}]);
 for(const[legacy,canonical,n]of[['sv08.5','sv8pt5',194],['sv04.5','sv4pt5',248],['swsh10.5','pgo',90],['2021swsh','mcd21',25],['tk-ex-latio','tk1b',10],['sv06.5','sv6pt5',113]])assert.deepEqual(catalog.filter(x=>[legacy,canonical].includes(x.code)).map(x=>({code:x.code,n:Number(x.card_count)})),[{code:canonical,n}]);
 const identityOracle=JSON.parse(gunzipSync(fs.readFileSync('/proof/before-identity-cases.private.json.gz'))).filter(x=>x.role==='anon');assert.equal(identityOracle.length,24);for(const item of identityOracle){const[q,set_code_in,number_in,object_type_in,limit_in,offset_in]=item.args;const rows=await rpc('search_print_identity_v1',{q,set_code_in,number_in,object_type_in,limit_in,offset_in});assert.deepEqual(rows,item.rows);}report.originalIdentityOutputCases=identityOracle.length;
 for(const code of['bog','bp']){
  const route=await rpc('resolve_visible_set_references_v1',{code_in:code,game_code_in:'pokemon'});assert.deepEqual(route.map(x=>x.code),['bp']);
  const browse=await rpc('search_game_card_prints_v5',{game_code_in:'pokemon',set_code_in:code,limit_in:512,offset_in:0});assert.deepEqual(browse.map(x=>x.gv_id).sort(),wantedParents);assert.ok(browse.every(x=>x.set_code==='bp'));
  const parents=await rpc('search_print_identity_v1',{q:null,set_code_in:code,object_type_in:'parent_print',limit_in:512});assert.deepEqual(parents.map(x=>x.parent_gv_id).sort(),wantedParents);
  const children=await rpc('search_print_identity_v1',{q:null,set_code_in:code,object_type_in:'child_printing',limit_in:512});assert.deepEqual(children.map(x=>x.printing_gv_id).sort(),wantedChildren);
 }
 const allIds=[...facts.pairs.flatMap(p=>[p.legacy.id,p.canonical.id]),...facts.protectedWinnerParents.map(p=>p.id)];
 const options=await rpc('get_public_card_printing_options_v1',{p_card_print_ids:allIds,p_limit:128,p_offset:0});assert.equal(options.length,18);
 assert.deepEqual(options.map(x=>x.printing_gv_id).sort(),facts.pairs.flatMap(p=>[p.retainedLegacyChild.printing_gv_id,p.retainedCanonicalChild.printing_gv_id]).sort());
 const raw=await sdk.from('card_prints').select('id,gv_id,set_code').in('set_code',['bog','bp']);assert.ifError(raw.error);assert.equal(raw.data.length,22);
 const projected=await sdk.from('v_card_prints_set_family_discovery_v1').select('gv_id,set_code,variant_key').in('gv_id',facts.protectedWinnerParents.map(p=>p.gv_id));assert.ifError(projected.error);assert.equal(projected.data.length,4);assert.ok(projected.data.every(x=>x.set_code==='bp'&&x.variant_key==='winner_stamp'));
 const privateRows=await sdk.from('vault_item_instances').select('id').limit(1);assert.ok(privateRows.error);assert.equal(privateRows.error.code,'42501');
 Object.assign(report,{pass:true,rawParents:22,retainedPrintingOptions:18,distinctWinnerParents:4,discoveryParents:13,discoveryChildren:9,allSixEarlierFamiliesExact:true,anonymousOwnershipDenied:true});
}catch(e){report.error=e.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:report.pass,error:report.error,apiCases:report.apiCases.length,maxMs:report.apiCases.length?Math.max(...report.apiCases.map(x=>x.ms)):null}));}
