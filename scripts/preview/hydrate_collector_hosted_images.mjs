import {exec,out,verifyTarget} from './collector_hosted_ops.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const project=await verifyTarget();
const status=JSON.parse(exec('pwsh',['-NoProfile','-Command','supabase status -o json']));assert.equal(status.API_URL,'http://127.0.0.1:54321');
const keys=JSON.parse(readFileSync(`${out}/private/keys.json`));
const source=createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const dest=createClient(`https://${project.id}.supabase.co`,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const snapshot=JSON.parse(readFileSync(`${out}/catalog-snapshot.json`));
const paths=[...new Set([...snapshot.card_prints,...snapshot.card_printings].map(c=>c.image_path).filter(Boolean))].sort();
assert.ok(paths.length<=550);
for(const path of paths)assert.ok(/^warehouse-derived\/(self-hosted-images-v1|image-truth-v1|special-variant-printing-evidence-v1)\//.test(path)&&!path.includes('..'),'Not public canonical image evidence');
const hash=b=>createHash('sha256').update(b).digest('hex');
writeFileSync(`${out}/image-plan.json`,JSON.stringify({target:project.id,source:status.API_URL,paths,upsert:false,sourceWrites:0},null,2));
let cursor=0,failed=false;const results=[];
await Promise.all(Array.from({length:4},async()=>{
 while(!failed&&cursor<paths.length){const path=paths[cursor++];try{
  const downloaded=await source.storage.from('user-card-images').download(path);
  let blob=downloaded.data;
  if(downloaded.error){
   assert.equal(path,'warehouse-derived/special-variant-printing-evidence-v1/e7fc62f1-e5a6-5a6d-b831-310d50cbc00e/c62b248a96137e35cb8757541f1b1adf81a81e239fab39a45c11d549e8be120d.jpg');
   assert.equal(process.env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');
   assert.ok(process.env.SUPABASE_SECRET_KEY,'Source exact-object read credential missing');
   // Publicly cataloged exact-printing artwork only. The public website proxy
   // returns its parent image; never store that different byte stream as exact.
   const response=await fetch(`https://ycdxbpibncqcchqiihfz.supabase.co/storage/v1/object/authenticated/user-card-images/${path}`,{headers:{apikey:process.env.SUPABASE_SECRET_KEY,Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}`},redirect:'error',signal:AbortSignal.timeout(45000)});
   assert.ok(response.ok&&response.headers.get('content-type')?.startsWith('image/'),'Exact public image unavailable');blob=await response.blob();
   assert.equal(hash(Buffer.from(await blob.arrayBuffer())),'c62b248a96137e35cb8757541f1b1adf81a81e239fab39a45c11d549e8be120d','Public image is not exact printing evidence');
  }
  const bytes=Buffer.from(await blob.arrayBuffer());const sha256=hash(bytes);
  const old=await dest.storage.from('user-card-images').download(path);let created=false;
  if(old.error){assert.ok(['400','404'].includes(String(old.error.statusCode)),'Uncertain target collision');const upload=await dest.storage.from('user-card-images').upload(path,bytes,{upsert:false,contentType:blob.type||'image/webp'});if(upload.error)throw Error(upload.error.message);created=true;}
  const actual=old.error?await dest.storage.from('user-card-images').download(path):old;
  if(actual.error)throw Error(actual.error.message);assert.equal(hash(Buffer.from(await actual.data.arrayBuffer())),sha256,'Exact byte readback mismatch');
  results.push({path,sha256,bytes:bytes.length,created,verified:true});
 }catch(error){failed=true;results.push({path,error:error.message,verified:false});}
 writeFileSync(`${out}/image-progress.json`,JSON.stringify({target:project.id,selected:paths.length,completed:results.length,results},null,2));
 }
}));
assert.ok(!failed,'Image transfer stopped; verified objects retained');assert.equal(results.length,paths.length);
console.log(JSON.stringify({target:project.id,verified:results.length,bytes:results.reduce((n,r)=>n+r.bytes,0),sourceWrites:0}));
