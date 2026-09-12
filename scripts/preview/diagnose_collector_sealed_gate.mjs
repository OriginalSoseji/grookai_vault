import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const out='C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912';
const token=execFileSync('pwsh',['-NoProfile','-File','C:/grookai_vault_collector_authenticated/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true}).trim();
assert.ok(token.startsWith('sbp_'));
const query=`BEGIN READ ONLY; SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object('read_only',current_setting('transaction_read_only'),'as_of',current_date,
 'controls',(select jsonb_agg(to_jsonb(c)) from public.sealed_product_game_release_controls c where game_key='mtg'),
 'price_pointer',(select jsonb_agg(to_jsonb(p)) from public.sealed_product_release_pointer p where game_key='mtg'),
 'image_pointer',(select jsonb_agg(jsonb_build_object('release_id',p.image_release_id,'source_price_release_id',r.source_price_release_id,'state',r.release_state)) from public.sealed_product_image_release_pointer p join public.sealed_product_image_releases r on r.id=p.image_release_id where p.game_key='mtg'),
 'qualifications',(select jsonb_build_object('count',count(*),'min_observed_on',min(q.observed_on),'max_observed_on',max(q.observed_on),'fresh_7_days',count(*) filter(where q.observed_on between current_date-7 and current_date)) from public.sealed_product_release_pointer p join public.sealed_product_release_members m on m.release_id=p.release_id join public.sealed_product_pricing_lane_qualifications q on q.id=m.qualification_id where p.game_key='mtg')
) as evidence; ROLLBACK;`;
writeFileSync(`${out}/sealed-diagnostic-query.sql`,query);
const r=await fetch('https://api.supabase.com/v1/projects/ycdxbpibncqcchqiihfz/database/query',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(30000)});
if(!r.ok)throw Error(`Read-only diagnosis failed ${r.status}: ${(await r.text()).slice(0,300)}`);
const rows=await r.json();const evidence=rows.find(row=>row.evidence)?.evidence;assert.equal(evidence.read_only,'on');
writeFileSync(`${out}/sealed-diagnostic.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify({asOf:evidence.as_of,qualifications:evidence.qualifications,priceRelease:evidence.price_pointer?.[0]?.release_id,imageSourcePriceRelease:evidence.image_pointer?.[0]?.source_price_release_id,pointersMatch:evidence.price_pointer?.[0]?.release_id===evidence.image_pointer?.[0]?.source_price_release_id}));
