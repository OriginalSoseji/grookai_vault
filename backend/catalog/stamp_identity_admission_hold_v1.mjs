import assert from 'node:assert/strict';
import index from '../../docs/catalog/stamp_identity_admission_hold_v1/index.json' with {type:'json'};
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';

export const VERSION='STAMP_IDENTITY_ADMISSION_HOLD_V1';
export const MANIFEST='1c088dd83c399900a1526037f270dd47547bf3ce7c2da17b57b22ea491b80c92';
const {fingerprint,...body}=index;
assert.equal(fingerprint,MANIFEST);assert.equal(hash(body),MANIFEST);
assert.equal(index.version,VERSION);assert.equal(index.project_ref,'ycdxbpibncqcchqiihfz');
assert.equal(index.identity_equivalence_adjudicated,false);assert.equal(index.alias_authority,false);assert.equal(index.production_authority,false);
assert.equal(index.candidate_pairs.length,149);
assert.equal(new Set(index.candidate_pairs.flatMap(p=>[p.play.id,p.prize.id])).size,298);
assert.equal(index.held_scopes.canonical28.length,28);assert.equal(index.held_scopes.canonical4.length,4);
const held=[...index.held_scopes.canonical28,...index.held_scopes.canonical4];
assert.equal(new Set(held).size,32);assert.ok(held.every(id=>index.candidate_pairs.some(p=>p.play.id===id)));
const scopes=Object.freeze({canonical28:'canonical28',canonical4:'canonical4',mapping28:'canonical28',mapping4:'canonical4'});

// This is a production admission stop, not a canonical alias table. Historical
// local qualification and read-only receipt inspection remain available. There
// is no flag, timestamp, owner-file edit or approval token that clears this code.
export function assertStampIdentityProductionAdmissionV1(scope,{mode}={}){
 assert.ok(Object.hasOwn(scopes,scope),'Unknown stamp identity admission scope');
 assert.ok(['prepare','preflight','rollback','apply','readback'].includes(mode),'Unknown stamp admission mode');
 const proof={version:VERSION,manifest_fingerprint:MANIFEST,scope,held_parent_count:index.held_scopes[scopes[scope]].length,identity_equivalence_adjudicated:false,execution_authority:false};
 if(mode==='readback')return {...proof,read_only_receipt_inspection:true};
 const error=new Error('Stamp identity admission is held: reconcile existing Play! Pokemon / Prize Pack parents before preparing or executing this '+proof.held_parent_count+'-parent programme.');
 error.code=VERSION;throw error;
}
