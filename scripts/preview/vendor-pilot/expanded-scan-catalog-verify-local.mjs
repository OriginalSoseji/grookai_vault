import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash}from'node:crypto';
const dir='.local/integration/vendor-scan-release-20260924',proof=JSON.parse(fs.readFileSync(dir+'/local-rehearsal-proof.json')),planBytes=fs.readFileSync(dir+'/catalog-plan.private.json'),plan=JSON.parse(planBytes),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(planBytes),proof.planSha256);assert.equal(proof.target,'grookai-scan-catalog-rehearsal-20260924');assert.equal(proof.database,'grookai_scan_catalog_rehearsal_r2');
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024,timeout:180000});
const state=JSON.parse(docker(['inspect',proof.target]))[0];assert.equal(state.HostConfig.NetworkMode,'none');
let rows=0;const checks=[];
for(const s of plan.statements){
 const suffix=s.sql.slice(s.sql.indexOf('from jsonb_populate_recordset'));
 const key=s.table==='finish_keys'?'key':'id';
 const input=JSON.parse(suffix.match(/,'(.*)'::jsonb/)[1].replaceAll("''","'"));
 const keys=Object.keys(input[0]);assert.ok(keys.every(k=>/^[a-z_]+$/.test(k)));
 const expected=`jsonb_build_object(${keys.map(k=>"'"+k+"',expected.\""+k+'"').join(',')})`;
 const query=`select count(*) ${suffix.slice(0,-1)} expected left join public.${s.table} actual on actual.${key}=expected.${key} where actual.${key} is null or not (to_jsonb(actual) @> ${expected});`;
 // Compare only inserted columns; generated/default columns are not in payload.
 const mismatch=Number(docker(['exec','-i',proof.target,'psql','-U','postgres','-d',proof.database,'-X','-qAt','-v','ON_ERROR_STOP=1'],query).trim());
 assert.equal(mismatch,0,`Payload differs after trigger execution: ${s.table}`);rows+=s.rows;checks.push({sha256:s.sha256,rows:s.rows,mismatch});
}
fs.writeFileSync(dir+'/local-rehearsal-content-proof.json',JSON.stringify({at:new Date().toISOString(),target:proof.target,planSha256:hash(planBytes),rows,checks},null,2),{flag:'wx'});console.log(JSON.stringify({verifiedRows:rows}));
