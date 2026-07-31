#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  TCGPLAYER_MARKET_PRODUCT_SURFACE_REGISTRY_V1,
} from "../../backend/pricing/tcgplayer_market_product_surface_registry_v1.mjs";

export const TCGPLAYER_MARKET_WEB_CAPTURE_PLAN_V2 =
  "TCGPLAYER_MARKET_WEB_CAPTURE_PLAN_V2";
export const TCGPLAYER_MARKET_WEB_CAPTURE_MANIFEST_V2 =
  "TCGPLAYER_MARKET_WEB_CAPTURE_MANIFEST_V2";

const WEB_SURFACES = TCGPLAYER_MARKET_PRODUCT_SURFACE_REGISTRY_V1.filter(
  (surface) => surface.client === "web",
);
const WEB_SURFACE_BY_ID = new Map(
  WEB_SURFACES.map((surface) => [surface.surface_id, surface]),
);
const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }
    const [key, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function requiredString(value, label) {
  const normalized = clean(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

export function validateTcgplayerMarketWebCapturePlanV2(plan) {
  const findings = [];
  const surfaces = Array.isArray(plan?.surfaces) ? plan.surfaces : [];
  if (plan?.schema_version !== TCGPLAYER_MARKET_WEB_CAPTURE_PLAN_V2) {
    findings.push("capture_plan_schema_invalid");
  }
  if (!clean(plan?.auth_probe_card_print_id)) {
    findings.push("auth_probe_card_print_id_missing");
  }

  const counts = new Map();
  for (const entry of surfaces) {
    const surfaceId = clean(entry?.surface_id);
    counts.set(surfaceId, (counts.get(surfaceId) ?? 0) + 1);
    if (!WEB_SURFACE_BY_ID.has(surfaceId)) {
      findings.push(`unknown_web_surface:${surfaceId || "missing"}`);
    }
    const route = clean(entry?.route);
    if (!route.startsWith("/") || route.startsWith("//")) {
      findings.push(`surface_route_invalid:${surfaceId || "missing"}`);
    }
    if (
      surfaceId !== "web_private_vault" &&
      !clean(entry?.match_card_print_id)
    ) {
      findings.push(`surface_match_card_print_id_missing:${surfaceId}`);
    }
  }

  for (const surface of WEB_SURFACES) {
    const count = counts.get(surface.surface_id) ?? 0;
    if (count === 0) {
      findings.push(`required_web_surface_missing:${surface.surface_id}`);
    } else if (count !== 1) {
      findings.push(`required_web_surface_duplicated:${surface.surface_id}`);
    }
  }
  if (surfaces.length !== WEB_SURFACES.length) {
    findings.push(
      `web_surface_count_mismatch:${surfaces.length}:${WEB_SURFACES.length}`,
    );
  }
  return Object.freeze({
    status: findings.length === 0 ? "passed" : "failed",
    findings: Object.freeze(findings),
  });
}

export function redactTcgplayerMarketWebRouteV2(surfaceId, rawRoute) {
  const parsed = new URL(rawRoute, "https://pricing-proof.invalid");
  switch (surfaceId) {
    case "web_public_vault":
      return "/u/proof-collector";
    case "web_vault_item":
      return "/vault/gvvi/proof-instance";
    default:
      return `${parsed.pathname}${parsed.search}`;
  }
}

export function buildTcgplayerMarketWebRenderEvidenceV2({
  captureId,
  surface,
  route,
  dataset,
  visibleText,
  capturedAt,
}) {
  const rendered =
    surface.proof_kind === "vault_total"
      ? {
          status: "available",
          vault_market_value_usd: Number(dataset.vaultMarketValueUsd),
          priced_copy_count: Number(dataset.pricedCopyCount),
          unpriced_copy_count: Number(dataset.unpricedCopyCount),
          currency: "USD",
          source_label: clean(dataset.sourceLabel),
          published_at: clean(dataset.publishedAt) || null,
        }
      : {
          status: clean(dataset.pricingStatus),
          pricing_scope: clean(dataset.pricingScope),
          market_close_usd: Number(dataset.marketCloseUsd),
          currency: clean(dataset.currency),
          source_label: clean(dataset.sourceLabel),
          observed_at: clean(dataset.observedAt),
          published_at: clean(dataset.publishedAt),
          provenance_id: clean(dataset.provenanceId),
          is_from_price: dataset.isFromPrice === "true",
        };
  return {
    schema_version: "TCGPLAYER_MARKET_PRODUCT_SURFACE_RENDER_EVIDENCE_V1",
    capture_id: captureId,
    surface_id: surface.surface_id,
    client: "web",
    proof_kind: surface.proof_kind,
    authenticated: true,
    route: redactTcgplayerMarketWebRouteV2(surface.surface_id, route),
    captured_at: capturedAt,
    card_print_id: clean(dataset.cardPrintId) || null,
    card_printing_id: clean(dataset.cardPrintingId) || null,
    rendered,
    visible_text: clean(visibleText),
  };
}

function captureSelector(surface) {
  return surface.proof_kind === "vault_total"
    ? `${surface.capture_selector}[data-vault-market-value-usd]`
    : `${surface.capture_selector}[data-pricing-status="available"]`;
}

async function selectProofLocator(page, surface, planEntry) {
  const locator = page.locator(captureSelector(surface));
  const count = await locator.count();
  const matches = [];
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible())) {
      continue;
    }
    const dataset = await candidate.evaluate((element) => ({
      ...element.dataset,
    }));
    if (
      clean(planEntry.match_card_print_id) &&
      clean(dataset.cardPrintId) !== clean(planEntry.match_card_print_id)
    ) {
      continue;
    }
    if (
      clean(planEntry.match_card_printing_id) &&
      clean(dataset.cardPrintingId) !== clean(planEntry.match_card_printing_id)
    ) {
      continue;
    }
    matches.push({ candidate, dataset });
  }
  if (matches.length !== 1) {
    throw new Error(
      `${surface.surface_id} expected exactly one visible proof element; found ${matches.length}.`,
    );
  }
  return matches[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = new URL(requiredString(args["base-url"], "--base-url"));
  const allowHttpLocalhost = args["allow-http-localhost"] === true;
  if (
    baseUrl.protocol !== "https:" &&
    !(
      allowHttpLocalhost &&
      baseUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(baseUrl.hostname)
    )
  ) {
    throw new Error(
      "--base-url must use HTTPS unless --allow-http-localhost is set for localhost.",
    );
  }

  const deployedCommitSha = requiredString(
    args["deployed-commit-sha"],
    "--deployed-commit-sha",
  ).toLowerCase();
  if (!COMMIT_SHA_PATTERN.test(deployedCommitSha)) {
    throw new Error("--deployed-commit-sha must be a full 40-character SHA.");
  }

  const planPath = path.resolve(
    requiredString(args["route-plan"], "--route-plan"),
  );
  const storageStatePath = path.resolve(
    requiredString(args["storage-state"], "--storage-state"),
  );
  const outDir = path.resolve(requiredString(args["out-dir"], "--out-dir"));
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const planResult = validateTcgplayerMarketWebCapturePlanV2(plan);
  if (planResult.status !== "passed") {
    throw new Error(
      `Route plan failed validation: ${planResult.findings.join(", ")}`,
    );
  }
  await fs.access(storageStatePath);
  await fs.mkdir(path.join(outDir, "captures"), { recursive: true });

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({
    headless: true,
    channel: clean(args.channel) || "chrome",
  });
  const context = await browser.newContext({
    storageState: storageStatePath,
    viewport: { width: 1440, height: 1000 },
  });
  const blockedMutationRequests = [];
  await context.route("**/*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (!SAFE_METHODS.has(method)) {
      blockedMutationRequests.push({
        method,
        url: new URL(route.request().url()).origin,
      });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  const authProbe = new URL("/api/card-pricing", baseUrl);
  authProbe.searchParams.set(
    "card_print_id",
    clean(plan.auth_probe_card_print_id),
  );
  const authResponse = await context.request.get(authProbe.toString());
  if (authResponse.status() !== 200) {
    throw new Error(
      `Signed-in pricing probe failed with HTTP ${authResponse.status()}.`,
    );
  }

  const captures = [];
  try {
    for (const planEntry of plan.surfaces) {
      const surface = WEB_SURFACE_BY_ID.get(planEntry.surface_id);
      const page = await context.newPage();
      const target = new URL(planEntry.route, baseUrl);
      const response = await page.goto(target.toString(), {
        waitUntil: "networkidle",
      });
      if (!response || response.status() >= 400) {
        throw new Error(
          `${surface.surface_id} route failed with HTTP ${response?.status() ?? "unknown"}.`,
        );
      }
      if (new URL(page.url()).pathname.startsWith("/login")) {
        throw new Error(`${surface.surface_id} redirected to login.`);
      }

      const { candidate, dataset } = await selectProofLocator(
        page,
        surface,
        planEntry,
      );
      const capturedAt = new Date().toISOString();
      const captureId = `${surface.surface_id}_${capturedAt.replace(/[:.]/g, "-")}`;
      const screenshotRelative = `captures/${captureId}.png`;
      const evidenceRelative = `captures/${captureId}.render.json`;
      await candidate.screenshot({
        path: path.join(outDir, screenshotRelative),
      });
      const visibleText = await candidate.innerText();
      const evidence = buildTcgplayerMarketWebRenderEvidenceV2({
        captureId,
        surface,
        route: `${target.pathname}${target.search}`,
        dataset,
        visibleText,
        capturedAt,
      });
      await fs.writeFile(
        path.join(outDir, evidenceRelative),
        `${JSON.stringify(evidence, null, 2)}\n`,
      );
      captures.push({
        capture_id: captureId,
        surface_id: surface.surface_id,
        client: "web",
        screenshot_path: screenshotRelative,
        render_evidence_path: evidenceRelative,
      });
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const manifest = {
    schema_version: TCGPLAYER_MARKET_WEB_CAPTURE_MANIFEST_V2,
    deployed_commit_sha: deployedCommitSha,
    environment: clean(args.environment) || "production",
    auth_lane: "authenticated",
    browser_channel: clean(args.channel) || "chrome",
    read_only_network_policy: true,
    blocked_non_read_request_count: blockedMutationRequests.length,
    blocked_non_read_requests: blockedMutationRequests,
    captures,
  };
  await fs.writeFile(
    path.join(outDir, "capture_manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({
      status: "passed",
      capture_count: captures.length,
      capture_manifest: path.join(outDir, "capture_manifest.json"),
    })}\n`,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
