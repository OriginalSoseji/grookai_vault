import assert from 'node:assert/strict';

export function classifyPokemonSealedSourceChangesV1({mappings,source,publishedVariantIds}) {
  const key=r=>`${r.category_id??r.source_category_id}:${r.product_id??r.source_product_id}`;
  const index=new Map(source.map(r=>[key(r),r]));
  const byProduct=new Map();
  for(const row of source){
    const product=String(row.product_id??row.source_product_id);
    const rows=byProduct.get(product)??[];rows.push(row);byProduct.set(product,rows);
  }
  assert.equal(index.size,source.length,'Duplicate source identity');
  assert.ok(Array.isArray(publishedVariantIds)&&publishedVariantIds.every(id=>typeof id==='string'&&id.length>0),'Missing published identity evidence');
  const active=new Set(publishedVariantIds);
  return mappings.flatMap(m=>{
    assert.ok(typeof m.variant_id==='string'&&m.variant_id.length>0,'Missing mapped variant');
    const s=index.get(key(m));
    if(s?.source_active&&s.payload_hash===m.source_payload_hash)return [];
    // Fallback records observed category moves, but never proves mapped identity.
    const observed=s?[s]:(byProduct.get(String(m.source_product_id))??[]);
    const evidence=observed.length===1?observed[0]:null;
    return [{variant_id:m.variant_id,category_id:m.source_category_id,product_id:m.source_product_id,
      name:evidence?.name??null,expected_payload_hash:m.source_payload_hash,payload_hash:evidence?.payload_hash??null,
      observed_category_id:evidence?.category_id??evidence?.source_category_id??null,
      observed_sources:observed.map(r=>({category_id:r.category_id??r.source_category_id,
        product_id:r.product_id??r.source_product_id,name:r.name??null,payload_hash:r.payload_hash,source_active:r.source_active})),
      source_active:evidence?.source_active??null,active_publication:active.has(m.variant_id),
      disposition:active.has(m.variant_id)?'active_source_identity_drift':'excluded_pending_identity_review'}];
  });
}

export function evaluatePokemonSealedHealthV1({published,expected,oldestAgeDays,sourceAgeDays,
  newProducts=0,changedMappings=0,containedMappings=0,anonymousPrivilege=false,pointersAligned=true,imageServingVerified=false,automaticPricePublication=false}) {
  const findings=[];
  if (!Number.isSafeInteger(published)||published<=0||published!==expected) findings.push('published_count_mismatch');
  if (!Number.isFinite(oldestAgeDays)||oldestAgeDays>=4) findings.push('price_refresh_due_before_seven_day_expiry');
  if (!Number.isFinite(sourceAgeDays)||sourceAgeDays>2) findings.push('warehouse_source_stale');
  if (newProducts>0) findings.push('new_sealed_candidates_require_identity_review');
  const containmentValid=Number.isSafeInteger(containedMappings)&&containedMappings>=0&&containedMappings<=changedMappings;
  if(!containmentValid) findings.push('source_containment_evidence_invalid');
  if(changedMappings>0) findings.push(containmentValid&&containedMappings===changedMappings
    ?'source_identity_drift_quarantined':'source_identity_drift');
  if (anonymousPrivilege) findings.push('anonymous_rpc_grant');
  if (!pointersAligned) findings.push('image_price_release_mismatch');
  if (!imageServingVerified) findings.push('authenticated_image_serving_unverified');
  return {version:'POKEMON_SEALED_HEALTH_V1',status:findings.length?'attention_required':'healthy',
    findings,published,expected,oldestAgeDays,sourceAgeDays,newProducts,changedMappings,containedMappings,
    database_writes:0,storage_writes:0,automatic_price_publication:automaticPricePublication};
}
