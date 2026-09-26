import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {out,verified} from './ops.mjs';
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js');
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
const old='C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844';
const manifest=JSON.parse(fs.readFileSync(path.join(old,'image-progress.json')));assert.equal(manifest.target,'hcdpcbpnnvtbaezefjkd');assert.equal(manifest.completed,333);assert.ok(manifest.results.every(r=>r.verified));
const sourceKey=JSON.parse(fs.readFileSync(path.join(old,'private/keys.json'))).find(k=>k.name==='service_role').api_key;
const destKey=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='service_role').api_key;
const source=createClient('https://hcdpcbpnnvtbaezefjkd.supabase.co',sourceKey,{auth:{persistSession:false}});
const dest=createClient(`https://${p.id}.supabase.co`,destKey,{auth:{persistSession:false}});
const buckets=await dest.storage.listBuckets();assert.equal(buckets.error,null);
if(!buckets.data.some(b=>b.id==='user-card-images'))assert.equal((await dest.storage.createBucket('user-card-images',{public:false,fileSizeLimit:10*1024*1024,allowedMimeTypes:['image/jpeg','image/png','image/webp']})).error,null);
const hash=b=>createHash('sha256').update(b).digest('hex'),results=[];let cursor=0,failed=false;
const previous=path.join(out,'images-readback.json');if(fs.existsSync(previous))fs.copyFileSync(previous,path.join(out,'images-attempt-'+Date.now()+'.json'),fs.constants.COPYFILE_EXCL);
const retry=async work=>{for(let attempt=0;;attempt++){const r=await work();if(String(r.error?.statusCode)!=='429'||attempt===5)return r;await new Promise(resolve=>setTimeout(resolve,Math.min(5000,1000*(attempt+1))));}};
await Promise.all(Array.from({length:1},async()=>{
 while(!failed&&cursor<manifest.results.length){const expected=manifest.results[cursor++];try{
  assert.ok(/^warehouse-derived\/(self-hosted-images-v1|image-truth-v1|special-variant-printing-evidence-v1)\//.test(expected.path)&&!expected.path.includes('..'));
  const r=await retry(()=>source.storage.from('user-card-images').download(expected.path));assert.equal(r.error,null);const bytes=Buffer.from(await r.data.arrayBuffer());assert.equal(hash(bytes),expected.sha256);
  const prior=await retry(()=>dest.storage.from('user-card-images').download(expected.path));
  if(prior.error){assert.ok(['400','404'].includes(String(prior.error.statusCode)));const u=await retry(()=>dest.storage.from('user-card-images').upload(expected.path,bytes,{upsert:false,contentType:r.data.type}));assert.equal(u.error,null);}
  const actual=prior.error?await retry(()=>dest.storage.from('user-card-images').download(expected.path)):prior;assert.equal(actual.error,null);assert.equal(hash(Buffer.from(await actual.data.arrayBuffer())),expected.sha256);
  results.push({path:expected.path,sha256:expected.sha256,bytes:bytes.length,verified:true});
 }catch(e){failed=true;results.push({path:expected.path,verified:false,error:e.message});}
 fs.writeFileSync(path.join(out,'images-readback.json'),JSON.stringify({target:p.id,source:manifest.target,sourceWrites:0,selected:manifest.results.length,completed:results.length,results},null,2));
 await new Promise(resolve=>setTimeout(resolve,250));
 }
}));
assert.ok(!failed,'Image copy stopped; retained exact-object receipts');assert.equal(results.length,333);console.log(JSON.stringify({verified:results.length,target:p.id,sourceWrites:0}));
