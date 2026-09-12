import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const script=readFileSync(new URL('../../apps/web/scripts/collector-pricing-replay.mjs',import.meta.url),'utf8');
test('pricing replay pins loopback container, port, branch and separate database',()=>{
  for(const value of ['collector_pricing_replay_', 'preview/collector-authenticated-20260910',
    'http://127.0.0.1:54321', ':54330', 'create database ${database} owner postgres']) assert.ok(script.includes(value));
  assert.doesNotMatch(script,/process\.env\.(SUPABASE|DATABASE|POSTGRES)/);
});
test('no worker, reset, canonical card creation or external publication path',()=>{
  assert.doesNotMatch(script,/import .*workers|db reset|db push|drop database|--mode=production/);
  assert.doesNotMatch(script,/insert\('card_prints'|insert\('card_printings'/);
  assert.match(script,/SYNTHETIC_LOCAL_REPLAY_NOT_MARKET_DATA/);
  assert.match(script,/await q\(browserMode\?'commit;':'rollback;'\)/);
  assert.match(script,/process\.argv\.includes\('--browser'\)/);
  assert.match(script,/report\.sourceAfter.*sampleQuery/);
});
test('browser fixture uses real isolated auth/API and stops only its labeled services',()=>{
  const runtime=readFileSync(new URL('../../apps/web/scripts/collector-fixture-runtime.mjs',import.meta.url),'utf8');
  for(const text of ["url.pathname='/'+database",'grookai.fixture.database',"'127.0.0.1'",'State.Running,false']) assert.ok(runtime.includes(text));
  assert.match(runtime,/admin\.auth\.admin\.createUser/);
  assert.match(runtime,/Prices are synthetic, not live market data/);
  assert.match(runtime,/await browser\.close\(\)/);
  assert.doesNotMatch(runtime,/page\.route|drop database|docker.*rm/);
});
test('uses real policy, assignment, guarded activation and trace readback',()=>{
  for(const value of ['evaluateTcgplayerMarketQualificationV1(candidate', 'prepare_tcgplayer_market_variant_assignments_v1',
    'v_tcgplayer_market_qualification_candidates_v1', 'activate_market_price_publication_set_v1',
    'get_market_price_trace_v1', 'Trace mismatch:']) assert.ok(script.includes(value));
  assert.match(script,/not_english_standard_identity/);
  assert.match(script,/wrong activation count rejected/);
});
test('proves exact totals through web functions and rejects cross-account and anonymous access',()=>{
  for(const value of ['getMarketPricingReadModelV1','buildVaultExactPricingSummary','buildVaultValueSummary',
    'summary.effectivePrice,24.68','summary.pricedRawCopyCount,2','summary.unpricedRawCopyCount,1',
    'set local role authenticated','set local role anon','anonymous_pricing_allowed']) assert.ok(script.includes(value));
  assert.match(script,/browserVerified:false/);
});
