import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashClassicCommandOutput } from '../../backend/catalog/pokemon_classic_producer_hash_v1.mjs';
import { loadClassicFrozenPackage, buildClassicFrozenPlan, classicFrozenPackageBinding } from '../../backend/catalog/pokemon_classic_frozen_package_v1.mjs';
import { loadClassicCanonicalBundle } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { classicExecutionIntent, applyClassicJournaledLocalQualification } from '../../backend/catalog/pokemon_classic_execution_journal_v1.mjs';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { buildGroupDiscoveryIntakePlan } from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('producer hashing streams every byte beyond the former128MiB limit', async () => {
  const chunks = 129, size = 1024 * 1024, bytes = Buffer.alloc(size, 37), expected = createHash('sha256');
  for (let i=0;i<chunks;i++) expected.update(bytes);
  const result = await hashClassicCommandOutput(process.execPath, ['--input-type=module', '-e',
    `import {once} from 'node:events';const b=Buffer.alloc(${size},37);for(let i=0;i<${chunks};i++)if(!process.stdout.write(b))await once(process.stdout,'drain');`]);
  assert.equal(result.bytes, chunks * size); assert.equal(result.sha256, expected.digest('hex'));
});
test('producer hashing rejects nonzero exit and missing executable without accepting partial stdout', async () => {
  await assert.rejects(() => hashClassicCommandOutput(process.execPath, ['-e', "process.stdout.write('partial');process.stderr.write('failure');process.exitCode=9"]), /producer_command_failed:exit=9/);
  await assert.rejects(() => hashClassicCommandOutput('grookai_nonexistent_producer_hash_binary', []), /ENOENT/);
});
test('execution journal refuses nonlocal host before a database statement', async () => {
  let calls = 0;
  await assert.rejects(() => applyClassicJournaledLocalQualification({connectionParameters:{host:'example.invalid'}, query:async()=>{calls++;}}, {}, {}, {}, {}), /local_journal_qualification_host_required/);
  assert.equal(calls, 0);
});

const state = process.env.CLASSIC_PROOF_INPUT_ROOT;
test('all102 frozen source reviews survive fresh observations without changing checked-in manifests', { skip: !state }, async t => {
  const frozen = loadClassicFrozenPackage(root);
  const bundle = loadClassicCanonicalBundle({qualificationAt:frozen.qualification_at, stagingDir:state+'/classic-finish-staging-v3',
    speciesFile:state+'/classic-canonical-plan-v3/species.json', observationFile:state+'/classic-family-evidence-v2/clv032-physical-domain-observation.json'});
  const old = JSON.parse(fs.readFileSync(state+'/classic-canonical-plan-v3/plan.json'));
  const first = buildClassicFrozenPlan(bundle,old.ingress,frozen);
  const input = structuredClone(old.ingress.group_input); input.observed_at = '2026-10-02T23:00:00.000Z';
  const later = buildClassicFrozenPlan(bundle,buildGroupDiscoveryIntakePlan(input),frozen);
  assert.notEqual(first.plan.ingress.fingerprint,later.plan.ingress.fingerprint);
  assert.deepEqual(first.plan.manifests,later.plan.manifests); assert.deepEqual(first.reviewArtifacts,later.reviewArtifacts);
  assert.equal(first.plan.tables.card_prints.length,102); assert.equal(first.plan.production_apply_enabled,false);
  await t.test('fresh observation timestamp cannot become source review time',()=>assert.throws(()=>buildClassicFrozenPlan({...bundle,qualificationAt:input.observed_at},old.ingress,frozen),/immutable_source_review_time_required/));
  await t.test('manifest edit is rejected by original replay',()=>{
    const changed={...frozen,manifests:structuredClone(frozen.manifests)};changed.manifests[0].parents[0].name='drift';
    assert.throws(()=>buildClassicFrozenPlan(bundle,old.ingress,changed),/checked_in_manifest_source_replay_mismatch/);
  });
  await t.test('review byte edit is rejected even with unchanged parsed meaning',()=>{
    const changed={...frozen,reviews:new Map(frozen.reviews)};const key=[...changed.reviews.keys()][0];changed.reviews.set(key,Buffer.concat([changed.reviews.get(key),Buffer.from('\n')]));
    assert.throws(()=>buildClassicFrozenPlan(bundle,old.ingress,changed),/checked_in_review_bytes_mismatch/);
  });
  await t.test('active Master names must match original source replay',()=>{
    const cards=frozen.master.cardsArtifact.cards.map(r=>r.set_key==='classic-clv'&&r.card_number==='001'?{...r,card_name:'drift'}:r);
    const changed={...frozen,master:{...frozen.master,cardsArtifact:{...frozen.master.cardsArtifact,cards}}};
    assert.throws(()=>buildClassicFrozenPlan(bundle,old.ingress,changed),/active_master_classic_source_replay_mismatch/);
  });
  await t.test('execution intent binds every parent, ingress identity and package hash',()=>{
    const binding=classicFrozenPackageBinding(frozen),producerBody={head:'e'.repeat(40),clean:false};
    const body={canonical_fingerprint:old.fingerprint,frozen_package:binding,schema_fingerprint:'b'.repeat(64),producer:{...producerBody,fingerprint:hash(producerBody)}};
    const observation={...body,fingerprint:hash(body)},intent=classicExecutionIntent(old,binding,randomUUID(),observation);
    assert.equal(intent.parent_ids.length,102);assert.equal(intent.discovery_ids.length,21);assert.equal(intent.production_apply_enabled,false);
    assert.throws(()=>classicExecutionIntent(old,{...binding,qualification_at:input.observed_at},randomUUID(),observation),/frozen_binding_fingerprint_mismatch/);
    assert.throws(()=>classicExecutionIntent(old,binding,'historical-consumed-run',observation),/did not match/);
  });
});