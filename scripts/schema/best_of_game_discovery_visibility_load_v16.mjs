// Exactly one fresh seven-call SDK sample against the owned full-size local lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PostgrestClient} from '@supabase/postgrest-js';
const sample=Number(process.env.LOCAL_BOG_SAMPLE),url=new URL(process.env.LOCAL_BOG_REST_URL??'');
assert.ok([1,2,3].includes(sample));assert.equal(url.protocol,'http:');assert.equal(url.hostname,'bog-direct-visibility-fullsize-rest-v16');assert.equal(url.port,'3000');assert.equal(url.pathname,'/');
assert.equal(process.env.LOCAL_BOG_PROOF_DIR,'/proof');assert.ok(process.env.LOCAL_BOG_ANON_KEY);
for(const key of Object.keys(process.env).filter(key=>/^SUPABASE_/.test(key)))assert.equal(process.env[key],undefined);
const out='/proof/sample-'+sample+'.json';assert.equal(fs.existsSync(out),false);
const oracles=JSON.parse(gunzipSync(fs.readFileSync('/proof/baseline521-seven-call-full-output-oracles.private.json.gz')));assert.equal(oracles.length,7);
const sdk=new PostgrestClient(url.origin,{headers:{apikey:process.env.LOCAL_BOG_ANON_KEY,Authorization:'Bearer '+process.env.LOCAL_BOG_ANON_KEY}});
const report={pass:false,localOnly:true,productionConnections:0,productionWrites:0,apiAcceptance:false,sample,apiBudgetMs:3000,localMarginMs:2700,startedAt:new Date().toISOString(),cases:[],sourceSha256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex')};
try{
  for(const oracle of oracles){const start=performance.now();let response;
    try{response=await sdk.rpc(oracle.name,oracle.args);}catch(error){response={error:{code:'TRANSPORT',message:error.message}};}
    const ms=Math.round(performance.now()-start),row={name:oracle.name,args:oracle.args,ms,error:response.error?.code??null,rows:Array.isArray(response.data)?response.data.length:null,exactOutput:false,withinLocalMargin:ms<2700,withinApiBudget:ms<3000};
    if(!response.error){try{assert.deepEqual(response.data,oracle.rows);row.exactOutput=true;}catch(error){row.failure=error.message;}}
    report.cases.push(row);
  }
  report.pass=report.cases.every(x=>!x.error&&x.exactOutput&&x.withinLocalMargin&&x.withinApiBudget);if(!report.pass)process.exitCode=1;
}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({sample,pass:report.pass,cases:report.cases.length,maxMs:Math.max(...report.cases.map(x=>x.ms))}));}
