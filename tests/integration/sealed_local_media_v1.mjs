// Real Auth/Storage/REST round trip against the named disposable project only.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const status=JSON.parse(execFileSync('supabase',['status','-o','json'],{cwd:'C:/grookai_vault_sealed_schema_reconcile',encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(status.API_URL,'http://127.0.0.1:55429');
const c=new pg.Client({host:'127.0.0.1',port:55430,user:'postgres',password:'postgres',database:'postgres'});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(status.API_URL,status.SECRET_KEY,options);
await c.connect();
try {
  const buckets=await admin.storage.listBuckets();assert.ifError(buckets.error);
  const existing=buckets.data.find(b=>b.id==='user-card-images');
  if(existing) assert.equal(existing.public,false);
  else { const made=await admin.storage.createBucket('user-card-images',{public:false,fileSizeLimit:10*1024*1024});assert.ifError(made.error); }
  const fixture=(await c.query("select i.id,i.user_id,u.email from public.vault_item_instances i join auth.users u on u.id=i.user_id where u.email like '%@example.invalid' and i.archived_at is null and i.sealed_product_variant_id is not null and i.image_url is null order by i.created_at desc limit 1")).rows[0];
  assert.ok(fixture);
  await c.query("update auth.users set instance_id='00000000-0000-0000-0000-000000000000',aud='authenticated',role='authenticated',created_at=coalesce(created_at,now()),updated_at=now(),confirmation_token='',recovery_token='',email_change_token_new='',email_change='',email_change_token_current='',reauthentication_token='',phone_change='',phone_change_token='' where id=$1 and email like '%@example.invalid'",[fixture.user_id]);
  const password='Sealed-local-only-2026!';
  const prepared=await admin.auth.admin.updateUserById(fixture.user_id,{password,email_confirm:true});assert.ifError(prepared.error);
  const client=createClient(status.API_URL,status.PUBLISHABLE_KEY,options);
  const login=await client.auth.signInWithPassword({email:fixture.email,password});assert.ifError(login.error);
  const bytes=await readFile(new URL('../../apps/web/public/set-logos/xy1.png',import.meta.url));
  const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
  const paths=['front','back'].map(side=>`${fixture.user_id}/vault-instances/${fixture.id}/${side}/current`);
  for(const path of paths) {
    const uploaded=await client.storage.from('user-card-images').upload(path,bytes,{upsert:false,contentType:'image/png'});assert.ifError(uploaded.error);
    const downloaded=await client.storage.from('user-card-images').download(path);assert.ifError(downloaded.error);
    assert.equal(hash(Buffer.from(await downloaded.data.arrayBuffer())),hash(bytes));
  }
  const saved=await client.rpc('vault_save_sealed_details_v1',{p_instance_id:fixture.id,p_front_path:paths[0],p_back_path:paths[1],p_notes:'Local fixture logo, not product evidence',p_show_photos:false});assert.ifError(saved.error);
  const read=await client.rpc('get_owned_sealed_copies_v1',{p_instance_ids:[fixture.id]});assert.ifError(read.error);
  assert.equal(read.data[0].personal_image_url,paths[0]);assert.equal(read.data[0].personal_back_image_url,paths[1]);assert.equal(read.data[0].show_personal_photos,false);
  const signed=await client.storage.from('user-card-images').createSignedUrl(paths[0],60);assert.ifError(signed.error);
  assert.ok(signed.data.signedUrl.startsWith(status.API_URL));
  const response=await fetch(signed.data.signedUrl);assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(bytes));
  const anonymous=createClient(status.API_URL,status.PUBLISHABLE_KEY,options);
  const denied=await anonymous.storage.from('user-card-images').createSignedUrl(paths[0],60);assert.ok(denied.error);
  await client.auth.signOut({scope:'local'});
  console.log(JSON.stringify({status:'passed',local_only:true,production_access:false,uploads:2,exact_byte_readbacks:3,
    private_by_default:true,anonymous_signing_denied:true,fixture_instance_id:fixture.id,fixture_owner:fixture.user_id,
    fixture_asset:'set-logos/xy1.png - test photo only',requires_isolated_replay:true}));
} finally {await c.end();}
