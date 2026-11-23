import {isDeepStrictEqual} from 'node:util';
import {evaluateXySuffixCandidate} from '../../docs/audits/xy_yellow_a_promo_review_20261119/xy_suffix_rarity_candidate_20261119.mjs';
const ids=['2928d70e-b3ff-4c8e-914f-a361cff27396','46b9dcd9-3f90-4770-890e-6817eed4d388'];
export async function captureYellowASourceProof(db,frozen,evidence,{lock=false}={}){
 const rows=async(sql,args)=>(await db.query(sql,args)).rows.map(r=>r.row);
 if(lock){
  await db.query('select id from public.external_mappings where card_print_id=any($1::uuid[]) for share',[ids]);
  await db.query('select id from public.card_print_identity where card_print_id=any($1::uuid[]) and is_active for share',[ids]);
  await db.query('select id from public.card_print_traits where card_print_id=any($1::uuid[]) for share',[ids]);
 }
 const sets=await rows(`select to_jsonb(s) row from public.sets s where id=any($1::uuid[]) order by id ${lock?'for share':''}`,[[...new Set(frozen.parents.map(p=>p.set_id))]]);
 const identities=await rows('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[]) and is_active order by id',[ids]);
 const traits=await rows('select to_jsonb(t) row from public.card_print_traits t where card_print_id=any($1::uuid[]) order by id',[ids]);
 const mappings=await rows(`with a as(select m.*,count(*) over(partition by source,external_id)::int owners,
  count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings m where active)
  select to_jsonb(a) row from a where card_print_id=any($1::uuid[]) order by id`,[ids]);
 const raw=(await db.query(`select id::text,source,status,ingested_at,md5(payload::text) payload_md5,payload from public.raw_imports
  where source in ('tcgdex','pokemonapi') and coalesce(payload->>'_external_id',payload->'card'->>'id',payload->>'id')=any($1::text[])
  order by source,ingested_at desc,id desc`,[['xyp-XY67a','xyp-XY200a']])).rows.map(r=>JSON.parse(JSON.stringify(r)));
 const products=(await db.query(`select to_jsonb(p) row,md5(p.raw_payload::text) raw_md5,
  coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from public.external_mappings m where m.source='tcgplayer' and m.active and m.external_id=p.product_id::text),'[]'::jsonb) active_mappings
  from public.tcgcsv_source_products p where p.category_id=3 and exists (select 1 from jsonb_array_elements(coalesce(p.extended_data,'[]'::jsonb)) x
  where x->>'name'='Number' and lower(x->>'value')=any($1::text[])) order by p.product_id ${lock?'for share':''}`,[['xy67a','xy200a']])).rows;
 const groups=(await db.query(`select to_jsonb(g) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_groups g where group_id=$1 ${lock?'for share':''}`,[1938])).rows;
 const runIds=[...new Set([...products,...groups].map(x=>x.row.last_seen_run_id).filter(Boolean))];
 const runs=(await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id',[runIds])).rows.map(r=>JSON.parse(JSON.stringify(r)));
 for(const [name,current] of Object.entries({sets,identities,traits,mappings,raw,products,groups,runs}))
  if(!isDeepStrictEqual(current,frozen[name]))throw Error(`YELLOW_A_${name.toUpperCase()}_DRIFT`);
 const snapshot={...frozen,sets,identities,traits,mappings,raw,products,groups,runs},reviews=[];
 for(const number of ['XY200a','XY67a']){
  const result=evaluateXySuffixCandidate(snapshot,number,evidence[number]);
  if(result.status!=='review_candidate_only')throw Error(`YELLOW_A_REVIEW_${result.status}`);
  reviews.push(result);
 }
 return {sets,identities,traits,mappings,raw,products,groups,runs,reviews};
}
