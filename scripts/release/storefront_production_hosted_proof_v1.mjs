// Explicit synthetic production smoke. No real-user mutation or inventory commit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {root,dir,ref,dbUrl,origin,save,read,keys,rest,query} from './storefront_production_live_common_v1.mjs';
const mode=process.argv[2];assert.equal(process.argv.length,3);assert.ok(['prepare','prove','cleanup'].includes(mode));
const credentials=await keys();
if(mode==='prepare'){
  assert.ok(!fs.existsSync(dir+'/accounts.private.json'));
  const accounts=Array.from({length:2},()=>({id:randomUUID(),email:'store-release-'+randomUUID()+'@example.invalid',password:randomBytes(32).toString('base64url')}));
  save('accounts.private.json',accounts);
  for(const a of accounts){const r=await rest('/auth/v1/admin/users',{key:credentials.service,body:{id:a.id,email:a.email,password:a.password,email_confirm:true,user_metadata:{release_smoke:'storefront_20260926'}}});assert.equal(r.status,200);assert.equal(r.data.id,a.id);}
  console.log('Two isolated synthetic accounts created; no emails sent.');
}else if(mode==='cleanup'){
  const accounts=read('accounts.private.json');
  for(const a of accounts){const r=await rest('/auth/v1/admin/users/'+a.id,{key:credentials.service});assert.equal(r.status,200);assert.equal(r.data.email,a.email);assert.equal(r.data.user_metadata.release_smoke,'storefront_20260926');
    const count=(await query(`begin read only;select count(*) as n from vault_item_instances where user_id='${a.id}';rollback;`))[0].n;assert.equal(count,0);
    const removed=await rest('/auth/v1/admin/users/'+a.id,{key:credentials.service,method:'DELETE'});assert.equal(removed.status,200);
  }
  const invite=read('activation-plan.private.json').invites.find(i=>i.name==='smoke');
  await query(`begin;delete from vendor_store_trial_invites where id='${invite.id}' and not exists(select 1 from vendor_store_trial_members where invite_id='${invite.id}');commit;`);
  save('synthetic-cleanup.json',{at:new Date().toISOString(),users:2,inventoryCreated:0,smokeInvitationRemoved:true});console.log('Synthetic users and smoke invitation removed.');
}else{
  const ready=JSON.parse(fs.readFileSync(root+'/.local/integration/production-web-v4/ready.json')),base=ready.url;
  const secret=read('automation.private.json').secret,invite=read('activation-plan.private.json').invites.find(i=>i.name==='smoke');
  const require=createRequire(root+'/apps/web/package.json'),{createServerClient}=require('@supabase/ssr');
  const accounts=read('accounts.private.json'),sessions=[];
  for(const a of accounts){const jar=new Map();const client=createServerClient(dbUrl,credentials.anon,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(r=>jar.set(r.name,r.value))}});const login=await client.auth.signInWithPassword({email:a.email,password:a.password});assert.ok(!login.error);sessions.push({client,cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')});}
  const report={at:new Date().toISOString(),deployment:ready.id,target:ref,checks:[],matches:[],scope:'Hosted HTTPS synthetic account setup and scan matching; no production inventory commit or payment action.'};
  const output=dir+'/hosted-proof.private.json';assert.ok(!fs.existsSync(output));
  const persist=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
  const check=(name,value)=>{report.checks.push({name,passed:Boolean(value)});persist();assert.ok(value,name);};
  const request=async(route,{user=0,body,method,type='application/json',extra={}}={})=>{
    const r=await fetch(base+route,{method:method??(body!==undefined?'POST':'GET'),headers:{'x-vercel-protection-bypass':secret,Origin:origin,'Content-Type':type,...(user===null?{}:{Cookie:sessions[user].cookie}),...extra},body:body===undefined?undefined:type==='application/json'?JSON.stringify(body):body,redirect:'manual',signal:AbortSignal.timeout(55000)});
    const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return{status:r.status,headers:r.headers,text,data};
  };
  try{
    check('anonymous owner API requires sign-in',(await request('/api/stores/owner',{user:null})).status===401);
    const denied=await request('/api/stores/owner',{body:{action:'save',slug:'release-'+accounts[0].id,display_name:'Synthetic release check',description:''}});check('account without grant cannot create store',denied.status===403);
    const start=await request('/store-trial/start?code='+invite.code,{user:null});check('invitation redirects without secret in URL',start.status===303&&start.headers.get('location')===origin+'/store-trial'&&start.headers.get('set-cookie')?.includes('HttpOnly'));
    const trial=await request('/api/stores/trial/activate',{body:{},extra:{Cookie:sessions[0].cookie+'; grookai_store_trial='+invite.code}});check('invitation activates real authenticated account',trial.status===303&&trial.headers.get('location')===origin+'/account/store');
    const owner=await request('/api/stores/owner');check('trial grants management only',owner.status===200&&owner.data.capabilities.store_app===true&&owner.data.capabilities.store_web===false&&owner.data.store===null);
    const slug='release-'+accounts[0].id;const created=await request('/api/stores/owner',{body:{action:'save',slug,display_name:'Synthetic release check',description:'Temporary empty private verification store'}});check('private store setup succeeds',created.status===200);
    const saved=await request('/api/stores/owner');check('store remains unpublished with no inventory',saved.data.store.app_published===false&&saved.data.store.web_published===false&&saved.data.inventory.items.length===0);
    check('desktop management page loads',(await request('/account/store')).status===200);
    check('owner preview works',(await request('/api/stores/'+slug+'/preview')).status===200);
    check('other account preview denied',(await request('/api/stores/'+slug+'/preview',{user:1})).status===404);
    check('public draft inventory denied',(await request('/api/stores/'+slug,{user:null})).status===404);
    check('trial cannot publish public web',(await request('/api/stores/owner',{body:{action:'publish',surface:'web',publish:true}})).status===403);
    check('foreign Origin rejected',(await request('/api/stores/owner',{body:{action:'save'},extra:{Origin:'https://invalid.example'}})).status===403);
    check('scan requires eligible owner',(await request('/api/stores/owner/intake/match',{user:1,body:Buffer.from('invalid'),type:'image/jpeg'})).status===403);
    check('scan rejects invalid media type',(await request('/api/stores/owner/intake/match',{body:'invalid',type:'text/plain'})).status===415);
    const labels=JSON.parse(fs.readFileSync('C:/gv_store_billing_20260919/.local/integration/vendor-scan-visual-v16/labels.private.json'));
    const previous=JSON.parse(fs.readFileSync('C:/gv_store_billing_20260919/.local/integration/vendor-scan-visual-v23/regression.private.json'));
    const cases=labels.filter(r=>r.corpus==='browser_heic'||r.corpus==='gallery_v12'&&r.file==='gallery-3.jpg'||r.file==='holdout-0041.heic'||r.corpus==='legacy');
    for(const label of cases){const bytes=fs.readFileSync(label.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),label.sha256);const expected=previous.rows.find(r=>r.corpus===label.corpus&&r.file===label.file).candidates;
      const t=Date.now(),r=await request('/api/stores/owner/intake/match',{body:bytes,type:'image/jpeg'});const same=r.status===200&&r.data.cards.length===expected.length&&r.data.cards.every(c=>expected.some(e=>e.id===c.id&&e.rotation===c.rotation)&&c.printings?.length&&c.printings.every(p=>p.printing_gv_id));
      report.matches.push({file:label.file,sha256:label.sha256,status:r.status,ms:Date.now()-t,same,error:r.data?.error,ids:r.data?.cards?.map(c=>c.gv_id)});persist();console.log(JSON.stringify(report.matches.at(-1)));assert.ok(same,'Production match differs from qualified corpus');
    }
    report.status='passed';
  }catch(e){report.status='failed';report.error=e.message;process.exitCode=1;}
  finally{report.finishedAt=new Date().toISOString();persist();for(const s of sessions)await s.client.auth.signOut({scope:'local'});console.log(JSON.stringify({status:report.status,checks:report.checks.length,matches:report.matches.length,error:report.error}));}
}
