// Exact target parents and their shared catalog, ownership, image and pricing dependencies.
const tables=[['card_print_identity','card_print_id'],['card_printings','card_print_id'],
 ['external_mappings','card_print_id'],['external_mapping_aliases','canonical_card_print_id'],
 ['card_print_species','card_print_id'],['card_print_cameos','card_print_id'],['card_print_traits','card_print_id'],
 ['card_print_image_faces','card_print_id'],['vault_item_instances','card_print_id'],['vault_items','card_id'],
 ['card_print_price_curves','card_print_id'],['price_observations','print_id'],['market_prices','card_id']];
export async function captureXyPromoProtectedState(db,ids){
 const result={parent_other_fields:(await db.query(`select count(*)::int rows,md5(coalesce(string_agg(md5((to_jsonb(p)-'rarity')::text),'' order by id),'')) digest
  from public.card_prints p where id=any($1::uuid[])`,[ids])).rows[0]};
 for(const [table,column] of tables)result[table]=(await db.query(`select count(*)::int rows,
  coalesce(bit_xor(hashtextextended(t.id::text||':'||t.xmin::text,0)),0)::text row_versions_1,
  coalesce(bit_xor(hashtextextended(t.id::text||':'||t.xmin::text,8675309)),0)::text row_versions_2
  from public.${table} t where ${column}=any($1::uuid[])`,[ids])).rows[0];
 result.market_price_current_publication=(await db.query(`select count(*)::int rows,
  md5(coalesce(string_agg(md5(to_jsonb(p)::text),'' order by md5(to_jsonb(p)::text)),'')) digest from public.market_price_current_publication p`)).rows[0];
 result.market_price_publication_snapshots=(await db.query(`select count(*)::int rows,
  coalesce(bit_xor(hashtextextended(s.id::text||':'||s.xmin::text,0)),0)::text row_versions_1,
  coalesce(bit_xor(hashtextextended(s.id::text||':'||s.xmin::text,8675309)),0)::text row_versions_2
  from public.market_price_publication_snapshots s where s.card_print_id=any($1::uuid[])
  and s.publication_set_id in(select publication_set_id from public.market_price_current_publication)`,[ids])).rows[0];
 result.market_price_qualification_decisions=(await db.query(`select count(*)::int rows,
  coalesce(bit_xor(hashtextextended(d.id::text||':'||d.xmin::text,0)),0)::text row_versions_1,
  coalesce(bit_xor(hashtextextended(d.id::text||':'||d.xmin::text,8675309)),0)::text row_versions_2
  from public.market_price_qualification_decisions d where d.id in(select s.qualification_decision_id
   from public.market_price_publication_snapshots s where s.card_print_id=any($1::uuid[])
   and s.publication_set_id in(select publication_set_id from public.market_price_current_publication))`,[ids])).rows[0];
 result.sets=(await db.query(`select count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(s)::text),'' order by s.id),'')) digest
  from public.sets s where id in(select set_id from public.card_prints where id=any($1::uuid[]))`,[ids])).rows[0];
 return result;
}
