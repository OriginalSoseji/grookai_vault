import type {SupabaseClient} from '@supabase/supabase-js';
import {CostCorrectionService,type CostCorrectionGateway} from './costCorrectionService.mjs';
import {CostCorrectionJournalStore} from './costCorrectionJournalStore';
export function createCostCorrectionService(client:SupabaseClient,ownerId:string){
 let currentOwner:string|null=ownerId;
 const checked=async(mode:string,params:Record<string,unknown>={})=>{
  const session=await client.auth.getSession();currentOwner=session.data.session?.user.id??null;
  if(session.error||currentOwner!==ownerId)throw Error('Your account changed. Reopen Reports.');
  const response=await fetch('/api/sales/cost-corrections',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerId,mode,...params}),signal:AbortSignal.timeout(20000)});
  const body=await response.json();if(currentOwner!==ownerId)throw Error('Your account changed. Reopen Reports.');
  if(!response.ok)throw Object.assign(Error('Private cost request could not complete.'),{code:typeof body?.code==='string'?body.code:null});
  if(body?.ownerId!==ownerId)throw Error('Private cost account changed.');return body;
 };
 const gateway:CostCorrectionGateway={
  get ownerId(){return currentOwner;},
  subscribe(listener){const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{currentOwner=session?.user.id??null;listener(currentOwner);});return ()=>subscription.unsubscribe();},
  available:async()=>(await checked('available')).enabled,
  read:async receiptIds=>(await checked('read',{receiptIds})).states,
  history:async(receiptId,lineIndex,beforeRevision)=>(await checked('history',{receiptId,lineIndex,beforeRevision})).history,
  apply:async request=>(await checked('apply',{request})).outcome,
  recover:async request=>(await checked('recover',{request})).outcome,
  cancel:async request=>(await checked('cancel',{request})).outcome,
 };
 let service:CostCorrectionService;const store=new CostCorrectionJournalStore(ownerId,()=>service.checkOwner());service=new CostCorrectionService({gateway,store});return service;
}
