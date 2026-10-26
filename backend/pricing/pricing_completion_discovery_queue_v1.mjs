/** Credential-free preparation state. No database, network, subprocess or resolve API.
 * Immutable hash-addressed shards/receipts; CURRENT.json is the only commit point.
 * Controller-owned directory required. Hashes detect corruption, not a malicious
 * principal able to rewrite the whole directory. Stale locks are never stolen.
 */
import {closeSync,existsSync,fsyncSync,lstatSync,mkdirSync,openSync,readFileSync,readdirSync,
  renameSync,unlinkSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {dirname,isAbsolute,join,parse,resolve} from 'node:path';

export const PRICING_COMPLETION_DISCOVERY_QUEUE_VERSION_V1='pricing-completion-discovery-queue-v1';
const VERSION=PRICING_COMPLETION_DISCOVERY_QUEUE_VERSION_V1;
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TOKEN=/^[a-z][a-z0-9_-]{0,95}$/;
const STATES=new Set(['pending','leased','retry','review_needed']);
const BUCKETS=Array.from({length:256},(_,i)=>i.toString(16).padStart(2,'0'));
const MAX_SHARD=8*1024*1024, MAX_SMALL=256*1024, MAX_ITEM=128*1024;
function fail(code){throw new Error(`pricing_completion_discovery_queue: ${code}`);}
function assert(ok,code){if(!ok)fail(code);}
function integer(n,min=0,max=Number.MAX_SAFE_INTEGER){assert(Number.isSafeInteger(n)&&n>=min&&n<=max,'invalid_integer');return n;}
function keys(o,expected){assert(o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...expected].sort().join('|'),'unexpected_fields');}
function string(s,max=1000){assert(typeof s==='string'&&s.length>0&&s.length<=max&&s===s.trim(),'invalid_text');return s;}
function time(n){return integer(n,0,8640000000000000);}
function canonical(value,depth=0,seen=new Set()){
  assert(depth<=12,'json_depth');
  if(value===null||typeof value==='boolean'||typeof value==='string')return value;
  if(typeof value==='number'){assert(Number.isFinite(value),'nonfinite_json');return value;}
  assert(value&&typeof value==='object'&&!seen.has(value),'invalid_json');seen.add(value);
  let result;
  if(Array.isArray(value)){assert(value.length<=10000,'json_array_bound');result=value.map(v=>canonical(v,depth+1,seen));}
  else{assert(Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).length<=1000,'invalid_json_object');
    result=Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k],depth+1,seen)]));}
  seen.delete(value);return result;
}
function encode(value){return JSON.stringify(canonical(value));}
function hash(bytes){return createHash('sha256').update(bytes).digest('hex');}
function digest(value){return hash(encode(value));}
function compact(value,max){const normalized=canonical(value);assert(Buffer.byteLength(JSON.stringify(normalized))<=max,'json_size_bound');return normalized;}
function identity(value){
  assert(value&&typeof value==='object','identity_required');
  if(value.kind==='master_printing'){
    keys(value,['kind','printingId','currency','condition']);
    assert(typeof value.printingId==='string'&&typeof value.currency==='string'&&UUID.test(value.printingId)&&/^[A-Z]{3}$/.test(value.currency)&&value.currency!=='XXX'
      &&value.condition==='NOT_CONDITION_SPECIFIC','invalid_master_identity');
  }else if(value.kind==='catalog_parent'){
    keys(value,['kind','parentId']);assert(typeof value.parentId==='string'&&UUID.test(value.parentId),'invalid_parent_identity');
  }else if(value.kind==='warehouse_product'){
    keys(value,['kind','provider','category','productId']);
    assert(['provider','category','productId'].every(k=>typeof value[k]==='string')&&TOKEN.test(value.provider)&&/^[1-9][0-9]{0,9}$/.test(value.category)
      &&/^[1-9][0-9]{0,14}$/.test(value.productId)&&Number.isSafeInteger(Number(value.productId)),'invalid_product_identity');
  }else fail('unsupported_identity_kind');
  return canonical(value);
}
export function pricingCompletionDiscoveryKeyV1(value){return `pcdq1:${digest(identity(value))}`;}
function bucket(key){assert(/^pcdq1:[a-f0-9]{64}$/.test(key),'invalid_key');return key.slice(6,8);}
function observation(raw){
  assert(raw&&Object.keys(raw).every(k=>['identity','issues','evidence','owner','nextAction','priority'].includes(k)),'unexpected_observation_field');
  const id=identity(raw.identity);
  assert(Array.isArray(raw.issues)&&raw.issues.length>0&&raw.issues.length<=32,'issues_required');
  const issues=[...new Set(raw.issues.map(v=>{assert(TOKEN.test(v),'invalid_issue');return v;}))].sort();
  assert(issues.length===raw.issues.length,'duplicate_issue');
  const evidence=compact(raw.evidence,4096);assert(evidence&&Object.getPrototypeOf(evidence)===Object.prototype,'evidence_object');
  const semantic={identity:id,issues,evidence,owner:string(raw.owner,160),nextAction:string(raw.nextAction,1000),priority:integer(raw.priority??0,0,100)};
  return {...semantic,key:pricingCompletionDiscoveryKeyV1(id),semanticDigest:digest(semantic)};
}
function validateItem(item){
  const o=observation(Object.fromEntries(['identity','issues','evidence','owner','nextAction','priority'].map(k=>[k,item[k]])));
  assert(item.key===o.key&&item.semanticDigest===o.semanticDigest&&STATES.has(item.state),'invalid_item');
  for(const k of ['firstSeen','changedAt'])time(item[k]);
  for(const k of ['totalAttempts','attemptsSinceChange','semanticChanges'])integer(item[k]);
  assert(SHA.test(item.firstGeneration)&&SHA.test(item.changedGeneration),'item_generation');
  assert(Array.isArray(item.history)&&item.history.length>0&&item.history.length<=1024,'item_history_bound');
  assert(Buffer.byteLength(encode(item))<=MAX_ITEM,'item_size_bound');
  if(item.state==='leased'){
    assert(item.lease&&UUID.test(item.lease.token)&&typeof item.lease.workerId==='string','invalid_lease');
    time(item.lease.until);time(item.lease.claimedAt);
  }else assert(item.lease===null,'unexpected_lease');
  assert(item.retryAt===null||Number.isSafeInteger(item.retryAt),'invalid_retry');
  return item;
}
function safeDirectory(path,create=false){
  assert(isAbsolute(path),'absolute_directory_required');
  const root=parse(path).root;let current=root;
  for(const part of path.slice(root.length).split(/[\\/]/).filter(Boolean)){
    current=join(current,part);
    if(!existsSync(current)&&create){mkdirSync(current,{mode:0o700});syncDir(dirname(current));}
    const s=lstatSync(current);assert(s.isDirectory()&&!s.isSymbolicLink(),'symlink_or_non_directory');
  }
}
function regular(path,max){const s=lstatSync(path);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=max,'unsafe_file');return s;}
function read(path,max){const s=regular(path,max),raw=readFileSync(path);assert(raw.length===s.size,'file_changed');return raw;}
function syncDir(path){let fd;try{fd=openSync(path,'r');fsyncSync(fd);}catch(e){
  if(process.platform!=='win32'||!['EPERM','EISDIR','EINVAL','EACCES'].includes(e.code))throw e;
}finally{if(fd!==undefined)closeSync(fd);}}
function exclusive(path,bytes){const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}}

export function openPricingCompletionDiscoveryQueueV1({directory,maxItems=300000,maxBytes=1024*1024*1024,maxFiles=100000}={}){
  assert(typeof directory==='string'&&isAbsolute(directory),'absolute_directory_required');directory=resolve(directory);
  integer(maxItems,1,400000);integer(maxBytes,1024*1024,8*1024*1024*1024);integer(maxFiles,10,1000000);
  safeDirectory(directory,true);
  // Reject accidental reuse of the legacy queue/report directory before even
  // creating our child directory. This module never migrates another format.
  for(const name of readdirSync(directory))assert(name==='objects'||name==='CURRENT.json'||name==='WRITER.lock'
    ||/^\.current-[a-f0-9-]+\.tmp$/.test(name),'foreign_directory_requires_separate_state');
  const objects=join(directory,'objects');safeDirectory(objects,true);
  const currentPath=join(directory,'CURRENT.json'),lockPath=join(directory,'WRITER.lock');
  let budget;
  function inventory(){let bytes=0,files=0;
    for(const name of readdirSync(directory)){
      if(name==='objects')continue;
      assert(name==='CURRENT.json'||name==='WRITER.lock'||/^\.current-[a-f0-9-]+\.tmp$/.test(name),'unexpected_queue_file');
      bytes+=regular(join(directory,name),MAX_SMALL).size;files++;
    }
    for(const name of readdirSync(objects)){
      assert(/^[a-f0-9]{64}\.json$/.test(name)||/^\.stage-[a-f0-9-]+\.tmp$/.test(name),'unexpected_object_file');
      bytes+=regular(join(objects,name),MAX_SHARD).size;files++;
    }
    assert(bytes<=maxBytes&&files<=maxFiles,'retained_storage_budget');return {bytes,files};
  }
  function writeObject(value,max=MAX_SHARD){const bytes=Buffer.from(encode(value));assert(bytes.length<=max,'object_size_bound');
    const id=hash(bytes),path=join(objects,`${id}.json`);
    if(existsSync(path)){assert(hash(read(path,max))===id,'existing_object_corrupt');return id;}
    assert(budget.bytes+bytes.length+MAX_SMALL<=maxBytes&&budget.files+2<=maxFiles,'retained_storage_budget');
    const temp=join(objects,`.stage-${randomUUID()}.tmp`);exclusive(temp,bytes);renameSync(temp,path);syncDir(objects);
    budget.bytes+=bytes.length;budget.files++;return id;
  }
  function readObject(id,max=MAX_SHARD){assert(SHA.test(id),'invalid_object_reference');const bytes=read(join(objects,`${id}.json`),max);
    assert(hash(bytes)===id,'object_hash_mismatch');try{return JSON.parse(bytes);}catch{fail('object_json_corrupt');}}
  function manifest(){
    safeDirectory(directory);safeDirectory(objects);
    if(!existsSync(currentPath)){
      // A missing pointer in a populated store is not an empty queue.
      assert(readdirSync(objects).length===0,'missing_current_requires_recovery');
      return {version:VERSION,revision:0,previous:null,shards:{},receipt:null,total:0};
    }
    const bytes=read(currentPath,MAX_SMALL);let pointer;try{pointer=JSON.parse(bytes);}catch{fail('current_json_corrupt');}
    keys(pointer,['version','manifest']);assert(pointer.version===VERSION&&SHA.test(pointer.manifest),'current_schema');
    const value=readObject(pointer.manifest,MAX_SMALL);
    keys(value,['version','revision','previous','shards','receipt','total']);
    assert(value.version===VERSION,'manifest_version');integer(value.revision,1);integer(value.total,0,maxItems);
    assert(value.previous===null||SHA.test(value.previous),'previous_manifest');assert(value.receipt===null||SHA.test(value.receipt),'receipt_reference');
    assert(value.shards&&Object.getPrototypeOf(value.shards)===Object.prototype&&Object.keys(value.shards).length<=256,'shard_map');
    for(const [b,id]of Object.entries(value.shards))assert(BUCKETS.includes(b)&&SHA.test(id),'invalid_shard_reference');
    return {...value,_id:pointer.manifest};
  }
  function shard(m,b){if(!m.shards[b])return [];
    const value=readObject(m.shards[b]);keys(value,['version','kind','bucket','items']);
    assert(value.version===VERSION&&value.kind==='items'&&value.bucket===b&&Array.isArray(value.items),'shard_schema');
    let previous='';for(const item of value.items){validateItem(item);assert(bucket(item.key)===b&&item.key>previous,'shard_order_or_duplicate');previous=item.key;}
    return value.items;
  }
  function receipt(id){const r=readObject(id,MAX_SMALL);keys(r,['version','kind','previous','generationId','generationDigest','observedAt','sourceLinks','memberships','total']);
    assert(r.version===VERSION&&r.kind==='generation'&&SHA.test(r.generationId)&&SHA.test(r.generationDigest),'generation_receipt_schema');
    assert(r.previous===null||SHA.test(r.previous),'generation_previous');time(r.observedAt);integer(r.total,0,maxItems);
    compact(r.sourceLinks,16384);assert(Object.keys(r.memberships).length<=256,'membership_map');
    for(const [b,h]of Object.entries(r.memberships))assert(BUCKETS.includes(b)&&SHA.test(h),'membership_reference');return r;
  }
  function members(r,b){if(!r.memberships[b])return [];
    const v=readObject(r.memberships[b]);keys(v,['version','kind','bucket','keys']);
    assert(v.version===VERSION&&v.kind==='membership'&&v.bucket===b&&Array.isArray(v.keys),'membership_schema');
    let prev='';for(const key of v.keys){assert(bucket(key)===b&&key>prev,'membership_order');prev=key;}return v.keys;
  }
  function view(item,m){let id=m.receipt,depth=0;const seen=new Set();
    while(id){assert(!seen.has(id)&&++depth<=100000,'receipt_chain_corrupt');seen.add(id);const r=receipt(id);
      if(members(r,bucket(item.key)).includes(item.key))return {...item,lastSeen:r.observedAt,lastGeneration:r.generationId,sourceLinks:r.sourceLinks};id=r.previous;}
    fail('item_missing_generation_membership');
  }
  function locked(fn){safeDirectory(directory);safeDirectory(objects);const token=randomUUID();let fd;
    try{fd=openSync(lockPath,'wx',0o600);}catch(e){if(e.code==='EEXIST')fail('writer_locked_no_automatic_recovery');throw e;}
    try{writeFileSync(fd,JSON.stringify({version:VERSION,token}));fsyncSync(fd);closeSync(fd);fd=undefined;syncDir(directory);
      budget=inventory();return fn();
    }finally{if(fd!==undefined)closeSync(fd);budget=undefined;
      // Ordinary thrown errors release our lock. Process death leaves it intact.
      const lock=JSON.parse(read(lockPath,MAX_SMALL));assert(lock.token===token,'writer_lock_changed');unlinkSync(lockPath);syncDir(directory);}
  }
  function commit(m,next){
    const value={version:VERSION,revision:m.revision+1,previous:m._id??null,shards:next.shards,receipt:next.receipt,total:next.total};
    const id=writeObject(value,MAX_SMALL),bytes=Buffer.from(encode({version:VERSION,manifest:id}));
    const temp=join(directory,`.current-${randomUUID()}.tmp`);exclusive(temp,bytes);renameSync(temp,currentPath);syncDir(directory);
    return {revision:value.revision,manifest:id};
  }
  function stateSummary(m){const counts={pending:0,leased:0,retry:0,review_needed:0},kinds={};let total=0,attempts=0;
    for(const b of BUCKETS)for(const item of shard(m,b)){counts[item.state]++;kinds[item.identity.kind]=(kinds[item.identity.kind]??0)+1;total++;attempts+=item.totalAttempts;}
    assert(total===m.total,'manifest_total_mismatch');return {version:VERSION,revision:m.revision,total,unresolved:total,completed:0,states:counts,kinds,totalAttempts:attempts};
  }
  function event(item,type,now,details={}){item.history.push({type,at:now,...details});validateItem(item);}
  function ingestGeneration(input,{now=Date.now()}={}){
    time(now);keys(input,['generationId','observedAt','sourceLinks','observations']);assert(SHA.test(input.generationId),'generation_id_must_be_sha256');
    time(input.observedAt);assert(input.observedAt<=now,'future_generation');
    assert(Array.isArray(input.observations)&&input.observations.length<=maxItems,'generation_item_bound');
    const sourceLinks=compact(input.sourceLinks,16384);assert(sourceLinks&&Object.getPrototypeOf(sourceLinks)===Object.prototype,'source_links_object');
    const indices=new Map(),seen=new Set(),generationHash=createHash('sha256');
    // Validate all rows before acquiring a writer lock or staging a single byte.
    for(let i=0;i<input.observations.length;i++){const o=observation(input.observations[i]);assert(!seen.has(o.key),'duplicate_generation_entity');seen.add(o.key);
      const b=bucket(o.key);if(!indices.has(b))indices.set(b,[]);indices.get(b).push({index:i,key:o.key,digest:o.semanticDigest});}
    generationHash.update(encode({generationId:input.generationId,observedAt:input.observedAt,sourceLinks}));
    for(const b of BUCKETS)for(const entry of (indices.get(b)??[]).sort((a,b)=>a.key.localeCompare(b.key)))generationHash.update(`\n${entry.key}:${entry.digest}`);
    const generationDigest=generationHash.digest('hex');
    return locked(()=>{const m=manifest(),last=m.receipt?receipt(m.receipt):null;
      if(last?.generationId===input.generationId){assert(last.generationDigest===generationDigest,'generation_replay_conflict');stateSummary(m);return {changed:false,replayed:true,revision:m.revision,added:0,reopened:0,unchanged:input.observations.length};}
      if(last)assert(input.observedAt>last.observedAt,'stale_or_same_time_generation');
      const refs={...m.shards},membership={},result={added:0,reopened:0,unchanged:0};let total=0;
      for(const b of BUCKETS){const items=shard(m,b),map=new Map(items.map(v=>[v.key,v]));let changed=false;
        const incoming=indices.get(b)??[];
        if(incoming.length)membership[b]=writeObject({version:VERSION,kind:'membership',bucket:b,keys:incoming.map(v=>v.key)});
        for(const entry of incoming){const o=observation(input.observations[entry.index]);assert(o.semanticDigest===entry.digest,'input_changed_during_ingest');let item=map.get(o.key);
          if(!item){item={...o,state:'pending',lease:null,retryAt:null,firstSeen:input.observedAt,firstGeneration:input.generationId,
            changedAt:input.observedAt,changedGeneration:input.generationId,totalAttempts:0,attemptsSinceChange:0,semanticChanges:0,
            history:[{type:'discovered',at:input.observedAt,generationId:input.generationId,semanticDigest:o.semanticDigest}]};
            validateItem(item);map.set(o.key,item);result.added++;changed=true;
          }else if(item.semanticDigest!==o.semanticDigest){const oldDigest=item.semanticDigest;
            Object.assign(item,o,{state:'pending',lease:null,retryAt:null,changedAt:input.observedAt,changedGeneration:input.generationId,attemptsSinceChange:0,semanticChanges:item.semanticChanges+1});
            event(item,'semantic_change',input.observedAt,{generationId:input.generationId,previousDigest:oldDigest,semanticDigest:o.semanticDigest});result.reopened++;changed=true;
          }else result.unchanged++;
        }
        total+=map.size;assert(total<=maxItems,'queue_item_bound');
        if(changed)refs[b]=writeObject({version:VERSION,kind:'items',bucket:b,items:[...map.values()].sort((a,b)=>a.key.localeCompare(b.key))});
      }
      assert(total===m.total+result.added,'manifest_total_mismatch');
      const r=writeObject({version:VERSION,kind:'generation',previous:m.receipt,generationId:input.generationId,generationDigest,
        observedAt:input.observedAt,sourceLinks,memberships:membership,total:input.observations.length},MAX_SMALL);
      return {...commit(m,{shards:refs,receipt:r,total}),changed:true,replayed:false,...result};
    });
  }
  function claimBatch({now=Date.now(),limit=100,leaseMs=300000,workerId}={}){
    time(now);integer(limit,1,500);integer(leaseMs,1000,3600000);string(workerId,160);
    return locked(()=>{const m=manifest();let candidates=[],total=0;
      const compare=(a,b)=>a.totalAttempts-b.totalAttempts||b.priority-a.priority||a.firstSeen-b.firstSeen||a.key.localeCompare(b.key);
      for(const b of BUCKETS){const rows=shard(m,b);total+=rows.length;
        for(const item of rows)if(item.state==='pending'||(item.state==='retry'&&item.retryAt<=now)||(item.state==='leased'&&item.lease.until<=now))candidates.push(item);
        candidates.sort(compare);if(candidates.length>limit)candidates.length=limit;
      }
      assert(total===m.total,'manifest_total_mismatch');if(!candidates.length)return [];
      const updates=new Map(),refs={...m.shards};
      for(const item of candidates){item.totalAttempts++;item.attemptsSinceChange++;item.state='leased';item.retryAt=null;
        item.lease={token:randomUUID(),workerId,claimedAt:now,until:now+leaseMs};event(item,'claimed',now,{token:item.lease.token,workerId});updates.set(item.key,item);}
      for(const b of new Set(candidates.map(i=>bucket(i.key))))refs[b]=writeObject({version:VERSION,kind:'items',bucket:b,
        items:shard(m,b).map(i=>updates.get(i.key)??i)});
      const result=candidates.map(i=>view(i,m));commit(m,{shards:refs,receipt:m.receipt,total:m.total});return result;
    });
  }
  function deferBatch({now=Date.now(),claims,reason,owner,nextAction,retryAfterMs=null}={}){
    time(now);assert(Array.isArray(claims)&&claims.length>0&&claims.length<=500,'claim_batch_bound');string(reason,1000);string(owner,160);string(nextAction,1000);
    if(retryAfterMs!==null)integer(retryAfterMs,60000,86400000);
    const requests=new Map();for(const c of claims){keys(c,['key','token']);bucket(c.key);assert(UUID.test(c.token)&&!requests.has(c.key),'invalid_or_duplicate_claim');requests.set(c.key,c.token);}
    return locked(()=>{const m=manifest(),changes=new Map(),refs={...m.shards};
      // Verify every acknowledgment before creating replacement objects.
      for(const b of new Set([...requests.keys()].map(bucket))){const rows=shard(m,b);changes.set(b,rows);
        for(const item of rows)if(requests.has(item.key)){
          assert(item.state==='leased'&&item.lease.token===requests.get(item.key)&&item.lease.until>now,'stale_claim');requests.delete(item.key);
          item.state=retryAfterMs===null?'review_needed':'retry';item.lease=null;item.retryAt=retryAfterMs===null?null:now+retryAfterMs;
          event(item,'deferred',now,{reason,owner,nextAction,retryAt:item.retryAt});
        }
      }
      assert(requests.size===0,'claim_not_found');
      for(const [b,items]of changes)refs[b]=writeObject({version:VERSION,kind:'items',bucket:b,items});
      return {...commit(m,{shards:refs,receipt:m.receipt,total:m.total}),deferred:claims.length,completed:0};
    });
  }
  return Object.freeze({ingestGeneration,claimBatch,deferBatch,
    summary(){return stateSummary(manifest());},
    get(id){const key=pricingCompletionDiscoveryKeyV1(id),m=manifest(),item=shard(m,bucket(key)).find(i=>i.key===key);return item?view(item,m):null;},
    inspect(){const m=manifest();return {revision:m.revision,total:m.total,manifest:m._id??null,shards:{...m.shards},receipt:m.receipt};},
  });
}
