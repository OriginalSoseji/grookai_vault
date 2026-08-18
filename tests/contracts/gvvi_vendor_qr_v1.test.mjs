import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("governed GVVI API routes are tracked release inputs", () => {
  const routePaths = [
    "apps/web/src/app/api/gvvi/[gvvi_id]/qr/route.ts",
    "apps/web/src/app/api/gvvi/[gvvi_id]/vendor-offer/route.ts",
  ];
  const result = spawnSync("git", ["ls-files", "--error-unmatch", "--", ...routePaths], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const routePath of routePaths) {
    assert.match(result.stdout, new RegExp(routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("public QR entry resolves a vendor GVVI and redirects to the canonical public GVVI surface", () => {
  const source = read("apps/web/src/app/q/[gvvi_id]/route.ts");
  assert.match(source, /getPublicVaultInstanceByGvvi\(gvviId\)/);
  assert.match(source, /!detail\?\.isVendorOffer/);
  assert.match(source, /\/gvvi\/\$\{encodeURIComponent\(detail\.gvviId\)\}/);
  assert.match(source, /getSiteOrigin\(\)/);
  assert.doesNotMatch(source, /new URL\([^\n]+request\.url/);
  assert.match(source, /cache-control.*private, no-store/s);
});

test("public vendor truth remains behind existing GVVI privacy and canonical-card gates", () => {
  const source = read("apps/web/src/lib/vault/getPublicVaultInstanceByGvvi.ts");
  assert.match(source, /instance\.archived_at !== null/);
  assert.match(source, /public_profile_enabled/);
  assert.match(source, /vault_sharing_enabled/);
  assert.match(source, /!discoverableIntent && !isSharedOnWall/);
  assert.match(source, /\.from\("card_prints"\)/);
  assert.match(source, /\.from\("user_entitlements"\)/);
  assert.match(source, /admin\.auth\.admin\.getUserById\(ownerUserId\)/);
  assert.match(source, /\.eq\("email", ownerEmail\)/);
  assert.match(source, /canBeVendorOffer\s*\?/);
  assert.match(source, /isEligiblePublicVendorOffer/);
});

test("vendor page distinguishes vendor asking price from market pricing", () => {
  const page = read("apps/web/src/app/gvvi/[gvvi_id]/page.tsx");
  const summary = read("apps/web/src/components/gvvi/VendorOfferSummary.tsx");
  assert.match(page, /detail\.isVendorOffer/);
  assert.match(summary, /Vendor price/i);
  assert.match(summary, /data-price-source="vendor_asking_price"/);
  assert.doesNotMatch(summary, /Market Price|Market Value|Grookai Value|Fair Market Value/);
});

test("QR export is owner-authenticated, vendor-entitled, and read-only", () => {
  const source = read("apps/web/src/app/api/gvvi/[gvvi_id]/qr/route.ts");
  assert.match(source, /client\.auth\.getUser\(\)/);
  assert.match(source, /canUseVendorTools/);
  assert.match(source, /detail\.ownerUserId !== user\.id/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  assert.match(source, /content-type.*image\/svg\+xml/s);
});

test("mobile vendor presentation consumes a bounded public vendor-offer contract", () => {
  const route = read("apps/web/src/app/api/gvvi/[gvvi_id]/vendor-offer/route.ts");
  const screen = read("lib/screens/gvvi/public_gvvi_screen.dart");
  assert.match(route, /getPublicVaultInstanceByGvvi\(gvviId\)/);
  assert.match(route, /!detail\?\.isVendorOffer/);
  assert.match(route, /GVVI_VENDOR_OFFER_PUBLIC_V1/);
  assert.doesNotMatch(route, /ownerUserId|owner_user_id|email/);
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  assert.match(screen, /GvviVendorOfferService\.load/);
  assert.match(screen, /VENDOR PRICE/);
  assert.match(screen, /Vendor QR/);
  assert.doesNotMatch(screen, /showModalBottomSheet/);
  assert.doesNotMatch(screen, /View vendor QR/);
  assert.match(screen, /buildPersistentGvviQrUri/);
});

test("referral cookie stores GVVI context, derives vendor server-side, and blocks self-referral", () => {
  const source = read("apps/web/src/lib/gvvi/vendorReferralAttribution.ts");
  const core = read("apps/web/src/lib/gvvi/vendorQrCore.ts");
  assert.match(source, /getPublicVaultInstanceByGvvi\(context\.gvviId\)/);
  assert.match(source, /shouldCreditVendorReferral/);
  assert.match(core, /referredVendorUserId !== input\.newUserId/);
  assert.doesNotMatch(core, /vendorUserId:\s*string/);
});

test("signup credit is authenticated and telemetry deduplicates referral events", () => {
  const route = read("apps/web/src/app/api/telemetry/route.ts");
  const tracker = read("apps/web/src/lib/telemetry/trackServerEvent.ts");
  assert.match(route, /body\.eventName === "account_created" && !user/);
  assert.match(route, /consumeVendorReferralAttribution/);
  assert.match(tracker, /row\.event_name === "vendor_referred_signup"/);
  assert.match(tracker, /GROOKAI_DISABLE_TELEMETRY === "1"/);
});

test("Wall and QR continue to converge on one public GVVI resource", () => {
  const wallContract = read("docs/contracts/WALL_SECTIONS_SYSTEM_CONTRACT_V1.md");
  const qrRoute = read("apps/web/src/app/q/[gvvi_id]/route.ts");
  assert.match(wallContract, /\/gvvi\/\[gvvi_id\]/);
  assert.match(qrRoute, /\/gvvi\/\$\{encodeURIComponent\(detail\.gvviId\)\}/);
});
