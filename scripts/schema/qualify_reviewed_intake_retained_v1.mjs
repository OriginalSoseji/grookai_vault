// Real GoTrue/Storage SDK fixtures and retained-data upgrade in the owned 477 lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {isDeepStrictEqual} from 'node:util';
const root='C:/gv_intake_release_20261028';assert.equal(process.cwd().replaceAll('\\','/'),root);
const base='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1';
const work=base+'/local-draft-477',project='reviewed-intake-draft-477-20261028',db='supabase_db_'+project;
const output=base+'/retained-upgrade-v1';
const phase=process.argv[2];assert.ok(['prepare-fixture','resume-fixture','upgrade','verify'].includes(phase));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sql=q=>execFileSync('docker',['exec','-i',db,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:120000,maxBuffer:32_000_000}).trim();
const info=JSON.parse(execFileSync('docker',['inspect',db],{encoding:'utf8'}))[0];
assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false);
const frozen=JSON.parse(fs.readFileSync(base+'/candidate-frozen.json'));
const migration=fs.readFileSync(root+'/supabase/migrations/'+frozen.migration);assert.equal(sha(migration),frozen.sha256);
const env={...process.env,DO_NOT_TRACK:'1'};
for(const name of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(name))delete env[name];
const cli=args=>execFileSync('supabase',[...args,'--workdir',work,'--network-id',project],{env,encoding:'utf8',timeout:120000,maxBuffer:8_000_000,stdio:['ignore','pipe','pipe']});
const credentials=JSON.parse(cli(['status','--output','json']));
const url='http://127.0.0.1:60521';assert.match(credentials.API_URL,/127\.0\.0\.1:60521/);
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,credentials.SERVICE_ROLE_KEY,options);
const anon=()=>createClient(url,credentials.ANON_KEY,options);
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const save=(name,data)=>fs.writeFileSync(output+'/'+name,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const snapshot=actor=>JSON.parse(sql(`select jsonb_build_object(
  'buckets',(select jsonb_agg(to_jsonb(v) order by id) from public.vault_items v where user_id='${actor}'),
  'copies',(select jsonb_agg(to_jsonb(v)-array['acquisition_lot_id','intake_item_id','acquired_on','acquisition_currency','intake_tags','intake_allocation'] order by id) from public.vault_item_instances v where user_id='${actor}'),
  'outcomes',(select jsonb_agg(to_jsonb(v) order by id) from public.vault_item_instance_dispositions v where user_id='${actor}'),
  'events',(select jsonb_agg(to_jsonb(v) order by id) from public.card_events v where actor_user_id='${actor}'),
  'storage',(select jsonb_agg(to_jsonb(v) order by id) from storage.objects v where bucket_id='user-card-images' and (storage.foldername(name))[1]='${actor}')
)`));
if(phase==='prepare-fixture'||phase==='resume-fixture'){
  assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'477');
  const resumed=phase==='resume-fixture';
  assert.equal(fs.existsSync(output),resumed);
  assert.equal(sql('select count(*) from auth.users'),resumed?'2':'0');assert.equal(sql('select count(*) from public.vault_item_instances'),resumed?'2':'0');
  if(!resumed){fs.mkdirSync(output);save('intent.json',{at:new Date().toISOString(),project,phase,localOnly:true,neverResetAfterThisPoint:true});}
  else save('resume-intent-v1.json',{at:new Date().toISOString(),reason:'Legacy image bucket is an external platform prerequisite absent from migration replay; create a declared private local fixture bucket through SDK.',productionWrites:0});
  const stored=resumed?JSON.parse(fs.readFileSync(output+'/accounts-private.json')):null;
  const password=stored?.password??randomBytes(32).toString('base64url');const users=[];
  for(const name of ['owner','peer']){
    const email=`reviewed-intake-${name}-20261028@local.test`;
    const user=resumed?stored.users.find(u=>u.name===name):ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
    assert.ok(user?.id);const client=anon();ok(await client.auth.signInWithPassword({email,password}));
    assert.equal(ok(await client.auth.getUser()).user.id,user.id);users.push({name,id:user.id,email,client});
  }
  if(!resumed)save('accounts-private.json',{password,users:users.map(({client,...u})=>u)});
  const owner=users[0];
  const card=sql("select id from public.card_prints where set_code='pgo' and number='1' limit 1");assert.match(card,/^[a-f0-9-]{36}$/);
  if(!resumed){const added=ok(await admin.rpc('vault_add_card_instance_service_v1',{p_actor_user_id:owner.id,p_card_print_id:card,p_quantity:2,p_condition_label:'LP',p_notes:'Retained private review note'}));save('add-receipt.json',added);}
  const copies=JSON.parse(sql(`select jsonb_agg(to_jsonb(v) order by id) from public.vault_item_instances v where user_id='${owner.id}'`));assert.equal(copies.length,2);
  ok(await owner.client.rpc('vault_save_instance_notes_v1',{p_instance_id:copies[0].id,p_notes:'Retained notes across intake upgrade'}));
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=','base64');
  const imagePath=owner.id+'/'+copies[0].id+'/retained-front.png';
  const buckets=ok(await admin.storage.listBuckets());
  if(!buckets.some(b=>b.id==='user-card-images')){
    ok(await admin.storage.createBucket('user-card-images',{public:false,fileSizeLimit:10485760,allowedMimeTypes:['image/jpeg','image/png','image/webp']}));
    save('legacy-image-bucket-fixture.json',{at:new Date().toISOString(),id:'user-card-images',public:false,externalPlatformPrerequisite:true,localOnly:true,productionWrites:0});
  }
  ok(await owner.client.storage.from('user-card-images').upload(imagePath,image,{contentType:'image/png',upsert:false}));
  const download=ok(await owner.client.storage.from('user-card-images').download(imagePath));assert.equal(sha(Buffer.from(await download.arrayBuffer())),sha(image));
  sql(`begin;select set_config('request.jwt.claim.sub','${owner.id}',true);select set_config('request.jwt.claim.role','authenticated',true);select public.vault_record_exact_instance_disposition_v2('${copies[1].id}','sale',25,'USD','Local retained sale',null,null,null,null);commit;`);
  save('fixture.json',{at:new Date().toISOString(),owner:owner.id,peer:users[1].id,card,copies:copies.map(v=>v.id),imagePath,imageSha256:sha(image)});
  save('before.json',snapshot(owner.id));
  console.log(JSON.stringify({pass:true,realGoTrueAccounts:2,retainedCopies:2,storageBytesVerified:true,productionWrites:0}));
}else if(phase==='upgrade'){
  assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'477');
  const fixture=JSON.parse(fs.readFileSync(output+'/fixture.json'));
  assert.ok(isDeepStrictEqual(snapshot(fixture.owner),JSON.parse(fs.readFileSync(output+'/before.json'))));
  save('upgrade-intent.json',{at:new Date().toISOString(),migration:frozen.migration,sha256:frozen.sha256,consumed:true});
  fs.writeFileSync(work+'/supabase/migrations/'+frozen.migration,migration,{flag:'wx'});
  for(const [args,label] of [[['db','push','--local','--yes'],'upgrade'],[['db','push','--local','--yes'],'noop']]){
    const fd=fs.openSync(output+'/'+label+'.log','wx');let result;
    try{result=spawnSync('supabase',[...args,'--workdir',work,'--network-id',project],{env,timeout:600000,windowsHide:true,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
    assert.ifError(result.error);assert.equal(result.status,0,label+' failed; retain lab for diagnosis');
  }
  assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'478');
  assert.ok(isDeepStrictEqual(snapshot(fixture.owner),JSON.parse(fs.readFileSync(output+'/before.json'))),'Upgrade changed retained business/storage records');
  save('upgrade-result.json',{at:new Date().toISOString(),pass:true,retainedRecordsByteExact:true,officialCliApply:true,officialCliNoop:true,targetLedger:478,productionWrites:0});
  console.log(JSON.stringify({pass:true,targetLedger:478,retainedRecordsByteExact:true,productionWrites:0}));
}else{
  const fixture=JSON.parse(fs.readFileSync(output+'/fixture.json')),accounts=JSON.parse(fs.readFileSync(output+'/accounts-private.json'));
  const owner=anon();ok(await owner.auth.signInWithPassword({email:accounts.users[0].email,password:accounts.password}));assert.equal(ok(await owner.auth.getUser()).user.id,fixture.owner);
  const image=ok(await owner.storage.from('user-card-images').download(fixture.imagePath));assert.equal(sha(Buffer.from(await image.arrayBuffer())),fixture.imageSha256);
  assert.ok(isDeepStrictEqual(snapshot(fixture.owner),JSON.parse(fs.readFileSync(output+'/before.json'))));
  assert.equal(sql('select writes_enabled::text from public.collector_intake_controls_v1 where singleton'),'false');
  save('verify-result.json',{at:new Date().toISOString(),pass:true,realAuthAndStorageAfterUpgrade:true,retainedRecordsByteExact:true,writesRemainOff:true,productionWrites:0});
  console.log(JSON.stringify({pass:true,realAuthAndStorageAfterUpgrade:true,writesRemainOff:true,productionWrites:0}));
}
