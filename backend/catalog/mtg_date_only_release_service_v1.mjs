import { readMtgDateOnlyReleaseV1,MTG_DATE_ONLY_RELEASE_PLAN_PIN_V1 } from './mtg_date_only_release_read_v1.mjs';
import { MTG_DATE_ONLY_RAW_SOURCE_V1 } from './mtg_date_only_transaction_state_v1.mjs';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const parentFields='id,gv_id,name,number,set_code,identity_domain,variant_key,print_identity_key,printed_identity_modifier,set_identity_model,external_ids,ai_metadata';
const identityFields='id,card_print_id,is_active,identity_domain,identity_key_version,identity_key_hash,set_code_identity,printed_number,identity_payload';
async function pages(query) {
  const rows=[];
  for(let n=0;;n+=500){
    const {data,error}=await query().order('id').range(n,n+499);
    if(error)throw Error('Print release dates could not be verified. Try again.');
    const page=data??[];rows.push(...page);if(page.length<500)return rows;
    if(n>=10000)throw Error('Print release evidence is too broad to verify. Narrow the search.');
  }
}
// The request-scoped public visibility check precedes all private reads. This
// isolated loader returns only dates, never raw receipts or source identities.
export async function loadMtgDateOnlyReleaseDatesV1(publicClient,backendClient,cardPrintIds) {
  const ids=[...new Set(cardPrintIds)];
  if(ids.length>20000||ids.some(id=>!uuid(id)))throw Error('Print release date scope is invalid or too broad. Narrow the search.');
  const result=new Map();
  for(let offset=0;offset<ids.length;offset+=160){
    const chunk=ids.slice(offset,offset+160);
    const visible=await pages(()=>publicClient.from('v_card_prints_discovery_v1').select('id')
      .eq('identity_domain','mtg_eng_paper_print').in('id',chunk));
    const visibleIds=visible.map(row=>row.id).filter(id=>chunk.includes(id));
    if(!visibleIds.length)continue;
    const parents=await pages(()=>backendClient.from('card_prints').select(parentFields).in('id',visibleIds));
    const candidateParents=parents.filter(p=>visibleIds.includes(p.id)&&p.ai_metadata?.mtg_print_release_date_v1?.version==='mtg_print_release_date:v1');
    if(!candidateParents.length)continue;
    const parentIds=candidateParents.map(p=>p.id),sourceIds=[...new Set(candidateParents.map(p=>p.external_ids?.scryfall).filter(uuid))];
    if(!sourceIds.length)continue;
    const [identities,bySource,byParent,receipts]=await Promise.all([
      pages(()=>backendClient.from('card_print_identity').select(identityFields).eq('is_active',true).in('card_print_id',parentIds)),
      pages(()=>backendClient.from('external_mappings').select('id,source,external_id,card_print_id,active,meta')
        .eq('source','scryfall').eq('active',true).in('external_id',sourceIds)),
      pages(()=>backendClient.from('external_mappings').select('id,source,external_id,card_print_id,active,meta')
        .eq('source','scryfall').eq('active',true).in('card_print_id',parentIds)),
      pages(()=>backendClient.from('raw_imports').select('id,source,payload').eq('source',MTG_DATE_ONLY_RAW_SOURCE_V1)
        .eq('payload->>plan_fingerprint',MTG_DATE_ONLY_RELEASE_PLAN_PIN_V1)
        .in('payload->>_kind',['mtg_date_only_original_source_members','mtg_date_only_apply_receipt'])),
    ]);
    const originals=receipts.filter(r=>r.payload?._kind==='mtg_date_only_original_source_members');
    const applies=receipts.filter(r=>r.payload?._kind==='mtg_date_only_apply_receipt');
    if(receipts.length!==2||originals.length!==1||applies.length!==1)continue;
    const owners=[...new Map([...bySource,...byParent].map(m=>[String(m.id),m])).values()];
    for(const parent of candidateParents){
      const date=readMtgDateOnlyReleaseV1({parent,identities:identities.filter(i=>i.card_print_id===parent.id),
        sourceOwners:owners.filter(m=>m.card_print_id===parent.id||m.external_id===parent.external_ids?.scryfall),
        sourceReceipt:originals[0],applyReceipt:applies[0]});
      if(date)result.set(parent.id,date);
    }
  }
  return result;
}
