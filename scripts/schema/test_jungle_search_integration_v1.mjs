// Combined PR568/Jungle HTTP and actual web-preview proof. Synthetic local writes only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {buildCollectionPreviewV2} from '../../apps/web/src/lib/import/collectionPreviewV2.ts';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const fixture=base+'/full-413-v16',project='jungle-edition-full-413-v16-20261001',container='supabase_db_'+project;
const out=base+'/search-integration-v1',read=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);
assert.equal(read(fixture+'/replay-result.json').migrations,413);
assert.equal(read(base+'/search-http-v6/receipt.json').status,'passed');
assert.ok(!fs.existsSync(out),'Never replay a consumed integration intent');
const freeze=read(fixture+'/freeze.json');
for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync('supabase/migrations/'+name)),h,name);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});
const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:60000});
assert.equal(sql("select current_setting('max_worker_processes')").trim(),'0');
const retainedSql="select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(t) order by id) from vault_item_instances t),'anchors',(select jsonb_agg(to_jsonb(t) order by id) from vault_items t))";
const retained=JSON.parse(sql(retainedSql));
const env={...process.env};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
const config=JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',fixture,'--network-id',project],{encoding:'utf8',windowsHide:true,env,stdio:['ignore','pipe','pipe']}));
assert.equal(config.API_URL,'http://127.0.0.1:64641');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const anon=createClient(config.API_URL,config.ANON_KEY,options),admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),member=createClient(config.API_URL,config.ANON_KEY,options);
fs.mkdirSync(out);const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,consumed:true,scope:'synthetic set visibility and read-only collection preview',productionWrites:0});
sql(`begin;
 insert into sets(code,name,game) values ('Jungle-Integration-Hidden','Jungle Integration Hidden','pokemon'),('Jungle-Integration-Signed','Jungle Integration Signed','pokemon');
 insert into catalog_set_release_controls(set_id,release_status,release_version)
 select id,case when code='Jungle-Integration-Hidden' then 'hidden' else 'signed_in' end,'JUNGLE_SEARCH_INTEGRATION_V1'
 from sets where code in ('Jungle-Integration-Hidden','Jungle-Integration-Signed');commit;`);
const password=randomUUID()+'Aa9!',email=randomUUID()+'@jungle-search-integration.invalid';
const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(made.error);
assert.ifError((await member.auth.signInWithPassword({email,password})).error);
const tests=[];const pass=name=>tests.push(name);
const rpc=async(client,name,args)=>{const r=await client.rpc(name,args);assert.ifError(r.error);return r.data;};
const proofDirs=fs.readdirSync(base).filter(n=>n.startsWith('foundation-sql-v16-')&&fs.existsSync(base+'/'+n+'/receipt.json'));assert.equal(proofDirs.length,1);
const {ids}=read(base+'/'+proofDirs[0]+'/fixture-intent.json');
for(const [role,client]of [['anon',anon],['authenticated',member]]){
 const catalog=await rpc(client,'get_search_set_catalog_v1',{game_code_in:'pokemon'});
 assert.equal(catalog.complete,true);assert.equal(catalog.sets.filter(s=>s.code==='base2').length,1);pass(role+'_one_jungle_set');
 assert.equal(catalog.sets.some(s=>s.code==='Jungle-Integration-Hidden'),false);pass(role+'_hidden_set_excluded');
 assert.equal(catalog.sets.some(s=>s.code==='Jungle-Integration-Signed'),role==='authenticated');pass(role+'_signed_set_visibility');
 assert.deepEqual(await rpc(client,'resolve_visible_set_references_v1',{code_in:' BASE2 ',game_code_in:' PoKeMoN '}),[{id:ids.set,code:'base2'}]);pass(role+'_indexed_casefolded_jungle_lookup');
 assert.deepEqual(await rpc(client,'resolve_visible_set_references_v1',{code_in:'Jungle-Integration-Hidden'}),[]);pass(role+'_exact_hidden_set_denied');
 assert.equal((await rpc(client,'resolve_visible_set_references_v1',{code_in:'jungle-integration-signed'})).length,role==='authenticated'?1:0);pass(role+'_exact_signed_set_visibility');
 const parents=await rpc(client,'search_game_card_prints_v4',{game_code_in:'pokemon',q:'Clefable',limit_in:64,offset_in:0});
 assert.deepEqual(parents.map(c=>c.id).sort(),[ids.first,ids.unlimited].sort());pass(role+'_name_search_two_editions');
 const legacy=await rpc(client,'search_game_card_prints_v4',{game_code_in:'pokemon',q:'GV-PK-JU-1',limit_in:64,offset_in:0});
 assert.ok(legacy.some(c=>c.id===ids.legacy));pass(role+'_exact_legacy_still_readable');
}
const csv='Product Name,Category,Set,Card Number,Variance,Grade,Quantity,Notes,Portfolio Name\nClefable,Pokemon,Jungle,1,Holofoil,Ungraded,2,Preserve my source,Main';
const preview=await buildCollectionPreviewV2(member,made.data.user.id,csv);
assert.equal(preview.readyRows,0);assert.equal(preview.readyCopies,0);assert.equal(preview.reviewRows,1);pass('actual_web_preview_holds_edition');
assert.equal(preview.rows[0].selection,null);assert.match(preview.rows[0].reason,/First Edition|edition/);pass('no_automatic_edition_target');
assert.equal(preview.rows[0].source.Notes,'Preserve my source');assert.equal(preview.rows[0].source['Portfolio Name'],'Main');assert.equal(preview.rows[0].quantity,2);pass('source_metadata_preserved');
assert.deepEqual(JSON.parse(sql(retainedSql)),retained);pass('all_saved_fixture_copies_and_anchors_unchanged');
save('preview.private.json',preview);
await member.auth.signOut();
save('receipt.json',{at:new Date().toISOString(),status:'passed',project,tests,testCount:tests.length,productionWrites:0,ownershipWrites:0,
 sourceHashes:Object.fromEntries(['apps/web/src/lib/import/collectionPreviewV2.ts','apps/web/src/lib/cards/jungleEditionResolution.ts','scripts/schema/test_jungle_search_integration_v1.mjs'].map(p=>[p,hash(fs.readFileSync(p))]))});
console.log(JSON.stringify({status:'passed',testCount:tests.length,project,productionWrites:0,ownershipWrites:0}));
