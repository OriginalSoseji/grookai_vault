import {validateEventRequest,confirmedEventRequest,validateEventState} from './vendorEvents.mjs';
import {validateEventJournal} from './eventJournal.mjs';
export class EventRpcError extends Error {
 constructor(code,definitive=false){super('Event request could not be completed.');this.code=code;this.definitive=definitive;}
}
/** Owner-bound recovery coordinator; it never invents a replacement after uncertainty. */
export class EventService {
 constructor({gateway,store,newId=()=>crypto.randomUUID()}){
  this.gateway=gateway;this.store=store;this.newId=newId;this.ownerId=gateway.ownerId;validateEventJournal(null,this.ownerId);this.invalid=false;this.busy=false;this.listeners=new Set();
  this.unsubscribe=gateway.subscribe(owner=>{if(owner!==this.ownerId)this.invalidate();});
 }
 invalidate(){if(this.invalid)return;this.invalid=true;for(const listener of this.listeners)listener();}
 onInvalidated(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 checkOwner(){if(this.gateway.ownerId!==this.ownerId)this.invalidate();if(this.invalid)throw Error('Your account changed. Reopen Events.');}
 dispose(){this.invalidate();this.unsubscribe();this.listeners.clear();}
 async read(eventId=null){this.checkOwner();const result=await this.gateway.read(eventId);this.checkOwner();return validateEventState(result,this.ownerId,eventId);}
 async journal(){this.checkOwner();const row=await this.store.read();this.checkOwner();return validateEventJournal(row,this.ownerId);}
 async exclusive(action){this.checkOwner();if(this.busy)throw Error('An event save is already being checked.');this.busy=true;try{return await action();}finally{this.busy=false;}}
 async begin(operation,expectedRevision,expectedLocalRevision){
  const request=validateEventRequest({version:1,requestId:this.newId(),expectedRevision,operation});
  return this.exclusive(async()=>{
   const row=await this.store.change({ownerId:this.ownerId,expectedLocalRevision,nextLocalRevision:this.newId(),action:'stage',request});this.checkOwner();
   return this.resolveRow(row,true);
  });
 }
 async recover(sendIfMissing=true){return this.exclusive(async()=>{const row=await this.journal();return row?.pending?this.resolveRow(row,sendIfMissing):{status:'empty',journal:row};});}
 async discardRejected(expectedLocalRevision){return this.exclusive(async()=>{const row=await this.store.change({ownerId:this.ownerId,expectedLocalRevision,nextLocalRevision:this.newId(),action:'discardRejected'});this.checkOwner();return row;});}
 async resolveRow(row,sendIfMissing){
  const pending=validateEventJournal(row,this.ownerId).pending;
  const uncertain=()=>({status:'unconfirmed',journal:row,message:'This save is not confirmed yet. Its exact request is retained; check it again before starting another edit.'});
  const settle=async result=>{
   const acknowledgement=confirmedEventRequest(pending,result,this.ownerId);this.checkOwner();
   const journal=await this.store.change({ownerId:this.ownerId,expectedLocalRevision:row.localRevision,nextLocalRevision:this.newId(),action:'acknowledge',request:pending,acknowledgement});this.checkOwner();return {status:'saved',journal,acknowledgement};
  };
  let recovered;
  try{recovered=await this.gateway.recover(pending.requestId);this.checkOwner();}catch{this.checkOwner();return uncertain();}
  if(recovered!==null){try{return await settle(recovered);}catch{this.checkOwner();return uncertain();}}
  if(!sendIfMissing)return row.rejection?{status:'rejected',journal:row,code:row.rejection}:uncertain();
  let result;
  try{this.checkOwner();result=await this.gateway.mutate(pending);this.checkOwner();}
  catch(error){
   this.checkOwner();
   if(error instanceof EventRpcError&&error.definitive&&['PT409','22023','42501'].includes(error.code)){
    try{const journal=await this.store.change({ownerId:this.ownerId,expectedLocalRevision:row.localRevision,nextLocalRevision:this.newId(),action:'reject',request:pending,code:error.code});this.checkOwner();return {status:'rejected',journal,code:error.code};}catch{this.checkOwner();return uncertain();}
   }
   return uncertain();
  }
  try{return await settle(result);}catch{this.checkOwner();return uncertain();}
 }
}
