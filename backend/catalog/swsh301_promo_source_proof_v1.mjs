import {isDeepStrictEqual} from 'node:util';
import {evaluateSwsh301Candidate} from '../../docs/audits/swsh301_promo_rarity_review_20261119/swsh301_rarity_candidate_20261119.mjs';
const id='af831a08-6e93-4e7a-8e8b-1b02d38c9ff1';
export async function captureSwsh301SourceProof(db,frozen,evidence,{lock=false}={}){
 const rows=async(sql,args)=>(await db.query(sql,args)).rows.map(x=>x.row);
 if(lock){
  await db.query('select id from public.external_mappings where card_print_id=$1::uuid for share',[id]);
  await db.query('select id from public.card_print_identity where card_print_id=$1::uuid and is_active for share',[id]);
  await db.query('select id from public.card_print_traits where card_print_id=$1::uuid for share',[id]);
  await db.query('select id from public.card_printings where card_print_id=$1::uuid for share',[id]);
 }
 const sets=await rows(`select to_jsonb(s) row from public.sets s where id=$1::uuid ${lock?'for share':''}`,[frozen.parents[0].set_id]);
 const identities=await rows('select to_jsonb(i) row from public.card_print_identity i where card_print_id=$1::uuid and is_active order by id',[id]);
 const traits=await rows('select to_jsonb(t) row from public.card_print_traits t where card_print_id=$1::uuid order by id',[id]);
 const printings=await rows('select to_jsonb(p) row from public.card_printings p where card_print_id=$1::uuid order by id',[id]);
 const mappings=await rows(`with a as(select m.*,count(*) over(partition by source,external_id)::int owners,
  count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings m where active)
  select to_jsonb(a) row from a where card_print_id=$1::uuid order by id`,[id]);
 const raw=(await db.query(`select id::text,source,status,ingested_at,md5(payload::text) payload_md5,payload from public.raw_imports
  where source in ('tcgdex','pokemonapi') and coalesce(payload->>'_external_id',payload->'card'->>'id',payload->>'id')=$1 order by source,ingested_at desc,id desc`,['swshp-SWSH301'])).rows.map(x=>JSON.parse(JSON.stringify(x)));
 const products=(await db.query(`select to_jsonb(p) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_products p where product_id=$1 ${lock?'for share':''}`,[505996])).rows;
 const groups=(await db.query(`select to_jsonb(g) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_groups g where group_id=$1 ${lock?'for share':''}`,[2545])).rows;
 const runIds=[...new Set([...products,...groups].map(x=>x.row.last_seen_run_id).filter(Boolean))];
 const runs=(await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id',[runIds])).rows.map(x=>JSON.parse(JSON.stringify(x)));
 const groupSets=(await db.query(`select product.group_id,count(distinct p.set_id)::int set_count,array_agg(distinct p.set_code) set_codes
  from public.tcgcsv_source_products product join public.external_mappings m on m.source='tcgplayer' and m.active and m.external_id=product.product_id::text
  join public.card_prints p on p.id=m.card_print_id where product.group_id=$1 group by 1`,[2545])).rows;
 for(const [name,current] of Object.entries({sets,identities,traits,printings,mappings,raw,products,groups,runs,groupSets}))
  if(!isDeepStrictEqual(current,frozen[name]))throw Error(`SWSH301_${name.toUpperCase()}_DRIFT`);
 const review=evaluateSwsh301Candidate({...frozen,sets,identities,traits,printings,mappings,raw,products,groups,runs,groupSets},evidence);
 if(review.status!=='review_candidate_only')throw Error(`SWSH301_REVIEW_${review.status}`);
 return {sets,identities,traits,printings,mappings,raw,products,groups,runs,groupSets,review};
}
