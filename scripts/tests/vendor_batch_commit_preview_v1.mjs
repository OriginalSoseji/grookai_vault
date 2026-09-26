// Local-only compiled component harness. Synthetic catalog, no Supabase, telemetry,
// credentials or inventory writer. This proves UI behavior, never database RLS.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const web=path.join(root,'apps/web'), require=createRequire(path.join(web,'package.json'));
const {webpack}=require('next/dist/compiled/webpack/webpack');
const dir=path.join(root,'.local','integration/batch-commit-ui-v1');fs.mkdirSync(dir,{recursive:true});
const loader=path.join(dir,'loader.cjs');
fs.writeFileSync(loader,`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(source){if(this.resourcePath.endsWith('.css')){const css=source.replace(/:global\\(([^)]+)\\)/g,'$1');return 'const style=document.createElement("style");style.textContent='+JSON.stringify(css)+';document.head.appendChild(style);export default '+JSON.stringify(Object.fromEntries([...source.matchAll(/\\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map(m=>[m[1],m[1]])))+';';}return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:this.resourcePath}).outputText;};`);
const entry=path.join(dir,'entry.tsx');
fs.writeFileSync(entry,`import React from 'react';import{createRoot}from'react-dom/client';import StoreBatchIntake from '@/components/stores/StoreBatchIntake';import s from '@/components/stores/StoreManager.module.css';import{newIntakeBatch,pairAssets}from '@/lib/stores/batchIntake';import{loadIntakeBatch,saveIntakeBatch}from '@/lib/stores/batchIntakeStorage';
const store='11111111-1111-4111-8111-111111111999';const card={id:'44444444-4444-4444-8444-444444444444',gv_id:'GV-PK-TEST-001',name:'Synthetic Pikachu',number:'001',set_code:'TEST',image:null,printings:[{id:'55555555-5555-4555-8555-555555555555',printing_gv_id:'GV-PK-TEST-001-HOLO',finish_label:'Holo'}]};
async function boot(){if(!await loadIntakeBatch(store)){const b=newIntakeBatch(store);const canvas=document.createElement('canvas');canvas.width=250;canvas.height=350;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e8d650';ctx.fillRect(0,0,250,350);ctx.fillStyle='#194b83';ctx.font='18px sans-serif';ctx.fillText('SYNTHETIC SCAN',25,170);const blob=await new Promise<Blob>(r=>canvas.toBlob(x=>r(x!),'image/jpeg'));b.assets=[1,2].map(i=>({id:'scan-'+i,name:'Synthetic '+i+'.jpg',hash:'synthetic-'+i,original:blob,preview:blob,error:null}));b.items=pairAssets(b.assets,'front',b.defaults).map(i=>({...i,card,printing:card.printings[0].id,confirmed:true}));await saveIntakeBatch(b);}const owner={store:{id:store,display_name:'Synthetic retry proof',app_published:false,web_published:false},sections:[],capabilities:{store_app:true},rollout:{app_enabled:true}};createRoot(document.getElementById('root')!).render(<main className={s.workspace}><StoreBatchIntake owner={owner as any} close={()=>location.reload()} refresh={async()=>{}}/></main>);document.getElementById('sample')!.onclick=async()=>{document.getElementById('qa-state')!.textContent=JSON.stringify(await(await fetch('/qa/state')).json());};}void boot();`);

await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry,context:web,output:{path:path.join(dir,'dist'),filename:'bundle.js',publicPath:'/'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.join(web,'src')},modules:[path.join(web,'node_modules'),path.join(root,'node_modules')]},module:{rules:[{test:/\.(tsx?|css)$/,exclude:/node_modules/,use:loader}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const card={id:'44444444-4444-4444-8444-444444444444',gv_id:'GV-PK-TEST-001',name:'Synthetic Pikachu',number:'001',set_code:'TEST',image:'/sample.jpg',printings:[{id:'55555555-5555-4555-8555-555555555555',printing_gv_id:'GV-PK-TEST-001-HOLO',finish_label:'Holo'}]};
const privateSample=path.join(process.env.USERPROFILE,'.codex/tmp/tcgautomate-review-20260922/sample-0.jpg');
const receipts=new Map();let uploadFailed=false,finishLost=false;const counts={prepared:0,completed:0,prepareRequests:0,finishRequests:0};
// Capture compiler outputs once. HTTP input only selects an existing key; it
// never becomes a filesystem path (including encoded traversal requests).
const assets=new Map(fs.readdirSync(path.join(dir,'dist')).filter(name=>name.endsWith('.js')).map(name=>['/'+name,fs.readFileSync(path.join(dir,'dist',name))]));
const server=createServer(async(req,res)=>{
 res.setHeader('cache-control','no-store');
 const json=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 if(req.url==='/qa/state'){json(counts);return;}
 if(req.method==='POST'&&req.url.startsWith('/api/stores/owner/intake')){
  const chunks=[];for await(const c of req)chunks.push(c);const bytes=Buffer.concat(chunks);
  if(req.url==='/api/stores/owner/intake'){
   const data=JSON.parse(bytes),key=data.batch_id+':'+data.item_id;counts.prepareRequests++;
   let saved=receipts.get(key);if(!saved){saved={request:data,id:crypto.randomUUID(),gvvi:'GVVI-SYNTHETIC-'+(++counts.prepared),completed:false};receipts.set(key,saved);}if(JSON.stringify(saved.request)!==JSON.stringify(data)){json({error:'Request changed'},409);return;}json({prepared:true,completed:saved.completed});return;
  }
  if(req.url.startsWith('/api/stores/owner/intake/media')){if(!uploadFailed){uploadFailed=true;json({error:'Synthetic interrupted upload. Resume this copy.'},409);return;}json({uploaded:true});return;}
  if(req.url==='/api/stores/owner/intake/finish'){const data=JSON.parse(bytes),saved=receipts.get(data.batch_id+':'+data.item_id);counts.finishRequests++;if(!saved.completed){saved.completed=true;counts.completed++;}if(!finishLost){finishLost=true;res.destroy();return;}json({id:saved.id,gvvi:saved.gvvi});return;}
 }
 if(req.url==='/api/stores/owner/intake'){json({commit:true,recognition:false});return;}
 if(req.url.startsWith('/api/stores/owner/inventory?')){res.setHeader('content-type','application/json');res.end(JSON.stringify({cards:[card],more:false}));return;}
 if(req.url==='/sample.jpg'&&fs.existsSync(privateSample)){res.setHeader('content-type','image/jpeg');res.end(fs.readFileSync(privateSample));return;}
 if(req.url==='/'||req.url.startsWith('/?')){res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html class="gv-dark"><head><meta charset="utf-8"><title>Grookai batch intake — local synthetic proof</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#f4f6f4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}html.gv-dark body{background:#111518}#root{max-width:1640px;padding:0 28px;margin:auto}.proof{font-size:11px;padding:8px 28px;background:#eaf1ec;color:#456252;display:flex;gap:14px;align-items:center}html.gv-dark .proof{background:#1b2920;color:#a9c6b6}.proof button{font:inherit;color:inherit;border:1px solid #687e70;background:transparent;border-radius:4px;cursor:pointer}@media(max-width:600px){#root{padding:0 12px}.proof{padding:8px 12px}}</style></head><body><aside class="proof">LOCAL PREVIEW · Synthetic catalog · Mock receipt service · No database writes <button id="sample">Check receipt counts</button><span id="qa-state"></span></aside><div id="root"></div><script src="/bundle.js"></script></body></html>');return;}
 const asset=assets.get(req.url);if(!asset){res.writeHead(404).end();return;}
 res.setHeader('content-type','text/javascript');res.end(asset);
});
server.listen(26443,'127.0.0.1',()=>console.log('Synthetic component preview: http://127.0.0.1:26443; mock fault injection; no database or production access.'));
