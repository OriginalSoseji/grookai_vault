import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCollectorPreviewBuildEnv } from '../../scripts/ci/collector_preview_build_env.mjs';

const staging = {
  SUPABASE_URL_STAGING: 'http://127.0.0.1:54321/',
  SUPABASE_PUBLISHABLE_KEY_STAGING: 'local-staging-publishable-key',
  SUPABASE_URL: 'https://ycdxbpibncqcchqiihfz.supabase.co',
  SUPABASE_SECRET_KEY: 'production-secret',
  SUPABASE_DB_URL: 'postgresql://production-secret@production.example/db',
  EBAY_CLIENT_SECRET: 'provider-secret',
};

test('local web verification uses only the task-owned local preview target', () => {
  const env = createCollectorPreviewBuildEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    VERCEL_PROJECT_ID: 'production-project',
    GROOKAI_COLLECTOR_RELEASE_V1: 'true',
    SUPABASE_URL: staging.SUPABASE_URL,
    SUPABASE_SECRET_KEY: staging.SUPABASE_SECRET_KEY,
    EBAY_CLIENT_SECRET: staging.EBAY_CLIENT_SECRET,
    NEXT_PUBLIC_COLLECTOR_STAGING: 'true',
  }, staging);

  assert.equal(env.SUPABASE_URL, 'http://127.0.0.1:54321/');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:54321/');
  assert.equal(env.SUPABASE_PUBLISHABLE_KEY, staging.SUPABASE_PUBLISHABLE_KEY_STAGING);
  assert.equal(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, staging.SUPABASE_PUBLISHABLE_KEY_STAGING);
  assert.equal(env.NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY, 'true');
  assert.equal(env.GROOKAI_COLLECTOR_RELEASE_V1, 'false');
  assert.equal(env.NEXT_PUBLIC_COLLECTOR_STAGING, 'false');
  assert.equal(env.SUPABASE_SECRET_KEY, '');
  assert.equal(env.SUPABASE_DB_URL, '');
  assert.equal(env.EBAY_CLIENT_SECRET, '');
  assert.equal(env.VERCEL, undefined);
  assert.equal(env.VERCEL_ENV, undefined);
  assert.equal(env.VERCEL_PROJECT_ID, undefined);
});

test('local web verification rejects missing settings and all non-local targets', () => {
  assert.throws(() => createCollectorPreviewBuildEnv({}, {}), /staging Supabase settings/);
  for (const url of [
    'https://ycdxbpibncqcchqiihfz.supabase.co',
    'https://hcdpcbpnnvtbaezefjkd.supabase.co',
    'http://127.0.0.1:54322/',
  ]) {
    assert.throws(() => createCollectorPreviewBuildEnv({}, {
      ...staging,
      SUPABASE_URL_STAGING: url,
    }), /task-owned local Supabase target/);
  }
});

test('typecheck and strict build both use the local preview environment', () => {
  const webPackage = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
  const typecheckRunner = fs.readFileSync('scripts/ci/run_next_typecheck_preview.mjs', 'utf8');
  const buildRunner = fs.readFileSync('scripts/ci/run_next_build_strict.mjs', 'utf8');

  assert.equal(webPackage.scripts.typecheck, 'node ../../scripts/ci/run_next_typecheck_preview.mjs');
  assert.equal(webPackage.scripts['typecheck:raw'], 'next typegen && tsc --noEmit');
  assert.match(typecheckRunner, /loadCollectorPreviewBuildEnv/);
  assert.match(buildRunner, /loadCollectorPreviewBuildEnv/);
});
