import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "audits", "web_cohesion_link_integrity_v1");
const OUT_JSON = path.join(OUT_DIR, "web_cohesion_link_integrity_v1.json");
const OUT_MD = path.join(OUT_DIR, "web_cohesion_link_integrity_v1.md");
const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_MAX_PAGES = 15000;
const FETCH_TIMEOUT_MS = 60000;
const ROUTE_DELAY_MS = 20;

dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, "apps", "web", ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.WEB_AUDIT_BASE_URL ?? DEFAULT_BASE_URL,
    maxPages: Number.parseInt(process.env.WEB_AUDIT_MAX_PAGES ?? `${DEFAULT_MAX_PAGES}`, 10),
    crawlDiscovered: process.env.WEB_AUDIT_CRAWL_DISCOVERED !== "false",
    exhaustiveCards: process.env.WEB_AUDIT_EXHAUSTIVE_CARDS === "true",
    cardSamplePerSet: Number.parseInt(process.env.WEB_AUDIT_CARD_SAMPLE_PER_SET ?? "3", 10),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = argv[index + 1] ?? args.baseUrl;
      index += 1;
    } else if (arg === "--max-pages") {
      args.maxPages = Number.parseInt(argv[index + 1] ?? `${args.maxPages}`, 10);
      index += 1;
    } else if (arg === "--exhaustive-cards") {
      args.exhaustiveCards = true;
    } else if (arg === "--no-discovered") {
      args.crawlDiscovered = false;
    } else if (arg === "--card-sample-per-set") {
      args.cardSamplePerSet = Number.parseInt(argv[index + 1] ?? `${args.cardSamplePerSet}`, 10);
      index += 1;
    }
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  args.maxPages = Number.isFinite(args.maxPages) && args.maxPages > 0 ? args.maxPages : DEFAULT_MAX_PAGES;
  args.cardSamplePerSet =
    Number.isFinite(args.cardSamplePerSet) && args.cardSamplePerSet >= 0 ? args.cardSamplePerSet : 3;
  return args;
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "") || "/";
}

function routeKey(pathname) {
  return normalizePathname(pathname);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPaged(supabase, table, select, configure) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + pageSize - 1);
    query = configure ? configure(query) : query;
    const { data, error } = await query;
    if (error) {
      throw new Error(`[web-audit:${table}] ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return rows;
}

async function loadAuditUniverse() {
  const supabase = getSupabaseClient();
  const [setRows, cardRows, speciesRows] = await Promise.all([
    fetchPaged(supabase, "sets", "code,name,release_date", (query) => query.not("code", "is", null)),
    fetchPaged(supabase, "card_prints", "gv_id,set_code,name,number", (query) =>
      query.not("gv_id", "is", null).not("set_code", "is", null),
    ),
    fetchPaged(
      supabase,
      "v_grookai_dex_species_v1",
      "slug,display_name,national_dex_number,total_print_count,active",
      (query) => query.eq("active", true).not("slug", "is", null),
    ).catch(() => []),
  ]);

  const setCodesFromCards = new Set(
    cardRows.map((row) => normalizeText(row.set_code).toLowerCase()).filter(Boolean),
  );
  const sets = setRows
    .map((row) => ({
      code: normalizeText(row.code).toLowerCase(),
      name: normalizeText(row.name),
      releaseDate: normalizeText(row.release_date) || null,
      cardCount: 0,
    }))
    .filter((row) => row.code && setCodesFromCards.has(row.code));
  const setsByCode = new Map(sets.map((row) => [row.code, row]));
  for (const setCode of setCodesFromCards) {
    if (!setsByCode.has(setCode)) {
      setsByCode.set(setCode, {
        code: setCode,
        name: "",
        releaseDate: null,
        cardCount: 0,
      });
    }
  }

  const cardsBySet = new Map();
  const cards = cardRows
    .map((row) => ({
      gvId: normalizeText(row.gv_id),
      setCode: normalizeText(row.set_code).toLowerCase(),
      name: normalizeText(row.name),
      number: normalizeText(row.number),
    }))
    .filter((row) => row.gvId && row.setCode);
  for (const card of cards) {
    const bucket = cardsBySet.get(card.setCode) ?? [];
    bucket.push(card);
    cardsBySet.set(card.setCode, bucket);
  }
  for (const [setCode, bucket] of cardsBySet.entries()) {
    const set = setsByCode.get(setCode);
    if (set) {
      set.cardCount = bucket.length;
    }
  }

  const species = speciesRows
    .map((row) => ({
      slug: normalizeText(row.slug).toLowerCase(),
      displayName: normalizeText(row.display_name),
      nationalDexNumber: row.national_dex_number ?? null,
      totalPrintCount: row.total_print_count ?? 0,
    }))
    .filter((row) => row.slug);

  return {
    sets: Array.from(setsByCode.values()).sort((left, right) => left.code.localeCompare(right.code)),
    cards,
    cardsBySet,
    species,
  };
}

function chooseCardSamples(cards, count) {
  if (count <= 0 || cards.length === 0) {
    return [];
  }
  if (cards.length <= count) {
    return cards;
  }
  const indexes = new Set([0, Math.floor(cards.length / 2), cards.length - 1]);
  for (let index = 0; indexes.size < count && index < cards.length; index += 1) {
    indexes.add(index);
  }
  return Array.from(indexes)
    .sort((left, right) => left - right)
    .slice(0, count)
    .map((index) => cards[index])
    .filter(Boolean);
}

function buildSeedRoutes(universe, options) {
  const routes = new Map();
  const add = (pathname, source, category) => {
    const normalized = routeKey(pathname);
    if (!routes.has(normalized)) {
      routes.set(normalized, { pathname: normalized, sources: new Set(), category });
    }
    routes.get(normalized).sources.add(source);
  };

  [
    "/",
    "/explore",
    "/sets",
    "/dex",
    "/compare",
    "/network",
    "/network/discover",
    "/network/inbox",
    "/following",
    "/vault",
    "/vault/import",
    "/wall",
    "/account",
    "/login",
    "/legal",
    "/submit",
  ].forEach((pathname) => add(pathname, "primary_route_seed", "primary"));

  if (
    process.env.LOCAL_COMMUNITY_FEED_V1_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED === "true" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.APP_ENV === "staging"
  ) {
    add("/network/nearby", "primary_route_seed:local_community_enabled", "primary");
  }

  for (const set of universe.sets) {
    add(`/sets/${encodeURIComponent(set.code)}`, `set:${set.code}`, "set");
    add(`/set/${encodeURIComponent(set.code)}`, `legacy-set:${set.code}`, "legacy_set");
    const cards = universe.cardsBySet.get(set.code) ?? [];
    const selectedCards = options.exhaustiveCards ? cards : chooseCardSamples(cards, options.cardSamplePerSet);
    for (const card of selectedCards) {
      add(`/card/${encodeURIComponent(card.gvId)}`, `card-sample:${set.code}`, "card");
    }
  }

  const speciesSamples = universe.species.slice(0, 60);
  for (const species of speciesSamples) {
    add(`/dex/${encodeURIComponent(species.slug)}`, `species:${species.slug}`, "dex_species");
  }

  return routes;
}

function extractInternalLinks(html, baseUrl, currentPathname) {
  const links = [];
  const linkPattern = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;
  while ((match = linkPattern.exec(html))) {
    const rawHref = match[1] ?? match[2] ?? match[3] ?? "";
    const href = rawHref.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }

    try {
      const url = new URL(href, `${baseUrl}${currentPathname}`);
      const base = new URL(baseUrl);
      if (url.origin !== base.origin) {
        continue;
      }
      links.push({
        href,
        pathname: normalizePathname(url.pathname),
        search: url.search,
      });
    } catch {
      links.push({
        href,
        pathname: "",
        search: "",
        parseError: true,
      });
    }
  }
  return links;
}

function classifyResult(result) {
  if (result.error) {
    return "request_error";
  }
  if (result.status >= 500) {
    return "server_error";
  }
  if (result.status === 404) {
    return "not_found";
  }
  if (result.status >= 400) {
    return "client_error";
  }
  if (result.status >= 300) {
    return "redirect";
  }
  if (result.status >= 200) {
    return "ok";
  }
  return "unknown";
}

async function fetchRoute(baseUrl, pathname) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "Grookai-Web-Audit/1.0",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const location = response.headers.get("location");
    const html = contentType.includes("text/html") ? await response.text() : "";
    return {
      pathname,
      status: response.status,
      statusText: response.statusText,
      location,
      contentType,
      durationMs: Math.round(performance.now() - started),
      bodyLength: html.length,
      html,
    };
  } catch (error) {
    return {
      pathname,
      status: 0,
      statusText: "",
      location: null,
      contentType: "",
      durationMs: Math.round(performance.now() - started),
      bodyLength: 0,
      html: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function analyzeHtml(result, baseUrl) {
  const html = result.html ?? "";
  const links = extractInternalLinks(html, baseUrl, result.pathname);
  const lower = html.toLowerCase();
  const flags = {
    hasMain: /<main\b/i.test(html),
    hasNextError: lower.includes("application error") || lower.includes("this page could not be found"),
    hasHydrationMarker: lower.includes("__next_f"),
    hasBrokenImageAltPattern: lower.includes("alt=\"\"") && lower.includes("img"),
    hasHorizontalOverflowRisk:
      lower.includes("min-w-[") ||
      lower.includes("w-[") ||
      lower.includes("overflow-x-scroll") ||
      lower.includes("overflow-x-auto"),
    hasDarkModeWhiteRisk:
      lower.includes("bg-white") ||
      lower.includes("#ffffff") ||
      lower.includes("rgb(255, 255, 255)"),
    placeholderCount: (lower.match(/no image|missing image|placeholder|not available/g) ?? []).length,
  };
  return { links, flags };
}

function addDiscoveredRoute(routeQueue, routeMeta, pathname, source, category = "discovered") {
  if (!pathname || pathname.startsWith("/api/") || pathname === "/search") {
    return;
  }
  const normalized = routeKey(pathname);
  if (!routeMeta.has(normalized)) {
    routeMeta.set(normalized, { pathname: normalized, sources: new Set(), category });
    routeQueue.push(normalized);
  }
  routeMeta.get(normalized).sources.add(source);
}

function shouldAutoCrawlDiscoveredPath(pathname) {
  const normalized = normalizePathname(pathname);
  if (
    normalized.startsWith("/card/") ||
    normalized.startsWith("/sets/") ||
    normalized.startsWith("/set/") ||
    normalized.startsWith("/dex/") ||
    normalized.startsWith("/u/") ||
    normalized.startsWith("/vault/gvvi/") ||
    normalized.startsWith("/gvvi/") ||
    normalized.startsWith("/provisional/") ||
    normalized.startsWith("/founder/warehouse/")
  ) {
    return false;
  }

  return true;
}

async function crawlRoutes(baseUrl, seedRoutes, maxPages, options) {
  const routeMeta = new Map(seedRoutes);
  const queue = Array.from(seedRoutes.keys());
  const visited = new Set();
  const results = [];
  const linkEdges = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const pathname = queue.shift();
    if (!pathname || visited.has(pathname)) {
      continue;
    }
    visited.add(pathname);

    const response = await fetchRoute(baseUrl, pathname);
    const analysis = analyzeHtml(response, baseUrl);
    const result = {
      pathname,
      category: routeMeta.get(pathname)?.category ?? "unknown",
      sources: Array.from(routeMeta.get(pathname)?.sources ?? []),
      status: response.status,
      statusText: response.statusText,
      location: response.location,
      contentType: response.contentType,
      durationMs: response.durationMs,
      bodyLength: response.bodyLength,
      error: response.error ?? null,
      classification: classifyResult(response),
      flags: analysis.flags,
      internalLinkCount: analysis.links.length,
    };
    results.push(result);

    for (const link of analysis.links) {
      linkEdges.push({
        from: pathname,
        to: link.pathname,
        href: link.href,
        parseError: link.parseError === true,
      });
      if (!link.parseError && options.crawlDiscovered && shouldAutoCrawlDiscoveredPath(link.pathname)) {
        addDiscoveredRoute(queue, routeMeta, link.pathname, `linked-from:${pathname}`);
      }
    }

    if (visited.size % 100 === 0) {
      console.log(`[web-audit] visited=${visited.size} queue=${queue.length} latest=${pathname}`);
    }

    await sleep(ROUTE_DELAY_MS);
  }

  return {
    results,
    linkEdges,
    routeMeta,
    maxPagesReached: queue.length > 0,
    remainingQueueCount: queue.length,
  };
}

function summarize(universe, crawl) {
  const byClassification = new Map();
  const byCategory = new Map();
  const broken = [];
  const warnings = [];
  for (const result of crawl.results) {
    byClassification.set(result.classification, (byClassification.get(result.classification) ?? 0) + 1);
    byCategory.set(result.category, (byCategory.get(result.category) ?? 0) + 1);
    if (["request_error", "server_error", "not_found", "client_error"].includes(result.classification)) {
      broken.push(result);
    }
    if (result.classification === "ok") {
      if (!result.flags.hasMain && !["legacy_set"].includes(result.category)) {
        warnings.push({ ...result, warning: "missing_main_landmark" });
      }
      if (result.flags.hasNextError) {
        warnings.push({ ...result, warning: "next_error_text_present" });
      }
      if (result.durationMs > 3000) {
        warnings.push({ ...result, warning: "slow_route_over_3000ms" });
      }
    }
  }

  const setRouteResults = crawl.results.filter((result) => result.category === "set");
  const failedSetRoutes = setRouteResults.filter((result) => result.classification !== "ok");
  const legacySetRouteResults = crawl.results.filter((result) => result.category === "legacy_set");
  const failedLegacySetRoutes = legacySetRouteResults.filter(
    (result) => !["ok", "redirect"].includes(result.classification),
  );
  const cardRouteResults = crawl.results.filter((result) => result.category === "card");
  const failedCardRoutes = cardRouteResults.filter((result) => result.classification !== "ok");
  const deadEdges = crawl.linkEdges.filter((edge) => {
    const target = crawl.results.find((result) => result.pathname === routeKey(edge.to));
    return target && ["request_error", "server_error", "not_found", "client_error"].includes(target.classification);
  });

  return {
    totalSetsInDb: universe.sets.length,
    totalCardsInDb: universe.cards.length,
    totalSpeciesInDb: universe.species.length,
    routesVisited: crawl.results.length,
    maxPagesReached: crawl.maxPagesReached,
    remainingQueueCount: crawl.remainingQueueCount,
    byClassification: Object.fromEntries([...byClassification.entries()].sort()),
    byCategory: Object.fromEntries([...byCategory.entries()].sort()),
    setRoutesTested: setRouteResults.length,
    failedSetRoutes: failedSetRoutes.length,
    legacySetRoutesTested: legacySetRouteResults.length,
    failedLegacySetRoutes: failedLegacySetRoutes.length,
    cardRoutesTested: cardRouteResults.length,
    failedCardRoutes: failedCardRoutes.length,
    brokenRoutes: broken.length,
    deadInternalLinks: deadEdges.length,
    warnings: warnings.length,
  };
}

function buildCohesionFindings(summary, crawl) {
  const findings = [];
  if (summary.brokenRoutes > 0) {
    findings.push({
      severity: "blocker",
      category: "broken_route",
      finding: `${summary.brokenRoutes} crawled route(s) returned request/client/server errors.`,
      recommendation: "Fix broken routes before deeper visual polish.",
    });
  }
  if (summary.failedSetRoutes > 0) {
    findings.push({
      severity: "blocker",
      category: "set_route_integrity",
      finding: `${summary.failedSetRoutes} canonical set route(s) failed.`,
      recommendation: "Set pages must be fully route-safe because set browsing is a core collector workflow.",
    });
  }
  if (summary.failedCardRoutes > 0) {
    findings.push({
      severity: "high",
      category: "card_route_integrity",
      finding: `${summary.failedCardRoutes} sampled card route(s) failed.`,
      recommendation: "Resolve card route failures or expand the sample to isolate bad gv_id rows.",
    });
  }
  if (summary.maxPagesReached) {
    findings.push({
      severity: "medium",
      category: "crawl_coverage",
      finding: `Crawler reached max page budget with ${summary.remainingQueueCount} route(s) still queued.`,
      recommendation: "Rerun with a larger --max-pages value for a fuller link graph.",
    });
  }

  const slowRoutes = crawl.results
    .filter((result) => result.durationMs > 3000)
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 10);
  if (slowRoutes.length > 0) {
    findings.push({
      severity: "medium",
      category: "speed",
      finding: `${slowRoutes.length} route sample(s) exceeded 3000ms.`,
      recommendation: "Prioritize caching and query reduction on the slowest route templates.",
      examples: slowRoutes.map((route) => `${route.pathname} (${route.durationMs}ms)`),
    });
  }

  findings.push({
    severity: "polish",
    category: "jakobs_law",
    finding:
      "Core navigation should remain conventional: search, sets, card detail, vault, Dex, and account should all have predictable labels, clear selected state, and stable back paths.",
    recommendation:
      "After route integrity is clean, run manual desktop/mobile walkthroughs for search -> card -> add -> vault -> Dex -> set loops.",
  });

  return findings;
}

async function writeReports(options, universe, crawl, summary, findings) {
  const serializableResults = crawl.results.sort((left, right) => left.pathname.localeCompare(right.pathname));
  const brokenRoutes = serializableResults.filter((result) =>
    ["request_error", "server_error", "not_found", "client_error"].includes(result.classification),
  );
  const slowRoutes = [...serializableResults].filter((result) => result.durationMs > 3000).sort((left, right) => right.durationMs - left.durationMs);
  const report = {
    contract: "WEB_COHESION_LINK_INTEGRITY_V1",
    generated_at: new Date().toISOString(),
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    base_url: options.baseUrl,
    options,
    summary,
    findings,
    broken_routes: brokenRoutes,
    slow_routes: slowRoutes.slice(0, 50),
    route_results: serializableResults,
    link_edges_count: crawl.linkEdges.length,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const lines = [
    "# Web Cohesion Link Integrity V1",
    "",
    `Generated: ${report.generated_at}`,
    `Base URL: ${options.baseUrl}`,
    "",
    "This is a read-only web route, link, and cohesion audit. It performs no DB writes, migrations, cleanup, or apply actions.",
    "",
    "## Summary",
    "",
    `- DB sets in scope: ${summary.totalSetsInDb}`,
    `- DB cards in scope: ${summary.totalCardsInDb}`,
    `- DB species in scope: ${summary.totalSpeciesInDb}`,
    `- Routes visited: ${summary.routesVisited}`,
    `- Canonical set routes tested: ${summary.setRoutesTested}`,
    `- Failed canonical set routes: ${summary.failedSetRoutes}`,
    `- Sampled card routes tested: ${summary.cardRoutesTested}`,
    `- Failed sampled card routes: ${summary.failedCardRoutes}`,
    `- Broken routes: ${summary.brokenRoutes}`,
    `- Dead internal links: ${summary.deadInternalLinks}`,
    `- Warnings: ${summary.warnings}`,
    `- Max pages reached: ${summary.maxPagesReached}`,
    "",
    "## Route Classifications",
    "",
  ];
  for (const [key, value] of Object.entries(summary.byClassification)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("", "## Findings", "");
  for (const finding of findings) {
    lines.push(`### ${finding.severity.toUpperCase()} - ${finding.category}`);
    lines.push("");
    lines.push(finding.finding);
    lines.push("");
    lines.push(`Recommendation: ${finding.recommendation}`);
    if (finding.examples?.length) {
      lines.push("");
      for (const example of finding.examples) {
        lines.push(`- ${example}`);
      }
    }
    lines.push("");
  }

  lines.push("## Broken Routes", "");
  if (brokenRoutes.length === 0) {
    lines.push("No broken routes found in this run.", "");
  } else {
    for (const route of brokenRoutes.slice(0, 100)) {
      lines.push(`- ${route.pathname}: ${route.status || route.error} (${route.category}) sources=${route.sources.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Slowest Routes", "");
  for (const route of slowRoutes.slice(0, 20)) {
    lines.push(`- ${route.pathname}: ${route.durationMs}ms (${route.category})`);
  }
  lines.push("");

  lines.push("## Safety Confirmation", "");
  lines.push("- db_writes_performed: false");
  lines.push("- migrations_created: false");
  lines.push("- cleanup_performed: false");
  lines.push("- mutation_routes_called: false");
  lines.push("");

  await fs.writeFile(OUT_MD, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv);
  const universe = await loadAuditUniverse();
  const seedRoutes = buildSeedRoutes(universe, options);
  console.log(
    `[web-audit] base=${options.baseUrl} sets=${universe.sets.length} cards=${universe.cards.length} species=${universe.species.length} seeds=${seedRoutes.size}`,
  );
  const crawl = await crawlRoutes(options.baseUrl, seedRoutes, options.maxPages, options);
  const summary = summarize(universe, crawl);
  const findings = buildCohesionFindings(summary, crawl);
  await writeReports(options, universe, crawl, summary, findings);
  console.log(JSON.stringify({ summary, report: OUT_MD, json: OUT_JSON }, null, 2));
  if (summary.brokenRoutes > 0 || summary.failedSetRoutes > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[web-cohesion-link-integrity-v1] fatal:", error);
  process.exitCode = 1;
});
