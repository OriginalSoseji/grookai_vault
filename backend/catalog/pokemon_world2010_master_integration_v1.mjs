import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ARTIFACTS } from './pokemon_classic_master_staging_v1.mjs';
import { DECKS } from './pokemon_world2010_relationship_review_v1.mjs';
import { projectWorld2010Identities } from './pokemon_world2010_identity_projection_v1.mjs';
import { stageWorld2010MembershipArtifacts } from './pokemon_world2010_membership_v1.mjs';
import { buildArtifacts } from '../../scripts/audits/english_master_index_completion_v1_build.mjs';
import { setManifestRow } from '../../scripts/audits/english_master_index_publishable_v1_build.mjs';

export const VERSION = 'POKEMON_WORLD2010_MASTER_INTEGRATION_V1';
const SOURCE_DIR = 'world2010_relationship_sources_v1';
const LOCK = '.world2010-master-integration.lock';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const countBy = (rows, field) => rows.reduce((a, r) => ({ ...a, [r[field]]: (a[r[field]] ?? 0) + 1 }), {});

export function stageWorld2010Master(inputs) {
  const { baseline, originals, snapshot } = inputs;
  const projectionInputs = { ...inputs, baseline: Object.fromEntries(['cardsArtifact','setsArtifact','printingsArtifact'].map(k => [k, baseline[k]])) };
  const projection = projectWorld2010Identities(projectionInputs);
  const memberStage = stageWorld2010MembershipArtifacts(projection, projectionInputs);
  assert.equal(baseline.index.language, 'en'); assert.equal(baseline.index.audit_only, true);
  assert.equal(baseline.index.summary.sets, baseline.setsArtifact.sets.length, 'baseline_summary_set_drift');
  assert.deepEqual(baseline.index.summary.cards_by_status, countBy(baseline.cardsArtifact.cards, 'status'), 'baseline_summary_card_drift');
  const codes = new Set(DECKS.map(d => d.code));
  assert.ok(baseline.availabilityArtifact.source_availability.every(r => !codes.has(r.set_key)), 'availability_scope_already_present');
  const evidence = new Map(DECKS.map(d => [`${SOURCE_DIR}/${d.code}.txt`, originals.get(d.code)]));
  // The public warehouse source rows retain TCGCSV's original fields and IDs.
  // Private canonical/review snapshots stay in the external journal inputs.
  evidence.set(`${SOURCE_DIR}/tcgcsv-products.json`, jsonBytes({ source: 'tcgcsv', products: snapshot.products }));
  const manifest = { version: VERSION, review_fingerprint: inputs.review.fingerprint,
    projected_identities: 92, expected_membership: 109, held: projection.held,
    finish_authority: false, production_writes: 0,
    sources: [...evidence].map(([file, bytes]) => ({ file, sha256: sha(bytes) })),
    facts: projection.cards.map(c => ({ key: c.key, evidence: c.source_evidence })) };
  const manifestFile = `${SOURCE_DIR}/manifest.json`;
  evidence.set(manifestFile, jsonBytes(manifest));
  const availability = projection.sets.flatMap(s => ['bulbapedia_set_list','tcgcsv'].map(source_key => ({
    set_key: s.key, set_name: s.set_name, source_key, source_alias: s.source_aliases[source_key],
    configured_status: 'preserved', runtime_status: 'collected', evidence_rows: s.admitted_identity_count, error: null,
    expected_membership: s.expected_identity_count, held_identity_count: s.held_identity_count,
    source_evidence_manifest: manifestFile, finish_authority: false,
  })));
  const staged = { ...baseline, ...memberStage,
    availabilityArtifact: { ...baseline.availabilityArtifact, source_availability: [...baseline.availabilityArtifact.source_availability, ...availability] } };
  const overlap = new Map(baseline.index.summary.source_overlap.map(r => [r.source_key, { ...r }]));
  for (const source of ['bulbapedia_set_list','tcgcsv']) {
    const row = overlap.get(source) ?? { source_key: source, evidence_rows: 0 };
    overlap.set(source, { ...row, evidence_rows: row.evidence_rows + 92 });
  }
  staged.index = { ...baseline.index,
    source_integrations: [...(baseline.index.source_integrations ?? []), { version: VERSION, manifest: manifestFile,
      manifest_sha256: sha(evidence.get(manifestFile)), added_identities: 92, added_finish_facts: 0, held_identities: 17 }],
    summary: { ...baseline.index.summary, sets: staged.setsArtifact.sets.length,
      evidence_rows: baseline.index.summary.evidence_rows + 184, source_overlap: [...overlap.values()],
      cards_by_status: countBy(staged.cardsArtifact.cards, 'status'),
      source_availability_by_status: countBy(staged.availabilityArtifact.source_availability.map(r => ({ status: `${r.source_key}|${r.runtime_status}` })), 'status') } };
  for (const k of ['printingsArtifact','manualReviewArtifact','conflictsArtifact','finishBlockerClosure','suppressed'])
    assert.deepEqual(staged[k], baseline[k], 'protected_master_artifact_changed:' + k);
  const before = buildArtifacts(baseline), after = buildArtifacts(staged);
  for (const row of before.setMatrix.sets) assert.deepEqual(after.setMatrix.sets.find(s => s.set_key === row.set_key), row, 'prior_completion_changed');
  const publication = after.setMatrix.sets.filter(s => codes.has(s.set_key)).map(setManifestRow);
  assert.equal(publication.length, 4); assert.ok(publication.every(s => s.shard_refs === null));
  assert.equal(publication.reduce((n, s) => n + s.anthology_membership.held.length, 0), 17);
  return { staged, evidence, projection, completion: after, publication, prior_sets_preserved: before.setMatrix.sets.length };
}

// No database/release capability. Paths and complete inventory are checked on
// every readback; unknown bytes must be investigated, never overwritten.
export function safeMasterPath(root, relative = '') {
  root = path.resolve(root);
  assert.ok(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), 'relative_path_required');
  const file = path.resolve(root, relative);
  assert.ok(file === root || file.startsWith(root + path.sep), 'path_escape');
  for (let p = file; ; p = path.dirname(p)) {
    if (fs.existsSync(p)) assert.ok(!fs.lstatSync(p).isSymbolicLink(), 'symlink_forbidden');
    if (p === path.dirname(p)) break;
  }
  return file;
}
const fileHash = file => fs.existsSync(file) ? sha(fs.readFileSync(file)) : null;
const inventory = root => {
  const rows = [];
  function walk(rel) {
    for (const entry of fs.readdirSync(safeMasterPath(root, rel), { withFileTypes: true })) {
      const name = rel ? rel + '/' + entry.name : entry.name;
      if (name === LOCK) continue;
      const full = safeMasterPath(root, name);
      if (entry.isDirectory()) walk(name);
      else { assert.ok(entry.isFile(), 'regular_file_required'); rows.push({ file: name, sha256: fileHash(full) }); }
    }
  }
  walk(''); return rows.sort((a,b) => a.file.localeCompare(b.file));
};
const read = file => JSON.parse(fs.readFileSync(file));
function assertObservation(snapshot, receipt, snapshotFile) {
  assert.equal(receipt.snapshot_sha256, fileHash(snapshotFile));
  assert.equal(receipt.status, 'whole109_existing_identity_observed_not_mapping_authority');
  assert.equal(receipt.independent_connections, 2); assert.equal(receipt.verified_tls, true);
  assert.equal(receipt.read_only, true); assert.equal(receipt.production_writes, 0); assert.equal(receipt.source_hashes_unchanged, true);
  assert.deepEqual(snapshot.sanity, receipt.sanity);
  assert.ok(snapshot.sanity.cards >= 40000 && snapshot.sanity.sets >= 150 && snapshot.sanity.traits >= 5000);
}
const save = (root, file, bytes) => {
  const full = safeMasterPath(root, file); fs.mkdirSync(path.dirname(full), { recursive: true });
  const fd = fs.openSync(full, 'wx'); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
};
function serializeLike(value, before) {
  const text = before.toString(), indent = text.match(/^[{\[]\r?\n([ \t]+)\S/)?.[1];
  const nl = text.endsWith('\r\n') ? '\r\n' : '\n';
  return Buffer.from(JSON.stringify(value, null, indent).replaceAll('\n', nl) + nl);
}

export function prepareWorld2010Integration({ active, out, snapshotFile, receiptFile, reviewFile, originals }) {
  active = safeMasterPath(active); out = safeMasterPath(out);
  assert.ok(!fs.existsSync(out), 'new_immutable_journal_required');
  assert.ok(!out.startsWith(active + path.sep) && !active.startsWith(out + path.sep) && out !== active, 'journal_outside_master_required');
  assert.ok(!fs.existsSync(safeMasterPath(active, LOCK)), 'integration_lock_exists');
  const originalInventory = inventory(active), baseline = {};
  for (const [key, file] of Object.entries(ARTIFACTS)) baseline[key] = read(safeMasterPath(active, file));
  const snapshot = read(snapshotFile), receipt = read(receiptFile), review = read(reviewFile);
  assertObservation(snapshot, receipt, snapshotFile);
  const boundFiles = [snapshotFile, receiptFile, reviewFile, ...originals.values()].map(file => ({ file: safeMasterPath(path.dirname(file), path.basename(file)), sha256: fileHash(file) }));
  const inputs = { snapshot, review, baseline, originals: new Map([...originals].map(([code, file]) => [code, fs.readFileSync(file)])) };
  const result = stageWorld2010Master(inputs), writes = [];
  for (const [key, file] of Object.entries(ARTIFACTS)) {
    if (JSON.stringify(baseline[key]) === JSON.stringify(result.staged[key])) continue;
    const bytes = serializeLike(result.staged[key], fs.readFileSync(safeMasterPath(active, file)));
    writes.push({ file, before: fileHash(safeMasterPath(active, file)), after: sha(bytes), bytes });
  }
  for (const [file, bytes] of result.evidence) {
    assert.equal(fs.existsSync(safeMasterPath(active, file)), false, 'source_evidence_collision');
    writes.push({ file, before: null, after: sha(bytes), bytes });
  }
  assert.equal(writes.length, 10, 'exact_four_artifacts_five_sources_and_manifest_required');
  fs.mkdirSync(out);
  // Four existing artifacts change, plus six new source files. All nine baseline
  // artifacts are retained for an independent semantic replay after a torn write.
  for (const file of Object.values(ARTIFACTS)) save(out, 'baseline/' + file, fs.readFileSync(safeMasterPath(active, file)));
  for (const row of writes) save(out, 'after/' + row.file, row.bytes);
  const pending = { version: VERSION, at: new Date().toISOString(), active, actor: 'automated_agent:codex_pokemon_relationship_repair',
    human_signature: null, inputs: boundFiles, originalInventory, writes: writes.map(({ bytes, ...row }) => row),
    source_paths: { snapshotFile, receiptFile, reviewFile, originals: [...originals] },
    production_writes: 0, relationships_repaired: 0 };
  assert.deepEqual(inventory(active), originalInventory, 'master_changed_during_prepare');
  for (const row of boundFiles) assert.equal(fileHash(row.file), row.sha256, 'input_changed_during_prepare');
  save(out, 'pending.json', jsonBytes(pending));
  reconcileWorld2010Integration({ active, out });
  return pending;
}

export function reconcileWorld2010Integration({ active, out }) {
  const p = read(safeMasterPath(out, 'pending.json'));
  assert.equal(p.version, VERSION); assert.equal(path.resolve(active), p.active, 'journal_active_path_mismatch');
  assert.equal(p.human_signature, null); assert.equal(p.production_writes, 0);
  for (const row of p.inputs) assert.equal(fileHash(safeMasterPath(path.dirname(row.file), path.basename(row.file))), row.sha256, 'bound_input_changed');
  const baseline = Object.fromEntries(Object.entries(ARTIFACTS).map(([key, file]) => {
    const original = p.originalInventory.find(r => r.file === file); assert.ok(original);
    assert.equal(fileHash(safeMasterPath(out, 'baseline/' + file)), original.sha256, 'baseline_backup_changed');
    return [key, read(safeMasterPath(out, 'baseline/' + file))];
  }));
  const src = p.source_paths;
  assert.deepEqual([src.snapshotFile,src.receiptFile,src.reviewFile,...src.originals.map(([,f])=>f)].map(f=>path.resolve(f)), p.inputs.map(r=>path.resolve(r.file)), 'input_path_binding_changed');
  assertObservation(read(src.snapshotFile), read(src.receiptFile), src.snapshotFile);
  const replay = stageWorld2010Master({ baseline, snapshot: read(src.snapshotFile), review: read(src.reviewFile),
    originals: new Map(src.originals.map(([code,file]) => [code, fs.readFileSync(file)])) });
  const expected = [];
  for (const [key,file] of Object.entries(ARTIFACTS)) if (JSON.stringify(baseline[key]) !== JSON.stringify(replay.staged[key])) {
    const bytes = serializeLike(replay.staged[key], fs.readFileSync(safeMasterPath(out,'baseline/'+file)));
    expected.push({ file, before: p.originalInventory.find(r=>r.file===file).sha256, after:sha(bytes) });
  }
  for (const [file,bytes] of replay.evidence) expected.push({file,before:null,after:sha(bytes)});
  assert.deepEqual(p.writes, expected, 'journal_source_replay_mismatch');
  for (const row of p.writes) assert.equal(fileHash(safeMasterPath(out,'after/'+row.file)), row.after, 'frozen_after_changed');
  const current = inventory(active), map = new Map(current.map(r=>[r.file,r.sha256]));
  const allowed = new Set([...p.originalInventory.map(r=>r.file),...p.writes.map(r=>r.file)]);
  assert.ok(current.every(r=>allowed.has(r.file)), 'unexpected_master_file');
  for (const row of p.originalInventory.filter(r=>!p.writes.some(w=>w.file===r.file))) assert.equal(map.get(row.file),row.sha256,'protected_master_bytes_changed');
  const rows = p.writes.map(row => ({file:row.file,state:(map.get(row.file)??null)===row.after?'after':(map.get(row.file)??null)===row.before?'before':'unknown'}));
  assert.ok(rows.every(r=>r.state!=='unknown'), 'unknown_source_bytes_no_retry');
  return { version:VERSION, pending_sha256:fileHash(path.join(out,'pending.json')),
    status: rows.every(r=>r.state==='after')?'all_after':rows.every(r=>r.state==='before')?'all_before':'mixed_known', rows,
    prior_sets_preserved:replay.prior_sets_preserved, cards:replay.staged.cardsArtifact.cards.length,
    printings:replay.staged.printingsArtifact.printings.length, sets:replay.staged.setsArtifact.sets.length,
    held_identities:17, added_identities:92, public_shards:0, production_writes:0, relationships_repaired:0 };
}

export function applyWorld2010Integration({ active, out, recoveryReceipt = null }) {
  assert.ok(!fs.existsSync(safeMasterPath(out,'complete.json')), 'integration_already_complete');
  const lock = safeMasterPath(active,LOCK), fd = fs.openSync(lock,'wx');
  try {
    fs.writeFileSync(fd,jsonBytes({pid:process.pid,journal:path.resolve(out),at:new Date().toISOString()}));fs.fsyncSync(fd);
    const observed = reconcileWorld2010Integration({ active,out });
    if (observed.status !== 'all_before') {
      assert.ok(recoveryReceipt, 'independent_recovery_readback_required');
      assert.deepEqual(read(recoveryReceipt),observed,'fresh_exact_recovery_readback_required');
    } else assert.equal(recoveryReceipt,null,'recovery_not_required');
    const p=read(path.join(out,'pending.json'));
    for (const row of p.writes) {
      const target=safeMasterPath(active,row.file);
      if(fileHash(target)===row.after)continue;
      assert.equal(fileHash(target),row.before,'source_changed_before_write');
      const bytes=fs.readFileSync(safeMasterPath(out,'after/'+row.file));assert.equal(sha(bytes),row.after);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      // An exclusive adjacent temporary file and atomic rename avoid truncated
      // active files; a terminated process retains its own lock for investigation.
      const tmp=target+'.world2010-pending';assert.equal(fs.existsSync(tmp),false,'interrupted_temporary_file_requires_readback');
      const f=fs.openSync(tmp,'wx');try{fs.writeFileSync(f,bytes);fs.fsyncSync(f);}finally{fs.closeSync(f);}
      fs.renameSync(tmp,target);
    }
    const complete=reconcileWorld2010Integration({active,out});assert.equal(complete.status,'all_after');
    save(out,'complete.json',jsonBytes({...complete,at:new Date().toISOString(),status:'source_integrated_independently_replayed',release:false}));
    return complete;
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
