import {CONDITIONS,FINISHES} from './tcgtracking_condition_reference_v1.mjs';

// Retain original per-SKU objects, including missing prices, for scoped targets.
// Full-response bytes remain in the hashed acquisition artifact, not duplicated in DB.
export function projectScopedUpstream(response,targets){
  const keys=new Set(targets.map(row=>`${row.product_id}|${row.finish_key}|${row.language}`));
  const products={};let retained=0;
  for(const [product,skus]of Object.entries(response.products)){
    const selected=Object.entries(skus).filter(([,sku])=>keys.has(`${product}|${FINISHES[sku.var]}|${sku.lng}`)&&CONDITIONS.includes(sku.cnd));
    if(selected.length){products[product]=Object.fromEntries(selected);retained+=selected.length;}
  }
  return {...response,products,_projection:{kind:'exact_target_language_finish_skus',retained_sku_count:retained,provider_full_sku_count:response.sku_count}};
}
