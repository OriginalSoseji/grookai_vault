import {isCostId, validateCostRequest, type CostEvidence, type CostRequest} from './copyCost.mjs';

export type CostDraft = {
  key:string; ownerId:string; instanceId:string; revision:string;
  amount:string; currency:string; expectedAmount:string|null; expectedCurrency:string|null;
  pending:CostRequest|null;
};
export type CostDraftFields = Omit<CostDraft,'key'|'ownerId'|'instanceId'|'revision'>;
const queues = new Map<string,Promise<unknown>>();
const scope = (owner:string,instance:string) => {
  if (!isCostId(owner) || !isCostId(instance)) throw Error('Invalid copy draft.');
  return `${owner}:${instance}`;
};
function validate(value:unknown,key:string):CostDraft|null {
  if (value === undefined) return null;
  const row = value as CostDraft;
  if (!row || row.key !== key || scope(row.ownerId,row.instanceId)!==key || !isCostId(row.revision) ||
      typeof row.amount!=='string' || row.amount.length>4096 || typeof row.currency!=='string' || row.currency.length>1000 ||
      (row.expectedAmount!==null && (typeof row.expectedAmount!=='string'||row.expectedAmount.length>4096)) ||
      (row.expectedCurrency!==null && (typeof row.expectedCurrency!=='string'||row.expectedCurrency.length>1000))) throw Error('Saved cost draft needs review.');
  if (row.pending!==null) {
    const request=validateCostRequest(row.pending);
    if (request.ownerId!==row.ownerId || request.instanceId!==row.instanceId) throw Error('Saved cost request belongs to another copy.');
  }
  return row;
}
function open():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    let rejected=false;
    const request=indexedDB.open('grookai.private-copy-cost.v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('copies',{keyPath:'key'});
    request.onsuccess=()=>{if(rejected)request.result.close();else resolve(request.result);};
    request.onerror=()=>reject(Error('Private cost drafts could not be saved on this device.'));
    request.onblocked=()=>{rejected=true;reject(Error('Close another cost editor and try again.'));};
  });
}
function transaction(owner:string,instance:string,change?:(current:CostDraft|null)=>CostDraft):Promise<CostDraft|null> {
  const key=scope(owner,instance),prior=queues.get(key)??Promise.resolve();
  const task=prior.catch(()=>undefined).then(async()=>{
    const db=await open();
    return new Promise<CostDraft|null>((resolve,reject)=>{
      const tx=db.transaction('copies',change?'readwrite':'readonly');
      const store=tx.objectStore('copies');let result:CostDraft|null=null;let failure:unknown;
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onerror=()=>{failure??=Error('Private cost drafts could not be saved on this device.');};
      tx.onabort=()=>{db.close();reject(failure??Error('Private cost draft was not saved.'));};
      const get=store.get(key);
      get.onsuccess=()=>{
        try {
          const current=validate(get.result,key);
          result=change?change(current):current;
          if (change && result) {validate(result,key);store.put(result);}
        } catch(error) {failure=error;tx.abort();}
      };
    });
  });
  queues.set(key,task);
  void task.finally(()=>{if(queues.get(key)===task)queues.delete(key);}).catch(()=>undefined);
  return task;
}
export function readCostDraft(owner:string,instance:string) {return transaction(owner,instance);}
export async function writeCostDraft(owner:string,instance:string,revision:string|null,fields:CostDraftFields) {
  return (await transaction(owner,instance,current=>{
    if ((current?.revision??null)!==revision || current?.pending) throw Error('This cost draft changed in another editor. Reload it before continuing.');
    return {...fields,key:scope(owner,instance),ownerId:owner,instanceId:instance,revision:crypto.randomUUID()};
  }))!;
}
/** Acknowledges only this exact request; a newer draft or request is preserved. */
export async function settleCostRequest(owner:string,instance:string,requestId:string,cost?:CostEvidence) {
  return transaction(owner,instance,current=>{
    if (!current) throw Error('Saved cost request is unavailable.');
    if (current.pending?.requestId!==requestId) return current;
    return {...current,revision:crypto.randomUUID(),pending:null,...(cost?{
      amount:cost.amount??'',currency:cost.currency??'',expectedAmount:cost.amount,expectedCurrency:cost.currency,
    }:{})};
  });
}
