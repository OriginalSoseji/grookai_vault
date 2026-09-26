// Existing synthetic accounts only; sends public reference bytes, writes no inventory.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {out,verified} from './ops.mjs';
const origin=process.argv[2],canonical='https://grookai-vendor-preview.vercel.app';
assert.ok(origin===canonical||/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/.test(origin??''));
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url));const {createServerClient}=require('@supabase/ssr');const sharp=require('sharp');
const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json')));const key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const login=async account=>{const jar=new Map();const client=createServerClient(`https://${p.id}.supabase.co`,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});assert.equal((await client.auth.signInWithPassword(account)).error,null);return{client,jar};};
const owner=await login(accounts[2]),other=await login(accounts[1]);const passed=[];
const request=async(body,{auth=owner,type='image/webp',site=canonical}={})=>{const r=await fetch(origin+'/api/stores/owner/intake/match',{method:'POST',headers:{Origin:site,'Content-Type':type,...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{})},body,signal:AbortSignal.timeout(40000)});return{status:r.status,headers:r.headers,data:await r.json()};};
const pass=name=>{passed.push(name);console.log('PASS '+name);};
try{
 const artifact=JSON.parse(fs.readFileSync('apps/web/src/lib/stores/visualMatchIndex.json'));
 const ref=artifact.references.find(r=>r.gv_id==='GV-PK-MEW-173');assert.ok(ref);
 const bytes=fs.readFileSync(path.join(out,'visual-reference-cache',ref.id+'.webp'));
 assert.equal((await request(bytes,{auth:null})).status,401);
 assert.equal((await request(bytes,{auth:other})).status,403);
 assert.equal((await request(bytes,{site:'https://invalid.example'})).status,403);pass('anonymous, non-member and foreign-origin match requests rejected');
 const positive=await request(bytes);assert.equal(positive.status,200);assert.ok(positive.data.cards.some(c=>c.id===ref.id));assert.match(positive.headers.get('cache-control'),/no-store/);
 assert.ok(positive.data.cards.every(c=>c.printings.length&&c.printings.every(p=>p.printing_gv_id)));assert.ok(!('confidence' in positive.data));pass('real deployed image comparison returns current eligible canonical candidates without identity auto-confirmation');
 const altered=await sharp(bytes).resize(600,840,{fit:'fill'}).modulate({brightness:.78,saturation:.85}).jpeg({quality:68}).toBuffer();
 assert.ok((await request(altered,{type:'image/jpeg'})).data.cards.some(c=>c.id===ref.id));pass('changed brightness, resize and JPEG compression retain expected candidate');
 assert.equal((await request(Buffer.from('<svg/>'),{type:'image/svg+xml'})).status,415);
 const corrupt=await request(Buffer.from('not an image'));assert.equal(corrupt.status,200);assert.equal(corrupt.data.status,'unreadable');assert.deepEqual(corrupt.data.cards,[]);
 const blank=await sharp({create:{width:300,height:420,channels:3,background:'#dddddd'}}).png().toBuffer();assert.equal((await request(blank,{type:'image/png'})).data.status,'unreadable');pass('unsupported, corrupt and blank images cannot force a match');
 fs.writeFileSync(path.join(out,'visual-hosted-proof-'+Date.now()+'.json'),JSON.stringify({at:new Date().toISOString(),origin,database:p.id,passed,inventoryWrites:0,privateScansSent:0},null,2),{flag:'wx'});
}finally{await owner.client.auth.signOut({scope:'local'});await other.client.auth.signOut({scope:'local'});}
