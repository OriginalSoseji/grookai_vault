import {validateSaleCostCorrectionRequest,confirmedSaleCostCorrection,validateSaleCostCorrectionStates,validateSaleCostCorrectionHistory} from './saleCostCorrections.mjs';
import {validateCostCorrectionJournal} from './costCorrectionJournal.mjs';
/** Every uncertain write retains its original request; cancellation is a server outcome. */
export class CostCorrectionService {
 constructor({gateway,store,newId=()=>crypto.randomUUID()}) {
  this.gateway=gateway;this.store=store;this.newId=newId;this.ownerId=gateway.ownerId;validateCostCorrectionJournal(null,this.ownerId);this.invalid=false;this.busy=false;this.listeners=new Set();
  this.unsubscribe=gateway.subscribe(owner=>{if(owner!==this.ownerId)this.invalidate();});
 }
 invalidate(){if(this.invalid)return;this.invalid=true;for(const listener of this.listeners)listener();}
 onInvalidated(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 checkOwner(){if(this.gateway.ownerId!==this.ownerId)this.invalidate();if(this.invalid)throw Error('Your account changed. Reopen Reports.');}
 dispose(){this.invalidate();this.unsubscribe();this.listeners.clear();}
 async available(){this.checkOwner();const result=await this.gateway.available();this.checkOwner();if(typeof result!=='boolean')throw Error('Cost correction availability could not load.');return result;}
 async read(receiptIds){
  const ids=[...receiptIds];this.checkOwner();let result=[];
  // Validate identities and bounds before the first request, using an explicit empty projection.
  validateSaleCostCorrectionStates(ids.map(id=>({version:1,ownerId:this.ownerId,receiptId:typeof id==='string'?id.toLowerCase():id,receipt:null,source:null,lines:[]})),this.ownerId,ids);
  for(let index=0;index<ids.length;index+=100){const batch=ids.slice(index,index+100);this.checkOwner();const rows=await this.gateway.read(batch);this.checkOwner();result=result.concat(validateSaleCostCorrectionStates(rows,this.ownerId,batch));}
  return validateSaleCostCorrectionStates(result,this.ownerId,ids);
 }
 async history(receiptId,lineIndex,beforeRevision=null){this.checkOwner();const rows=await this.gateway.history(receiptId,lineIndex,beforeRevision);this.checkOwner();return validateSaleCostCorrectionHistory(rows,this.ownerId,receiptId,lineIndex,beforeRevision);}
 async journal(){this.checkOwner();const row=await this.store.read();this.checkOwner();return validateCostCorrectionJournal(row,this.ownerId);}
 async exclusive(action){this.checkOwner();if(this.busy)throw Error('A cost correction is already being checked.');this.busy=true;try{return await action();}finally{this.busy=false;}}
 async begin(value,expectedLocalRevision){
  const request=validateSaleCostCorrectionRequest(value);
  return this.exclusive(async()=>{const row=await this.store.change({ownerId:this.ownerId,expectedLocalRevision,nextLocalRevision:this.newId(),action:'stage',request});this.checkOwner();return this.resolveRow(row,'apply');});
 }
 async recover(){return this.resume('recover');}
 async retry(){return this.resume('apply');}
 async cancel(){return this.resume('cancel');}
 async resume(mode){return this.exclusive(async()=>{const row=await this.journal();return row?.pending?this.resolveRow(row,mode):{status:'empty',journal:row};});}
 async resolveRow(row,mode){
  const pending=validateCostCorrectionJournal(row,this.ownerId).pending;
  const uncertain=code=>({status:'unconfirmed',journal:row,code:typeof code==='string'?code:null,message:'The outcome is not confirmed. The exact correction is retained. Check it again or cancel this request before editing.'});
  try{
   this.checkOwner();let outcome=await this.gateway.recover(pending);this.checkOwner();
   if(outcome===null&&mode!=='recover'){outcome=await this.gateway[mode](pending);this.checkOwner();}
   if(outcome===null)return uncertain(null);
   const acknowledgement=confirmedSaleCostCorrection(pending,outcome,this.ownerId);
   const journal=await this.store.change({ownerId:this.ownerId,expectedLocalRevision:row.localRevision,nextLocalRevision:this.newId(),action:'acknowledge',request:pending,acknowledgement});this.checkOwner();
   return {status:acknowledgement.status,journal,acknowledgement};
  }catch(error){this.checkOwner();return uncertain(error?.code);}
 }
}
