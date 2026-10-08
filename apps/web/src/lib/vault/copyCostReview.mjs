import {isCostId,isCostEvidence,parseCopyCost} from './copyCost.mjs';

export function costReviewIds(value) {
  if (!Array.isArray(value) || value.length > 10000 || value.some(id => !isCostId(id))) throw Error('Invalid cost review scope.');
  return [...new Set(value.map(id => id.toLowerCase()))];
}

/** Validate one complete owner-scoped batch. Missing copies are unavailable. */
export function costReviewRows(ownerId, requested, response) {
  const ids=costReviewIds(requested);
  if (!isCostId(ownerId) || ids.length>100 || !response || response.ownerId!==ownerId ||
      typeof response.editEnabled!=='boolean' || !Array.isArray(response.copies)) throw Error('Cost review could not be verified.');
  const rows=new Map();
  for(const row of response.copies) {
    if(!row || !ids.includes(row.instanceId) || rows.has(row.instanceId) || typeof row.archived!=='boolean') throw Error('Unexpected cost review copy.');
    if(row.archived) {rows.set(row.instanceId,{instanceId:row.instanceId,state:'unavailable',cost:null});continue;}
    if(!isCostEvidence(row.cost))throw Error('Cost evidence could not be verified.');
    const cost={amount:row.cost.amount,currency:row.cost.currency,minor:row.cost.minor,status:row.cost.status};
    let state='needsReview';
    if(cost.status==='missing_amount' && cost.amount===null && cost.minor===null)state='missingAmount';
    else if(cost.status==='missing_currency' && cost.amount!==null && !cost.currency?.trim() && cost.minor===null)state='missingCurrency';
    else if(cost.status==='known' && /^[A-Z]{3}$/.test(cost.currency??'')) {
      try {const parsed=parseCopyCost(cost.amount??'',cost.currency);if(parsed.minor!==null && parsed.minor===cost.minor)state='known';}catch{}
    }
    rows.set(row.instanceId,{instanceId:row.instanceId,state,cost:Object.freeze(cost)});
  }
  return Object.freeze(ids.map(instanceId=>Object.freeze(rows.get(instanceId)??{instanceId,state:'unavailable',cost:null})));
}

export function costReviewLabel(row) {
  if(row.state==='known') {const value=parseCopyCost(row.cost.amount,row.cost.currency);return `${value.currency} ${value.amount}`;}
  return {missingAmount:'Cost unknown',missingCurrency:'Currency needed',needsReview:'Cost needs review',unavailable:'Copy no longer available'}[row.state];
}

export async function readCostReview(ownerId, requested, {fetcher=fetch,signal,isCurrent=()=>true}={}) {
  if(!isCostId(ownerId))throw Error('Sign in required.');
  const ids=costReviewIds(requested),rows=[];
  const current=()=>{if(signal?.aborted || !isCurrent())throw Error('Cost review changed.');};
  current();
  for(let offset=0;offset<ids.length;offset+=100) {
    current();const batch=ids.slice(offset,offset+100);
    const controller=new AbortController(),abort=()=>controller.abort();
    signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,15000);
    try {
      const response=await fetcher(`/api/vault/cost-review?${new URLSearchParams({owner:ownerId,ids:batch.join(',')})}`,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      current();if(!response.ok)throw Error('Costs could not load. Try again.');
      const body=await response.json();current();
      rows.push(...costReviewRows(ownerId,batch,body));
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  current();return Object.freeze(rows);
}
