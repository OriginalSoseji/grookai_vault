// Diagnostic DDL/runtime transaction only. No ledger changes and always rollback.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1',project='square-fresh-483-20261110';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const migration=fs.readFileSync('supabase/migrations/20261111080000_square_commerce_sync_v2.sql','utf8');
assert.match(migration,/commit;\s*$/i);
const applied=process.argv[2]==='--applied';assert.ok(process.argv.length===(applied?3:2));
if(applied){const pin=JSON.parse(fs.readFileSync(lab+'/commerce-upgrade-result-v2.json')).pins['20261111080000_square_commerce_sync_v2.sql'];
 assert.equal(createHash('sha256').update(migration).digest('hex'),pin,'Applied source is immutable');}
const sql=(applied?'begin;':migration.replace(/commit;\s*$/i,''))+'\n'+fs.readFileSync('backend/square/tests/commerce_authority_v2.sql','utf8')+'\nrollback;\n';
const attempt=Date.now(),r=spawnSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
 {input:sql,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:16_000_000});
fs.writeFileSync(lab+'/commerce-diagnostic-'+attempt+'.log',(r.stdout??'')+'\n'+(r.stderr??''),{flag:'wx'});
console.log(JSON.stringify({pass:r.status===0,rolledBack:true,productionWrites:0,attempt}));
if(r.status!==0){console.error((r.stderr??'').slice(-2000));process.exitCode=1;}
