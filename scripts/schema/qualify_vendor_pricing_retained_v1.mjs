import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
// New task-owned retained493 lab ->494. No remote command, reset or history repair.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync,spawnSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import {createClient} from '@supabase/supabase-js';
const root='C:/grookai_vendor_rules_20261112',lab='C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/retained-493',project='vendor-pricing-retained-493-20261112',container='supabase_db_'+project;
const migration='20261112180000_vendor_pricing_rules_v1.sql',sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-result.json')).pass,true);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
assert.equal(fs.existsSync(lab+'/upgrade-intent.json'),false,'Upgrade intent is single-use; retain uncertain attempts');
const freeze=JSON.parse(fs.readFileSync(lab+'/freeze.json'));
for(const [file,pin] of Object.entries(freeze.sources))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const pin=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/fresh-494/freeze.json')).sources[migration];assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+migration)),pin);
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));assert.equal(cfg.API_URL,'http://127.0.0.1:62441');
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:120000,maxBuffer:64000000,windowsHide:true}).trim();
assert.equal(sql("select (select count(*) from supabase_migrations.schema_migrations)||':'||current_setting('max_worker_processes')"),'493:0');
const file=lab+'/runtime-fixture.private.json',fixture=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};const save=()=>fs.writeFileSync(file,JSON.stringify(fixture,null,2),{mode:0o600});
const admin=createClient(cfg.API_URL,localSupabaseStatusSecret(cfg),{auth:{persistSession:false,autoRefreshToken:false}});
for(const role of ['owner','other']){if(fixture[role])continue;const email='retained-pricing-'+randomUUID()+'@fixture.invalid',password='Local-'+randomUUID()+'!';const r=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(r.error);fixture[role]={id:r.data.user.id,email,password};save();}
if(!fixture.seeded){sql(fs.readFileSync(root+'/backend/vendor_pricing/tests/runtime_fixture_v1.sql','utf8').replaceAll('__OWNER__',fixture.owner.id).replaceAll('__OTHER__',fixture.other.id));fixture.copies=JSON.parse(sql('select json_agg(c order by gvvi) from pricing_test_fixture.copies c'));fixture.seeded=true;save();}
const copy=fixture.copies.find(c=>c.owner_id===fixture.owner.id).instance_id;
sql(`update public.vault_item_instances set pricing_mode='asking',asking_price_currency='USD',asking_price_amount=20,asking_price_note='Retained manual price',intent='sell' where id='${copy}'`);
const tables=JSON.parse(sql("select json_agg(json_build_object('schema',n.nspname,'table',c.relname) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and (n.nspname in ('public','grookai_square','grookai_inventory') or (n.nspname='auth' and c.relname='users'))"));
const query=tables.map(t=>{assert.match(t.schema,/^[a-z_]+$/);assert.match(t.table,/^[a-z0-9_]+$/);return `select '${t.schema}.${t.table}' name,count(*)::text rows,md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) checksum from "${t.schema}"."${t.table}" t`;}).join(' union all ');
const snapshot=()=>JSON.parse(sql('begin isolation level repeatable read read only;select json_agg(x order by name) from ('+query+') x;commit;'));
const before=snapshot();fs.writeFileSync(lab+'/retained-before.private.json',JSON.stringify(before,null,2),{flag:'wx'});
fs.copyFileSync(root+'/supabase/migrations/'+migration,lab+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
fs.writeFileSync(lab+'/upgrade-intent.json',JSON.stringify({at:new Date().toISOString(),migration,sha256:pin,consumed:true,productionWrites:0},null,2),{flag:'wx'});
function cli(label){const fd=fs.openSync(lab+'/'+label+'.log','wx');let r;try{r=spawnSync('supabase',['db','push','--local','--workdir',lab,'--network-id',project,'--yes'],{encoding:'utf8',windowsHide:true,timeout:120000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}assert.ifError(r.error);assert.equal(r.status,0,label+' failed');}
cli('upgrade-494');cli('upgrade-noop');assert.match(fs.readFileSync(lab+'/upgrade-noop.log','utf8'),/up to date/i);
assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'494');
const after=snapshot();fs.writeFileSync(lab+'/retained-after.private.json',JSON.stringify(after,null,2),{flag:'wx'});assert.deepEqual(after,before,'Pre-existing public/inventory/Square/Auth user data changed');
const owner=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const login=await owner.auth.signInWithPassword(fixture.owner);assert.ifError(login.error);
const w=await owner.rpc('vendor_pricing_v1',{p_action:'workspace',p_data:{instanceId:copy}});assert.ifError(w.error);assert.equal(w.data.enabled,false);assert.equal(w.data.copy,null);assert.deepEqual(w.data.rules,[]);assert.equal(w.data.settings.auto_for_new,false);
const row=await owner.from('vault_item_instances').select('asking_price_amount,asking_price_note,intent').eq('id',copy).single();assert.ifError(row.error);assert.deepEqual(row.data,{asking_price_amount:20,asking_price_note:'Retained manual price',intent:'sell'});
const proof={pass:true,at:new Date().toISOString(),migration,sha256:pin,history493Unchanged:true,migrations:494,unchangedDataTables:tables.length,actualRetainedAuthUsers:2,existingManualPricesUnchanged:true,defaultOff:true,noop:true,productionWrites:0};fs.writeFileSync(lab+'/upgrade-proof.json',JSON.stringify(proof,null,2),{flag:'wx'});console.log(JSON.stringify(proof));
