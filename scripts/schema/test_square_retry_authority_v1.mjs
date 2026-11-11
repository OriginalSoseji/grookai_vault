import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(fs.readFileSync(lab+'/retry-candidate-result.json')).pass,true);
const result=spawnSync('docker',['exec','-i','supabase_db_square-fresh-483-20261110','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
 {input:fs.readFileSync('backend/square/tests/retry_authority_v1.sql','utf8'),encoding:'utf8',timeout:60000,windowsHide:true});
const log='retry-authority-'+Date.now()+'.log';fs.writeFileSync(lab+'/'+log,(result.stdout??'')+'\n'+(result.stderr??''),{flag:'wx'});
console.log(JSON.stringify({passed:result.status===0,localOnly:true,rolledBack:true,log,productionWrites:0}));
if(result.status!==0){console.error(result.stderr);process.exitCode=1;}
