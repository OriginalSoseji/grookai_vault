// Bounded source intake preparation. This module cannot upload, approve, stage or promote images.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {MANIFEST as identityHoldFingerprint} from '../catalog/stamp_identity_admission_hold_v1.mjs';

export const VERSION = 'STAMPED_CHILD_IMAGE_INTAKE_V1';
export const PROJECT = 'ycdxbpibncqcchqiihfz';
export const MANIFEST = 'efb019b66f7e1d706b462294092f8b0012ef5379e557ff24fb16eeb84fb5d92f';
export const BUCKET = 'user-card-images';
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {if (value && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const same = (actual, expected, message) => assert.equal(hash(actual), hash(expected), message);
const indexBytes = fs.readFileSync(new URL('../../docs/catalog/stamped_child_image_intake_v1/index.json', import.meta.url));
const index = JSON.parse(indexBytes);
const holds = JSON.parse(fs.readFileSync(new URL('../../docs/catalog/stamp_identity_admission_hold_v1/index.json', import.meta.url)));
assert.equal(holds.fingerprint, identityHoldFingerprint);
const heldParents = new Set(holds.candidate_pairs.flatMap(pair => [pair.play.id, pair.prize.id]));
assert.equal(heldParents.size, 298);
const {fingerprint, ...manifestBody} = index;
assert.equal(hash(manifestBody), MANIFEST);
assert.equal(fingerprint, MANIFEST);
assert.equal(index.version, VERSION);
assert.equal(index.projectRef, PROJECT);
assert.equal(index.bucket, BUCKET);
assert.equal(index.targetCount, 33);
assert.equal(index.targets.length, 33);
for (const key of ['parentId', 'printingId', 'originalSha256']) assert.equal(new Set(index.targets.map(row => row[key])).size, 33, key);
for (const target of index.targets) {
  assert.ok(uuid(target.parentId) && uuid(target.printingId));
  assert.ok(!heldParents.has(target.parentId), 'Held parent is outside image intake');
  assert.equal(target.finishKey, 'reverse');
  assert.equal(target.mimeType, 'image/jpeg');
  assert.match(target.originalSha256, /^[a-f0-9]{64}$/);
  assert.ok(['source_page', 'source_api'].includes(target.sourceContext.kind));
  assert.match(target.sourceContext.responseSha256, /^[a-f0-9]{64}$/);
  if (target.sourceContext.kind === 'source_api') {
    assert.match(target.sourceContext.archiveSha256, /^[a-f0-9]{64}$/);
    assert.match(target.sourceContext.postSha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(target.sourceContext.sourcePostId));
  }
  for (const [key, hosts] of [['sourcePage', index.sourcePageHosts], ['sourceImage', index.sourceImageHosts]]) {
    const url = new URL(target[key]);
    assert.equal(url.protocol, 'https:');
    assert.ok(!url.username && !url.password && !url.hash);
    assert.ok(hosts.includes(url.hostname));
  }
}
export const stampedChildImageManifestV1 = freeze(index);

function namedUuid(name) {
  const bytes = createHash('sha1').update(Buffer.from('138a46e46e9644a591d62f3f66acc723', 'hex')).update(name).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function stampedChildImageIntakeKeysV1(target) {
  const pinned = index.targets.find(row => row.printingId === target.printingId);
  same(target, pinned, 'Only a complete pinned image target may enter intake');
  const key = `${VERSION}:${MANIFEST}:${target.printingId}:${target.originalSha256}`;
  const candidateId = namedUuid(key);
  return freeze({candidateId, evidenceId: namedUuid(key + ':front'), eventId: namedUuid(key + ':source-submitted'),
    rawId: String(-1n - BigInt('0x' + digest(key).slice(0, 15))),
    storagePath: `warehouse-evidence/stamped-child-image-intake-v1/${target.printingId}/${target.originalSha256}.jpg`});
}

export function assertStampedImageOriginalV1(target, bytes) {
  stampedChildImageIntakeKeysV1(target);
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(bytes.length, target.bytes, 'Original image byte length changed');
  assert.equal(digest(bytes), target.originalSha256, 'Original image bytes changed');
  return true;
}

function assertSourceContext(target, context) {
  assert.equal(context?.kind, target.sourceContext.kind, 'Wrong retained source context');
  if (context.kind === 'source_page') {
    assert.deepEqual(Object.keys(context).sort(), ['bodyBase64', 'kind']);
    const bytes = Buffer.from(context.bodyBase64, 'base64');
    assert.equal(bytes.toString('base64'), context.bodyBase64, 'Noncanonical source page encoding');
    assert.equal(digest(bytes), target.sourceContext.responseSha256, 'Captured source page changed');
  } else {
    assert.deepEqual(Object.keys(context).sort(), ['kind', 'post']);
    assert.equal(context.post.id, target.sourceContext.sourcePostId);
    assert.equal(context.post.link, target.sourcePage);
    assert.equal(hash(context.post), target.sourceContext.postSha256, 'Complete source post changed');
    assert.ok(JSON.stringify(context.post).includes(new URL(target.sourceImage).pathname), 'Captured source image path changed');
  }
}

export function readStampedImageSourceContextV1(target, bytes) {
  stampedChildImageIntakeKeysV1(target);
  assert.ok(Buffer.isBuffer(bytes));
  let context;
  if (target.sourceContext.kind === 'source_page') {
    assert.equal(digest(bytes), target.sourceContext.responseSha256);
    context = {kind:'source_page', bodyBase64:bytes.toString('base64')};
  } else {
    assert.equal(digest(bytes), target.sourceContext.archiveSha256, 'Source archive changed');
    const plain = gunzipSync(bytes);
    assert.equal(digest(plain), target.sourceContext.responseSha256, 'Original API response changed');
    const posts = JSON.parse(plain);
    assert.ok(Array.isArray(posts));
    const matching = posts.filter(post => post.id === target.sourceContext.sourcePostId);
    assert.equal(matching.length, 1, 'Source post must resolve uniquely');
    context = {kind:'source_api', post:matching[0]};
  }
  assertSourceContext(target, context);
  return freeze(context);
}

export function assertStampedImageActorV1(actor) {
  assert.ok(uuid(actor?.userId), 'A real, verified founder identity is required');
  assert.equal(actor.authUserId, actor.userId, 'Founder must exist in auth.users');
  assert.equal(actor.role, 'founder');
  assert.equal(actor.isActive, true);
  assert.match(actor.entitlementFingerprint ?? '', /^[a-f0-9]{64}$/);
  return true;
}

export function assertStampedChildImageTargetsV1(before) {
  for (const key of ['parents', 'children', 'identities']) assert.ok(Array.isArray(before[key]), key);
  assert.equal(before.parents.length, 33);
  assert.equal(before.children.length, 33);
  for (const key of ['parents', 'children', 'identities']) assert.equal(new Set(before[key].map(row => row.id)).size, before[key].length, 'Duplicate ' + key);
  assert.equal(before.identities.length, 33);
  for (const target of index.targets) {
    const parent = before.parents.find(row => row.id === target.parentId);
    const child = before.children.find(row => row.id === target.printingId);
    assert.ok(parent && child, 'Existing parent and printing must resolve');
    for (const [key, expected] of Object.entries({gv_id:target.parentGvId,name:target.printedName,number:target.printedNumber,number_plain:target.numberPlain,set_code:target.setCode,variant_key:target.variantKey})) same(parent[key], expected, 'Parent identity changed: ' + key);
    assert.equal(child.card_print_id, parent.id);
    assert.equal(child.printing_gv_id, target.printingGvId);
    assert.equal(child.finish_key, target.finishKey);
    assert.equal(child.is_provisional, false);
    for (const key of ['image_source', 'image_path', 'image_url', 'image_alt_url']) assert.equal(child[key] ?? null, null, 'Image target already populated: ' + key);
    const active = before.identities.filter(row => row.card_print_id === parent.id && row.is_active);
    assert.equal(active.length, 1);
    assert.equal(active[0].identity_domain, 'pokemon_eng_standard');
  }
  for (const key of ['existingCandidates', 'existingRawReceipts', 'existingEvidence', 'existingEvents', 'existingObjects']) {
    assert.ok(Array.isArray(before[key]), 'An explicit existing-state observation is required: ' + key);
    assert.equal(before[key].length, 0, 'Existing source intake requires diagnosis: ' + key);
  }
  assert.deepEqual(before.bucket, {id:BUCKET,public:false}, 'Raw images require the existing private bucket');
  return true;
}

export function buildStampedChildImageIntakePlanV1({before, actor, sourceContexts, proposedRuns, codeFingerprint, observedAt}) {
  assertStampedImageActorV1(actor);
  assertStampedChildImageTargetsV1(before);
  assert.match(codeFingerprint ?? '', /^[a-f0-9]{64}$/);
  assert.ok(Number.isFinite(Date.parse(observedAt)), 'Observation time is required');
  assert.ok(Array.isArray(proposedRuns));
  assert.deepEqual(proposedRuns.map(run=>run.mode), ['stage_raw','rollback','apply','replay']);
  assert.equal(new Set(proposedRuns.map(run=>run.runId)).size,4);
  for(const run of proposedRuns){assert.deepEqual(Object.keys(run).sort(),['mode','runId']);assert.ok(uuid(run.runId));}
  const runs=clone(proposedRuns),inputFingerprint=hash({manifestFingerprint:MANIFEST,codeFingerprint,observedAt,actor,before,proposedRuns:runs});
  assert.deepEqual(Object.keys(sourceContexts).sort(), index.targets.map(target => target.printingId).sort());
  const contexts = clone(sourceContexts);
  for (const target of index.targets) assertSourceContext(target, contexts[target.printingId]);
  const rows = index.targets.map(target => {
    const keys = stampedChildImageIntakeKeysV1(target);
    const provenance = {programme:VERSION,manifestFingerprint:MANIFEST,inputFingerprint,plannedApplyRunId:runs.find(run=>run.mode==='apply').runId,sourcePage:target.sourcePage,sourceContext:target.sourceContext,sourceImage:target.sourceImage,retrievedAt:target.retrievedAt,originalSha256:target.originalSha256};
    const evidence = {bucket:BUCKET,path:keys.storagePath,sha256:target.originalSha256,bytes:target.bytes,mimeType:target.mimeType,width:target.width,height:target.height};
    return {keys, raw:{id:keys.rawId,source:index.rawSource,payload:{_kind:index.rawKind,_external_id:target.sourceImage,provenance,original_image:evidence,source_context:contexts[target.printingId]}},
      candidate:{id:keys.candidateId,submitted_by_user_id:actor.userId,intake_channel:'MANUAL',submission_type:VERSION,submission_intent:'MISSING_IMAGE',state:'RAW',
        notes:`Delegated source evidence intake for the existing ${target.printedName} ${target.printedNumber} stamped Reverse Holo printing. Request child-image review only; preserve the parent image, identity, finish, reviews and ownership. Source: ${target.sourcePage}`,
        claimed_identity_payload:{name:target.printedName,printed_number:target.printedNumber,number_plain:target.numberPlain,set_code:target.setCode,variant_key:target.variantKey},
        reference_hints_payload:{card_gv_id:target.parentGvId,printing_reference:target.printingId,finish_label:'Reverse Holo',requested_action:'ENRICH_CARD_PRINTING_IMAGE',raw_import_id:keys.rawId,source_intake:provenance}},
      evidence:{id:keys.evidenceId,candidate_id:keys.candidateId,evidence_kind:'IMAGE',evidence_slot:'front',storage_path:keys.storagePath,created_by_user_id:actor.userId,metadata_payload:{...provenance,original_image:evidence}},
      event:{id:keys.eventId,candidate_id:keys.candidateId,event_type:'STAMPED_CHILD_IMAGE_SOURCE_SUBMITTED_V1',action:'SOURCE_INTAKE',previous_state:null,next_state:'RAW',actor_user_id:actor.userId,actor_type:'SYSTEM',metadata:{...provenance,raw_import_id:keys.rawId,delegated_source_intake:true,founder_approval_granted:false}}};
  });
  const body = {version:VERSION,projectRef:PROJECT,manifestFingerprint:MANIFEST,codeFingerprint,observedAt,inputFingerprint,proposedRuns:runs,actor:clone(actor),before:clone(before),sourceContexts:contexts,rows,
    proposedEffects:{rawImports:33,warehouseCandidates:33,warehouseEvidence:33,warehouseEvents:33,immutableRawImageObjects:33,failureLedgerRowsMaximum:4,updates:0,deletes:0,canonicalImageWrites:0,parentWrites:0,printingWrites:0,identityWrites:0,reviewWrites:0,ownerWrites:0,mappingWrites:0,priceWrites:0,schemaWrites:0},
    founderApproved:false,productionAuthority:false,executionReady:false};
  return freeze({...body,fingerprint:hash(body)});
}

export function assertStampedChildImagePlanV1(plan) {
  const {fingerprint, ...body} = plan;
  assert.equal(hash(body), fingerprint, 'Intake plan changed');
  assert.equal(plan.version, VERSION);
  assert.equal(plan.manifestFingerprint, MANIFEST);
  assert.equal(plan.projectRef, PROJECT);
  const expected = buildStampedChildImageIntakePlanV1({before:plan.before,actor:plan.actor,sourceContexts:plan.sourceContexts,proposedRuns:plan.proposedRuns,codeFingerprint:plan.codeFingerprint,observedAt:plan.observedAt});
  same(plan, expected, 'Plan fields exceed the pinned raw-intake scope');
  return true;
}
