import {validatePortfolioCapabilities,validatePortfolioRequest,confirmedPortfolioOutcome,validatePortfolioPage,validatePortfolioComparison,validatePortfolioSummary,portfolioId,portfolioFields} from './portfolioHistory.mjs';
import {validatePortfolioJournal} from './portfolioHistoryJournal.mjs';

/** Owner-bound recording. An uncertain response never releases a durable request. */
export class PortfolioHistoryService {
 constructor({gateway,store,newId=()=>crypto.randomUUID()}){
  this.gateway=gateway;this.store=store;this.newId=newId;this.ownerId=gateway.ownerId;
  validatePortfolioJournal(null,this.ownerId);this.invalid=false;this.busy=false;this.listeners=new Set();
  this.unsubscribe=gateway.subscribe(owner=>{if(owner!==this.ownerId)this.invalidate();});
 }
 invalidate(){if(this.invalid)return;this.invalid=true;for(const listener of this.listeners)listener();}
 onInvalidated(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 checkOwner(){if(this.gateway.ownerId!==this.ownerId)this.invalidate();if(this.invalid)throw Error('Your account changed. Reopen Vault.');}
 dispose(){this.invalidate();this.unsubscribe();this.listeners.clear();}
 async capabilities(){this.checkOwner();const v=await this.gateway.capabilities();this.checkOwner();return validatePortfolioCapabilities(v);}
 async journal(){this.checkOwner();const v=await this.store.read();this.checkOwner();return validatePortfolioJournal(v,this.ownerId);}
 async list({before=null,watermark=null,limit=30}={}){
  this.checkOwner();const options={before,watermark,limit},v=await this.gateway.list(options);this.checkOwner();return validatePortfolioPage(v,this.ownerId,options);
 }
 async compare(beforeId,afterId){
  if(!portfolioId(beforeId)||!portfolioId(afterId)||beforeId===afterId)throw Error('Choose two different observations.');
  this.checkOwner();const v=await this.gateway.compare(beforeId,afterId);this.checkOwner();return validatePortfolioComparison(v,beforeId,afterId);
 }
 async exclusive(action){this.checkOwner();if(this.busy)throw Error('A recording is already being checked.');this.busy=true;try{return await action();}finally{this.busy=false;}}
 async begin(day,expectedLocalRevision){
  const request=validatePortfolioRequest({version:1,requestId:this.newId(),day});
  return this.exclusive(async()=>{
   const row=await this.store.change({ownerId:this.ownerId,expectedLocalRevision,nextLocalRevision:this.newId(),action:'stage',request});
   this.checkOwner();return this.resolveRow(row,'capture');
  });
 }
 recover(){return this.resume('recover');}
 retry(){return this.resume('capture');}
 cancel(){return this.resume('cancel');}
 async resume(mode){return this.exclusive(async()=>{const row=await this.journal();return row?.pending?this.resolveRow(row,mode):{status:'empty',journal:row};});}
 async resolveRow(row,mode){
  const pending=validatePortfolioJournal(row,this.ownerId).pending;
  const uncertain=code=>({status:'unconfirmed',journal:row,code:typeof code==='string'?code:null});
  try{
   this.checkOwner();let outcome=await this.gateway.recover(pending);this.checkOwner();
   if(outcome===null&&mode!=='recover'){outcome=await this.gateway[mode](pending);this.checkOwner();}
   if(outcome===null)return uncertain(null);
   const acknowledgement=confirmedPortfolioOutcome(pending,outcome,this.ownerId);
   const journal=await this.store.change({ownerId:this.ownerId,expectedLocalRevision:row.localRevision,nextLocalRevision:this.newId(),action:'acknowledge',request:pending,acknowledgement});this.checkOwner();
   return {status:acknowledgement.status,journal,acknowledgement};
  }catch(error){this.checkOwner();return uncertain(error?.code);}
 }
 /** Download only a complete, ordered point. Never silently export a partial page. */
 async export(pointId){
  if(!portfolioId(pointId))throw Error('Choose a recorded observation.');
  let afterCopy=null,point=null;const rows=[];
  do{
   this.checkOwner();const v=await this.gateway.export(pointId,afterCopy);this.checkOwner();
   if(!portfolioFields(v,['version','ownerId','point','rows','nextAfterCopy'])||v.version!==1||v.ownerId!==this.ownerId||v.point?.snapshotId!==pointId||!Array.isArray(v.rows)||v.rows.length>100)throw Error('History export could not be verified.');
   const summary=validatePortfolioSummary(v.point);
   if(point!==null&&JSON.stringify(summary)!==JSON.stringify(point))throw Error('History export changed.');
   point=summary;
   for(const row of v.rows){
    if(!portfolioFields(row,['copy','evidence'])||!portfolioId(row.copy?.copyId)||row.evidence?.copyId!==row.copy.copyId||(afterCopy!==null&&row.copy.copyId<=afterCopy))throw Error('History export ordering changed.');
    afterCopy=row.copy.copyId;rows.push(structuredClone(row));
   }
   if(rows.length>point.coverage.owned)throw Error('History export contains extra copies.');
   if(v.nextAfterCopy===null)break;
   if(v.rows.length!==100||v.nextAfterCopy!==afterCopy||rows.length>=point.coverage.owned)throw Error('History export cursor is invalid.');
  }while(true);
  if(rows.length!==point.coverage.owned)throw Error('History export is incomplete. Try again.');
  this.checkOwner();return {version:1,ownerId:this.ownerId,point,rows};
 }
}
