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
  const cardZoomModal = readSource("components", "compare", "CardZoomModal.tsx");
  const nextConfig = readFileSync(join(sourceRoot, "..", "next.config.mjs"), "utf8");

  assert.match(publicCardImage, /const initialSrc = normalizedPrimary \?\? normalizedFallback/);
  assert.match(publicCardImage, /normalizePublicCardImageSrc\(src\)/);
  assert.match(publicCardImage, /shouldBypassNextImageOptimization\(activeSrc\)/);
  assert.match(publicCardImage, /useState<string \| undefined>\(initialSrc\)/);
  assert.match(publicCardImage, /Hydration must not be required just to choose the first image source/);
  assert.match(publicCardImage, /sizes=\{sizes\}/);
  assert.match(publicCardImage, /unoptimized=\{renderUnoptimized\}/);
  assert.match(cardZoomModal, /unoptimized = false/);
  assert.match(cardZoomModal, /unoptimized=\{unoptimized\}/);
  assert.match(nextConfig, /minimumCacheTTL:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*7/);
  assert.match(nextConfig, /deviceSizes:\s*\[640,\s*750,\s*828,\s*1080,\s*1200\]/);
  assert.doesNotMatch(nextConfig, /3840/);
});

test("canonical catalog image routes use safe cache policies and do not redirect through signed URLs", () => {
  const canonImageRoute = readSource("app", "api", "canon", "image", "route.ts");
  const canonCardImageRoute = readSource("app", "api", "canon", "cards", "[gv_id]", "image", "route.ts");
  const publicCardImageHelper = readSource("lib", "publicCardImage.ts");
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");

  assert.match(canonImageRoute, /normalizeWarehouseCanonImagePath/);
  assert.match(canonImageRoute, /download\(path\)/);
  assert.match(canonImageRoute, /max-age=31536000, immutable/);
  assert.match(canonCardImageRoute, /download\(imagePath\)/);
  assert.match(canonCardImageRoute, /CDN-Cache-Control/);
  assert.match(canonCardImageRoute, /Vercel-CDN-Cache-Control/);
  assert.match(canonCardImageRoute, /s-maxage=300, stale-while-revalidate=600/);
  assert.doesNotMatch(canonCardImageRoute, /31536000, immutable/);
  assert.match(publicCardImageHelper, /normalizeCanonCardImageProxyUrl\(normalized\)/);
  assert.doesNotMatch(canonImageRoute, /NextResponse\.redirect/);
  assert.doesNotMatch(canonCardImageRoute, /NextResponse\.redirect/);
  assert.doesNotMatch(canonImageRoute, /resolveVaultInstanceMediaUrl/);
  assert.match(cardPage, /function isCanonImageProxyUrl/);
  assert.match(cardPage, /Boolean\(normalizeCanonCardImageProxyUrl\(value\)\)/);
  assert.match(cardPage, /unoptimized=\{isCanonImageProxyUrl\(resolvedCardImageSrc\)\}/);
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
  assert.match(exploreClient, /params\.set\("include_pricing", "1"\)/);
  assert.match(exploreClient, /imagePriority=\{groupIndex === 0 && rowIndex < 4\}/);
  assert.match(gridItem, /imagePrefetch=\{false\}/);
  assert.match(gridItem, /imagePriority=\{imagePriority\}/);
  assert.match(publicCardImage, /fetchPriority=\{priority \? "high" : undefined\}/);
  assert.match(publicCardImage, /unoptimized=\{renderUnoptimized\}/);
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
  assert.match(exploreRows, /includePricing = false/);
  assert.match(exploreRows, /options\.includePricing/);
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
  const cardZoomModal = readSource("components", "compare", "CardZoomModal.tsx");
  const cardPerfProbe = readSource("components", "performance", "CardPagePerformanceProbe.tsx");
  const pricingRail = readSource("components", "pricing", "CardPagePricingRail.tsx");
  const cardPricingRoute = readSource("app", "api", "card-pricing", "route.ts");
  const serverSupabase = readSource("lib", "supabase", "server.ts");

  assert.match(cardPage, /const card = await getPublicCardByGvId\(params\.gv_id, \{/);
  assert.match(cardPage, /includePricing: false/);
  assert.match(cardPage, /includeRelatedPrints: false/);
  assert.match(cardPage, /includeCameos: false/);
  assert.match(cardPage, /hasSupabaseServerAuthCookie/);
  assert.match(cardPage, /shouldReadAuthenticatedState\s*\?\s*await supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(cardPage, /getSetLogoAssetPathMap/);
  assert.match(cardPage, /pricingRecords=\{pricingRecords\}/);
  assert.doesNotMatch(cardPage, /getCardPricingUiRowsByCardPrintId/);
  assert.match(cardPage, /Pricing is intentionally client-loaded/);
  assert.match(cardPricingRoute, /getCardPricingUiRowsByCardPrintIdWithClient/);
  assert.match(cardPage, /<CardZoomModal[\s\S]*priority/);
  assert.match(cardZoomModal, /priority = false/);
  assert.match(cardZoomModal, /priority=\{priority\}/);
  assert.match(cardPage, /isCardPagePerfEnabled\(searchParams\)/);
  assert.match(cardPage, /logCardPageServerPerf\(perfEnabled, "initial_render_ready"/);
  assert.match(cardPage, /serverInitialRenderMs=\{initialRenderMs\}/);
  assert.match(cardPage, /perfEnabled=\{perfEnabled\}/);
  assert.match(cardPerfProbe, /if \(!enabled\) return/);
  assert.match(cardPerfProbe, /largest-contentful-paint/);
  assert.match(cardPerfProbe, /\.gv-card-hero-image-stage img/);
  assert.match(cardPerfProbe, /\[card-page:browser-perf\]/);
  assert.match(serverSupabase, /hasSupabaseServerAuthCookie/);
  assert.match(serverSupabase, /auth-token/);
  assert.match(cardPage, /async function StreamedArtworkCameosSection/);
  assert.match(cardPage, /async function StreamedRelatedPrintsSection/);
  assert.match(cardPage, /getPublicCameosByGvId/);
  assert.match(cardPage, /getPublicRelatedPrintsByGvId/);
  assert.match(cardPage, /<Suspense fallback=\{<CardLowerSectionFallback title="Artwork Cameos" \/>\}>/);
  assert.match(cardPage, /<Suspense fallback=\{<CardLowerSectionFallback title="Other Versions" \/>\}>/);
  assert.match(cardPage, /<Suspense fallback=\{null\}>\s*<CardNetworkOffersSection/);
  assert.match(cardPage, /<Suspense fallback=\{null\}>\s*<NearbyCardsSection/);
  assert.match(cardPage, /async function CardNetworkOffersSection/);
  assert.match(cardPage, /async function NearbyCardsSection/);
  assert.match(cardPage, /\{ label: "Language", value: getCardLanguageLabel\(resolvedCard\.gv_id\) \}/);
  assert.match(cardPage, /<h2>Card information<\/h2>/);
  assert.match(cardPage, /<h2>Other versions of this card<\/h2>/);
  assert.ok(
    cardPage.indexOf("<h2>Card information</h2>") < cardPage.indexOf("<StreamedRelatedPrintsSection"),
    "card detail information should render before streamed other versions",
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
  assert.match(robots, /"\/card\/"/);
  assert.match(robots, /"\/sitemaps\/"/);
  assert.match(robots, /"\/ids"/);
  assert.match(robots, /"\/ids\/cards"/);
  assert.match(robots, /"\/api\/"/);
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

test("legal terms protect catalog data without blocking card indexing", () => {
  const legalPage = readSource("app", "legal", "page.tsx");
  const layout = readSource("app", "layout.tsx");
  const robots = readSource("app", "robots.ts");
  const cardPage = readSource("app", "card", "[gv_id]", "page.tsx");
  const middleware = readSource("middleware.ts");
  const telemetryEvents = readSource("lib", "telemetry", "events.ts");
  const founderPage = readSource("app", "founder", "page.tsx");

  assert.match(legalPage, /Terms and Legal/);
  assert.match(legalPage, /Catalog Data, Grookai IDs, and Automated Access/);
  assert.match(legalPage, /Grookai IDs, catalog structure, metadata compilations/);
  assert.match(legalPage, /personal, non-commercial collector use/);
  assert.match(legalPage, /automated scraping, crawling/);
  assert.match(legalPage, /bulk downloading, dataset creation, mirroring/);
  assert.match(legalPage, /competitive use, or AI\/model training/);
  assert.match(legalPage, /Public availability/);
  assert.match(legalPage, /Search engines may crawl public card pages/);
  assert.match(legalPage, /Commercial, API, bulk data, research, or data-licensing access/);
  assert.match(legalPage, /not legal advice/);
  assert.match(layout, /href="\/legal"[\s\S]*Terms/);
  assert.match(robots, /"\/ids"/);
  assert.match(robots, /"\/ids\/cards"/);
  assert.match(robots, /"\/api\/"/);
  assert.match(robots, /"\/card\/"/);
  assert.doesNotMatch(cardPage, /noindex/);
  assert.match(telemetryEvents, /"abuse_signal"/);
  assert.match(telemetryEvents, /"abuse_throttled"/);
  assert.match(middleware, /retired_id_registry_probe/);
  assert.match(middleware, /api_request_volume/);
  assert.match(middleware, /possible_card_id_walking/);
  assert.match(middleware, /UPSTASH_REDIS_REST_URL/);
  assert.match(middleware, /UPSTASH_REDIS_REST_TOKEN/);
  assert.match(middleware, /GROOKAI_RATE_LIMIT_REDIS_PREFIX/);
  assert.match(middleware, /crypto\.subtle\.digest/);
  assert.match(middleware, /incrementDurableRateLimit/);
  assert.match(middleware, /incrementMemoryRateLimit/);
  assert.match(middleware, /rate_limit_source/);
  assert.match(middleware, /process\.env\.NODE_ENV !== "production"/);
  assert.match(middleware, /status: 429/);
  assert.match(middleware, /"Retry-After"/);
  assert.match(middleware, /X-Grookai-Rate-Limit-Source/);
  assert.match(middleware, /X-Content-Type-Options/);
  assert.match(middleware, /Referrer-Policy/);
  assert.match(middleware, /Permissions-Policy/);
  assert.match(founderPage, /Catalog Protection/);
  assert.match(founderPage, /aggregateAbuseProtectionMetrics/);
  assert.match(founderPage, /Signals \(24h\)/);
  assert.match(founderPage, /Throttles \(24h\)/);
  assert.match(founderPage, /Card Walking \(7d\)/);
});
