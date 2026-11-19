import {setTimeout as delay} from 'node:timers/promises';
import {assert,boundedArray,digest,sha256} from '../common.mjs';
import {acquireApprovedReceipt} from '../acquire.mjs';
import {decodeRepositoryCapture,repositoryRequestScope,REPOSITORY} from './tcgdex_repository_v1.mjs';
import {englishCardData,readStaticCardModule} from './static_card_module_v1.mjs';

const rawUrl=(scope,path)=>`https://raw.githubusercontent.com/${REPOSITORY}/${scope.commit_sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
export function repositorySetRequestScope(request,source){
  assert(source?.adapter==='tcgdex_repository_set_v1','REPOSITORY_SET_ADAPTER');
  const scope=source.repository,set=scope?.sets?.find(set=>set.id===request.set_id);
  const ids=boundedArray(set?.local_ids,500,'REPOSITORY_SET_CARD_SCOPE');
  assert(ids.length>0&&new Set(ids).size===ids.length&&ids.every(id=>/^\d{3}$/.test(id)),'REPOSITORY_SET_CARD_SCOPE');
  const cardSource={...source,adapter:'tcgdex_repository_card_v1'};
  const cardPath=`data/${set.series??'Mega Evolution'}/${set.name}/${ids[0]}.ts`;
  repositoryRequestScope({set_id:set.id,local_id:ids[0],url:rawUrl(scope,cardPath)},cardSource);
  const series=set.series??'Mega Evolution',setPath=`data/${series}/${set.name}.ts`;
  assert(request.url===rawUrl(scope,setPath)&&scope.blobs[setPath]&&scope.blobs.LICENSE,'REPOSITORY_PINNED_SET_URL');
  for(const id of ids)assert(scope.blobs[`data/${series}/${set.name}/${id}.ts`],'REPOSITORY_SET_CARD_BLOB_REQUIRED');
  return {scope,set,series,setPath,cardSource,paths:[setPath,'LICENSE',...ids.map(id=>`data/${series}/${set.name}/${id}.ts`)]};
}

export function decodeRepositorySetCapture(receipt,source){
  assert(receipt.kind==='gameplay'&&receipt.source_id===source.id&&sha256(receipt.body_text)===receipt.body_sha256,'REPOSITORY_SET_RECEIPT');
  let capture;try{capture=JSON.parse(receipt.body_text);}catch{assert(false,'REPOSITORY_SET_CAPTURE_JSON');}
  assert(capture?.version==='tcgdex_repository_set_capture:v1','REPOSITORY_SET_CAPTURE_VERSION');
  const {scope,set,series,setPath,cardSource,paths}=repositorySetRequestScope({set_id:capture.set_id,url:receipt.url},source);
  assert(capture.repository===REPOSITORY&&capture.commit_sha===scope.commit_sha&&Array.isArray(capture.snapshots)&&capture.snapshots.length===paths.length,
    'REPOSITORY_SET_CAPTURE_SCOPE');
  const originals=paths.map(path=>{
    const matches=capture.snapshots.filter(snapshot=>snapshot.url===rawUrl(scope,path));assert(matches.length===1,'REPOSITORY_SET_ORIGINAL_REQUIRED');return matches[0];
  });
  const cards=set.local_ids.map((id,index)=>{
    const body_text=JSON.stringify({version:'tcgdex_repository_capture:v1',repository:REPOSITORY,commit_sha:scope.commit_sha,set_id:set.id,local_id:id,
      snapshots:[originals[index+2],originals[0],originals[1]]});
    const cardReceipt={id:receipt.id,source_id:receipt.source_id,kind:'gameplay',url:rawUrl(scope,paths[index+2]),observed_at:receipt.observed_at,body_text,body_sha256:sha256(body_text)};
    return decodeRepositoryCapture(cardReceipt,cardSource).card;
  });
  const data=englishCardData(readStaticCardModule(originals[0].body_text,{kind:'set',seriesName:series}));
  const result={id:set.id,name:data.name,cardCount:data.cardCount,cards:cards.map(card=>({id:card.id,localId:card.localId,name:card.name}))};
  if(data.releaseDate!==undefined)result.releaseDate=data.releaseDate;
  if(data.tcgOnline!==undefined)result.tcgOnline=data.tcgOnline;
  if(data.abbreviations?.official!==undefined)result.abbreviation={official:data.abbreviations.official};
  return {set:result,profiles:cards,coverage:'reviewed_subset',complete_set_inventory:false,
    provenance:{kind:'tcgdex_repository_set_v1',authority:'tcgdex',repository:REPOSITORY,commit_sha:scope.commit_sha,
      set_blob_sha1:scope.blobs[setPath],scope_hash:digest(scope),original_receipt_id:receipt.id,scoped_cards:cards.length}};
}

export async function captureRepositorySet({request,source,policy,observedAt,fetchImpl,onSnapshot,sleepImpl=delay}){
  assert(request.kind==='gameplay','REPOSITORY_SET_ACQUISITION_KIND');
  const {scope,set,paths}=repositorySetRequestScope(request,source),snapshots=[];
  for(const [index,path]of paths.entries()){
    if(index>0)await sleepImpl(Math.max(1000,source.request_interval_ms??1000));
    const {receipt}=await acquireApprovedReceipt({request:{id:`${request.id}-original-${index}`,kind:'gameplay',url:rawUrl(scope,path)},source,policy,observedAt,fetchImpl});
    if(onSnapshot)await onSnapshot(receipt,source);
    snapshots.push({url:receipt.url,observed_at:receipt.observed_at,body_text:receipt.body_text,body_sha256:receipt.body_sha256});
  }
  const body_text=JSON.stringify({version:'tcgdex_repository_set_capture:v1',repository:REPOSITORY,commit_sha:scope.commit_sha,set_id:set.id,snapshots});
  const receipt={id:request.id,source_id:source.id,kind:'gameplay',url:request.url,observed_at:observedAt,body_text,body_sha256:sha256(body_text)};
  decodeRepositorySetCapture(receipt,source);return{receipt,acquisition_hash:digest(receipt)};
}
