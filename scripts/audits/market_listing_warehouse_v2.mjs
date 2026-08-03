import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { buildMarketListingAcquisitionWarehouseBackfillPlanV2 } from "../../backend/pricing/market_listing_acquisition_warehouse_backfill_plan_v2.mjs";
import { buildMarketListingAcquisitionWarehouseFetchV2 } from "../../backend/pricing/market_listing_acquisition_warehouse_fetch_v2.mjs";
import { buildMarketListingAcquisitionWarehousePlanV2 } from "../../backend/pricing/market_listing_acquisition_warehouse_plan_v2.mjs";
import {
  discoverMarketListingProviderCategoriesV2,
  sealedCategoryRouteFromReviewedDiscoveryV2,
} from "../../backend/pricing/market_listing_provider_category_discovery_v2.mjs";
import { buildMarketListingProviderCategoryRegistryV2 } from "../../backend/pricing/market_listing_provider_category_registry_v2.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_ROOT = path.join(REPO_ROOT, "docs", "audits", "market_listing_warehouse_v2");

function argValue(argv, name, fallback = null) {
  return argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
}

function integerArg(argv, name, fallback) {
  const value = Number.parseInt(argValue(argv, name, String(fallback)), 10);
  if (!Number.isFinite(value) || value < 1) throw new Error(`[market-listing-warehouse-v2] --${name} must be a positive integer`);
  return value;
}

function resolveInput(filePath) {
  if (!filePath) throw new Error("[market-listing-warehouse-v2] required input path missing");
  return path.resolve(REPO_ROOT, filePath);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(resolveInput(filePath), "utf8"));
}

function writeJson(filePath, payload) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function targetsFromArtifact(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["targets", "selected_targets", "cards"]) if (Array.isArray(payload?.[key])) return payload[key];
  const bySet = new Map();
  for (const request of payload?.acquisition_requests ?? []) {
    const hints = request?.target_hints ?? {};
    if (!hints.set_code || !hints.set_name) continue;
    bySet.set(hints.set_code, {
      set_code: hints.set_code,
      set_name: hints.set_name,
      release_date: hints.release_date ?? null,
    });
  }
  return [...bySet.values()];
}

async function getAccessToken() {
  if (process.env.EBAY_BROWSE_ACCESS_TOKEN?.trim()) return process.env.EBAY_BROWSE_ACCESS_TOKEN.trim();
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("[market-listing-warehouse-v2] missing eBay credentials");
  const base = (process.env.EBAY_OAUTH_BASE_URL || "https://api.ebay.com").replace(/\/+$/, "");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });
  const response = await fetch(`${base}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) throw new Error(`[market-listing-warehouse-v2] OAuth failed: ${response.status}`);
  const payload = await response.json();
  return payload.access_token;
}

async function run(argv) {
  const mode = argValue(argv, "mode");
  if (!mode) throw new Error("[market-listing-warehouse-v2] --mode is required (taxonomy|registry|plan|fetch|backfill)");
  mkdirSync(AUDIT_ROOT, { recursive: true });

  if (mode === "taxonomy") {
    const outputDir = path.join(AUDIT_ROOT, `taxonomy_${stamp()}`);
    const discovery = await discoverMarketListingProviderCategoriesV2({ accessToken: await getAccessToken() });
    const outputPath = path.join(outputDir, "category_discovery.json");
    writeJson(outputPath, discovery);
    return { mode, output_path: outputPath, summary: { queries: discovery.queries.length, ready_for_human_category_review: discovery.ready_for_human_category_review } };
  }

  if (mode === "registry") {
    const discovery = readJson(argValue(argv, "discovery"));
    const acceptedCategoryIds = argValue(argv, "sealed-category-ids", "").split(",").map((value) => value.trim()).filter(Boolean);
    const sealedRoute = sealedCategoryRouteFromReviewedDiscoveryV2({ discovery, acceptedCategoryIds });
    const registry = buildMarketListingProviderCategoryRegistryV2({
      marketplaceId: discovery.marketplace_id,
      categoryTreeId: discovery.category_tree_id,
      categoryTreeVersion: discovery.category_tree_version,
      sealedRoute,
    });
    const outputPath = path.join(AUDIT_ROOT, `provider_category_registry_${stamp()}.json`);
    writeJson(outputPath, registry);
    return { mode, output_path: outputPath, summary: { ready_for_live_acquisition: registry.ready_for_live_acquisition, routes: registry.routes } };
  }

  if (mode === "plan") {
    const targetArtifact = readJson(argValue(argv, "targets"));
    const categoryRegistry = readJson(argValue(argv, "category-registry"));
    const report = buildMarketListingAcquisitionWarehousePlanV2({
      targets: targetsFromArtifact(targetArtifact),
      categoryRegistry,
      providerCallCeiling: integerArg(argv, "call-ceiling", 4000),
      maxPagesPerFamily: integerArg(argv, "max-pages-per-family", 50),
    });
    const outputPath = path.join(AUDIT_ROOT, `warehouse_plan_${stamp()}.json`);
    writeJson(outputPath, report);
    return { mode, output_path: outputPath, summary: report.summary, findings: report.findings };
  }

  if (mode === "fetch") {
    const warehousePlan = readJson(argValue(argv, "plan"));
    const outputDir = path.join(AUDIT_ROOT, `warehouse_fetch_${stamp()}`);
    const report = await buildMarketListingAcquisitionWarehouseFetchV2({
      warehousePlan,
      artifactDir: outputDir,
      progressEvery: integerArg(argv, "progress-every", 50),
      logger: (line) => console.error(line),
    });
    const outputPath = path.join(outputDir, "summary.json");
    writeJson(outputPath, report);
    return { mode, output_path: outputPath, summary: report.summary, findings: report.findings };
  }

  if (mode === "backfill") {
    const fetchArtifact = readJson(argValue(argv, "fetch"));
    const outputDir = path.join(AUDIT_ROOT, `warehouse_backfill_plan_${stamp()}`);
    const report = await buildMarketListingAcquisitionWarehouseBackfillPlanV2({ fetchArtifact, outputDir });
    const outputPath = path.join(outputDir, "summary.json");
    writeJson(outputPath, report);
    return { mode, output_path: outputPath, summary: report.summary, findings: report.findings };
  }

  throw new Error(`[market-listing-warehouse-v2] unsupported mode: ${mode}`);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  run(process.argv.slice(2))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

export { run as runMarketListingWarehouseV2 };
