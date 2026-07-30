import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const adapter = source(
  "apps/web/src/lib/search/getUnifiedCollectorVisualSearchV2.ts",
);
const types = source(
  "apps/web/src/lib/search/unifiedCollectorSearchV2.ts",
);
const route = source("apps/web/src/app/api/resolver/search/route.ts");
const corrections = source(
  "apps/web/src/app/api/search/visual/corrections/route.ts",
);
const panel = source(
  "apps/web/src/components/explore/UnifiedCollectorVisualSearchPanel.tsx",
);
const explore = source(
  "apps/web/src/components/explore/ExplorePageClient.tsx",
);
const contract = source(
  "docs/contracts/GROOKAI_UNIFIED_COLLECTOR_SEARCH_V2.md",
);

test("V2 interfaces and five appearance roles are versioned", () => {
  for (const name of [
    "UnifiedCollectorSearchIntentV2",
    "VisualEvidenceAuthorityV2",
    "UnifiedCollectorSearchResponseV2",
  ]) {
    assert.match(types, new RegExp(name));
  }
  for (const role of [
    "scene_subject",
    "depicted_subject",
    "character_representation",
    "curated_association_unresolved",
    "visual_resemblance_reference",
  ]) {
    assert.match(types, new RegExp(role));
  }
});

test("signed-in beta is feature-gated and canonical search remains the fallback", () => {
  assert.match(
    adapter,
    /GROOKAI_UNIFIED_COLLECTOR_SEARCH_V2_ENABLED/,
  );
  assert.match(
    route,
    /visualSearchBetaRequested[\s\S]+auth\.getUser\(\)/,
  );
  assert.match(
    route,
    /visual_search:\s*visualSearch/,
  );
  assert.match(
    explore,
    /visualSearchOwnsResults[\s\S]+UnifiedCollectorVisualSearchPanel/,
  );
  assert.match(contract, /fails closed/iu);
  assert.match(contract, /canonical search available/iu);
  assert.match(adapter, /hasUnsupportedQueryTerms/);
  assert.match(
    adapter,
    /if \(hasUnsupportedQueryTerms\(normalizedQuery, mentions\)\) return null/,
  );
});

test("hard identity roles exclude candidates, unresolved authority, and resemblance", () => {
  assert.match(adapter, /INDEPENDENT_ROLES[\s\S]+scene_subject[\s\S]+depicted_subject/);
  assert.doesNotMatch(
    adapter.match(/const INDEPENDENT_ROLES[\s\S]+?\]\);/)?.[0] ?? "",
    /character_representation|visual_resemblance_reference/,
  );
  assert.match(
    adapter,
    /external exact candidate[\s\S]+approved role unresolved[\s\S]+return null/,
  );
  assert.match(
    adapter,
    /isMultiSubject[\s\S]+INDEPENDENT_ROLES/,
  );
});

test("runtime hydrates governed release assertions without fabricating observations", () => {
  assert.match(adapter, /evidence_assertions/);
  assert.match(adapter, /parseAssertionEvidence/);
  assert.match(
    adapter,
    /human_image_confirmed[\s\S]+external_role_confirmed/,
  );
  assert.doesNotMatch(
    adapter.match(/function parseAssertionEvidence[\s\S]+?\n\}/)?.[0] ?? "",
    /observation_backed/,
  );
});

test("collector UI groups results, explains strict zero, and hides partial catalog results", () => {
  assert.match(panel, /response\.intent\.chips/);
  assert.match(panel, /response\.zeroState\.message/);
  assert.match(panel, /response\.groups\.map/);
  assert.match(panel, /View evidence/);
  assert.match(explore, /!visualSearchOwnsResults[\s\S]+PublicProvisionalSearchSection/);
  assert.match(contract, /does not silently return partial cards/iu);
});

test("signed-in correction actions only call bounded staging intake", () => {
  for (const label of [
    "Character not present",
    "Wrong role",
    "Wrong object",
    "Missing detail",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(corrections, /auth\.getUser\(\)/);
  assert.match(corrections, /submit_card_visual_search_correction_v2/);
  assert.doesNotMatch(
    corrections,
    /card_visual_search_active_release|card_visual_evidence_assertions/,
  );
});

test("V2 runtime has no vector or model bypass path", () => {
  assert.doesNotMatch(
    adapter,
    /embedding|vector|openai|responses\.create/iu,
  );
  assert.match(contract, /Vectors can never prove/);
});
