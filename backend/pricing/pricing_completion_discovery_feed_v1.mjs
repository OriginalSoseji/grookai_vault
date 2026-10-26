/** Credential-free preparation over a fixed, read-only operator census feed. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {normalizePricingCompletionMasterDiscoveryV1} from './pricing_completion_master_discovery_v1.mjs';
import {normalizePricingCompletionWarehouseIntakeV1} from './pricing_completion_warehouse_intake_v1.mjs';
import {openPricingCompletionDiscoveryQueueV1} from './pricing_completion_discovery_queue_v1.mjs';

const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const PROJECT='ycdxbpibncqcchqiihfz';
const MAX_CAPTURE=256*1024*1024,MAX_META=32768,MAX_PACKET=16*1024*1024;
const GEN='DISCOVERY_CENSUS_FEED_GENERATION_V1';
const CA='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
const LANES=['master','warehouse'];
export const PRICING_DISCOVERY_REVIEWED_PINS_V1=Object.freeze({
  master:Object.freeze({collectorSha256:'4147bab66a3ce679d894e7ddb2716a1d0a68cfd6ed6058e05ad03f47d578dd03',
    sqlSha256:'dfa976ba1729edfd3ac38f385dec05c281d5f037766c9ba667734f60747fc5a3',
    appRpcSha256:'8d3e356a2e519d22d1ca166c213aea5d63fed02416f1436fa9447110e6ab5002'}),
  warehouse:Object.freeze({collectorSha256:'5c3ea3be2a549fc664863f141698d43c0676cc1c81cbc6c675382608fb23b7bb',
    sqlSha256:'f14167204580dee9615a0cde87a29c52d1d555df409114c4525b9863b8b64c7a'}),caSha256:CA,
});
function need(ok,code){if(!ok){const error=new Error(code);error.discoveryCode=code;throw error;}}
function exact(v,ks){need(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k)),'DISCOVERY_EXACT_FIELDS');}
function canonical(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`;return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;}
function bytes(v){return Buffer.from(canonical(v)+'\n');}
function hash(v){return createHash('sha256').update(v).digest('hex');}
function parse(raw){let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{need(false,'DISCOVERY_JSON_INVALID');}
  need(bytes(value).equals(raw),'DISCOVERY_METADATA_NOT_CANONICAL');return value;}
function ms(v){need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v),'DISCOVERY_TIMESTAMP_FORMAT');
  const n=Date.parse(v);need(Number.isFinite(n)&&new Date(n).toISOString()===v,'DISCOVERY_TIMESTAMP_INVALID');return n;}
function normalizedTime(v){const n=Date.parse(v);need(Number.isFinite(n),'DISCOVERY_RECEIPT_TIME');return new Date(n).toISOString();}
function syncDir(dir){let fd;try{fd=fs.openSync(dir,'r');fs.fsyncSync(fd);}catch(e){if(process.platform!=='win32'||!['EPERM','EACCES','EINVAL','EISDIR','ENOTSUP'].includes(e.code))throw e;}finally{if(fd!==undefined)fs.closeSync(fd);}}
function directory(value,create=false){need(typeof value==='string'&&path.isAbsolute(value),'DISCOVERY_ABSOLUTE_PATH');const full=path.resolve(value);let cursor=path.parse(full).root;
  for(const part of full.slice(cursor.length).split(/[\\/]/).filter(Boolean)){cursor=path.join(cursor,part);
    if(!fs.existsSync(cursor)){need(create,'DISCOVERY_DIRECTORY_MISSING');fs.mkdirSync(cursor,{mode:0o700});syncDir(path.dirname(cursor));}
    const s=fs.lstatSync(cursor);need(s.isDirectory()&&!s.isSymbolicLink(),'DISCOVERY_DIRECTORY_REDIRECTED');}return full;}
function read(file,max=MAX_META){directory(path.dirname(file));const before=fs.lstatSync(file);
  need(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,'DISCOVERY_UNSAFE_FILE');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  try{const s=fs.fstatSync(fd);need(s.isFile()&&s.nlink===1&&s.size===before.size&&s.ino===before.ino&&s.dev===before.dev,'DISCOVERY_FILE_CHANGED');
    const raw=fs.readFileSync(fd),after=fs.fstatSync(fd);need(raw.length===s.size&&after.size===s.size&&after.mtimeMs===s.mtimeMs&&after.ctimeMs===s.ctimeMs,'DISCOVERY_FILE_CHANGED');return raw;
  }finally{fs.closeSync(fd);}}
function artifact(root,name,value,immutable=false){need(/^[a-z0-9_.-]+$/.test(name),'DISCOVERY_ARTIFACT_NAME');directory(root);
  const raw=bytes(value);need(raw.length<=(immutable?MAX_PACKET:MAX_META),'DISCOVERY_ARTIFACT_BOUND');const target=path.join(root,name);
  if(fs.existsSync(target)){const previous=read(target,immutable?MAX_PACKET:MAX_META);if(immutable){need(previous.equals(raw),'DISCOVERY_IMMUTABLE_PACKET_CONFLICT');return hash(raw);}}
  const temp=path.join(root,`.pending-${randomUUID()}.tmp`);const fd=fs.openSync(temp,'wx',0o600);
  try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  if(immutable){try{fs.linkSync(temp,target);}catch(e){if(e.code!=='EEXIST')throw e;need(read(target,MAX_PACKET).equals(raw),'DISCOVERY_IMMUTABLE_PACKET_CONFLICT');}finally{fs.unlinkSync(temp);}}
  else fs.renameSync(temp,target);syncDir(root);return hash(raw);
}
function separate(a,b){if(process.platform==='win32'){a=a.toLowerCase();b=b.toLowerCase();}return a!==b&&!a.startsWith(b+path.sep)&&!b.startsWith(a+path.sep);}
export function validatePricingDiscoveryFeedDirectoriesV1(options){const names=['feedDirectory','stateDirectory','outputDirectory'];
  const paths=names.map(k=>{need(typeof options[k]==='string'&&path.isAbsolute(options[k]),'DISCOVERY_ABSOLUTE_PATH');return path.resolve(options[k]);});
  for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++)need(separate(paths[i],paths[j]),'DISCOVERY_DIRECTORIES_OVERLAP');
  for(const k of ['stateDirectory','outputDirectory'])directory(options[k],true);
}
function pins(value){exact(value,['master','warehouse','caSha256']);exact(value.master,['collectorSha256','sqlSha256','appRpcSha256']);exact(value.warehouse,['collectorSha256','sqlSha256']);
  need(value.caSha256===CA&&[...Object.values(value.master),...Object.values(value.warehouse)].every(v=>typeof v==='string'&&SHA.test(v)),'DISCOVERY_CONTROLLER_PINS_REQUIRED');return value;}
function fresh(m,status,now,maxAge){const published=ms(m.publishedAt),attempted=ms(status.attemptedAt),finished=ms(m.sourceFinishedAt);
  need(finished<=published&&published<=attempted&&attempted<=now&&now-attempted<=maxAge&&now-finished<=86400000,'DISCOVERY_STALE_OR_FUTURE');
  for(const lane of LANES){const captured=ms(m.captures[lane].capturedAt);need(finished<=captured&&captured<=published&&now-captured<=maxAge,'DISCOVERY_CAPTURE_STALE_OR_FUTURE');}
  need(ms(m.captures.master.capturedAt)<=ms(m.captures.warehouse.capturedAt),'DISCOVERY_CAPTURE_ORDER');
}
function metadata(options,now){const {feedDirectory,expectedPins,maxCaptureAgeMs}=options;directory(feedDirectory);
  const statusPath=path.join(feedDirectory,'status.json'),latestPath=path.join(feedDirectory,'latest.json');
  const statusBytes=read(statusPath),status=parse(statusBytes);exact(status,['version','state','attemptedAt','generationId','errorCode']);
  need(status.version==='DISCOVERY_CENSUS_FEED_STATUS_V1'&&status.state==='published'&&status.errorCode===null&&SHA.test(status.generationId??''),'DISCOVERY_PUBLISHER_NOT_SUCCESSFUL');
  const latestBytes=read(latestPath),latest=parse(latestBytes);exact(latest,['version','generationId','generationPath','manifestSha256','publishedAt']);
  need(latest.version==='DISCOVERY_CENSUS_FEED_LATEST_V1'&&SHA.test(latest.generationId??'')&&SHA.test(latest.manifestSha256??'')
    &&latest.generationId===status.generationId&&latest.generationPath===`generations/${latest.generationId}`,'DISCOVERY_LATEST_INVALID');
  const root=directory(path.join(feedDirectory,'generations',latest.generationId));
  need(fs.readdirSync(root).sort().join('|')===['manifest.json','master.json','warehouse.json'].join('|'),'DISCOVERY_GENERATION_LAYOUT');
  const manifestBytes=read(path.join(root,'manifest.json'));need(hash(manifestBytes)===latest.manifestSha256,'DISCOVERY_MANIFEST_HASH');const m=parse(manifestBytes);
  exact(m,['version','generationId','projectRef','sourceRunId','publicationSetId','sourceSyncRunId','sourceFinishedAt','publishedAt','snapshotSemantics','captures']);
  need(m.version===GEN&&m.generationId===latest.generationId&&m.projectRef===PROJECT&&m.publishedAt===latest.publishedAt
    &&m.snapshotSemantics==='separate_repeatable_read_transactions'&&[m.sourceRunId,m.publicationSetId,m.sourceSyncRunId].every(v=>typeof v==='string'&&UUID.test(v)),'DISCOVERY_MANIFEST_SCOPE');
  exact(m.captures,LANES);
  for(const lane of LANES){const c=m.captures[lane],p=expectedPins[lane];exact(c,['file','sha256','bytes','collectorSha256','sqlSha256','caSha256','appRpcSha256','capturedAt']);
    need(c.file===`${lane}.json`&&SHA.test(c.sha256??'')&&Number.isSafeInteger(c.bytes)&&c.bytes>0&&c.bytes<=MAX_CAPTURE,'DISCOVERY_CAPTURE_REFERENCE');
    need(c.collectorSha256===p.collectorSha256&&c.sqlSha256===p.sqlSha256&&c.caSha256===expectedPins.caSha256
      &&c.appRpcSha256===(lane==='master'?p.appRpcSha256:null),'DISCOVERY_PRODUCER_PINS');}
  need(hash(bytes({version:GEN,masterSha256:m.captures.master.sha256,warehouseSha256:m.captures.warehouse.sha256}))===m.generationId,'DISCOVERY_GENERATION_ID');
  fresh(m,status,now,maxCaptureAgeMs);
  return {manifest:m,status,latest,root,statusPath,latestPath,statusBytes,latestBytes};
}
function unchanged(meta,options,now){need(read(meta.statusPath).equals(meta.statusBytes)&&read(meta.latestPath).equals(meta.latestBytes),'DISCOVERY_FEED_CHANGED');fresh(meta.manifest,meta.status,now,options.maxCaptureAgeMs);}
function project(raw){return raw.map(row=>Object.fromEntries(['identity','issues','evidence','owner','nextAction',...(row.priority===undefined?[]:['priority'])].map(k=>[k,row[k]])));}
function laneRead(lane,meta,options,now){const c=meta.manifest.captures[lane],raw=read(path.join(meta.root,`${lane}.json`),MAX_CAPTURE);
  need(raw.length===c.bytes&&hash(raw)===c.sha256,'DISCOVERY_CAPTURE_HASH');
  const common={readbackBytes:raw,expectedReadbackSha256:c.sha256,expectedSqlSha256:options.expectedPins[lane].sqlSha256,now,maxCaptureAgeMs:options.maxCaptureAgeMs};
  const normalized=lane==='master'?normalizePricingCompletionMasterDiscoveryV1({...common,expectedRpcSha256:options.expectedPins.master.appRpcSha256})
    :normalizePricingCompletionWarehouseIntakeV1({...common,expectedCollectorSha256:options.expectedPins.warehouse.collectorSha256});
  const r=normalized.receipt,m=meta.manifest;
  need(r.sourceRunId===m.sourceRunId&&r.publicationSetId===m.publicationSetId&&r.sourceSyncRunId===m.sourceSyncRunId,'DISCOVERY_CAPTURE_TUPLE');
  const captured=lane==='master'?r.operatorCapturedAt:r.capturedAt,transaction=lane==='master'?r.transactionObservedAt:r.transactionAt;
  const sourceFinished=lane==='master'?r.currentPublication.source_finished_at:r.sourceFinishedAt;
  need(captured===c.capturedAt&&normalizedTime(sourceFinished)===m.sourceFinishedAt,'DISCOVERY_CAPTURE_PROVENANCE');
  const transactionMs=Date.parse(transaction);need(Number.isFinite(transactionMs)&&transactionMs<=ms(captured)
    &&ms(captured)-transactionMs<=305000&&now-transactionMs<=options.maxCaptureAgeMs,'DISCOVERY_TRANSACTION_TIME');
  return {observations:project(normalized.observations),transactionMs,summary:normalized.summary,coverage:normalized.coverage,
    reference:{captureSha256:c.sha256,capturedAt:captured,transactionAt:new Date(transactionMs).toISOString(),collectorSha256:c.collectorSha256,sqlSha256:c.sqlSha256,appRpcSha256:c.appRpcSha256}};
}
function cursor(state){const p=path.join(state,'accepted-feed.json');if(!fs.existsSync(p))return null;const v=parse(read(p));
  exact(v,['version','generationId','manifestSha256','publishedAt','sourceFinishedAt','masterCapturedAt','warehouseCapturedAt','observedAt']);
  need(v.version==='DISCOVERY_FEED_CURSOR_V1'&&SHA.test(v.generationId)&&SHA.test(v.manifestSha256),'DISCOVERY_CURSOR_INVALID');
  for(const k of ['publishedAt','sourceFinishedAt','masterCapturedAt','warehouseCapturedAt','observedAt'])ms(v[k]);return v;}
function admitCursor(state,meta,observedAt){const m=meta.manifest,previous=cursor(state),next={version:'DISCOVERY_FEED_CURSOR_V1',generationId:m.generationId,
  manifestSha256:meta.latest.manifestSha256,publishedAt:m.publishedAt,sourceFinishedAt:m.sourceFinishedAt,
  masterCapturedAt:m.captures.master.capturedAt,warehouseCapturedAt:m.captures.warehouse.capturedAt,observedAt:new Date(observedAt).toISOString()};
  if(previous){if(previous.generationId===next.generationId)need(canonical(previous)===canonical(next),'DISCOVERY_GENERATION_REWRITTEN');
    else need(ms(next.publishedAt)>ms(previous.publishedAt)&&ms(next.masterCapturedAt)>ms(previous.masterCapturedAt)
      &&ms(next.warehouseCapturedAt)>ms(previous.warehouseCapturedAt)&&observedAt>ms(previous.observedAt),'DISCOVERY_GENERATION_ROLLBACK');
    need(ms(next.sourceFinishedAt)>=ms(previous.sourceFinishedAt),'DISCOVERY_SOURCE_ROLLBACK');}
  artifact(state,'accepted-feed.json',next);return next;
}
function code(error){return /^DISCOVERY_[A-Z0-9_]+$/.test(error?.discoveryCode??'')?error.discoveryCode:
  /^E[A-Z]+$/.test(error?.code??'')?`DISCOVERY_IO_${error.code}`:'DISCOVERY_VALIDATION_FAILED';}

export function runPricingCompletionDiscoveryFeedCycleV1({feedDirectory,stateDirectory,outputDirectory,expectedPins,
  now=Date.now(),batchSize=100,maxCaptureAgeMs=1800000,leaseMs=300000}={}){
  const started=performance.now(),clock=()=>now+Math.floor(performance.now()-started);
  need(Number.isSafeInteger(now)&&now>=0&&Number.isSafeInteger(maxCaptureAgeMs)&&maxCaptureAgeMs>=1000&&maxCaptureAgeMs<=1800000,'DISCOVERY_CLOCK_CONFIG');
  need(Number.isSafeInteger(batchSize)&&batchSize>=1&&batchSize<=500&&Number.isSafeInteger(leaseMs)&&leaseMs>=1000&&leaseMs<=3600000,'DISCOVERY_BATCH_CONFIG');
  const options={feedDirectory,stateDirectory,outputDirectory,expectedPins:pins(expectedPins),maxCaptureAgeMs};
  validatePricingDiscoveryFeedDirectoriesV1(options);
  const paused=path.join(stateDirectory,'PAUSE');if(fs.existsSync(paused)){const s=fs.lstatSync(paused);need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1,'DISCOVERY_PAUSE_UNSAFE');
    const result={state:'paused',productionExecutionEnabled:false,completionAllowed:false,queueMutationStarted:false};artifact(outputDirectory,'heartbeat.json',result);return result;}
  const lock=path.join(stateDirectory,'CYCLE.lock');let fd;
  try{fd=fs.openSync(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')return {state:'blocked',errorCode:'DISCOVERY_CYCLE_LOCKED',queueMutationStarted:false,productionExecutionEnabled:false,completionAllowed:false};throw e;}
  const token=randomUUID();let queueMutationStarted=false;
  try{fs.writeFileSync(fd,bytes({token}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;syncDir(stateDirectory);
    const meta=metadata(options,clock());
    // Each normalizer's large raw parse dies in its own scope. Only compact work
    // entities survive to combined queue ingestion; no duplicate full cache.
    const master=laneRead('master',meta,options,clock());unchanged(meta,options,clock());
    const warehouse=laneRead('warehouse',meta,options,clock());
    const observedAt=Math.min(master.transactionMs,warehouse.transactionMs),m=meta.manifest;
    const sourceLinks={version:'DISCOVERY_COMBINED_ORIGIN_V1',generationId:m.generationId,manifestSha256:meta.latest.manifestSha256,
      snapshotSemantics:m.snapshotSemantics,sourceRunId:m.sourceRunId,publicationSetId:m.publicationSetId,sourceSyncRunId:m.sourceSyncRunId,
      sourceFinishedAt:m.sourceFinishedAt,master:master.reference,warehouse:warehouse.reference};
    const observations=master.observations.concat(warehouse.observations);
    unchanged(meta,options,clock());
    // High-water cursor is provenance only. Both sources are already admitted;
    // a crash after this write may replay the same generation without rollback.
    admitCursor(stateDirectory,meta,observedAt);
    const q=openPricingCompletionDiscoveryQueueV1({directory:path.join(stateDirectory,'queue')});
    unchanged(meta,options,clock());queueMutationStarted=true;
    const ingestion=q.ingestGeneration({generationId:m.generationId,observedAt,sourceLinks,observations},{now:clock()});
    unchanged(meta,options,clock());
    const claimed=q.claimBatch({now:clock(),limit:batchSize,leaseMs,workerId:'pricing-discovery-preparation-v1'});
    let packet=null;
    if(claimed.length){const preparedAt=clock();unchanged(meta,options,preparedAt);
      const value={version:'PRICING_DISCOVERY_REVIEW_PACKET_V1',generationId:m.generationId,preparedAt:new Date(preparedAt).toISOString(),
        sourceLinks,productionExecutionEnabled:false,completionAllowed:false,databaseWrites:0,
        items:claimed.map(i=>({key:i.key,identity:i.identity,issues:i.issues,evidence:i.evidence,semanticDigest:i.semanticDigest,
          owner:i.owner,nextAction:i.nextAction,firstSeen:i.firstSeen,lastSeen:i.lastSeen,lastGeneration:i.lastGeneration,
          itemSourceLinks:i.sourceLinks,totalAttempts:i.totalAttempts,lease:{token:i.lease.token,until:i.lease.until}}))};
      const id=hash(bytes(value)),name=`packet-${id}.json`;artifact(outputDirectory,name,value,true);
      // Never acknowledge before immutable packet bytes and directory are flushed.
      unchanged(meta,options,clock());
      const deferred=q.deferBatch({now:clock(),claims:claimed.map(i=>({key:i.key,token:i.lease.token})),
        reason:`Review packet ${id} requires independently qualified repair authority.`,owner:'pokemon-discovery-review',
        nextAction:'Review exact captured identities and independently verify any later publication; preparation is not completion.'});
      packet={file:name,sha256:id,items:deferred.deferred};
    }
    unchanged(meta,options,clock());
    const result={state:'prepared',generationId:m.generationId,observedAt:new Date(observedAt).toISOString(),
      productionExecutionEnabled:false,completionAllowed:false,databaseWrites:0,queueMutationStarted,ingestion,packet,
      inputSummary:{master:master.summary,warehouse:warehouse.summary},coverage:{master:master.coverage,warehouse:warehouse.coverage},queue:q.summary()};
    unchanged(meta,options,clock());
    artifact(outputDirectory,'heartbeat.json',result);return result;
  }catch(error){const failure={state:'failed',errorCode:code(error),queueMutationStarted,productionExecutionEnabled:false,completionAllowed:false,databaseWrites:0,at:new Date(clock()).toISOString()};
    artifact(outputDirectory,`failure-${randomUUID()}.json`,failure,true);artifact(outputDirectory,'heartbeat.json',failure);return failure;
  }finally{if(fd!==undefined)fs.closeSync(fd);const value=parse(read(lock));need(value.token===token,'DISCOVERY_CYCLE_LOCK_CHANGED');fs.unlinkSync(lock);syncDir(stateDirectory);}
}
