import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "RELEASE_SIGNED_OUT_WEB_JOURNEYS_V2";
const DEFAULT_ORIGIN = "https://grookaivault.com";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "release",
  "signed_out_web_journeys_v2",
);

const VIEWPORTS = Object.freeze([
  { name: "narrow", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]);

const ROUTES = Object.freeze([
  {
    name: "home",
    path: "/",
    finalPath: "/",
    expectedText: [
      "The permanent digital card show.",
      "Explore cards",
      "Search the details collectors care about.",
    ],
  },
  {
    name: "card",
    path: "/card/GV-PK-AR-71",
    finalPath: "/card/GV-PK-AR-71",
    expectedText: [
      "Pikachu",
      "Sign in to view pricing",
      "Choose the exact version before adding it to your vault.",
      "Sign in to add",
    ],
  },
  {
    name: "network",
    path: "/network",
    finalPath: "/network",
    expectedText: ["Pulse"],
  },
  {
    name: "scan",
    path: "/scan",
    finalPath: "/login?next=%2Fscan",
    expectedText: ["Sign in to Scan"],
  },
  {
    name: "wall",
    path: "/wall",
    finalPath: "/login?next=%2Fwall",
    expectedText: ["Sign in to your Wall"],
  },
  {
    name: "vault",
    path: "/vault",
    finalPath: "/login?next=%2Fvault",
    expectedText: ["Sign in to your Vault"],
  },
  {
    name: "binders",
    path: "/binders",
    finalPath: "/login?next=%2Fbinders",
    expectedText: ["Sign in to Binders"],
  },
  {
    name: "privacy",
    path: "/privacy",
    finalPath: "/privacy",
    expectedText: ["Privacy", "support@grookaivault.com"],
  },
  {
    name: "terms",
    path: "/legal",
    finalPath: "/legal",
    expectedText: ["Terms"],
  },
  {
    name: "support",
    path: "/support",
    finalPath: "/support",
    expectedText: ["Support", "support@grookaivault.com"],
  },
  {
    name: "account_deletion",
    path: "/account/delete",
    finalPath: "/account/delete",
    expectedText: ["Delete", "support@grookaivault.com"],
  },
]);

function value(argv, name) {
  return (
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? ""
  );
}

function parseArgs(argv) {
  return {
    origin: (value(argv, "origin") || DEFAULT_ORIGIN).replace(/\/$/, ""),
    deploymentSha: value(argv, "deployment-sha"),
    verifierSha: value(argv, "verifier-sha"),
    deploymentId: value(argv, "deployment-id"),
    deploymentUrl: value(argv, "deployment-url"),
    outRoot: path.resolve(value(argv, "out-root") || DEFAULT_OUT_ROOT),
    requirePass: argv.includes("--require-pass"),
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizedPath(candidate) {
  const parsed = new URL(candidate);
  return `${parsed.pathname}${parsed.search}`;
}

async function visibleImageState(page) {
  return page.evaluate(() => {
    const images = [...document.querySelectorAll("img")];
    const visible = images.filter((image) => {
      const rect = image.getBoundingClientRect();
      const style = window.getComputedStyle(image);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    });
    return {
      visible_count: visible.length,
      loaded_count: visible.filter(
        (image) => image.complete && image.naturalWidth > 0,
      ).length,
      failed_count: visible.filter(
        (image) => image.complete && image.naturalWidth === 0,
      ).length,
      pending_count: visible.filter((image) => !image.complete).length,
    };
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  let networkIdle = true;
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    networkIdle = false;
  }
  return networkIdle;
}

async function runRoute(page, route, viewport, origin, runDir) {
  const pageErrors = [];
  const failedRequests = [];
  const onPageError = (error) => pageErrors.push(sha256(String(error)));
  const onRequestFailed = (request) =>
    failedRequests.push({
      method: request.method(),
      url_sha256: sha256(request.url()),
      failure_sha256: sha256(request.failure()?.errorText ?? "unknown"),
    });
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  let response;
  try {
    response = await page.goto(`${origin}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const networkIdle = await settle(page);
    const bodyText = await page.locator("body").innerText();
    const textAssertions = Object.fromEntries(
      route.expectedText.map((expected) => [
        expected,
        bodyText.includes(expected),
      ]),
    );
    const finalPath = normalizedPath(page.url());
    const imageState = await visibleImageState(page);
    const screenshotName = `${viewport.name}_${route.name}.png`;
    const screenshot = await page.screenshot({
      path: path.join(runDir, screenshotName),
      fullPage: true,
      animations: "disabled",
    });
    const passed =
      response !== null &&
      response.status() < 400 &&
      finalPath === route.finalPath &&
      Object.values(textAssertions).every(Boolean) &&
      imageState.failed_count === 0 &&
      pageErrors.length === 0;
    return {
      viewport: viewport.name,
      route: route.path,
      final_path: finalPath,
      expected_final_path: route.finalPath,
      http_status: response?.status() ?? null,
      network_idle: networkIdle,
      text_assertions: textAssertions,
      visible_images: imageState,
      page_error_count: pageErrors.length,
      page_error_hashes: pageErrors,
      failed_request_count: failedRequests.length,
      failed_requests: failedRequests,
      screenshot: screenshotName,
      screenshot_sha256: sha256(screenshot),
      status: passed ? "passed" : "failed",
    };
  } finally {
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
  }
}

async function runPersonalAction(page, viewport, origin, runDir) {
  const cardPath = "/card/GV-PK-AR-71";
  await page.goto(`${origin}${cardPath}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  const action = page.getByRole("link", { name: "Sign in to add", exact: true });
  const actionCount = await action.count();
  if (actionCount === 1) {
    await Promise.all([
      page.waitForURL("**/login?next=**", { timeout: 30_000 }),
      action.click(),
    ]);
  }
  await settle(page);
  const finalPath = normalizedPath(page.url());
  const expectedFinalPath = "/login?next=%2Fcard%2FGV-PK-AR-71";
  const bodyText = await page.locator("body").innerText();
  const screenshotName = `${viewport.name}_card_personal_action.png`;
  const screenshot = await page.screenshot({
    path: path.join(runDir, screenshotName),
    fullPage: true,
    animations: "disabled",
  });
  const passed =
    actionCount === 1 &&
    finalPath === expectedFinalPath &&
    bodyText.includes("Sign in to Grookai Vault");
  return {
    viewport: viewport.name,
    action: "add_exact_card",
    source_path: cardPath,
    action_count: actionCount,
    final_path: finalPath,
    expected_final_path: expectedFinalPath,
    continuation_copy_visible: bodyText.includes("Sign in to Grookai Vault"),
    screenshot: screenshotName,
    screenshot_sha256: sha256(screenshot),
    status: passed ? "passed" : "failed",
  };
}

function markdown(report) {
  const rows = report.route_results.map(
    (result) =>
      `| ${result.viewport} | \`${result.route}\` | \`${result.final_path}\` | ${result.status} | ${result.visible_images.failed_count} |`,
  );
  const actionRows = report.personal_action_results.map(
    (result) =>
      `| ${result.viewport} | ${result.action} | \`${result.final_path}\` | ${result.status} |`,
  );
  return `${[
    "# Final-Candidate Signed-Out Web Journeys V2",
    "",
    `- Status: \`${report.status}\``,
    `- Production origin: \`${report.run_plan.origin}\``,
    `- Deployment SHA: \`${report.run_plan.deployment_sha}\``,
    `- Verifier SHA: \`${report.run_plan.verifier_sha}\``,
    `- Deployment ID: \`${report.run_plan.deployment_id}\``,
    `- Cookie/storage state: \`new isolated contexts\``,
    "",
    "## Routes",
    "",
    "| Viewport | Requested | Final | Status | Broken visible images |",
    "| --- | --- | --- | --- | ---: |",
    ...rows,
    "",
    "## Personal Action Continuation",
    "",
    "| Viewport | Action | Final | Status |",
    "| --- | --- | --- | --- |",
    ...actionRows,
    "",
    "## Boundaries",
    "",
    "- No authenticated browser state was read or changed.",
    "- No database or application mutation was performed.",
    "- Each viewport used a new cookie-free browser context.",
    "- Screenshots and summary artifacts are SHA-256 hashed.",
    "",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.deploymentSha) throw new Error("--deployment-sha is required");
  if (!args.verifierSha) throw new Error("--verifier-sha is required");
  if (!args.deploymentId) throw new Error("--deployment-id is required");
  if (!args.deploymentUrl) throw new Error("--deployment-url is required");

  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const runPlan = {
    audit_version: AUDIT_VERSION,
    created_at: new Date().toISOString(),
    origin: args.origin,
    deployment_sha: args.deploymentSha,
    verifier_sha: args.verifierSha,
    deployment_id: args.deploymentId,
    deployment_url: args.deploymentUrl,
    viewports: VIEWPORTS,
    routes: ROUTES.map(({ name, path: routePath, finalPath }) => ({
      name,
      path: routePath,
      expected_final_path: finalPath,
    })),
    boundaries: {
      isolated_cookie_free_contexts: true,
      authenticated_browser_state_accessed: false,
      database_writes: false,
      application_writes: false,
    },
  };
  await fs.writeFile(
    path.join(runDir, "run_plan.json"),
    `${JSON.stringify(runPlan, null, 2)}\n`,
  );

  const browser = await chromium.launch({ headless: true });
  const routeResults = [];
  const personalActionResults = [];
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "dark",
        locale: "en-US",
        timezoneId: "America/Denver",
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      for (const route of ROUTES) {
        routeResults.push(
          await runRoute(page, route, viewport, args.origin, runDir),
        );
      }
      personalActionResults.push(
        await runPersonalAction(page, viewport, args.origin, runDir),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const failures = [
    ...routeResults.filter((result) => result.status !== "passed"),
    ...personalActionResults.filter((result) => result.status !== "passed"),
  ];
  const report = {
    audit_version: AUDIT_VERSION,
    as_of: new Date().toISOString(),
    status: failures.length === 0 ? "passed" : "failed",
    completion_allowed: failures.length === 0,
    run_plan: runPlan,
    summary: {
      route_case_count: routeResults.length,
      route_pass_count: routeResults.length -
        routeResults.filter((result) => result.status !== "passed").length,
      personal_action_case_count: personalActionResults.length,
      personal_action_pass_count: personalActionResults.length -
        personalActionResults.filter((result) => result.status !== "passed").length,
      failure_count: failures.length,
    },
    route_results: routeResults,
    personal_action_results: personalActionResults,
    boundaries: runPlan.boundaries,
  };
  const files = {
    "summary.json": `${JSON.stringify(report, null, 2)}\n`,
    "REPORT.md": markdown(report),
  };
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(runDir, name), contents);
  }
  const artifactNames = (await fs.readdir(runDir)).sort();
  const artifactHashes = {};
  for (const name of artifactNames) {
    artifactHashes[name] = sha256(await fs.readFile(path.join(runDir, name)));
  }
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(artifactHashes, null, 2)}\n`,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        status: report.status,
        completion_allowed: report.completion_allowed,
        summary: report.summary,
        artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
      },
      null,
      2,
    )}\n`,
  );
  if (args.requirePass && !report.completion_allowed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[release-signed-out-web] ${error.stack || error.message}`);
  process.exitCode = 1;
});
