// Bounded read-only catalog inspection. This module never writes or grants apply authority.
import assert from 'node:assert/strict';
const tables=['raw_imports','card_prints','card_printings','card_printing_truth_reviews','card_print_species','jungle_edition_identity_links_v1'];
const identifier=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"';};
const normalize=rows=>[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,k.endsWith('_at')&&v?new Date(v).toISOString():v])));
export async function readJungleCatalogStateV5(client,rows,{legacyParents,legacyChildren,onQuery=()=>{}}){
 assert.ok(['UTC','Etc/UTC'].includes((await client.query("show timezone")).rows[0].TimeZone),'UTC inspection required');
 assert.equal(legacyParents.length,83);assert.equal(legacyChildren.length,84);
 assert.equal(new Set(legacyParents).size,83);assert.equal(new Set(legacyChildren).size,84);
 const ids=t=>rows[t].map(r=>r.id),parents=ids('card_prints'),children=ids('card_printings');
 const get=async(q,args)=>(await client.query(q,args)).rows.map(r=>r.row);
 const selected={
  raw_imports:await get("select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text) row from raw_imports t where id=$1::bigint",ids('raw_imports')),
  card_prints:await get('select to_jsonb(t) row from card_prints t where id=any($1::uuid[]) or gv_id=any($2::text[])',[parents,rows.card_prints.map(r=>r.gv_id)]),
  card_printings:await get('select to_jsonb(t) row from card_printings t where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or printing_gv_id=any($3::text[])',[children,parents,rows.card_printings.map(r=>r.printing_gv_id)]),
  card_printing_truth_reviews:await get('select to_jsonb(t) row from card_printing_truth_reviews t where id=any($1::uuid[]) or card_printing_id=any($2::uuid[])',[ids('card_printing_truth_reviews'),children]),
  card_print_species:await get('select to_jsonb(t) row from card_print_species t where id=any($1::uuid[]) or card_print_id=any($2::uuid[])',[ids('card_print_species'),parents]),
  jungle_edition_identity_links_v1:await get('select to_jsonb(t) row from jungle_edition_identity_links_v1 t where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or legacy_card_print_id=any($3::uuid[])',[ids('jungle_edition_identity_links_v1'),parents,[...new Set(rows.jungle_edition_identity_links_v1.map(r=>r.legacy_card_print_id))]]),
 };

 const fks=(await client.query("select ns.nspname schema_name,cl.relname table_name,a.attname column_name,ft.relname target_table,c.conname,pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_namespace ns on ns.oid=cl.relnamespace join pg_class ft on ft.oid=c.confrelid join pg_attribute a on a.attrelid=cl.oid and a.attnum=c.conkey[1] where c.contype='f' and c.confrelid in('public.card_prints'::regclass,'public.card_printings'::regclass) and cardinality(c.conkey)=1 order by 1,2,3,5")).rows;
 // Exact legacy references, including existing saved-copy IDs and pricing history.
 // New planned rows are excluded only by their frozen primary keys.
 const footprints=[];
 const digest=async(name,sql,args)=>{const start=Date.now();try{const result=(await client.query(sql,args)).rows[0];footprints.push({name,...result});onQuery({name,ms:Date.now()-start,status:'passed'});}catch(error){onQuery({name,ms:Date.now()-start,status:'failed',code:error.code});throw error;}};
 // PostgreSQL record text retains every column, including nested JSON and NULLs,
 // without constructing another JSON object for each historical price row.
 const aggregate=(table,where)=>"select count(*)::bigint::text rows,md5(coalesce(string_agg(md5(t::text),'' order by md5(t::text)),'')) digest from "+table+' t'+where;
 for(const fk of fks){assert.equal(fk.schema_name,'public');const args=[fk.target_table==='card_prints'?legacyParents:legacyChildren];let where=' where '+identifier(fk.column_name)+'=any($1::uuid[])';if(tables.includes(fk.table_name)){args.push(ids(fk.table_name));where+=' and id::text<>all($2::text[])';}await digest('fk:'+fk.table_name+':'+fk.column_name+':'+fk.conname,aggregate('public.'+identifier(fk.table_name),where),args);}
 // Global account/recovery records protect JSON and application references that
 // cannot be inferred from a direct card foreign key. No price-history shortcut.
 for(const table of ['vault_item_instances','vault_items','vault_item_instance_dispositions','vault_owners','slab_certs','vendor_receipt_books','vendor_sales_cart_receipts','vendor_sales_catalog_adds','vendor_stores','user_entitlements','market_price_current_publication','vendor_receipt_cloud_control','vendor_sales_cart_control'])await digest('global:'+table,aggregate('public.'+identifier(table),''),[]);
 for(const[table,values]of [['card_prints',legacyParents],['card_printings',legacyChildren]])await digest('legacy:'+table,aggregate('public.'+identifier(table),' where id=any($1::uuid[])'),[values]);
 return{selected:Object.fromEntries(tables.map(t=>[t,normalize(selected[t])])),foreignKeys:fks,footprints};
}
