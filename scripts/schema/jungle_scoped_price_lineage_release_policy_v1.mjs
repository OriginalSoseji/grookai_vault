import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const VERSION='JUNGLE_SCOPED_PRICE_LINEAGE_RECOVERY_RELEASE_V1';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const BASE='C:/grookai_vault_operator_artifacts/pricing_stamp_bulk_completion_20261125/jungle-scoped-validation-recovery-proposal-v1';
export const REVIEW='e9d96dc6c133db707064c820bc0cefb61409409ff4def3b4a43fada7f8ab63f7';
export const OWNER_SHA='397c1c90fb2e9b533898c943ac1138d6c60db94bc76b59a961ff1558f98ec1a4';
export const CANDIDATE='20261126193000_jungle_scoped_price_lineage_recovery_v1.sql';
export const SQL_SHA='d9a47669b66d38d34df9735e3bb92a4dd86b1115f89d357af1d39ac65e131c81';
export const BEFORE_SHA='ad5944dc5104169fda71b5bfbde15c8c36b64d22b6a1b23c64e524d66826fda5';
export const AFTER_SHA='78ae38b7cd79b44ae65a75d320f723f5d8bc6501eabc79c0f3159afaddfd45ea';
export const HISTORY_SHA='ec79ca6faa08405d4a0d4199337dcd333a8259c3f692454485c517b5b6ccf8b6';
export const ORIGINAL_GATE_SHA='1022d252c5a922967d7fada7c46f5f11c164b04f89891790b45cbede55eda858';
export const SCHEMAS=['public','grookai_square','grookai_inventory','grookai_vendor_pricing'];
export const REQUIRED_CHECKS=['drift-gate','runtime-protection','binder-rollout-windows','scan','Analyze (actions)','Analyze (c-cpp)','Analyze (javascript-typescript)','Analyze (python)','Analyze (ruby)'];
export const sha256=value=>createHash('sha256').update(value).digest('hex');

export function validateInvocation(args){
 assert.equal(args.length,2,'only_phase_and_bounded_output_allowed');
 assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]),'wrong_phase');
 assert.match(args[1],new RegExp('^--out-dir='+BASE.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/release-gate-v1-[a-z0-9-]{1,60}$'),'bounded_new_output_required');
 return{phase:args[0],out:args[1].slice(10)};
}
export function validateInventory(history,actual){
 assert.equal(Object.keys(history).length,524,'exact524_history_required');
 assert.equal(sha256(JSON.stringify(history)),HISTORY_SHA,'history_changed');
 assert.deepEqual(actual,{...history,[CANDIDATE]:SQL_SHA},'only_reviewed_candidate_allowed');
 const ids=Object.keys(actual).map(n=>n.match(/^\d+/)?.[0]);
 assert.equal(new Set(ids).size,525,'duplicate_migration_id');
}
export function validateLedger(rows,history){
 assert.deepEqual(rows.map(x=>typeof x==='string'?x:x.version),Object.keys(history).sort().map(n=>n.match(/^\d+/)[0]),'exact_current524_ledger_required');
}
export function validateOwner(owner,bytesHash,now=Date.now()){
 assert.equal(bytesHash,OWNER_SHA,'actual_owner_record_changed');
 assert.equal(owner.actualOwnerDecision,true,'actual_owner_decision_required');
 assert.equal(owner.reviewFingerprint,REVIEW,'wrong_review');
 assert.equal(owner.exactSqlSha256,SQL_SHA,'wrong_sql_authority');
 assert.equal(owner.allowNewNamedFailClosedExact524To525Scope,true,'scope_not_approved');
 assert.equal(owner.allowPinnedOneFunctionApplicationOnlyAfterRequiredGates,true,'sql_not_approved');
 assert.equal(owner.guardsWaived,false,'guards_must_remain');
 assert.equal(owner.sourceQuoteRefreshAuthorized,false,'source_refresh_not_in_scope');
 assert.equal(owner.maximumAdditionalRecoveryDispatches,1,'recovery_scope_changed');
 assert.ok(Date.parse(owner.approvedAt)<=now&&now<Date.parse(owner.expiresAt),'owner_clock_expired_or_future');
}
export function validateOriginalGate(source){
 let value=source;
 for(const name of['PARAMETER','HANDLER']){
  const expression=new RegExp('^[ \\t]*# BEGIN JUNGLE_SCOPED_PRICE_LINEAGE_V1 '+name+'\\r?\\n[\\s\\S]*?^[ \\t]*# END JUNGLE_SCOPED_PRICE_LINEAGE_V1 '+name+'\\r?\\n','gm');
  assert.equal([...value.matchAll(expression)].length,1,'missing_or_duplicate_original_gate_boundary');
  value=value.replace(expression,'');
 }
 assert.equal(sha256(value),ORIGINAL_GATE_SHA,'default_or_earlier_named_gate_changed');
}
export function validateEnvironment(env){
 for(const name of Object.keys(env))if(/^(?:PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD|PGOPTIONS|DATABASE_URL|POSTGRES_URL|NODE_TLS_REJECT_UNAUTHORIZED)$/.test(name))assert.equal(env[name],undefined,'unreviewed_environment_override:'+name);
 assert.equal(env.GROOKAI_PREFLIGHT_ACK,undefined,'audit_requires_no_ack');
}
export function validateRoute(env){
 assert.equal(env.SUPABASE_URL,'https://'+PROJECT+'.supabase.co','wrong_project');
 const u=new URL(env.SUPABASE_DB_URL);assert.ok(['postgres:','postgresql:'].includes(u.protocol));
 assert.equal(u.hostname,'db.'+PROJECT+'.supabase.co','canonical_direct_route_required');
 assert.equal(u.pathname,'/postgres','wrong_database');assert.ok(u.password,'managed_credential_missing');return u;
}
export function validateSession(row,tls){
 assert.equal(tls,true,'verified_tls_required');assert.equal(row.database,'postgres','wrong_database');
 assert.equal(row.read_only,'on','read_only_transaction_required');assert.equal(row.default_read_only,'on','server_default_read_only_required');
}
export function validateLab(db,network,binding){
 assert.equal(db.Id,binding.id,'different_owned_lab');assert.equal(db.Image,binding.image,'different_owned_image');
 assert.equal(db.Created,binding.created,'different_owned_creation');assert.equal(db.State.Running,true,'owned_lab_not_running');
 assert.deepEqual(Object.keys(db.NetworkSettings.Networks),binding.networks,'wrong_owned_network');
 assert.equal(network.Internal,true,'owned_network_not_internal');
 assert.equal(network.Labels['grookai.jungle-lineage.owner'],binding.project,'wrong_owned_label');
 assert.deepEqual(db.Mounts.map(m=>({type:m.Type,name:m.Name??null,source:m.Source,destination:m.Destination})),binding.mounts,'owned_mounts_changed');
 for(const ports of Object.values(db.NetworkSettings.Ports??{}))for(const port of ports??[])assert.equal(port.HostIp,'127.0.0.1','non_loopback_owned_port');
}
export function validateOwnedState(state,history){
 assert.equal(state.users,0);assert.equal(state.copies,0);assert.equal(state.cards,1316);assert.equal(state.workers,'0');
 assert.deepEqual(state.ledger,Object.keys({...history,[CANDIDATE]:SQL_SHA}).sort().map(n=>n.match(/^\d+/)[0]));
}
const target=security=>security.objects.filter(x=>x.kind==='function'&&x.schema==='public'&&x.name==='jungle_edition_price_row_restricted_valid_v1(row_data jsonb)');
export function requireExactSecurityDelta(before,after){
 assert.equal(target(before).length,1);assert.equal(target(after).length,1);
 assert.equal(sha256(target(before)[0].facts.definition),BEFORE_SHA,'unexpected_original_function');
 assert.equal(sha256(target(after)[0].facts.definition),AFTER_SHA,'unexpected_corrected_function');
 const expected=structuredClone(before);target(expected)[0].facts.definition=target(after)[0].facts.definition;
 assert.deepEqual(after,expected,'security_or_other_definition_changed');
}
export function requireEmptyDiffs(diffs){
 assert.deepEqual(Object.keys(diffs).sort(),[...SCHEMAS].sort(),'four_schema_scope_required');
 for(const [schema,sql]of Object.entries(diffs))assert.equal(sql.trim(),'','unexpected_schema_difference:'+schema);
}
export function validateNormal(proof,head,tree,hookHashes){
 assert.equal(proof.state,'passed');assert.equal(proof.exitCode,0);assert.equal(proof.finalHead,head);assert.equal(proof.finalTree,tree);
 assert.equal(proof.productionDatabaseStartupReadOnly,true);assert.equal(proof.verifiedDatabaseTls,true);
 assert.equal(proof.steps.length,2);assert.ok(proof.steps.every(s=>s.exitCode===0));assert.deepEqual(proof.hookHashes,hookHashes);
}
export function validateHosted(proof,head){
 assert.equal(proof.source,head,'hosted_wrong_source');assert.equal(proof.pass,true,'hosted_not_passed');
 assert.deepEqual(proof.requiredNames,REQUIRED_CHECKS,'required_checks_changed');
 assert.deepEqual(proof.missing,[]);assert.deepEqual(proof.pending,[]);assert.deepEqual(proof.failures,[]);
 for(const name of REQUIRED_CHECKS){const matches=proof.checks.filter(c=>c.name===name);assert.ok(matches.length>0,'missing_required_check:'+name);assert.ok(matches.every(c=>c.head_sha===head&&c.status==='completed'&&c.conclusion==='success'),'required_check_not_success:'+name);}
}
