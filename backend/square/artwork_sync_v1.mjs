import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {SquareApiError} from './client_v1.mjs';
import {squareManagedProjection,squareQrSku,squareDesiredProjection} from './catalog_plan_v1.mjs';
export const SQUARE_ARTWORK_VERSION='SQUARE_ARTWORK_V1';
const fail=code=>{throw new SquareApiError(code);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const imageIds=item=>item.item_data?.image_ids??[];
const caption=art=>`grookai canonical card artwork; confidence:${art.kind}; sha256:${art.sha256}`;
function validateItem(item,state){
 const variants=item.item_data?.variations;
 if(item.id!==state.target.item_id||!Array.isArray(variants)||variants.length!==1||variants[0].id!==state.target.variation_id||
  variants[0].item_variation_data?.sku!==squareQrSku(state.offer?.gvviId??state.pendingOperation?.source_snapshot.gvviId)||
  !isDeepStrictEqual(squareManagedProjection(item,variants[0]),state.pendingOperation?.projection??state.target.last_synced_projection))fail('square_managed_fields_changed');
 if(!Array.isArray(imageIds(item))||imageIds(item).length>20)fail('square_artwork_requires_review');
 return variants[0];
}
const matches=(image,art)=>image.image_data?.name===art.name&&image.image_data?.caption===caption(art);
async function findAttached(client,item,art){
 for(const id of imageIds(item)){const image=await client.image(id);if(matches(image,art)||client.artworkImageMatches&&await client.artworkImageMatches(image,art.pixelSha256))return image;}
 return null;
}
async function attachRequest(client,item,art,imageId,connectionId){
 const first=imageIds(item)[0]?await client.image(imageIds(item)[0]):null;
 const primary=!first||/^grookai-artwork-v1-[a-f0-9]{64}\.jpg$/.test(first.image_data?.name??'')&&/^grookai canonical card artwork;/.test(first.image_data?.caption??'');
 const updated=structuredClone(item),ids=imageIds(item).filter(id=>id!==imageId);
 updated.item_data.image_ids=primary?[imageId,...ids]:[...ids,imageId];
 return {idempotency_key:'gk-art-attach-'+hash(JSON.stringify({connection:connectionId,object:updated})),object:updated};
}
export async function syncSquareArtwork({connection,context,client,rpc,state,requestId,loadSource,enabled}){
 let operation=state.pendingOperation?.payload?.artwork?state.pendingOperation:null,sent=false,accepted=false;
 let wasUncertain=['sending','uncertain'].includes(operation?.status);
 const scoped={...context,targetId:state.target.id};
 try{
  if(state.pendingOperation&&!operation)fail('square_connection_busy');
  if(!operation&&(!enabled||!state.offer||!state.target.selected||!state.target.item_id))return {status:'not_enabled'};
  if(!operation&&!isDeepStrictEqual(state.target.last_synced_projection,squareDesiredProjection(state.offer)))return {status:'catalog_pending'};
  if(operation&&operation.target_id!==state.target.id)fail('square_connection_busy');
  let item=await client.item(state.target.item_id);validateItem(item,state);
  if(!operation){
   const art=await loadSource(state.offer.gvviId);
   if(!art)return {status:'unavailable'};
   const attached=await findAttached(client,item,art);
   const first=imageIds(item)[0]?await client.image(imageIds(item)[0]):null;
   // Preserve seller photos and their primary position. Only grookai-owned primaries may be superseded.
   const primary=!first||/^grookai-artwork-v1-[a-f0-9]{64}\.jpg$/.test(first.image_data?.name??'')&&/^grookai canonical card artwork;/.test(first.image_data?.caption??'');
   if(attached&&(!primary||imageIds(item)[0]===attached.id))return {status:'current'};
   const images=attached?[attached]:await client.imagesByName(art.name);
   if(images.some(image=>!matches(image,art)))fail('square_artwork_requires_review');
   let request,mode;
   if(images.length){
    request=await attachRequest(client,item,art,images[0].id,connection.id);mode='attach';
   }else{
    request={idempotency_key:'gk-art-upload-'+hash(JSON.stringify({connection:connection.id,item:item.id,sha256:art.sha256,kind:art.kind})),
     object_id:item.id,is_primary:false,image:{type:'IMAGE',id:'#grookai-artwork-'+art.sha256.slice(0,32),image_data:{name:art.name,caption:caption(art)}}};mode='upload';
   }
   const payload={artwork:{version:SQUARE_ARTWORK_VERSION,mode,name:art.name,kind:art.kind,sha256:art.sha256,fileSha256:art.fileSha256,pixelSha256:art.pixelSha256,sourceSha256:art.sourceSha256,source:art.source,
    imageIdsBefore:imageIds(item),request,...(mode==='upload'?{fileBase64:art.fileBase64}:{})}};
   if(Buffer.byteLength(JSON.stringify(payload))>1048576)fail('square_artwork_too_large');
   operation=await rpc('prepare',{...scoped,requestId,payload,sourceSnapshot:state.offer,projection:squareDesiredProjection(state.offer)});
  }
  let art=operation.payload.artwork;
  if(art.version!==SQUARE_ARTWORK_VERSION||!['upload','attach'].includes(art.mode)||art.name!==`grookai-artwork-v1-${art.sha256}.jpg`)fail('square_invalid_artwork');
  if(art.mode==='upload'&&hash(Buffer.from(art.fileBase64,'base64'))!==art.fileSha256)fail('square_invalid_artwork');
  // A process may have died after sending. Convert to retained uncertainty, then re-read before any retry.
  if(operation.status==='sending'){await rpc('fail',{...scoped,operationId:operation.id,errorCode:'square_artwork_unconfirmed',uncertain:true});operation.status='uncertain';}
  item=await client.item(state.target.item_id);validateItem(item,{...state,pendingOperation:operation});
  let image=await findAttached(client,item,art);
  if(image){
   if(operation.status!=='uncertain')await rpc('fail',{...scoped,operationId:operation.id,errorCode:'square_artwork_unconfirmed',uncertain:true});
   await rpc('recover_finish',{...scoped,operationId:operation.id,itemId:item.id,variationId:state.target.variation_id,observedProjection:operation.projection});
   return {status:'reconciled',imageId:image.id};
  }
  if(!isDeepStrictEqual(imageIds(item),art.imageIdsBefore))fail('square_artwork_requires_review');
  operation=await rpc('begin',{...scoped,operationId:operation.id});sent=true;
  let uploaded;
  if(art.mode==='upload')uploaded=await client.uploadArtwork(art.request,art.fileBase64,art.name,art.pixelSha256);
  else await client.upsert(art.request,squareQrSku(operation.source_snapshot.gvviId));
  accepted=true;
  let confirmed=await client.item(state.target.item_id);validateItem(confirmed,{...state,pendingOperation:operation});
  image=await findAttached(client,confirmed,art);
  if(!image&&uploaded){
   // A deduplicated upload can return an existing unattached image. Retain the completed upload, then prepare a separate exact attach request.
   await rpc('finish',{...scoped,operationId:operation.id,itemId:confirmed.id,variationId:state.target.variation_id});
   operation=null;accepted=false;sent=false;wasUncertain=false;
   const request=await attachRequest(client,confirmed,art,uploaded.id,connection.id);
   art={...art,mode:'attach',request,imageIdsBefore:imageIds(confirmed)};delete art.fileBase64;
   operation=await rpc('prepare',{...scoped,requestId:randomUUID(),payload:{artwork:art},sourceSnapshot:state.offer,projection:squareDesiredProjection(state.offer)});
   operation=await rpc('begin',{...scoped,operationId:operation.id});sent=true;
   await client.upsert(request,squareQrSku(operation.source_snapshot.gvviId));accepted=true;
   confirmed=await client.item(state.target.item_id);validateItem(confirmed,{...state,pendingOperation:operation});
   image=await findAttached(client,confirmed,art);
  }
  if(!image)fail('square_artwork_receipt_unconfirmed');
  await rpc('finish',{...scoped,operationId:operation.id,itemId:confirmed.id,variationId:state.target.variation_id});
  return {status:'synced',imageId:image.id};
 }catch(error){
  const code=/^square_[a-z_]{1,80}$/.test(error?.code)?error.code:'square_artwork_failed';
  if(operation)await rpc('fail',{...scoped,operationId:operation.id,errorCode:code,
   uncertain:accepted||wasUncertain||sent&&error.uncertain!==false}).catch(()=>{});
  else await rpc('target_error',{...scoped,errorCode:code}).catch(()=>{});
  throw new SquareApiError(code,{uncertain:accepted||error?.uncertain===true});
 }
}
