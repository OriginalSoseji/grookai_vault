import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("root chrome does not perform server auth reads during public render", () => {
  const appChrome = readSource("components", "layout", "AppChrome.tsx");
  const layout = readSource("app", "layout.tsx");

  assert.match(appChrome, /Public routes must not depend on global auth\/session reads/);
  assert.doesNotMatch(appChrome, /createServerComponentClient|getUnreadCardInteractionGroupCount/);
  assert.match(appChrome, /supabase\.auth\.getSession/);
  assert.match(layout, /<AppChrome dexEnabled=\{dexEnabled\} \/>/);
});

test("primary public routes use bounded revalidation instead of force-dynamic", () => {
  const publicRouteSources = [
    readSource("app", "page.tsx"),
    readSource("app", "network", "page.tsx"),
    readSource("app", "network", "discover", "page.tsx"),
    readSource("app", "u", "[slug]", "page.tsx"),
    readSource("app", "u", "[slug]", "section", "[section_id]", "page.tsx"),
    readSource("app", "gvvi", "[gvvi_id]", "page.tsx"),
    readSource("app", "sets", "page.tsx"),
    readSource("app", "compare", "page.tsx"),
  ].join("\n");

  assert.doesNotMatch(publicRouteSources, /force-dynamic|revalidate\s*=\s*0/);
  assert.match(publicRouteSources, /export const revalidate = 60/);
  assert.match(publicRouteSources, /export const revalidate = 120/);
  assert.match(publicRouteSources, /export const revalidate = 300/);
});

test("public read helpers use the anonymous public server client", () => {
  const publicClient = readSource("lib", "supabase", "publicServer.ts");
  const wallCards = readSource("lib", "wallSections", "getPublicWallCardsBySlug.ts");
  const wallSections = readSource("lib", "wallSections", "getPublicWallSectionsBySlug.ts");
  const sectionCards = readSource("lib", "wallSections", "getPublicSectionCardsBySlug.ts");
  const streamRows = readSource("lib", "network", "getCardStreamRows.ts");

  assert.match(publicClient, /Public read helpers should be cacheable by default/);
  assert.doesNotMatch(`${wallCards}\n${wallSections}\n${sectionCards}\n${streamRows}`, /createServerComponentClient/);
  assert.match(`${wallCards}\n${wallSections}\n${sectionCards}\n${streamRows}`, /createPublicServerClient/);
});

test("Wall route does not eagerly fetch every custom section card grid", () => {
  const wallRoute = readSource("app", "u", "[slug]", "page.tsx");
  const wallViewHelper = readSource("lib", "wallSections", "getPublicCollectorWallViewBySlug.ts");
  const allSectionsHelper = readSource("lib", "wallSections", "getPublicCollectorWallSectionsBySlug.ts");

  assert.match(wallRoute, /getPublicCollectorWallViewBySlug/);
  assert.doesNotMatch(wallRoute, /getPublicCollectorWallSectionsBySlug/);
  assert.match(wallViewHelper, /section rail summaries only/);
  assert.doesNotMatch(wallViewHelper, /getPublicSectionCardsBySlug/);
  assert.match(allSectionsHelper, /getPublicSectionCardsBySlug/);
});

test("public card image chooses an initial source before hydration", () => {
  const publicCardImage = readSource("components", "PublicCardImage.tsx");

  assert.match(publicCardImage, /const initialSrc = normalizedPrimary \?\? normalizedFallback/);
  assert.match(publicCardImage, /useState<string \| undefined>\(initialSrc\)/);
  assert.match(publicCardImage, /Hydration must not be required just to choose the first image source/);
  assert.match(publicCardImage, /sizes=\{sizes\}/);
});

test("explore search is bounded and language-aware for public performance", () => {
  const searchRoute = readSource("app", "api", "resolver", "search", "route.ts");
  const exploreRows = readSource("lib", "explore", "getExploreRows.ts");
  const exploreClient = readSource("components", "explore", "ExplorePageClient.tsx");
  const gridItem = readSource("components", "explore", "ExploreCardGridItem.tsx");
  const publicCardImage = readSource("components", "PublicCardImage.tsx");

  assert.match(searchRoute, /const DEFAULT_RESULT_LIMIT = 48/);
  assert.match(searchRoute, /const MAX_RESULT_LIMIT = 64/);
  assert.match(searchRoute, /RESOLVER_RESPONSE_TIMEOUT_MS = 4200/);
  assert.match(searchRoute, /languageScope !== "ja" &&/);
  assert.match(searchRoute, /web_ranked_resolver_v2_degraded_soft_timeout/);
  assert.match(exploreRows, /const SPECIES_FAMILY_SEARCH_LIMIT = 360/);
  assert.match(exploreRows, /JAPANESE_SPECIES_ALIASES_BY_SLUG/);
  assert.match(exploreRows, /\["pikachu", \["ピカチュウ"\]\]/);
  assert.match(exploreRows, /fetchSpeciesFamilyRows/);
  assert.match(exploreRows, /trusted_species_printed_name_match/);
  assert.match(exploreClient, /const INITIAL_VISIBLE_RESULT_COUNT = 24/);
  assert.match(exploreClient, /const SEARCH_API_RESULT_LIMIT = 48/);
  assert.match(exploreClient, /params\.set\("limit", String\(SEARCH_API_RESULT_LIMIT\)\)/);
  assert.match(gridItem, /imagePrefetch=\{false\}/);
  assert.match(gridItem, /imagePriority=\{imagePriority\}/);
  assert.match(publicCardImage, /fetchPriority=\{priority \? "high" : undefined\}/);
});

test("explore search keeps results compact and cards above supporting tools", () => {
  const exploreClient = readSource("components", "explore", "ExplorePageClient.tsx");
  const gridLayout = readSource("components", "cards", "pokemonCardGridLayout.ts");
  const gridItem = readSource("components", "explore", "ExploreCardGridItem.tsx");
  const gridTile = readSource("components", "cards", "PokemonCardGridTile.tsx");
  const compareButton = readSource("components", "compare", "CompareCardButton.tsx");
  const globals = readSource("app", "globals.css");
  const exploreRows = readSource("lib", "explore", "getExploreRows.ts");

  assert.match(gridLayout, /grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5/);
  assert.match(gridItem, /const density = isLarge \? "large" : "compact"/);
  assert.match(gridItem, /typeof card\.raw_price === "number"/);
  assert.match(gridItem, /variant="floating"/);
  assert.match(gridItem, /gv-search-result-card/);
  assert.match(gridItem, /max-w-\[160px\]/);
  assert.match(gridTile, /compact: "p-2"/);
  assert.match(gridTile, /compact: "p-1\.5"/);
  assert.match(compareButton, /variant\?: "default" \| "compact" \| "floating"/);
  assert.match(compareButton, /gv-card-compare-floating/);
  assert.match(globals, /\.gv-search-result-card\.gv-visual-card/);
  assert.match(globals, /\.gv-search-result-card \.gv-card-compare-floating:not\(\.gv-card-compare-floating-selected\)/);
  assert.match(exploreRows, /function compareRowsByDataQuality/);
  assert.match(exploreRows, /getImageRelevanceQuality/);
  assert.match(exploreRows, /hasKnownSetName/);
  assert.match(exploreRows, /const qualityCompare = compareRowsByDataQuality/);
  assert.match(exploreClient, /const resultControls = \(/);
  assert.match(exploreClient, /const presetPillStrip = \(/);
  assert.match(exploreClient, /resolverSummary && displayRows\.length === 0/);
  assert.match(exploreClient, /\{hasExplicitSmartFilters \? \(/);

  const thumbGridStart = exploreClient.indexOf('viewMode === "thumb-lg"');
  const listGridStart = exploreClient.indexOf('viewMode === "list"');
  const firstThumbGroupHeader = exploreClient.indexOf("renderGroupHeader(group)", thumbGridStart);
  assert.ok(
    thumbGridStart > listGridStart,
    "thumbnail grid branch should be present after list branch",
  );
  assert.ok(
    firstThumbGroupHeader === -1,
    "thumbnail grid branches should not render an extra result-group header above cards",
  );
});

test("japanese pikachu display keeps english primary and printed name secondary", () => {
  const displayIdentity = readSource("lib", "cards", "resolveDisplayIdentity.ts");
  const japaneseNameMap = readSource("lib", "cards", "pokemonJapaneseNameMap.ts");
  const exploreGridItem = readSource("components", "explore", "ExploreCardGridItem.tsx");
  const exploreListItem = readSource("components", "explore", "ExploreCardListItem.tsx");
  const setGrid = readSource("components", "PublicSetCardGrid.tsx");
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");

  assert.match(displayIdentity, /JAPANESE_POKEMON_NAME_TO_ENGLISH/);
  assert.match(displayIdentity, /JAPANESE_POKEMON_NAME_RULES/);
  assert.match(displayIdentity, /normalized\.startsWith\(japaneseName\)/);
  assert.match(japaneseNameMap, /\["ピカチュウ", "Pikachu"\]/);
  assert.match(japaneseNameMap, /\["コイル", "Magnemite"\]/);
  assert.match(displayIdentity, /printed_name/);
  assert.match(exploreGridItem, /displayIdentity\.printed_name/);
  assert.match(exploreListItem, /displayIdentity\.printed_name/);
  assert.match(setGrid, /displayIdentity\.printed_name/);
  assert.match(cardPage, /\{resolvedDisplayIdentity\.printed_name\}/);
  assert.doesNotMatch(cardPage, /Japanese printed name/);
});

test("card detail streams lower panels after exact card information", () => {
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");
  const pricingRail = readSource("components", "pricing", "CardPagePricingRail.tsx");

  assert.match(cardPage, /const card = await getPublicCardByGvId\(params\.gv_id\)/);
  assert.match(cardPage, /getCardPricingUiRowsByCardPrintId/);
  assert.match(cardPage, /pricingRecords=\{pricingRecords\}/);
  assert.match(cardPage, /<Suspense fallback=\{null\}>\s*<CardNetworkOffersSection/);
  assert.match(cardPage, /<Suspense fallback=\{null\}>\s*<NearbyCardsSection/);
  assert.match(cardPage, /async function CardNetworkOffersSection/);
  assert.match(cardPage, /async function NearbyCardsSection/);
  assert.match(cardPage, /\{ label: "Language", value: getCardLanguageLabel\(resolvedCard\.gv_id\) \}/);
  assert.match(cardPage, /<h2>Card information<\/h2>/);
  assert.match(cardPage, /<h2>Other versions of this card<\/h2>/);
  assert.ok(
    cardPage.indexOf("<h2>Card information</h2>") < cardPage.indexOf("<h2>Other versions of this card</h2>"),
    "card detail information should render before other versions",
  );
  assert.match(pricingRail, /function PricingLoadingState/);
  assert.match(pricingRail, /isLoadingPricing && !selectedPricing/);
  assert.doesNotMatch(pricingRail, /No pricing data available/);
});

test("card SEO exposes full sitemap index and product identifiers", () => {
  const sitemapIndexRoute = readSource("app", "sitemap.xml", "route.ts");
  const cardSitemapRoute = readSource("app", "sitemaps", "cards", "[page]", "sitemap.xml", "route.ts");
  const sitemapHelpers = readSource("lib", "seo", "sitemaps.ts");
  const robots = readSource("app", "robots.ts");
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");

  assert.match(sitemapIndexRoute, /sitemapIndexResponse/);
  assert.match(sitemapIndexRoute, /getPublicCardSitemapPageCount/);
  assert.match(cardSitemapRoute, /getCardSitemapEntries/);
  assert.match(sitemapHelpers, /CARD_SITEMAP_PAGE_SIZE = 45_000/);
  assert.match(sitemapHelpers, /SUPABASE_SITEMAP_FETCH_CHUNK_SIZE = 1_000/);
  assert.match(sitemapHelpers, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(sitemapHelpers, /for \(let chunkStart = from/);
  assert.match(sitemapHelpers, /\.range\(chunkStart, chunkEnd\)/);
  assert.match(sitemapHelpers, /\/card\/\$\{encodeURIComponent\(card\.gv_id\)\}/);
  assert.doesNotMatch(sitemapHelpers, /CARD_LIMIT = 5000/);
  assert.match(robots, /sitemap: "https:\/\/grookaivault\.com\/sitemap\.xml"/);
  assert.match(cardPage, /type="application\/ld\+json"/);
  assert.match(cardPage, /"@type": "Product"/);
  assert.match(cardPage, /sku: card\.gv_id/);
  assert.match(cardPage, /mpn: card\.gv_id/);
  assert.match(cardPage, /propertyID: "Grookai Vault ID"/);
});

test("card SEO exposes exact GV IDs through visible internal links", () => {
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");
  const setGrid = readSource("components", "PublicSetCardGrid.tsx");
  const layout = readSource("app", "layout.tsx");
  const idsRoute = readSource("app", "ids", "route.ts");
  const idsCardRoute = readSource("app", "ids", "cards", "[page]", "route.ts");
  const sitemapHelpers = readSource("lib", "seo", "sitemaps.ts");

  assert.match(cardPage, /\[card\.gv_id, displayName, card\.set_name, collectorNumberLabel\]/);
  assert.match(cardPage, /Grookai Vault canonical ID/);
  assert.match(cardPage, /Grookai ID \{resolvedCard\.gv_id\}/);
  assert.match(setGrid, /Grookai ID \{card\.gv_id\}/);
  assert.doesNotMatch(layout, /href="\/ids"/);
  assert.match(idsRoute, /status: 410/);
  assert.match(idsRoute, /"X-Robots-Tag": "noindex, nofollow"/);
  assert.match(idsCardRoute, /status: 410/);
  assert.match(idsCardRoute, /"X-Robots-Tag": "noindex, nofollow"/);
  assert.doesNotMatch(sitemapHelpers, /`\$\{origin\}\/ids`/);
  assert.match(sitemapHelpers, /\/card\/\$\{encodeURIComponent\(card\.gv_id\)\}/);
});
