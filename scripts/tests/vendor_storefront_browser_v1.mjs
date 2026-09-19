import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(path.join(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test");
const { tokens, fixture } = JSON.parse(
  fs.readFileSync(
    path.join(root, ".local/storefront/http-fixture.json"),
    "utf8",
  ),
);
const base = "http://127.0.0.1:15440";
const results = [];
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log(`PASS ${name}`);
}
async function api(route, user, body, extra = {}) {
  return fetch(base + route, {
    redirect: "manual",
    headers: {
      ...(user ? { authorization: `Bearer ${tokens[user]}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...extra,
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
}
const browser = await chromium.launch({ headless: true });
try {
  await check(
    "HTTP exact-copy app/web parity, no-store and private redaction",
    async () => {
      const web = await api("/api/stores/test-store"),
        app = await api("/api/stores/test-store/app", "visitor");
      assert.equal(web.status, 200);
      assert.match(web.headers.get("cache-control"), /no-store/);
      const data = await web.json();
      assert.deepEqual((await app.json()).items, data.items);
      assert.equal(data.items.length, 2);
      assert(!JSON.stringify(data).includes("GVVI-FIXTURE-000052"));
      assert(!JSON.stringify(data).includes("owner_id"));
    },
  );
  await check(
    "owner preview isolation, app auth and client-forged capabilities fail closed",
    async () => {
      assert.equal(
        (await api("/api/stores/test-store/preview", "other")).status,
        404,
      );
      assert.equal((await api("/api/stores/test-store/app")).status, 401);
      assert.equal((await api("/api/stores/owner")).status, 401);
      assert.equal(
        (await api("/api/stores/test-store/preview", "owner")).status,
        200,
      );
      assert.equal(
        (
          await api("/api/stores/owner", "other", {
            action: "publish",
            surface: "web",
            publish: true,
            store_web: true,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await api("/api/stores/owner", "owner", {
            action: "publish",
            surface: "web",
            publish: "true",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await api(
            "/api/stores/owner",
            "owner",
            { action: "publish", surface: "web", publish: true },
            { origin: "https://untrusted.invalid" },
          )
        ).status,
        403,
      );
    },
  );
  await check(
    "second owner can configure, select, preview and publish app-only without a web grant",
    async () => {
      assert.equal(
        (
          await api("/api/stores/owner", "other", {
            action: "save",
            slug: "other-store",
            display_name: "Second Owner",
            description: "App-only fixture",
          })
        ).status,
        200,
      );
      assert.equal(
        (await api("/api/stores/other-store/app", "visitor")).status,
        404,
      );
      assert.equal(
        (
          await api("/api/stores/owner", "other", {
            action: "item",
            instance_id: "00000000-0000-4000-8000-000000000053",
            selected: true,
          })
        ).status,
        200,
      );
      const preview = await api("/api/stores/other-store/preview", "other");
      assert.equal(preview.status, 200);
      assert.equal((await preview.json()).items.length, 1);
      assert.equal(
        (await api("/api/stores/other-store/preview", "owner")).status,
        404,
      );
      assert.equal(
        (
          await api("/api/stores/owner", "other", {
            action: "publish",
            surface: "app",
            publish: true,
          })
        ).status,
        200,
      );
      assert.equal(
        (await api("/api/stores/other-store/app", "visitor")).status,
        200,
      );
      assert.equal((await api("/api/stores/other-store")).status, 404);
      await api("/api/stores/owner", "other", {
        action: "publish",
        surface: "app",
        publish: false,
      });
    },
  );
  await check(
    "public web cannot be upgraded to app by request parameter; publication removes next read",
    async () => {
      assert.equal(
        (
          await api("/api/stores/owner", "owner", {
            action: "publish",
            surface: "web",
            publish: false,
          })
        ).status,
        200,
      );
      assert.equal(
        (await api("/api/stores/test-store?surface=app", "visitor")).status,
        404,
      );
      assert.equal(
        (await api("/api/stores/test-store/app", "visitor")).status,
        200,
      );
      assert.equal(
        (await api("/api/stores/test-store/media/logo")).status,
        404,
      );
      assert.equal(
        (
          await api("/api/stores/owner", "owner", {
            action: "publish",
            surface: "web",
            publish: true,
          })
        ).status,
        200,
      );
    },
  );
  await check("client telemetry cannot create referral credit", async () => {
    assert.equal(
      (
        await api("/api/telemetry", "visitor", {
          eventName: "vendor_referred_signup",
          metadata: { vendor_user_id: fixture.owner },
        })
      ).status,
      403,
    );
  });
  await check(
    "private branding upload, preview, public delivery and revocation enforce owner scope",
    async () => {
      const { PNG } = require("pngjs");
      const png = new PNG({ width: 32, height: 32 });
      for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 20;
        png.data[i + 1] = 90;
        png.data[i + 2] = 70;
        png.data[i + 3] = 255;
      }
      const name = `${fixture.storeId}/banner/${crypto.randomUUID()}.png`;
      const upload = (who) =>
        fetch(
          `http://127.0.0.1:15439/storage/v1/object/vendor-store-media/${name}`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${tokens[who]}`,
              "content-type": "image/png",
            },
            body: PNG.sync.write(png),
          },
        );
      assert.equal((await upload("other")).status, 403);
      assert.equal((await upload("owner")).status, 200);
      assert.equal(
        (
          await api("/api/stores/owner", "other", {
            action: "media",
            kind: "banner",
            path: name,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await api("/api/stores/owner", "owner", {
            action: "media",
            kind: "banner",
            path: name,
          })
        ).status,
        200,
      );
      let image = await api("/api/stores/test-store/media/banner");
      assert.equal(image.status, 200);
      assert.equal(image.headers.get("content-type"), "image/png");
      assert.match(image.headers.get("cache-control"), /no-store/);
      await api("/api/stores/owner", "owner", {
        action: "publish",
        surface: "web",
        publish: false,
      });
      assert.equal(
        (await api("/api/stores/test-store/media/banner")).status,
        404,
      );
      assert.equal(
        (
          await api(
            "/api/stores/test-store/media/banner?surface=app",
            "visitor",
          )
        ).status,
        404,
      );
      assert.equal(
        (await api("/api/stores/test-store/app/media/banner", "visitor"))
          .status,
        200,
      );
      assert.equal(
        (await api("/api/stores/test-store/preview/media/banner", "other"))
          .status,
        404,
      );
      assert.equal(
        (await api("/api/stores/test-store/preview/media/banner", "owner"))
          .status,
        200,
      );
      await api("/api/stores/owner", "owner", {
        action: "publish",
        surface: "web",
        publish: true,
      });
    },
  );
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1100 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    await check(
      `${name} browse, copy links, filtering and encrypted referral context`,
      async () => {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          return ["127.0.0.1", "localhost"].includes(url.hostname)
            ? route.continue()
            : route.abort();
        });
        const referral = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/stores/test-store/referral") &&
            r.status() === 200,
        );
        const response = await page.goto(`${base}/store/test-store`, {
          waitUntil: "domcontentloaded",
        });
        assert.equal(response.status(), 200);
        await page
          .getByRole("heading", { name: "Fixture Cards", exact: true })
          .waitFor();
        assert.equal(
          await page.locator('a[href="/gvvi/GVVI-FIXTURE-000050"]').count(),
          1,
        );
        assert.equal(
          await page.locator('a[href="/gvvi/GVVI-FIXTURE-000051"]').count(),
          1,
        );
        assert.equal(
          await page.getByText("GVVI-FIXTURE-000052", { exact: false }).count(),
          0,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
        await referral;
        const cookies = await context.cookies();
        assert(
          cookies.some(
            (c) =>
              c.name === "grookai-gvvi-referral" &&
              c.httpOnly &&
              c.value.startsWith("v2."),
          ),
        );
        await page.screenshot({
          path: path.join(root, `.local/storefront/${name}.png`),
          fullPage: true,
        });
        await page.getByLabel("Search", { exact: true }).fill("NOT-FOUND");
        await page.getByRole("button", { name: "Apply", exact: true }).click();
        await page.getByText("No available collectibles match this view.").waitFor();
        assert.equal(errors.length, 0, errors.join("\n"));
        await context.close();
      },
    );
  }
  await check("preview web auth preserves destination", async () => {
    const response = await api("/store/test-store?preview=1");
    assert([307, 308].includes(response.status));
    const location = new URL(response.headers.get("location"), base);
    assert.equal(location.pathname, "/login");
    assert.equal(
      location.searchParams.get("next"),
      "/store/test-store?preview=1",
    );
  });
} finally {
  await browser.close();
  fs.writeFileSync(
    path.join(root, ".local/storefront/browser-receipt.json"),
    JSON.stringify(
      {
        results,
        createdAt: new Date().toISOString(),
        proof:
          "Next routes and browser against synthetic SQL-backed HTTP adapter, not a full Supabase runtime",
      },
      null,
      2,
    ),
  );
}
