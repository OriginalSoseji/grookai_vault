import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  classifyMtgSealedRowsV1,
  loadMtgSealedCatalogV1,
  type MtgSealedClientTransportV1,
} from "./mtgSealedClientV1.ts";
import { createMtgSealedSupabaseTransportV1 } from "./mtgSealedSupabaseTransportV1.ts";

const hash = "a".repeat(64);
const now = new Date("2026-09-04T12:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    price_release_id: "00000000-0000-4000-8000-000000000001",
    image_release_id: "00000000-0000-4000-8000-000000000002",
    family_id: "00000000-0000-4000-8000-000000000003",
    variant_id: "00000000-0000-4000-8000-000000000004",
    game_key: "mtg",
    canonical_name: "Fixture Booster Box",
    package_form: "box",
    language_code: "en",
    region_code: "US",
    edition: null,
    wave: null,
    release_date: "2026-08-01",
    source_provider: "tcgplayer",
    observed_on: "2026-09-03",
    currency: "USD",
    market_price: "125.50",
    image_storage_bucket: "user-card-images",
    image_object_path: `sealed/mtg/sha256/aa/${hash}.jpg`,
    image_content_sha256: hash,
    image_mime: "image/jpeg",
    image_width: 600,
    image_height: 1000,
    image_bytes: 12000,
    ...overrides,
  };
}

test("valid exact self-hosted rows classify as ready", () => {
  const result = classifyMtgSealedRowsV1([row()], now);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.rows[0].marketPrice, 125.5);
    assert.equal(result.rows[0].imageUrl, null);
  }
});

test("stale and future price evidence is withheld", () => {
  assert.equal(classifyMtgSealedRowsV1([
    row({ observed_on: "2026-08-20" }),
  ], now).status, "stale");
  assert.equal(classifyMtgSealedRowsV1([
    row({ observed_on: "2026-09-05" }),
  ], now).status, "stale");
});

test("missing or mismatched self-hosted image evidence is withheld", () => {
  assert.equal(classifyMtgSealedRowsV1([
    row({ image_content_sha256: "b".repeat(64) }),
  ], now).status, "missing_image");
  assert.equal(classifyMtgSealedRowsV1([
    row({ image_object_path: `sealed/mtg/sha256/bb/${hash}.jpg` }),
  ], now).status, "missing_image");
  assert.equal(classifyMtgSealedRowsV1([
    row({ image_mime: "image/png" }),
  ], now).status, "missing_image");
});

test("external image authority and unsupported identity fail closed", () => {
  assert.equal(classifyMtgSealedRowsV1([
    row({ selected_source_url: "https://example.invalid/image.jpg" }),
  ], now).status, "error");
  assert.equal(classifyMtgSealedRowsV1([
    row({ game_key: "pokemon" }),
  ], now).status, "error");
  assert.equal(classifyMtgSealedRowsV1([
    row({ market_price: true }),
  ], now).status, "error");
});

test("hard-disabled loader makes no auth, RPC, or Storage call", async () => {
  let calls = 0;
  const transport: MtgSealedClientTransportV1 = {
    async isAuthenticated() { calls += 1; return true; },
    async fetchRows() { calls += 1; return { data: [row()], error: null }; },
    async createSignedImageUrl() { calls += 1; return "https://example.invalid"; },
  };
  assert.deepEqual(await loadMtgSealedCatalogV1(transport), {
    status: "disabled",
  });
  assert.equal(calls, 0);
});

test("Supabase transport signs through the trusted function without Storage access", async () => {
  let functionCalls = 0;
  let storageCalls = 0;
  const client = {
    functions: {
      async invoke(name: string, options: { body: unknown }) {
        functionCalls += 1;
        assert.equal(name, "mtg-sealed-sign-image-v1");
        assert.deepEqual(options.body, {
          storage_bucket: "user-card-images",
          object_path: `sealed/mtg/sha256/aa/${hash}.jpg`,
        });
        return {
          data: {
            signed_url: "https://example.invalid/signed",
            expires_in: 3600,
          },
          error: null,
        };
      },
    },
    storage: {
      from() {
        storageCalls += 1;
        throw new Error("client Storage access is prohibited");
      },
    },
  } as unknown as SupabaseClient;
  const transport = createMtgSealedSupabaseTransportV1(client);
  const signedUrl = await transport.createSignedImageUrl({
    bucket: "user-card-images",
    objectPath: `sealed/mtg/sha256/aa/${hash}.jpg`,
    expiresInSeconds: 3600,
  });
  assert.equal(signedUrl, "https://example.invalid/signed");
  assert.equal(functionCalls, 1);
  assert.equal(storageCalls, 0);
});
