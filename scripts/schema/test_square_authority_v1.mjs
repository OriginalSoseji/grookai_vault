import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
const lab = 'C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const project = 'square-fresh-483-20261110';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(fs.readFileSync(lab+'/candidate-result.json')).pass,true);
const network=JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0];assert.equal(network.Internal,true);
const sql=fs.readFileSync('backend/square/tests/authority_v1.sql','utf8');
assert.match(sql,/^--[^\n]*\n(?:--[^\n]*\n)*begin;/);assert.ok(sql.trim().endsWith('rollback;'));
const result=spawnSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
  {input:sql,encoding:'utf8',timeout:60000,maxBuffer:8_000_000,windowsHide:true});
// Include a fresh suffix so a failed proof remains intact after a corrected test.
const suffix=Date.now();fs.writeFileSync(lab+'/authority-'+suffix+'.log',(result.stdout??'')+'\n'+(result.stderr??''),{flag:'wx'});
console.log(JSON.stringify({status:result.status===0?'passed':'failed',localOnly:true,rolledBack:true,productionWrites:0,log:'authority-'+suffix+'.log'}));
if(result.status!==0){console.error((result.stderr??'').slice(-2500));process.exitCode=1;}
