import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const out='C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912';
const ref='ycdxbpibncqcchqiihfz';
assert.equal(new URL(process.env.SUPABASE_URL).hostname,`${ref}.supabase.co`);
const token=execFileSync('pwsh',['-NoProfile','-File','C:/grookai_vault_collector_authenticated/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true}).trim();
assert.ok(token.startsWith('sbp_'));
const query=`BEGIN READ ONLY; SET LOCAL statement_timeout='20s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT jsonb_build_object(
 'read_only',current_setting('transaction_read_only'), 'role',current_user,
 'note','SQL authenticated-role contract probe only; not an actual user login',
 'sets',jsonb_build_object(
   'pokemon',(select count(*) from public.get_public_catalog_sets_v2('pokemon')),
   'mtg',(select count(*) from public.get_public_catalog_sets_v2('mtg')),
   'one_piece',(select count(*) from public.get_public_catalog_sets_v2('one_piece'))),
 'set_samples',(select jsonb_agg(t) from (select game,code,name,card_count,hero_image_url from public.get_public_catalog_sets_v2('mtg') limit 2) t),
 'pokemon_sealed',(select coalesce(jsonb_agg(t),'[]') from public.get_active_pokemon_sealed_catalog_v1('pokemon',null,2,0) t),
 'mtg_sealed',(select coalesce(jsonb_agg(t),'[]') from public.get_active_sealed_product_pricing_v3('mtg',null,2,0) t),
 'blastoise_pricing',(select coalesce(jsonb_agg(t),'[]') from public.get_market_pricing_read_model_v1(
   ARRAY(select id from public.card_prints where gv_id='GV-PK-MEW-200'),
   ARRAY(select p.id from public.card_printings p join public.card_prints c on c.id=p.card_print_id where c.gv_id='GV-PK-MEW-200')) t)
) as evidence; ROLLBACK;`;
mkdirSync(out,{recursive:true});writeFileSync(`${out}/governed-read-query.sql`,query);
const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(60000)});
if(!r.ok)throw Error(`Read-only probe failed ${r.status}: ${(await r.text()).slice(0,400)}`);
const rows=await r.json();const evidence=rows.find(row=>row.evidence)?.evidence;
assert.equal(evidence.read_only,'on');assert.equal(evidence.role,'authenticated');
writeFileSync(`${out}/governed-read-probe.json`,JSON.stringify({checkedAt:new Date().toISOString(),productionWrites:false,...evidence},null,2));
console.log(JSON.stringify({sets:evidence.sets,sealed:{pokemon:evidence.pokemon_sealed.length,mtg:evidence.mtg_sealed.length},pricing:evidence.blastoise_pricing.map(row=>({scope:row.pricing_scope,status:row.status,freshness:row.freshness})),actualLoginTest:false}));
