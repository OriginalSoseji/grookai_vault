import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {buildMasterPrintingRepairPlan} from '../../backend/catalog/master_index_printing_repair_plan_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const authorityDir=path.join(root,'docs/catalog/master_printing_authority_v1/bp');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function loadBestOfGameAuthority() {
  const manifest=JSON.parse(fs.readFileSync(path.join(authorityDir,'manifest.json')));
  const artifacts=new Map([[manifest.master_index_ref,fs.readFileSync(path.join(root,manifest.master_index_ref))],
    [manifest.authority.review.ref,fs.readFileSync(path.join(authorityDir,'review.json'))]]);
  for(const source of manifest.authority.source_artifacts) artifacts.set(source.ref,fs.readFileSync(path.join(authorityDir,'checked_source_fields.json')));
  return {manifest,artifacts};
}

// Offline preparation only. This module has no database client or executor.
export function prepareBestOfGamePrintingRepair({snapshot,fullPrintings,reviews,inventoryBytes,asOf}) {
  const {manifest,artifacts}=loadBestOfGameAuthority();
  assert.equal(manifest.fingerprint,'48ba01523ae9f62d47165f3f0e7effc06b4637fff25ee538cad4915931617089','authority_changed_requires_new_package');
  const inventory=JSON.parse(inventoryBytes);
  assert.equal(inventory.version,'BEST_OF_GAME_DEPENDENCY_INVENTORY_V1');
  assert.equal(inventory.project_ref,'ycdxbpibncqcchqiihfz');
  assert.equal(inventory.observed_at,snapshot.observed_at,'inventory_snapshot_time_mismatch');
  assert.equal(snapshot.parents.length,2);
  assert.equal(snapshot.printings.length,0,'baseline_changed_requires_readback');
  const expectedCounts={sets:2,parents:22,children:16,mappings:30,identities:22,owned:1};
  assert.equal(inventory.protected_footprints.length,Object.keys(expectedCounts).length,'incomplete_preservation_inventory');
  for(const [name,rows] of Object.entries(expectedCounts)) {
    const matches=inventory.protected_footprints.filter(p=>p.name===name);
    assert.equal(matches.length,1,'duplicate_or_missing_preservation_inventory');
    assert.equal(matches[0].rows,rows,`family_baseline_changed:${name}`);
    assert.match(matches[0].sha256,/^[a-f0-9]{64}$/);
  }
  assert.equal(inventory.foreign_keys.length,95,'dependency_schema_changed_requires_review');
  artifacts.set('dependency-inventory',inventoryBytes);
  const candidate=buildMasterPrintingRepairPlan({manifest,artifacts,snapshot,fullPrintings,reviews,asOf,
    dependencyEvidence:{inventory_ref:'dependency-inventory',inventory_sha256:sha(inventoryBytes),
      foreign_keys:inventory.foreign_keys,protected_footprints:inventory.protected_footprints,
      proposed_uuid_collisions:inventory.proposed_uuid_collisions,checked_proposed_ids:inventory.checked_proposed_ids}});
  assert.deepEqual(candidate.expected_mutation_counts,{raw_evidence_inserts:1,printing_inserts:2,provenance_updates:0,review_inserts:2});
  assert.equal(candidate.write_ready,false);
  return candidate;
}

function main() {
  const args={};
  for(const token of process.argv.slice(2)) {
    const match=/^--(snapshot|before-rows|reviews|inventory|as-of|out-dir)=(.+)$/.exec(token);
    assert.ok(match&&!args[match[1]],`unknown_or_repeated_argument:${token}`);
    args[match[1]]=match[2];
  }
  for(const key of ['snapshot','before-rows','reviews','inventory','as-of','out-dir']) assert.ok(args[key],`missing_argument:${key}`);
  const read=file=>JSON.parse(fs.readFileSync(file));
  const candidate=prepareBestOfGamePrintingRepair({snapshot:read(args.snapshot),fullPrintings:read(args['before-rows']),reviews:read(args.reviews),
    inventoryBytes:fs.readFileSync(args.inventory),asOf:args['as-of']});
  fs.mkdirSync(args['out-dir']);
  fs.writeFileSync(path.join(args['out-dir'],'candidate.json'),JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:candidate.status,counts:candidate.expected_mutation_counts,fingerprint:candidate.fingerprint,write_ready:false,database_writes:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {main();}catch(error){console.error(error.message);process.exitCode=1;}
}
