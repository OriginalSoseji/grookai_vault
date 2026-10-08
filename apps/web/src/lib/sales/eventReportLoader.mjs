import {validateEventState,validateEventHistory} from './vendorEvents.mjs';
import {validateSaleCostCorrectionStates} from './saleCostCorrections.mjs';
import {isPurchaseReceipt} from './salesPurchase.mjs';
/** Every batch must succeed; failed private reads cannot become missing-cost evidence. */
export async function loadEventReportInput({ownerId,eventId,readState,readBook,readCosts,checkOwner}){
 checkOwner();const state=validateEventState(await readState(eventId),ownerId,eventId);checkOwner();
 if(!state.receiptAccess)throw Error('Receipt access is unavailable. Event details and saved changes remain available.');
 const book=await readBook();checkOwner();
 if(!book||!Number.isSafeInteger(book.revision)||book.revision<0||String(book.revision)!==state.selected.bookRevision||!Array.isArray(book.book?.receipts)||book.book.receipts.length>10000)throw Error('Receipt history changed. Refresh before reviewing this event.');
 const bookRevision=String(book.revision),receipts=structuredClone(book.book.receipts.map(r=>r?.receipt)),ids=state.selected.assignments.filter(r=>r.eventId===eventId).map(r=>r.receiptId),snapshots=[];
 for(let offset=0;offset<ids.length;offset+=100){
  checkOwner();const batch=ids.slice(offset,offset+100),result=await readCosts(batch);checkOwner();
  if(result?.ownerId!==ownerId||!Array.isArray(result.snapshots)||result.snapshots.length>batch.length||result.snapshots.some(r=>!r||!batch.includes(r.receiptId))||new Set(result.snapshots.map(r=>r.receiptId)).size!==result.snapshots.length)throw Error('Private cost history could not be verified. Refresh this event.');
  snapshots.push(...structuredClone(result.snapshots));
 }
 checkOwner();return {state,ownerId,eventId,bookRevision,receipts,snapshots};
}
export async function loadEventHistory({ownerId,eventId,beforeRevision=null,limit=50,readHistory,checkOwner}){
 checkOwner();const result=await readHistory(eventId,beforeRevision,limit);checkOwner();return validateEventHistory(result,ownerId,eventId,beforeRevision,limit);
}
/** An explicit second basis; every assigned sale must have a verified private state. */
export async function loadEventCostCorrections({input,ownerId,eventId,readCorrections,checkOwner}){
 checkOwner();if(input.ownerId!==ownerId||input.eventId!==eventId)throw Error('Event account or selection changed.');
 const state=validateEventState(input.state,ownerId,eventId),receipts=new Map(input.receipts.map(r=>[r.id.toLowerCase(),r]));
 const assigned=state.selected.assignments.filter(a=>a.eventId===eventId).map(a=>a.receiptId);
 if(assigned.some(id=>!receipts.has(id)))throw Error('An assigned receipt is missing.');
 const ids=assigned.filter(id=>!isPurchaseReceipt(receipts.get(id))),states=[];
 for(let offset=0;offset<ids.length;offset+=100){checkOwner();const batch=ids.slice(offset,offset+100),reply=await readCorrections(batch);checkOwner();states.push(...validateSaleCostCorrectionStates(reply,ownerId,batch));}
 checkOwner();return {...input,costBasis:'owner_corrected',correctionStates:validateSaleCostCorrectionStates(states,ownerId,ids)};
}
