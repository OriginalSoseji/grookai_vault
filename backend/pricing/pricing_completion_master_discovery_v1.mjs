/** Compact discovery work from the fully validated Master census. No IO or writes. */
import {readPricingCompletionMasterCensusV2} from './pricing_completion_master_operator_readback_v2.mjs';

const OWNER='pokemon-catalog-pricing-discovery-v1';
const ACTION='Review exact catalog and market-price evidence; use separately qualified repair and independent price verification. No automatic closure.';
const PRICE_FIELDS=['status','unavailable_reason','currency','market_close','freshness','observed_at','published_at','provenance_id','source_name','eligible_printing_count','is_from_price'];
const pick=(v,keys)=>Object.fromEntries(keys.map(k=>[k,v[k]??null]));

export function normalizePricingCompletionMasterDiscoveryV1(input){
  const {master,receipt}=readPricingCompletionMasterCensusV2(input);
  if(input.now-Date.parse(receipt.currentPublication.source_finished_at)>86400000) throw new Error('master_discovery_source_stale_now');
  const parents=new Map(master.inventory.parents.map(p=>[p.id,p]));
  const printings=new Map(master.inventory.printings.map(p=>[p.id,p]));
  const records=new Map();
  for(const row of master.observations){
    const id=row.identity.printingId,printing=printings.get(id),parent=parents.get(printing.card_print_id);
    records.set(id,{identity:{kind:'master_printing',printingId:id,currency:'USD',condition:'NOT_CONDITION_SPECIFIC'},
      issues:[...new Set(['missing_published_price',...row.evidence.catalogIssues,...row.evidence.failures])].sort(),
      evidence:{parent,printing,priceBasis:'TCGPLAYER_MARKET',physicalConditionVerified:false,
        price:pick(row.evidence.readback,PRICE_FIELDS)},sourceLinks:{parentId:parent.id,printingId:id},owner:OWNER,nextAction:ACTION});
  }
  for(const entry of master.catalogIntegrityLedger.entries){
    if(entry.entityKind==='parent'){
      records.set(`parent:${entry.entityId}`,{identity:{kind:'catalog_parent',parentId:entry.entityId},
        issues:[...entry.issues].sort(),evidence:{parent:entry.retainedFields},sourceLinks:{parentId:entry.entityId},owner:OWNER,nextAction:ACTION});
    }else if(records.has(entry.entityId)){
      const row=records.get(entry.entityId);row.issues=[...new Set([...row.issues,...entry.issues])].sort();
    }else{
      const printing=entry.retainedFields,parent=parents.get(printing.card_print_id);
      records.set(entry.entityId,{identity:{kind:'master_printing',printingId:entry.entityId,currency:'USD',condition:'NOT_CONDITION_SPECIFIC'},
        issues:[...entry.issues].sort(),evidence:{parent,printing,priceBasis:'TCGPLAYER_MARKET',physicalConditionVerified:false},
        sourceLinks:{parentId:parent.id,printingId:entry.entityId},owner:OWNER,nextAction:ACTION});
    }
  }
  return {version:'PRICING_COMPLETION_MASTER_DISCOVERY_V1',observations:[...records.values()],
    // Complete retained inventory remains in the pinned input. The queue needs
    // compact unresolved entities, not duplicate copies of every priced card.
    coverage:master.coverage,summary:{...master.summary,discoveryEntities:records.size,
      catalogParentWork:master.catalogIntegrityLedger.entries.filter(e=>e.entityKind==='parent').length,
      exactPrintingWork:[...records.values()].filter(r=>r.identity.kind==='master_printing').length,
      countsAreWorkEntitiesNotDistinctCards:true},receipt,completionAllowed:false,productionWrites:0};
}
