import {changeCostCorrectionJournal,validateCostCorrectionJournal,type CostCorrectionJournal,type CostCorrectionJournalChange} from './costCorrectionJournal.mjs';

function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  let blocked=false;const request=indexedDB.open('grookai.private-cost-corrections.v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('owners',{keyPath:'ownerId'});
  request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result);};
  request.onerror=()=>reject(Error('The cost correction could not be saved on this device.'));
  request.onblocked=()=>{blocked=true;reject(Error('Close another cost editor and try again.'));};
 });
}
/** One durable pending edit per owner. IndexedDB serializes competing tabs. */
export class CostCorrectionJournalStore {
 constructor(readonly ownerId:string,private readonly checkOwner:()=>void) {validateCostCorrectionJournal(null,ownerId);}
 private async transaction(change?:CostCorrectionJournalChange):Promise<CostCorrectionJournal|null>{
  const frozen=change?structuredClone(change):undefined;
  this.checkOwner();const db=await open();
  try{this.checkOwner();}catch(error){db.close();throw error;}
  return new Promise((resolve,reject)=>{
   let result:CostCorrectionJournal|null=null,failure:unknown;
   let tx:IDBTransaction;
   try{tx=db.transaction('owners',frozen?'readwrite':'readonly');}catch(error){db.close();reject(error);return;}
   const store=tx.objectStore('owners');
   tx.oncomplete=()=>{db.close();try{this.checkOwner();resolve(result);}catch(error){reject(error);}};
   tx.onerror=()=>{failure??=Error('The cost correction was not saved. Retry after storage is available.');};
   tx.onabort=()=>{db.close();reject(failure??Error('The cost correction was not saved.'));};
   const get=store.get(this.ownerId);
   get.onsuccess=()=>{
    try{
     this.checkOwner();const current=validateCostCorrectionJournal(get.result??null,this.ownerId);
     if(frozen){if(frozen.ownerId!==this.ownerId)throw Error('Your account changed. Reopen Reports.');result=changeCostCorrectionJournal(current,frozen);store.put(result);}
     else result=current;
    }catch(error){failure=error;tx.abort();}
   };
  });
 }
 read(){return this.transaction();}
 async change(change:CostCorrectionJournalChange){return (await this.transaction(change))!;}
}
