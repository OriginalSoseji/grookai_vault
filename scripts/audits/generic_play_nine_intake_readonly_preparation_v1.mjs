// Actual canonical-production preparation only. Database connection is enforced
// read-only; this entry point has no --apply switch or writer dispatch.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import pg from 'pg';
import {marketPipelineDatabaseConfigV1} from '../../backend/pricing/market_pipeline_database_config_v1.mjs';
import {readGenericPlayNineIntakeFrameV1,buildGenericPlayNineIntakePlanV1} from '../../backend/warehouse/generic_play_nine_intake_v1.mjs';
import {getSourceBackedIdentity,buildSourceBackedMetadataExtractionPackages,buildSourceBackedInterpreterPackage}
  from '../../backend/warehouse/source_identity_contract_v1.mjs';
import {auditWarehouseCandidateIdentitySlotV1} from '../../backend/identity/identity_slot_audit_v1.mjs';
import {buildPromotionWritePlanSnapshot} from '../../backend/warehouse/promotion_stage_worker_v1.mjs';
assert.equal(process.argv.length,3,'Expected one new output directory; no apply mode exists');
assert.ok(path.isAbsolute(process.argv[2])&&!process.argv[2].startsWith('--'),'Expected an absolute new output directory');
const out=path.resolve(process.argv[2]);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
assert.equal(process.env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co','canonical_project_required');
const client=new pg.Client({...marketPipelineDatabaseConfigV1(process.env.SUPABASE_DB_URL,process.env,
  {readOnly:true,applicationName:'generic_nine_intake_preparation_readonly'}),connectionTimeoutMillis:15000,
  statement_timeout:45000,query_timeout:50000});
const report={version:'GENERIC_PLAY_NINE_INTAKE_READONLY_PREPARATION_V1',startedAt:new Date().toISOString(),pass:false,
  productionWrites:0,canonicalExecution:false,founderApprovalGranted:false,warehouseUUIDsAssigned:false,
  fullCanonicalExecutorQualificationPending:true,previews:[],historicalOwnerNotesExported:false};
try {
  await client.connect();assert.equal(client.connection.stream.authorized,true,'verified_database_tls_required');
  assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
  await client.query('begin isolation level repeatable read read only');
  report.sanity=(await client.query(`select(select count(*)::int from public.card_prints) cards,
    (select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits,
    (select count(*)::int from public.v_vault_items) vault_items`)).rows[0];
  assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000,'canonical_maturity_required');
  const frame=await readGenericPlayNineIntakeFrameV1(client),plan=buildGenericPlayNineIntakePlanV1(frame);
  for(const bridge of plan.candidates) {
    const candidate={...bridge,id:bridge.planned_candidate_id,state:'RAW'},identity=getSourceBackedIdentity(candidate);
    const audit=await auditWarehouseCandidateIdentitySlotV1(client,{candidate,candidateVariantIdentity:bridge.variant_identity,sourceBackedIdentity:identity});
    const classification={proposed_action_type:audit.routing.proposed_action_type};
    const metadata=buildSourceBackedMetadataExtractionPackages({candidate});
    const interpreter=buildSourceBackedInterpreterPackage({candidate,classificationPackage:classification,identityAuditPackage:audit});
    const preview=await buildPromotionWritePlanSnapshot(client,{candidate,
      metadataExtraction:{normalized_metadata_package:metadata.normalizedPackage},interpreterPackage:interpreter,
      identityAuditPackage:audit,classificationPackage:classification});
    assert.equal(preview.status,'READY');assert.equal(preview.actions.card_prints.action,'CREATE');
    assert.equal(preview.actions.card_printings.action,'NONE');assert.equal(preview.actions.external_mappings.action,'NONE');
    report.previews.push({product:candidate.tcgplayer_id,status:preview.status,
      successorOf:candidate.reference_hints_payload.generic_play_nine_intake.successor_of,
      proposedNewParentAndRegistryNotExistingRecords:true,parentRegistryAdmission:preview.parent_registry_admission??null});
  }
  assert.equal(report.previews.length,9);await client.query('rollback');
  const bytes=gzipSync(Buffer.from(JSON.stringify(plan)));
  fs.writeFileSync(path.join(out,'plan.private.json.gz'),bytes,{flag:'wx'});
  report.planFingerprint=plan.fingerprint;report.compressedPlanSha256=createHash('sha256').update(bytes).digest('hex');
  report.historicalIntakeDigests=plan.historical_intakes;report.pass=true;
} catch(error) {
  await client.query('rollback').catch(()=>{});report.error={message:error.message,code:error.code};process.exitCode=1;
} finally {
  await client.end().catch(()=>{});report.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({pass:report.pass,productionWrites:0,readyPreviews:report.previews.length,
    planFingerprint:report.planFingerprint,error:report.error}));
}
