// Current422 rollback-only proof: release cannot reassign an existing saved copy.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import pg from 'pg';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',project='jungle-edition-full-422-v25-20261001';
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const prior=JSON.parse(fs.readFileSync(base+'/release-gate-v26/receipt.json'));assert.equal(prior.status,'committed_concurrency_and_browser_proof_passed');
const freeze=JSON.parse(fs.readFileSync(base+'/full-422-v25/freeze.json'));for(const [n,h]of Object.entries(freeze.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync('supabase/migrations/'+n)).digest('hex'),h,n);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:20000});const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const c=new pg.Client({host:'127.0.0.1',port:53200,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:10000,statement_timeout:90000});await c.connect();const q=async(s,a)=>(await c.query(s,a)).rows;
const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from vault_item_instances) copies"))[0];assert.deepEqual(state,{address:db.NetworkSettings.Networks[project].IPAddress,workers:'0',migrations:422,copies:7});
const out=base+'/saved-copy-preservation-v1-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});fs.copyFileSync(new URL(import.meta.url),out+'/test-source.mjs');
const tables=await q("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname");for(const t of tables)assert.match(t.relname,/^[a-z_][a-z0-9_]*$/);
const footprint=tables.map(({relname:t})=>`select '${t}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${t}" t`).join(' union all ')+' order by table_name';
const before=await q(footprint),ledger=await q('select * from supabase_migrations.schema_migrations order by version');save('before-footprints.json',before);save('intent.json',{at:new Date().toISOString(),project,rollbackOnly:true,productionWrites:0});
const ids=Object.fromEntries(['owner','legacy','first','unlimited','legacyChild','firstChild','unlimitedChild','anchor'].map(k=>[k,randomUUID()])),checks=[];const pass=n=>checks.push(n);
try{
 await c.query('begin');
 const set=(await q("select id from sets where code='base2'"))[0].id;
 await c.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[ids.owner,ids.owner+'@saved-copy-proof.invalid']);
 for(const [k,gv,modifier]of [['legacy','GV-PK-JU-2',null],['first','GV-PK-JU-2-FIRST-EDITION','edition:first_edition'],['unlimited','GV-PK-JU-2-UNLIMITED','edition:unlimited']]){
  await c.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,set_identity_model,variant_key,printed_identity_modifier) select $1,$2,'base2','Kangaskhan','2',$3,id,'pokemon_eng_standard','standard','',$4 from games where code='pokemon'",[ids[k],set,gv,modifier]);
  await c.query("insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,'holo',$3,false)",[ids[k+'Child'],ids[k],gv+'-HOLO']);
 }
 await c.query("insert into vault_items(id,user_id,card_id,gv_id,qty,name,condition_label) values($1,$2,$3,'GV-PK-JU-2',2,'Kangaskhan','NM')",[ids.anchor,ids.owner,ids.legacy]);
 for(let i=0;i<2;i++)await c.query('select admin_vault_instance_create_v1(p_user_id=>$1,p_card_print_id=>$2,p_card_printing_id=>$3,p_legacy_vault_item_id=>$4)',[ids.owner,ids.legacy,ids.legacyChild,ids.anchor]);
 const saved=await q('select to_jsonb(t) row from vault_item_instances t where user_id=$1 order by id',[ids.owner]);
 const manifest='c'.repeat(64);
 for(const [k,edition]of [['first','first_edition'],['unlimited','unlimited']]){
  await c.query("update card_printings set provenance_source='MASTER_INDEX_ADDITIVE_PRINTING_REPAIR_V1',provenance_ref=$2 where id=$1",[ids[k+'Child'],'master-index:'+manifest]);
  await c.query("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason,expected_finish_keys,source_report_path,evidence) values($1,'verified','visible','synthetic saved copy preservation',array['holo'],$2,$3)",[ids[k+'Child'],'master-index:'+manifest,{manifest_fingerprint:manifest,card_print_id:ids[k],finish_key:'holo',review_sha256:'d'.repeat(64)}]);
  await c.query("insert into jungle_edition_identity_links_v1(legacy_card_print_id,card_print_id,card_printing_id,edition,finish_key,state,manifest_sha256,review_ref) values($1,$2,$3,$4,'holo','active',$5,'synthetic-preservation')",[ids.legacy,ids[k],ids[k+'Child'],edition,manifest]);
 }
 assert.deepEqual(await q('select to_jsonb(t) row from vault_item_instances t where user_id=$1 order by id',[ids.owner]),saved);pass('Activating the reviewed pair preserves existing copy bytes');
 const reject=async(name,role,statement,args,pattern)=>{await c.query('savepoint rejected');let error;try{await c.query('set local role '+role);await c.query(statement,args);}catch(e){error=e;}await c.query('rollback to savepoint rejected');assert.ok(error,name);assert.match(error.message,pattern);pass(name);};
 await c.query("select set_config('request.jwt.claim.sub',$1,true)",[ids.owner]);await c.query('set local role authenticated');assert.equal((await q('select count(*)::int n from vault_item_instances where user_id=$1',[ids.owner]))[0].n,2);await c.query('reset role');pass('Owner can still read both unresolved saved copies');
 for(const role of ['service_role','postgres']){
  await reject(role+' cannot change saved copy edition',role,'update vault_item_instances set card_print_id=$1,card_printing_id=$2 where user_id=$3',[ids.first,ids.firstChild,ids.owner],/OWNED_RESOLUTION_REQUIRED/);
  await reject(role+' cannot change saved anchor edition',role,'update vault_items set card_id=$1 where id=$2',[ids.first,ids.anchor],/OWNED_RESOLUTION_REQUIRED/);
  await reject(role+' cannot increase ambiguous quantity',role,'update vault_items set qty=3 where id=$1',[ids.anchor],/JUNGLE_EDITION_REQUIRED/);
 }
 await reject('New ambiguous intake stays blocked','service_role','select admin_vault_instance_create_v1(p_user_id=>$1,p_card_print_id=>$2,p_card_printing_id=>$3)',[ids.owner,ids.legacy,ids.legacyChild],/JUNGLE_EDITION_REQUIRED/);
 await c.query("update vault_item_instances set notes='owner metadata edit' where user_id=$1",[ids.owner]);assert.equal((await q("select count(*)::int n from vault_item_instances where user_id=$1 and notes='owner metadata edit'",[ids.owner]))[0].n,2);pass('Metadata remains editable without identity changes');
 await c.query('update vault_item_instances set archived_at=now() where user_id=$1',[ids.owner]);assert.equal((await q('select count(*)::int n from vault_item_instances where user_id=$1 and archived_at is not null',[ids.owner]))[0].n,2);pass('Existing copies remain archivable');
 await c.query('rollback');assert.deepEqual(await q(footprint),before);assert.deepEqual(await q('select * from supabase_migrations.schema_migrations order by version'),ledger);pass('Rollback preserves every existing public table and migration ledger');
 const receipt={at:new Date().toISOString(),status:'passed',checks,checkCount:checks.length,protectedTables:tables.length,retainedCopies:7,rollbackProven:true,productionWrites:0,correctionWriterImplemented:false,scope:'Preserve saved identities and hold reassignment during pricing release'};save('receipt.json',receipt);console.log(JSON.stringify({...receipt,out}));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message});assert.deepEqual(await q(footprint),before);throw e;}finally{await c.end();}
