import fs from 'node:fs';import assert from 'node:assert/strict';import test from 'node:test';
const read=n=>fs.readFileSync(new URL('../../supabase/migrations/'+n,import.meta.url),'utf8');
const foundation=read('20261001050000_jungle_edition_foundation_v1.sql');
const quarantine=read('20261001190000_reviewed_mapping_price_quarantine_v1.sql');
const integration=read('20261001203000_jungle_edition_price_reader_integration_v1.sql');
const normalize=s=>s.replace(/\s+/g,' ').trim();
const tail=s=>s.slice(s.indexOf('create or replace view public.v_market_price_current_v1 as')).replace(/commit;\s*$/,'');
const rejection=/not exists \(\s*select 1 from public\.external_mappings rejected_mapping\s*where rejected_mapping\.id = snapshot\.source_mapping_id\s*and rejected_mapping\.meta->'reviewed_invalidation'->>'reason_code'\s*= 'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT'\s*\)\s*and /g;
const edition=/and \(case when snapshot\.edition_assignment_id is not null or exists \([\s\S]*?else true end\)/g;
test('all Jungle current-reader semantics are preserved except added quarantine',()=>{
 assert.equal((tail(integration).match(rejection)||[]).length,3);
 assert.equal(normalize(tail(integration).replace(rejection,'')),normalize(tail(foundation)));
});
test('all deployed current-reader semantics are preserved except edition guard',()=>{
 const q=tail(quarantine),history=q.indexOf('create or replace view public.v_market_price_history_v1 as'),rpc=q.indexOf('create or replace function public.get_market_pricing_read_model_v1(');
 const current=q.slice(0,history)+q.slice(rpc);
 assert.equal((tail(integration).match(edition)||[]).length,3);
 assert.equal(normalize(tail(integration).replace(edition,'').replace("notify pgrst, 'reload schema';",'')),normalize(current));
});
test('history quarantine stays in the unchanged applied migration',()=>{
 assert.match(quarantine,/create or replace view public.v_market_price_history_v1/);
 assert.doesNotMatch(integration,/create or replace view public.v_market_price_history_v1/);
});
test('no data mutation or permission changes in integration',()=>{
 assert.doesNotMatch(integration,/\b(?:insert into|update public\.|delete from|truncate|grant|revoke|drop)\b/i);
 assert.equal((integration.match(/create or replace/gi)||[]).length,3);
});
test('binding body changes only the exact64 name alias',()=>{
 const old=foundation.split('create or replace function public.tcgplayer_jungle_binding_valid_v1')[1].split('as $$')[1].split('$$;')[0];
 const body=integration.split('AS $function$')[1].split('$function$')[0];
 assert.equal(normalize(body.replace(" when card.number_plain = '64' and card.name = 'Poké Ball' then 'Poke Ball'",'')),normalize(old));
});
