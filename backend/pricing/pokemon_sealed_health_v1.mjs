export function evaluatePokemonSealedHealthV1({published,expected,oldestAgeDays,sourceAgeDays,
  newProducts=0,changedMappings=0,anonymousPrivilege=false,pointersAligned=true}) {
  const findings=[];
  if (!Number.isSafeInteger(published)||published<=0||published!==expected) findings.push('published_count_mismatch');
  if (!Number.isFinite(oldestAgeDays)||oldestAgeDays>=4) findings.push('price_refresh_due_before_seven_day_expiry');
  if (!Number.isFinite(sourceAgeDays)||sourceAgeDays>2) findings.push('warehouse_source_stale');
  if (newProducts>0) findings.push('new_sealed_candidates_require_identity_review');
  if (changedMappings>0) findings.push('source_identity_drift');
  if (anonymousPrivilege) findings.push('anonymous_rpc_grant');
  if (!pointersAligned) findings.push('image_price_release_mismatch');
  return {version:'POKEMON_SEALED_HEALTH_V1',status:findings.length?'attention_required':'healthy',
    findings,published,expected,oldestAgeDays,sourceAgeDays,newProducts,changedMappings,
    database_writes:0,storage_writes:0,automatic_price_publication:false};
}
