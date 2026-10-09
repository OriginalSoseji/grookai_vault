// Additive synthetic records in the dedicated export lab. Never changes an old lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_inventory_export_20261008',base='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008';
const lab=base+'/release-full-438-v1',project='inv-rel-full-438-v1-20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const [mode,provided]=process.argv.slice(2);assert.ok(['prepare','verify','restore'].includes(mode));assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/release-ui-'+Date.now():provided;assert.match(run,new RegExp('^'+base+'/release-ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(n,a)=>execFileSync(n,a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:32*1024*1024});
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.equal(read(lab+'/replay-result.json').status,'passed');
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest,name);
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:36021');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const port of [36020,36021])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:36020/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(s,a=[])=>(await db.query(s,a)).rows;
const save=(name,value,exclusive=true)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});
async function fingerprints(table){assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);return Object.fromEntries((await q('select md5(to_jsonb(t)::text) hash,count(*)::int n from '+table+' t group by 1')).map(r=>[r.hash,r.n]));}
async function retain(f){const before=read(run+'/before.private.json');for(const [table,hashes]of Object.entries(before)){const after=await fingerprints(table);for(const[h,n]of Object.entries(hashes))assert.ok((after[h]??0)>=n,'Prior row changed: '+table);}
 assert.equal((await q('select count(*)::int n from public_profiles where user_id=any($1::uuid[])',[f.users.map(u=>u.id)]))[0].n,0);
 assert.equal((await q('select count(*)::int n from market_price_current_publication'))[0].n,0);return {priorTables:Object.keys(before).length,profileRowsCreated:0};}
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);
 if(mode==='prepare'){
  assert.ok(Date.now()-Date.parse(read(base+'/RELEASE_BASELINE_429.json').at)<7200000);fs.mkdirSync(run);
  const tables=(await q("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) order by 1")).map(r=>r.name);
  const before={};for(const t of tables)before[t]=await fingerprints(t);save('before.private.json',before);
  const f={state:'preparing',project,users:[],set:randomUUID(),card:randomUUID(),printing:randomUUID(),cert:randomUUID(),family:randomUUID(),variant:randomUUID(),section:randomUUID(),inactiveSection:randomUUID(),copies:[],at:new Date().toISOString(),globalControlsChanged:false};save('fixture.private.json',f);
  const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  for(let i=0;i<4;i++){const email=randomUUID()+'@inventory-export.invalid',password=randomUUID()+'Aa9!';const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);f.users.push({id:made.data.user.id,email,password});save('fixture.private.json',f,false);}
  await q('begin');try{
   await q("insert into sets(id,code,name,game) values($1,$2,'Export proof set','pokemon')",[f.set,'export-'+f.set]);
   await q("insert into card_prints(id,game_id,set_id,set_code,name,number,gv_id,image_status,identity_domain) values($1,(select id from games where code='pokemon'),$2,$3,'Export proof card','065',$4,'missing','pokemon_eng_standard')",[f.card,f.set,'export-'+f.set,'GV-PK-EXPORT-'+f.card]);
   await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,'normal',$3,false)",[f.printing,f.card,'GV-PK-EXPORT-'+f.card+'-NORMAL']);
   await q("insert into slab_certs(id,grader,cert_number,card_print_id,grade,subgrades,label_metadata) values($1,'PSA','0012300456',$2,10.00,'{\"centering\":9.99999999999999999999}','{\"edition\":\"proof\",\"numeric\":9007199254740993}')",[f.cert,f.card]);
   await q("insert into sealed_product_families(id,game_key,family_key,canonical_name,manufacturer_name,identity_contract_version,identity_fingerprint) values($1,'pokemon',$2,'Export sealed family','Synthetic','v1',$3)",[f.family,'export-'+f.family,createHash('sha256').update(f.family).digest('hex')]);
   await q("insert into sealed_product_variants(id,family_id,variant_key,canonical_name,package_form,language_code,upc,explicit_contents,identity_contract_version,identity_fingerprint) values($1,$2,'proof','Export proof box','booster_box','en','001234500067','[{\"packs\":36,\"exact\":0.00000000000000000001}]','v1',$3)",[f.variant,f.family,createHash('sha256').update(f.variant).digest('hex')]);
   const specs=[{kind:'card',cost:'0.00000000000000000001',currency:null,notes:'  Original, "quoted"\n=literal field  '},{kind:'slab',cost:'9999999999.9900000001',currency:'CAD',notes:'=SUM(A1:A9)'},{kind:'sealed',cost:'0',currency:'USD',notes:'Sealed private note'},{kind:'legacy',cost:null,currency:null,notes:'Legacy grade without certificate'},{kind:'archived',cost:'45.00',currency:'USD',notes:'Archived excluded'}];
   for(const s of specs){const id=randomUUID(),owner=f.users[0].id;
    const sealed=s.kind==='sealed',slab=s.kind==='slab',legacy=s.kind==='legacy';
    // Explicit synthetic identifiers avoid consuming or rewriting any prior owner sequence.
    await q(`insert into vault_item_instances(id,user_id,gv_vi_id,card_print_id,card_printing_id,slab_cert_id,sealed_product_variant_id,is_graded,grade_company,grade_value,condition_label,acquisition_cost,acquisition_currency,notes,seal_state,package_condition,archived_at)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,case when $17 then clock_timestamp() else null end)`,
     [id,owner,'GVVI-EXPORT-'+id.toUpperCase(),sealed||slab?null:f.card,sealed||slab?null:f.printing,slab?f.cert:null,sealed?f.variant:null,slab||legacy,legacy?'Legacy grader':null,legacy?'9.5':null,sealed?null:'NM',s.cost,s.currency,s.notes,sealed?'factory_sealed':null,sealed?'undamaged':null,s.kind==='archived']);f.copies.push({id,...s});
   }
   await q("update vault_item_instances set pricing_mode='asking',asking_price_amount=12.3400000000000001,asking_price_currency='USD',asking_price_note='Private asking note' where id=$1",[f.copies[0].id]);
   for(const[id,active]of [[f.section,true],[f.inactiveSection,false]]){await q("insert into wall_sections(id,user_id,name,position,is_public,is_active) values($1,$2,$3,2,false,$4)",[id,f.users[0].id,active?'Private export section':'Inactive excluded',active]);await q('insert into wall_section_memberships(section_id,vault_item_instance_id) values($1,$2)',[id,f.copies[0].id]);}
   await q('commit');
  }catch(error){await q('rollback');throw error;}
  f.state='prepared';save('fixture.private.json',f,false);
  save('defines.private.json',{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,INVENTORY_TEST_EMAIL:f.users[0].email,INVENTORY_TEST_PASSWORD:f.users[0].password,INVENTORY_OTHER_EMAIL:f.users[1].email,INVENTORY_OTHER_PASSWORD:f.users[1].password,GROOKAI_WEB_BASE_URL:'http://127.0.0.1:35971'});
  save('prepared.json',{status:'passed',at:new Date().toISOString(),...await retain(f),users:4,activeCopies:4,archivedCopies:1,globalControlsChanged:false,productionWrites:0});
  fs.writeFileSync(base+'/release-fixture-current.json',JSON.stringify({run},null,2));console.log(JSON.stringify({status:'passed',run}));
 }else{const f=read(run+'/fixture.private.json');assert.equal(f.project,project);assert.equal(f.state,'prepared');const kept=await retain(f);save(mode+'-'+Date.now()+'.json',{status:'passed',at:new Date().toISOString(),...kept,productionWrites:0,globalControlsChanged:false});if(mode==='restore'){f.state='restored';save('fixture.private.json',f,false);}console.log(JSON.stringify({status:'passed',run,mode,...kept}));}
}catch(error){if(fs.existsSync(run))save('failure-'+Date.now()+'.json',{message:error.message,stack:error.stack});throw error;}finally{await db.end();}
