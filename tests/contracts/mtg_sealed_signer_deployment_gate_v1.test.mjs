import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  FUNCTION_NAME,
  PROJECT_REF,
  SOURCE_BUNDLE_FILES,
} from '../../scripts/audits/mtg_sealed_signer_deployment_gate_v1.mjs';

const signer = fs.readFileSync(
  'supabase/functions/mtg-sealed-sign-image-v1/index.ts', 'utf8');
const config = fs.readFileSync(
  'supabase/functions/mtg-sealed-sign-image-v1/config.toml', 'utf8');
const workflow = fs.readFileSync(
  '.github/workflows/mtg-sealed-image-signer-deploy-v1.yml', 'utf8');
const gate = fs.readFileSync(
  'scripts/audits/mtg_sealed_signer_deployment_gate_v1.mjs', 'utf8');

test('signer gate is pinned to the production project and one function', () => {
  assert.equal(PROJECT_REF, 'ycdxbpibncqcchqiihfz');
  assert.equal(FUNCTION_NAME, 'mtg-sealed-sign-image-v1');
  assert.match(workflow, /SUPABASE_PROJECT_REF: ycdxbpibncqcchqiihfz/);
  assert.match(workflow,
    /supabase functions deploy mtg-sealed-sign-image-v1 \\/);
  assert.equal((workflow.match(/supabase functions deploy/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /db push|migration up|storage cp|storage rm/);
});

test('deployment is manual, immutable-input gated, and non-overlapping', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.match(workflow, /expected_source_commit:/);
  assert.match(workflow, /expected_bundle_sha256:/);
  assert.match(workflow, /expected_plan_fingerprint:/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('bundle includes the signer and every local shared dependency', () => {
  assert.deepEqual(SOURCE_BUNDLE_FILES, [
    'supabase/functions/mtg-sealed-sign-image-v1/index.ts',
    'supabase/functions/mtg-sealed-sign-image-v1/config.toml',
    'supabase/functions/_shared/auth.ts',
    'supabase/functions/_shared/cors.ts',
    'supabase/functions/_shared/key_resolver.ts',
  ]);
  assert.match(gate, /source_bundle_sha256/);
  assert.match(gate, /Deployment plan fingerprint mismatch/);
});

test('signer validates user and exact path before one signing operation', () => {
  assert.match(signer, /requireAuthUser\(req\)/);
  assert.match(signer,
    /mtg_sealed_image_object_signing_authorized_v1/);
  assert.match(signer, /sealed\\\/mtg\\\/sha256/);
  assert.equal((signer.match(/createSignedUrl\(/g) ?? []).length, 1);
  assert.doesNotMatch(signer, /\.list\(|\.download\(|getPublicUrl/);
  assert.match(config, /verify_jwt = false/);
  assert.match(workflow, /--no-verify-jwt/);
});

test('readback proves authentication and hidden-state denial', () => {
  assert.match(gate, /set local role authenticated/);
  assert.match(gate, /request\.jwt\.claim\.sub/);
  assert.match(gate, /mtg_sealed_visibility === 'hidden'/);
  assert.match(gate, /anonymous_post\.status === 401/);
  assert.match(gate, /invalid_bearer_post\.status === 401/);
  assert.match(gate, /endpointProbe\.get\.status === 405/);
});

test('deployment gate preserves database, Storage, and client boundaries', () => {
  for (const boundary of [
    'database_writes: 0',
    'storage_operations: 0',
    'pricing_writes: 0',
    'pointer_writes: 0',
    'visibility_writes: 0',
    'vault_writes: 0',
    'client_activations: 0',
    'cross_game_writes: 0',
  ]) assert.match(gate, new RegExp(boundary));
  assert.match(gate, /begin transaction read only/);
  assert.match(gate, /protected_state_drift/);
});
