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
    assert.match(
      SOURCE,
      new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
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
  assert.match(SOURCE, /reply_submitted:\s*false/);
  assert.doesNotMatch(
    SOURCE,
    /getByRole\("button",\s*\{\s*name:\s*\/send\/i\s*\}\)\.click/,
  );
});

test("database reconciliation uses read-only transactions and checks exact truth", () => {
  assert.match(SOURCE, /begin transaction read only/);
  assert.match(SOURCE, /before_after_equal/);
  assert.match(SOURCE, /GV-PK-MEW-025/);
  assert.match(SOURCE, /selectJourneyEvidence\(before\)/);
  assert.match(SOURCE, /snapshot\.owner_exact_card\.find/);
  assert.match(SOURCE, /active_owner_exact_copy/);
  assert.doesNotMatch(SOURCE, /GVVI-B3591CC8-000001/);
  assert.match(SOURCE, /subject_follows_owner/);
  assert.match(SOURCE, /subject_current_want_is_false/);
  assert.doesNotMatch(SOURCE, /\b(insert|update|delete|truncate)\s+public\./i);
});

test("active private evidence is discovered without recreating stale fixtures", () => {
  assert.match(SOURCE, /vii\.archived_at is null/);
  assert.match(SOURCE, /publiclyDiscoverable/);
  assert.match(SOURCE, /privateCardAbsence/);
  assert.match(SOURCE, /path:\s*`\/vault\/gvvi\/\$\{evidence\.gvviId\}`/);
  assert.match(
    SOURCE,
    /name:\s*"private_exact_copy"[\s\S]*?evidence\.intentLabel/,
  );
  assert.match(SOURCE, /text_absence_assertions/);
  assert.doesNotMatch(SOURCE, /selectedCopy\?\.intent === "trade"/);
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
    assert.match(
      SOURCE,
      new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.match(SOURCE, /Choose a copy above to message this collector/);
  assert.match(SOURCE, /Reply message/);
  assert.match(SOURCE, /reply_submitted:\s*false/);
  assert.match(SOURCE, /private_message_copy_masked_in_screenshot:\s*true/);
});

test("expanded route coverage uses live canonical evidence and explicit private states", () => {
  assert.match(SOURCE, /setCode:\s*copy\.set_code/);
  assert.match(SOURCE, /const setPath = `\/sets\/\$\{encodeURIComponent\(evidence\.setCode\)\}`/);
  assert.match(SOURCE, /path:\s*"\/explore\?q=Pikachu"/);
  assert.match(SOURCE, /path:\s*"\/compare\?cards=GV-PK-MEW-025%2CGV-PK-MEW-006"/);
  assert.match(SOURCE, /path:\s*"\/dex\/pikachu"/);
  assert.match(SOURCE, /path:\s*"\/binders\/new"/);
  assert.match(SOURCE, /path:\s*"\/binders\/explore"/);
  assert.match(SOURCE, /path:\s*"\/binder-invites\/review"/);
  assert.match(SOURCE, /expectedStatus:\s*evidence\.publiclyDiscoverable \? 200 : 404/);
  assert.match(
    SOURCE,
    /name:\s*"owner_pokemon_collection"[\s\S]*?expectedStatus:\s*200/,
  );
  assert.match(SOURCE, /const expectedStatus = route\.expectedStatus \?\? 200/);
  assert.match(SOURCE, /expected_http_status:\s*expectedStatus/);
});

test("signed-in audit proves authenticated read API contracts", () => {
  assert.match(SOURCE, /async function proveAuthenticatedReadApis/);
  for (const endpoint of [
    "/api/navigation/shell",
    "/api/card-pricing?card_print_id=",
    "/api/follows/state?collector_user_id=",
    "/api/wall/owner-sections?collectorUserId=",
    "/api/health/binders-client-state",
    "/api/public-set-cards?set_code=",
    "/api/resolver/search?q=Pikachu&limit=2",
  ]) {
    assert.match(
      SOURCE,
      new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.match(SOURCE, /method:\s*"GET"/);
  assert.match(SOURCE, /authenticated_read_api_results:\s*authenticatedReadApiResults/);
  assert.match(SOURCE, /authenticatedReadApiFailures\.length === 0/);
  assert.match(SOURCE, /authenticated_read_api_pass_count/);
});

test("search navigation waits for rendered evidence before deciding", () => {
  assert.match(SOURCE, /url\.pathname === "\/explore"/);
  assert.match(SOURCE, /url\.searchParams\.get\("q"\) === "Pikachu"/);
  assert.match(SOURCE, /document\.body\?\.innerText\.toLowerCase/);
  assert.match(SOURCE, /query_visible_in_results:\s*body\.includes\("pikachu"\)/);
});

test("narrow and desktop signed-in screenshots are hashed", () => {
  assert.match(SOURCE, /width:\s*390,\s*height:\s*844/);
  assert.match(SOURCE, /width:\s*1440,\s*height:\s*1000/);
  assert.match(SOURCE, /screenshot_sha256/);
  assert.match(SOURCE, /artifact_hashes\.json/);
  assert.match(SOURCE, /imageState/);
});
