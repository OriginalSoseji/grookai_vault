// Real Auth/Storage/REST round trip against the named disposable project only.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
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
  const paths=['front','back'].map(side=>`${fixture.user_id}/vault-instances/${fixture.id}/${side}/revisions/${randomUUID().replaceAll('-','')}`);
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
  const viewerEmail=`sealed-media-${randomUUID()}@example.invalid`;
  const viewerUser=await admin.auth.admin.createUser({email:viewerEmail,password,email_confirm:true});assert.ifError(viewerUser.error);
  const viewer=createClient(status.API_URL,status.PUBLISHABLE_KEY,options);
  assert.ifError((await viewer.auth.signInWithPassword({email:viewerEmail,password})).error);
  await c.query("insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Local media fixture',true,true) on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true",[fixture.user_id,`fixture-${fixture.user_id}`]);
  await c.query("update public.vault_item_instances set intent='showcase' where id=$1 and user_id=$2",[fixture.id,fixture.user_id]);
  const details={p_instance_id:fixture.id,p_front_path:paths[0],p_back_path:paths[1],p_show_photos:true};
  assert.ifError((await client.rpc('vault_save_sealed_details_v1',details)).error);
  // Match the clients' one-hour token lifetime while testing failed saves.
  const shared=await viewer.storage.from('user-card-images').createSignedUrl(paths[0],3600);assert.ifError(shared.error);
  const replacement=await readFile(new URL('../../apps/web/public/set-logos/xy2.png',import.meta.url));
  assert.notEqual(hash(bytes),hash(replacement));
  const staged=`${fixture.user_id}/vault-instances/${fixture.id}/front/revisions/${randomUUID().replaceAll('-','')}`;
  assert.ifError((await client.storage.from('user-card-images').upload(staged,replacement,{upsert:false,contentType:'image/png'})).error);
  assert.ok((await client.storage.from('user-card-images').upload(paths[0],replacement,{upsert:false,contentType:'image/png'})).error);
  const failed=await client.rpc('vault_save_sealed_details_v1',{...details,p_front_path:staged,p_back_path:'missing',p_show_photos:false});assert.ok(failed.error);
  assert.ok((await viewer.storage.from('user-card-images').createSignedUrl(staged,60)).error);
  const oldResponse=await fetch(shared.data.signedUrl);assert.equal(oldResponse.status,200,oldResponse.ok?'':await oldResponse.text());
  assert.equal(hash(Buffer.from(await oldResponse.arrayBuffer())),hash(bytes));
  assert.ifError((await client.rpc('vault_save_sealed_details_v1',{...details,p_front_path:staged,p_show_photos:false})).error);
  assert.ok((await viewer.storage.from('user-card-images').createSignedUrl(staged,60)).error);
  const stillOld=await fetch(shared.data.signedUrl);assert.equal(stillOld.status,200);
  assert.equal(hash(Buffer.from(await stillOld.arrayBuffer())),hash(bytes));
  assert.ifError((await client.rpc('vault_save_sealed_details_v1',{...details,p_front_path:staged})).error);
  assert.ifError((await viewer.storage.from('user-card-images').createSignedUrl(staged,60)).error);
  await viewer.auth.signOut({scope:'local'});
  await client.auth.signOut({scope:'local'});
  console.log(JSON.stringify({status:'passed',local_only:true,production_access:false,uploads:3,exact_byte_readbacks:5,
    replacement_failure_preserves_shared_bytes:true,staged_replacement_private:true,retained_signed_url_preserves_original:true,
    private_by_default:true,anonymous_signing_denied:true,fixture_instance_id:fixture.id,fixture_owner:fixture.user_id,
    fixture_asset:'set-logos/xy1.png - test photo only',requires_isolated_replay:true}));
} finally {await c.end();}
