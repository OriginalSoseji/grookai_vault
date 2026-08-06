import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("web shell uses Pulse as the visible network surface label", () => {
  const siteHeader = readSource("apps/web/src/components/layout/SiteHeader.tsx");
  const mobileBottomNav = readSource("apps/web/src/components/layout/MobileBottomNav.tsx");
  const mobileDockPresentation = readSource("apps/web/src/components/mobileParity/MobileParityDock.tsx");
  const layoutFallback = readSource("apps/web/src/app/layout.tsx");
  const shellManifest = readSource("apps/web/src/lib/mobileParity/shellManifest.ts");

  assert.match(siteHeader, /<span>Pulse<\/span>/);
  assert.match(siteHeader, /label: "Pulse", matchHref: "\/network"/);
  assert.match(siteHeader, /\? "Pulse"/);
  assert.match(
    shellManifest,
    /key: "pulse",\s+label: "Pulse",\s+href: "\/network",\s+kind: "root"/,
  );
  assert.match(mobileBottomNav, /MobileParityDock/);
  assert.match(mobileDockPresentation, /MOBILE_PRIMARY_DOCK/);
  assert.match(mobileDockPresentation, /MOBILE_PRIMARY_DOCK\.map/);
  assert.match(layoutFallback, /<MobileBottomNavFallback \/>/);

  for (const source of [siteHeader, mobileBottomNav, mobileDockPresentation, layoutFallback, shellManifest]) {
    assert.doesNotMatch(source, /label: "Feed"/);
    assert.doesNotMatch(source, />Feed</);
    assert.doesNotMatch(source, /\? "Feed"/);
  }
});

test("web visible error copy avoids obsolete feed wording", () => {
  const wallPage = readSource("apps/web/src/app/wall/page.tsx");
  const vaultCollection = readSource("apps/web/src/components/vault/VaultCollectionView.tsx");
  const nearbyPage = readSource("apps/web/src/app/network/nearby/page.tsx");
  const localCommunityHelper = readSource("apps/web/src/lib/network/getLocalCommunityFeedRows.ts");

  assert.match(wallPage, /Activity Window/);
  assert.match(wallPage, /<ProductState/);
  assert.match(wallPage, /Recent collection activity could not be refreshed/);
  assert.doesNotMatch(wallPage, /error\.message/);
  assert.match(vaultCollection, /Recent additions could not be refreshed right now/);
  assert.match(nearbyPage, /Nearby activity is unavailable/);
  assert.match(nearbyPage, /Nearby activity could not load/);
  assert.match(localCommunityHelper, /Local community activity is unavailable/);

  for (const source of [wallPage, vaultCollection, nearbyPage, localCommunityHelper]) {
    assert.doesNotMatch(source, /Feed Window/);
    assert.doesNotMatch(source, /Wall feed could not be loaded/);
    assert.doesNotMatch(source, /Recently added feed could not be loaded/);
    assert.doesNotMatch(source, /Nearby feed is unavailable/);
    assert.doesNotMatch(source, /local feed could not load/i);
    assert.doesNotMatch(source, /Local community feed is unavailable/);
  }
});

test("active product guidance records Pulse in primary navigation", () => {
  const discoveryContract = readSource("docs/contracts/DISCOVERY_FIRST_EXPERIENCE_V1.md");
  const dexContract = readSource("docs/contracts/DEX_CARD_HIERARCHY_POLISH_V1.md");
  const webShellAudit = readSource("docs/audits/ui_cohesion_v1/web_shell_parity_phase1_v1.md");
  const sourceOfTruthAudit = readSource("docs/audits/ui_cohesion_v1/grookai_app_source_of_truth_ui_audit_v1.md");

  for (const source of [discoveryContract, dexContract, webShellAudit, sourceOfTruthAudit]) {
    assert.match(source, /Pulse/);
    assert.doesNotMatch(source, /Search, Feed/);
  }

  assert.match(discoveryContract, /Pulse is the activity and discovery surface/);
  assert.doesNotMatch(discoveryContract, /not renaming surfaces/);
});
