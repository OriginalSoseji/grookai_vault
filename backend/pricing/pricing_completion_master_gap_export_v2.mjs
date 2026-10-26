/** Pure retained Master inventory and exact-price census. No IO or authority to repair. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const PRICING_COMPLETION_MASTER_GAP_EXPORT_V2='PRICING_COMPLETION_MASTER_GAP_EXPORT_V2';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const label=v=>typeof v==='string'&&v.trim().length>0&&v.trim()===v;
const families=['pokemon','pokemon_jpn'];
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
function semanticDigest(value){return createHash('sha256').update(canonical(value)).digest('hex');}
function timestamp(value){assert.ok(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value),'timestamp');assert.equal(new Date(value).toISOString(),value,'timestamp');return Date.parse(value);}
function unique(rows,key){assert.ok(Array.isArray(rows),'rows');const map=new Map();for(const row of rows){assert.ok(row&&UUID.test(row[key]??''),'canonical UUID required');assert.ok(!map.has(row[key]),'duplicate UUID');map.set(row[key],row);}return map;}

export function buildPricingCompletionMasterGapExportV2(snapshot,input=snapshot.scope){
  assert.deepEqual(input.games,['pokemon'],'explicit parent game scope');
  assert.deepEqual(input.setFamilies,families,'explicit English and Japanese set families');
  assert.equal(input.currency,'USD');assert.equal(input.priceBasis,'TCGPLAYER_MARKET');assert.equal(input.condition,'NOT_CONDITION_SPECIFIC');
  assert.ok(label(input.sourceRunId)&&label(input.evidenceRef),'source binding');
  const evaluatedAt=timestamp(input.observedAt),maxPriceAgeMs=input.maxPriceAgeMs??86400000;
  assert.ok(Number.isSafeInteger(maxPriceAgeMs)&&maxPriceAgeMs>0&&maxPriceAgeMs<=86400000,'price age limit');
  assert.equal(snapshot.inventoryComplete,true);assert.equal(snapshot.readbackComplete,true);
  const scope={...input,maxPriceAgeMs},parents=unique(snapshot.parents,'id'),printings=unique(snapshot.printings,'id'),prices=unique(snapshot.prices,'card_printing_id');
  assert.equal(printings.size,prices.size,'unrequested or missing price row');
  const children=new Map([...parents.keys()].map(id=>[id,[]]));
  for(const printing of printings.values()){assert.ok(parents.has(printing.card_print_id),'orphan printing');children.get(printing.card_print_id).push(printing.id);}
  const entries=[],parentIssues=new Map(),printingIssues=new Map(),reasonCounts={};
  function ledger(entityKind,row,issues){if(!issues.length)return;for(const issue of issues)reasonCounts[issue]=(reasonCounts[issue]??0)+1;
    entries.push({entityKind,entityId:row.id,parentId:entityKind==='parent'?row.id:row.card_print_id,issues,
      unresolved:true,sourceRunId:scope.sourceRunId,evidenceRef:scope.evidenceRef,retainedFields:row,
      nextAction:'Review exact UUID catalog evidence through governed catalog repair; no synthetic identity, automatic admission or price closure.'});}
  let invalidParentRoutes=0;
  for(const parent of parents.values()){
    assert.equal(parent.game,'pokemon','parent outside declared census');const issues=[];
    if(!UUID.test(parent.set_id??''))issues.push('missing_or_invalid_set_id');
    if(!families.includes(parent.set_game))issues.push('unsupported_or_missing_set_family');
    if(!label(parent.set_code))issues.push('missing_or_invalid_set_code');
    if(!UUID.test(parent.set_id??'')||!families.includes(parent.set_game)||!label(parent.set_code))invalidParentRoutes++;
    if(!label(parent.name))issues.push('missing_or_invalid_parent_name');
    if(!label(parent.gv_id))issues.push('missing_or_invalid_parent_gv_id');
    if(!children.get(parent.id).length)issues.push('canonical_parent_without_exact_printing');
    parentIssues.set(parent.id,issues);ledger('parent',parent,issues);
  }
  for(const printing of printings.values()){
    const issues=[];
    if(!label(printing.printing_gv_id))issues.push('missing_or_invalid_printing_gv_id');
    if(!label(printing.finish_key))issues.push('missing_or_invalid_finish_key');
    printingIssues.set(printing.id,issues);ledger('printing',printing,issues);
  }
  entries.sort((a,b)=>a.entityKind.localeCompare(b.entityKind)||a.entityId.localeCompare(b.entityId));
  const observations=[],usablePrices=[];let integrityAffectedPrintings=0,priceGapAndIntegrity=0;
  for(const printing of [...printings.values()].sort((a,b)=>a.id.localeCompare(b.id))){
    const parent=parents.get(printing.card_print_id),price=prices.get(printing.id);assert.ok(price,'exact readback omitted printing');
    assert.equal(price.pricing_scope,'card_printing','parent summary cannot satisfy exact price');
    assert.equal(price.card_print_id,parent.id,'price parent mismatch');
    for(const [field,expected]of [['gv_id',parent.gv_id],['printing_gv_id',printing.printing_gv_id],['finish_key',printing.finish_key]])
      assert.equal(price[field]??null,expected??null,`price ${field} mismatch`);
    assert.equal(price.is_from_price,false,'From price cannot satisfy exact price');
    assert.ok(['available','unavailable'].includes(price.status),'invalid price status');assert.ok(label(price.freshness),'price freshness required');
    const catalogIssues=[...parentIssues.get(parent.id),...printingIssues.get(printing.id)],failures=[];
    if(catalogIssues.length)integrityAffectedPrintings++;
    if(price.status!=='available')failures.push('read_model_unavailable');
    if(price.currency!==scope.currency)failures.push('currency_unavailable_or_mismatch');
    if(!((typeof price.market_close==='number'||(typeof price.market_close==='string'&&/^\d+(?:\.\d+)?$/.test(price.market_close)))&&Number.isFinite(Number(price.market_close))&&Number(price.market_close)>0))failures.push('missing_positive_market_price');
    if(price.freshness!=='fresh')failures.push('read_model_not_fresh');
    for(const field of ['observed_at','published_at']){let time=NaN;try{time=timestamp(price[field]);}catch{}
      if(!Number.isFinite(time)||time>evaluatedAt)failures.push(`${field}_invalid_or_future`);
      else if(field==='observed_at'&&evaluatedAt-time>maxPriceAgeMs)failures.push('source_price_stale');}
    if(!UUID.test(price.provenance_id??''))failures.push('missing_exact_provenance');
    if(price.source_name!=='tcgplayer')failures.push('unsupported_price_source');
    if(price.eligible_printing_count!==1)failures.push('exact_eligible_count_mismatch');
    if(!failures.length)usablePrices.push({printingId:printing.id,parentId:parent.id,currency:price.currency,marketClose:price.market_close,
      observedAt:price.observed_at,publishedAt:price.published_at,provenanceId:price.provenance_id,priceBasis:'TCGPLAYER_MARKET',condition:'NOT_CONDITION_SPECIFIC',
      physicalConditionVerified:false,catalogIntegrityClear:catalogIssues.length===0});
    else{if(catalogIssues.length)priceGapAndIntegrity++;
      const semanticEvidenceDigest=semanticDigest({parent,printing,readback:price,catalogIssues,failures,priceBasis:scope.priceBasis,
        currency:scope.currency,condition:scope.condition,maxPriceAgeMs});
      observations.push({identity:{kind:'master',printingId:printing.id,currency:'USD',condition:'NOT_CONDITION_SPECIFIC'},reason:'missing_published_price',sourceRunId:scope.sourceRunId,
        // Exact set UUID routing remains stable even when display labels are absent.
        scope:`pokemon/${UUID.test(parent.set_id??'')?'set/'+parent.set_id:'unrouted-parent/'+parent.id}/USD/TCGPLAYER_MARKET`,
        evidence:{parentId:parent.id,parentGvId:parent.gv_id??null,printingGvId:printing.printing_gv_id??null,finishKey:printing.finish_key??null,
          setId:parent.set_id??null,setCode:parent.set_code??null,setFamily:parent.set_game??null,catalogIssues,failures,readModel:'get_market_pricing_read_model_v1',readback:price,
          priceBasis:'TCGPLAYER_MARKET',physicalConditionVerified:false,evidenceRef:`master-printing-semantic:sha256:${semanticEvidenceDigest}`,semanticEvidenceDigest,maxPriceAgeMs}});}
  }
  const parentsWithoutPrintings=[...parents.values()].filter(p=>!children.get(p.id).length).sort((a,b)=>a.id.localeCompare(b.id))
    .map(p=>({parentId:p.id,gvId:p.gv_id??null,setId:p.set_id??null,setCode:p.set_code??null,setFamily:p.set_game??null,name:p.name??null,
      printingId:null,reason:'canonical_parent_without_exact_printing',issues:parentIssues.get(p.id),unresolved:true}));
  const summary={canonicalParents:parents.size,exactPrintings:printings.size,freshPriced:usablePrices.length,masterPriceGaps:observations.length,
    parentsWithPrintings:parents.size-parentsWithoutPrintings.length,parentsWithoutPrintings:parentsWithoutPrintings.length,invalidParentRoutes,
    integrityParents:entries.filter(e=>e.entityKind==='parent').length,integrityPrintings:entries.filter(e=>e.entityKind==='printing').length,
    integrityAffectedExactPrintings:integrityAffectedPrintings,priceGapAndIntegrityExactPrintings:priceGapAndIntegrity,
    unresolvedExactPrintings:observations.length+integrityAffectedPrintings-priceGapAndIntegrity,
    unresolvedEntityUnion:observations.length+integrityAffectedPrintings-priceGapAndIntegrity+parentsWithoutPrintings.length,
    physicalConditionCoverage:'not_in_scope',exactMarketBasisEnumeration:'complete',completionAllowed:false,completionScope:'pokemon/{pokemon,pokemon_jpn}/USD/TCGPLAYER_MARKET'};
  assert.equal(summary.exactPrintings,summary.freshPriced+summary.masterPriceGaps,'price partition');
  assert.equal(summary.canonicalParents,summary.parentsWithPrintings+summary.parentsWithoutPrintings,'parent partition');
  return {version:PRICING_COMPLETION_MASTER_GAP_EXPORT_V2,sourceRunId:scope.sourceRunId,observedAt:scope.observedAt,scope,databaseWrites:0,
    inventory:{parents:snapshot.parents,printings:snapshot.printings},observations,usablePrices,parentsWithoutPrintings,summary,
    catalogIntegrityLedger:{version:'PRICING_COMPLETION_CATALOG_INTEGRITY_LEDGER_V2',sourceRunId:scope.sourceRunId,observedAt:scope.observedAt,
      evidenceRef:scope.evidenceRef,entries,reasonCounts,reasonCountsOverlap:true,identityBasis:'canonical UUID; labels are evidence only',repairAuthority:false},
    coverage:{masterToPrice:{status:entries.length?'partial':'complete',sourceRunId:scope.sourceRunId,observedAt:scope.observedAt,evidenceRef:scope.evidenceRef,
      expectedUnresolved:observations.length+parentsWithoutPrintings.length}},
    limitations:['Catalog issues overlap the price census; issue counts must not be added as distinct cards. Union counts deduplicate exact printing IDs and count no-child parents once.',
      'Missing-child parents have no exact printing queue identity. Preserve the separate catalog ledger; never synthesize children or close absent work.',
      'English and Japanese sets are both valid within parent game pokemon; lack of a TCGPlayer USD quote does not prove no provider/currency price exists.',
      'No repair, queue-resolution or completion authority is granted.']};
}
