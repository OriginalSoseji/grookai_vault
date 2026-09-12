import assert from "node:assert/strict";
import test from "node:test";

import { getSiteOrigin, GROOKAI_VAULT_ORIGIN } from "./getSiteOrigin.ts";

const ORIGINAL_NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const ORIGINAL_SITE_URL = process.env.SITE_URL;
const ORIGINAL_STAGING = process.env.NEXT_PUBLIC_COLLECTOR_STAGING;
const ORIGINAL_HOSTED = process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING;

function restoreEnvironment() {
  if (ORIGINAL_HOSTED === undefined) delete process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING;
  else process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING = ORIGINAL_HOSTED;
  if (ORIGINAL_STAGING === undefined) delete process.env.NEXT_PUBLIC_COLLECTOR_STAGING;
  else process.env.NEXT_PUBLIC_COLLECTOR_STAGING = ORIGINAL_STAGING;
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

test("authenticated staging never publishes a production share link", () => {
  process.env.NEXT_PUBLIC_COLLECTOR_STAGING = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3167";
  assert.equal(getSiteOrigin(), "http://127.0.0.1:3167");
  for (const origin of ["https://grookaivault.com", "https://example.com", "http://x@127.0.0.1:3167", "http://127.0.0.1:3167/other"]) {
    process.env.NEXT_PUBLIC_SITE_URL = origin;
    assert.throws(() => getSiteOrigin());
  }
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.SITE_URL;
  assert.throws(() => getSiteOrigin());
});

test("hosted staging shares only through its separate protected site", () => {
  process.env.NEXT_PUBLIC_COLLECTOR_STAGING = "true";
  process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "https://grookai-collector-staging.vercel.app";
  assert.equal(getSiteOrigin(), process.env.NEXT_PUBLIC_SITE_URL);
  for(const origin of ["https://grookaivault.com","http://127.0.0.1:3167",
    "https://grookai-collector-staging.vercel.app.evil.test","https://user@grookai-collector-staging.vercel.app"]) {
    process.env.NEXT_PUBLIC_SITE_URL=origin;assert.throws(()=>getSiteOrigin());
  }
});
