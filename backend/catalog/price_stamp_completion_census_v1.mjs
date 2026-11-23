// Existing catalog inventory and current TCGplayer-publication coverage only.
// No source title/finish inference, canonical mutation, or completion authority.
import assert from 'node:assert/strict';
export const VERSION='PRICE_STAMP_COMPLETION_CENSUS_V1';
export const CENSUS_SQL=`
with current_scope as materialized (
 select pointer.run_id,pointer.publication_set_id from public.market_price_current_publication pointer where pointer.singleton
), published as materialized (
 select snapshot.card_printing_id,snapshot.market_price,snapshot.currency,snapshot.freshness_state
 from public.market_price_publication_snapshots snapshot join current_scope scope
 on snapshot.run_id=scope.run_id and snapshot.publication_set_id=scope.publication_set_id
 where snapshot.publication_state='published'
), decisions as materialized (
 select d.card_printing_id,count(*)::integer candidates,
 bool_or(d.market_price>0) positive_quote,
 bool_or(d.eligible and d.decision='publish' and d.publication_lane='current') eligible,
 jsonb_agg(distinct d.reason_codes) reasons,array_agg(distinct d.source_product_id) products
 from public.market_price_qualification_decisions d join current_scope scope on d.run_id=scope.run_id
 where d.card_printing_id is not null group by d.card_printing_id
), identities as materialized (
 select card_print_id,count(*)::integer active_identities from public.card_print_identity where is_active group by card_print_id
), reviews as materialized (
 select card_printing_id,bool_or(public_visibility in('hidden_pending_review','hidden_unsupported')) hidden,
 bool_or(review_status='verified' and public_visibility='visible') verified_visible
 from public.card_printing_truth_reviews where active group by card_printing_id
), mappings as materialized (
 select card_print_id,array_agg(distinct source) sources from public.external_mappings where active group by card_print_id
)
select parent.id parent_id,parent.gv_id,parent.name,parent.number,parent.set_code,parent.variant_key,
parent.identity_domain,game.code game_code,
coalesce(parent.data_quality_flags #>> '{app_visibility_v1,status}','visible') parent_visibility,
child.id printing_id,child.printing_gv_id,child.finish_key,child.is_provisional,
coalesce(review.hidden,false) printing_hidden,coalesce(review.verified_visible,false) verified_visible_review,
coalesce(identity.active_identities,0) active_identities,mapping.sources mapping_sources,
quote.market_price,quote.currency,quote.freshness_state,
coalesce(decision.candidates,0) source_candidates,coalesce(decision.positive_quote,false) source_positive_quote,
coalesce(decision.eligible,false) source_eligible,decision.reasons source_reasons,decision.products source_products
from public.card_prints parent left join public.games game on game.id=parent.game_id
left join public.card_printings child on child.card_print_id=parent.id
left join published quote on quote.card_printing_id=child.id
left join decisions decision on decision.card_printing_id=child.id
left join identities identity on identity.card_print_id=parent.id
left join reviews review on review.card_printing_id=child.id
left join mappings mapping on mapping.card_print_id=parent.id
order by parent.id,child.id`;

export function buildPriceStampCensusV1({rows,stampParentIds,expectedParents,current,observedAt}){
 assert.ok(Array.isArray(rows)&&Array.isArray(stampParentIds));assert.ok(Number.isFinite(Date.parse(observedAt)));
 assert.ok(current?.state==='verified'&&Number.isSafeInteger(current.snapshot_count));
 const stamps=new Set(stampParentIds),parents=new Map(),keys=new Set(),counts={},byGame={},gaps=[];
 let totalPrintings=0,pricedPrintings=0;
 for(const row of rows){
  assert.ok(row.parent_id);const key=row.parent_id+'|'+(row.printing_id??'no-printing');assert.ok(!keys.has(key),'Duplicate inventory/publication join');keys.add(key);
  const parent=parents.get(row.parent_id)??{id:row.parent_id,game:row.game_code??'unknown',stamp:stamps.has(row.parent_id),printingCount:0,pricedPrintingCount:0,activeIdentities:row.active_identities};
  if(row.printing_id)parent.printingCount++;
  const priced=row.printing_id&&Number.isFinite(Number(row.market_price))&&Number(row.market_price)>0;
  if(priced){parent.pricedPrintingCount++;pricedPrintings++;}
  if(row.printing_id)totalPrintings++;
  parents.set(row.parent_id,parent);
  if(priced)continue;
  let reason;
  if(row.parent_visibility==='suppressed')reason='suppressed_parent_preserved';
  else if(!row.gv_id)reason='canonical_parent_public_id_missing';
  else if(!row.printing_id)reason='no_printing_record';
  else if(row.is_provisional||row.printing_hidden)reason='provisional_or_hidden_printing_preserved';
  else if(row.source_eligible)reason='eligible_exact_decision_without_current_publication';
  else if(row.source_candidates>0&&!row.source_positive_quote)reason='exact_decisions_have_no_positive_source_quote';
  else reason='exact_mapping_or_finish_evidence_review_required';
  counts[reason]=(counts[reason]??0)+1;gaps.push({...row,known_stamp_parent:parent.stamp,reason,completion:'unresolved',write_authority:false});
 }
 assert.equal(parents.size,expectedParents,'Incomplete parent census');assert.equal(pricedPrintings,current.snapshot_count,'Published printing census does not reconcile');
 for(const p of parents.values()){
  const group=byGame[p.game]??={parents:0,withoutPrinting:0,withoutCurrentMarket:0,partiallyPriced:0,allStoredPrintingsPriced:0};group.parents++;
  if(!p.printingCount)group.withoutPrinting++;
  if(!p.pricedPrintingCount)group.withoutCurrentMarket++;
  else if(p.pricedPrintingCount<p.printingCount)group.partiallyPriced++;
  else group.allStoredPrintingsPriced++;
 }
 const stamped=[...parents.values()].filter(p=>p.stamp);
 assert.equal(stamped.length,stamps.size,'Stamp cohort lost parents');
 return{version:VERSION,observedAt,pass:true,productionWrites:0,executionAuthority:false,wholeCatalogComplete:false,
  scope:'All stored canonical parents/children; current TCGplayer publication coverage. Includes held and unsupported catalog records; not an ordinary-user UI blank-price count.',
  current,counts:{parents:parents.size,printings:totalPrintings,currentPricedPrintings:pricedPrintings,missingCurrentMarketPrintings:totalPrintings-pricedPrintings,
   parentsWithoutPrinting:[...parents.values()].filter(p=>!p.printingCount).length,parentsWithoutCurrentMarket:[...parents.values()].filter(p=>!p.pricedPrintingCount).length,
   gapInventoryRows:gaps.length},byGame,reasons:counts,stampCohort:{parents:stamped.length,withoutPrinting:stamped.filter(p=>!p.printingCount).length,withoutSingleActiveIdentity:stamped.filter(p=>p.activeIdentities!==1).length,withoutCurrentMarket:stamped.filter(p=>!p.pricedPrintingCount).length},
  limitations:['An absent current publication is not proof of absent quotes at every provider.','A source candidate is not a missing canonical card.','Existing source prices and generic stamp labels cannot authorize a new physical finish.','A stored Reverse or another finish does not prove the existence of additional stamped finishes.'],gaps};
}
