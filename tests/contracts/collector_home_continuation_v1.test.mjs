import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
function load(path) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports });
  return module.exports;
}
const { selectBinderContinuation } = load('apps/web/src/lib/binders/continuation.ts');
const { getMobileRouteChromeMode, MOBILE_PRIMARY_DOCK } = load('apps/web/src/lib/mobileParity/shellManifest.ts');
const { getDesktopRouteState, DESKTOP_PRIMARY_NAV } = load('apps/web/src/lib/desktopShellManifest.ts');
const goal = (publicId, overrides = {}) => ({ publicId, lifecycle: 'active', role: 'owner', completedSlots: 2, totalSlots: 10, ...overrides });

test('recent goals preserve shared/personal order and cap at three', () => {
  const result = selectBinderContinuation([goal('shared', {role:'viewer'}), goal('done', {completedSlots:10}), goal('mine'), goal('archive', {lifecycle:'archived'}), goal('setup', {totalSlots:0}), goal('more')], false);
  assert.deepEqual(Array.from(result.items, x => x.publicId), ['shared','mine','setup']);
  assert.equal(result.hasMore, true);
  assert.equal(result.hasNoBinders, false);
});
test('filtered partial page never implies an empty library', () => {
  assert.equal(selectBinderContinuation([goal('archived', {lifecycle:'archived'})], true).hasNoBinders, false);
  assert.equal(selectBinderContinuation([], true).hasNoBinders, false);
  assert.equal(selectBinderContinuation([], false).hasNoBinders, true);
});
test('both web navigations use the collector destination order', () => {
  const expected = ['Vault','Explore','Scan','Binders','Community'];
  assert.deepEqual(Array.from(MOBILE_PRIMARY_DOCK, x => x.label), expected);
  assert.deepEqual(Array.from(DESKTOP_PRIMARY_NAV, x => x.label), expected);
});
test('Binder root retains dock; detail and secret routes preserve modes', () => {
  assert.equal(getMobileRouteChromeMode('/binders/?notice=created'), 'root');
  assert.equal(getMobileRouteChromeMode('/binders/new'), 'pushed');
  assert.equal(getMobileRouteChromeMode('/binders/exact-public-id'), 'pushed');
  assert.equal(getMobileRouteChromeMode('/b/private-token'), 'standalone_secret');
  assert.equal(getMobileRouteChromeMode('/binder-invites/review'), 'standalone_secret');
  assert.equal(getMobileRouteChromeMode('/scan'), 'fullscreen');
  assert.equal(getMobileRouteChromeMode('/vault/import'), 'fullscreen');
});
test('old Wall links belong to Community and Binder details to Binders', () => {
  for (const path of ['/wall','/u/existing-collector','/network','/network/nearby']) assert.equal(getDesktopRouteState(path).activePrimary, 'pulse');
  assert.equal(getDesktopRouteState('/binders/exact-public-id').activePrimary, 'binders');
  assert.equal(getDesktopRouteState('/card/GV-PK-1').context.parentLabel, 'Explore');
});
