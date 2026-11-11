// Retained-lab authority proofs only, always rolled back. No JWT impersonation,
// provider IO, production connection or migration-history change.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1',project='square-fresh-483-20261110';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const pins={};for(const receipt of ['order-review-upgrade-result-v4.json','reacquired-clock-upgrade-result-v4.json']){const value=JSON.parse(fs.readFileSync(lab+'/'+receipt));assert.equal(value.pass,true);pins[value.file]=value.sha256;}
for(const [file,pin]of Object.entries(pins))assert.equal(createHash('sha256').update(fs.readFileSync(root+'/supabase/migrations/'+file)).digest('hex'),pin);
const sources=['backend/square/tests/commerce_authority_v2.sql','backend/square/tests/review_isolation_v4.sql','backend/square/tests/reacquired_claim_clock_v4.sql'];
const sql=sources.map(name=>'begin;\n'+fs.readFileSync(root+'/'+name,'utf8')+'\nrollback;').join('\n');
const result=spawnSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:16_000_000});
const id=Date.now(),output=lab+'/order-review-authority-'+id;fs.writeFileSync(output+'.log',(result.stdout??'')+'\n'+(result.stderr??''),{flag:'wx'});
const proof={pass:result.status===0,at:new Date().toISOString(),rolledBack:true,productionWrites:0,migrationPins:pins,sourceHashes:Object.fromEntries(sources.map(name=>[name,createHash('sha256').update(fs.readFileSync(root+'/'+name,'utf8').replaceAll('\r\n','\n')).digest('hex')]))};
fs.writeFileSync(output+'.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...proof,output:output+'.json'}));if(result.status!==0){console.error(result.stderr);process.exitCode=1;}
