import type {SupabaseClient} from '@supabase/supabase-js';
import {EventRpcError,EventService,type EventGateway} from './eventService.mjs';
import {EventJournalStore} from './eventJournalStore';
import {eventRequestParams,type EventState} from './vendorEvents.mjs';
import {loadEventReportInput,loadEventHistory,loadEventCostCorrections} from './eventReportLoader.mjs';

/** Private reads go directly through the shared SDK, including large histories. */
export function eventSupabaseGateway(client:SupabaseClient,ownerId:string):EventGateway {
 let currentOwner:string|null=ownerId;
 const checked=async(name:string,params:Record<string,unknown>)=>{
  const session=await client.auth.getSession();currentOwner=session.data.session?.user.id??null;
  if(session.error||currentOwner!==ownerId)throw Error('Your account changed. Reopen Events.');
  const reply=await client.rpc(name,params).abortSignal(AbortSignal.timeout(20000));
  if(currentOwner!==ownerId)throw Error('Your account changed. Reopen Events.');
  if(reply.error)throw new EventRpcError(reply.error.code??null,reply.status>=400&&reply.status<500);
  return reply.data;
 };
 return {
  get ownerId(){return currentOwner;},
  subscribe(listener){const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{currentOwner=session?.user.id??null;listener(currentOwner);});return ()=>subscription.unsubscribe();},
  read:eventId=>checked('vendor_event_read_v1',{p_event_id:eventId}),
  recover:requestId=>checked('vendor_event_request_read_v1',{p_request_id:requestId}),
  mutate:request=>checked('vendor_event_mutate_v1',eventRequestParams(request)),
 };
}
export function createEventService(client:SupabaseClient,ownerId:string){
 const gateway=eventSupabaseGateway(client,ownerId);
 let service:EventService;
 const store=new EventJournalStore(ownerId,()=>service.checkOwner());
 service=new EventService({gateway,store});return service;
}
export function eventReportReader(client:SupabaseClient,service:EventService){
 const checked=async(name:string,params:Record<string,unknown>)=>{
  service.checkOwner();const reply=await client.rpc(name,params).abortSignal(AbortSignal.timeout(20000));service.checkOwner();
  if(reply.error)throw Error('Private event history could not load.');return reply.data;
 };
 const checkOwner=()=>service.checkOwner();
 return {
  report:async(eventId:string,state?:EventState,isCurrent?:()=>boolean,costBasis:'original'|'owner_corrected'='original')=>{
   const guard=()=>{checkOwner();if(isCurrent&&!isCurrent())throw Error('Another event is now selected.');};
   const input=await loadEventReportInput({ownerId:service.ownerId,eventId,checkOwner:guard,readState:id=>state?Promise.resolve(state):service.read(id),readBook:()=>checked('vendor_receipt_book_read_v1',{}),readCosts:ids=>checked('vendor_sale_cost_read_v1',{p_request_ids:ids})});
   return costBasis==='original'?input:loadEventCostCorrections({input,ownerId:service.ownerId,eventId,checkOwner:guard,readCorrections:ids=>checked('vendor_sale_cost_correction_read_v1',{p_receipt_ids:ids})});
  },
  history:(eventId:string,beforeRevision:string|null=null)=>loadEventHistory({ownerId:service.ownerId,eventId,beforeRevision,checkOwner,readHistory:(id,before,limit)=>checked('vendor_event_history_read_v1',{p_event_id:id,p_before_revision:before,p_limit:limit})}),
 };
}
