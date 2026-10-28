import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const source=fs.readFileSync(new URL('../../apps/web/src/lib/vault/collectorAcquisitionDate.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(){const module={exports:{}};vm.runInNewContext(compiled,{module,exports:module.exports,Date,Number,Math,String});return module.exports;}
test('reviewed acquisition validates the actual civil day and finite offset',()=>{
 const {isCollectorAcquisition}=load();
 assert.equal(isCollectorAcquisition({acquired_on:'2020-01-15',acquired_at:'2020-01-15T07:00:00.000Z',acquired_utc_offset_minutes:-420}),true);
 for(const value of [null,{}, {acquired_on:'2020-01-15',acquired_at:'2020-01-15T00:00:00Z',acquired_utc_offset_minutes:-420},{acquired_on:'2020-03-01',acquired_at:'2020-02-30T00:00:00Z',acquired_utc_offset_minutes:0},{acquired_on:'2020-01-15',acquired_at:'2020-01-15T00:00:00Z',acquired_utc_offset_minutes:0.5},{acquired_on:'2020-01-15',acquired_at:'2020-01-15T00:00:00Z',acquired_utc_offset_minutes:900}])assert.equal(isCollectorAcquisition(value),false);
});
for(const [zone,date,instant,offset] of [
 ['America/Denver','2020-01-15','2020-01-15T07:00:00.000Z',-420],
 ['Pacific/Kiritimati','2020-01-15','2020-01-14T10:00:00.000Z',840],
 ['Asia/Kolkata','2020-01-15','2020-01-14T18:30:00.000Z',330],
 ['America/Sao_Paulo','2018-11-04','2018-11-04T03:00:00.000Z',-120],
])test('local review keeps its calendar date in '+zone,()=>{
 const runner='const fixture={exports:{}};new Function("module","exports",'+JSON.stringify(compiled)+')(fixture,fixture.exports);process.stdout.write(JSON.stringify(fixture.exports.localCollectorAcquisition('+JSON.stringify(date)+')));';
 const env=Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));env.TZ=zone;
 const result=JSON.parse(execFileSync(process.execPath,['-e',runner],{env,encoding:'utf8',timeout:10000}));
 assert.deepEqual(result,{acquired_on:date,acquired_at:instant,acquired_utc_offset_minutes:offset});
 assert.equal(load().isCollectorAcquisition(result),true);
});
