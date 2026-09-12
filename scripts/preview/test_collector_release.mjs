import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root='C:/grookai_vault_collector_release';
const out='C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912';
assert.equal(execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),'release/collector-web-production-20260912');
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(`${dir}/${entry.name}`):[`${dir}/${entry.name}`]); }
const suites=[
  {name:'root-contracts',cwd:root,args:['--test',...files(`${root}/tests/contracts`).filter(file=>/\/(collector_|pulse_discover_presentation|pulse_navigation_copy_contract).*\.test\.mjs$/.test(file))]},
  {name:'web',cwd:`${root}/apps/web`,args:['--experimental-strip-types','--test',...files(`${root}/apps/web/src`).filter(file=>/\.test\.(ts|mjs)$/.test(file)&&!file.endsWith('/getPublicProvisionalCards.test.ts'))]},
  {name:'provisional',cwd:`${root}/apps/web`,args:['--conditions=react-server','--import','./scripts/register-web-tests.mjs','--test','src/lib/provisional/getPublicProvisionalCards.test.ts']},
];
const results=[];
for(const suite of suites){
  const run=spawnSync(process.execPath,suite.args,{cwd:suite.cwd,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
  writeFileSync(`${out}/${suite.name}-final.tap`,run.stdout+(run.stderr??''));
  const count=label=>Number(run.stdout.match(new RegExp(`^# ${label} (\\d+)$`,'m'))?.[1]??0);
  results.push({name:suite.name,exitCode:run.status,tests:count('tests'),passed:count('pass'),failed:count('fail'),skipped:count('skipped')});
}
// Feed actual read-only production RPC output through the real web validator.
// This does not open a production connection or publish fixture prices.
const require=createRequire(`${root}/apps/web/package.json`);
const ts=require('typescript');
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync(`${root}/apps/web/src/lib/pricing/marketPricingReadModelV1.ts`,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports,console});
const rows=JSON.parse(readFileSync(`${out}/governed-read-probe.json`)).blastoise_pricing;
const records=await exports.getMarketPricingReadModelV1({rpc:async()=>({data:rows,error:null})},{
  cardPrintIds:[...new Set(rows.map(row=>row.card_print_id))],
  cardPrintingIds:rows.map(row=>row.card_printing_id).filter(Boolean),
});
assert.equal(records.length,rows.filter(row=>row.status==='available').length);
assert.ok(records.some(row=>row.pricing_scope==='card_printing'));
const receipt={checkedAt:new Date().toISOString(),suites:results,passed:results.reduce((n,s)=>n+s.passed,0),failed:results.reduce((n,s)=>n+s.failed,0),skipped:results.reduce((n,s)=>n+s.skipped,0),actualProductionPriceRowsAccepted:records.length,productionWrites:false};
writeFileSync(`${out}/test-summary.json`,JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
assert.ok(results.every(result=>result.exitCode===0));
