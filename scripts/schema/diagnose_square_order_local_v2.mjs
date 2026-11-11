// Local rollback diagnostic. Never retries a financial provider operation.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {squareOrderEvidence,squareEvidenceHash} from '../../backend/square/order_evidence_v2.mjs';
const lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const fixture=JSON.parse(fs.readFileSync(lab+'/runtime-fixture.private.json')),provider=JSON.parse(fs.readFileSync(lab+'/provider-fixture-state-v2.private.json'));
const order=Object.values(provider.orders).at(-1),payments=order.tenders.map(t=>provider.payments[t.id]);assert.ok(order);
const evidence=squareOrderEvidence(order,payments,{locationId:'runtime-location',mappedVariationIds:order.line_items.map(l=>l.catalog_object_id)});
const literal=value=>"'"+value.replaceAll("'","''")+"'";
const input=`begin;
do $proof$ declare c grookai_square.connections; lease uuid:=gen_random_uuid(); context jsonb;
begin
c:=jsonb_populate_record(null::grookai_square.connections,public.square_service_v1('claim',jsonb_build_object('ownerId','${fixture.owner.id}','connectionId','${fixture.connectionId}','leaseToken',lease)));
context:=jsonb_build_object('ownerId',c.owner_id,'connectionId',c.id,'leaseToken',lease,'fence',c.lease_fence);
perform public.square_commerce_service_v2('order_observe',context||jsonb_build_object('evidence',${literal(JSON.stringify(evidence))}::jsonb,'evidenceHash','${squareEvidenceHash(evidence)}'));
end $proof$;
rollback;`;
const result=spawnSync('docker',['exec','-i','supabase_db_square-fresh-483-20261110','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true});
fs.writeFileSync(lab+'/order-diagnostic-'+Date.now()+'.log',(result.stdout??'')+'\n'+(result.stderr??''),{flag:'wx'});
console.log((result.stderr??'').slice(-6000));process.exitCode=result.status;
