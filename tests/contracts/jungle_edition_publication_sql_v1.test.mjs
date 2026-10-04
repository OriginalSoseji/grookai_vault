import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=new URL('../../supabase/migrations/',import.meta.url);
const candidate=fs.readFileSync(new URL('20261001050000_jungle_edition_foundation_v1.sql',root),'utf8');
test('edition projection leaves source-run and product selectors available for indexed paging',()=>{
 const projection=candidate.slice(candidate.indexOf('create or replace view public.v_tcgplayer_market_qualification_candidates_v2'),candidate.indexOf('-- Used only after narrowing to edition rows.'));
 const select=projection.slice(0,projection.indexOf('from public.v_tcgplayer_market_qualification_candidates_v1'));
 for(const field of ['source_observation_id','source_sync_run_id','source_product_id','category_id','group_id','source_subtype_name','source_observed_on']){
  assert.match(select,new RegExp(`candidate\\.${field}\\s*[,\\n]`));
  assert.doesNotMatch(select,new RegExp(`adapted\\.${field}\\b`));
 }
 assert.doesNotMatch(select,/adapted\.\*/);
 const worker=fs.readFileSync(new URL('../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs',import.meta.url),'utf8');
 assert.match(worker,/candidate\.card_printing_id = any\(\$1::uuid\[\]\)[\s\S]*?candidate\.source_product_id = any\(\$3::integer\[\]\)/);
});
const predicate=`and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      `;
for(const [name,file,pattern,count]of [
 ['current price view','20260804220000_tcgplayer_market_printing_truth_quarantine_v1.sql',/create or replace view public\.v_market_price_current_v1 as[\s\S]*?where snapshot\.snapshot_rank = 1;/,1],
 ['request-scoped pricing RPC','20260819014000_tcgplayer_market_request_scoped_current_read_v1.sql',/create or replace function public\.get_market_pricing_read_model_v1\([\s\S]*?\$\$;/,2],
]) test(name+' preserves its original body except the reviewed edition read predicate',()=>{
 const before=fs.readFileSync(new URL(file,root),'utf8').match(pattern)?.[0].replaceAll('\r\n','\n');
 const after=candidate.match(pattern)?.[0].replaceAll('\r\n','\n');
 assert.ok(before&&after);assert.equal(after.split(predicate).length-1,count);
 assert.equal(after.replaceAll(predicate,''),before);
});
