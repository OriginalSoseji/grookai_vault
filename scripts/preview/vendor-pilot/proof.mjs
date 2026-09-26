import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {out,verified,query} from './ops.mjs';
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url));const {createClient}=require('@supabase/supabase-js');
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');const url=`https://${p.id}.supabase.co`;
const keys=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))),key=keys.find(k=>k.name==='anon').api_key;
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const q=x=>"'"+String(x).replaceAll("'","''")+"'",sha=x=>createHash('sha256').update(x).digest('hex');
const receipts=[];const pass=name=>{receipts.push(name);console.log('PASS '+name);fs.writeFileSync(path.join(out,'database-proof.json'),JSON.stringify({at:new Date().toISOString(),target:p.id,passed:receipts},null,2));};
const mode=process.argv[2];
if(mode==='prepare'){
 assert.ok(!fs.existsSync(path.join(out,'proof-accounts.private.json')));
 const accounts=['a','b','c'].map(n=>({email:`vendor-pilot-${randomUUID()}-${n}@example.com`,password:randomBytes(24).toString('base64url')}));
 fs.writeFileSync(path.join(out,'proof-accounts.private.json'),JSON.stringify(accounts,null,2),{flag:'wx'});
 for(const a of accounts){const c=client(),r=await c.auth.signUp({email:a.email,password:a.password});assert.equal(r.error,null,r.error?.message);assert.ok(r.data.session);a.id=r.data.user.id;await c.auth.signOut();fs.writeFileSync(path.join(out,'proof-accounts.private.json'),JSON.stringify(accounts,null,2));}
 pass('three own-email/password signups create independent authenticated accounts without SMTP');
 const invite=randomBytes(32).toString('hex');fs.writeFileSync(path.join(out,'proof-invite.private.json'),JSON.stringify({code:invite}),{flag:'wx'});
 await query(`insert into vendor_pilot_invites(code_hash,expires_at,max_members) values(${q(sha(invite))},now()+interval '2 days',2);`);
}else if(mode==='database'){
 const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json'))),clients=[];
 for(const a of accounts){const c=client(),r=await c.auth.signInWithPassword(a);assert.equal(r.error,null);clients.push(c);}
 const [a,b,c]=clients,anon=client(),invite=JSON.parse(fs.readFileSync(path.join(out,'proof-invite.private.json'))).code;
 const fail=async(cl,fn,args)=>{const r=await cl.rpc(fn,args);assert.ok(r.error,fn+' must reject');return r.error;};
 await fail(anon,'vendor_pilot_activate_v1',{p_invite:invite});await fail(a,'vendor_pilot_activate_v1',{p_invite:'f'.repeat(64)});
 await fail(a,'vendor_store_save_v1',{p_slug:'without-access',p_display_name:'No access',p_description:''});pass('anonymous, forged invitation and unentitled direct store writes rejected');
 const first=await Promise.all([a.rpc('vendor_pilot_activate_v1',{p_invite:invite}),a.rpc('vendor_pilot_activate_v1',{p_invite:invite}),b.rpc('vendor_pilot_activate_v1',{p_invite:invite})]);for(const r of first)assert.equal(r.error,null,r.error?.message);
 await fail(c,'vendor_pilot_activate_v1',{p_invite:invite});
 const members=await query(`select count(*)::int as n from vendor_pilot_members where invite_id=(select id from vendor_pilot_invites where code_hash=${q(sha(invite))});`);assert.equal(members[0].n,2);pass('concurrent activation is idempotent and two-member invitation cap enforced');
 for(const cl of [a,b]){const o=await cl.rpc('vendor_store_owner_v1');assert.equal(o.error,null);assert.equal(o.data.store,null);assert.equal(o.data.capabilities.store_app,true);assert.equal(o.data.capabilities.store_web,false);}
 assert.ok((await c.from('user_entitlements').insert({user_id:accounts[2].id,tier:'vendor',role:'vendor',features:{store_app:true,store_web:true}})).error);pass('database grants only app capability; activation creates no store and client cannot forge grants');
 const stores=[];
 for(const [index,cl] of [a,b].entries()){
  const r=await cl.rpc('vendor_store_save_v1',{p_slug:'pilot-proof-'+accounts[index].id.slice(0,8),p_display_name:'Vendor preview proof '+(index+1),p_description:'Synthetic proof store'});assert.equal(r.error,null,r.error?.message);
  const o=await cl.rpc('vendor_store_owner_v1');assert.equal(o.error,null);assert.equal(o.data.store.app_published,false);assert.equal(o.data.store.web_published,false);stores.push(o.data.store);
 }
 const product=await a.rpc('vendor_store_custom_mutate_v1',{p_product_id:null,p_expected_version:null,p_action:'save',p_data:{title:'Preview collectible',description:'Synthetic collectible for isolated review proof',asking_price_amount:12.5,available_quantity:3,private_sku:'PRIVATE-PROOF'}});assert.equal(product.error,null,product.error?.message);const item=product.data.products[0];assert.equal(item.published,false);
 const read=await a.rpc('vendor_store_custom_owner_v1',{p_product_id:item.id});assert.equal(read.data.products[0].asking_price_amount,12.5);
 const foreign=await b.rpc('vendor_store_custom_owner_v1',{p_product_id:item.id});assert.ok(foreign.error||foreign.data.products.length===0);
 await fail(b,'vendor_store_custom_mutate_v1',{p_product_id:item.id,p_expected_version:item.version,p_action:'save',p_data:{title:'Forged'}});
 const foreignStore=await b.from('vendor_stores').select('id').eq('id',stores[0].id);assert.ok(foreignStore.error||foreignStore.data.length===0);
 await fail(a,'vendor_store_publish_v1',{p_surface:'web',p_publish:true});
 const privateRead=await b.rpc('vendor_store_read_v2',{p_slug:stores[0].slug,p_surface:'preview'});assert.ok(privateRead.error||privateRead.data===null);
 const publicRead=await anon.rpc('vendor_store_read_v2',{p_slug:stores[0].slug,p_surface:'web'});assert.ok(publicRead.error||publicRead.data===null);pass('store and custom drafts persist; second owner cannot read/edit drafts; web publication and public reads denied');
 const img=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO6sAAAAASUVORK5CYII=','base64'),mediaPath=`${stores[0].id}/logo/${randomUUID()}.png`;
 const upload=await a.storage.from('vendor-store-media').upload(mediaPath,img,{contentType:'image/png'});assert.equal(upload.error,null,upload.error?.message);
 assert.equal((await a.rpc('vendor_store_set_media_v1',{p_kind:'logo',p_path:mediaPath})).error,null);
 assert.ok((await b.storage.from('vendor-store-media').download(mediaPath)).error);assert.ok((await anon.storage.from('vendor-store-media').download(mediaPath)).error);
 assert.ok((await b.storage.from('vendor-store-media').upload(`${stores[0].id}/logo/${randomUUID()}.png`,img,{contentType:'image/png'})).error);pass('branding upload and attachment work; anonymous and foreign-owner media reads/writes denied');
 await query(`update vendor_pilot_members set expires_at=now()-interval '1 second' where user_id=${q(accounts[1].id)};`);
 assert.equal((await b.rpc('vendor_store_owner_v1')).data.capabilities.store_app,false);await fail(b,'vendor_store_save_v1',{p_slug:stores[1].slug,p_display_name:'Denied',p_description:''});await fail(b,'vendor_pilot_activate_v1',{p_invite:invite});pass('expired membership denies capability, editing and reactivation on next uncached RPC');
 const revoked=randomBytes(32).toString('hex'),expired=randomBytes(32).toString('hex');await query(`insert into vendor_pilot_invites(code_hash,expires_at,max_members,revoked) values(${q(sha(revoked))},now()+interval '1 day',1,true),(${q(sha(expired))},now()-interval '1 day',1,false);`);
 await fail(c,'vendor_pilot_activate_v1',{p_invite:revoked});await fail(c,'vendor_pilot_activate_v1',{p_invite:expired});pass('revoked and expired invitations rejected');
 fs.writeFileSync(path.join(out,'proof-fixtures.private.json'),JSON.stringify({stores,product:item,mediaPath},null,2),{flag:'wx'});
 for(const cl of clients)await cl.auth.signOut();
}else throw Error('Explicit prepare/database required');
