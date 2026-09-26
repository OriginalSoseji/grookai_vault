import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createRequire}from'node:module';
import{out,verified}from'./ops.mjs';
const dir='.local/integration/vendor-scan-release-20260924',hash=b=>createHash('sha256').update(b).digest('hex'),mode=process.argv[2],target='hrtbjchobencariqclab';
const raw=fs.readFileSync('.local/integration/vendor-scan-expansion-v3/local-build-2026-09-23T22-52-10-191Z.jsonl');assert.equal(hash(raw),'709045ad12c75924b08bf4a40a846e578cec4f3fb0262c4c841640e899c926aa');
if(mode==='plan'){
 assert.ok(!fs.existsSync(dir+'/image-plan.private.json'));
 const rows=raw.toString().trim().split('\n').map(JSON.parse),history=fs.readFileSync('C:/grookai_vault/.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1/metadata.jsonl','utf8').trim().split('\n').map(JSON.parse),byId=new Map(history.map(r=>[r.card_id,r])),images=[];
 for(const r of rows){
  assert.ok(r.image_path.startsWith('warehouse-derived/')&&!r.image_path.includes('..'));assert.match(r.sha256,/^[a-f0-9]{64}$/);
  const candidates=[path.join(out,'visual-reference-cache',r.id+'.webp'),byId.get(r.id)?.source_path].filter(Boolean);
  let chosen;
  for(const file of candidates){const resolved=path.resolve(file);assert.ok(resolved.startsWith('C:\\grookai_vault\\.tmp\\')||resolved.startsWith(path.join(out,'visual-reference-cache')));if(!fs.existsSync(resolved))continue;const bytes=fs.readFileSync(resolved);if(hash(bytes)===r.sha256){chosen={id:r.id,path:r.image_path,sha256:r.sha256,source:resolved,bytes:bytes.length};break;}}
  assert.ok(chosen,'Missing verified source image: '+r.gv_id);images.push(chosen);
 }
 assert.equal(new Set(images.map(r=>r.path)).size,images.length);
 const plan={at:new Date().toISOString(),target,indexSha256:hash(raw),images,totalBytes:images.reduce((n,r)=>n+r.bytes,0)};fs.writeFileSync(dir+'/image-plan.private.json',JSON.stringify(plan),{flag:'wx'});console.log(JSON.stringify({planned:images.length,totalBytes:plan.totalBytes,sourceWrites:0}));
}else if(mode==='apply'){
 assert.equal((await verified()).id,target);assert.equal(JSON.parse(fs.readFileSync(dir+'/catalog-applied.json')).target,target);
 const planBytes=fs.readFileSync(dir+'/image-plan.private.json'),plan=JSON.parse(planBytes);assert.equal(plan.target,target);assert.equal(plan.indexSha256,hash(raw));
 const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='service_role').api_key;
 const client=createClient('https://'+target+'.supabase.co',key,{auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})}});
 const bucket=await client.storage.getBucket('user-card-images');assert.equal(bucket.error,null);assert.equal(bucket.data.public,false);
 const journal=dir+'/image-readback.private.jsonl',done=new Map();
 if(fs.existsSync(journal))for(const line of fs.readFileSync(journal,'utf8').trim().split('\n').filter(Boolean)){const row=JSON.parse(line);assert.equal(row.planSha256,hash(planBytes));assert.equal(row.target,target);done.set(row.path,row);}
 for(const [p,row]of done){const expected=plan.images.find(r=>r.path===p);assert.equal(row.sha256,expected?.sha256);assert.equal(row.verified,true);}
 const regression=JSON.parse(fs.readFileSync('.local/integration/vendor-scan-expansion-v13/regression-2026-09-24T07-37-38-326Z.private.json'));
 const priority=new Set(regression.rows.flatMap(r=>r.candidates.map(c=>c.id)));
 const pending=plan.images.filter(r=>!done.has(r.path)).sort((a,b)=>Number(priority.has(b.id))-Number(priority.has(a.id)));let cursor=0,failed=false;const errors=[];
 const retry=async fn=>{for(let attempt=0;;attempt++){try{const r=await fn();const status=Number(r.error?.statusCode),transient=status===408||status===429||status>=500&&status<600||['TimeoutError','AbortError'].includes(r.error?.originalError?.name)||/fetch failed|network|timeout/i.test(r.error?.message??'');if(r.error&&transient&&attempt<5){await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));continue;}return r;}catch(e){if(attempt>=5)throw e;await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}}};
 await Promise.all(Array.from({length:12},async()=>{while(!failed&&cursor<pending.length){const r=pending[cursor++];try{
  const bytes=fs.readFileSync(r.source);assert.equal(hash(bytes),r.sha256);
  const upload=await retry(()=>client.storage.from('user-card-images').upload(r.path,bytes,{upsert:false,contentType:r.path.endsWith('.webp')?'image/webp':r.path.endsWith('.png')?'image/png':'image/jpeg'}));
  if(upload.error)assert.ok(['400','409'].includes(String(upload.error.statusCode))&&/already exists|duplicate/i.test(upload.error.message),'Image upload failed: '+upload.error.statusCode);
  const read=await retry(()=>client.storage.from('user-card-images').download(r.path));assert.equal(read.error,null);assert.equal(hash(Buffer.from(await read.data.arrayBuffer())),r.sha256);
  const row={at:new Date().toISOString(),target,planSha256:hash(planBytes),path:r.path,sha256:r.sha256,bytes:r.bytes,verified:true};fs.appendFileSync(journal,JSON.stringify(row)+'\n');done.set(r.path,row);
  if(done.size%200===0)console.log(JSON.stringify({verified:done.size,total:plan.images.length}));
 }catch(e){errors.push({path:r.path,message:e.message});failed=errors.length>=8;}}}));
 if(errors.length){fs.writeFileSync(dir+'/image-error-'+Date.now()+'.private.json',JSON.stringify(errors),{flag:'wx'});throw Error('Some image copies need retry; verified journal retained for safe resume.');}
 assert.equal(done.size,plan.images.length);fs.writeFileSync(dir+'/images-applied.json',JSON.stringify({at:new Date().toISOString(),target,planSha256:hash(planBytes),verified:done.size,totalBytes:plan.totalBytes,sourceWrites:0},null,2),{flag:'wx'});console.log(JSON.stringify({verified:done.size,target}));
}else throw Error('Explicit plan/apply required');
