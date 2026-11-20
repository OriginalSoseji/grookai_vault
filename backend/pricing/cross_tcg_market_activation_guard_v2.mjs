import {TCGPLAYER_MARKET_PUBLICATION_POLICY_V2} from './tcgplayer_market_publication_policy_v2.mjs';

export const CROSS_TCG_MARKET_SCOPE_V2='CROSS_TCG_MARKET_SCOPE_V2';
export const CROSS_TCG_MAX_COVERAGE_DROP_V2=0.001;

// A calendar/source refresh can reuse an already qualified runtime. The initial
// V2 publication, and any changed worker version, require a full verified shadow.
export async function readCrossTcgMarketBootstrapV2(client,workerVersion){
 const {rows}=await client.query(`select
  exists(select 1 from public.market_price_current_publication pointer
   join public.market_price_publication_sets publication on publication.id=pointer.publication_set_id and publication.run_id=pointer.run_id
   join public.market_price_pipeline_runs run on run.id=pointer.run_id
   where pointer.singleton and publication.publication_state='published'
    and run.state in('published','verified') and run.reconciliation_state='reconciled'
    and run.policy_version=$1 and run.worker_version=$2
    and run.reconciliation->>'source_scope_version'=$3
    and run.reconciliation->'complete_source_selection'='true'::jsonb) current_verified,
  exists(select 1 from public.market_price_pipeline_runs run
   where run.state='shadow_verified' and run.reconciliation_state='reconciled'
    and run.required_phase_count>0 and run.succeeded_phase_count=run.required_phase_count
    and run.policy_version=$1 and run.worker_version=$2
    and run.reconciliation->>'source_scope_version'=$3
    and run.reconciliation->'complete_source_selection'='true'::jsonb) shadow_verified`,
 [TCGPLAYER_MARKET_PUBLICATION_POLICY_V2,workerVersion,CROSS_TCG_MARKET_SCOPE_V2]);
 const proof=rows[0];
 if(!proof||(proof.current_verified!==true&&proof.shadow_verified!==true))throw Error('cross_tcg_market_initial_full_shadow_required');
 return proof;
}

export function evaluateCrossTcgMarketActivationV2({reconciliation={},counts={}}={}){
 const findings=[];
 if(reconciliation.source_scope_version!==CROSS_TCG_MARKET_SCOPE_V2||reconciliation.complete_source_selection!==true)findings.push('incomplete_cross_tcg_source_selection');
 for(const [domain,current,next] of [
  ['one_piece',counts.one_piece_baseline_eligible,counts.one_piece_eligible],
  ['japanese_pokemon',counts.japanese_baseline_eligible,counts.japanese_eligible],
 ]){
  const baseline=current,selected=next;
  if(!Number.isSafeInteger(baseline)||baseline<0||!Number.isSafeInteger(selected)||selected<0){findings.push(domain+'_invalid_coverage');continue;}
  if(selected===0)findings.push(domain+'_missing_qualified_prices');
  if(selected<Math.ceil(baseline*(1-CROSS_TCG_MAX_COVERAGE_DROP_V2)))findings.push(domain+'_material_coverage_loss');
 }
 return{version:CROSS_TCG_MARKET_SCOPE_V2,ready_for_production:findings.length===0,findings};
}

export async function assertCrossTcgMarketActivationV2(client,{runId,workerVersion,counts}){
 const bootstrap=await readCrossTcgMarketBootstrapV2(client,workerVersion);
 const {rows}=await client.query('select reconciliation from public.market_price_pipeline_runs where id=$1',[runId]);
 const result=evaluateCrossTcgMarketActivationV2({reconciliation:rows[0]?.reconciliation,counts});
 if(!result.ready_for_production)throw Error('cross_tcg_market_activation_blocked:'+result.findings.join(','));
 return{...result,bootstrap};
}
