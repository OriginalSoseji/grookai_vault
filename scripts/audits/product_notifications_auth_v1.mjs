// Real local Auth/RLS and token RPC proof; synthetic tokens never reach a provider.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const root='C:/gv_product_notifications_20261008';
const base='C:/grookai_vault_operator_artifacts/product_notifications_20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
assert.equal(process.argv.length,3);
execFileSync(process.execPath,['scripts/audits/product_notifications_fixture_v1.mjs','verify',run],{stdio:'pipe',windowsHide:true,timeout:120000});
const f=JSON.parse(fs.readFileSync(run+'/fixture.private.json'));
const d=JSON.parse(fs.readFileSync(run+'/defines.private.json'));
assert.equal(f.state,'prepared');assert.equal(d.SUPABASE_URL,'http://127.0.0.1:35521');
const make=()=>createClient(d.SUPABASE_URL,d.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const clients=[make(),make(),make()];
const cases=[];
const check=async(name,fn)=>{await fn();cases.push(name);};
const columns='instant_enabled,daily_pulse_enabled,weekly_enabled,quiet_hours_start,quiet_hours_end,timezone';
const read=async(i)=>{const r=await clients[i].from('notification_prefs').select(columns).eq('user_id',f.users[i].id).maybeSingle();assert.equal(r.error,null);return r.data;};
const patch=async(i,p)=>{const r=await clients[i].from('notification_prefs').upsert({user_id:f.users[i].id,...p},{onConflict:'user_id',defaultToNull:false}).select(columns).single();assert.equal(r.error,null);return r.data;};
const register=(client,token,platform='android')=>client.rpc('notification_register_device_token_v1',{p_token:token,p_platform:platform,p_app_build:'local-auth-proof',p_device_label:'Synthetic only'});
const disable=(client,token)=>client.rpc('notification_disable_device_token_v1',{p_token:token});
try{
 for(let i=0;i<clients.length;i++){
  assert.ok(f.users[i].email.endsWith('@notifications-proof.invalid'));
  const r=await clients[i].auth.signInWithPassword({email:f.users[i].email,password:f.users[i].password});assert.equal(r.error,null);assert.equal(r.data.user.id,f.users[i].id);
 }
 const initial=await read(0);
 await check('foreign preferences are invisible',async()=>{const r=await clients[1].from('notification_prefs').select(columns).eq('user_id',f.users[0].id);assert.equal(r.error,null);assert.deepEqual(r.data,[]);});
 await check('foreign preference upsert denied and owner row unchanged',async()=>{const r=await clients[1].from('notification_prefs').upsert({user_id:f.users[0].id,instant_enabled:!initial.instant_enabled},{defaultToNull:false});assert.ok(r.error);assert.deepEqual(await read(0),initial);});
 await check('partial existing cadence preserves other choices',async()=>{assert.deepEqual(await patch(0,{instant_enabled:!initial.instant_enabled}),{...initial,instant_enabled:!initial.instant_enabled});});
 await check('concurrent different cadence patches both survive',async()=>{await Promise.all([patch(0,{instant_enabled:true}),patch(0,{daily_pulse_enabled:true})]);assert.deepEqual(await read(0),{...initial,instant_enabled:true,daily_pulse_enabled:true});});
 await check('absent preferences read creates no row',async()=>{assert.equal(await read(1),null);assert.equal(await read(1),null);});
 await check('first partial save uses database defaults',async()=>{assert.deepEqual(await patch(1,{daily_pulse_enabled:false}),{instant_enabled:true,daily_pulse_enabled:false,weekly_enabled:true,quiet_hours_start:null,quiet_hours_end:null,timezone:null});});
 await check('quiet pair and timezone save together',async()=>{const before=await read(1);assert.deepEqual(await patch(1,{quiet_hours_start:'21:30:00',quiet_hours_end:'07:15:00',timezone:'America/New_York'}),{...before,quiet_hours_start:'21:30:00',quiet_hours_end:'07:15:00',timezone:'America/New_York'});});
 await check('quiet disable preserves cadence and timezone',async()=>{const before=await read(1);assert.deepEqual(await patch(1,{quiet_hours_start:null,quiet_hours_end:null}),{...before,quiet_hours_start:null,quiet_hours_end:null});});
 const token=f.tokenPrefix+'auth';assert.match(token,/^notifications-proof-[a-f0-9-]+-auth$/);
 await check('anonymous token registration denied',async()=>{assert.ok((await register(make(),token)).error);});
 await check('blank token and unsupported platform rejected',async()=>{assert.ok((await register(clients[0],' ')).error);assert.ok((await register(clients[0],token,'browser')).error);});
 await check('token register and owner-only visibility',async()=>{const r=await register(clients[0],token);assert.equal(r.error,null);assert.equal(typeof r.data,'string');const foreign=await clients[1].from('device_tokens').select('id').eq('token',token);assert.equal(foreign.error,null);assert.deepEqual(foreign.data,[]);});
 await check('same device token transfers to replacement owner',async()=>{assert.equal((await register(clients[1],token)).error,null);const old=await clients[0].from('device_tokens').select('id').eq('token',token);assert.equal(old.error,null);assert.deepEqual(old.data,[]);const current=await clients[1].from('device_tokens').select('user_id,disabled_at').eq('token',token).single();assert.equal(current.error,null);assert.deepEqual(current.data,{user_id:f.users[1].id,disabled_at:null});});
 await check('old owner cannot disable reassigned token',async()=>{const r=await disable(clients[0],token);assert.equal(r.error,null);assert.equal(r.data,false);});
 await check('current owner disable is idempotent',async()=>{const first=await disable(clients[1],token);assert.equal(first.error,null);assert.equal(first.data,true);const second=await disable(clients[1],token);assert.equal(second.error,null);assert.equal(second.data,false);});
 execFileSync(process.execPath,['scripts/audits/product_notifications_fixture_v1.mjs','verify',run],{stdio:'pipe',windowsHide:true,timeout:120000});
 const result={status:'passed',at:new Date().toISOString(),cases,providerCalls:0,productionWrites:0};
 fs.writeFileSync(run+'/auth-proof-'+Date.now()+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}catch(error){fs.writeFileSync(run+'/auth-failure-'+Date.now()+'.json',JSON.stringify({status:'failed',cases,message:error.message,stack:error.stack},null,2)+'\n',{flag:'wx'});throw error;}
