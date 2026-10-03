import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
import { safeMasterPath, prepareWorld2010Integration, reconcileWorld2010Integration, applyWorld2010Integration } from '../../backend/catalog/pokemon_world2010_master_integration_v1.mjs';

export function runWorld2010MasterIntegration(args) {
  const options = new Map();
  for (const arg of args) {
    const m=arg.match(/^--(mode|journal|snapshot|receipt|review|originals-dir|out-file|recovery-receipt)=(.+)$/);
    assert.ok(m&&!options.has(m[1]),'unique_integration_arguments_required');options.set(m[1],m[2]);
  }
  const mode=options.get('mode'), fields={integrate:['mode','journal','snapshot','receipt','review','originals-dir'],
    reconcile:['mode','journal','out-file'],resume:['mode','journal','recovery-receipt']}[mode];
  assert.ok(fields,'integration_mode_required');assert.deepEqual([...options.keys()].sort(),fields.sort(),'exact_mode_arguments_required');
  const root=fileURLToPath(new URL('../../',import.meta.url));
  assert.equal(path.resolve(root).toLowerCase(),path.resolve('C:/gv_pokemon_relationship_agent_20261002').toLowerCase(),'dedicated_worktree_required');
  assert.equal(path.resolve(process.cwd()).toLowerCase(),path.resolve(root).toLowerCase(),'dedicated_cwd_required');
  const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
  assert.equal(branch,'pokemon-relationship-repair-20261002/work','dedicated_branch_required');
  const active=safeMasterPath(root,'docs/audits/verified_master_set_index_v1/english_master_index_v1');
  const out=safeMasterPath(path.resolve(options.get('journal')));
  if(mode==='reconcile') {
    const result=reconcileWorld2010Integration({active,out});
    const file=safeMasterPath(path.dirname(path.resolve(options.get('out-file'))),path.basename(options.get('out-file')));
    assert.ok(!file.startsWith(active+path.sep),'readback_outside_master_required');
    fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
  }
  if(mode==='resume')return applyWorld2010Integration({active,out,recoveryReceipt:path.resolve(options.get('recovery-receipt'))});
  const dir=safeMasterPath(path.resolve(options.get('originals-dir')));
  const candidates=fs.readdirSync(dir).filter(f=>fs.statSync(safeMasterPath(dir,f)).isFile());
  const originals=new Map(DECKS.map(d=>{
    const matching=candidates.filter(f=>createHash('sha256').update(fs.readFileSync(safeMasterPath(dir,f))).digest('hex')===d.sha256);
    assert.equal(matching.length,1,'one_exact_checklist_required');return[d.code,safeMasterPath(dir,matching[0])];
  }));
  prepareWorld2010Integration({active,out,snapshotFile:path.resolve(options.get('snapshot')),
    receiptFile:path.resolve(options.get('receipt')),reviewFile:path.resolve(options.get('review')),originals});
  return applyWorld2010Integration({active,out});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runWorld2010MasterIntegration(process.argv.slice(2))));}
  catch(error){console.error('World2010 source integration stopped: '+error.message);process.exitCode=1;}
}
