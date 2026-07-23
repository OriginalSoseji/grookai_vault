import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("authenticated shell route restores private navigation state without service-role access", () => {
  const route = read("apps/web/src/app/api/navigation/shell/route.ts");
  const chrome = read("apps/web/src/components/layout/AppChrome.tsx");

  assert.match(route, /createRouteHandlerClient\(request, cookieSink\)/);
  assert.match(route, /client\.auth\.getUser\(\)/);
  assert.doesNotMatch(route, /createServerAdminClient|SUPABASE_SECRET_KEY/);
  assert.match(route, /\.from\("public_profiles"\)/);
  assert.match(route, /\.from\("card_interaction_group_states"\)/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(route, /Vary: "Cookie"/);
  assert.match(route, /response\.cookies\.set\(cookie\)/);
  assert.match(route, /wallHref: slug && profile\?\.public_profile_enabled \? `\/u\/\$\{slug\}` : "\/wall"/);
  assert.match(chrome, /wallHref: "\/wall"/);
  assert.match(chrome, /currentRequestVersion === requestVersion/);
});

test("follow state route derives the viewer from verified cookies and queries only that viewer's row", () => {
  const route = read("apps/web/src/app/api/follows/state/route.ts");

  assert.match(route, /client\.auth\.getUser\(\)/);
  assert.doesNotMatch(route, /createServerAdminClient|SUPABASE_SECRET_KEY/);
  assert.match(route, /UUID_PATTERN\.test\(collectorUserId\)/);
  assert.match(route, /\.eq\("follower_user_id", user\.id\)/);
  assert.match(route, /\.eq\("followed_user_id", collectorUserId\)/);
  assert.match(route, /\{ isFollowing: false, error: "Sign in required\." \}[\s\S]*401/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
});

test("message failure stays in the modal and the dialog owns keyboard and focus behavior", () => {
  const button = read("apps/web/src/components/network/ContactOwnerButton.tsx");
  const portalIndex = button.indexOf("createPortal(");
  const alertIndex = button.indexOf('role="alert"', portalIndex);

  assert.ok(portalIndex > -1, "contact dialog portal must exist");
  assert.ok(alertIndex > portalIndex, "message failure alert must render inside the portal");
  assert.match(button, /statusMessage\?\.tone === "success"/);
  assert.match(button, /ref=\{textareaRef\}/);
  assert.match(button, /ref=\{errorRef\}/);
  assert.match(button, /aria-live="assertive"/);
  assert.match(button, /aria-invalid=\{statusMessage\?\.tone === "error"\}/);
  assert.match(button, /event\.key !== "Tab"/);
  assert.match(button, /document\.body\.style\.overflow = "hidden"/);
  assert.match(button, /triggerElement\.focus\(\)/);
  assert.match(button, /submissionLockRef\.current/);
});

test("contact controls fail closed while Pulse retains bounded batched eligibility", () => {
  const route = read("apps/web/src/app/api/network/contact-eligibility/route.ts");
  const provider = read("apps/web/src/components/network/ContactEligibilityProvider.tsx");
  const page = read("apps/web/src/app/network/page.tsx");
  const button = read("apps/web/src/components/network/ContactOwnerButton.tsx");
  const controls = read("apps/web/src/components/trust/TrustSafetyControls.tsx");

  assert.match(route, /client\.auth\.getUser\(\)/);
  assert.match(route, /\.from\("v_card_contact_targets_v1"\)/);
  assert.doesNotMatch(route, /createServerAdminClient|trust_block_exists_between_v1/);
  assert.match(route, /payload\.targets\.length > MAX_TARGETS/);
  assert.match(route, /const MAX_TARGETS = 100/);
  assert.match(route, /CONTACTABLE_INTENTS/);
  assert.match(route, /\.select\("vault_item_id,card_print_id,intent"\)/);
  assert.match(page, /<ContactEligibilityProvider targets=\{contactEligibilityTargets\}>/);
  assert.match(provider, /fetch\("\/api\/network\/contact-eligibility"/);
  assert.match(provider, /createContext<ContactEligibilityContextValue \| null>\(null\)/);
  assert.match(provider, /targets: \[\s*\{\s*vaultItemId: normalizedVaultItemId,\s*cardPrintId: normalizedCardPrintId/s);
  assert.match(provider, /requestedTargetKey/);
  assert.match(provider, /key === requestedTargetKey/);
  assert.match(provider, /new AbortController\(\)/);
  assert.match(provider, /requestVersionRef\.current !== requestVersion/);
  assert.match(provider, /eligibilityResult\?\.requestKey !== currentRequestKey/);
  assert.match(provider, /COLLECTOR_BLOCKED_EVENT/);
  assert.match(controls, /dispatchCollectorBlocked\(reportedUserId\)/);
  assert.match(button, /contactEligibilityContext === null/);
  assert.match(button, /useSingletonContactEligibility/);
  assert.match(button, /viewer\.hasCheckedSession\s*\? viewer\.isAuthenticated\s*: isAuthenticated/);
  assert.match(button, /if \(!effectiveIsAuthenticated\)[\s\S]*Sign in to message[\s\S]*if \(contactEligibility !== true\)/);
  assert.doesNotMatch(button, /contactEligibility === false/);
});

test("message action sanitizes invalidation paths and reports a confirmed committed message accurately", () => {
  const action = read("apps/web/src/lib/network/createCardInteractionAction.ts");

  assert.match(action, /function normalizeReturnPath/);
  assert.match(action, /normalized\.startsWith\("\/\/"\)/);
  assert.match(action, /normalized\.includes\("\\\\"\)/);
  assert.match(action, /if \(ownerWriteResult\.ok\) \{\s*revalidateInteractionPaths\(returnPath\);/s);
  assert.match(action, /committedInteractionId = inserted\.id/);
  assert.match(action, /interaction_signal_written/);
  assert.match(action, /post-write verification failed after commit/);
  assert.match(action, /return buildSuccessResult\(submissionKey, committedInteractionId, target\.owner_display_name\)/);
  assert.doesNotMatch(action, /revalidatePath\("\/", "layout"\)/);
});

test("canonical interaction fallback is limited to RLS drift and re-proves authorization", () => {
  const helper = read("apps/web/src/lib/network/insertCardInteraction.ts");
  const createAction = read("apps/web/src/lib/network/createCardInteractionAction.ts");
  const replyAction = read("apps/web/src/lib/network/replyToCardInteractionGroupAction.ts");

  assert.match(helper, /primary\.error/);
  assert.match(helper, /error\?\.code === "42501"/);
  assert.match(helper, /row-level security\|row level security/);
  assert.match(helper, /authorization\.kind === "public-target"/);
  assert.match(helper, /hasExistingThreadAuthorization/);
  assert.match(helper, /CONTACTABLE_INTENTS\.has\(data\.intent\)/);
  assert.match(helper, /trust_block_exists_between_v1/);
  assert.match(helper, /return error \? true : data !== false/);
  assert.match(helper, /adminClient[\s\S]*\.from\("card_interactions"\)[\s\S]*\.insert\(payload\)/);
  assert.match(createAction, /authorization: \{ kind: "public-target" \}/);
  assert.match(createAction, /CONTACTABLE_INTENTS\.has\(target\.intent\)/);
  assert.match(replyAction, /authorization: \{ kind: "existing-thread" \}/);
  assert.match(replyAction, /interaction_signal_written/);
  assert.match(replyAction, /post-write verification failed after commit/);
  assert.doesNotMatch(replyAction, /revalidatePath\("\/", "layout"\)/);
});
