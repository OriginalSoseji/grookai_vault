import {changeEventJournal,validateEventJournal,type EventJournal,type EventJournalChange} from './eventJournal.mjs';

function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  let blocked=false;const request=indexedDB.open('grookai.private-events.v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('owners',{keyPath:'ownerId'});
  request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result);};
  request.onerror=()=>reject(Error('The event edit could not be saved on this device.'));
  request.onblocked=()=>{blocked=true;reject(Error('Close another event editor and try again.'));};
 });
}
/** One durable pending edit per owner. IndexedDB serializes competing tabs. */
export class EventJournalStore {
 constructor(readonly ownerId:string,private readonly checkOwner:()=>void) {validateEventJournal(null,ownerId);}
 private async transaction(change?:EventJournalChange):Promise<EventJournal|null>{
  const frozen=change?structuredClone(change):undefined;
  this.checkOwner();const db=await open();
  try{this.checkOwner();}catch(error){db.close();throw error;}
  return new Promise((resolve,reject)=>{
   let result:EventJournal|null=null,failure:unknown;
   let tx:IDBTransaction;
   try{tx=db.transaction('owners',frozen?'readwrite':'readonly');}catch(error){db.close();reject(error);return;}
   const store=tx.objectStore('owners');
   tx.oncomplete=()=>{db.close();try{this.checkOwner();resolve(result);}catch(error){reject(error);}};
   tx.onerror=()=>{failure??=Error('The event edit was not saved. Retry after storage is available.');};
   tx.onabort=()=>{db.close();reject(failure??Error('The event edit was not saved.'));};
   const get=store.get(this.ownerId);
   get.onsuccess=()=>{
    try{
     this.checkOwner();const current=validateEventJournal(get.result??null,this.ownerId);
     if(frozen){if(frozen.ownerId!==this.ownerId)throw Error('Your account changed. Reopen Events.');result=changeEventJournal(current,frozen);store.put(result);}
     else result=current;
    }catch(error){failure=error;tx.abort();}
   };
  });
 }
 read(){return this.transaction();}
 async change(change:EventJournalChange){return (await this.transaction(change))!;}
}
