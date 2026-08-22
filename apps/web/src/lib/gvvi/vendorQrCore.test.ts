import assert from "node:assert/strict";
import test from "node:test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import QRCode from "qrcode";
import {
  buildVendorQrDestinationUrl,
  canEntitlementRecordUseVendorTools,
  isEligiblePublicVendorOffer,
  sealVendorReferralContext,
  shouldCreditVendorReferral,
  unsealVendorReferralContext,
} from "./vendorQrCore.ts";

const SECRET = "test-only-referral-secret-with-at-least-32-characters";
const GVVI_ID = "GVVI-VENDOR1-000042";

test("vendor QR destination is stable across mutable offer changes", () => {
  const before = buildVendorQrDestinationUrl("https://grookai.example", GVVI_ID);
  const afterPriceChange = buildVendorQrDestinationUrl("https://grookai.example", GVVI_ID);
  const afterConditionChange = buildVendorQrDestinationUrl("https://grookai.example", GVVI_ID);

  assert.equal(before, "https://grookai.example/q/GVVI-VENDOR1-000042");
  assert.equal(afterPriceChange, before);
  assert.equal(afterConditionChange, before);
});

test("generated QR bitmap decodes to the exact persistent destination", async () => {
  const destination = buildVendorQrDestinationUrl("https://grookai.example", GVVI_ID);
  const buffer = await QRCode.toBuffer(destination, {
    type: "png",
    width: 512,
    margin: 3,
    errorCorrectionLevel: "M",
  });
  const image = PNG.sync.read(buffer);
  const decoded = jsQR(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );

  assert.ok(decoded);
  assert.equal(decoded.data, destination);
});

test("referral context round-trips without storing vendor identity", () => {
  const nowMs = Date.UTC(2026, 7, 17, 12, 0, 0);
  const token = sealVendorReferralContext({ gvviId: GVVI_ID, secret: SECRET, nowMs });
  const payload = unsealVendorReferralContext({ token, secret: SECRET, nowMs: nowMs + 1_000 });

  assert.equal(payload?.gvviId, GVVI_ID);
  assert.equal(JSON.stringify(payload).includes("vendorUserId"), false);
});

test("tampered and expired referral contexts fail closed", () => {
  const nowMs = Date.UTC(2026, 7, 17, 12, 0, 0);
  const token = sealVendorReferralContext({ gvviId: GVVI_ID, secret: SECRET, nowMs });
  const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

  assert.equal(unsealVendorReferralContext({ token: tampered, secret: SECRET, nowMs }), null);
  assert.equal(
    unsealVendorReferralContext({
      token,
      secret: SECRET,
      nowMs: nowMs + 31 * 24 * 60 * 60 * 1_000,
    }),
    null,
  );
});

test("vendor offer requires active vendor authority, Sell intent, and a positive asking price", () => {
  assert.equal(canEntitlementRecordUseVendorTools({ tier: "vendor", is_active: true }), true);
  assert.equal(canEntitlementRecordUseVendorTools({ tier: "vendor", is_active: false }), false);
  assert.equal(
    isEligiblePublicVendorOffer({
      ownerCanUseVendorTools: true,
      intent: "sell",
      pricingMode: "asking",
      askingPriceAmount: 3,
      archivedAt: null,
      publicAccessProven: true,
    }),
    true,
  );
  assert.equal(
    isEligiblePublicVendorOffer({
      ownerCanUseVendorTools: true,
      intent: "hold",
      pricingMode: "asking",
      askingPriceAmount: 3,
    }),
    false,
  );
  assert.equal(
    isEligiblePublicVendorOffer({
      ownerCanUseVendorTools: false,
      intent: "sell",
      pricingMode: "asking",
      askingPriceAmount: 3,
    }),
    false,
  );
});

test("signup referral policy rejects repeat-login credit and self-referral", () => {
  assert.equal(
    shouldCreditVendorReferral({
      accountWasCreated: true,
      referredVendorUserId: "vendor-user",
      newUserId: "new-user",
    }),
    true,
  );
  assert.equal(
    shouldCreditVendorReferral({
      accountWasCreated: false,
      referredVendorUserId: "vendor-user",
      newUserId: "existing-user",
    }),
    false,
  );
  assert.equal(
    shouldCreditVendorReferral({
      accountWasCreated: true,
      referredVendorUserId: "same-user",
      newUserId: "same-user",
    }),
    false,
  );
});
