import {isDeepStrictEqual} from 'node:util';
import {reviewXyPromoFamily} from '../pokemon/xy_promo_family_review_v1.mjs';
export async function captureXyPromoSourceProof(db,snapshot,checklists,{lock=false}={}){
 const ids=snapshot.parents.map(p=>p.id),sourceIds=['xyp-XY177','xyp-XY198'];
 const q=async(sql,args)=>(await db.query(sql,args)).rows.map(x=>x.row);
 if(lock){
  await db.query('select id from public.external_mappings where card_print_id=any($1::uuid[]) for share',[ids]);
  await db.query('select id from public.card_print_identity where card_print_id=any($1::uuid[]) and is_active for share',[ids]);
  await db.query('select id from public.card_print_traits where card_print_id=any($1::uuid[]) for share',[ids]);
 }
 const identities=await q('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[]) and is_active order by id',[ids]);
 const traits=await q('select to_jsonb(t) row from public.card_print_traits t where card_print_id=any($1::uuid[]) order by id',[ids]);
 const sets=await q(`select to_jsonb(s) row from public.sets s where id=any($1::uuid[]) ${lock?'for share':''}`,[[...new Set(snapshot.parents.map(p=>p.set_id))]]);
 const mappings=await q(`with a as(select m.*,count(*) over(partition by source,external_id)::int owners,
  count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings m where active)
  select to_jsonb(a) row from a where card_print_id=any($1::uuid[]) order by id`,[ids]);
 const raw=(await db.query(`select id::text,source,status,ingested_at,md5(payload::text) payload_md5,payload from public.raw_imports
  where source in ('tcgdex','pokemonapi') and coalesce(payload->>'_external_id',payload->'card'->>'id',payload->>'id')=any($1::text[])
  order by source,ingested_at desc,id desc`,[sourceIds])).rows.map(x=>JSON.parse(JSON.stringify(x)));
 const products=(await db.query(`select to_jsonb(p) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_products p
  where product_id=any($1::int[]) order by product_id ${lock?'for share':''}`,[[123438,129898]])).rows;
 const groups=(await db.query(`select to_jsonb(g) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_groups g
  where group_id=1451 ${lock?'for share':''}`)).rows;
 const runIds=[...new Set([...products,...groups].map(x=>x.row.last_seen_run_id))];
 const runs=(await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id',[runIds])).rows.map(x=>JSON.parse(JSON.stringify(x)));
 const groupSets=(await db.query(`select product.group_id,count(distinct p.set_id)::int set_count,array_agg(distinct p.set_code) set_codes
  from public.tcgcsv_source_products product join public.external_mappings m on m.source='tcgplayer' and m.active and m.external_id=product.product_id::text
  join public.card_prints p on p.id=m.card_print_id where product.group_id=1451 group by 1`)).rows;
 for(const [label,now,before] of [['identities',identities,snapshot.identities],['traits',traits,snapshot.traits],['sets',sets,snapshot.sets],
  ['mappings',mappings,snapshot.mappings],['raw',raw,snapshot.raw],['products',products,snapshot.products],['groups',groups,snapshot.groups],['groupSets',groupSets,snapshot.groupSets]])
  if(!isDeepStrictEqual(now,before))throw Error(`XY_PROMO_${label.toUpperCase()}_DRIFT`);
 const reviews=[];
 for(const parent of snapshot.parents){
  const own=mappings.filter(m=>m.card_print_id===parent.id),product=products.find(p=>String(p.row.product_id)===own.find(m=>m.source==='tcgplayer')?.external_id)?.row;
  const group=groups.find(g=>g.row.group_id===product?.group_id)?.row;
  const input={parent,set:sets.find(s=>s.id===parent.set_id),identities:identities.filter(i=>i.card_print_id===parent.id),
   traits:traits.filter(t=>t.card_print_id===parent.id),mappings:own,raw,product,group,groupSets:groupSets.find(g=>g.group_id===group?.group_id),runs};
  const article=checklists[parent.number],review=reviewXyPromoFamily(input,article?.receipt,article?.bytes);
  if(review.status!=='family_corroborated_review_only')throw Error(`XY_PROMO_REVIEW_${review.status}`);
  reviews.push(review);
 }
 return {identities,traits,sets,mappings,raw,products,groups,groupSets,runs,reviews};
}
