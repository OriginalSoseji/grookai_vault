import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { assertCollectorStagingTarget } from '../../apps/web/src/lib/collectorStaging.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../../apps/web/src/lib/vault/cardAddOptions.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: module.exports, Error, Number, String });
const { parseCardAddOptions, addCopies } = module.exports;
test('local shared Binder test is opt-in and clears inherited release gates and invitation secrets', () => {
  const source = fs.readFileSync(new URL('../../scripts/preview/start_collector_authenticated.ps1', import.meta.url), 'utf8');
  assert.match(source, /\[switch\]\$SharedBinders/);
  assert.match(source, /'SHARED','VIEW_LINKS','PUBLIC','COMMUNITY','TEMPLATES','NOTIFICATIONS','PULSE_SHARING'/);
  assert.match(source, /Remove-Item Env:BINDER_INVITE_TRANSIENT_SECRET/);
  assert.match(source, /if \(\$SharedBinders\) \{/);
  assert.match(source, /RandomNumberGenerator\]::GetBytes\(32\)/);
  assert.match(source, /GROOKAI_BINDERS_SET_V1_ENABLED = 'false'/);
});
test('staging accepts only the verified loopback database', () => {
  assert.doesNotThrow(() => assertCollectorStagingTarget('http://127.0.0.1:54321'));
  for (const url of ['https://ycdxbpibncqcchqiihfz.supabase.co', 'https://dkuiaiorwirujnrmbpvq.supabase.co',
    'http://127.0.0.1:54322', 'https://127.0.0.1:54321', 'http://x@127.0.0.1:54321', 'http://127.0.0.1:54321?next=prod']) {
    assert.throws(() => assertCollectorStagingTarget(url));
  }
});
test('fixture lab requires a separate explicit mode and never accepts the sample or remote DB', () => {
  assert.doesNotThrow(()=>assertCollectorStagingTarget('http://127.0.0.1:54361',true));
  assert.throws(()=>assertCollectorStagingTarget('http://127.0.0.1:54361',false));
  for(const url of ['http://127.0.0.1:54321','https://ycdxbpibncqcchqiihfz.supabase.co','http://localhost:54361','http://127.0.0.1:54361/rest']) {
    assert.throws(()=>assertCollectorStagingTarget(url,true));
  }
});
test('hosted staging is pinned independently; production, recovery and mode crossover fail', () => {
  const hosted='https://hcdpcbpnnvtbaezefjkd.supabase.co';
  assert.doesNotThrow(()=>assertCollectorStagingTarget(hosted,false,true));
  assert.throws(()=>assertCollectorStagingTarget(hosted,false,false));
  assert.throws(()=>assertCollectorStagingTarget(hosted,true,true));
  for (const url of ['https://ycdxbpibncqcchqiihfz.supabase.co','https://dkuiaiorwirujnrmbpvq.supabase.co',
    'http://127.0.0.1:54321','http://127.0.0.1:54361',hosted+'/rest',hosted+'?prod=1',
    'https://hcdpcbpnnvtbaezefjkd.supabase.co.evil.test','https://user@hcdpcbpnnvtbaezefjkd.supabase.co']) {
    assert.throws(()=>assertCollectorStagingTarget(url,false,true));
  }
});

test('condition and quantity are validated server-side', () => {
  assert.equal(parseCardAddOptions('lp', '3').conditionLabel, 'LP');
  assert.equal(parseCardAddOptions(null, null).quantity, 1);
  for (const q of [0, -1, 21, 1.1, '3x', '', Infinity]) assert.throws(() => parseCardAddOptions('NM', q));
  assert.throws(() => parseCardAddOptions('Mintish', 1));
});
test('copy batch uses one bounded write per copy', async () => {
  let calls = 0;
  const result = await addCopies(3, async () => ++calls);
  assert.equal(calls, 3);
  assert.equal(result.completed.length, 3);
  assert.equal(result.error, null);
});
test('partial failure stops without retry and preserves confirmed successes', async () => {
  let calls = 0;
  const result = await addCopies(4, async () => { if (++calls === 2) throw new Error('uncertain'); return calls; });
  assert.equal(calls, 2);
  assert.equal(result.completed.length, 1);
  assert.equal(result.error.message, 'uncertain');
});
test('autocomplete uses bounded governed search, not raw broad table search', () => {
  const source = fs.readFileSync(new URL('../../apps/web/src/app/api/search/suggestions/route.ts', import.meta.url), 'utf8');
  assert.match(source, /search_game_card_prints_v4/);
  assert.match(source, /createPublicServerClient/);
  assert.match(source, /AbortSignal.timeout/);
  assert.doesNotMatch(source, /from\("card_prints"\)/);
});
test('representative artwork does not erase an existing governed printing identity', () => {
  const source = fs.readFileSync(new URL('../../apps/web/src/lib/getPublicCardByGvId.ts', import.meta.url), 'utf8');
  const mapping = source.split('async function mapCardPrintings(')[1].split('function buildFallbackDisplayPrinting')[0];
  assert.match(mapping, /is_display_fallback: false/);
  assert.match(mapping, /display_image_kind: imageFields.display_image_kind/);
  assert.match(source.split('function buildFallbackDisplayPrinting')[1], /is_display_fallback: true/);
});
test('authenticated candidate requires explicit mode and prevents shared response caching', () => {
  const source = fs.readFileSync(new URL('../../apps/web/next.config.mjs', import.meta.url), 'utf8');
  assert.match(source, /if \(!collectorPreview && !collectorStaging\) \{\s*assertCollectorReleaseEnvironment/);
  assert.match(source, /if \(collectorStaging\) return/);
  assert.match(source, /private, no-store/);
  assert.match(source, /noindex, nofollow/);
});

test('saved cards use owner-scoped reads, stable bounded pagination and existing image authority', () => {
  const source = fs.readFileSync(new URL('../../apps/web/src/app/saved/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /requireServerUser/);
  assert.match(source, /eq\("user_id", user.id\)/);
  assert.match(source, /const PAGE_SIZE = 24/);
  assert.match(source, /order\("created_at".*order\("id"/);
  assert.match(source, /\.range\(/);
  assert.match(source, /resolveCardImageFieldsV1/);
  assert.match(source, /isAuthenticated initialSaved refreshOnChange/);
  assert.doesNotMatch(source, /createServerAdminClient|service.role/i);
});

test('copy removal redirects on the server only after ownership readback', () => {
  const source = fs.readFileSync(new URL('../../apps/web/src/lib/vault/archiveVaultItemInstanceAction.ts', import.meta.url), 'utf8');
  assert.match(source, /await assertVaultInstanceArchivedProof/);
  assert.match(source, /await assertVaultCardCountProof/);
  const redirectAt = source.indexOf('redirect("/vault")');
  assert.ok(redirectAt > source.lastIndexOf('await assertVaultCardCountProof'));
  assert.match(source, /formData.get\("return_to_vault"\) === "true"\) redirect\("\/vault"\)/);
  assert.doesNotMatch(source, /redirect\(formData/);
});
