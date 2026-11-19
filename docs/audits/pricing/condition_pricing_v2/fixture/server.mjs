import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const dir=path.resolve('.tmp/condition-auto-ui');const fixture=JSON.parse(await fs.readFile(path.join(dir,'live-canary.json'),'utf8'));
let mode='normal',pendingErrors=0;
const server=http.createServer(async(request,response)=>{
 const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/__test/mode'&&request.method==='POST'){mode=url.searchParams.get('mode')??'normal';pendingErrors=mode==='errorOnce'?1:0;response.writeHead(204).end();return;}
 if(url.pathname==='/api/condition-pricing/v1'){
  const condition=url.searchParams.get('condition');const id=url.searchParams.get('card_printing_id');
  if(pendingErrors>0){pendingErrors--;response.writeHead(503,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({ok:false,error:'Fixture error'}));return;}
  const data=fixture.prices.find(row=>row.card_printing_id===id&&row.condition===condition);
  const delay=mode==='delayedNM'&&condition==='NM'?900:20;
  setTimeout(()=>{if(!response.destroyed)response.writeHead(data?200:404,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(data?{ok:true,pricing:mode==='mismatch'?{...data,condition:data.condition==='NM'?'LP':'NM'}:data}:{ok:false}));},delay);return;
 }
 if(url.pathname==='/fixture.json'){response.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(fixture));return;}
 if(url.pathname==='/Roboto-Regular.ttf'){response.writeHead(200,{'content-type':'font/ttf'}).end(await fs.readFile('assets/fonts/Roboto/Roboto-Regular.ttf'));return;}
 if(url.pathname==='/app.js'||url.pathname==='/app.css'){response.writeHead(200,{'content-type':url.pathname.endsWith('.js')?'text/javascript':'text/css'}).end(await fs.readFile(path.join(dir,url.pathname.slice(1))));return;}
 if(url.pathname==='/favicon.ico'){response.writeHead(204).end();return;}
 response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}).end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>grookai condition preview · local fixture</title><link rel="stylesheet" href="/app.css"><style>@font-face{font-family:Roboto;src:url('/Roboto-Regular.ttf') format('truetype');font-weight:100 900;font-display:swap}body,select,button{font-family:Roboto,sans-serif}</style></head><body><main class="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8"><h1 class="text-2xl font-semibold">Condition auto-switching fixture</h1><p class="text-sm text-slate-500">Local UI verification fixture · Dragons Exalted · source snapshot from the private read model. This is not a deployed product screen.</p><section class="rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-5 sm:p-7"><div id="root"></div></section></main><script type="module" src="/app.js"></script></body></html>`);
});
server.listen(Number(process.env.CONDITION_FIXTURE_PORT||0),'127.0.0.1',async()=>{const port=server.address().port;const state={url:`http://127.0.0.1:${port}`,pid:process.pid};await fs.writeFile(path.join(dir,'server.json'),JSON.stringify(state));console.log(JSON.stringify(state));});
