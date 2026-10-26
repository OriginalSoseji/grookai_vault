import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PRICING_COMPLETION_OPERATOR_CA_SHA256_V1,PRICING_COMPLETION_OPERATOR_SCOPE_V2} from '../../backend/pricing/pricing_completion_operator_readback_v1.mjs';
export const FEED_COLLECTOR_SHA='c'.repeat(64),FEED_SQL_SHA='d'.repeat(64);
export const feedSha=b=>createHash('sha256').update(b).digest('hex');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const iso=t=>new Date(t).toISOString();
export function feedCaptureFixtureV1(now,{seed=1,missing=true}={}){
  const run=uuid(seed),sync=uuid(seed+100),pub=uuid(seed+200),rows=missing?[{decision_id:uuid(seed+300),run_id:run,decision:'quarantine',primary_reason:'missing_active_source_mapping',
    source_observation_id:uuid(seed+400),source_product_id:1000+seed,source_subtype_name:'Holofoil',currency:'USD',source_row_hash:'a'.repeat(64),source_artifact_hash:'b'.repeat(64),
    source_price_row_identity:`${1000+seed}-Holofoil`,source_sync_run_id:sync,card_print_id:null,card_printing_id:null,market_price:'4.20',category_id:3,group_id:42,
    source_product_name:'Synthetic fixture',source_group_name:'Synthetic group',product_scope_result:'in_scope',source_observation_present:true,source_product_present:true,
    observed_product_id:1000+seed,observed_subtype_name:'Holofoil',observed_price_row_identity:`${1000+seed}-Holofoil`,observed_currency:'USD',observed_payload_hash:'a'.repeat(64)}]:[];
  const counts={selected_count:1+rows.length,eligible_count:1,publish_count:1,snapshot_count:1,excluded_count:0,quarantined_count:rows.length,delayed_count:0,suppressed_count:0,unresolved_count:rows.length};
  const ledger={...counts};delete ledger.publish_count;delete ledger.unresolved_count;
  return {version:'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V2',projectRef:'ycdxbpibncqcchqiihfz',verifiedTls:true,readOnly:true,rollbackAcknowledged:true,sqlSha256:FEED_SQL_SHA,
    caSha256:PRICING_COMPLETION_OPERATOR_CA_SHA256_V1,capturedAt:iso(now-3000),sourceRunId:run,publicationSetId:pub,scope:PRICING_COMPLETION_OPERATOR_SCOPE_V2,masterCoverage:'unknown',databaseWrites:0,
    records:[{kind:'environment',read_only:'on',isolation:'repeatable read',database:'postgres',captured_at:iso(now-4000),server_version:'17.4',cards:50000,sets:200,traits:6000,migrations:444,latest_migration:'20261012013000'},
      {kind:'source_run',rows:[{id:run,run_key:'synthetic-fixture',source_sync_run_id:sync,publication_set_id:pub,run_mode:'production',state:'verified',reconciliation_state:'reconciled',publication_state:'published',
        ...ledger,source_finished_at:iso(now-10000),completed_at:iso(now-8000),source_status:'completed',sync_mode:'current_full_sync',source_failed_count:0}]},
      {kind:'source_counts',rows:[counts]},{kind:'source_rows',rows},{kind:'current_publication',rows:[{run_id:run,publication_set_id:pub,publication_state:'published',state:'verified',reconciliation_state:'reconciled'}]},
      {kind:'transaction_end',status:'ROLLBACK',read_only_after:'on',isolation_after:'read committed'}]};
}
export function publishFeedFixtureV1(root,capture,now){
  fs.mkdirSync(root,{recursive:true});const bytes=Buffer.from(JSON.stringify(capture)+'\n'),generationId=feedSha(bytes),directory=path.join(root,'generations',generationId);fs.mkdirSync(directory,{recursive:true});
  const source=capture.records.find(r=>r.kind==='source_run').rows[0];
  const manifest={version:'PRICING_SOURCE_FEED_GENERATION_V1',generationId,captureFile:'capture.json',captureSha256:generationId,captureBytes:bytes.length,collectorSha256:FEED_COLLECTOR_SHA,
    sqlSha256:FEED_SQL_SHA,projectRef:capture.projectRef,sourceRunId:source.id,publicationSetId:source.publication_set_id,sourceSyncRunId:source.source_sync_run_id,
    capturedAt:capture.capturedAt,publishedAt:iso(now-2000),sourceFinishedAt:iso(Date.parse(source.source_finished_at))};
  const manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n');const latest={version:'PRICING_SOURCE_FEED_LATEST_V1',generationId,generationPath:`generations/${generationId}`,captureSha256:generationId,manifestSha256:feedSha(manifestBytes),publishedAt:manifest.publishedAt};
  const status={version:'PRICING_SOURCE_FEED_STATUS_V1',state:'published',attemptedAt:iso(now-1000),generationId,errorCode:null};
  fs.writeFileSync(path.join(directory,'capture.json'),bytes);fs.writeFileSync(path.join(directory,'manifest.json'),manifestBytes);
  fs.writeFileSync(path.join(root,'latest.json'),JSON.stringify(latest));fs.writeFileSync(path.join(root,'status.json'),JSON.stringify(status));
  return {generationId,directory,manifest,latest,status};
}
