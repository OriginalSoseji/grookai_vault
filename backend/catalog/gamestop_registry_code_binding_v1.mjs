import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
import{printingManifestHash as hash}from'./printing_completeness_gate_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function gameStopRegistryCodeBindingV1(){
 const files=['backend/identity/gamestop_registry_fifteen_repair_v1.mjs','backend/identity/identity_maintenance_boundary_v1.mjs','backend/identity/run_identity_maintenance_v1.mjs','backend/env.mjs',
  'backend/catalog/gamestop_registry_code_binding_v1.mjs','backend/catalog/gamestop_registry_fifteen_v1.mjs','backend/catalog/gamestop_registry_run_records_v1.mjs','backend/catalog/gamestop_registry_release_guard_v1.mjs','backend/catalog/printing_completeness_gate_v1.mjs',
  'backend/pricing/market_pipeline_database_config_v1.mjs','backend/pricing/condition_reference_database_config_v1.mjs','backend/pricing/market_scheduler_session_v1.mjs',
  'docs/catalog/gamestop_registry_fifteen_v1/index.json','docs/catalog/gamestop_registry_fifteen_v1/run_record_schema.json','docs/catalog/stamp_identity_admission_hold_v1/index.json',
  'AGENTS.md','docs/GROOKAI_RULEBOOK.md','docs/CONTRACT_INDEX.md','docs/contracts/GV_SECRETS_CONTRACT_v1.md','docs/contracts/PRINTED_IDENTITY_MODEL_V1.md',
  'docs/contracts/CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md','docs/contracts/RUNTIME_WRITE_PATH_AUDIT_V1.md','docs/release/PRODUCTION_READINESS_GATE_V1.md','supabase/config.toml','package.json','package-lock.json','backend/package.json','backend/package-lock.json'];
 files.push(...fs.readdirSync(path.join(root,'supabase/migrations')).filter(p=>/^\d+.*\.sql$/.test(p)).sort().map(p=>'supabase/migrations/'+p));
 const bindings=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));return{files:bindings,fingerprint:hash(bindings)};
}
