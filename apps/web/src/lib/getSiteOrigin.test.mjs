import assert from "node:assert/strict";
import test from "node:test";

import { getSiteOrigin, GROOKAI_VAULT_ORIGIN } from "./getSiteOrigin.ts";

const ORIGINAL_NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const ORIGINAL_SITE_URL = process.env.SITE_URL;

function restoreEnvironment() {
  if (ORIGINAL_NEXT_PUBLIC_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_NEXT_PUBLIC_SITE_URL;
  }

  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.SITE_URL;
  } else {
    process.env.SITE_URL = ORIGINAL_SITE_URL;
  }
}

test.afterEach(restoreEnvironment);
test.after(restoreEnvironment);

test("site origin defaults to the canonical apex domain", () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.SITE_URL;

  assert.equal(getSiteOrigin(), "https://grookaivault.com");
  assert.equal(getSiteOrigin(), GROOKAI_VAULT_ORIGIN);
});

test("site origin repairs the non-resolving www production hostname", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.grookaivault.com/";
  delete process.env.SITE_URL;

  assert.equal(getSiteOrigin(), "https://grookaivault.com");
});

test("site origin refuses an unrelated public host from environment configuration", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.invalid/some/path";
  delete process.env.SITE_URL;

  assert.equal(getSiteOrigin(), "https://grookaivault.com");
});

test("site origin preserves loopback origins for local social-image testing", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3137/path?ignored=1";
  delete process.env.SITE_URL;

  assert.equal(getSiteOrigin(), "http://localhost:3137");
});
