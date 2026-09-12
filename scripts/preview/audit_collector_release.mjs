import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = 'C:/grookai_vault_collector_release';
const out = 'C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912';
const production = 'ycdxbpibncqcchqiihfz';
const staging = 'hcdpcbpnnvtbaezefjkd';
const token = execFileSync('pwsh', ['-NoProfile','-File','C:/grookai_vault_collector_authenticated/scripts/preview/collector_management_credential.ps1'], { encoding:'utf8', windowsHide:true }).trim();
assert.ok(token.startsWith('sbp_'));
mkdirSync(out, { recursive:true });
const functions = ['get_public_catalog_sets_v2','search_game_card_prints_v4','search_print_identity_v1',
  'get_market_pricing_read_model_v1','get_public_card_printing_options_v1','get_public_card_cameos_v2',
  'get_active_sealed_product_pricing_v3','get_active_pokemon_sealed_catalog_v1',
  ...Array.from(readFileSync(`${root}/apps/web/src/lib/binders/rpcContract.ts`,'utf8').matchAll(/:\s*"([a-z_0-9]+)"/g), m=>m[1])];
const names = functions.map(name=>{assert.match(name,/^[a-z0-9_]+$/);return `'${name}'`;}).join(',');
// This is an immutable SELECT inventory, not an arbitrary SQL runner. The server
// transaction is read-only even when it is accessed through the management API.
const sql = `BEGIN READ ONLY; SET LOCAL statement_timeout='20s';
SELECT jsonb_build_object(
 'read_only',current_setting('transaction_read_only'),
 'counts',jsonb_build_object('card_prints',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'card_print_traits',(select count(*) from public.card_print_traits)),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'definition_hash',md5(pg_get_functiondef(p.oid)),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'security_definer',p.prosecdef,'volatility',p.provolatile)), '[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${names})),
 'release_relations',(select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity)), '[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and (c.relname like '%release_control%' or c.relname like '%pricing%pointer%' or c.relname like '%cameo%' or c.relname='binder_feature_flags')),
 'catalog_columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type)) from information_schema.columns where table_schema='public' and table_name in ('games','sets','card_prints','sealed_product_game_release_controls','binder_feature_flags')),
 'binder_flags',(select jsonb_agg(jsonb_build_object('flag_key',flag_key,'enabled',enabled)) from public.binder_feature_flags),
 'game_controls',(select jsonb_agg(to_jsonb(c)) from public.catalog_game_release_controls c),
 'reader_definitions',(select jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_public_catalog_sets_v2','get_market_pricing_read_model_v1','get_active_sealed_product_pricing_v3','get_active_pokemon_sealed_catalog_v1')),
 'legacy_cameo_view',(select pg_get_viewdef(c.oid) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='v_card_print_cameos_public_v1')
) as evidence; ROLLBACK;`;
writeFileSync(`${out}/compatibility-query.sql`,sql);
const results = {};
for(const ref of [production,staging]) {
  const info = await fetch(`https://api.supabase.com/v1/projects/${ref}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  assert.equal(info.status,200);const p=await info.json();assert.equal(p.id,ref);assert.equal(p.organization_id,'rksadomjkuoxvrbhsmxu');
  const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error(`Read-only inventory failed ${ref}: ${r.status} ${(await r.text()).slice(0,300)}`);
  const rows=await r.json();const evidence=rows.find(row=>row.evidence)?.evidence;assert.equal(evidence?.read_only,'on');
  results[ref]={project:{id:p.id,status:p.status},...evidence};
}
assert.ok(results[production].counts.card_prints>=40000 && results[production].counts.sets>=150 && results[production].counts.card_print_traits>=5000,'Production environment minimums failed');
const vercelToken=JSON.parse(readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
const vr=await fetch('https://api.vercel.com/v9/projects/prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum?teamId=team_EFKFYSau9Gf8wEaix8zXgQZG',{headers:{Authorization:`Bearer ${vercelToken}`}});
assert.equal(vr.status,200);const v=await vr.json();
assert.equal(v.targets.production.id,'dpl_EZXp6L6jkUdVCGJPvAALFJSXc3JQ','Live deployment changed');
const receipt={checkedAt:new Date().toISOString(),querySha256:createHash('sha256').update(sql).digest('hex'),productionWrites:false,projects:results,live:{project:v.id,deployment:v.targets.production.id,nodeVersion:v.nodeVersion,rootDirectory:v.rootDirectory},missingProductionFunctions:functions.filter(name=>!results[production].functions.some(f=>f.name===name))};
writeFileSync(`${out}/compatibility.json`,JSON.stringify(receipt,null,2));
console.log(JSON.stringify({productionCounts:results[production].counts,missingProductionFunctions:receipt.missingProductionFunctions,live:receipt.live,productionWrites:false}));
