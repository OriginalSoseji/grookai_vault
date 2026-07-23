import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const webSrc = path.resolve(here, "../..");
const webRoot = path.resolve(webSrc, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(webSrc, relativePath), "utf8");
const nodeRequire = createRequire(import.meta.url);
const testRequire = (specifier) =>
  specifier === "server-only" ? {} : nodeRequire(specifier);

const loadTypeScriptModule = (relativePath, globals = {}) => {
  const source = read(relativePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const testModule = { exports: {} };
  vm.runInNewContext(
    `(function (exports, module) { ${output}\n})(testModule.exports, testModule);`,
    {
      testModule,
      URL,
      Buffer,
      process,
      require: testRequire,
      ...globals,
    },
    { filename: relativePath },
  );
  return testModule.exports;
};

const requiredRoutes = [
  "app/binders/page.tsx",
  "app/binders/[publicId]/page.tsx",
  "app/b/viewToken-placeholder",
  "app/binder-invites/inviteToken-placeholder",
  "app/binders/explore/page.tsx",
  "app/binder-templates/templateId-placeholder",
];

test("Collaborative Binders web route contract exists", () => {
  const concreteRoutes = requiredRoutes.map((route) =>
    route
      .replace("b/viewToken-placeholder", "b/[viewToken]/page.tsx")
      .replace(
        "binder-invites/inviteToken-placeholder",
        "binder-invites/[inviteToken]/route.ts",
      )
      .replace(
        "binder-templates/templateId-placeholder",
        "binder-templates/[templateId]/page.tsx",
      ),
  );
  for (const route of concreteRoutes) {
    assert.equal(fs.existsSync(path.join(webSrc, route)), true, route);
  }
});

test("authorized iOS universal links cover Binder routes without claiming Android App Links", () => {
  const associationPath = path.join(
    webRoot,
    "public/.well-known/apple-app-site-association",
  );
  const association = JSON.parse(fs.readFileSync(associationPath, "utf8"));
  const paths = association.applinks.details[0].paths;
  for (const authorizedPath of [
    "/binders",
    "/binders/*",
    "/b/*",
    "/binder-invites/*",
    "/binder-templates/*",
  ]) {
    assert.ok(paths.includes(authorizedPath), authorizedPath);
  }
  assert.equal(
    fs.existsSync(path.join(webRoot, "public/.well-known/assetlinks.json")),
    false,
    "Android HTTPS App Links remain unclaimed until a certificate fingerprint is authorized",
  );
});

test("all nine release gates fail closed and require literal true", () => {
  const flags = read("lib/binders/featureFlags.ts");
  assert.match(flags, /value\?\.trim\(\)\.toLowerCase\(\) === "true"/);
  for (const name of [
    "SCHEMA_RPC",
    "PERSONAL",
    "SHARED",
    "VIEW_LINKS",
    "PUBLIC",
    "COMMUNITY",
    "TEMPLATES",
    "NOTIFICATIONS",
    "PULSE_SHARING",
  ]) {
    assert.match(flags, new RegExp(`GROOKAI_BINDERS_${name}_V1_ENABLED`));
  }
  assert.doesNotMatch(flags, /\?\?\s*true/);
});

test("later Binder release gates stay unavailable until every prerequisite is on", () => {
  const makeFlags = (env) =>
    loadTypeScriptModule("lib/binders/featureFlags.ts", {
      process: { env },
    }).getBinderFeatureFlags();
  const laterGates = {
    GROOKAI_BINDERS_SHARED_V1_ENABLED: "true",
    GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED: "true",
    GROOKAI_BINDERS_PUBLIC_V1_ENABLED: "true",
    GROOKAI_BINDERS_COMMUNITY_V1_ENABLED: "true",
    GROOKAI_BINDERS_TEMPLATES_V1_ENABLED: "true",
    GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED: "true",
    GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED: "true",
    GROOKAI_BINDERS_SET_V1_ENABLED: "true",
    GROOKAI_BINDERS_CUSTOM_V1_ENABLED: "true",
  };

  assert.deepEqual(
    { ...makeFlags(laterGates) },
    {
      schemaRpc: false,
      personal: false,
      shared: false,
      viewLinks: false,
      publicBinders: false,
      community: false,
      templates: false,
      notifications: false,
      pulseSharing: false,
      setBinders: false,
      customBinders: false,
    },
    "schema-off keeps every phase dark even when later environment values are true",
  );

  const schemaOnly = makeFlags({
    ...laterGates,
    GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED: "true",
  });
  assert.equal(schemaOnly.schemaRpc, true);
  for (const [name, enabled] of Object.entries(schemaOnly)) {
    if (name !== "schemaRpc") assert.equal(enabled, false, name);
  }

  const personalWithoutShared = makeFlags({
    ...laterGates,
    GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED: "true",
    GROOKAI_BINDERS_PERSONAL_V1_ENABLED: "true",
    GROOKAI_BINDERS_SHARED_V1_ENABLED: "false",
  });
  assert.equal(personalWithoutShared.publicBinders, true);
  assert.equal(personalWithoutShared.templates, true);
  assert.equal(personalWithoutShared.viewLinks, false);
  assert.equal(personalWithoutShared.community, false);
  assert.equal(personalWithoutShared.notifications, false);
});

test("web uses only the locked Binder RPC family and never raw Binder tables", () => {
  const contract = read("lib/binders/rpcContract.ts");
  const actions = read("lib/binders/actions.ts");
  const reads = read("lib/binders/rpc.ts");
  for (const rpc of [
    "binder_dashboard_v1",
    "binder_invitation_inbox_v1",
    "binder_suspended_binders_v1",
    "binder_detail_v1",
    "binder_checklist_v1",
    "binder_pending_contributions_v1",
    "binder_activity_v1",
    "binder_members_v1",
    "binder_join_requests_queue_v1",
    "binder_eligible_copies_v1",
    "binder_invitation_preview_v1",
    "binder_public_detail_v1",
    "binder_view_link_detail_v1",
    "binder_explore_v1",
    "binder_template_detail_v1",
    "binder_templates_v1",
    "binder_create_v1",
    "binder_invite_respond_v1",
    "binder_report_v1",
    "binder_block_owner_v1",
    "binder_block_member_v1",
    "binder_public_action_report_v1",
    "binder_public_member_block_v1",
  ]) {
    assert.match(contract, new RegExp(`"${rpc}"`), rpc);
  }
  assert.doesNotMatch(`${actions}\n${reads}`, /\.from\(\s*["']binder/);
  assert.doesNotMatch(actions, /service[_-]?role|createServerAdminClient/i);
  assert.match(actions, /requireServerUser/);
});

test("secret routes are no-referrer, private no-store, noindex, and analytics-free", () => {
  const middleware = read("middleware.ts");
  const analytics = read("components/analytics/SafeAnalytics.tsx");
  const actions = read("lib/binders/actions.ts");
  const inviteHandoff = read("app/binder-invites/[inviteToken]/route.ts");
  const inviteReview = read("app/binder-invites/review/page.tsx");
  const inviteResponse = read("app/binder-invites/respond/route.ts");
  const view = read("app/b/[viewToken]/page.tsx");
  assert.match(middleware, /Cache-Control", "private, no-store, max-age=0"/);
  assert.match(middleware, /Referrer-Policy", "no-referrer"/);
  assert.match(middleware, /X-Robots-Tag", "noindex, nofollow, noarchive"/);
  assert.match(middleware, /redactBinderSecretPath\(request\.nextUrl\.pathname\)/);
  assert.match(analytics, /beforeSend=\{\(event\) =>/);
  assert.match(analytics, /sanitizeBinderAnalyticsUrl\(event\.url\)/);
  assert.match(analytics, /isBinderSecretPath\(url\.pathname\)/);
  assert.match(analytics, /new URL\(nextValue, "https:\/\/grookaivault\.com"\)\.pathname/);
  assert.match(analytics, /return `\$\{url\.origin\}\$\{url\.pathname\}`/);
  assert.doesNotMatch(
    `${inviteHandoff}\n${inviteReview}\n${inviteResponse}\n${view}`,
    /login\?next=/,
  );
  assert.match(inviteReview, /never saved in the login destination/i);
  assert.match(view, /showTrustSafety=\{false\}/);
  assert.match(view, /No Binder details were disclosed/i);
  assert.match(
    view,
    /checklistPageHref=\{[\s\S]*`\?cursor=\$\{encodeURIComponent\(binder\.checklistNextCursor\)\}`/,
  );
  assert.doesNotMatch(
    view,
    /checklistPageHref=\{[\s\S]{0,240}params\.viewToken/,
    "pagination HTML does not repeat the raw view capability",
  );
  assert.doesNotMatch(
    actions,
    /mutate\([\s\S]{0,300}`\/binder-invites\/\$\{encodeURIComponent\(token\)\}`/,
  );

  const { isBinderSecretPath, redactBinderSecretPath } = loadTypeScriptModule(
    "lib/binders/safePath.ts",
  );
  for (const mixedCasePath of [
    "/B/raw-view-token",
    "/Binder-Invites/raw-invite-token",
    "/b/RAW-view-token",
  ]) {
    assert.equal(isBinderSecretPath(mixedCasePath), true, mixedCasePath);
    assert.doesNotMatch(redactBinderSecretPath(mixedCasePath), /raw|token/i);
  }
});

test("invitation URL bearer terminates before React and never enters form/action serialization", () => {
  const handoff = read("app/binder-invites/[inviteToken]/route.ts");
  const review = read("app/binder-invites/review/page.tsx");
  const response = read("app/binder-invites/respond/route.ts");
  const state = read("lib/binders/invitationHandoff.ts");
  const actions = read("lib/binders/actions.ts");
  const routeAccess = read("lib/auth/routeAccess.ts");

  assert.equal(
    fs.existsSync(
      path.join(webSrc, "app/binder-invites/[inviteToken]/page.tsx"),
    ),
    false,
    "the raw-token segment is a redirect-only Route Handler, never a React page",
  );
  assert.match(handoff, /sealBinderInviteTransientState\(params\.inviteToken\)/);
  assert.match(handoff, /new URL\(BINDER_INVITE_REVIEW_PATH, request\.url\)/);
  assert.match(handoff, /httpOnly:\s*true/);
  assert.match(handoff, /sameSite:\s*"lax"/);
  assert.match(handoff, /Referrer-Policy", "no-referrer"/);
  assert.doesNotMatch(handoff, /NextResponse\.(?:json|next)\([^)]*inviteToken/);

  assert.match(
    review,
    /getBinderInvitationPreview\([\s\S]*transientState\.token/,
  );
  assert.match(
    review,
    /action=\{BINDER_INVITE_RESPONSE_PATH\} method="post"/,
  );
  assert.doesNotMatch(review, /\.bind\(/);
  assert.doesNotMatch(review, /name=["'](?:invite)?token["']/i);
  assert.doesNotMatch(review, /value=\{transientState\.token\}/);
  assert.doesNotMatch(
    actions,
    /export async function (?:accept|decline|report)BinderInvitationAction/,
  );

  assert.match(response, /isTrustedBinderInvitePost\(/);
  assert.match(response, /request\.headers\.get\("origin"\)/);
  assert.match(response, /request\.headers\.get\("sec-fetch-site"\)/);
  assert.match(response, /binderInviteCsrfMatches\(/);
  assert.match(response, /p_token:\s*transientState\.token/);
  assert.match(response, /p_idempotency_key:\s*idempotencyKey/);
  assert.match(response, /clearTransientCookie\(response, request\)/);
  assert.match(response, /operation === "report"[\s\S]*invitation-reported/);
  assert.doesNotMatch(response, /[?&](?:invite)?token=/i);
  assert.doesNotMatch(response, /console\.(?:log|warn|error|info)/);

  assert.match(state, /createCipheriv\("aes-256-gcm"/);
  assert.match(state, /createDecipheriv\("aes-256-gcm"/);
  assert.match(state, /BINDER_INVITE_TRANSIENT_TTL_SECONDS = 15 \* 60/);
  assert.match(routeAccess, /isTokenFreeInvitationReview/);
  assert.match(routeAccess, /parsed\.pathname === "\/binder-invites\/review"/);
});

test("invitation transient state is confidential, authenticated, expiring, and fail-closed", () => {
  const {
    BINDER_INVITE_TRANSIENT_TTL_SECONDS,
    binderInviteCsrfMatches,
    isTrustedBinderInvitePost,
    sealBinderInviteTransientState,
    unsealBinderInviteTransientState,
  } = loadTypeScriptModule("lib/binders/invitationHandoff.ts");
  const secret = "binder-invite-test-key-".repeat(3);
  const token =
    "invite_capability_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdef";
  const nowMs = 1_800_000_000_000;
  const sealed = sealBinderInviteTransientState(token, { secret, nowMs });

  assert.doesNotMatch(sealed, new RegExp(token));
  const opened = unsealBinderInviteTransientState(sealed, { secret, nowMs });
  assert.equal(opened?.token, token);
  assert.equal(opened?.expiresAt - opened?.issuedAt, BINDER_INVITE_TRANSIENT_TTL_SECONDS);
  assert.equal(binderInviteCsrfMatches(opened.csrf, opened.csrf), true);
  assert.equal(binderInviteCsrfMatches(opened.csrf, `${opened.csrf}x`), false);

  const tampered = `${sealed.slice(0, -1)}${sealed.endsWith("A") ? "B" : "A"}`;
  assert.equal(
    unsealBinderInviteTransientState(tampered, { secret, nowMs }),
    null,
    "AES-GCM authentication rejects any cookie modification",
  );
  assert.equal(
    unsealBinderInviteTransientState(sealed, {
      secret: `${secret}wrong`,
      nowMs,
    }),
    null,
    "a cookie from another key or deployment fails closed",
  );
  assert.equal(
    unsealBinderInviteTransientState(sealed, {
      secret,
      nowMs: nowMs + BINDER_INVITE_TRANSIENT_TTL_SECONDS * 1000,
    }),
    null,
    "expiry is enforced at the exact boundary",
  );
  assert.equal(
    unsealBinderInviteTransientState("not-a-sealed-state", { secret, nowMs }),
    null,
  );
  assert.throws(
    () =>
      sealBinderInviteTransientState(token, {
        secret: "too-short",
        nowMs,
      }),
    (error) =>
      Boolean(error) &&
      typeof error.message === "string" &&
      !error.message.includes(token) &&
      /unavailable/i.test(error.message),
  );

  const trustedPost = {
    origin: "https://grookaivault.com",
    expectedOrigin: "https://grookaivault.com",
    localRequestOrigin: null,
    secFetchSite: "same-origin",
    contentType: "application/x-www-form-urlencoded",
  };
  assert.equal(isTrustedBinderInvitePost(trustedPost), true);
  assert.equal(
    isTrustedBinderInvitePost({ ...trustedPost, origin: null }),
    false,
  );
  assert.equal(
    isTrustedBinderInvitePost({
      ...trustedPost,
      origin: "https://attacker.example",
    }),
    false,
  );
  assert.equal(
    isTrustedBinderInvitePost({
      ...trustedPost,
      secFetchSite: "cross-site",
    }),
    false,
  );
  assert.equal(
    isTrustedBinderInvitePost({
      ...trustedPost,
      contentType: "application/json",
    }),
    false,
  );
});

test("auth navigation rejects secret Binder destinations", () => {
  const routeAccess = read("lib/auth/routeAccess.ts");
  const login = read("app/login/page.tsx");
  const google = read("components/GoogleSignInButton.tsx");
  const callback = read("app/auth/callback/route.ts");
  assert.match(routeAccess, /isBinderSecretPath/);
  for (const source of [login, google, callback]) {
    assert.match(source, /getSafePostAuthPath/);
  }
  assert.doesNotMatch(google, /redirectTo\.searchParams\.set\("next"/);

  const safePathModule = loadTypeScriptModule("lib/binders/safePath.ts");
  const authRoutes = loadTypeScriptModule("lib/auth/routeAccess.ts", {
    require: (specifier) =>
      specifier === "@/lib/binders/safePath"
        ? safePathModule
        : testRequire(specifier),
  });
  assert.equal(
    authRoutes.getSafePostAuthPath("/binder-invites/review"),
    "/binder-invites/review",
    "the token-free transient review can survive sign-in",
  );
  assert.equal(
    authRoutes.buildLoginHref("/binder-invites/review"),
    "/login?next=%2Fbinder-invites%2Freview",
  );
  assert.equal(
    authRoutes.getSafePostAuthPath(
      "/binder-invites/raw-invitation-capability",
    ),
    "/vault",
    "a canonical bearer route is never stored as next",
  );
  assert.equal(
    authRoutes.getSafePostAuthPath("/binder-invites/review?token=raw"),
    "/vault",
    "query-bearing lookalikes remain rejected",
  );
});

test("public/link parsers enforce a second allow-list", () => {
  const reads = read("lib/binders/rpc.ts");
  const publicSafety = read("lib/binders/publicSafety.ts");
  assert.match(reads, /function parsePublicChecklistSlot/);
  assert.match(reads, /inYourVault: false/);
  assert.match(reads, /contributedByYou: false/);
  assert.match(reads, /contributions: \[\]/);
  assert.match(reads, /contributionPublicId: null/);
  assert.match(reads, /parsePublicContributionActions/);
  assert.match(publicSafety, /\.slice\(0, 20\)/);
  assert.match(publicSafety, /opaqueUuid\(action\.contribution_action_ref\)/);
  assert.match(publicSafety, /opaqueUuid\(action\.member_action_ref\)/);
  assert.match(publicSafety, /identityVisible &&/);
  assert.match(
    reads,
    /checklist: checklistItems[\s\S]*\.slice\(0, 50\)[\s\S]*parsePublicChecklistSlot\(item, audience\)/,
  );
  assert.match(reads, /parsePublicProjection\(detail, checklist, "link"\)/);
  assert.match(
    reads,
    /audience === "public"[\s\S]*parsePublicContributionActions/,
  );
  assert.match(
    reads,
    /audience === "public"[\s\S]*can_request_to_join/,
  );
  assert.match(
    reads,
    /audience === "public"[\s\S]*can_block_owner/,
  );
  assert.match(
    reads,
    /list\(item\.contributors\)[\s\S]*\.slice\(0, 20\)[\s\S]*alias\.trim\(\)\.slice\(0, 40\)/,
    "public contributor attribution is bounded and identity-consent aware",
  );
  assert.match(
    reads,
    /canBlockOwner:[\s\S]*audience === "public"[\s\S]*boolean\(field\(permissions, "can_block_owner"\)\)/,
    "public owner blocking is rendered only from the explicit server permission",
  );
});

test("external Binder images accept only Grookai canonical proxy URLs", () => {
  const { safeCanonicalBinderImageUrl } = loadTypeScriptModule(
    "lib/binders/publicSafety.ts",
  );
  const canonicalPath = "/api/canon/cards/GV-ME04-001/image";
  assert.equal(safeCanonicalBinderImageUrl(canonicalPath), canonicalPath);
  assert.equal(
    safeCanonicalBinderImageUrl(`https://grookaivault.com${canonicalPath}`),
    `https://grookaivault.com${canonicalPath}`,
  );

  for (const hostile of [
    "https://provider.example/card.png",
    "http://grookaivault.com/api/canon/cards/GV-ME04-001/image",
    "https://www.grookaivault.com/api/canon/cards/GV-ME04-001/image",
    "https://grookaivault.com.evil.example/api/canon/cards/GV-ME04-001/image",
    "https://user:pass@grookaivault.com/api/canon/cards/GV-ME04-001/image",
    "https://grookaivault.com:444/api/canon/cards/GV-ME04-001/image",
    "https://grookaivault.com/api/canon/cards/GV-ME04-001/image?next=evil",
    "https://grookaivault.com/api/canon/cards/GV-ME04-001/image#secret",
    "/api/canon/cards/%2e%2e/image",
    "/api/canon/cards/GV-ME04-001%2f..%2fsecret/image",
    "//grookaivault.com/api/canon/cards/GV-ME04-001/image",
    "https://localhost/api/canon/cards/GV-ME04-001/image",
  ]) {
    assert.equal(safeCanonicalBinderImageUrl(hostile), null, hostile);
  }

  const reads = read("lib/binders/rpc.ts");
  assert.ok(
    (reads.match(/safeCanonicalBinderImageUrl\(/g) ?? []).length >= 3,
    "public/link cards, Binder covers, and Template covers share the validator",
  );
  assert.match(reads, /parsePublicChecklistSlot\(item, "template"\)/);
});

test("external Binder projections remain bounded if an RPC regresses", () => {
  const reads = read("lib/binders/rpc.ts");
  assert.match(reads, /function boundedString\(/);
  assert.match(reads, /function boundedNullableString\(/);
  assert.match(
    reads,
    /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/,
  );
  assert.match(reads, /Number\.isSafeInteger\(value\)/);
  assert.match(
    reads,
    /publicId: opaqueUuid\(field\(binder, "public_id"\)\) \?\? ""/,
  );
  assert.match(reads, /title: boundedString\(binder\.title, "Binder", 80\)/);
  assert.match(
    reads,
    /description: boundedNullableString\(binder\.description, 1000\)/,
  );
  assert.match(
    reads,
    /list\(record\(value\)\.items\)[\s\S]*\.slice\(0, 20\)[\s\S]*\.map\(parseTemplateSummary\)/,
  );
  assert.match(reads, /items: list\(envelope\.items\)[\s\S]*\.slice\(0, 20\)/);
  assert.match(
    reads,
    /const parsed = decodeCursor<\{[\s\S]*beforeId: string;[\s\S]*beforeCreatedAt: string;/,
  );
  assert.match(reads, /p_limit: 20/);
  assert.match(
    reads,
    /Number\.isSafeInteger\(value\)[\s\S]*value >= 0[\s\S]*value <= 1_000_000/,
  );
  assert.match(
    reads,
    /binder\.moderated === true[\s\S]*binder\.moderation_approved === true/,
  );
  assert.match(
    reads,
    /\.filter\([\s\S]{0,160}item\.listed && item\.moderated/,
  );
  assert.match(
    reads,
    /binderTitle: boundedNullableString\(binder\.title, 80\)/,
  );
  assert.match(
    reads,
    /privacyCopy: boundedString\([\s\S]*1000/,
  );
  assert.match(
    reads,
    /state === "active"[\s\S]*\? state[\s\S]*: "ineligible"/,
    "unknown invitation states fail closed",
  );
});

test("public safety controls fail closed for anonymous, stale, malformed, and hidden identities", () => {
  const { parsePublicContributionActions } = loadTypeScriptModule(
    "lib/binders/publicSafety.ts",
  );
  const validContributionRef = "106a4510-59ac-4a3e-95b9-38da2b2ca417";
  const validMemberRef = "2f6a9ad8-82cb-44cc-8243-93538f80df77";

  assert.equal(
    parsePublicContributionActions(undefined).length,
    0,
    "anonymous projections have no action rows or controls",
  );
  assert.equal(
    parsePublicContributionActions([
      {
        permissions: { can_report: true, can_block: true },
      },
    ]).length,
    0,
    "stale rows with omitted refs produce no controls",
  );
  assert.equal(
    parsePublicContributionActions([
      {
        contribution_action_ref: "not-a-binder-ref",
        member_action_ref: "also-not-a-binder-ref",
        permissions: { can_report: true, can_block: true },
      },
    ]).length,
    0,
    "malformed refs produce no controls",
  );
  assert.equal(
    parsePublicContributionActions([
      {
        contribution_action_ref: validContributionRef,
        member_action_ref: validMemberRef,
        permissions: { can_report: false, can_block: false },
      },
    ]).length,
    0,
    "permissionless refs produce no controls",
  );
  assert.deepEqual(
    parsePublicContributionActions([
      {
        contribution_action_ref: validContributionRef,
        member_action_ref: validMemberRef,
        alias: "Private collector name",
        identity_visible: false,
        permissions: { can_report: true, can_block: true },
      },
    ])[0].alias,
    null,
    "an alias is never carried when identity attribution is hidden",
  );

  const views = read("components/binders/BinderViews.tsx");
  assert.match(
    views,
    /showTrustSafety[\s\S]*slot\.publicContributionActions\.map\(\(safetyAction\) =>/,
    "controls are rendered only from sanitized action rows",
  );
  assert.match(
    views,
    /allowBlock=\{binder\.canBlockOwner\}/,
    "public owner blocking fails closed when the server permission is absent",
  );
  assert.match(
    views,
    /slot\.contributors[\s\S]*Added by[\s\S]*A Binder member/,
    "consented collaborative attribution is visible without exposing hidden identities",
  );
});

test("mutations carry a stable per-render idempotency key", () => {
  const actions = read("lib/binders/actions.ts");
  const scope = read("components/binders/BinderIdempotencyScope.tsx");
  const forms = read("components/binders/BinderForms.tsx");
  assert.match(actions, /p_idempotency_key: stableIdempotencyKey/);
  assert.doesNotMatch(actions, /p_idempotency_key:\s*crypto\.randomUUID\(\)/);
  assert.match(scope, /\$\{seed\}_\$\{fieldId\}_\$\{generation\}/);
  assert.match(
    scope,
    /if \(state\) \{\s*setGeneration\(\(value\) => value \+ 1\)/,
  );
  assert.ok(
    (forms.match(/<BinderIdempotencyField state=\{/g) ?? []).length >= 12,
    "every interactive Binder form must carry an idempotency field",
  );
});

test("Binder routing accepts the full 128-bit opaque public-id space", () => {
  const actions = read("lib/binders/actions.ts");
  const liveRefresh = read("components/binders/BinderLiveRefresh.tsx");
  const binderRoute = read("app/binders/[publicId]/page.tsx");
  const templateRoute = read("app/binder-templates/[templateId]/page.tsx");
  for (const source of [actions, liveRefresh, binderRoute, templateRoute]) {
    assert.match(
      source,
      /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/,
    );
    assert.doesNotMatch(source, /\[1-8\]\[0-9a-f\]\{3\}-\[89ab\]/);
  }
});

test("initial workspace reads are bounded and tab-lazy", () => {
  const reads = read("lib/binders/rpc.ts");
  assert.match(reads, /p_limit: 20/);
  assert.match(
    reads,
    /options\.includeBulkPreview[\s\S]*BINDER_READ_RPC\.bulkPreview[\s\S]*p_limit: 100/,
  );
  assert.match(reads, /tab === "activity"/);
  assert.match(reads, /tab === "members"/);
  assert.doesNotMatch(reads, /tab === "members" \|\| tab === "settings"/);
  assert.match(reads, /tab === "checklist" && options\.includeEligibleCopies/);
  assert.match(reads, /p_after_position/);
  assert.match(reads, /p_before_created_at/);
  assert.match(reads, /p_after_member_id/);
});

test("management queues, suspended memberships, and consent withdrawal fail closed", () => {
  const contract = read("lib/binders/rpcContract.ts");
  const reads = read("lib/binders/rpc.ts");
  const views = read("components/binders/BinderViews.tsx");
  const workspace = read("components/binders/BinderWorkspace.tsx");
  const forms = read("components/binders/BinderForms.tsx");
  const dashboardPage = read("app/binders/page.tsx");

  assert.match(contract, /"binder_pending_contributions_v1"/);
  assert.match(contract, /"binder_join_requests_queue_v1"/);
  assert.match(contract, /"binder_invitation_inbox_v1"/);
  assert.match(contract, /"binder_suspended_binders_v1"/);
  assert.match(reads, /p_before_created_at/);
  assert.match(reads, /p_before_requested_at/);
  assert.match(reads, /tab === "checklist" && canApprove/);
  assert.match(reads, /tab === "members" && canApprove/);
  assert.match(reads, /suspended_binders/);
  assert.match(reads, /BINDER_READ_RPC\.invitationInbox/);
  assert.match(reads, /BINDER_READ_RPC\.suspendedBinders/);
  assert.match(
    reads,
    /p_before_created_at:[\s\S]*invitationPage\.createdAt/,
  );
  assert.match(
    reads,
    /p_before_updated_at:[\s\S]*suspendedPage\.updatedAt/,
  );
  assert.match(views, /Suspended access does not expose the Binder checklist/);
  assert.match(views, /More invitations/);
  assert.match(views, /More suspended memberships/);
  assert.match(views, /Details stay hidden while access is suspended/);
  assert.doesNotMatch(views, /binder\.title[\s\S]{0,100}binder\.lifecycle/);
  assert.match(dashboardPage, /invitationCursor\?: string/);
  assert.match(dashboardPage, /suspendedCursor\?: string/);
  assert.match(views, /allowBlock=\{false\}/);
  assert.match(workspace, /binder\.moderationState === "frozen"/);
  assert.match(forms, /name="contentScope" value="none"/);
  assert.match(forms, /name="identityScope" value="none"/);
});

test("frozen Binders expose no ownership-transfer mutations", () => {
  const workspace = read("components/binders/BinderWorkspace.tsx");
  assert.match(
    workspace,
    /ownerTransferOffer\.isTargetViewer[\s\S]*moderationState !== "frozen"[\s\S]*actionName="owner_transfer_accept"/,
  );
  assert.match(
    workspace,
    /ownerTransferOffer\.isTargetViewer[\s\S]*actionName="owner_transfer_revoke"[\s\S]*label="Decline transfer"/,
  );
  assert.match(
    workspace,
    /binder\.role === "owner"[\s\S]*moderationState !== "frozen"[\s\S]*actionName="owner_transfer_revoke"/,
  );
});

test("cover choices are truthful and hosted-only where the server requires it", () => {
  const reads = read("lib/binders/rpc.ts");
  const types = read("lib/binders/types.ts");
  const workspace = read("components/binders/BinderWorkspace.tsx");
  const forms = read("components/binders/BinderForms.tsx");
  const actions = read("lib/binders/actions.ts");

  assert.match(types, /hostedImage: boolean/);
  assert.match(reads, /field\(card, "hosted_image"\)/);
  assert.match(workspace, /binder\.binderType === "custom"/);
  assert.match(
    workspace,
    /binder\.readAccess === "public"[\s\S]*binder\.discoverability === "listed"/,
  );
  assert.match(workspace, /slot\.hostedImage === true/);
  assert.doesNotMatch(workspace, /requiresHostedCover[\s\S]{0,120}imageUrl/);
  assert.match(forms, /<option value="">No cover<\/option>/);
  assert.match(
    actions,
    /p_cover_card_print_id: nullableText\(formData, "coverCardPrintId", 100\)/,
  );
});

test("custom checklist editing is visual and open-Binder refresh uses only the sanitized signal", () => {
  const forms = read("components/binders/BinderForms.tsx");
  const editor = read("components/binders/CustomBinderSlotEditor.tsx");
  const liveRefresh = read("components/binders/BinderLiveRefresh.tsx");
  const cardOptions = read("app/binders/card-options/route.ts");
  const actions = read("lib/binders/actions.ts");
  const views = read("components/binders/BinderViews.tsx");
  const types = read("lib/binders/types.ts");

  assert.doesNotMatch(forms, /Checklist slot JSON|Initial checklist slot JSON/);
  assert.match(editor, /Find canonical cards/);
  assert.match(editor, /Any governed finish/);
  assert.match(editor, /Copies required/);
  assert.match(editor, /Move up/);
  assert.match(editor, /Move down/);
  assert.match(editor, /aria-label=\{`Add \$\{option\.title\} to checklist`\}/);
  assert.match(editor, /Review and confirm/);
  assert.match(editor, /type="hidden" name=\{inputName\}/);
  assert.match(cardOptions, /getExploreRowsForLanguageScopedTextSearch/);
  assert.match(cardOptions, /finish_keys!inner\(label,sort_order,is_active\)/);
  assert.match(actions, /customChecklistConfirmation/);

  assert.match(liveRefresh, /table: "binder_refresh_signals"/);
  assert.match(liveRefresh, /event: "INSERT"/);
  assert.match(liveRefresh, /event: "UPDATE"/);
  assert.match(liveRefresh, /filter: `binder_public_id=eq\.\$\{publicId\}`/);
  assert.match(liveRefresh, /supabase\.removeChannel\(channel\)/);
  assert.doesNotMatch(liveRefresh, /binder_activity_events|binder_contributions/);
  assert.match(views, /BinderInvitationReportForm/);
  assert.match(views, /BinderPublicContributionSafetyControls/);
  assert.match(forms, /reportBinderPublicActionAction/);
  assert.match(forms, /blockBinderPublicMemberAction/);
  assert.match(forms, /router\.refresh\(\)/);
  assert.ok(
    (forms.match(/aria-controls=\{reportPanelId\}/g) ?? []).length >= 5,
    "every collapsible report form is explicitly associated with its trigger",
  );
  assert.match(actions, /p_public_id: publicId/);
  assert.doesNotMatch(actions, /p_binder_public_id/);
  assert.match(actions, /p_action_ref: actionRef/);
  assert.match(actions, /p_member_action_ref: memberActionRef/);
  assert.match(types, /BinderPublicContributionAction/);
});

test("Binder UI uses collector language and does not change the mobile dock", () => {
  const binderUiDirectories = [
    path.join(webSrc, "components/binders"),
    path.join(webSrc, "app/binders"),
    path.join(webSrc, "app/b"),
    path.join(webSrc, "app/binder-invites"),
    path.join(webSrc, "app/binder-templates"),
  ];
  const sources = [];
  const collect = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const resolved = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(resolved);
      else if (/\.(tsx|ts)$/.test(entry.name)) sources.push(fs.readFileSync(resolved, "utf8"));
    }
  };
  for (const directory of binderUiDirectories) {
    collect(directory);
  }
  const binderUi = sources.join("\n");
  assert.doesNotMatch(binderUi, /\bProjects?\b/);
  assert.doesNotMatch(
    binderUi,
    />[^<{]*\bJSON\b[^<{]*</i,
    "internal checklist serialization is never presented as user-facing copy",
  );

  const bottomDock = read("components/layout/MobileBottomNav.tsx");
  assert.doesNotMatch(bottomDock, /Binders/);
  const header = read("components/layout/SiteHeader.tsx");
  assert.match(header, /label: "Binders"/);
  const views = read("components/binders/BinderViews.tsx");
  const workspace = read("components/binders/BinderWorkspace.tsx");
  assert.match(views, /aria-valuenow=\{accessibleCompleted\}/);
  assert.match(workspace, /aria-label="Binder sections"/);
});
