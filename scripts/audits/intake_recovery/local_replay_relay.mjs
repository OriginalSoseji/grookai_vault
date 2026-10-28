// Template for one owned loopback-only, internal-network proof lab.
// Return only real upstream responses. Retry only the CLI's idempotent Storage
// bucket readiness GET while Storage is restarting after a database reset.
import net from 'node:net';
import http from 'node:http';
const project='__PROJECT__',port=Number('__DB_PORT__');
if(!((project==='intake-ready-replay-476-20261027'&&port===60440)||(project==='intake-ready-replay-476-v5-20261027'&&port===60480)))throw Error('Unbound proof relay');
for(const [listen,service,target] of [[port,'db',5432],[port+4,'inbucket',8025]]){
  net.createServer(source=>{
    const upstream=net.connect(target,`supabase_${service}_${project}`);
    source.on('error',()=>upstream.destroy());upstream.on('error',()=>source.destroy());
    source.on('close',()=>upstream.destroy());upstream.on('close',()=>source.destroy());
    source.pipe(upstream).pipe(source);
  }).listen(listen,'0.0.0.0');
}
http.createServer((request,response)=>{
  const readiness=request.method==='GET'&&request.url==='/storage/v1/bucket';
  const deadline=Date.now()+30000;let active;
  response.on('close',()=>active?.destroy());
  function attempt(){
    if(response.destroyed)return;
    active=http.request({hostname:`supabase_kong_${project}`,port:8000,path:request.url,method:request.method,headers:{...request.headers,connection:'close'},agent:false},upstream=>{
      if(readiness&&[502,503].includes(upstream.statusCode)&&Date.now()<deadline){
        console.log(JSON.stringify({operation:'storage-readiness-retry',upstreamStatus:upstream.statusCode}));
        upstream.resume();upstream.once('end',()=>setTimeout(attempt,250));return;
      }
      response.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(response);
    });
    active.on('error',()=>{
      if(readiness&&Date.now()<deadline){setTimeout(attempt,250);return;}
      if(!response.headersSent)response.writeHead(502);response.end();
    });
    if(readiness){request.resume();active.end();}else request.pipe(active);
  }
  attempt();
}).listen(port+1,'0.0.0.0');
