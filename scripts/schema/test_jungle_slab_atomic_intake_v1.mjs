// Synthetic transaction-only proof on the attested, populated historical419 lab.
// No reset, seed replacement, migration registry write, or production connection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {inspectJungleRetainedRuntimeV1} from './inspect_jungle_retained_runtime_v1.mjs';
import {snapshotSql} from './vendor_billing_schema_v1.mjs';

assert.equal(process.argv.length,2);
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const out=base+'/slab-atomic-v1/attempt-'+Date.now();fs.mkdirSync(out,{recursive:true});
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const migration='supabase/migrations/20261002010000_jungle_slab_atomic_intake_v1.sql';
const source=fs.readFileSync(migration,'utf8');
fs.writeFileSync(out+'/candidate.sql',source,{flag:'wx'});
const testSource=fs.readFileSync('scripts/schema/test_jungle_slab_atomic_intake_v1.mjs');
fs.writeFileSync(out+'/test-source.mjs',testSource,{flag:'wx'});
const prior=JSON.parse(fs.readFileSync(base+'/implementation-source-v21.json'));
for(const file of prior.files.filter(f=>f.path.startsWith('supabase/migrations/')))
  assert.equal(sha(fs.readFileSync(file.path)),file.sha256,file.path);
save('runtime.json',inspectJungleRetainedRuntimeV1());
const c=new pg.Client({host:'127.0.0.1',port:65040,user:'postgres',password:'postgres',database:'postgres',
  connectionTimeoutMillis:5000,statement_timeout:120000});await c.connect();
const tests=[];let restored=false;
const q=async(sql,args)=>(await c.query(sql,args)).rows;
const scalar=async(sql,args)=>(await q(sql,args))[0];
const schema=async()=>(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt;
// Heap allocation/planner estimates can change after rolled-back writes and
// autovacuum. Preserve the raw snapshots; exclude only these two non-schema fields.
const schemaShape=s=>JSON.stringify(s,(key,value)=>['page_size_estimate','row_count_estimate'].includes(key)?undefined:value);
const digestSql=tables=>tables.map(t=>`select '${t}' table_name,count(*)::int rows,
  md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${t}" t`).join(' union all ')+' order by table_name';
const pass=name=>{tests.push(name);if(tests.length%10===0)console.log(JSON.stringify({passed:tests.length,last:name}));};
let before,oldSchema,footprintSql;
try{
  const target=await scalar("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations");
  assert.deepEqual(target,{address:'10.248.6.3',workers:'0',migrations:419});save('target.json',target);
  assert.equal((await scalar("select to_regclass('public.jungle_slab_intake_receipts_v1') name")).name,null);
  const tables=await q("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname");
  footprintSql=digestSql(tables.map(t=>t.relname));before=await q(footprintSql);oldSchema=await schema();save('before-footprints.json',before);save('before-schema.private.json',oldSchema);
  assert.equal(before.find(t=>t.table_name==='vault_item_instances').rows,5);
  await c.query('begin');await c.query(source.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,''));
  const user=randomUUID(),other=randomUUID();
  for(const id of [user,other])await c.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[id,id+'@jungle-slab-fixture.invalid']);
  const cards=await q("select c.id,c.name,c.number_plain,c.gv_id,l.card_printing_id,l.edition,l.finish_key from public.jungle_edition_identity_links_v1 l join public.card_prints c on c.id=l.card_print_id where l.state='active' order by c.gv_id");assert.equal(cards.length,128);
  let certIndex=1000;
  const payload=(card,cert)=>({PSACert:{CertNumber:cert,Year:'1999',Brand:'POKEMON JUNGLE',Category:'TCG CARDS',
    CardNumber:card.number_plain,Subject:card.name,Variety:(card.edition==='first_edition'?'1ST EDITION':'UNLIMITED')+' '+(card.finish_key==='holo'?'HOLO':'NORMAL'),
    CardGrade:'MINT 9',GradeDescription:'MINT 9',IsPSADNA:false,IsDualCert:false,ItemStatus:null}});
  const input=(card=cards[0])=>{const cert='000990'+(++certIndex);return [user,randomUUID(),card.id,card.card_printing_id,cert,9,payload(card,cert)];};
  const invoke=async args=>(await scalar('select public.admin_jungle_slab_intake_v1($1,$2,$3,$4,$5,$6,$7) result',args)).result;
  const affected=['slab_certs','vault_items','vault_item_instances','vault_owners','slab_provenance_events','jungle_slab_intake_receipts_v1'];
  const fail=async(name,args,pattern,role='service_role')=>{
    const state=await q(digestSql(affected));await c.query('savepoint negative');let error;
    try{await c.query('set local role '+role);await invoke(args);}catch(e){error=e;}
    await c.query('rollback to savepoint negative');assert.ok(error,name);assert.match(error.message,pattern,name);
    assert.deepEqual(await q(digestSql(affected)),state,name+' leaves no partial state');pass(name);
  };
  const rejectSql=async(name,sql,args,pattern,role='postgres')=>{
    await c.query('savepoint rejected');let error;try{await c.query('set local role '+role);await c.query(sql,args);}catch(e){error=e;}
    await c.query('rollback to savepoint rejected');assert.ok(error,name);assert.match(error.message,pattern,name);pass(name);
  };
  for(const role of ['anon','authenticated'])await fail(role+' cannot invoke writer',input(),/permission denied/,role);
  for(const role of ['anon','authenticated','service_role']){
    await rejectSql(role+' cannot read receipts','select * from public.jungle_slab_intake_receipts_v1',[],/permission denied/,role);
    await rejectSql(role+' cannot forge receipts',"insert into public.jungle_slab_intake_receipts_v1(user_id) values($1)",[user],/permission denied/,role);
  }
  for(const [name,mutate,pattern]of [
    ['unknown owner',a=>a[0]=randomUUID(),/OWNER_NOT_FOUND/],
    ['missing request',a=>a[1]=null,/INPUT_INVALID/],
    ['invalid grade',a=>a[5]=9.1,/INPUT_INVALID/],
    ['wrong child',a=>a[3]=cards[1].card_printing_id,/SELECTION_INVALID/],
    ['numeric certificate',a=>a[6].PSACert.CertNumber=Number(a[4]),/OBSERVATION_INVALID/],
    ['wrong certificate',a=>a[6].PSACert.CertNumber='123',/PRINTED_IDENTITY_MISMATCH/],
    ['provider error',a=>a[6].IsValidRequest=false,/OBSERVATION_INVALID/],
    ['provider error message',a=>a[6].ServerMessage='No data found',/OBSERVATION_INVALID/],
    ['blank unlimited is not inferred',a=>a[6].PSACert.Variety='',/EDITION_FINISH_MISMATCH/],
    ['wrong edition',a=>a[6].PSACert.Variety='UNLIMITED HOLO',/EDITION_FINISH_MISMATCH/],
    ['missing finish',a=>a[6].PSACert.Variety='1ST EDITION',/EDITION_FINISH_MISMATCH/],
    ['conflicting finish',a=>a[6].PSACert.Subject+=' NON-HOLO',/EDITION_FINISH_MISMATCH/],
    ['wrong number',a=>a[6].PSACert.CardNumber='64',/PRINTED_IDENTITY_MISMATCH/],
    ['wrong subject',a=>a[6].PSACert.Subject='Pikachu',/SUBJECT_MISMATCH/],
    ['wrong year',a=>a[6].PSACert.Year='2000',/PRINTED_IDENTITY_MISMATCH/],
    ['wrong brand',a=>a[6].PSACert.Brand='POKEMON BASE',/PRINTED_IDENTITY_MISMATCH/],
    ['wrong grade',a=>a[6].PSACert.CardGrade='MINT 8',/GRADE_MISMATCH/],
    ['grade disagreement',a=>a[6].PSACert.GradeDescription='MINT 8',/GRADE_MISMATCH/],
    ['dual certificate',a=>a[6].PSACert.IsDualCert=true,/PRINTED_IDENTITY_MISMATCH/],
    ['unknown status',a=>a[6].PSACert.ItemStatus='unknown',/PRINTED_IDENTITY_MISMATCH/],
    ['oversized payload',a=>a[6].extra='x'.repeat(17000),/OBSERVATION_INVALID/],
  ]){const a=input();mutate(a);await fail(name,a,pattern);}
  for(const kind of ['parent','grade']){
    await c.query('savepoint existing_cert');const a=input();
    await c.query("insert into public.slab_certs(grader,cert_number,card_print_id,grade) values('PSA',$1,$2,$3)",[a[4],kind==='parent'?cards[1].id:cards[0].id,kind==='grade'?8:9]);
    await fail('existing certificate '+kind+' conflict never rebinds',a,/EXISTING_CERTIFICATE_MISMATCH/);await c.query('rollback to savepoint existing_cert');
  }
  await c.query('savepoint unavailable');await c.query("update public.jungle_edition_identity_links_v1 set state='retired' where card_print_id=$1",[cards[1].id]);
  await fail('incomplete governed pair stays held',input(),/EDITION_UNAVAILABLE/);await c.query('rollback to savepoint unavailable');
  // Fail after each write stage: the statement subtransaction must unwind all
  // earlier rows and the allocation counter. No compensating archive is used.
  await c.query("create function public.jungle_slab_test_fault() returns trigger language plpgsql as $$ begin raise exception 'SYNTHETIC_ATOMIC_FAULT'; end $$");
  // Existing owner makes the owner-table fault occur at the final counter UPDATE.
  await c.query('select public.ensure_vault_owner_v1($1)',[user]);
  for(const table of affected){
    await c.query('savepoint fault_stage');
    await c.query(`create trigger jungle_slab_test_fault after insert or update on public.${table} for each row execute function public.jungle_slab_test_fault()`);
    await fail('rollback fault at '+table,input(),/SYNTHETIC_ATOMIC_FAULT/);
    await c.query('rollback to savepoint fault_stage');
  }
  let firstArgs,firstResult;
  for(const card of cards){
    const a=input(card);await c.query('set local role service_role');const result=await invoke(a);await c.query('reset role');
    const row=await scalar('select i.*,c.card_print_id cert_parent from public.vault_item_instances i join public.slab_certs c on c.id=i.slab_cert_id where i.id=$1',[result.instance_id]);
    assert.equal(row.card_print_id,null);assert.equal(row.cert_parent,card.id);assert.equal(row.card_printing_id,card.card_printing_id);assert.equal(row.legacy_vault_item_id,result.anchor_id);
    assert.equal(row.user_id,user);assert.equal(result.replayed,false);
    if(!firstArgs){firstArgs=a;firstResult=result;}
  }pass('all 128 manifest edition and finish coordinates save with exact certificate child and anchor');
  const count=await scalar("select (select count(*)::int from public.jungle_slab_intake_receipts_v1) receipts,(select count(*)::int from public.slab_provenance_events where event_source='psa:jungle-intake-v1') events");assert.deepEqual(count,{receipts:128,events:128});
  const saved=await q(digestSql(affected));
  await c.query('set local role service_role');const retry=await invoke(firstArgs);await c.query('reset role');
  assert.deepEqual(retry,{...firstResult,replayed:true});assert.deepEqual(await q(digestSql(affected)),saved);pass('identical retry returns original rows without a new allocation or event');
  const normalized=structuredClone(firstArgs);normalized[4]=normalized[4].slice(0,3)+'-'+normalized[4].slice(3);normalized[5]='9.0';
  await invoke(normalized);assert.deepEqual(await q(digestSql(affected)),saved);pass('normalized cert and numeric grade retry preserves leading zeros');
  const altered=structuredClone(firstArgs);altered[6].PSACert.Subject+=' HOLO';await fail('same key different source conflicts',altered,/RETRY_CONFLICT/);
  const duplicate=structuredClone(firstArgs);duplicate[1]=randomUUID();await fail('new key same active owned certificate rejects',duplicate,/ALREADY_OWNED/);
  const cross=structuredClone(firstArgs);cross[0]=other;cross[1]=randomUUID();const crossResult=await invoke(cross);assert.equal(crossResult.slab_cert_id,firstResult.slab_cert_id);assert.notEqual(crossResult.instance_id,firstResult.instance_id);pass('certificate identity is shared without inferring exclusive ownership');
  await rejectSql('receipt is immutable','update public.jungle_slab_intake_receipts_v1 set grade=8',[],/RECEIPT_IMMUTABLE/);
  await rejectSql('receipt cannot be deleted','delete from public.jungle_slab_intake_receipts_v1',[],/RECEIPT_IMMUTABLE/);
  for(const [name,sql,args,pattern]of [
    ['certificate grade rebind','update public.slab_certs set grade=8 where id=$1',[firstResult.slab_cert_id],/REBIND_FORBIDDEN/],
    ['certificate parent rebind','update public.slab_certs set card_print_id=$2 where id=$1',[firstResult.slab_cert_id,cards[1].id],/REBIND_FORBIDDEN/],
    ['instance child clearing','update public.vault_item_instances set card_printing_id=null where id=$1',[firstResult.instance_id],/REBIND_FORBIDDEN|OWNED_RESOLUTION_REQUIRED/],
    ['instance owner rebind','update public.vault_item_instances set user_id=$2 where id=$1',[firstResult.instance_id,other],/REBIND_FORBIDDEN/],
    ['instance primary key rebind','update public.vault_item_instances set id=$2 where id=$1',[firstResult.instance_id,randomUUID()],/REBIND_FORBIDDEN/],
    ['direct slab child bypass',"insert into public.vault_item_instances(user_id,gv_vi_id,slab_cert_id,card_printing_id,is_graded) values($1,'GVVI-TEST-BYPASS',$2,$3,true)",[other,firstResult.slab_cert_id,firstArgs[3]],/requires card_print_id/],
  ])await rejectSql(name,sql,args,pattern);
  await c.query('savepoint archived');await c.query('update public.vault_item_instances set archived_at=now() where id=$1',[firstResult.instance_id]);
  await fail('archived retry never revives a copy',firstArgs,/RETRY_STATE_CHANGED/);await c.query('rollback to savepoint archived');
  await c.query("update public.vault_item_instances set notes='synthetic metadata edit' where id=$1",[firstResult.instance_id]);pass('ordinary metadata edit on reviewed slab remains allowed');
  // Original generic RPC remains unchanged and continues to admit raw printings.
  const raw=await scalar('select (public.admin_vault_instance_create_v1(p_user_id=>$1,p_card_print_id=>$2,p_card_printing_id=>$3)).id id',[other,cards[0].id,cards[0].card_printing_id]);assert.ok(raw.id);pass('raw exact printing intake remains supported');
  const ordinary=await scalar("select c.id from public.card_prints c where c.set_code<>'base2' and public.get_jungle_edition_resolution_v1(c.id)->>'status'='not_applicable' limit 1");
  const ordinaryCert=await scalar("insert into public.slab_certs(grader,cert_number,card_print_id,grade) values('PSA','00099099999',$1,9) returning id",[ordinary.id]);
  const ordinarySlab=await scalar('select (public.admin_vault_instance_create_v1(p_user_id=>$1,p_slab_cert_id=>$2)).id id',[other,ordinaryCert.id]);assert.ok(ordinarySlab.id);pass('ordinary certificate-only slab intake remains supported');
  const deletedOwner=randomUUID();await c.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[deletedOwner,deletedOwner+'@jungle-slab-fixture.invalid']);
  const deleting=input();deleting[0]=deletedOwner;const deletedResult=await invoke(deleting);
  await c.query('delete from auth.users where id=$1',[deletedOwner]);
  assert.equal((await scalar('select count(*)::int n from public.vault_item_instances where id=$1',[deletedResult.instance_id])).n,0);
  assert.equal((await scalar('select count(*)::int n from public.jungle_slab_intake_receipts_v1 where instance_id=$1',[deletedResult.instance_id])).n,1);
  pass('append-only intake history does not block existing account-deletion cascades');
  await c.query('rollback');restored=true;
  assert.deepEqual(await q(footprintSql),before);const finalSchema=await schema();save('after-schema.private.json',finalSchema);
  assert.equal(sha(schemaShape(finalSchema)),sha(schemaShape(oldSchema)),'schema/security drift beyond planner estimates');
  assert.equal(sha(fs.readFileSync(migration)),sha(source),'migration unchanged during test');
  assert.equal(sha(fs.readFileSync('scripts/schema/test_jungle_slab_atomic_intake_v1.mjs')),sha(testSource),'test unchanged during test');
  pass('rollback preserves every existing public row schema grant and migration registry entry');
  const receipt={at:new Date().toISOString(),status:'passed',tests,testCount:tests.length,coordinates:128,
    sourceHashes:{[migration]:sha(fs.readFileSync(migration)),['scripts/schema/test_jungle_slab_atomic_intake_v1.mjs']:sha(fs.readFileSync('scripts/schema/test_jungle_slab_atomic_intake_v1.mjs'))},
    target,protectedPublicTables:before.length,localRollback:true,productionWrites:0,appEnabled:false,full422Replay:false,concurrencyTested:false,out};
  save('receipt.json',receipt);fs.writeFileSync(base+'/slab-atomic-v1/latest.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch(e){await c.query('rollback').catch(()=>{});if(before&&footprintSql)restored=JSON.stringify(await q(footprintSql))===JSON.stringify(before);
  save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack,detail:e.detail,where:e.where,tests,rowsRestored:restored,sourceSha256:sha(source)});throw new Error(e.message.slice(0,1200));
}finally{await c.end();}
