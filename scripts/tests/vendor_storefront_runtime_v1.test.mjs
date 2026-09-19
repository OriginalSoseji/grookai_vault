import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const require = createRequire(path.join(root, "apps/web/package.json"));
const ts = require("typescript");
test("local test mode rejects remote targets and production activation", () => {
  const staging = pathToFileURL(
    path.join(root, "apps/web/src/lib/collectorStaging.mjs"),
  ).href;
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    const {assertCollectorStagingTarget: check} = await import(${JSON.stringify(staging)});
    check('http://127.0.0.1:15439');
    for(const target of ['https://production.invalid','http://127.0.0.1:54321','http://localhost:15439']) assert.throws(()=>check(target));
    assert.throws(()=>check('http://127.0.0.1:15439',true));
  `,
    ],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_STOREFRONT_LOCAL_TEST: "true",
        NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB: "false",
        NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING: "false",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const config = pathToFileURL(
    path.join(root, "apps/web/next.config.mjs"),
  ).href;
  const rejected = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(config)})`],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_STOREFRONT_LOCAL_TEST: "true",
        NEXT_PUBLIC_COLLECTOR_STAGING: "true",
        VERCEL: "1",
        GROOKAI_DISABLE_TELEMETRY: "1",
      },
      encoding: "utf8",
    },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /isolated local staging/);
});
test("network preload rejects outbound URLs before connecting", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      path.join(root, "scripts/tests/vendor_storefront_network_guard.cjs"),
      "-e",
      "require('node:assert/strict').throws(()=>fetch('https://production.invalid'),/blocked a non-loopback/)",
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
});
function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.join(root, "apps/web/src", relative);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  function localRequire(name) {
    if (name in mocks) return mocks[name];
    if (name === "server-only") return {};
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/")
        ? name.slice(2)
        : path.relative(
            path.join(root, "apps/web/src"),
            path.resolve(path.dirname(filename), name),
          );
      return load(
        target.endsWith(".ts") ? target : `${target}.ts`,
        mocks,
        cache,
      );
    }
    return require(name);
  }
  new Function("require", "module", "exports", output)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
const secret = "local-referral-test-with-more-than-32-characters",
  storeId = "00000000-0000-4000-8000-000000000001";
const core = load("lib/stores/storeReferralCore.ts");
test("store and legacy GVVI contexts roundtrip; tampering, expiry, future timestamps fail", () => {
  const now = Date.now(),
    token = core.sealStoreReferralContext(storeId, secret, now);
  assert.equal(
    core.unsealReferralContext(token, secret, now + 1000).storeId,
    storeId,
  );
  assert.equal(core.unsealReferralContext(token, secret, now - 1), null);
  assert.equal(
    core.unsealReferralContext(token, secret, now + 30 * 86400000),
    null,
  );
  assert.equal(
    core.unsealReferralContext(token + "x", secret, now + 1000),
    null,
  );
  assert.equal(
    core.unsealReferralContext(token, secret + "bad", now + 1000),
    null,
  );
  const legacy = load("lib/gvvi/vendorQrCore.ts").sealVendorReferralContext({
    gvviId: "GVVI-FIXTURE-000001",
    secret,
    nowMs: now,
  });
  assert.equal(
    core.unsealReferralContext(legacy, secret, now + 1000).gvviId,
    "GVVI-FIXTURE-000001",
  );
});
test("tracking signup then referral inserts both event names; repeat deduplicates correctly", async () => {
  const rows = [];
  const admin = {
    from() {
      const filters = {};
      return {
        async insert(row) {
          rows.push(row);
          return { error: null };
        },
        select() {
          return this;
        },
        eq(k, v) {
          filters[k] = v;
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          return {
            data: rows.some((r) =>
              Object.entries(filters).every(([k, v]) => r[k] === v),
            )
              ? { id: "existing" }
              : null,
          };
        },
      };
    },
  };
  const tracker = load("lib/telemetry/trackServerEvent.ts", {
    "@/lib/supabase/admin": { createServerAdminClient: () => admin },
  });
  assert.equal(
    await tracker.trackServerEvent({
      eventName: "account_created",
      userId: "new-user",
    }),
    "inserted",
  );
  assert.equal(
    await tracker.trackServerEvent({
      eventName: "vendor_referred_signup",
      userId: "new-user",
    }),
    "inserted",
  );
  assert.equal(
    await tracker.trackServerEvent({
      eventName: "vendor_referred_signup",
      userId: "new-user",
    }),
    "duplicate",
  );
  assert.equal(rows.length, 2);
});
test("referral consumer uses atomic ledger, never client account-created evidence; failure stays nonblocking", async () => {
  process.env.GVVI_REFERRAL_COOKIE_SECRET = secret;
  let result = "credited",
    calls = 0,
    telemetry = 0;
  const consume = load("lib/gvvi/vendorReferralAttribution.ts", {
    "@/lib/supabase/admin": {
      createServerAdminClient: () => ({
        rpc: async (name, args) => {
          calls++;
          assert.equal(name, "vendor_referral_credit_v1");
          assert.equal(args.p_store_id, storeId);
          assert.equal(args.p_referred_user_id, "new-user");
          if (result === "throw") throw Error("Offline");
          return { data: result, error: null };
        },
      }),
    },
    "@/lib/telemetry/trackServerEvent": {
      trackServerEvent: async () => {
        telemetry++;
      },
    },
    "@/lib/vault/getPublicVaultInstanceByGvvi": {
      getPublicVaultInstanceByGvvi: async () => null,
    },
  }).consumeVendorReferralAttribution;
  const input = {
    request: {
      cookies: {
        get: () => ({ value: core.sealStoreReferralContext(storeId, secret) }),
      },
    },
    response: { cookies: { set() {} } },
    user: { id: "new-user" },
    accountWasCreated: false,
  };
  assert.equal(await consume(input), "credited");
  assert.equal(calls, 1);
  assert.equal(telemetry, 1);
  result = "already_credited";
  assert.equal(await consume(input), "credited");
  assert.equal(telemetry, 1);
  result = "not_new_account";
  assert.equal(
    await consume({ ...input, accountWasCreated: true }),
    "not_new_account",
  );
  result = "throw";
  assert.equal(await consume(input), "credit_failed");
  assert.equal(
    await consume({
      ...input,
      request: { cookies: { get: () => ({ value: "forged" }) } },
    }),
    "invalid_context",
  );
  assert.equal(calls, 4);
});
test("store filter parser keeps bounded pages and never promotes query surface", () => {
  const { storeFilters, storeReadParams } = load(
    "lib/stores/storefrontTypes.ts",
  );
  assert.throws(() => storeFilters(new URLSearchParams("offset=-1")));
  assert.throws(() => storeFilters(new URLSearchParams("offset=Infinity")));
  assert.equal(
    storeReadParams(
      "store",
      "web",
      storeFilters(new URLSearchParams("surface=app&preview=1")),
    ).p_surface,
    "web",
  );
});
test("safe auth destination retains store query and rejects external next paths", () => {
  const { buildLoginHref, getSafePostAuthPath } = load(
    "lib/auth/routeAccess.ts",
  );
  assert.equal(
    new URL(
      buildLoginHref("/store/test-store?preview=1"),
      "http://local",
    ).searchParams.get("next"),
    "/store/test-store?preview=1",
  );
  assert.equal(getSafePostAuthPath("//evil.example/store"), "/vault");
});
