import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {assert,digest,sha256,text} from '../common.mjs';
import {acquireApprovedReceipt} from '../acquire.mjs';
import {readStaticCardModule,englishCardData} from './static_card_module_v1.mjs';

export const REPOSITORY='tcgdex/cards-database';
const RAW=`https://raw.githubusercontent.com/${REPOSITORY}`;
const blobHash=body=>createHash('sha1').update(`blob ${Buffer.byteLength(body)}\0`).update(body).digest('hex');
export function repositoryRequestScope(request,source) {
  const scope=source.repository;
  assert(source.adapter==='tcgdex_repository_card_v1'&&scope?.repository===REPOSITORY&&/^[a-f0-9]{40}$/.test(scope.commit_sha)&&
    source.review.repository_scope_hash===digest(scope),'REPOSITORY_ADMITTED_SCOPE');
  assert(Array.isArray(scope.sets)&&scope.sets.length<=20&&scope.blobs&&typeof scope.blobs==='object'&&!Array.isArray(scope.blobs), 'REPOSITORY_SCOPE_SHAPE');
  const set=scope.sets.find(set=>set.id===request.set_id);
  assert(set&&/^[a-zA-Z0-9.-]+$/.test(set.id)&&/^[A-Za-z0-9][A-Za-z0-9 &-]{0,99}$/.test(set.name)&&/^\d{3}$/.test(request.local_id),'REPOSITORY_CARD_SCOPE');
  const series=set.series??'Mega Evolution';assert(['Mega Evolution','Scarlet & Violet'].includes(series),'REPOSITORY_SERIES_SCOPE');
  const path=`data/${series}/${set.name}/${request.local_id}.ts`;
  assert(request.url===`${RAW}/${scope.commit_sha}/${path.split('/').map(encodeURIComponent).join('/')}`&&scope.blobs[path], 'REPOSITORY_PINNED_CARD_URL');
  return {scope,set,path,series};
}

export function decodeRepositoryCapture(receipt,source) {
  let capture;try{capture=JSON.parse(receipt.body_text);}catch{assert(false,'REPOSITORY_CAPTURE_JSON');}
  assert(capture?.version==='tcgdex_repository_capture:v1','REPOSITORY_CAPTURE_VERSION');
  const {scope,set,path,series}=repositoryRequestScope({url:receipt.url,set_id:capture.set_id,local_id:capture.local_id},source);
  const expected=[path,`data/${series}/${set.name}.ts`,'LICENSE'];
  assert(capture.repository===REPOSITORY&&capture.commit_sha===scope.commit_sha&&Array.isArray(capture.snapshots)&&capture.snapshots.length===3,'REPOSITORY_CAPTURE_SCOPE');
  const originals=expected.map(file=>{
    const matches=capture.snapshots.filter(snapshot=>snapshot.url===`${RAW}/${scope.commit_sha}/${file.split('/').map(encodeURIComponent).join('/')}`);
    assert(matches.length===1,'REPOSITORY_ORIGINAL_REQUIRED');const snapshot=matches[0];
    assert(snapshot.observed_at===receipt.observed_at&&typeof snapshot.body_text==='string'&&sha256(snapshot.body_text)===snapshot.body_sha256&&blobHash(snapshot.body_text)===scope.blobs[file], 'REPOSITORY_ORIGINAL_HASH');
    return snapshot.body_text;
  });
  assert(sha256(originals[2])===scope.license_sha256&&originals[2].includes('MIT License'),'REPOSITORY_LICENSE');
  const setData=englishCardData(readStaticCardModule(originals[1],{kind:'set',seriesName:series}));
  assert(setData.id===set.id&&setData.name===set.name&&Number.isInteger(setData.cardCount?.official),'REPOSITORY_SET_METADATA');
  const data=englishCardData(readStaticCardModule(originals[0],{kind:'card',setName:set.name}));
  assert(!Object.hasOwn(data,'id')&&!Object.hasOwn(data,'localId'),'REPOSITORY_DERIVED_COORDINATE_CONFLICT');
  const {set:parent,variants,...fields}=data;
  const card={...fields,id:`${set.id}-${capture.local_id}`,localId:capture.local_id,set:{id:set.id,name:set.name,cardCount:{official:setData.cardCount.official}}};
  if(variants!==undefined){assert(Array.isArray(variants),'REPOSITORY_VARIANTS');card.variants_detailed=variants;}
  text(card.name);return {card,provenance:{kind:'tcgdex_repository_card_v1',authority:'tcgdex',repository:REPOSITORY,commit_sha:scope.commit_sha,
    card_blob_sha1:scope.blobs[path],original_receipt_id:receipt.id}};
}

export async function captureRepositoryCard({request,source,policy,observedAt,fetchImpl,onSnapshot,sleepImpl=delay}) {
  assert(request.kind==='gameplay','REPOSITORY_ACQUISITION_KIND');
  const {scope,set,path,series}=repositoryRequestScope(request,source),snapshots=[];
  for(const [index,file]of[path,`data/${series}/${set.name}.ts`,'LICENSE'].entries()){
    if(index>0)await sleepImpl(Math.max(1000,source.request_interval_ms??1000));
    const url=`${RAW}/${scope.commit_sha}/${file.split('/').map(encodeURIComponent).join('/')}`;
    const {receipt}=await acquireApprovedReceipt({request:{id:`${request.id}-original-${index}`,kind:'gameplay',url},source,policy,observedAt,fetchImpl});
    if(onSnapshot)await onSnapshot(receipt,source);
    snapshots.push({url,observed_at:receipt.observed_at,body_text:receipt.body_text,body_sha256:receipt.body_sha256});
  }
  const body_text=JSON.stringify({version:'tcgdex_repository_capture:v1',repository:REPOSITORY,commit_sha:scope.commit_sha,
    set_id:set.id,local_id:request.local_id,snapshots});
  const receipt={id:request.id,source_id:source.id,kind:'gameplay',url:request.url,observed_at:observedAt,body_text,body_sha256:sha256(body_text)};
  decodeRepositoryCapture(receipt,source);return {receipt,acquisition_hash:digest(receipt)};
}
