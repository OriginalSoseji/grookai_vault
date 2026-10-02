import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {localSupabaseStatusSecret} from '../../scripts/lib/local_supabase_cli_status_v1.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const namedFinishProof=process.env.GV_COLLECTR_NAMED_FINISH_HTTP_PROOF==='1';
const reviewProof=process.env.GV_COLLECTR_REVIEW_HTTP_PROOF==='1'||namedFinishProof;
const fcaProof=process.env.GV_COLLECTR_FCA_HTTP_PROOF==='1';
const adventureProof=process.env.GV_COLLECTR_ADVENTURE_HTTP_PROOF==='1';
const webProof=process.env.GV_COLLECTR_WEB_HTTP_PROOF==='1'||adventureProof||fcaProof||reviewProof;
const setProof=process.env.GV_COLLECTR_SET_HTTP_PROOF==='1';
const nameProof=process.env.GV_COLLECTR_NAME_HTTP_PROOF==='1';
const scopeProof=process.env.GV_COLLECTR_SCOPE_HTTP_PROOF==='1';
const out='C:/grookai_vault_operator_artifacts/'+(namedFinishProof?'collectr_named_finishes_20261002':reviewProof?'collectr_review_choices_20261002':fcaProof?'collectr_fca_20261002':adventureProof?'collectr_adventure_20261001':webProof?'collectr_web_v2_20261001':scopeProof?'collectr_set_scope_20261001':nameProof?'collectr_names_20261001':setProof?'collectr_sets_20260930':'collectr_matching_20260930');
const fixture='C:/grookai_vault_operator_artifacts/collectr_import_review_20260930/full-410',project='collectr-review-full-410-20260930';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('governed MTG import: real Auth, HTTP, RLS, retries and retained-source readback',{
 skip:!webProof&&!scopeProof&&!nameProof&&!setProof&&process.env.GV_COLLECTR_MTG_HTTP_PROOF!=='1',timeout:webProof?240000:120000,
},async t=>{
 assert.equal(root.replaceAll('\\','/'),adventureProof||fcaProof||reviewProof?'C:/gv_collectr_adventure_20261001':webProof?'C:/gv_collectr_web_v2_20261001':scopeProof?'C:/gv_collectr_set_scope_20261001':nameProof?'C:/gv_collectr_names_20261001':setProof?'C:/gv_collectr_sets_20260930':'C:/gv_collectr_matching_20260930');
 const require=createRequire(process.env.GV_COLLECTR_TEST_DEPENDENCIES??path.join(root,'package.json'));
 const pg=require('pg'),{createClient}=require('@supabase/supabase-js');
 const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
 assert.equal(freeze.project,project);assert.equal(Object.keys(freeze.sourceHashes).length,410);
 assert.equal(JSON.parse(fs.readFileSync(fixture+'/replay-result.json')).fullReplay,true);
 assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
 for(const [name,digest] of Object.entries(freeze.sourceHashes)){
  assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+name)),digest);
  assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest);
 }
 assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);
 const docker=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:15000}));
 assert.equal(docker('network','inspect',project)[0].Internal,true);
 assert.deepEqual(Object.keys(docker('inspect','supabase_db_'+project)[0].NetworkSettings.Networks),[project]);
 for(const binding of Object.values(docker('inspect',project+'-relay')[0].NetworkSettings.Ports).flat())assert.equal(binding.HostIp,'127.0.0.1');
 await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(58750,'127.0.0.1',()=>server.close(resolve));});
 const runDir=out+'/http-v2-'+Date.now();fs.mkdirSync(runDir);
 const sourceFiles=['supabase/functions/vault-import-collection-v2/source.ts','supabase/functions/vault-import-collection-v2/handler.ts','supabase/functions/_shared/auth.ts','supabase/functions/_shared/key_resolver.ts','tests/integration/helpers/collectr_import_server_v2.ts', 'tests/integration/collectr_mtg_import_http_v1.test.mjs','supabase/functions/vault-import-collection-v2/mtg_identity.ts'];
 sourceFiles.push('supabase/functions/vault-import-collection-v2/fca_names.ts');
 sourceFiles.push('supabase/functions/vault-import-collection-v2/pokemon_named_finish.ts');
 if(namedFinishProof)sourceFiles.push('tests/integration/helpers/collectr_named_finish_proof.mjs','test/fixtures/collectr_named_finishes_v1.json');
 if(fcaProof)sourceFiles.push('test/fixtures/collectr_fca_names_v1.json');
 if(reviewProof)sourceFiles.push('apps/web/src/lib/import/collectionPreviewChoices.ts','apps/web/src/lib/cards/displayDiscriminator.ts','tests/integration/helpers/collectr_review_choices_proof.mjs');
 if(setProof)sourceFiles.push('test/fixtures/collectr_set_aliases_v1.json');
 if(nameProof)sourceFiles.push('supabase/functions/vault-import-collection-v2/pokemon_name.ts','test/fixtures/collectr_pokemon_name_v1.json');
 if(scopeProof)sourceFiles.push('supabase/functions/vault-import-collection-v2/pokemon_name.ts','supabase/functions/vault-import-collection-v2/set_scope.ts','test/fixtures/collectr_set_scopes_v1.json');
 if(webProof)sourceFiles.push('supabase/functions/vault-import-collection-v2/pokemon_name.ts','supabase/functions/vault-import-collection-v2/set_scope.ts','apps/web/src/app/api/vault/import/route.ts','apps/web/src/lib/import/collectionPreviewV2.ts','apps/web/src/lib/import/collectionReadbackV2.ts','apps/web/src/app/vault/import/CollectionImportClientV2.tsx','apps/web/src/app/vault/import/ImportClient.tsx','apps/web/src/app/vault/import/page.tsx','apps/web/src/lib/collectorStaging.mjs','apps/web/src/lib/collectorRelease.mjs','apps/web/next.config.mjs','tests/integration/helpers/collectr_web_proof.mjs');
 fs.writeFileSync(runDir+'/intent.json',JSON.stringify({scope:'New synthetic accounts and fixtures only; never reset or migrate',project,at:new Date().toISOString(),sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(fs.readFileSync(root+'/'+p))]))}),{flag:'wx'});
 const db=new pg.Client({host:'127.0.0.1',port:58540,user:'postgres',password:'postgres',database:'postgres',statement_timeout:15000});await db.connect();
 const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}));
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),options);
 const caller=createClient(status.API_URL,status.ANON_KEY,options),visitor=createClient(status.API_URL,status.ANON_KEY,options);
 let child,webServer,serverLog='',user,outsider;const checks=[];
 const tables=['vault_collection_import_documents_v2','vault_collection_import_groups_v2','vault_collection_import_receipts_v2','vault_item_instances','vault_items','vault_owners'];
 const snapshot=async()=>{const rows={};for(const table of tables)rows[table]=(await db.query('select * from public.'+table+' snapshot_row order by to_jsonb(snapshot_row)::text')).rows;return rows;};
 let before;
 const releaseControlsBefore=(await db.query('select * from catalog_game_release_controls order by game_code')).rows;
 const setControlsBefore=(await db.query('select * from catalog_set_release_controls order by set_id')).rows;
 try{
  assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(freeze.sourceHashes).sort().map(n=>n.split('_')[0]));
  assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
  assert.equal((await db.query('select count(*)::int runs from cron.job_run_details')).rows[0].runs,0);
  before=await snapshot();fs.writeFileSync(runDir+'/before.private.json',JSON.stringify(before),{flag:'wx'});
  child=spawn('deno',['run','--no-lock','--cached-only','--allow-env','--allow-net=127.0.0.1:58541,127.0.0.1:58750',root+'/tests/integration/helpers/collectr_import_server_v2.ts'],{cwd:root,env:{...process.env,SUPABASE_URL:status.API_URL,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  child.stdout.on('data',b=>serverLog+=b);child.stderr.on('data',b=>serverLog+=b);
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:58750',{method:'OPTIONS'})).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Local handler did not start');
  async function account(client){const email=randomUUID()+'@collectr-fixture.invalid',password=randomUUID();const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);const signed=await client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);return{id:created.data.user.id,token:signed.data.session.access_token,session:signed.data.session};}
  user=await account(caller);outsider=await account(visitor);
  if(webProof){const {startCollectrWebProof}=await import('./helpers/collectr_web_proof.mjs');webServer=await startCollectrWebProof({root,status,runDir});}
  const set=randomUUID(),card=randomUUID(),reverse=randomUUID(),holo=randomUUID(),gvId='GV-PK-COLLECTR-'+card;
  await db.query("insert into sets(id,code,name,game) values($1::uuid,$1::text,'Synthetic import set','pokemon')",[set]);
  await db.query("insert into card_prints(id,set_id,name,number,gv_id,game_id) values($1,$2,'Synthetic import card','65',$3,(select id from games where code='pokemon'))",[card,set,gvId]);
  await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$3,'reverse'),($2,$3,'holo')",[reverse,holo,card]);
  let csvText='Product Name,Category,Set,Card Number,Variance,Grade,Card Condition,Quantity,Average Cost Paid,Portfolio Name,Price Override,Notes\nSynthetic import card,Pokemon,Synthetic import set,065/165,Reverse Holofoil,Ungraded,LP,2,4.25,Private,0,Reverse cost\nSynthetic import card,Pokemon,Synthetic import set,65,Holofoil,Ungraded,NM,1,9,Display,0,Holo cost\nSynthetic import card,Pokemon,Synthetic import set,65,Holofoil,PSA 10,NM,1,99,Slabs,0,Needs cert';
  if(webProof){await db.query('update sets set name=$2 where id=$1',[set,'Synthetic import set '+set]);csvText=csvText.replaceAll('Synthetic import set','Synthetic import set '+set);}
  const targets=[{sourceIndices:[0],cardId:card,gvId,cardPrintingId:reverse},{sourceIndices:[1],cardId:card,gvId,cardPrintingId:holo}];
  const send=(override={},token=user.token)=>{
   const attempt={version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets,fileName:'synthetic.csv',...override};
   return fetch(webProof?'http://127.0.0.1:58863/api/vault/import':'http://127.0.0.1:58750',{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json',Origin:'http://127.0.0.1:58863'},body:JSON.stringify(webProof?{operation:'save',ownerUserId:user.id,attempt}:attempt)});
  };
  const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows;
  const check=async(name,fn)=>t.test(name,async()=>{await fn();checks.push(name);});
  if(webProof)await check('web preview retains exact finishes and held grades; cross-origin saves are rejected',async()=>{
   const endpoint='http://127.0.0.1:58863/api/vault/import';
   const preview=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:'http://127.0.0.1:58863'},body:JSON.stringify({operation:'preview',ownerUserId:user.id,csvText})});
   assert.equal(preview.status,200,await preview.clone().text());const result=await preview.json();assert.equal(result.readyCopies,3);assert.equal(result.reviewRows,1);assert.deepEqual(result.rows.flatMap(r=>r.selection?[r.selection]:[]),targets);
   const denied=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:'https://foreign.invalid'},body:'{}'});assert.equal(denied.status,403);assert.equal((await copies()).length,0);
  });
  await check('invalid authentication and changed account do not write',async()=>{assert.equal((await send({},'invalid')).status,401);assert.equal((await send({},outsider.token)).status,409);assert.equal((await copies()).length,0);});
  const firstRequest=randomUUID();let first,original;
  await check('atomic save keeps separate finishes, prices and all review source',async()=>{
   const response=await send({requestId:firstRequest});assert.equal(response.status,200,await response.clone().text());first=await response.json();assert.equal(first.importedCards,3);assert.equal(first.reviewRows,1);
   original=await copies();assert.equal(original.length,3);assert.equal(original.filter(r=>r.card_printing_id===reverse&&Number(r.acquisition_cost)===4.25&&r.condition_label==='LP').length,2);assert.equal(original.filter(r=>r.card_printing_id===holo&&Number(r.acquisition_cost)===9).length,1);
   const doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',first.sourceSha256).single();assert.equal(doc.error,null);assert.equal(doc.data.source_rows.length,3);assert.equal(doc.data.source_rows[2].Grade,'PSA 10');
  });
  await check('lost response and concurrent retries cannot duplicate copies',async()=>{
   const lost=await send({requestId:firstRequest});await lost.body.cancel();
   const repeated=await send({requestId:firstRequest});assert.deepEqual(await repeated.json(),first);
   const parallel=await Promise.all([send(),send()]);for(const r of parallel){assert.equal(r.status,200);assert.equal((await r.json()).importedCards,0);}assert.deepEqual(await copies(),original);
  });
  await check('receipt cannot be rebound and source grade cannot become raw',async()=>{
   assert.equal((await send({requestId:firstRequest,targets:[]})).status,409);
   assert.equal((await send({targets:[{...targets[1],sourceIndices:[2]}]})).status,400);assert.deepEqual(await copies(),original);
  });
  await check('authenticated independent readback proves copies; visitor cannot read source',async()=>{
   const mine=await caller.from('vault_item_instances').select('id,card_printing_id,acquisition_cost').eq('user_id',user.id).order('id');assert.equal(mine.error,null);assert.deepEqual(mine.data.map(r=>r.id),original.map(r=>r.id));
   for(const table of ['vault_collection_import_documents_v2','vault_collection_import_groups_v2']){const r=await visitor.from(table).select('*');assert.equal(r.error,null);assert.deepEqual(r.data,[]);}
   const denied=await caller.rpc('admin_import_vault_collection_v2',{p_user_id:user.id,p_request_id:randomUUID(),p_source_sha256:first.sourceSha256,p_source_rows:[],p_targets:[]});assert.ok(denied.error);
  });
  await check('reopening the original export never recreates an archived copy',async()=>{
   await db.query('update vault_item_instances set archived_at=now() where user_id=$1 and id=$2',[user.id,original[0].id]);
   const response=await send();assert.equal(response.status,200);assert.equal((await response.json()).importedCards,0);assert.equal((await copies()).length,3);
   const args={p_source_sha256:first.sourceSha256,p_instance_ids:original.map(r=>r.id)};
   const read=await caller.rpc('get_collection_import_copies_v2',args);assert.equal(read.error,null);assert.equal(read.data.length,3);assert.equal(read.data.filter(r=>r.archived_at!==null).length,1);
   const denied=await visitor.rpc('get_collection_import_copies_v2',args);assert.equal(denied.error,null);assert.deepEqual(denied.data,[]);
   const unrelated=await caller.rpc('get_collection_import_copies_v2',{...args,p_source_sha256:'0'.repeat(64)});assert.equal(unrelated.error,null);assert.deepEqual(unrelated.data,[]);
  });
  let mtgSet=randomUUID(),newMtgSet=true,fcaPair;
  const mtgCard=randomUUID(),mtgPrinting=randomUUID(),mtgSource=randomUUID(),identityId=randomUUID();
  if(fcaProof){
   const existing=(await db.query("select s.id,s.name,r.release_version from sets s left join catalog_set_release_controls r on r.set_id=s.id where lower(s.code)='fca'")).rows;
   assert.ok(existing.length<=1,'Never duplicate an FCA set');
   if(existing.length){assert.equal(existing[0].release_version,'COLLECTR_FCA_LOCAL_FIXTURE_V1');assert.equal(existing[0].name,'Synthetic MTG import set '+existing[0].id);mtgSet=existing[0].id;newMtgSet=false;}
   const used=new Set((await db.query('select number from card_prints where set_id=$1',[mtgSet])).rows.map(r=>r.number));
   fcaPair=JSON.parse(fs.readFileSync(root+'/test/fixtures/collectr_fca_names_v1.json')).rows.find(r=>!used.has(r.number));
   assert.ok(fcaPair,'All FCA fixture coordinates are occupied; use a separately qualified lab');
  }
  const mtgCode=fcaProof?'fca':'syn'+mtgSet.replaceAll('-',''),mtgGv='GV-MTG-SYN-'+mtgCard;
  const identityPayload={name:'Synthetic Mage // Synthetic Dragon',set_code:mtgCode,collector_number:'373',scryfall_print_id:mtgSource,language:'en',layout:adventureProof?'adventure':'transform',frame_effects:['extendedart'],border_color:'black'};
  if(fcaProof)Object.assign(identityPayload,{name:fcaPair.canonicalName,collector_number:fcaPair.number,layout:'normal',frame_effects:['inverted'],border_color:'borderless',promo_types:['sourcematerial','universesbeyond']});
  if(newMtgSet)await db.query("insert into sets(id,code,name,game) values($1,$2,'Synthetic MTG import set','mtg')",[mtgSet,mtgCode]);
  await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,variant_key) values($1,$2,$3,$4,$7,$5,(select id from games where code='mtg'),'mtg_eng_paper_print',$6)",[mtgCard,mtgSet,mtgCode,identityPayload.name,mtgGv,'scryfall:'+mtgSource,identityPayload.collector_number]);
  await db.query("insert into card_print_identity(id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active) values($1,$2,'mtg_eng_paper_print',$3,$8,$4,$5,$6,'MTG_ENG_PAPER_PRINT_IDENTITY_V1',$7,true)",[identityId,mtgCard,mtgCode,identityPayload.name.toLowerCase(),identityPayload.name,identityPayload,hash(JSON.stringify(identityPayload)),identityPayload.collector_number]);
  await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'foil')",[mtgPrinting,mtgCard]);
  // Only this new synthetic set becomes visible; preserve the game's rollout.
  if(newMtgSet)await db.query("insert into catalog_set_release_controls(set_id,release_status,release_version,evidence) values($1,'public',$2,'{\"synthetic\":true}')",[mtgSet,fcaProof?'COLLECTR_FCA_LOCAL_FIXTURE_V1':'COLLECTR_MTG_LOCAL_FIXTURE_V1']);
  let mtgCsv='Product Name,Category,Set,Card Number,Variance,Grade,Card Condition,Quantity,Average Cost Paid,Portfolio Name\nSynthetic Mage (Extended Art) (0373),MTG,Synthetic MTG import set,373,Foil,Ungraded,LP,2,12.5,Private\nSynthetic Mage (Surge Foil),MTG,Synthetic MTG import set,373,Foil,Ungraded,NM,1,30,Private\nSynthetic Mage (Extended Art),MTG,Synthetic MTG import set,373,Foil,PSA 10,NM,1,99,Slabs';
  let validSourceName='Synthetic Mage (Extended Art) (0373)',heldSourceName='Synthetic Mage (Surge Foil)';
  if(fcaProof){
   validSourceName=`${fcaPair.alternateName} - ${fcaPair.canonicalName} (Showcase)`;heldSourceName=validSourceName+' (Surge Foil)';
   const records=[['Product Name','Category','Set','Card Number','Variance','Grade','Card Condition','Quantity','Average Cost Paid','Portfolio Name'],[validSourceName,'MTG','Synthetic MTG import set',fcaPair.number,'Foil','Ungraded','LP','2','12.5','Private'],[heldSourceName,'MTG','Synthetic MTG import set',fcaPair.number,'Foil','Ungraded','NM','1','30','Private'],[validSourceName,'MTG','Synthetic MTG import set',fcaPair.number,'Foil','PSA 10','NM','1','99','Slabs']];
   mtgCsv=records.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
  }
  if(webProof){if(newMtgSet)await db.query('update sets set name=$2 where id=$1',[mtgSet,'Synthetic MTG import set '+mtgSet]);mtgCsv=mtgCsv.replaceAll('Synthetic MTG import set','Synthetic MTG import set '+mtgSet);}
  const mtgTargets=[{sourceIndices:[0],cardId:mtgCard,gvId:mtgGv,cardPrintingId:mtgPrinting}];
  let mtgResult,mtgCopies;
  await check('governed art and front-face matching saves exact copies and retains held source',async()=>{
   const response=await send({csvText:mtgCsv,targets:mtgTargets});assert.equal(response.status,200,await response.clone().text());mtgResult=await response.json();assert.equal(mtgResult.importedCards,2);assert.equal(mtgResult.reviewRows,2);
   mtgCopies=(await copies()).filter(c=>c.card_print_id===mtgCard);assert.equal(mtgCopies.length,2);for(const c of mtgCopies){assert.equal(c.card_printing_id,mtgPrinting);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),12.5);}
   const read=await caller.rpc('get_collection_import_copies_v2',{p_source_sha256:mtgResult.sourceSha256,p_instance_ids:mtgCopies.map(c=>c.id)});assert.equal(read.error,null);assert.deepEqual(read.data.map(c=>c.id).sort(),mtgCopies.map(c=>c.id).sort());
   const doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',mtgResult.sourceSha256).single();assert.equal(doc.error,null);assert.equal(doc.data.source_rows[0]['Product Name'],validSourceName);assert.equal(doc.data.source_rows[1]['Product Name'],heldSourceName);assert.equal(doc.data.source_rows[2].Grade,'PSA 10');
  });
  await check('unsupported artwork and grades cannot bypass server matching',async()=>{
   for(const index of [1,2]){const response=await send({csvText:mtgCsv,targets:[{...mtgTargets[0],sourceIndices:[index]}]});assert.equal(response.status,400);}
   assert.deepEqual((await copies()).filter(c=>c.card_print_id===mtgCard),mtgCopies);
  });
  await check('governed MTG repeated import retains original exact copy IDs',async()=>{
   const response=await send({csvText:mtgCsv,targets:mtgTargets});assert.equal(response.status,200);assert.equal((await response.json()).importedCards,0);assert.deepEqual((await copies()).filter(c=>c.card_print_id===mtgCard),mtgCopies);
  });
  const scopeVisibleSets=[];
  if(setProof||nameProof||scopeProof)await check('set or name formatting saves original labels and exact children, retries without duplicates and retains grades',async()=>{
   const aliases=scopeProof ? JSON.parse(fs.readFileSync(root+'/test/fixtures/collectr_set_scopes_v1.json')).flatMap(s=>s.catalog.map(catalog=>({...s,catalog,number:s.numberPrefix?'RC7':'7',sourceCard:s.source.startsWith('SM Trainer Kit')?'Synthetic alias card (#7)':'Synthetic alias card'}))) : nameProof ? [
    {source:'Synthetic Name EX Set',catalog:'Synthetic Name EX Set',sourceCard:'Synthetic Name EX (007)',catalogCard:'Synthetic Name-EX'},
    {source:'Synthetic Name GX Set',catalog:'Synthetic Name GX Set',sourceCard:'Synthetic Name GX',catalogCard:'Synthetic Name-GX'},
    {source:'Synthetic Name Number Set',catalog:'Synthetic Name Number Set',sourceCard:'Synthetic Name (7)',catalogCard:'Synthetic Name'},
   ] : JSON.parse(fs.readFileSync(root+'/test/fixtures/collectr_set_aliases_v1.json'));
   const source=[],selections=[];
   for(const [index,alias] of aliases.entries()){
    const setId=randomUUID(),cardId=randomUUID(),childId=randomUUID(),gv='GV-ALIAS-SYN-'+cardId;
    const game=alias.game??'pokemon',number=alias.number??'7';
    await db.query("insert into sets(id,code,name,game) values($1,$2,$3,$4)",[setId,'syn-'+setId,alias.catalog,game]);
    await db.query("insert into card_prints(id,set_id,name,number,gv_id,game_id,identity_domain) values($1,$2,$4,$5,$3,(select id from games where code=$6),$7)",[cardId,setId,gv,alias.catalogCard??'Synthetic alias card',number,game,game==='mtg'?'mtg_eng_paper_print':'pokemon_eng_standard']);
    if(game==='mtg'){
     await db.query("insert into catalog_set_release_controls(set_id,release_status,release_version,evidence) values($1,'public','COLLECTR_SCOPE_LOCAL_FIXTURE_V1','{\"synthetic\":true}')",[setId]);
     scopeVisibleSets.push(setId);
    }
    await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'reverse')",[childId,cardId]);
    source.push({'Product Name':alias.sourceCard??'Synthetic alias card',Category:game,Set:alias.source,'Card Number':scopeProof?number:'007/100',Variance:'Reverse Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25'});
    selections.push({sourceIndices:[index],cardId,gvId:gv,cardPrintingId:childId});
   }
   source.push({...source[0],Grade:'PSA 10',Quantity:'1'});
   const headers=Object.keys(source[0]),quote=v=>'"'+v.replaceAll('"','""')+'"';
   const aliasCsv=[headers,...source.map(r=>headers.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\n');
   const response=await send({csvText:aliasCsv,targets:selections});assert.equal(response.status,200,await response.clone().text());const result=await response.json();
   assert.equal(result.importedCards,aliases.length*2);assert.equal(result.reviewRows,1);
   const exact=(await copies()).filter(c=>selections.some(s=>s.cardId===c.card_print_id));
   for(const selection of selections){const matched=exact.filter(c=>c.card_print_id===selection.cardId);assert.equal(matched.length,2);for(const c of matched){assert.equal(c.card_printing_id,selection.cardPrintingId);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),4.25);}}
   const doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',result.sourceSha256).single();assert.equal(doc.error,null);assert.deepEqual(doc.data.source_rows,source);
   const read=await caller.rpc('get_collection_import_copies_v2',{p_source_sha256:result.sourceSha256,p_instance_ids:exact.map(c=>c.id)});assert.equal(read.error,null);assert.deepEqual(read.data.map(c=>c.id).sort(),exact.map(c=>c.id).sort());
   const repeated=await send({csvText:aliasCsv,targets:selections});assert.equal(repeated.status,200);assert.equal((await repeated.json()).importedCards,0);
   assert.deepEqual((await copies()).filter(c=>selections.some(s=>s.cardId===c.card_print_id)),exact);
   const denied=await send({csvText:aliasCsv,targets:[{...selections[0],sourceIndices:[aliases.length]}]});assert.equal(denied.status,400);
   assert.deepEqual((await copies()).filter(c=>selections.some(s=>s.cardId===c.card_print_id)),exact);
  });
  if(reviewProof)await check('explicit review choices preserve metadata, freeze retries and recover a confirmed conflict',async()=>{
   const {proveCollectrReviewChoices}=await import('./helpers/collectr_review_choices_proof.mjs');
   await proveCollectrReviewChoices({root,status,runDir,user,db,caller});
  });
  if(namedFinishProof)await check('named finishes retain exact special children and reject ordinary holo substitutions',async()=>{
   const {proveCollectrNamedFinishes}=await import('./helpers/collectr_named_finish_proof.mjs');
   await proveCollectrNamedFinishes({root,status,runDir,user,db,caller});
  });
  if(webProof)await check('browser CSV preview, interrupted save, reload and retry verify the same copies',async()=>{
   const {proveCollectrBrowser}=await import('./helpers/collectr_web_proof.mjs');
   const previous=await copies();await proveCollectrBrowser({root,status,runDir,user,csvText:mtgCsv});assert.deepEqual(await copies(),previous);
  });
  const after=await snapshot();for(const table of tables)assert.deepEqual(after[table].filter(r=>r.user_id!==user.id&&r.user_id!==outsider.id),before[table]);
  assert.deepEqual((await db.query('select * from catalog_game_release_controls order by game_code')).rows,releaseControlsBefore);
  assert.deepEqual((await db.query('select * from catalog_set_release_controls where ($1::uuid is null or set_id<>$1) and not(set_id=any($2::uuid[])) order by set_id',[newMtgSet?mtgSet:null,scopeVisibleSets])).rows,setControlsBefore);
  const result={status:checks.length===((setProof||nameProof||scopeProof?10:9)+(webProof?2:0)+(reviewProof?1:0)+(namedFinishProof?1:0))?'passed':'failed',at:new Date().toISOString(),checks,project,productionWrites:0,priorRowsUnchanged:true,runDir};
  fs.writeFileSync(runDir+'/result.json',JSON.stringify(result,null,2),{flag:'wx'});assert.equal(result.status,'passed');
 }finally{
  if(webServer)await webServer.stop();
  if(child){child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});}
  fs.writeFileSync(runDir+'/server.private.log',serverLog,{flag:'wx'});await db.end();
  await caller.auth.signOut({scope:'local'});await visitor.auth.signOut({scope:'local'});
 }
});
