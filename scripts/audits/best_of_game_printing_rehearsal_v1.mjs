import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {LOCAL_DATABASE,assertBestOfGameRehearsal,executeBestOfGameRehearsal} from '../../backend/catalog/best_of_game_printing_rehearsal_v1.mjs';
import {printingManifestHash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {loadBestOfGameAuthority} from './best_of_game_printing_repair_prepare_v1.mjs';
import {assertMasterPrintingAuthority} from '../../backend/catalog/master_index_printing_authority_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const producers=['scripts/audits/best_of_game_printing_rehearsal_v1.mjs','backend/catalog/best_of_game_printing_rehearsal_v1.mjs',
 'backend/catalog/master_index_printing_execution_v1.mjs','backend/catalog/master_index_printing_authority_v1.mjs',
 'backend/catalog/printing_completeness_gate_v1.mjs','scripts/audits/me04_finish_truth_v1.mjs','scripts/audits/best_of_game_printing_repair_prepare_v1.mjs',
 'backend/catalog/master_index_printing_repair_plan_v1.mjs','docs/catalog/master_printing_authority_v1/bp/manifest.json',
 'docs/catalog/master_printing_authority_v1/bp/review.json','docs/catalog/master_printing_authority_v1/bp/checked_source_fields.json'];
export function bestOfGameRehearsalCodeBinding() {
 const files=producers.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
 return {files,fingerprint:printingManifestHash(files)};
}
export function assertRehearsalConnection(connection) {
 assert.ok(connection&&typeof connection==='object'&&!Array.isArray(connection));
 assert.ok(Object.keys(connection).every(k=>['host','port','user','password','database'].includes(k)),'Unknown local connection option');
 assert.equal(connection.host,'127.0.0.1','Only the dedicated local IPv4 endpoint is allowed');
 assert.equal(connection.port,64240,'Only the dedicated rehearsal port is allowed');
 assert.equal(connection.database,LOCAL_DATABASE);assert.equal(connection.user,'postgres');
 assert.ok(typeof connection.password==='string'&&connection.password.length>=16,'Private local password required');
}

async function main() {
 if(process.argv.length===3&&process.argv[2]==='--print-code-binding') {console.log(JSON.stringify(bestOfGameRehearsalCodeBinding()));return;}
 const args={};
 for(const token of process.argv.slice(2)) {
  const match=/^--(mode|connection-file|plan|plan-fingerprint|code-fingerprint|out-dir)=(.+)$/.exec(token);
  assert.ok(match&&!Object.hasOwn(args,match[1]),'Unknown or repeated argument');args[match[1]]=match[2];
 }
 for(const key of ['mode','connection-file','plan','plan-fingerprint','code-fingerprint','out-dir'])assert.ok(args[key],`Missing ${key}`);
 assert.ok(['preflight','rollback','apply','readback'].includes(args.mode),'Unsupported rehearsal mode');
 const code=bestOfGameRehearsalCodeBinding();assert.equal(code.fingerprint,args['code-fingerprint'],'Wrong local rehearsal producer');
 const connectionBytes=fs.readFileSync(args['connection-file']),connection=JSON.parse(connectionBytes);assertRehearsalConnection(connection);
 const planBytes=fs.readFileSync(args.plan),plan=JSON.parse(planBytes);assertBestOfGameRehearsal(plan,args['plan-fingerprint']);
 const {manifest,artifacts}=loadBestOfGameAuthority();assertMasterPrintingAuthority(manifest,artifacts);assert.deepEqual(plan.raw.payload.master_manifest,manifest);
 const revalidate=()=>{assert.deepEqual(bestOfGameRehearsalCodeBinding(),code,'Local producer changed');assert.equal(sha(fs.readFileSync(args.plan)),sha(planBytes),'Plan bytes changed');assert.equal(sha(fs.readFileSync(args['connection-file'])),sha(connectionBytes),'Local target changed');};
 const out=path.resolve(args['out-dir']);fs.mkdirSync(out);
 const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 const target={kind:'LOCAL rehearsal only',host:connection.host,port:connection.port,database:connection.database};
 save('run-plan.json',{startedAt:new Date().toISOString(),target,mode:args.mode,code,planFingerprint:plan.fingerprint,planSha256:sha(planBytes),productionWrites:0});
 console.log(JSON.stringify({target,mode:args.mode,productionWrites:0}));
 let client;
 try {
  const r=createRequire(path.join(root,'package.json'));
  client=new(r('pg').Client)({...connection,connectionTimeoutMillis:5000,options:['preflight','readback'].includes(args.mode)?'-c default_transaction_read_only=on':undefined});
  revalidate();await client.connect();
  const result=await executeBestOfGameRehearsal({client,plan,expectedFingerprint:args['plan-fingerprint'],mode:args.mode,beforeCommit:async()=>revalidate()});
  save('result.json',{...result,codeFingerprint:code.fingerprint,finishedAt:new Date().toISOString()});console.log(JSON.stringify(result));
 }catch(error) {
  save('failure.json',{error:error.message,sqlstate:error.code,commit_uncertain:error.commit_uncertain??false,rollback_uncertain:error.rollback_uncertain??false,action:'Preserve evidence; independently read back uncertain outcomes.'});throw error;
 }finally{await client?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
