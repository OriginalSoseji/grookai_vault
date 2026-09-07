import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {withPokemonSealedProbeSessionV1} from '../../backend/pricing/pokemon_sealed_live_probe_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(args.origin&&args.out);
const origin=new URL(args.origin).origin;
assert.ok(origin==='https://grookaivault.com'||/^https:\/\/grookai-vault-[a-z0-9]+-sosejis-projects\.vercel\.app$/.test(origin));
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
delete process.env.GV_USER_ACCESS_TOKEN;
const {createBackendClient}=await import('../../backend/supabase_backend_client.mjs');
const webRequire=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createServerClient}=webRequire('@supabase/ssr');
const evidence=[];
await withPokemonSealedProbeSessionV1(createBackendClient(),async(caller,session)=>{
  let cookies=[];
  const ssr=createServerClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{
    cookies:{getAll:()=>cookies,setAll:values=>{cookies=values;}}});
  const {error}=await ssr.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
  assert.ok(!error&&cookies.length,'Test SSR cookie setup failed');
  const headers={Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; ')};
  const checks=[{query:'',form:'',language:'',page:1},{query:'',form:'',language:'',page:2},
    {query:'',form:'booster_box',language:'ja',page:1},{query:'Pikachu',form:'',language:'',page:1}];
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
  for(const check of checks){
    const params=new URLSearchParams({q:check.query,form:check.form,lang:check.language,page:String(check.page)});
    const start=Date.now(),response=await fetch(`${origin}/sealed/pokemon?${params}`,{headers,redirect:'manual',signal:AbortSignal.timeout(60000)});
    assert.equal(response.status,200,'Authenticated sealed page failed');
    const html=await response.text();assert.ok(html.includes('Pokemon sealed products'),'Missing sealed heading');
    const {data:rows,error:rpcError}=await caller.rpc('get_active_pokemon_sealed_catalog_v1',{
      p_game_key:'pokemon',p_query:check.query||null,p_package_form:check.form||null,p_language_code:check.language||null,
      p_limit:24,p_offset:(check.page-1)*24});
    assert.ok(!rpcError&&rows.length,'Expected catalog rows missing');
    for(const row of rows){assert.ok(html.includes(escape(row.canonical_name)),`Rendered product missing: ${row.variant_id}`);
      assert.ok(html.includes(row.image_object_path),'Rendered image path missing');}
    const productSection=html.match(/<section\b[^>]*aria-label="Pokemon sealed products"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(productSection,'Product grid missing');
    const imageSources=[...productSection.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(imageSources.length,rows.length,'Product image count mismatch');
    for(const source of imageSources){
      const imageUrl=new URL(source.replaceAll('&amp;','&'),origin);
      assert.equal(imageUrl.origin,new URL(process.env.SUPABASE_URL).origin,'Unexpected image host');
      assert.ok(imageUrl.pathname.startsWith('/storage/v1/object/sign/user-card-images/sealed/pokemon/'),'Unexpected image namespace');
    }
    evidence.push({...check,status:response.status,rows:rows.length,duration_ms:Date.now()-start,all_expected_names_and_self_hosted_images:true});
  }
});
const anonymous=await fetch(`${origin}/sealed/pokemon`,{redirect:'manual',signal:AbortSignal.timeout(30000)});
assert.ok([302,303,307,308].includes(anonymous.status)&&anonymous.headers.get('location')?.includes('/login'));
await fs.mkdir(args.out,{recursive:true});
const summary={status:'passed',origin,authenticated_checks:evidence,anonymous_login_redirect:true,
  database_catalog_writes:0,storage_writes:0,auth_session:'existing_store_review_account_revoked_locally',timestamp:new Date().toISOString()};
await fs.writeFile(path.join(args.out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
