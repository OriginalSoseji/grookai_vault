import fs from 'node:fs';import assert from 'node:assert/strict';import test from 'node:test';
const read=n=>fs.readFileSync(new URL('../../supabase/migrations/'+n,import.meta.url),'utf8');
const foundation=read('20261001050000_jungle_edition_foundation_v1.sql');
const correction=read('20261001211000_jungle_edition_current_artifact_date_v1.sql');
const lineage=read('20261001213000_jungle_edition_artifact_date_lineage_v1.sql');
const scoped=read('20261001220000_jungle_edition_scoped_lineage_validation_v1.sql');
const readiness=read('20261001223000_jungle_edition_resolved_readiness_v1.sql');
const view=s=>s.slice(s.indexOf('create or replace view public.v_tcgplayer_jungle_edition_assignment_candidates_v1')).split('from resolved;')[0]+'from resolved;';
const normalize=s=>s.replace(/\s+/g,' ').trim();
test('artifact correction preserves the entire assignment view except nullable current date',()=>{
 const old="and artifact.artifact_kind = 'prices' and artifact.observed_on = observation.observed_on";
 const revised="and artifact.artifact_kind = 'prices' and (artifact.observed_on is null or artifact.observed_on = observation.observed_on)";
 assert.equal(normalize(view(correction)).replace(revised,old),normalize(view(foundation)));
});
test('source run date, exact provenance and freshness remain required',()=>{
 for(const clause of ['run.observed_on = observation.observed_on','artifact.sync_run_id = run.id','artifact.run_key = run.run_key',"run.sync_mode = 'current_full_sync'","run.status = 'completed'",'artifact.http_status = 200',"run.finished_at >= now() - interval '36 hours'",'artifact.category_id = observation.category_id','artifact.group_id = observation.group_id'])assert.ok(correction.includes(clause),clause);
});
test('correction neither edits captured source data nor changes privileges',()=>{
 assert.equal((correction.match(/create or replace/gi)||[]).length,1);
 assert.doesNotMatch(correction,/\b(?:insert into|update public\.|delete from|truncate|grant|revoke|drop)\b/i);
});
test('immutable assignment records actual artifact date independently of quote date',()=>{
 assert.equal(normalize(view(lineage)).replace(" 'artifact_observed_on',artifact.observed_on,",''),normalize(view(correction)));
});
test('lineage validator changes only comparison to frozen actual artifact date',()=>{
 const fn=s=>s.slice(s.indexOf('create or replace function public.jungle_edition_price_row_valid_v1')).split('$$;')[0]+'$$;';
 assert.equal(normalize(fn(lineage)).replace("{source,artifact_observed_on}","{source,observed_on}"),normalize(fn(foundation)));
 assert.doesNotMatch(lineage,/\b(?:insert into|update public\.|delete from|truncate|grant|revoke|drop)\b/i);
});
test('bounded candidate builder preserves every competitor in the product partition',()=>{
 const query=s=>s.slice(s.indexOf('with source_run as materialized')).split('from resolved;')[0]+'from resolved;';
 assert.equal(normalize(query(scoped)).replace(' where observation.product_id = any(p_product_ids)',''),normalize(query(lineage)));
 assert.match(scoped,/partition by observation.product_id,/);
});
test('scoped validation preserves all row checks and exact live assignment comparisons',()=>{
 const fn=s=>s.slice(s.indexOf('create or replace function public.jungle_edition_price_row_valid_v1')).split('$$;')[0]+'$$;';
 const tail=s=>s.slice(s.indexOf('  if not found then'));
 assert.equal(tail(fn(scoped)),tail(fn(lineage)));
 for(const field of ['source_observation_id','source_sync_run_id','binding_id','assignment_sha256','assignment_payload'])assert.ok(scoped.includes(`candidate.${field} = assignment.${field}`));
 assert.match(scoped,/revoke all on function.*from public,anon,authenticated,service_role/);
 assert.match(scoped,/grant execute on function.*to service_role/);
});
test('readiness optimization changes only the already-equal joined identity argument',()=>{
 assert.equal(normalize(view(readiness)).replace('get_jungle_edition_resolution_v1(identity.card_print_id)','get_jungle_edition_resolution_v1(card.id)'),normalize(view(lineage)));
 const fn=s=>s.slice(s.indexOf('create or replace function public.tcgplayer_jungle_assignment_candidates_for_products_v1')).split('$$;')[0]+'$$;';
 assert.equal(normalize(fn(readiness)).replace('get_jungle_edition_resolution_v1(identity.card_print_id)','get_jungle_edition_resolution_v1(card.id)'),normalize(fn(scoped)));
 assert.match(readiness,/join public.card_prints card on card.id = identity.card_print_id/);
});
