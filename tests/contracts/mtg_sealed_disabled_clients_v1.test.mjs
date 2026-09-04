import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const webClientPath = 'apps/web/src/lib/sealed/mtgSealedClientV1.ts';
const webTransportPath =
  'apps/web/src/lib/sealed/mtgSealedSupabaseTransportV1.ts';
const dartClientPath = 'lib/services/sealed/mtg_sealed_client_v1.dart';
const signingFunctionPath =
  'supabase/functions/mtg-sealed-sign-image-v1/index.ts';
const webClient = fs.readFileSync(webClientPath, 'utf8');
const webTransport = fs.readFileSync(webTransportPath, 'utf8');
const dartClient = fs.readFileSync(dartClientPath, 'utf8');
const signingFunction = fs.readFileSync(signingFunctionPath, 'utf8');

function filesUnder(root, extensions, exclusions = []) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      const normalized = fullPath.replaceAll('\\', '/');
      if (exclusions.some((value) => normalized.startsWith(value))) continue;
      if (entry.isDirectory()) visit(fullPath);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        files.push(fullPath);
      }
    }
  };
  visit(root);
  return files;
}

test('web and Flutter clients are hard-disabled without runtime overrides', () => {
  assert.match(webClient,
    /MTG_SEALED_CLIENT_V1_ENABLED = false as const/);
  assert.doesNotMatch(webClient, /process\.env|NEXT_PUBLIC_|feature.?flag/i);
  assert.match(dartClient, /kMtgSealedClientV1Enabled = false;/);
  assert.doesNotMatch(dartClient, /fromEnvironment|remote.?config/i);
});

test('clients use RPC V3 and route image signing through the trusted function', () => {
  assert.match(webClient, /get_active_sealed_product_pricing_v3/);
  assert.match(webTransport, /mtg-sealed-sign-image-v1/);
  assert.match(webTransport, /functions\.invoke/);
  assert.match(dartClient, /get_active_sealed_product_pricing_v3/);
  assert.match(dartClient, /mtg-sealed-sign-image-v1/);
  assert.match(dartClient, /functions\.invoke/);
  assert.doesNotMatch(`${webClient}\n${webTransport}\n${dartClient}`,
    /createSignedUrl|getPublicUrl|storage\/v1\/object\/public/i);
  assert.match(signingFunction, /createSignedUrl/);
  assert.match(signingFunction,
    /mtg_sealed_image_object_signing_authorized_v1/);
});

test('trusted signer authenticates callers and exposes no listing operation', () => {
  assert.match(signingFunction, /requireAuthUser\(req\)/);
  assert.match(signingFunction, /createServiceRoleClient\(\)/);
  assert.match(signingFunction, /EXPIRES_IN_SECONDS = 60 \* 60/);
  assert.doesNotMatch(signingFunction, /\.list\(|\.download\(/);
  assert.doesNotMatch(signingFunction, /source_image_url|selected_source_url/);
  const config = fs.readFileSync(
    'supabase/functions/mtg-sealed-sign-image-v1/config.toml', 'utf8');
  assert.match(config, /verify_jwt = false/);
  assert.match(signingFunction, /missing_bearer_token|invalid_jwt/);
});

test('client models expose every fail-closed operational state', () => {
  for (const state of [
    'disabled', 'loading', 'signed_out', 'empty', 'ready', 'missing_image',
    'stale', 'offline', 'error',
  ]) assert.match(webClient, new RegExp(`"${state}"`));
  for (const state of [
    'disabled', 'loading', 'signedOut', 'empty', 'ready', 'missingImage',
    'stale', 'offline', 'error',
  ]) assert.match(dartClient, new RegExp(`\\b${state}\\b`));
});

test('client validation repeats identity, freshness, and image boundaries', () => {
  for (const source of [webClient, dartClient]) {
    assert.match(source, /tcgplayer/);
    assert.match(source, /USD/);
    assert.match(source, /user-card-images/);
    assert.match(source, /source_image_url/);
    assert.match(source, /selected_source_url/);
  }
  assert.match(webClient, /sealed\\\/mtg\\\/sha256/);
  assert.match(dartClient, /sealed\/mtg\/sha256/);
  assert.match(webClient, /age < 0 \|\| age > 7/);
  assert.match(dartClient, /age < 0 \|\| age > 7/);
});

test('no web route or Flutter product surface wires the disabled clients', () => {
  const webSurfaceFiles = [
    ...filesUnder('apps/web/src/app', ['.ts', '.tsx']),
    ...filesUnder('apps/web/src/components', ['.ts', '.tsx']),
  ];
  const flutterFiles = filesUnder('lib', ['.dart'], [
    'lib/services/sealed/',
  ]);
  for (const file of webSurfaceFiles) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'),
      /MtgSealedClientV1|mtgSealedClientV1|get_active_sealed_product_pricing_v3/,
      file);
  }
  for (const file of flutterFiles) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'),
      /MtgSealedClientV1|kMtgSealedClientV1Enabled|get_active_sealed_product_pricing_v3/,
      file);
  }
});

test('dedicated client tests are registered and present', () => {
  const packageJson = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
  assert.match(packageJson.scripts['test:mtg-sealed-client'],
    /mtgSealedClientV1\.test\.ts/);
  assert.equal(fs.existsSync(
    'apps/web/src/lib/sealed/mtgSealedClientV1.test.ts'), true);
  assert.equal(fs.existsSync('test/mtg_sealed_client_v1_test.dart'), true);
  assert.equal(fs.existsSync(signingFunctionPath), true);
});
