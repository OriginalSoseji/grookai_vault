// Disposable local UI harness. No production configuration is read or accepted.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const cwd='C:/grookai_vault_sealed_schema_reconcile';
const status=JSON.parse(execFileSync('supabase',['status','-o','json'],{cwd,encoding:'utf8'}));
assert.equal(status.API_URL,'http://127.0.0.1:55429');
const c=new pg.Client({host:'127.0.0.1',port:55430,user:'postgres',password:'postgres',database:'postgres'});
await c.connect();
const owner=(await c.query("select u.id,u.email,count(*) copies from auth.users u join public.vault_item_instances i on i.user_id=u.id where u.email like '%@example.invalid' and i.sealed_product_variant_id is not null and i.archived_at is null group by u.id,u.email order by count(*) desc limit 1")).rows[0];
assert.ok(owner,'Run the local concurrency fixture first');
await c.query("update auth.users set instance_id='00000000-0000-0000-0000-000000000000',aud='authenticated',role='authenticated',created_at=coalesce(created_at,now()),updated_at=now(),confirmation_token='',recovery_token='',email_change_token_new='',email_change='',email_change_token_current='',reauthentication_token='',phone_change='',phone_change_token='' where id=$1 and email like '%@example.invalid'",[owner.id]);
await c.end();
const admin=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const password='Sealed-local-only-2026!';
const {error}=await admin.auth.admin.updateUserById(owner.id,{password,email_confirm:true});
if(error) throw error;
console.log(JSON.stringify({url:'http://localhost:3157/login',fixture_email:owner.email,local_only:true}));
const env={...process.env,SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_URL:status.API_URL,
  SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_ANON_KEY:status.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:status.ANON_KEY,
  SUPABASE_SECRET_KEY:status.SERVICE_ROLE_KEY,SUPABASE_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SEALED_OWNERSHIP_V1_ENABLED:'true',NEXT_PUBLIC_MTG_SEALED_ENABLED:'true',
  NEXT_PUBLIC_POKEMON_SEALED_ENABLED:'true',NEXT_TELEMETRY_DISABLED:'1'};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3157'],{
  cwd:new URL('../../apps/web',import.meta.url),env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
