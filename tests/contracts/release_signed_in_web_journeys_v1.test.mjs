import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SOURCE = fs.readFileSync(
  new URL(
    "../../scripts/audits/release_signed_in_web_journeys_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("signed-in audit requires frozen deployment provenance", () => {
  for (const required of [
    "--deployment-sha is required",
    "--verifier-sha is required",
    "--deployment-id is required",
    "--deployment-url is required",
    "SUPABASE_DB_URL is required",
  ]) {
    assert.match(SOURCE, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("credentials remain external and sensitive artifact keys are rejected", () => {
  assert.match(SOURCE, /grookai_release_journey_secrets\.json/);
  assert.match(SOURCE, /credential_source:\s*"external_temporary_file"/);
  assert.match(SOURCE, /assertNoSensitiveArtifactKeys\(runPlan\)/);
  assert.match(SOURCE, /assertNoSensitiveArtifactKeys\(report\)/);
  assert.doesNotMatch(SOURCE, /storageState\s*:/);
});

test("post-authentication browser activity is physically read-only", () => {
  assert.match(SOURCE, /context\.route\("\*\*\/\*"/);
  assert.match(SOURCE, /\["GET",\s*"HEAD",\s*"OPTIONS"\]\.includes\(method\)/);
  assert.match(SOURCE, /route\.abort\("blockedbyclient"\)/);
  assert.match(SOURCE, /post_authentication_non_read_requests_blocked:\s*true/);
  assert.match(SOURCE, /application_writes:\s*false/);
  assert.match(SOURCE, /message_sent:\s*false/);
  assert.doesNotMatch(SOURCE, /getByRole\("button",\s*\{\s*name:\s*\/send\/i\s*\}\)\.click/);
});

test("database reconciliation uses read-only transactions and checks exact truth", () => {
  assert.match(SOURCE, /begin transaction read only/);
  assert.match(SOURCE, /before_after_equal/);
  assert.match(SOURCE, /GV-PK-MEW-025/);
  assert.match(SOURCE, /GVVI-B3591CC8-000001/);
  assert.match(SOURCE, /subject_follows_owner/);
  assert.match(SOURCE, /subject_current_want_is_false/);
  assert.doesNotMatch(SOURCE, /\b(insert|update|delete|truncate)\s+public\./i);
});

test("collector connection and collection-depth surfaces are covered", () => {
  for (const route of [
    "/network/discover",
    "/following",
    "/network",
    "/network/inbox",
    "/vault",
    "/binders",
    "/dex",
    "/sets",
    "/wall",
  ]) {
    assert.match(SOURCE, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(SOURCE, /Message collector/);
  assert.match(SOURCE, /message_submitted:\s*false/);
});

test("narrow and desktop signed-in screenshots are hashed", () => {
  assert.match(SOURCE, /width:\s*390,\s*height:\s*844/);
  assert.match(SOURCE, /width:\s*1440,\s*height:\s*1000/);
  assert.match(SOURCE, /screenshot_sha256/);
  assert.match(SOURCE, /artifact_hashes\.json/);
  assert.match(SOURCE, /imageState/);
});
