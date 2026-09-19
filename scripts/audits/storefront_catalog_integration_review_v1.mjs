// Read-only LOCAL comparison with preserved catalog schema evidence. No repair execution.
import '../tests/vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {isDeepStrictEqual} from 'node:util';
import {readExecutionSchema} from '../../backend/catalog/master_index_printing_execution_v1.mjs';
import {guard} from '../schema/storefront_release_guard_v1.mjs';
import {root} from '../schema/storefront_release_schema_v1.mjs';
import {sha256} from '../schema/column_order_reconciliation_v1.mjs';

assert.equal(process.argv.length,2);guard({full:true});
const evidence='C:/grookai_vault_operator_artifacts/retrospective_printing_audit_20260917';
const provenanceFile=path.join(evidence,'english-provenance-schema-v7.json');
const coordinateFile=path.join(evidence,'wcd-coordinate-parent-schema-v1.sql');
const coordinatePlanFile=path.join(evidence,'wcd-coordinate-recent28-plan-v1.json');
const provenance=JSON.parse(fs.readFileSync(provenanceFile));
const coordinatePlan=JSON.parse(fs.readFileSync(coordinatePlanFile));
const coordinateSql=fs.readFileSync(coordinateFile,'utf8');
assert.match(coordinateSql,/^select\s/i);assert.ok(!/\b(insert|update|delete|alter|drop|create)\s+(table|into|from)\b/i.test(coordinateSql));
const client=new pg.Client({host:'127.0.0.1',port:16822,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:20000});
const report={checkedAt:new Date().toISOString(),productionAccess:false,repairExecution:false,evidenceHashes:Object.fromEntries([provenanceFile,coordinateFile,coordinatePlanFile].map(f=>[f,sha256(fs.readFileSync(f))]))};
try{
  await client.connect();await client.query('begin isolation level repeatable read read only');
  assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only,'on');
  const schema=await readExecutionSchema(client);assert.deepEqual(schema,provenance,'printing executor schema differs from preserved provenance evidence');
  report.printingSchema={exactFrozenMatch:true,sha256:sha256(JSON.stringify(schema)),tables:['card_printings','card_printing_truth_reviews','raw_imports'],publicPrintingRpcUnchanged:true};
  const coordinate=(await client.query(coordinateSql)).rows[0];
  report.coordinateSchema={exactFrozenMatch:isDeepStrictEqual(coordinate,coordinatePlan.schema)};
  const normalized=s=>({...s,columns:s.columns.map(({ordinal_position,...c})=>c).sort((a,b)=>(a.table_name+'.'+a.column_name).localeCompare(b.table_name+'.'+b.column_name))});
  assert.deepEqual(normalized(coordinate),normalized(coordinatePlan.schema),'coordinate schema has changes beyond physical column order');
  report.coordinateSchema.definitionsMatch=true;
  report.coordinateSchema.note='Local replay retains the known card_prints column order difference; this diagnostic never refreezes or authorizes a repair plan.';
  const fks=(await client.query("select conrelid::regclass::text source,confrelid::regclass::text target,conname name,pg_get_constraintdef(oid) definition from pg_constraint where contype='f' and conrelid in ('public.vendor_store_items'::regclass,'public.vendor_store_sections'::regclass) order by conname")).rows;
  report.storeForeignKeys=fks;
  report.affectedSharedTargets=fks.filter(r=>!r.target.startsWith('vendor_')).map(r=>r.target);
  assert.deepEqual(report.affectedSharedTargets.sort(),['vault_item_instances','wall_sections']);
  report.entitlementTriggers=(await client.query("select tgname name,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid='public.user_entitlements'::regclass and tgname like 'vendor_store%' order by tgname")).rows;
  report.releaseBoundary='No change to the inspected printing/coordinate definitions. Broader dependency inventories must account for the new Vault/Wall foreign keys and entitlement triggers. Never reuse a frozen repair plan without its own fresh preflight.';
  report.status='passed';
}finally{await client.query('rollback').catch(()=>{});await client.end();}
const out=path.join(root,'docs/audits/vendor_storefront_integration_review_v1');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'catalog-dependencies.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,printingSchemaExact:report.printingSchema.exactFrozenMatch,coordinateDefinitionsMatch:report.coordinateSchema.definitionsMatch,coordinateRawExact:report.coordinateSchema.exactFrozenMatch,productionAccess:false}));
