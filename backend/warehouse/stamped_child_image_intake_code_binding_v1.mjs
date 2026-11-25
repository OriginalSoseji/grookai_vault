import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
export function stampedChildImageIntakeCodeBindingV1() {
  const files = [
    'backend/warehouse/stamped_child_image_intake_v1.mjs',
    'backend/warehouse/stamped_child_image_intake_execution_v1.mjs',
    'backend/warehouse/stamped_child_image_storage_adapter_v1.mjs',
    'backend/warehouse/run_stamped_child_image_intake_v1.mjs',
    'backend/warehouse/stamped_child_image_intake_code_binding_v1.mjs',
    'scripts/audits/stamped_child_image_intake_prepare_v1.mjs',
    'scripts/audits/stamped_child_image_intake_local_qualification_v1.mjs',
    'backend/catalog/printing_completeness_gate_v1.mjs',
    'backend/catalog/stamp_identity_admission_hold_v1.mjs',
    'backend/env.mjs', 'backend/supabase_backend_client.mjs',
    'docs/catalog/stamped_child_image_intake_v1/index.json',
    'docs/catalog/stamp_identity_admission_hold_v1/index.json',
    'docs/contracts/STAMPED_CHILD_IMAGE_INTAKE_V1.md',
    'docs/contracts/RUNTIME_WRITE_PATH_AUDIT_V1.md',
    'docs/contracts/CANON_WAREHOUSE_INTAKE_CONTRACT_V1.md',
    'docs/contracts/EXTERNAL_SOURCE_INGESTION_MODEL_V1.md',
    'docs/contracts/INGESTION_PIPELINE_CONTRACT_V1.md',
    'docs/contracts/CHILD_PRINTING_IMAGE_STORAGE_V1.md',
    'docs/contracts/CHILD_PRINTING_IMAGE_PROMOTION_V1.md',
    'docs/contracts/STAMP_IDENTITY_ADMISSION_HOLD_V1.md',
    'docs/checkpoints/warehouse/STAMPED_CHILD_IMAGE_INTAKE_33_20261125.md',
    'docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md',
    'AGENTS.md', 'docs/GROOKAI_RULEBOOK.md', 'docs/CONTRACT_INDEX.md',
    'docs/contracts/GV_SECRETS_CONTRACT_v1.md',
    'docs/release/PRODUCTION_READINESS_GATE_V1.md',
    'supabase/config.toml', 'package.json', 'package-lock.json',
    'backend/package.json', 'backend/package-lock.json',
  ];
  files.push(...fs.readdirSync(path.join(root,'backend/lib/contracts')).filter(name=>name.endsWith('.mjs')).sort().map(name=>'backend/lib/contracts/'+name));
  files.push(...fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => /^\d+.*\.sql$/.test(name)).sort().map(name => 'supabase/migrations/' + name));
  const bindings = files.map(file => ({file, sha256:createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')}));
  return {files:bindings, fingerprint:hash(bindings)};
}
