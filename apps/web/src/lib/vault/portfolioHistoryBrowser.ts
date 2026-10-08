import type {SupabaseClient} from '@supabase/supabase-js';
import {PortfolioHistoryService,type PortfolioGateway} from './portfolioHistoryService.mjs';
import {PortfolioJournalStore} from './portfolioHistoryJournalStore';
export function createPortfolioHistoryService(client:SupabaseClient,ownerId:string){
 let currentOwner:string|null=ownerId;
 const checked=async(mode:string,params:Record<string,unknown>={})=>{
  const session=await client.auth.getSession();currentOwner=session.data.session?.user.id??null;
  if(session.error||currentOwner!==ownerId)throw Error('Your account changed. Reopen Vault.');
  const unavailable=()=>{throw Error('Collection history is unavailable. Any pending recording request remains saved.');};
  const response=await fetch('/api/vault/history',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerId,mode,...params}),signal:AbortSignal.timeout(mode==='capture'?60000:20000)}).catch(unavailable);
  const body=await response.json().catch(unavailable);if(currentOwner!==ownerId)throw Error('Your account changed. Reopen Vault.');
  if(!response.ok)throw Object.assign(Error('Collection history could not load. Keep any pending recording request.'),{code:typeof body?.code==='string'?body.code:null});
  if(body?.ownerId!==ownerId)throw Error('Your account changed. Reopen Vault.');return body;
 };
 const gateway:PortfolioGateway={
  get ownerId(){return currentOwner;},
  subscribe(listener){const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{currentOwner=session?.user.id??null;listener(currentOwner);});return ()=>subscription.unsubscribe();},
  capabilities:async()=>(await checked('capabilities')).capabilities,
  list:async({before=null,watermark=null,limit=30})=>(await checked('list',{before,watermark,limit})).page,
  compare:async(beforeId,afterId)=>(await checked('compare',{beforeId,afterId})).comparison,
  export:async(pointId,afterCopy)=>(await checked('export',{pointId,afterCopy})).export,
  capture:async request=>(await checked('capture',{request})).outcome,
  recover:async request=>(await checked('recover',{request})).outcome,
  cancel:async request=>(await checked('cancel',{request})).outcome,
 };
 let service:PortfolioHistoryService;const store=new PortfolioJournalStore(ownerId,()=>service.checkOwner());
 service=new PortfolioHistoryService({gateway,store});return service;
}
