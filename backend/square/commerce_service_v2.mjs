import {randomUUID} from 'node:crypto';
import {SquareApiError} from './client_v1.mjs';
import {squareOrderEvidence,squareRefundEvidence,squareTenderPaymentIds,squareEvidenceHash} from './order_evidence_v2.mjs';
const fail=code=>{throw new SquareApiError(code);};
const code=error=>/^square_[a-z_]{1,80}$/.test(error?.code)?error.code:'square_commerce_unconfirmed';
const safeError=error=>{const result=new SquareApiError(code(error));if(/^[0-9A-Z]{5}$/.test(error?.databaseCode??''))result.databaseCode=error.databaseCode;return result;};
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)?value:fail('square_invalid_request');
const reviewableEvidence=new Set(['square_order_unconfirmed','square_order_amount_unconfirmed','square_payment_unconfirmed',
 'square_payment_time_unconfirmed','square_sale_requires_review','square_sale_evidence_changed','square_refund_unconfirmed']);

export class SquareCommerceService {
 constructor({catalog,rpc,config,now=Date.now}){this.catalog=catalog;this.rpc=rpc;this.config=config;this.now=now;}
 async preferences(ownerId,connectionId,{autoEnroll,sellOnSquare,confirmed}){
  if(!this.config.commerceEnabled)fail('square_sync_disabled');
  if(typeof autoEnroll!=='boolean'||typeof sellOnSquare!=='boolean'||confirmed!==true)fail('square_invalid_request');
  return this.rpc('preferences',{ownerId:uuid(ownerId),connectionId:uuid(connectionId),autoEnroll,sellOnSquare,confirmed});
 }
 async #reviewOrder({connection,context},order,error,mapped,evidence){
  if(!reviewableEvidence.has(code(error)))throw error;
  const review={id:order.id,locationId:connection.location_id,currency:'USD',state:'review',
   lines:[...new Set(mapped)].sort().map(variationId=>({variationId})),errorCode:code(error),
   sourceHash:squareEvidenceHash(evidence??{id:order.id,version:order.version??null})};
  // The authority atomically records the observation and quarantines only this
  // order's mapped claims. A durable review is a completed observation, not a
  // reason to replay the same signal forever or stop unrelated seller work.
  await this.rpc('order_observe',{...context,evidence:review,evidenceHash:squareEvidenceHash(review)});
  return {review:true,orderId:order.id,errorCode:code(error)};
 }
 async #observeOrder(leased,order){
  const {connection,context,client}=leased;
  const variationIds=(order.line_items??[]).map(row=>row.catalog_object_id).filter(value=>typeof value==='string');
  const mapped=await this.rpc('order_variations',{...context,variationIds});
  if(!Array.isArray(mapped))fail('square_orders_incomplete');
  if(!mapped.length)return {ignored:true};
  let evidence;
  try{
   const payments=[];
   if(order.state==='COMPLETED')for(const id of squareTenderPaymentIds(order))payments.push(await client.payment(id));
   evidence=squareOrderEvidence(order,payments,{locationId:connection.location_id,mappedVariationIds:mapped});
   const result=await this.rpc('order_observe',{...context,evidence,evidenceHash:squareEvidenceHash(evidence)});
   for(const payment of payments)for(const id of payment.refund_ids??[]){
    const refund=await client.refund(id),value=squareRefundEvidence(refund,payment,{locationId:connection.location_id});
    await this.rpc('refund_observe',{...context,evidence:value,evidenceHash:squareEvidenceHash(value)});
   }
   return result;
  }catch(error){
   return this.#reviewOrder(leased,order,error,mapped,evidence);
  }
 }
 async #observeRefund(leased,refund){
  const {connection,context,client}=leased,payment=await client.payment(refund.payment_id);
  if(!payment.order_id)return {ignored:true};
  const order=await client.order(payment.order_id),observed=await this.#observeOrder(leased,order);
  if(observed.ignored||observed.review)return observed;
  try{
   const evidence=squareRefundEvidence(refund,payment,{locationId:connection.location_id});
   await this.rpc('refund_observe',{...context,evidence,evidenceHash:squareEvidenceHash(evidence)});
   return observed;
  }catch(error){
   const mapped=await this.rpc('order_variations',{...context,variationIds:(order.line_items??[]).map(line=>line.catalog_object_id).filter(id=>typeof id==='string')});
   if(!Array.isArray(mapped))fail('square_orders_incomplete');
   return this.#reviewOrder(leased,order,error,mapped);
  }
 }
 async #reconcile(leased){
  const {connection,context,client}=leased;
  if(!connection.location_id)return {checked:0};
  const through=new Date(this.now()).toISOString();
  const since=new Date(Math.max(Date.parse(connection.created_at),Date.parse(connection.reconcile_cursor??connection.created_at)-300000)).toISOString();
  const signals=await this.rpc('signals',context);
  if(!Array.isArray(signals)||signals.length>25)fail('square_signals_incomplete');
  const reviews=new Map(),observe=result=>{if(result?.review)reviews.set(result.orderId,result.errorCode);return result;};
  for(const signal of signals){
   try{
    let observed;
    if(signal.resource_type==='authorization'){
     try{await client.merchant(connection.merchant_id);}catch(error){
      if(error.code==='square_authorization_required')await this.rpc('signal_done',{...context,eventId:signal.event_id,errorCode:'square_authorization_required'});
      throw error;
     }
    }
    if(signal.resource_type==='order')observed=observe(await this.#observeOrder(leased,await client.order(signal.resource_id)));
    else if(signal.resource_type==='payment'){
     const payment=await client.payment(signal.resource_id);
     if(payment.order_id)observed=observe(await this.#observeOrder(leased,await client.order(payment.order_id)));
    }else if(signal.resource_type==='refund'){
     observed=observe(await this.#observeRefund(leased,await client.refund(signal.resource_id)));
    }
    await this.rpc('signal_done',{...context,eventId:signal.event_id,...(observed?.review?{errorCode:observed.errorCode}:{})});
   }catch(error){
    // Keep an unmatched/failed signal pending; the worker's durable run exposes
    // the failure and a future tick rereads the provider instead of trusting it.
    throw safeError(error);
   }
  }
  const orders=await client.recentOrders(connection.location_id,since,through);
  if(!Array.isArray(orders))fail('square_orders_incomplete');
  let checked=0;
  for(const order of orders){observe(await this.#observeOrder(leased,order));checked++;}
  // Refund changes have their own provider update cursor. An old order need
  // not change when its payment is refunded, and webhook delivery may be lost.
  const refunds=await client.recentRefunds(connection.location_id,since,through,connection.created_at);
  if(!Array.isArray(refunds))fail('square_refunds_incomplete');
  for(const refund of refunds)observe(await this.#observeRefund(leased,refund));
  await this.rpc('cursor',{...context,through});
  return {checked,orderReviews:reviews.size};
 }
 async reconcile(ownerId,connectionId){
  return this.catalog.withConnection(ownerId,connectionId,leased=>this.#reconcile(leased));
 }
 async enroll(ownerId,connectionId,focusInstanceId){
  return this.catalog.withConnection(ownerId,connectionId,async({context})=>this.rpc('enroll',{...context,...(focusInstanceId?{focusInstanceId:uuid(focusInstanceId)}:{})}));
 }
 async stock(ownerId,connectionId,targetId,{withdraw=false}={}){
  uuid(targetId);
  return this.catalog.withConnection(ownerId,connectionId,async leased=>{
   const {connection,context,client}=leased,scoped={...context,targetId};
   let state=await this.rpc('allocation',scoped),operation=state.pending,sent=false;
   try{
    if(!state.target.item_id||!state.target.variation_id)return {status:'catalog_pending'};
    const quantity=await client.inventoryQuantity(state.target.variation_id,connection.location_id);
    if(state.allocation?.state==='sold'&&operation?.kind==='allocate'){
     await this.rpc('stock_sold',scoped);operation=null;
    }
    if(operation?.status==='prepared'&&operation.kind==='allocate'&&(!state.sellEnabled||!state.offer||withdraw)){
     await this.rpc('stock_cancel_prepared',scoped);return {status:'canceled_before_send'};
    }
    if(operation){
     // Only read back an existing result or retry the saved body/key while the
     // provider idempotency window remains safe. Never mint a replacement key.
     if(operation.status!=='prepared'&&quantity===(operation.kind==='allocate'?1:0)){
      await this.rpc('stock_finish',{...scoped,operationId:operation.id,quantity});return {status:'stock_reconciled'};
     }
     if(this.now()-Date.parse(operation.created_at)>23*60*60*1000)fail('square_reconciliation_required');
    }else{
     const sold=state.allocation?.state==='sold';
     const shouldWithdraw=withdraw||sold||!state.sellEnabled||!state.offer;
     if(state.allocation?.review_order_id&&!sold&&!shouldWithdraw)fail('square_order_requires_review');
     if((!state.allocation||state.allocation.state==='released')&&!shouldWithdraw){
      if(quantity!==0)fail('square_existing_stock_requires_review');
     }else if(!state.allocation)return {status:'not_allocated'};
     else if(state.allocation.state==='active'&&!shouldWithdraw){
      if(quantity!==1)fail('square_stock_requires_review');
      return {status:'ready'};
     }else if(state.allocation.state==='sold'&&quantity===0)return {status:'sold'};
     else if(state.allocation.state==='review'&&quantity===0&&shouldWithdraw)return {status:'withdrawn_review'};
     else if(state.allocation.state==='released'&&shouldWithdraw)return {status:'released'};
     else if(state.allocation.state==='review'&&!shouldWithdraw)fail('square_stock_requires_review');
     if(!shouldWithdraw&&!this.config.commerceEnabled)fail('square_sync_disabled');
     const kind=shouldWithdraw?'withdraw':'allocate';
     const payload={idempotency_key:randomUUID(),ignore_unchanged_counts:true,changes:[{type:'PHYSICAL_COUNT',physical_count:{
      catalog_object_id:state.target.variation_id,location_id:connection.location_id,state:'IN_STOCK',quantity:kind==='allocate'?'1':'0',occurred_at:new Date(this.now()).toISOString()}}]};
     operation=await this.rpc('stock_prepare',{...scoped,kind,payload,sourceSnapshot:state.offer});
    }
    operation=await this.rpc('stock_begin',{...scoped,operationId:operation.id});sent=true;
    await client.changeInventory(operation.payload);
    const actual=await client.inventoryQuantity(state.target.variation_id,connection.location_id);
    if(actual!==(operation.kind==='allocate'?1:0))fail('square_stock_readback_unconfirmed');
    await this.rpc('stock_finish',{...scoped,operationId:operation.id,quantity:actual});
    return {status:operation.kind==='allocate'?'ready':'withdrawn_review'};
   }catch(error){
    if(operation)await this.rpc('stock_fail',{...scoped,operationId:operation.id,errorCode:code(error),uncertain:sent||error.uncertain===true}).catch(()=>{});
    await this.rpc('target_error',{...scoped,errorCode:code(error)}).catch(()=>{});
    throw safeError(error);
   }
  });
 }
 async processConnection(ownerId,connectionId,{maxTargets=5,manual=false,focusInstanceId}={}){
  if(!Number.isInteger(maxTargets)||maxTargets<1||maxTargets>25)fail('square_invalid_request');
  uuid(ownerId);uuid(connectionId);
  const runId=randomUUID(),runContext={ownerId,connectionId,runId};
  let stage='start',targetId;
  const detail=async(extra={})=>this.rpc('commerce_run_detail',{...runContext,stage,targetId,...extra});
  const checkpoint=async(next,target)=>{stage=next;targetId=target;await detail();};
  await this.rpc('commerce_run_start',runContext);
  try{
   await detail();
   if(focusInstanceId)uuid(focusInstanceId);
   const result=await this.#processConnection(ownerId,connectionId,{maxTargets,manual,focusInstanceId,checkpoint});
   await this.rpc('commerce_run_finish',{...runContext,result:{status:result.failed?'failed':'succeeded',succeeded:result.succeeded,
    failed:result.failed,skipped:result.reviews+result.skipped+(result.orderReviews??0),errorCode:result.errorCode??''}});
   await detail({...result.errorDetail,errorCode:result.errorCode??null});
   return {...result,runId};
  }catch(error){
   if(code(error)==='square_connection_busy'){
    await this.rpc('commerce_run_finish',{...runContext,result:{status:'succeeded',succeeded:0,failed:0,skipped:1,errorCode:''}});
    await detail().catch(()=>{});
    return {succeeded:0,failed:0,reviews:0,adoptions:[],focusStatus:'pending',runId,busy:true};
   }
   await this.rpc('commerce_run_finish',{...runContext,result:{status:'failed',succeeded:0,failed:1,skipped:0,errorCode:code(error)}});
   await detail({errorCode:code(error),databaseCode:error.databaseCode}).catch(()=>{});
   throw error;
  }
 }
 async #processConnection(ownerId,connectionId,{maxTargets,manual,focusInstanceId,checkpoint}){
  // Settlement always precedes stock reconciliation: a sold decrement must
  // never be mistaken for permission to put the same physical unit back.
  await checkpoint('reconcile');const reconciled=await this.reconcile(ownerId,connectionId);
  if(this.config.commerceEnabled){await checkpoint('enroll');await this.enroll(ownerId,connectionId,focusInstanceId);}
  await checkpoint('read_targets');
  const read=await this.catalog.withConnection(ownerId,connectionId,async({connection,context})=>({
   automatic:connection.auto_sync,targets:await this.rpc('commerce_targets',{...context,focusInstanceId})}));
  if(!Array.isArray(read.targets))fail('square_targets_incomplete');
  const result={succeeded:0,failed:0,reviews:0,skipped:0,orderReviews:reconciled.orderReviews??0,adoptions:[],focusStatus:'pending'};
  const reviewTargets=new Set();
  const review=target=>{reviewTargets.add(target.id);result.reviews=reviewTargets.size;};
  for(const target of read.targets.slice(0,maxTargets)){
   const checkedThrough=new Date(this.now()).toISOString();
   let targetFailed=false,failureStage;
   try{
    if(target.selected&&target.allocation_state!=='sold'&&(manual||read.automatic)&&this.config.catalogEnabled){
     try{
      failureStage='catalog';
      await checkpoint('catalog',target.id);
      const catalog=await this.catalog.sync(ownerId,connectionId,target.id,randomUUID());
      if(catalog.status==='adoption_required'){review(target);result.adoptions.push({...catalog,targetId:target.id});if(target.instance_id===focusInstanceId)result.focusStatus='review';continue;}
     }catch(error){if(!target.allocation_state||code(error)==='square_connection_busy')throw error;targetFailed=true;failureStage='catalog';review(target);result.errorCode=code(error);
      result.errorDetail={stage:'catalog',targetId:target.id,databaseCode:error.databaseCode};if(target.instance_id===focusInstanceId)result.focusStatus='review';}
    }
    if(target.allocation_state||((manual||read.automatic)&&this.config.commerceEnabled)){
     failureStage='stock';
     await checkpoint('stock',target.id);
     const value=await this.stock(ownerId,connectionId,target.id);
     if(target.instance_id===focusInstanceId&&result.focusStatus!=='review')result.focusStatus=value.status==='ready'?'ready':'pending';
     if(['withdrawn_review','stock_requires_review'].includes(value.status))review(target);
    }
    if(targetFailed)result.failed++;else result.succeeded++;
   }catch(error){
    if(code(error)==='square_connection_busy'){result.skipped++;if(target.instance_id===focusInstanceId)result.focusStatus='pending';}
    else{result.failed++;result.errorCode=code(error);result.errorDetail={stage:failureStage??'stock',targetId:target.id,databaseCode:error.databaseCode};if(target.instance_id===focusInstanceId)result.focusStatus='review';}
   }
   finally{await checkpoint('target_checked',target.id);await this.catalog.withConnection(ownerId,connectionId,({context})=>this.rpc('target_checked',{...context,targetId:target.id,checkedThrough}));}
  }
  return result;
 }
 async releaseStock(ownerId,connectionId,targetId,input){
  if(input.confirmed!==true||input.physicalCopyPresent!==true||input.registerOnline!==true)fail('square_stock_release_confirmation_required');
  await this.reconcile(ownerId,connectionId);
  return this.catalog.withConnection(ownerId,connectionId,async({connection,context,client})=>{
   const state=await this.rpc('allocation',{...context,targetId:uuid(targetId)});
   if(await client.inventoryQuantity(state.target.variation_id,connection.location_id)!==0)fail('square_stock_readback_unconfirmed');
   return this.rpc('release_stock',{...context,targetId,...input});
  });
 }
 async withdraw(ownerId,connectionId,targetId){
  await this.catalog.withConnection(ownerId,connectionId,async({context})=>{
   const state=await this.rpc('allocation',{...context,targetId:uuid(targetId)});
   await this.catalog.deselect(ownerId,connectionId,[state.target.instance_id]);
  });
  await this.reconcile(ownerId,connectionId);
  return this.stock(ownerId,connectionId,targetId,{withdraw:true});
 }
 async receiveReturn(ownerId,connectionId,saleId,confirmed){
  if(confirmed!==true)fail('square_return_confirmation_required');
  await this.reconcile(ownerId,connectionId);
  return this.catalog.withConnection(ownerId,connectionId,({context})=>this.rpc('return',{...context,saleId:uuid(saleId),confirmed:true}));
 }
}
