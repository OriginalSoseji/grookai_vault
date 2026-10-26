/** Credential-free, network-free preparation wrapper over a fixed operator feed. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {normalizePricingCompletionOperatorReadbackV1} from './pricing_completion_operator_readback_v1.mjs';
import {runPricingCompletionCycleV1} from './pricing_completion_worker_v1.mjs';
import {writePricingArtifactV1} from './pricing_completion_files_v1.mjs';

const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const PROJECT='ycdxbpibncqcchqiihfz';
const MAX_CAPTURE=256*1024*1024;
const sha=b=>createHash('sha256').update(b).digest('hex');
const encoded=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
function syncDirectory(directory){
  let fd;
  try{fd=fs.openSync(directory,fs.constants.O_RDONLY);fs.fsyncSync(fd);}
  catch(error){
    // Linux runtime durability is mandatory. Windows does not consistently
    // expose directory handles/fsync through Node; only those errors are waived.
    if(process.platform!=='win32'||!['EPERM','EACCES','EINVAL','EISDIR','ENOTSUP'].includes(error.code))throw error;
  }finally{if(fd!==undefined)fs.closeSync(fd);}
}
function requireValue(ok,code){if(!ok){const e=new Error(code);e.feedCode=code;throw e;}}
function exact(value,keys,code){requireValue(value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k)),code);}
function timestamp(value){requireValue(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value),'FEED_TIMESTAMP_FORMAT');const t=Date.parse(value);requireValue(Number.isFinite(t)&&new Date(t).toISOString()===value,'FEED_TIMESTAMP_INVALID');return t;}
function directories(value,create=false){
  requireValue(typeof value==='string'&&path.isAbsolute(value),'FEED_ABSOLUTE_PATH_REQUIRED');
  const resolved=path.resolve(value);let cursor=path.parse(resolved).root;
  for(const part of resolved.slice(cursor.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,part);
    if(!fs.existsSync(cursor)){requireValue(create,'FEED_DIRECTORY_MISSING');fs.mkdirSync(cursor,{mode:0o700});syncDirectory(path.dirname(cursor));}
    const st=fs.lstatSync(cursor);requireValue(st.isDirectory()&&!st.isSymbolicLink(),'FEED_DIRECTORY_REDIRECTED');
  }
  return resolved;
}
function disjoint(a,b){if(process.platform==='win32'){a=a.toLowerCase();b=b.toLowerCase();}return a!==b&&!a.startsWith(b+path.sep)&&!b.startsWith(a+path.sep);}
export function validatePricingCompletionFeedDirectoriesV1(options){
  const names=['feedDirectory','cacheDirectory','stateDirectory','outputDirectory'];
  const paths=names.map(k=>{requireValue(typeof options[k]==='string'&&path.isAbsolute(options[k]),'FEED_ABSOLUTE_PATH_REQUIRED');return path.resolve(options[k]);});
  for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++)requireValue(disjoint(paths[i],paths[j]),'FEED_DIRECTORIES_MUST_BE_DISJOINT');
  // Controller/runtime mounts establish read-only feed ownership. No path from a
  // manifest ever selects a directory and this module never writes to the feed.
  for(const k of ['cacheDirectory','stateDirectory','outputDirectory'])directories(options[k],true);
}
function read(file,max){
  directories(path.dirname(file));const st=fs.lstatSync(file);
  requireValue(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=max,'FEED_FILE_INVALID');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  try{const opened=fs.fstatSync(fd);requireValue(opened.isFile()&&opened.size===st.size&&opened.size<=max,'FEED_FILE_CHANGED');const b=fs.readFileSync(fd);requireValue(b.length===opened.size,'FEED_FILE_CHANGED');return b;}finally{fs.closeSync(fd);}
}
function parse(bytes){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{requireValue(false,'FEED_JSON_INVALID');}}
function failureCode(error){return /^[A-Z0-9_]+$/.test(error?.feedCode??'')?error.feedCode:/^E[A-Z]+$/.test(error?.code??'')?`FEED_IO_${error.code}`:'FEED_VALIDATION_FAILED';}
function cursorRead(root){const file=path.join(root,'accepted-feed.json');if(!fs.existsSync(file))return null;const v=parse(read(file,16384));
  exact(v,['version','generationId','manifestSha256','capturedAt','publishedAt','sourceFinishedAt','publicationCompletedAt'],'FEED_CURSOR_INVALID');
  requireValue(v.version==='PRICING_SOURCE_FEED_CURSOR_V1'&&SHA.test(v.generationId)&&SHA.test(v.manifestSha256),'FEED_CURSOR_INVALID');
  for(const field of ['capturedAt','publishedAt','sourceFinishedAt','publicationCompletedAt'])timestamp(v[field]);return v;}
const CACHE_FILES=['input_manifest.json','snapshot.json','source_metadata.json'];
function cacheInventory(root){
  const generations=path.join(root,'generations');if(!fs.existsSync(generations))return [];
  directories(generations);const inventory=[];let pending=0;
  for(const name of fs.readdirSync(generations)){
    const dir=path.join(generations,name);directories(dir);
    if(/^\.pending-[a-f0-9-]{36}$/.test(name)){
      pending++;requireValue(pending<=2,'FEED_CACHE_PENDING_LIMIT');
      for(const file of fs.readdirSync(dir)){requireValue(CACHE_FILES.includes(file),'FEED_CACHE_UNKNOWN_FILE');const st=fs.lstatSync(path.join(dir,file));requireValue(st.isFile()&&!st.isSymbolicLink(),'FEED_CACHE_UNSAFE_PENDING');}
      continue; // Preserve bounded interrupted preparation evidence.
    }
    requireValue(SHA.test(name),'FEED_CACHE_UNKNOWN_DIRECTORY');
    requireValue(fs.readdirSync(dir).sort().join('|')===CACHE_FILES.join('|'),'FEED_CACHE_CONTENT_MISMATCH');
    const meta=parse(read(path.join(dir,'source_metadata.json'),16384));
    exact(meta,['version','generationId','manifestSha256','collectorSha256','sqlSha256','capturedAt','sourceFinishedAt','masterCoverage','remoteRollbackVerifiedByAdapter'],'FEED_CACHE_METADATA_INVALID');
    requireValue(meta.version==='PRICING_SOURCE_FEED_NORMALIZED_ORIGIN_V1'&&meta.generationId===name&&[meta.manifestSha256,meta.collectorSha256,meta.sqlSha256].every(v=>SHA.test(v??''))
      &&meta.masterCoverage==='unknown'&&meta.remoteRollbackVerifiedByAdapter===false,'FEED_CACHE_METADATA_INVALID');
    const captured=timestamp(meta.capturedAt);timestamp(meta.sourceFinishedAt);
    const manifest=parse(read(path.join(dir,'input_manifest.json'),16384));
    exact(manifest,['schema_version','snapshot'],'FEED_CACHE_MANIFEST_INVALID');exact(manifest.snapshot,['path','sha256'],'FEED_CACHE_MANIFEST_INVALID');
    requireValue(manifest.schema_version==='PRICING_COMPLETION_SNAPSHOT_FILES_V1'&&manifest.snapshot.path==='snapshot.json'&&SHA.test(manifest.snapshot.sha256??''),'FEED_CACHE_MANIFEST_INVALID');
    const snapshotBytes=read(path.join(dir,'snapshot.json'),MAX_CAPTURE);
    requireValue(sha(snapshotBytes)===manifest.snapshot.sha256,'FEED_CACHE_CONTENT_MISMATCH');
    const snapshot=parse(snapshotBytes);requireValue(snapshot.schemaVersion==='pricing-completion-input-v1'&&snapshot.observedAt===meta.sourceFinishedAt
      &&UUID.test(snapshot.sourceRunId??'')&&snapshot.coverage?.masterToPrice?.status==='unknown','FEED_CACHE_SNAPSHOT_INVALID');
    inventory.push({name,dir,captured});
  }
  return inventory;
}
function pruneCache(root,current){
  const inventory=cacheInventory(root);requireValue(inventory.some(v=>v.name===current),'FEED_CACHE_CURRENT_MISSING');
  const others=inventory.filter(v=>v.name!==current).sort((a,b)=>b.captured-a.captured||a.name.localeCompare(b.name));
  const keep=new Set([current,...others.slice(0,1).map(v=>v.name)]),removed=[];
  for(const item of inventory.filter(v=>!keep.has(v.name))){
    // Inventory verified only these exact regular files in a SHA-named direct
    // child. No recursive operation, queue data, packet or history is touched.
    for(const name of CACHE_FILES)fs.unlinkSync(path.join(item.dir,name));
    fs.rmdirSync(item.dir);removed.push(item.name);
  }
  syncDirectory(path.join(root,'generations'));
  return {retained:[...keep],removed,maximumCompletedGenerations:2};
}
function immutableCache(root,id,snapshot,metadata){
  const generations=path.join(root,'generations');directories(generations,true);
  const snapshotBytes=encoded(snapshot),files={'snapshot.json':snapshotBytes,
    'input_manifest.json':encoded({schema_version:'PRICING_COMPLETION_SNAPSHOT_FILES_V1',snapshot:{path:'snapshot.json',sha256:sha(snapshotBytes)}}),
    'source_metadata.json':encoded(metadata)};
  const target=path.join(generations,id);
  function validate(){directories(target);requireValue(fs.readdirSync(target).sort().join('|')===Object.keys(files).sort().join('|'),'FEED_CACHE_CONTENT_MISMATCH');for(const [name,bytes]of Object.entries(files))requireValue(read(path.join(target,name),MAX_CAPTURE).equals(bytes),'FEED_CACHE_CONTENT_MISMATCH');}
  if(fs.existsSync(target))validate();else{
    const staging=path.join(generations,`.pending-${randomUUID()}`);fs.mkdirSync(staging,{mode:0o700});
    for(const [name,bytes]of Object.entries(files)){const fd=fs.openSync(path.join(staging,name),'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
    syncDirectory(staging);
    // A crash preserves an unaccepted staging directory; the next attempt can
    // publish a new complete staging directory without overwriting evidence.
    try{fs.renameSync(staging,target);}catch(error){if(!fs.existsSync(target))throw error;validate();}
    syncDirectory(generations);
  }
  return path.join(target,'input_manifest.json');
}

// Keep raw capture bytes, the operator parse and normalized observations out of
// the queue phase's live scope. Return only small provenance and a bound path.
async function acceptFeed({feedDirectory,cacheDirectory,expectedCollectorSha256,expectedSqlSha256,now,maxCaptureAgeMs}) {
    directories(feedDirectory);
    const statusPath=path.join(feedDirectory,'status.json'),latestPath=path.join(feedDirectory,'latest.json');
    const statusBytes=read(statusPath,16384),status=parse(statusBytes);
    exact(status,['version','state','attemptedAt','generationId','errorCode'],'FEED_STATUS_INVALID');
    requireValue(status.version==='PRICING_SOURCE_FEED_STATUS_V1','FEED_STATUS_VERSION');
    requireValue(status.state==='published'||status.state==='failed','FEED_STATUS_INVALID');
    const attempted=timestamp(status.attemptedAt);requireValue(attempted<=now&&now-attempted<=maxCaptureAgeMs,'FEED_STATUS_STALE_OR_FUTURE');
    requireValue(status.state==='published','FEED_PUBLISHER_FAILED');
    requireValue(status.errorCode===null&&SHA.test(status.generationId??''),'FEED_STATUS_INVALID');
    const latestBytes=read(latestPath,16384),latest=parse(latestBytes);
    exact(latest,['version','generationId','generationPath','captureSha256','manifestSha256','publishedAt'],'FEED_LATEST_INVALID');
    requireValue(latest.version==='PRICING_SOURCE_FEED_LATEST_V1'&&SHA.test(latest.generationId??'')&&latest.captureSha256===latest.generationId&&SHA.test(latest.manifestSha256??''),'FEED_LATEST_INVALID');
    requireValue(status.generationId===latest.generationId,'FEED_STATUS_GENERATION_MISMATCH');
    requireValue(latest.generationPath===`generations/${latest.generationId}`,'FEED_GENERATION_PATH_INVALID');
    const generation=path.join(feedDirectory,'generations',latest.generationId);
    const manifestBytes=read(path.join(generation,'manifest.json'),32768);
    requireValue(sha(manifestBytes)===latest.manifestSha256,'FEED_MANIFEST_HASH_MISMATCH');
    const m=parse(manifestBytes);
    exact(m,['version','generationId','captureFile','captureSha256','captureBytes','collectorSha256','sqlSha256','projectRef','sourceRunId','publicationSetId','sourceSyncRunId','capturedAt','publishedAt','sourceFinishedAt'],'FEED_MANIFEST_INVALID');
    requireValue(m.version==='PRICING_SOURCE_FEED_GENERATION_V1'&&m.generationId===latest.generationId&&m.captureSha256===latest.captureSha256&&m.captureFile==='capture.json','FEED_MANIFEST_GENERATION_MISMATCH');
    requireValue(m.collectorSha256===expectedCollectorSha256&&m.sqlSha256===expectedSqlSha256,'FEED_PRODUCER_PIN_MISMATCH');
    requireValue(m.projectRef===PROJECT&&[m.sourceRunId,m.publicationSetId,m.sourceSyncRunId].every(v=>typeof v==='string'&&UUID.test(v)),'FEED_SOURCE_IDENTITY_INVALID');
    requireValue(Number.isSafeInteger(m.captureBytes)&&m.captureBytes>0&&m.captureBytes<=MAX_CAPTURE,'FEED_CAPTURE_SIZE_INVALID');
    const captured=timestamp(m.capturedAt),published=timestamp(m.publishedAt),sourceFinished=timestamp(m.sourceFinishedAt);
    requireValue(m.publishedAt===latest.publishedAt&&captured<=published&&published<=attempted,'FEED_CLOCK_ORDER_INVALID');
    requireValue(now-captured<=maxCaptureAgeMs&&sourceFinished<=captured&&now-sourceFinished<=86400000,'FEED_CAPTURE_OR_SOURCE_STALE');
    const capture=read(path.join(generation,'capture.json'),MAX_CAPTURE);
    requireValue(capture.length===m.captureBytes&&sha(capture)===m.captureSha256,'FEED_CAPTURE_HASH_MISMATCH');
    const result=await normalizePricingCompletionOperatorReadbackV1({readbackBytes:capture,expectedReadbackSha256:m.captureSha256,expectedSqlSha256,now,maxCaptureAgeMs});
    requireValue(result.receipt.operatorExportVersion==='FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V2'&&result.receipt.operatorTerminalRecordValidated===true,'FEED_V2_REQUIRED');
    requireValue(result.receipt.runId===m.sourceRunId&&result.receipt.sourceSyncRunId===m.sourceSyncRunId
      &&result.receipt.currentPublication.publication_set_id===m.publicationSetId&&result.receipt.operatorCapturedAt===m.capturedAt
      &&result.receipt.sourceFinishedAt===m.sourceFinishedAt,'FEED_CAPTURE_PROVENANCE_MISMATCH');
    requireValue(result.normalized.freshness==='fresh'&&result.snapshot.coverage.masterToPrice.status==='unknown','FEED_NORMALIZED_SCOPE_INVALID');
    const previous=cursorRead(cacheDirectory),publicationCompletedAt=result.receipt.publicationCompletedAt;
    timestamp(publicationCompletedAt);
    if(previous){
      if(previous.generationId===m.generationId)requireValue(previous.manifestSha256===latest.manifestSha256,'FEED_GENERATION_REWRITTEN');
      else requireValue(published>timestamp(previous.publishedAt)&&captured>timestamp(previous.capturedAt),'FEED_GENERATION_ROLLBACK');
      requireValue(sourceFinished>=timestamp(previous.sourceFinishedAt)&&timestamp(publicationCompletedAt)>=timestamp(previous.publicationCompletedAt),'FEED_SOURCE_CLOCK_ROLLBACK');
    }
    // A root publisher may atomically advance during validation. Never combine
    // generations or proceed after a concurrently published failure status.
    requireValue(read(latestPath,16384).equals(latestBytes)&&read(statusPath,16384).equals(statusBytes),'FEED_CHANGED_DURING_READ');
    const inventory=cacheInventory(cacheDirectory); // Reject unsafe/orphan overflow before writing more cache data.
    // A repeatedly failing worker must not accumulate a new completed snapshot
    // every refresh. Keep at most one recoverable generation beyond the normal
    // current-plus-previous pair, and allow retries of an existing generation.
    requireValue(inventory.length<=3&&(inventory.length<3||inventory.some(v=>v.name===m.generationId)),'FEED_CACHE_COMPLETED_LIMIT');
    const input=immutableCache(cacheDirectory,m.generationId,result.snapshot,{version:'PRICING_SOURCE_FEED_NORMALIZED_ORIGIN_V1',
      generationId:m.generationId,manifestSha256:latest.manifestSha256,collectorSha256:m.collectorSha256,sqlSha256:m.sqlSha256,
      capturedAt:m.capturedAt,sourceFinishedAt:m.sourceFinishedAt,masterCoverage:'unknown',remoteRollbackVerifiedByAdapter:false});
    // This is a validated-feed high-water mark, not a preparation-success claim.
    // Persist it before any queue mutation so a crash cannot admit older evidence.
    writePricingArtifactV1(cacheDirectory,'accepted-feed.json',{version:'PRICING_SOURCE_FEED_CURSOR_V1',generationId:m.generationId,manifestSha256:latest.manifestSha256,
      capturedAt:m.capturedAt,publishedAt:m.publishedAt,sourceFinishedAt:m.sourceFinishedAt,publicationCompletedAt});
    syncDirectory(cacheDirectory);
    return {input,generationId:m.generationId,sourceRunId:m.sourceRunId,sourceFinishedAt:m.sourceFinishedAt};
}

export async function runPricingCompletionFeedCycleV1({feedDirectory,cacheDirectory,stateDirectory,outputDirectory,
  expectedCollectorSha256,expectedSqlSha256,now=Date.now(),batchSize=100,maxCaptureAgeMs=1800000}={}) {
  const opts={feedDirectory,cacheDirectory,stateDirectory,outputDirectory};
  validatePricingCompletionFeedDirectoriesV1(opts);
  requireValue(Number.isSafeInteger(now)&&now>=0,'FEED_TIME_INVALID');
  requireValue(Number.isSafeInteger(maxCaptureAgeMs)&&maxCaptureAgeMs>=1000&&maxCaptureAgeMs<=86400000,'FEED_AGE_LIMIT_INVALID');
  requireValue(Number.isSafeInteger(batchSize)&&batchSize>=1&&batchSize<=500,'FEED_BATCH_SIZE_INVALID');
  requireValue(SHA.test(expectedCollectorSha256??'')&&SHA.test(expectedSqlSha256??''),'FEED_EXTERNAL_PINS_REQUIRED');
  const at=new Date(now).toISOString();
  let queueCycleInvoked=false;
  try{
    if(fs.existsSync(path.join(stateDirectory,'PAUSE'))){const paused={state:'paused',at,productionExecutionEnabled:false,queueCycleInvoked:false};writePricingArtifactV1(outputDirectory,'heartbeat.json',paused);return paused;}
    const accepted=await acceptFeed({feedDirectory,cacheDirectory,expectedCollectorSha256,expectedSqlSha256,now,maxCaptureAgeMs});
    queueCycleInvoked=true;
    const worker=runPricingCompletionCycleV1({input:accepted.input,stateDirectory,outputDirectory,batchSize,now});
    const cacheRetention=pruneCache(cacheDirectory,accepted.generationId);
    const report={state:'prepared',at,generationId:accepted.generationId,sourceRunId:accepted.sourceRunId,sourceFinishedAt:accepted.sourceFinishedAt,
      productionExecutionEnabled:false,queueCycleInvoked:true,completionAllowed:false,preparedItems:worker.preparedItems,unresolved:worker.queue.unresolved,cacheRetention};
    writePricingArtifactV1(outputDirectory,'heartbeat.json',report);return {...report,worker};
  }catch(error){
    const failure={state:'failed',at,runId:randomUUID(),errorCode:failureCode(error),productionExecutionEnabled:false,queueCycleInvoked,completionAllowed:false};
    writePricingArtifactV1(outputDirectory,`feed-failure-${failure.runId}.json`,failure);writePricingArtifactV1(outputDirectory,'heartbeat.json',failure);return failure;
  }
}
