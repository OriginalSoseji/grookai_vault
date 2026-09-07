import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { inspectMtgSealedImageBytesV1 } from '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');return [arg.slice(2,i),arg.slice(i+1)];}));
if(!args.plan||!args.inventory||!args.out) throw new Error('--plan --inventory --out required');
if(!process.execArgv.includes('--use-system-ca')||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0') throw new Error('Verified system CA trust required');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const readGzip=async file=>gunzipSync(await fs.readFile(file)).toString();
const plan=JSON.parse(await readGzip(args.plan));
const products=(await readGzip(path.join(args.inventory,'source_products.jsonl.gz'))).trim().split('\n').map(JSON.parse);
const sourceMap=new Map(products.map(row=>[Number(row.product_id),row]));
const mappingMap=new Map(plan.payload.mappings.map(row=>[row.id,row]));
const sourcePlan=plan.payload.members.map(member=>{
  const mapping=mappingMap.get(member.source_mapping_id), source=sourceMap.get(mapping.source_product_id);
  if(source.payload_hash!==mapping.source_payload_hash) throw new Error('Mapping/source drift');
  const id=mapping.source_product_id;
  const url=new URL(source.image_url);
  if(url.protocol!=='https:'||!['tcgplayer-cdn.tcgplayer.com','product-images.tcgplayer.com'].includes(url.hostname)) throw new Error(`Unexpected image source for ${id}`);
  if(!url.pathname.includes(String(id))) throw new Error(`Image source identity mismatch for ${id}`);
  const urls=[`https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`,
    `https://product-images.tcgplayer.com/fit-in/1000x1000/${id}.jpg`,source.image_url];
  return {member_id:member.id,variant_id:member.variant_id,source_mapping_id:mapping.id,
    source_product_id:id,source_payload_hash:source.payload_hash,urls:[...new Set(urls)]};
});
await fs.mkdir(path.join(args.out,'bytes'),{recursive:true});
const frozen={version:'POKEMON_SEALED_IMAGE_ACQUISITION_V1',source_plan_fingerprint:plan.plan_fingerprint_sha256,
  members:sourcePlan,concurrency:8,max_attempts_per_url:3,max_bytes_per_image:12000000,
  database_writes:0,storage_writes:0};
const planPath=path.join(args.out,'source_plan.json');
try { const prior=JSON.parse(await fs.readFile(planPath,'utf8')); if(JSON.stringify(prior)!==JSON.stringify(frozen)) throw new Error('Acquisition plan drift'); }
catch(error){if(error.code!=='ENOENT') throw error; await fs.writeFile(planPath,JSON.stringify(frozen,null,2));}
const journal=path.join(args.out,'journal.jsonl');
const complete=new Map();
try {for(const line of (await fs.readFile(journal,'utf8')).trim().split('\n').filter(Boolean)){
  const row=JSON.parse(line); if(row.status==='verified'){
    const bytes=await fs.readFile(path.join(args.out,'bytes',row.local_filename));
    if(digest(bytes)!==row.image.sha256) throw new Error('Resume bytes corrupted');
    complete.set(row.member_id,row);
  }
}}catch(error){if(error.code!=='ENOENT') throw error;}
let cursor=0,done=0,requests=0;
const results=new Array(sourcePlan.length);
let journalWrite=Promise.resolve();
async function acquire(item){
  if(complete.has(item.member_id)) return complete.get(item.member_id);
  const failures=[];
  for(const url of item.urls) for(let attempt=0;attempt<3;attempt++){
    try {
      requests++;
      const response=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'error'});
      if(!response.ok){failures.push({url,status:response.status,attempt}); if(response.status===404) break; continue;}
      if(Number(response.headers.get('content-length'))>12000000) throw new Error('Image exceeds byte ceiling');
      const chunks=[];let size=0;
      for await(const chunk of response.body){size+=chunk.length;if(size>12000000) throw new Error('Image exceeds byte ceiling');chunks.push(chunk);}
      const bytes=Buffer.concat(chunks), image=inspectMtgSealedImageBytesV1(bytes,response.headers.get('content-type'));
      if(!image.valid_image||image.placeholder_suspected){failures.push({url,reason:image.diagnostics});break;}
      const filename=`${image.sha256}.${image.format==='jpeg'?'jpg':image.format}`;
      await fs.writeFile(path.join(args.out,'bytes',filename),bytes);
      return {...item,status:'verified',source_image_url:url,image,local_filename:filename,failures};
    }catch(error){failures.push({url,attempt,error:error.message});}
  }
  return {...item,status:'excluded',failures};
}
await Promise.all(Array.from({length:8},async()=>{
  while(cursor<sourcePlan.length){const index=cursor++; const result=await acquire(sourcePlan[index]);results[index]=result;
    journalWrite=journalWrite.then(()=>fs.appendFile(journal,JSON.stringify(result)+'\n'));await journalWrite;
    done++;if(done%50===0) console.log(`Images ${done}/${sourcePlan.length}; requests ${requests}`);
  }
}));
await journalWrite;
const summary={...frozen,members:sourcePlan.length,verified:results.filter(r=>r.status==='verified').length,
  excluded:results.filter(r=>r.status==='excluded').length,unique_bytes:new Set(results.filter(r=>r.image).map(r=>r.image.sha256)).size,
  source_requests_this_attempt:requests,resumed:complete.size,finished_at:new Date().toISOString()};
await fs.writeFile(path.join(args.out,'results.json'),JSON.stringify(results));
await fs.writeFile(path.join(args.out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
