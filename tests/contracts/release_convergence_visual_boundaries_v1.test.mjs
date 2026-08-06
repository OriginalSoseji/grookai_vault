import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("Search results expose the existing exact-version Vault workflow", () => {
  const action = read("apps/web/src/components/explore/ExploreResultActions.tsx");
  const grid = read("apps/web/src/components/explore/ExploreCardGridItem.tsx");
  const list = read("apps/web/src/components/explore/ExploreCardListItem.tsx");
  const details = read("apps/web/src/components/explore/ExploreCardDetailsRow.tsx");
  const cardPage = read("apps/web/src/app/card/[gv_id]/page.tsx");

  assert.match(action, /#vault-actions/);
  assert.match(action, /Choose the exact version and add it to your Vault/);
  assert.doesNotMatch(action, /supabase|insert\(|update\(|fetch\(/i);
  assert.match(grid, /<ExploreResultActions/);
  assert.match(list, /<ExploreResultActions/);
  assert.match(details, /<ExploreResultActions/);
  assert.match(cardPage, /id="vault-actions"/);
  assert.match(cardPage, /<CardPageMarketVaultPanels/);
});

test("Search result hierarchy keeps collector facts visible and diagnostics disclosed", () => {
  const evidence = read("apps/web/src/components/explore/ExploreResultEvidence.tsx");
  const grid = read("apps/web/src/components/explore/ExploreCardGridItem.tsx");
  const list = read("apps/web/src/components/explore/ExploreCardListItem.tsx");
  const details = read("apps/web/src/components/explore/ExploreCardDetailsRow.tsx");
  const search = read("apps/web/src/components/explore/ExplorePageClient.tsx");

  assert.match(evidence, /Why this result/);
  assert.match(evidence, /Exact version ID:/);
  assert.match(grid, /<ExploreResultEvidence/);
  assert.match(list, /<ExploreResultEvidence/);
  assert.match(details, /<ExploreResultEvidence/);
  assert.match(list, /gv-search-result-row-commercial/);
  assert.match(search, /<ProductState/);
  assert.match(search, />\s*Search cards\s*</);
  assert.doesNotMatch(search, /Search collector reality/);
});

test("Card Detail prioritizes collection action before optional context", () => {
  const cardPage = read("apps/web/src/app/card/[gv_id]/page.tsx");
  const styles = read("apps/web/src/app/globals.css");

  assert.match(cardPage, /id="vault-actions" className="order-1/);
  assert.match(cardPage, /gv-variant-story order-2/);
  assert.match(cardPage, /gv-result-evidence order-3/);
  assert.match(cardPage, /text-\[2\.5rem\]/);
  assert.doesNotMatch(cardPage, /lg:text-\[5\.35rem\]/);
  assert.match(styles, /\.gv-card-detail-hero \{/);
  assert.match(styles, /\.gv-card-lower-section \{[\s\S]*?border-top:/);
});

test("shared product states govern root and Binder failure surfaces", () => {
  const state = read("apps/web/src/components/layout/ProductState.tsx");
  const rootError = read("apps/web/src/app/error.tsx");
  const notFound = read("apps/web/src/app/not-found.tsx");
  const binderError = read("apps/web/src/app/binders/error.tsx");
  const vault = read("apps/web/src/components/vault/VaultCollectionView.tsx");

  assert.match(state, /tone\?: "neutral" \| "error" \| "private"/);
  assert.match(state, /role=\{tone === "error" \? "alert" : "status"\}/);
  assert.match(rootError, /<ProductState/);
  assert.match(rootError, /Your collection was not changed/);
  assert.match(notFound, /<ProductState/);
  assert.match(notFound, /old, private, or no longer shared/);
  assert.match(binderError, /<ProductState/);
  assert.match(vault, /<ProductState/);
  assert.doesNotMatch(vault, /Vault could not be loaded right now:/);
});

test("Binder convergence preserves private handoff authority and quiet collector states", () => {
  const library = read("apps/web/src/app/binders/page.tsx");
  const views = read("apps/web/src/components/binders/BinderViews.tsx");
  const invitation = read("apps/web/src/app/binder-invites/review/page.tsx");
  const handoff = read("apps/web/src/app/binder-invites/[inviteToken]/route.ts");
  const response = read("apps/web/src/app/binder-invites/respond/route.ts");

  assert.match(library, /<ProductState/);
  assert.match(views, /aspect-\[5\/7\]/);
  assert.match(views, /<ProductState compact/);
  assert.doesNotMatch(views, /rounded-3xl/);
  assert.match(invitation, /<ProductState/);
  assert.match(invitation, /BINDER_INVITE_TRANSIENT_COOKIE/);
  assert.match(handoff, /httpOnly:\s*true/);
  assert.match(handoff, /sameSite:\s*"lax"/);
  assert.match(response, /BINDER_MUTATION_RPC/);
  assert.match(response, /clearTransientCookie/);
  assert.doesNotMatch(invitation, /name="inviteToken"|value=\{transientState\.token\}/);
});

test("secondary collection tools share recovery states without changing their data authority", () => {
  const compare = read("apps/web/src/app/compare/page.tsx");
  const setResults = read("apps/web/src/components/sets/PublicSetsResults.tsx");

  assert.match(compare, /<ProductState/);
  assert.match(compare, /getPublicCardsByGvIds/);
  assert.match(setResults, /<ProductState/);

  for (const file of [
    "apps/web/src/app/sets/loading.tsx",
    "apps/web/src/app/sets/error.tsx",
    "apps/web/src/app/dex/loading.tsx",
    "apps/web/src/app/dex/error.tsx",
    "apps/web/src/app/compare/loading.tsx",
    "apps/web/src/app/compare/error.tsx",
  ]) {
    assert.ok(read(file).length > 0, `${file} must define a route-local state`);
  }

  assert.doesNotMatch(compare, /insert\(|update\(|delete\(/);
});

test("Messages and Want Matches preserve exact-card context and governed actions", () => {
  const inbox = read("apps/web/src/app/network/inbox/page.tsx");
  const community = read("apps/web/src/components/network/LocalCommunityFeedCard.tsx");
  const interactions = read("apps/web/src/lib/network/getUserCardInteractions.ts");

  assert.match(inbox, /data-card-message-thread/);
  assert.match(inbox, /resolveDisplayIdentity/);
  assert.match(inbox, /<InteractionGroupReplyForm/);
  assert.match(inbox, /<InteractionGroupControls/);
  assert.match(inbox, /<ProductState/);
  assert.match(community, /Want Match/);
  assert.match(community, /viewerWishlistMatch/);
  assert.match(interactions, /cardPrintId/);

  for (const file of [
    "apps/web/src/app/network/inbox/loading.tsx",
    "apps/web/src/app/network/inbox/error.tsx",
  ]) {
    assert.ok(read(file).length > 0, `${file} must define a route-local state`);
  }
});

test("signed-out actions preserve their safe destination without reflecting secret paths", () => {
  const login = read("apps/web/src/app/login/page.tsx");
  const access = read("apps/web/src/lib/auth/routeAccess.ts");

  assert.match(login, /Sign in to \$\{destination\.title\}/);
  assert.match(login, /nextPath === "\/scan"/);
  assert.match(login, /nextPath === "\/network\/inbox"/);
  assert.match(login, /nextPath\.startsWith\("\/vault\/"\)/);
  assert.match(login, /getAuthErrorMessage/);
  assert.doesNotMatch(login, /setError\(err\?\.message|setError\(error\.message/);
  assert.match(access, /isBinderSecretPath/);
  assert.match(access, /buildLoginHref/);
});

test("Scan and import expose bounded recovery without raw backend errors", () => {
  const scan = read("apps/web/src/app/scan/ScanClient.tsx");
  const importer = read("apps/web/src/app/vault/import/ImportClient.tsx");

  assert.match(scan, /No photo is uploaded automatically/);
  assert.match(scan, /choose its exact printing/);
  assert.match(importer, /getImportErrorMessage/);
  assert.match(importer, /Exact card matched/);
  assert.match(importer, /possible exact cards — not imported/);
  assert.doesNotMatch(importer, /setParseError\(error instanceof Error \? error\.message/);

  for (const file of [
    "apps/web/src/app/scan/loading.tsx",
    "apps/web/src/app/scan/error.tsx",
    "apps/web/src/app/vault/import/loading.tsx",
    "apps/web/src/app/vault/import/error.tsx",
  ]) {
    assert.ok(read(file).length > 0, `${file} must define a route-local state`);
  }
});

test("legal privacy support and deletion share the standalone information template", () => {
  const template = read("apps/web/src/components/layout/InformationPage.tsx");
  assert.match(template, /dark:/);
  assert.match(template, /max-w-3xl/);
  assert.match(template, /Information links/);

  for (const file of [
    "apps/web/src/app/legal/page.tsx",
    "apps/web/src/app/privacy/page.tsx",
    "apps/web/src/app/support/page.tsx",
    "apps/web/src/app/account/delete/page.tsx",
  ]) {
    assert.match(read(file), /<InformationPage/);
  }
});

test("Account recovery hides RPC detail and preserves existing write components", () => {
  const account = read("apps/web/src/app/account/page.tsx");
  assert.match(account, /<PublicProfileSettingsForm/);
  assert.match(account, /<WallSectionsSettingsCard/);
  assert.match(account, /Profile settings could not load/);
  assert.match(account, /No account or market data was changed/);
  assert.doesNotMatch(account, /loadError=\{profileError\?\.message/);
  assert.doesNotMatch(account, /Founder Signals are unavailable right now: \{founderSignalsError\}/);
  assert.ok(read("apps/web/src/app/account/loading.tsx").length > 0);
  assert.match(read("apps/web/src/app/account/error.tsx"), /<ProductState/);
});

test("collector card-art surfaces use the canonical five-by-seven frame", () => {
  const files = [
    "apps/web/src/components/cards/PokemonCardGridTile.tsx",
    "apps/web/src/components/explore/ExploreDiscoverySections.tsx",
    "apps/web/src/components/compare/CompareWorkspace.tsx",
    "apps/web/src/components/network/NetworkStreamCard.tsx",
    "apps/web/src/components/public/FeaturedWallSection.tsx",
    "apps/web/src/components/vault/VaultMobileViews.tsx",
    "apps/web/src/app/card/[gv_id]/CardRouteLoading.tsx",
    "apps/web/src/app/card/[gv_id]/page.tsx",
    "apps/web/src/app/dex/[speciesSlug]/page.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /aspect-\[5\/7\]/, `${file} must use the canonical frame`);
    assert.doesNotMatch(source, /aspect-\[3\/4\]/, `${file} retains legacy card geometry`);
  }
});

test("Flutter collector card-art surfaces use the canonical ratio", () => {
  const files = [
    "lib/card_detail_screen.dart",
    "lib/main.dart",
    "lib/screens/vault/vault_gvvi_screen.dart",
    "lib/screens/gvvi/public_gvvi_screen.dart",
    "lib/widgets/card_zoom_viewer.dart",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /aspectRatio: 2\.5 \/ 3\.5/);
  }
});

test("public entry copy avoids internal implementation language", () => {
  const files = [
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/sets/page.tsx",
    "apps/web/src/app/vault/page.tsx",
    "apps/web/src/components/explore/ExplorePageClient.tsx",
    "apps/web/src/components/common/PricingDisclosure.tsx",
    "apps/web/src/components/pricing/CardPagePricingRail.tsx",
  ];
  const internalLanguage = /collector intelligence layer|canonical mapping|reconciled catalog|signed-in canary|image worklist/i;

  for (const file of files) {
    assert.doesNotMatch(read(file), internalLanguage, `${file} leaks internal language`);
  }
});

test("Vault hierarchy preserves family and exact-copy identity boundaries", () => {
  const primitives = read("apps/web/src/components/vault/VaultCardPrimitives.tsx");
  const tile = read("apps/web/src/components/vault/VaultCardTile.tsx");
  const mobile = read("apps/web/src/components/vault/VaultMobileViews.tsx");
  const familyPage = read("apps/web/src/app/vault/card/[cardId]/page.tsx");
  const ownerCopy = read("apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx");
  const publicCopy = read("apps/web/src/app/gvvi/[gvvi_id]/page.tsx");
  const hero = read("apps/web/src/components/vault/VaultExactCopyHero.tsx");

  assert.match(primitives, /Mixed finishes/);
  assert.match(primitives, /Finish assignment needed/);
  assert.match(tile, /data-vault-copy-presentation/);
  assert.match(mobile, /data-vault-copy-presentation/);
  assert.match(tile, /<VaultEvidenceDisclosure/);
  assert.doesNotMatch(tile, /<VaultInsetCard/);
  assert.match(familyPage, /getVaultCopyPresentationSummary/);
  assert.match(ownerCopy, /<VaultExactCopyHero/);
  assert.match(publicCopy, /<VaultExactCopyHero/);
  assert.match(hero, /Exact copy ID:/);
  assert.match(hero, /Finish not selected/);
  assert.match(hero, /aspect-\[5\/7\]/);
});

test("release fixtures cover Vault loaded, empty, private, partial, duplicate, and offline states", () => {
  const fixture = read("apps/web/src/components/visualParity/ReleaseConvergenceScenario.tsx");
  const parity = read("apps/web/tests/parity/release-convergence.spec.ts");

  for (const scenario of [
    "vault-loaded",
    "vault-empty",
    "vault-private",
    "vault-partial-error",
    "vault-duplicate-copy",
    "vault-offline",
    "vault-exact-copy",
  ]) {
    assert.match(fixture, new RegExp(`\\"${scenario}\\"`));
    assert.match(parity, new RegExp(`\\"${scenario}\\"`));
  }
});

test("Pulse and Wall use separate collector-facing presentation grammars", () => {
  const pulse = read("apps/web/src/components/network/NetworkStreamCard.tsx");
  const community = read("apps/web/src/components/network/LocalCommunityFeedCard.tsx");
  const wall = read("apps/web/src/components/public/FeaturedWallSection.tsx");
  const facts = read("apps/web/src/components/collector/CollectorCardPresentation.tsx");

  assert.match(pulse, /data-pulse-event-card/);
  assert.match(pulse, /getActivityLabel/);
  assert.match(pulse, /<CollectorCardFacts/);
  assert.match(pulse, /<CollectorEvidenceDisclosure label="Event evidence">/);
  assert.match(community, /data-pulse-event-card/);
  assert.match(community, /<CollectorCardFacts/);
  assert.match(community, /<CollectorEvidenceDisclosure label="Event evidence">/);
  assert.match(wall, /data-wall-collection-card/);
  assert.match(wall, /data-wall-collection-display/);
  assert.match(wall, /View exact copy/);
  assert.match(wall, /<CollectorCardFacts/);
  assert.match(facts, /data-collector-card-facts/);
  assert.match(facts, /data-collector-evidence/);
  assert.doesNotMatch(facts, /fetch\(|supabase|insert\(|update\(/i);
});

test("collector surfaces disclose internal IDs instead of promoting them", () => {
  const pulse = read("apps/web/src/components/network/NetworkStreamCard.tsx");
  const wall = read("apps/web/src/components/public/FeaturedWallSection.tsx");
  const grid = read("apps/web/src/components/public/PublicCollectionGrid.tsx");
  const profile = read("apps/web/src/components/public/PublicCollectorProfileContent.tsx");

  assert.match(pulse, /CollectorEvidenceDisclosure/);
  assert.match(wall, /CollectorEvidenceDisclosure/);
  assert.match(grid, /CollectorEvidenceDisclosure/);
  assert.match(profile, /CollectorEvidenceDisclosure/);
  assert.doesNotMatch(grid, /footer=\{gvviId/);
  assert.doesNotMatch(profile, /footer=\{exactCopyGvviId/);
});

test("collector state fixtures cover private, blocked, deleted, empty, loading, and partial failure", () => {
  const fixture = read("apps/web/src/components/visualParity/ReleaseConvergenceScenario.tsx");
  const parity = read("apps/web/tests/parity/release-convergence.spec.ts");

  for (const scenario of [
    "pulse-empty",
    "pulse-partial-error",
    "social-loading",
    "wall-private",
    "profile-blocked",
    "profile-deleted",
  ]) {
    assert.match(fixture, new RegExp(`\\"${scenario}\\"`));
    assert.match(parity, new RegExp(`\\"${scenario}\\"`));
  }

  for (const file of [
    "apps/web/src/app/network/loading.tsx",
    "apps/web/src/app/network/error.tsx",
    "apps/web/src/app/wall/loading.tsx",
    "apps/web/src/app/wall/error.tsx",
    "apps/web/src/app/u/[slug]/loading.tsx",
    "apps/web/src/app/u/[slug]/error.tsx",
  ]) {
    assert.ok(read(file).length > 0, `${file} must define a route-local state`);
  }
});

test("social convergence preserves follow, block, message, and public visibility boundaries", () => {
  const profilePage = read("apps/web/src/app/u/[slug]/page.tsx");
  const profileContent = read("apps/web/src/components/public/PublicCollectorProfileContent.tsx");
  const contact = read("apps/web/src/components/network/ContactOwnerButton.tsx");
  const follow = read("apps/web/src/components/public/FollowCollectorButton.tsx");

  assert.match(profilePage, /!profile\.vault_sharing_enabled/);
  assert.match(profilePage, /<FollowCollectorButton/);
  assert.match(profileContent, /<ContactOwnerButton/);
  assert.match(contact, /COLLECTOR_BLOCKED_EVENT/);
  assert.match(contact, /createCardInteractionAction/);
  assert.match(follow, /\/api\/follows\/state/);
  assert.match(follow, /followCollectorAction/);
  assert.match(follow, /unfollowCollectorAction/);
});
