import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SOURCE = fs.readFileSync(
  new URL(
    "../../scripts/audits/release_signed_out_web_journeys_v2.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("signed-out release audit uses isolated contexts and fixed breakpoints", () => {
  assert.match(SOURCE, /browser\.newContext/);
  assert.match(SOURCE, /width:\s*390,\s*height:\s*844/);
  assert.match(SOURCE, /width:\s*1440,\s*height:\s*1000/);
  assert.match(SOURCE, /isolated_cookie_free_contexts:\s*true/);
  assert.match(SOURCE, /authenticated_browser_state_accessed:\s*false/);
});

test("Journey A and F routes require collector copy and exact continuation", () => {
  for (const required of [
    "The permanent digital card show.",
    "Sign in to view pricing",
    "Sign in to Scan",
    "Sign in to your Wall",
    "Sign in to your Vault",
    "Sign in to Binders",
    "/login?next=%2Fcard%2FGV-PK-AR-71",
  ]) {
    assert.match(SOURCE, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("the production audit is read-only and hashes visual evidence", () => {
  assert.doesNotMatch(SOURCE, /\.fill\(|\.type\(|\.check\(|\.setChecked\(/);
  assert.doesNotMatch(SOURCE, /\b(insert|update|delete|truncate)\s+public\./i);
  assert.match(SOURCE, /database_writes:\s*false/);
  assert.match(SOURCE, /application_writes:\s*false/);
  assert.match(SOURCE, /screenshot_sha256/);
  assert.match(SOURCE, /artifact_hashes\.json/);
  assert.match(SOURCE, /visibleImageState/);
});

test("signed-out audit proves public, private, image, and lookup API boundaries", () => {
  assert.match(SOURCE, /async function proveSignedOutApiContracts/);
  for (const endpoint of [
    "/api/navigation/shell",
    "/api/card-pricing?card_print_id=",
    "/api/follows/state?collector_user_id=",
    "/api/wall/owner-sections",
    "/api/health/binders-client-state",
    "/api/public-set-cards?set_code=",
    "/api/resolver/search?q=Pikachu&limit=2",
    "/api/canon/cards/GV-PK-MEW-025/image",
    "/api/canon/images",
    "/api/public-set-metadata",
    "/api/network/contact-eligibility",
  ]) {
    assert.match(
      SOURCE,
      new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.match(SOURCE, /expectedStatus:\s*401/);
  assert.match(SOURCE, /api_contract_results:\s*apiContractResults/);
  assert.match(SOURCE, /api_contract_pass_count/);
  assert.doesNotMatch(SOURCE, /\/api\/telemetry/);
  assert.doesNotMatch(SOURCE, /\/api\/assistant\/search-interpretation/);
  assert.doesNotMatch(SOURCE, /\/api\/slabs\/upgrade/);
});

test("deployment provenance is mandatory", () => {
  assert.match(SOURCE, /--deployment-sha is required/);
  assert.match(SOURCE, /--verifier-sha is required/);
  assert.match(SOURCE, /--deployment-id is required/);
  assert.match(SOURCE, /--deployment-url is required/);
});
