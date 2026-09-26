// Replace only this task's unapplied development files after byte-exact replay
// and real Auth/Storage/HTTP proof. Every original remains in the audit archive.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,guard,hash} from './storefront_production_package_lab_v1.mjs';
assert.equal(process.argv.length,2);guard();
const audit=path.join(root,'docs/audits/storefront_production_package_v1');
const read=n=>JSON.parse(fs.readFileSync(path.join(audit,n)));
const plan=read('consolidation.json'),replay=read('replay.json'),scan=read('scan-admission.json');
assert.equal(replay.status,'passed');assert.equal(replay.comparison.rawBytes,0);assert.equal(scan.status,'passed');assert.equal(scan.checks.length,6);
const http=fs.readdirSync(audit).filter(n=>/^http-.*\.json$/.test(n)).map(read).find(r=>r.status==='passed'&&r.emptyOffGuardPassed&&r.checks.length===18);assert.ok(http);
const receipt=path.join(audit,'adopted.json');assert.ok(!fs.existsSync(receipt));
const active=path.join(root,'supabase/migrations');assert.equal(fs.readdirSync(active).filter(n=>/^\d+.*\.sql$/.test(n)).length,419);
for(const r of plan.inputs){
  assert.equal(hash(fs.readFileSync(path.join(active,r.name))),r.sha256);
  assert.equal(hash(fs.readFileSync(path.join(audit,'historical_migrations',r.name))),r.sha256);
}
assert.equal(hash(fs.readFileSync(path.join(audit,plan.output.name))),plan.output.sha256);
fs.writeFileSync(path.join(audit,'adopt-intent.json'),JSON.stringify({at:new Date().toISOString(),source:plan.output,inputs:plan.inputs}),{flag:'wx'});
fs.copyFileSync(path.join(audit,plan.output.name),path.join(active,plan.output.name),fs.constants.COPYFILE_EXCL);
for(const r of plan.inputs){const target=path.resolve(active,r.name);assert.equal(path.dirname(target),path.resolve(active));fs.unlinkSync(target);}
assert.equal(fs.readdirSync(active).filter(n=>/^\d+.*\.sql$/.test(n)).length,401);
const report={at:new Date().toISOString(),status:'passed',migrations:401,archivedInputs:19,source:plan.output,productionWrites:0};
fs.writeFileSync(receipt,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
