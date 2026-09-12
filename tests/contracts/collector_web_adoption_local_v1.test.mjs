import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');

test('collector adoption retains every original top-level destination', () => {
  for (const route of ['explore', 'search', 'network', 'network/discover', 'network/inbox', 'wall', 'vault', 'sets', 'dex', 'compare', 'binders', 'scan', 'account']) {
    assert.ok(['page.tsx', 'route.ts'].some(file => existsSync(new URL(`apps/web/src/app/${route}/${file}`, root))), route);
  }
});

test('new mobile tools retain compare state and private-tool gates', () => {
  const source = read('apps/web/src/components/layout/CollectorMobileTools.tsx');
  assert.match(source, /DESKTOP_SECONDARY_NAV/);
  assert.match(source, /isAuthenticated && bindersEnabled/);
  assert.match(source, /item.key === "messages"\) return isAuthenticated/);
  assert.match(source, /item.key === "compare" \? compareHref : item.href/);
  assert.match(source, /isAuthenticated \? <Link href="\/account"/);
});

test('approved appearance lives in a separate stylesheet without replacing theme bootstrap', () => {
  const source = read('apps/web/src/app/layout.tsx');
  assert.match(source, /import "\.\/globals.css"/);
  assert.match(source, /import "\.\/collector.css"/);
  assert.match(source, /className="gv-collector"/);
  assert.match(source, /grookai-theme/);
  assert.match(source, /classList.toggle\("gv-dark"/);
});

test('real UI does not import the approved mock application or persist mock ownership', () => {
  for (const file of [
    'components/layout/DesktopApplicationShell.tsx', 'components/layout/CollectorMobileTools.tsx',
    'components/cards/PokemonCardGridTile.tsx', 'components/sets/PublicSetTile.tsx',
    'components/binders/BinderViews.tsx', 'components/explore/ExploreDiscoverySections.tsx',
    'components/network/NetworkPageLayout.tsx',
  ]) {
    const source = read(`apps/web/src/${file}`);
    assert.doesNotMatch(source, /collector-site-preview|collector-preview|localStorage\.setItem|fixtureProducts|SAMPLE_PRODUCTS/);
    assert.doesNotMatch(source, /\.from\(|\.rpc\(|SUPABASE_SECRET_KEY/);
  }
});

test('card presentation retains full identity, supported fallbacks, actions and evidence slots', () => {
  const source = read('apps/web/src/components/cards/PokemonCardGridTile.tsx');
  for (const slot of ['subtitle', 'badges', 'meta', 'summary', 'actions', 'details', 'footer']) assert.match(source, new RegExp(`\\{${slot} \\?`));
  assert.match(source, /fallbackSources=\{imageFallbackSources\}/);
  assert.match(source, /imageOverlay/);
});

test('local launcher cannot silently connect to hosted Supabase or run on main', () => {
  const source = read('scripts/preview/start_collector_real_local.ps1');
  assert.match(source, /design\/collector-real-local/);
  assert.match(source, /\$url.Host -ne '127.0.0.1'/);
  assert.match(source, /\$url.Port -ne 54321/);
  assert.match(source, /supabase status -o json/);
  assert.doesNotMatch(source, /supabase (db reset|db push|migration up)|git push|vercel deploy|db seed/);
});
