import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const webClientPath = 'apps/web/src/lib/sealed/mtgSealedClientV1.ts';
const webTransportPath =
  'apps/web/src/lib/sealed/mtgSealedSupabaseTransportV1.ts';
const dartClientPath = 'lib/services/sealed/mtg_sealed_client_v1.dart';
const signingFunctionPath =
  'supabase/functions/mtg-sealed-sign-image-v1/index.ts';
const webSurfacePath = 'apps/web/src/app/sealed/mtg/page.tsx';
const webSetsPath = 'apps/web/src/app/sets/page.tsx';
const routeAccessPath = 'apps/web/src/lib/auth/routeAccess.ts';
const flutterSurfacePath = 'lib/screens/sets/mtg_sealed_catalog_screen.dart';
const flutterSetsPath = 'lib/screens/sets/public_sets_screen.dart';
const webClient = fs.readFileSync(webClientPath, 'utf8');
const webTransport = fs.readFileSync(webTransportPath, 'utf8');
const dartClient = fs.readFileSync(dartClientPath, 'utf8');
const signingFunction = fs.readFileSync(signingFunctionPath, 'utf8');

test('web and Flutter clients are disabled by default and require build flags', () => {
  assert.match(webClient,
    /process\.env\.NEXT_PUBLIC_MTG_SEALED_CLIENT_V1_ENABLED === "true"/);
  assert.match(dartClient,
    /bool\.fromEnvironment\(\s*'MTG_SEALED_CLIENT_V1_ENABLED'/);
  assert.match(dartClient, /defaultValue: false/);
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
  assert.match(webClient, /mtg\|pokemon/);
  assert.match(dartClient, /mtg\|pokemon/);
  assert.ok(webClient.includes('startsWith(`sealed/${gameKey}/sha256/`)'));
  assert.ok(dartClient.includes("startsWith('sealed/$gameKey/sha256/')"));
  assert.match(webClient, /age < 0 \|\| age > 7/);
  assert.match(dartClient, /age < 0 \|\| age > 7/);
});

test('bounded signed-in product surfaces are feature-gated and protected', () => {
  const webSurface = fs.readFileSync(webSurfacePath, 'utf8');
  const webSets = fs.readFileSync(webSetsPath, 'utf8');
  const routeAccess = fs.readFileSync(routeAccessPath, 'utf8');
  const flutterSurface = fs.readFileSync(flutterSurfacePath, 'utf8');
  const flutterSets = fs.readFileSync(flutterSetsPath, 'utf8');

  assert.match(webSurface, /createServerComponentClient/);
  assert.match(webSurface, /supabase\.auth\.getUser\(\)/);
  assert.match(webSurface, /redirect\(`\/login\?next=/);
  assert.match(webSurface, /limit: 24/);
  assert.match(webSets, /isMtgSealedClientV1Enabled\(\)/);
  assert.match(routeAccess, /"\/sealed\/:path\*"/);
  assert.match(flutterSurface, /limit: 24/);
  assert.match(flutterSets, /kMtgSealedClientV1Enabled/);
  assert.doesNotMatch(`${webSurface}\n${flutterSurface}`,
    /get_active_sealed_product_pricing_v3|createSignedUrl|getPublicUrl/);
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
