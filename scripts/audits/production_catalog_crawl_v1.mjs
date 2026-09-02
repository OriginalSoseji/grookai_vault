import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_ORIGIN = "https://grookaivault.com";
const requireFromWeb = createRequire(path.join(ROOT, "apps", "web", "package.json"));

function argument(name, fallback = "") {
  return (
    process.argv
      .find((entry) => entry.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() || fallback
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function connectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
}

function serviceKey() {
  return process.env.SUPABASE_SECRET_KEY || "";
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || "").replace(/\/$/, "");
}

async function selectSamples() {
  const client = new pg.Client({
    connectionString: connectionString(),
    ssl: /localhost|127\.0\.0\.1/i.test(connectionString())
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '30s'");
    const result = await client.query(`
      with ranked as (
        select
          g.code as game_code,
          cp.gv_id,
          cp.name,
          cp.set_code,
          cp.number,
          row_number() over (
            partition by g.code
            order by
              case when cp.image_url is not null then 0 else 1 end,
              cp.set_code,
              cp.number,
              cp.id
          ) as row_rank
        from public.card_prints cp
        join public.games g on g.id = cp.game_id
        where g.code in ('pokemon', 'one_piece', 'mtg')
          and cp.gv_id is not null
      )
      select game_code, gv_id, name, set_code, number
      from ranked
      where row_rank = 1
      order by game_code
    `);
    await client.query("commit");
    const samples = Object.fromEntries(
      result.rows.map((row) => [row.game_code, row]),
    );
    if (!samples.pokemon || !samples.one_piece || !samples.mtg) {
      throw new Error("Pokemon, One Piece, and MTG samples are required");
    }
    return samples;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function adminRequest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl()}${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey(),
      authorization: `Bearer ${serviceKey()}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return response;
}

async function createTemporaryAccount() {
  const token = randomBytes(12).toString("hex");
  const email = `release-qa-${token}@grookaivault.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const response = await adminRequest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Release QA" },
    }),
  });
  if (!response.ok) {
    throw new Error(`temporary account creation failed with HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload.id) throw new Error("temporary account response did not include an id");
  return { id: payload.id, email, password };
}

async function deleteTemporaryAccount(account) {
  const response = await adminRequest(`/auth/v1/admin/users/${account.id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`temporary account cleanup failed with HTTP ${response.status}`);
  }
  const verify = await adminRequest(`/auth/v1/admin/users/${account.id}`, {
    method: "GET",
  });
  return verify.status === 404;
}

async function establishServerAuthCookies(context, account, origin) {
  const { createServerClient } = requireFromWeb("@supabase/ssr");
  const cookieJar = [];
  const client = createServerClient(
    supabaseUrl(),
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieJar;
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            const index = cookieJar.findIndex((entry) => entry.name === cookie.name);
            if (index >= 0) cookieJar[index] = cookie;
            else cookieJar.push(cookie);
          }
        },
      },
    },
  );
  const { error } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (error) throw new Error(`temporary account sign-in failed: ${error.message}`);
  const hostname = new URL(origin).hostname;
  await context.addCookies(
    cookieJar.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: hostname,
      path: cookie.options?.path || "/",
      httpOnly: Boolean(cookie.options?.httpOnly),
      secure: true,
      sameSite: "Lax",
    })),
  );
  return cookieJar.length;
}

async function visibleImageState(page) {
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll("img")].filter((image) => {
      const rect = image.getBoundingClientRect();
      const style = window.getComputedStyle(image);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    });
    return {
      visible: visible.length,
      loaded: visible.filter((image) => image.complete && image.naturalWidth > 0).length,
      failed: visible.filter((image) => image.complete && image.naturalWidth === 0).length,
      pending: visible.filter((image) => !image.complete).length,
    };
  });
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(700);
}

async function crawlCase(page, origin, runDir, route, viewportName) {
  const pageErrors = [];
  const requestFailures = [];
  const onPageError = (error) => pageErrors.push(sha256(String(error)));
  const onRequestFailed = (request) =>
    requestFailures.push({
      method: request.method(),
      url_sha256: sha256(request.url()),
      failure_sha256: sha256(request.failure()?.errorText ?? "unknown"),
    });
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  try {
    const response = await page.goto(`${origin}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await settle(page);
    const body = await page.locator("body").innerText();
    const imageState = await visibleImageState(page);
    const textAssertions = Object.fromEntries(
      route.expected.map((text) => [text, body.toLowerCase().includes(text.toLowerCase())]),
    );
    const screenshotName = `${viewportName}_${route.name}.png`;
    const screenshot = await page.screenshot({
      path: path.join(runDir, screenshotName),
      fullPage: true,
      animations: "disabled",
    });
    const hardErrorCopy = /application error|internal server error|this page could not be found/i.test(body);
    const passed =
      Boolean(response && response.status() < 400) &&
      Object.values(textAssertions).every(Boolean) &&
      !hardErrorCopy &&
      imageState.failed === 0 &&
      pageErrors.length === 0;
    return {
      name: route.name,
      path: route.path,
      viewport: viewportName,
      http_status: response?.status() ?? null,
      final_path: new URL(page.url()).pathname,
      text_assertions: textAssertions,
      visible_images: imageState,
      page_error_count: pageErrors.length,
      page_error_hashes: pageErrors,
      failed_request_count: requestFailures.length,
      failed_requests: requestFailures,
      screenshot: screenshotName,
      screenshot_sha256: sha256(screenshot),
      status: passed ? "passed" : "failed",
    };
  } finally {
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
  }
}

export function buildProductionCatalogRoutesV1(samples) {
  return [
    {
      name: "pokemon_search",
      path: "/explore?game=pokemon&q=Pikachu",
      expected: ["Pikachu"],
    },
    {
      name: "pokemon_sets",
      path: "/sets?game=pokemon",
      expected: ["Browse Trading Card Sets", "Pokemon"],
    },
    {
      name: "pokemon_card",
      path: `/card/${encodeURIComponent(samples.pokemon.gv_id)}`,
      expected: [samples.pokemon.name, samples.pokemon.set_code],
    },
    {
      name: "one_piece_search",
      path: "/explore?game=one_piece&q=Monkey%20D.%20Luffy",
      expected: ["Monkey D. Luffy"],
    },
    {
      name: "one_piece_sets",
      path: "/sets?game=one_piece",
      expected: ["Browse Trading Card Sets", "One Piece"],
    },
    {
      name: "one_piece_card",
      path: `/card/${encodeURIComponent(samples.one_piece.gv_id)}`,
      expected: [samples.one_piece.name, samples.one_piece.set_code],
    },
    {
      name: "mtg_search",
      path: `/explore?game=mtg&q=${encodeURIComponent(samples.mtg.name)}`,
      expected: [samples.mtg.name],
    },
    {
      name: "mtg_sets",
      path: "/sets?game=mtg",
      expected: ["Browse Trading Card Sets", "Magic"],
    },
    {
      name: "mtg_card",
      path: `/card/${encodeURIComponent(samples.mtg.gv_id)}`,
      expected: [samples.mtg.name, samples.mtg.set_code],
    },
    { name: "vault", path: "/vault", expected: ["Vault"] },
    { name: "binders", path: "/binders", expected: ["Binders"] },
    { name: "wall", path: "/wall", expected: ["Wall"] },
    { name: "pulse", path: "/network", expected: ["Pulse"] },
  ];
}

async function main() {
  const origin = argument("origin", DEFAULT_ORIGIN).replace(/\/$/, "");
  const deploymentSha = argument("deployment-sha");
  const deploymentId = argument("deployment-id");
  const outRoot = path.resolve(
    argument(
      "out-root",
      path.join(ROOT, "artifacts", "release", "production_catalog_crawl_v1"),
    ),
  );
  if (!connectionString()) throw new Error("SUPABASE_DB_URL or DATABASE_URL is required");
  if (!supabaseUrl() || !serviceKey()) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }
  if (!deploymentSha || !deploymentId) {
    throw new Error("deployment SHA and deployment ID are required");
  }

  const runDir = path.join(outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const samples = await selectSamples();
  const routes = buildProductionCatalogRoutesV1(samples);
  const runPlan = {
    audit_version: "PRODUCTION_CATALOG_CRAWL_V1",
    origin,
    deployment_sha: deploymentSha,
    deployment_id: deploymentId,
    started_at: new Date().toISOString(),
    boundaries: {
      temporary_auth_user_only: true,
      app_data_writes: false,
      database_queries: "read_only",
      temporary_user_must_be_deleted: true,
      secrets_in_artifacts: false,
    },
    route_count: routes.length,
    routes: routes.map(({ name, path }) => ({ name, path })),
    samples: Object.fromEntries(
      Object.entries(samples).map(([game, sample]) => [game, {
        gv_id: sample.gv_id,
        name: sample.name,
        set_code: sample.set_code,
        number: sample.number,
      }]),
    ),
  };
  await fs.writeFile(path.join(runDir, "run_plan.json"), `${JSON.stringify(runPlan, null, 2)}\n`);

  let account;
  let cleanupVerified = false;
  let browser;
  let fatalError = null;
  const cases = [];
  try {
    account = await createTemporaryAccount();
    browser = await chromium.launch({ headless: true });
    for (const viewport of [
      { name: "phone", width: 390, height: 844 },
      { name: "desktop", width: 1440, height: 1000 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      const cookieCount = await establishServerAuthCookies(context, account, origin);
      if (cookieCount === 0) throw new Error("server auth did not produce cookies");
      const page = await context.newPage();
      for (const route of routes) {
        cases.push(await crawlCase(page, origin, runDir, route, viewport.name));
      }
      await context.close();
    }
  } catch (error) {
    fatalError = error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (account) {
      try {
        cleanupVerified = await deleteTemporaryAccount(account);
      } catch (cleanupError) {
        fatalError ??= cleanupError;
      }
    }
  }

  const failed = cases.filter((entry) => entry.status !== "passed");
  const summary = {
    audit_version: "PRODUCTION_CATALOG_CRAWL_V1",
    deployment_sha: deploymentSha,
    deployment_id: deploymentId,
    route_case_count: cases.length,
    passed_case_count: cases.length - failed.length,
    failed_case_count: failed.length,
    temporary_account_deleted_and_verified_absent: cleanupVerified,
    app_data_writes: 0,
    fatal_error_sha256: fatalError ? sha256(String(fatalError.stack || fatalError.message)) : null,
    status: failed.length === 0 && cleanupVerified && !fatalError ? "passed" : "failed",
    cases,
  };
  await fs.writeFile(path.join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(
    path.join(runDir, "REPORT.md"),
    `# Production Catalog Crawl V1\n\n- Deployment: \`${deploymentSha}\`\n- Cases: ${summary.passed_case_count}/${summary.route_case_count} passed\n- Temporary account deleted: ${cleanupVerified}\n- App data writes: 0\n- Status: **${summary.status.toUpperCase()}**\n`,
  );
  process.stdout.write(`${JSON.stringify({ ...summary, cases: undefined, artifact_root: path.relative(ROOT, runDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (fatalError) throw new Error(`crawl failed; redacted error hash ${summary.fatal_error_sha256}`);
  if (summary.status !== "passed") process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(`[production-catalog-crawl] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
