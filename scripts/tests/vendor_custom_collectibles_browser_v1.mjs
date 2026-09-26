import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(path.join(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test"),
  sharp = require("sharp");
const { tokens, fixture } = JSON.parse(
  fs.readFileSync(path.join(root, ".local/storefront/http-fixture.json")),
);
const base = "http://127.0.0.1:15440",
  results = [];
const api = (route, user, body, extra = {}) =>
  fetch(base + route, {
    redirect: "manual",
    headers: {
      ...(user ? { authorization: `Bearer ${tokens[user]}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...extra,
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
let product;
async function change(action, data = {}, user = "owner", expected = 200) {
  const response = await api("/api/stores/owner/products", user, {
    id: product?.id ?? null,
    version: product?.version ?? null,
    action,
    data,
  });
  assert.equal(response.status, expected, await response.clone().text());
  if (expected === 200) product = (await response.json()).products[0];
  return response;
}
const productRoute = (audience = "") =>
  `/api/stores/test-store${audience}/products/${product.id}`;
const png = await sharp(
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="600" height="700" fill="#edf0e8"/><ellipse cx="300" cy="574" rx="170" ry="28" fill="#cdd3c6"/><rect x="148" y="168" width="304" height="390" rx="25" fill="#f5cc53"/><rect x="175" y="216" width="250" height="262" rx="12" fill="#fff9df"/><circle cx="300" cy="347" r="85" fill="#e3ae36"/><circle cx="270" cy="335" r="9" fill="#34312d"/><circle cx="330" cy="335" r="9" fill="#34312d"/><path d="M280 375 Q300 392 320 375" stroke="#34312d" stroke-width="6" fill="none"/><text x="300" y="525" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#554922">SYNTHETIC PHOTO FIXTURE</text></svg>',
  ),
)
  .png()
  .toBuffer();
async function upload(name, user = "owner", bytes = png, mime = "image/png") {
  return fetch(
    `http://127.0.0.1:15439/storage/v1/object/vendor-store-media/${name}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokens[user]}`,
        "content-type": mime,
      },
      body: bytes,
    },
  );
}
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log("PASS " + name);
}
const browser = await chromium.launch({ headless: true });
try {
  await check(
    "API draft create, validation, owner isolation and explicit publication",
    async () => {
      assert.equal((await api("/api/stores/owner/products")).status, 401);
      await change("save", {
        title: "Regional boxed figure",
        description:
          "A vendor-described boxed collectible. Photos show the offered item.",
        asking_price_amount: 48,
        available_quantity: 2,
        private_sku: "NEVER-PUBLIC-SKU",
        category: "Figure",
        franchise: "Pokémon",
        release_region: "Japan",
        language: "Japanese",
        condition_description: "Box has light shelf wear.",
        packaging_description: "Original box, as pictured.",
      });
      assert.equal((await api(productRoute())).status, 404);
      assert.equal((await api(productRoute("/preview"), "owner")).status, 200);
      assert.equal((await api(productRoute("/preview"), "other")).status, 404);
      await change("save", { available_quantity: -1 }, "owner", 400);
      await change("save", { title: "Attack" }, "other", 403);
      await change("publish", {}, "owner", 400);
      assert.equal(
        (
          await api(
            "/api/stores/owner/products",
            "owner",
            { id: product.id, version: product.version, action: "publish" },
            { origin: "https://untrusted.invalid" },
          )
        ).status,
        403,
      );
    },
  );
  const photo = `${fixture.storeId}/products/${product.id}/${randomUUID()}.png`;
  const second = `${fixture.storeId}/products/${product.id}/${randomUUID()}.png`;
  await check(
    "photo format, size, owner and product scope enforcement with private drafts",
    async () => {
      assert.equal((await upload(photo, "other")).status, 403);
      assert.equal(
        (await upload(photo.replace(product.id, randomUUID()))).status,
        403,
      );
      assert.equal(
        (
          await upload(
            photo.replace(".png", ".svg"),
            "owner",
            Buffer.from("<svg/>"),
            "image/svg+xml",
          )
        ).status,
        400,
      );
      assert.equal(
        (await upload(photo, "owner", Buffer.alloc(5242881))).status,
        400,
      );
      assert.equal((await upload(photo)).status, 200);
      assert.equal((await upload(second)).status, 200);
      await change("photos", { paths: [photo, second] });
      assert.equal(
        (await api(`${productRoute()}/media/${photo.split("/").at(-1)}`))
          .status,
        404,
      );
      assert.equal(
        (
          await api(
            `${productRoute("/preview")}/media/${photo.split("/").at(-1)}`,
            "owner",
          )
        ).status,
        200,
      );
      await change("photos", { paths: [second, photo] });
      assert.deepEqual(product.photo_paths, [second, photo]);
      await change("sections", {
        section_ids: ["00000000-0000-4000-8000-000000000020"],
      });
      assert.equal(product.published, false);
      await change("publish");
    },
  );
  await check(
    "mixed app/web API parity, counts, filters and redacted custom detail",
    async () => {
      const web = await api("/api/stores/test-store"),
        app = await api("/api/stores/test-store/app", "visitor");
      const data = await web.json();
      assert.match(web.headers.get("cache-control"), /no-store/);
      assert.deepEqual(data.items, (await app.json()).items);
      assert.equal(data.total, 4);
      assert.equal(
        data.items.filter((x) => x.entry_type === "catalog_copy").length,
        2,
      );
      const custom = (await (await api(productRoute())).json()).product;
      assert(!JSON.stringify(custom).includes("NEVER-PUBLIC-SKU"));
      for (const key of [
        "private_sku",
        "photo_paths",
        "version",
        "owner_id",
        "gv_vi_id",
      ])
        assert(!(key in custom));
      assert.equal(
        (await (await api("/api/stores/test-store?kind=custom")).json()).total,
        2,
      );
      assert.equal(
        (await (await api("/api/stores/test-store?q=Regional")).json()).total,
        1,
      );
      const media = await api(
        `${productRoute()}/media/${second.split("/").at(-1)}`,
      );
      assert.equal(media.status, 200);
      assert.match(media.headers.get("cache-control"), /no-store/);
    },
  );
  await check(
    "stale API quantity saves return 409 without overwriting stock",
    async () => {
      const stale = product.version;
      await change("save", { available_quantity: 3 });
      assert.equal(
        (
          await api("/api/stores/owner/products", "owner", {
            id: product.id,
            version: stale,
            action: "save",
            data: { available_quantity: 99 },
          })
        ).status,
        409,
      );
      assert.equal(
        (await (await api(productRoute())).json()).product.available_quantity,
        3,
      );
    },
  );
  await check(
    "removed photos, unpublish, zero stock, hidden store and archive revoke public media",
    async () => {
      const media = () =>
        api(`${productRoute()}/media/${photo.split("/").at(-1)}`);
      await change("photos", { paths: [second] });
      assert.equal((await media()).status, 404);
      await change("photos", { paths: [photo] });
      await change("unpublish");
      assert.equal((await media()).status, 404);
      await change("save", { available_quantity: 4 });
      assert.equal((await api(productRoute())).status, 404);
      await change("publish");
      await change("save", { available_quantity: 0 });
      assert.equal((await media()).status, 404);
      await change("save", { available_quantity: 3 });
      assert.equal(product.published, false);
      await change("publish");
      await api("/api/stores/owner", "owner", {
        action: "publish",
        surface: "web",
        publish: false,
      });
      assert.equal((await media()).status, 404);
      assert.equal(
        (await api(`${productRoute()}?surface=app`, "visitor")).status,
        404,
      );
      assert.equal((await api(productRoute("/app"), "visitor")).status, 200);
      await api("/api/stores/owner", "owner", {
        action: "publish",
        surface: "web",
        publish: true,
      });
    },
  );
  await check(
    "custom preview login preserves complete safe destination",
    async () => {
      const dest = `/store/test-store/products/${product.id}?preview=1`,
        r = await api(dest);
      assert([307, 308].includes(r.status));
      const loc = new URL(r.headers.get("location"), base);
      assert.equal(loc.pathname, "/login");
      assert.equal(loc.searchParams.get("next"), dest);
    },
  );
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1100 }],
    ["mobile", { width: 390, height: 844 }],
  ])
    await check(
      `${name} mixed grid and seller detail render without overflow or script execution`,
      async () => {
        const context = await browser.newContext({ viewport });
        await context.route("**/*", (r) =>
          ["127.0.0.1", "localhost"].includes(
            new URL(r.request().url()).hostname,
          )
            ? r.continue()
            : r.abort(),
        );
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const referral = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/stores/test-store/referral") &&
            r.status() === 200,
        );
        await page.goto(`${base}/store/test-store`);
        await referral;
        await page
          .getByRole("heading", { name: "Available collectibles" })
          .waitFor();
        assert.equal(
          await page.locator('a[href="/gvvi/GVVI-FIXTURE-000050"]').count(),
          1,
        );
        assert.equal(
          await page.locator('a[href="/gvvi/GVVI-FIXTURE-000051"]').count(),
          1,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        const missingPhoto = page.getByRole("img", {
          name: "Vendor photo unavailable",
        });
        await page
          .getByRole("heading", {
            name: "Imported Pikachu figure",
            exact: true,
          })
          .scrollIntoViewIfNeeded();
        await missingPhoto.waitFor();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(localDir(), `custom-grid-${name}.png`),
          fullPage: true,
        });
        await page
          .locator(`a[href="/store/test-store/products/${product.id}"]`)
          .click();
        await page
          .getByRole("heading", { name: "Regional boxed figure" })
          .waitFor();
        await page
          .getByText("Seller-provided details", { exact: true })
          .waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        assert.equal(await page.getByText("NEVER-PUBLIC-SKU").count(), 0);
        assert.equal(await page.locator('a[href*="/gvvi/"]').count(), 0);
        await page.screenshot({
          path: path.join(localDir(), `custom-detail-${name}.png`),
          fullPage: true,
        });
        const cookies = await context.cookies();
        assert(
          cookies.some(
            (c) =>
              c.name === "grookai-gvvi-referral" &&
              c.httpOnly &&
              c.value.startsWith("v2."),
          ),
        );
        await change("save", {
          title: "<script>window.customInjected=true</script>",
        });
        await page.reload();
        assert.equal(
          await page.evaluate(() => window.customInjected),
          undefined,
        );
        await page
          .getByRole("heading", {
            name: "<script>window.customInjected=true</script>",
            exact: true,
          })
          .waitFor();
        await change("save", { title: "Regional boxed figure" });
        assert.deepEqual(errors, []);
        await context.close();
      },
    );
  await check(
    "archived product remains owner-readable and inaccessible to visitors",
    async () => {
      await change("archive");
      assert.equal((await api(productRoute())).status, 404);
      assert.equal(
        (await api(`${productRoute()}/media/${photo.split("/").at(-1)}`))
          .status,
        404,
      );
      assert.equal(
        (
          await (
            await api(`/api/stores/owner/products?id=${product.id}`, "owner")
          ).json()
        ).products[0].archived_at !== null,
        true,
      );
    },
  );
} finally {
  await browser.close();
  fs.writeFileSync(
    path.join(localDir(), "custom-browser-receipt.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        proof:
          "Loopback Next.js + synthetic SQL-backed Auth/Storage adapter; not real Supabase",
        results,
      },
      null,
      2,
    ),
  );
}
function localDir() {
  return path.join(root, ".local/storefront");
}
