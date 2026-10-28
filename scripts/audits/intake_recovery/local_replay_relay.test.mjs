// Run only in the declared network-disabled test container, never on a host.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
assert.equal(process.platform,'linux');
const port=process.env.INTAKE_PROOF_RELAY_PORT;
assert.ok(['60441','60481'].includes(port),'Only the two declared isolated relay variants may be tested');
let child,server,log='',mode='ready',seen=[];
const sentinel='local-fixture-header-must-not-be-logged';
function request(method='GET',path='/storage/v1/bucket',body=''){
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:Number(port),path,method,headers:{authorization:'Bearer '+sentinel,'content-length':Buffer.byteLength(body)},agent:false},res=>{let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:data}));});req.on('error',reject);req.end(body);
  });
}
before(async()=>{
  server=http.createServer((req,res)=>{let body='';req.on('data',data=>body+=data);req.on('end',()=>{
    seen.push({method:req.method,path:req.url,authorization:req.headers.authorization,body});
    const healthy=mode==='ready'||(mode==='recover'&&seen.length>=3);
    res.writeHead(healthy?200:503,{'content-type':'text/plain'});res.end(healthy?'real-upstream-success':'real-upstream-not-ready');
  });});await new Promise(resolve=>server.listen(8000,'127.0.0.1',resolve));
  child=spawn(process.execPath,['/relay.mjs'],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',data=>log+=data);child.stderr.on('data',data=>log+=data);
  for(let n=0;n<40;n++){try{await request('GET','/probe');return;}catch{await new Promise(resolve=>setTimeout(resolve,50));}}
  throw Error('Relay did not become ready');
});
after(async()=>{child?.kill('SIGTERM');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test('readiness GET waits for and returns the actual upstream success',async()=>{
  mode='recover';seen=[];const res=await request();assert.equal(res.status,200);assert.equal(res.body,'real-upstream-success');assert.equal(seen.length,3);assert.ok(seen.every(r=>r.authorization==='Bearer '+sentinel));
});
test('mutation requests are forwarded once even when upstream is unavailable',async()=>{
  mode='not-ready';seen=[];const res=await request('POST','/storage/v1/bucket','synthetic-body');assert.equal(res.status,503);assert.equal(res.body,'real-upstream-not-ready');assert.equal(seen.length,1);assert.equal(seen[0].body,'synthetic-body');
});
test('other GET requests are never silently retried',async()=>{
  mode='not-ready';seen=[];const res=await request('GET','/unrelated');assert.equal(res.status,503);assert.equal(seen.length,1);
});
test('bounded wait never manufactures a healthy response',{timeout:40000},async()=>{
  mode='not-ready';seen=[];const start=Date.now();const res=await request();assert.equal(res.status,503);assert.equal(res.body,'real-upstream-not-ready');assert.ok(Date.now()-start>=30000);assert.ok(Date.now()-start<38000);assert.ok(seen.length>1);assert.equal(log.includes(sentinel),false);
});
