// Transaction-only draft proof. Fixed isolated 404 lab; all DDL and fixtures roll back.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {root,hash,hashes,sql,docker,container,project,relay} from './store_team_lab_v1.mjs';
const migration='20260927143000_vendor_store_team_workflows_v1.sql';
const frozen=path.join(root,'.local/integration/store-team-hardening-replay-v1');
export function baselineGuard(){
 assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_production_20260926');
 const plan=JSON.parse(fs.readFileSync(path.join(frozen,'intent.json')));
 assert.equal(plan.project,project);assert.equal(Object.keys(plan.sourceHashes).length,404);
 assert.deepEqual(hashes(path.join(frozen,'supabase/migrations')),plan.sourceHashes);
 const source=hashes(path.join(root,'supabase/migrations'));assert.equal(Object.keys(source).length,405);
 for(const [name,value] of Object.entries(plan.sourceHashes))assert.equal(source[name],value);
 assert.ok(source[migration]);
 const db=JSON.parse(docker('inspect',container))[0],bridge=JSON.parse(docker('inspect',relay))[0];
 assert.equal(db.State.Running,true);assert.equal(db.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
 assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
 for(const port of [29421,29422,29424])assert.deepEqual(bridge.NetworkSettings.Ports[`${port}/tcp`],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
 assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(plan.sourceHashes).map(n=>n.split('_')[0]).sort());
 assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from card_prints)||'|'||(select count(*) from sealed_product_variants)||'|'||(select count(*) from cron.job_run_details)"),'0|0|0|0|0');
 assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
 return source;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\//,''))){
 assert.equal(process.argv.length,2);baselineGuard();
 const require=createRequire('C:/gv_store_billing_20260919/package.json'),{Client}=require('pg');
 const db=new Client({host:'127.0.0.1',port:29422,user:'postgres',password:'postgres',database:'postgres'});await db.connect();
 const q=(text,args=[])=>db.query(text,args),[owner,manager,foreign]=Array.from({length:3},()=>randomUUID());
 const ids=Object.fromEntries(['store','set','card','printing','wrong','section','privateSection','privateCopy'].map(k=>[k,randomUUID()]));
 const checks=[];const check=async(name,work)=>{await work();checks.push(name);console.log('PASS '+name);};
 const run=async(user,text,args=[])=>{await q('savepoint actor');try{await q('set local role authenticated');await q("select set_config('request.jwt.claim.sub',$1,true)",[user]);const result=await q(text,args);await q('reset role');await q('release savepoint actor');return result.rows[0]?.v;}catch(e){await q('rollback to savepoint actor');await q('release savepoint actor');throw e;}};
 const deny=work=>assert.rejects(work,e=>e.code==='42501');
 const grant=permissions=>run(owner,"select vendor_store_team_change_v1('permissions',null,$1,$2) v",[manager,permissions]);
 const add=(data,request=randomUUID(),actor=manager)=>run(actor,'select vendor_store_team_add_card_v1($1,$2,$3) v',[ids.store,request,data]);
 const sections=(action,data,section=null,expected=null,request=randomUUID(),actor=manager)=>run(actor,'select vendor_store_team_section_v1($1,$2,$3,$4,$5,$6) v',[ids.store,action,request,section,expected,data]);
 const product=(id,version,action,data={},request=randomUUID(),actor=manager)=>run(actor,'select vendor_store_team_product_v1($1,$2,$3,$4,$5,$6) v',[ids.store,request,id,version,action,data]);
 let report;
 try{
  await q(fs.readFileSync(path.join(root,'supabase/migrations',migration),'utf8').replace(/commit;\s*$/i,''));
  for(const id of [owner,manager,foreign])await q("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",[id,`${id}@example.invalid`]);
  await q("insert into user_entitlements(user_id,tier,role,features,source) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}','manual')",[owner]);
  await q("insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,'Workflow fixture')",[ids.store,owner,`test-${owner}`]);
  await q("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Owner',true,true) on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true",[owner,`owner-${owner}`]);
  await q("insert into vendor_store_team_members(store_id,user_id,permissions) values($1,$2,array['pricing'])",[ids.store,manager]);
  await q('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');await q('update vendor_store_team_control set enabled=true');
  await check('disabled by default and retained existing grants',async()=>{
   await deny(grant(['intake']));await deny(add({}));
   assert.deepEqual((await run(manager,'select vendor_store_team_workspace_v1($1) v',[ids.store])).permissions,['pricing']);
   assert.equal((await run(owner,'select vendor_store_team_owner_v1() v')).workflows_enabled,false);
  });
  await q('update vendor_store_team_workflow_control set enabled=true');
  const code=`workflow${Date.now()}`,gv=`GV-PK-${code.toUpperCase()}-001`;
  await q("insert into sets(id,code,name,game) values($1,$2,'Workflow set','pokemon')",[ids.set,code]);
  await q("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Workflow Pikachu','001',$3,$4,'missing')",[ids.card,ids.set,code,gv]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal',$3)",[ids.printing,ids.card,gv+'-NORMAL']);
  const data={card_id:ids.card,printing_id:ids.printing,condition:'NM',amount:null,currency:'USD',listed:false,sections:[]};
  let copy;
  await check('intake creates one owner copy, explicit unlisted draft, idempotent retry',async()=>{
   await grant(['intake']);const request=randomUUID();copy=await add(data,request);assert.deepEqual(await add(data,request),copy);
   assert.equal((await q('select count(*) from vault_item_instances where user_id=$1',[owner])).rows[0].count,'1');
   assert.equal((await q('select count(*) from vendor_store_items where store_id=$1',[ids.store])).rows[0].count,'0');
   assert.equal((await q('select actor_id from vendor_store_team_events where action=$1',['add_card'])).rows[0].actor_id,manager);
   await assert.rejects(add({...data,condition:'LP'},request),e=>e.code==='PT409');
   await deny(add({...data,amount:20}));await deny(add({...data,listed:true}));await deny(add(data,randomUUID(),foreign));
  });
  await check('wrong, quarantined and unreleased printings denied without partial copies',async()=>{
   const before=(await q('select count(*) from vault_item_instances')).rows[0].count;
   await assert.rejects(add({...data,printing_id:ids.wrong}),e=>e.code==='22023');
   await q("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Test')",[ids.printing]);
   await assert.rejects(add(data),e=>e.code==='22023');await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);
   assert.equal((await q('select count(*) from vault_item_instances')).rows[0].count,before);
  });
  let section;
  await check('selected store sections only; assignment needs permission and does not list',async()=>{
   await q("insert into wall_sections(id,user_id,name,position) values($1,$2,'Private section',0)",[ids.privateSection,owner]);
   await deny(sections('create',{name:'New store section'}));await grant(['intake','sections']);
   section=(await sections('create',{name:'New store section'})).sections[0];assert.equal(section.name,'New store section');
   const context=await run(manager,'select vendor_store_team_workflows_v1($1) v',[ids.store]);assert.equal(context.sections.length,1);
   const stamp=(await q('select updated_at::text v from vault_item_instances where id=$1',[copy.id])).rows[0].v;
   await sections('assign',{instance_id:copy.id,included:true},section.id,stamp);
   await assert.rejects(sections('assign',{instance_id:copy.id,included:false},section.id,'2000-01-01T00:00:00Z'),e=>e.code==='PT409');
   await deny(sections('rename',{name:'Forged'},ids.privateSection,section.updated_at));
   assert.equal((await q('select count(*) from vendor_store_items')).rows[0].count,'0');
   await sections('rename',{name:'Renamed'},section.id,section.updated_at);
   await assert.rejects(sections('rename',{name:'Stale'},section.id,'2000-01-01T00:00:00Z'),e=>e.code==='PT409');
  });
  await check('atomic initial pricing, section assignment and explicit listing',async()=>{
   await grant(['intake','pricing','listings','sections']);
   const listed=await add({...data,amount:20,listed:true,sections:[section.id]});assert.notEqual(copy.id,listed.id);
   assert.equal((await q('select count(*) from vendor_store_items where instance_id=$1',[listed.id])).rows[0].count,'1');
   await q('update public_profiles set vault_sharing_enabled=false where user_id=$1',[owner]);
   const before=(await q('select count(*) from vault_item_instances')).rows[0].count;
   await assert.rejects(add({...data,amount:20,listed:true}),e=>e.code==='22023');
   assert.equal((await q('select count(*) from vault_item_instances')).rows[0].count,before);
   await q('update public_profiles set vault_sharing_enabled=true where user_id=$1',[owner]);
  });
  await check('custom drafts, permission separation, idempotency, stale updates and media scope',async()=>{
   await deny(product(null,null,'save',{title:'Draft'}));await grant(['custom']);
   const request=randomUUID(),input={title:'Draft',description:'Business product',available_quantity:2};
   let p=(await product(null,null,'save',input,request)).products[0];assert.equal(p.published,false);
   assert.equal((await product(null,null,'save',input,request)).products[0].id,p.id);
   await deny(product(p.id,p.version,'save',{asking_price_amount:12}));await deny(product(p.id,p.version,'publish'));
   await deny(product(p.id,p.version,'sections',{section_ids:[section.id]}));
   await assert.rejects(product(p.id,p.version-1,'save',{title:'Old'}),e=>e.code==='PT409');
   await assert.rejects(product(p.id,p.version,'archive'),e=>e.code==='22023');
   const photo=`${ids.store}/products/${p.id}/${randomUUID()}.png`;
   await q("insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",[photo]);
   await deny(product(p.id,p.version,'photos',{paths:[`${ids.store}/products/${ids.wrong}/${randomUUID()}.png`]}));
   p=(await product(p.id,p.version,'photos',{paths:[photo]})).products[0];
   await grant(['custom','pricing','listings','sections']);p=(await product(p.id,p.version,'save',{asking_price_amount:12})).products[0];
   p=(await product(p.id,p.version,'sections',{section_ids:[section.id]})).products[0];
   p=(await product(p.id,p.version,'publish')).products[0];assert.equal(p.published,true);
   await deny(run(foreign,'select vendor_store_team_products_v1($1) v',[ids.store]));
   await deny(run(manager,"insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",[`${ids.store}/products/${p.id}/${randomUUID()}.png`]));
   await deny(run(manager,'select vendor_store_team_product_media_v1($1,$2,false,$3)',[ids.store,p.id,photo+'forged']));
   for(let i=0;i<20;i++)await run(manager,'select vendor_store_team_product_media_v1($1,$2,true) v',[ids.store,p.id]);
   await assert.rejects(run(manager,'select vendor_store_team_product_media_v1($1,$2,true)',[ids.store,p.id]),e=>e.code==='22023');
  });
  await check('private tables and helpers inaccessible; rollback, entitlement loss and revocation fail closed',async()=>{
   for(const table of ['vendor_store_team_requests','vendor_store_team_workflow_control'])await deny(run(manager,`select * from ${table}`));
   await deny(run(manager,"select vendor_store_team_workflow_access_v1($1,'custom')",[ids.store]));
   await q('update vendor_store_team_workflow_control set enabled=false');await deny(run(manager,'select vendor_store_team_products_v1($1)',[ids.store]));
   await q('update vendor_store_team_workflow_control set enabled=true');await q('update user_entitlements set is_active=false where user_id=$1',[owner]);await deny(run(manager,'select vendor_store_team_products_v1($1)',[ids.store]));
   await q('update user_entitlements set is_active=true where user_id=$1',[owner]);await run(owner,"select vendor_store_team_change_v1('revoke',null,$1)",[manager]);await deny(run(manager,'select vendor_store_team_products_v1($1)',[ids.store]));
  });
  report={at:new Date().toISOString(),status:'passed',checks,migrationSha256:hash(fs.readFileSync(path.join(root,'supabase/migrations',migration))),productionWrites:0,transactionRolledBack:true};
 }finally{await q('rollback');await db.end();baselineGuard();}
 const dir=path.join(root,'.local/integration/store-team-workflows-v1');fs.writeFileSync(path.join(dir,`draft-${Date.now()}.json`),JSON.stringify(report,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'passed',checks:checks.length}));
}
