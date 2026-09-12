import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = (file) => readFileSync(new URL(`../../apps/web/src/${file}`, import.meta.url), 'utf8');

test('shared chrome has no duplicate task search or mobile section heading', () => {
  const header = read('components/layout/SiteHeader.tsx');
  assert.doesNotMatch(header, /PersistentSearchBar|MobileGlobalSearch|mobileSectionLabel/);
  for (const contract of ['shouldSuppressMobileChrome', 'normalizeCompareCardsParam', 'DesktopApplicationShell', 'CollectorMobileTools']) assert.ok(header.includes(contract));
});

test('mobile tools remain gated and accessible through a keyboard-closeable disclosure', () => {
  const tools = read('components/layout/CollectorMobileTools.tsx');
  for (const contract of ['<details', 'More navigation', 'Escape', 'summary', 'DESKTOP_SECONDARY_NAV', 'isAuthenticated && bindersEnabled', 'return dexEnabled', 'compareHref', 'href="/account"', 'href="/login"']) assert.ok(tools.includes(contract), contract);
});

test('search keeps one real form, real filters and visible filter failure warnings', () => {
  const search = read('components/explore/ExplorePageClient.tsx');
  assert.equal((search.match(/<PublicSearchForm /g) ?? []).length, 1);
  for (const contract of ['commitSortMode', 'commitImageConfidenceFilter', 'commitLanguageScope', 'commitIdentityFilter', 'activeFilterStrip', 'unappliedLabels.length > 0', 'some filters were not applied', 'form action={pathname}']) assert.ok(search.includes(contract), contract);
  assert.doesNotMatch(search, /hasExplicitSmartFilters \? \(\s*<details/);
});

test('discovery hides only secondary detail, never identity or image truth', () => {
  const discovery = read('components/explore/ExploreDiscoverySections.tsx');
  for (const contract of ['Explore stamps and variants', 'Card reference', 'card.gv_id', 'CardImageTruthBadge', 'FeaturedPrice', 'RecentlyConfirmedDiscoverySection', 'PublicProvisionalDiscoverySection']) assert.ok(discovery.includes(contract));
  assert.doesNotMatch(discovery, /Stamps, errors, and print-run variants are modeled/);
});

test('client-routed controls cannot consume input before their handlers exist', () => {
  for (const file of ['components/PublicSearchForm.tsx', 'components/sets/PublicSetsToolbar.tsx']) {
    const source = read(file);
    assert.ok(source.includes('useClientReady'));
    assert.ok(source.includes('fieldset disabled={!ready}'));
    assert.ok(source.includes('aria-busy={!ready}'));
  }
  assert.ok(read('components/layout/CollectorMobileTools.tsx').includes('inert={!ready}'));
});
