import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "RELEASE_SIGNED_IN_WEB_JOURNEYS_V1";
const DEFAULT_ORIGIN = "https://grookaivault.com";
const DEFAULT_SECRETS_FILE = path.join(
  process.env.TEMP || process.env.TMP || os.tmpdir(),
  "grookai_release_journey_secrets.json",
);
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "release",
  "signed_in_web_journeys_v1",
);
const EXPECTED_CARD_GV_ID = "GV-PK-MEW-025";

const VIEWPORTS = Object.freeze([
  { name: "narrow", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
]);

function value(argv, name) {
  return (
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? ""
  );
}

function parseArgs(argv) {
  return {
    origin: (value(argv, "origin") || DEFAULT_ORIGIN).replace(/\/$/, ""),
    deploymentSha: value(argv, "deployment-sha"),
    verifierSha: value(argv, "verifier-sha"),
    deploymentId: value(argv, "deployment-id"),
    deploymentUrl: value(argv, "deployment-url"),
    secretsFile: path.resolve(
      value(argv, "secrets-file") || DEFAULT_SECRETS_FILE,
    ),
    outRoot: path.resolve(value(argv, "out-root") || DEFAULT_OUT_ROOT),
    requirePass: argv.includes("--require-pass"),
  };
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizedPath(candidate) {
  const parsed = new URL(candidate);
  return `${parsed.pathname}${parsed.search}`;
}

function normalizeBody(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function sensitiveKey(key) {
  return /^(email|password|token|access_?token|refresh_?token|user_?id|owner_?id|subject_?id)$/i.test(
    key,
  );
}

function assertNoSensitiveArtifactKeys(candidate, location = "root") {
  if (Array.isArray(candidate)) {
    candidate.forEach((entry, index) =>
      assertNoSensitiveArtifactKeys(entry, `${location}[${index}]`),
    );
    return;
  }
  if (!candidate || typeof candidate !== "object") return;
  for (const [key, child] of Object.entries(candidate)) {
    if (sensitiveKey(key)) {
      throw new Error(`sensitive artifact key prohibited: ${location}.${key}`);
    }
    assertNoSensitiveArtifactKeys(child, `${location}.${key}`);
  }
}

async function loadSecrets(secretsFile) {
  const secrets = JSON.parse(await fs.readFile(secretsFile, "utf8"));
  for (const key of [
    "owner_email",
    "owner_password",
    "subject_email",
    "subject_password",
  ]) {
    if (typeof secrets[key] !== "string" || secrets[key].trim() === "") {
      throw new Error(`temporary journey secret ${key} is required`);
    }
  }
  return secrets;
}

async function lookupAccounts(client, secrets) {
  const result = await client.query(
    `select
       u.id::text,
       pp.slug,
       pp.display_name,
       pp.public_profile_enabled,
       pp.vault_sharing_enabled
     from auth.users u
     join public.public_profiles pp on pp.user_id = u.id
     where lower(u.email) = any($1::text[])
     order by lower(u.email)`,
    [[secrets.owner_email.toLowerCase(), secrets.subject_email.toLowerCase()]],
  );
  const byEmail = new Map(
    result.rows.map((row) => [
      row.id,
      {
        id: row.id,
        slug: row.slug,
        displayName: row.display_name,
        publicProfileEnabled: row.public_profile_enabled,
        vaultSharingEnabled: row.vault_sharing_enabled,
      },
    ]),
  );
  const identityResult = await client.query(
    `select lower(email) as email_key, id::text
     from auth.users
     where lower(email) = any($1::text[])`,
    [[secrets.owner_email.toLowerCase(), secrets.subject_email.toLowerCase()]],
  );
  const idByEmail = new Map(
    identityResult.rows.map((row) => [row.email_key, row.id]),
  );
  const owner = byEmail.get(idByEmail.get(secrets.owner_email.toLowerCase()));
  const subject = byEmail.get(
    idByEmail.get(secrets.subject_email.toLowerCase()),
  );
  if (!owner || !subject) {
    throw new Error("both release journey accounts require public profiles");
  }
  return { owner, subject };
}

async function queryScopedTruth(client, accounts) {
  await client.query("begin transaction read only");
  try {
    await client.query("set local statement_timeout = '120s'");
    const follows = await client.query(
      `select count(*)::integer as row_count
       from public.collector_follows
       where follower_user_id = $1::uuid
         and followed_user_id = $2::uuid`,
      [accounts.subject.id, accounts.owner.id],
    );
    const copies = await client.query(
      `select
         vii.gv_vi_id,
         cp.gv_id as canonical_gv_id,
         cp.name,
         vii.intent,
         vii.condition_label,
         printings.finish_key,
         (vii.card_printing_id is not null) as exact_printing_assigned
       from public.vault_item_instances vii
       join public.card_prints cp on cp.id = vii.card_print_id
       left join public.card_printings printings on printings.id = vii.card_printing_id
       where vii.user_id = $1::uuid
         and vii.archived_at is null
         and cp.gv_id = $2
       order by vii.created_at, vii.id`,
      [accounts.owner.id, EXPECTED_CARD_GV_ID],
    );
    const interactions = await client.query(
      `select
         count(*)::integer as row_count,
         count(*) filter (where ci.status = 'open')::integer as open_count,
         count(*) filter (where ci.card_printing_id is not null)::integer as exact_printing_count,
         max(char_length(ci.message))::integer as maximum_message_length,
         max(ci.created_at) as latest_created_at
       from public.card_interactions ci
       join public.card_prints cp on cp.id = ci.card_print_id
       where cp.gv_id = $1
         and (
           (ci.sender_user_id = $2::uuid and ci.receiver_user_id = $3::uuid)
           or
           (ci.sender_user_id = $3::uuid and ci.receiver_user_id = $2::uuid)
         )`,
      [EXPECTED_CARD_GV_ID, accounts.subject.id, accounts.owner.id],
    );
    const groupStates = await client.query(
      `select
         case when states.user_id = $1::uuid then 'subject' else 'owner' end as account_role,
         states.has_unread,
         states.last_read_at,
         states.latest_message_at,
         states.archived_at,
         states.closed_at,
         states.updated_at
       from public.card_interaction_group_states states
       join public.card_prints cp on cp.id = states.card_print_id
       where cp.gv_id = $3
         and (
           (states.user_id = $1::uuid and states.counterpart_user_id = $2::uuid)
           or
           (states.user_id = $2::uuid and states.counterpart_user_id = $1::uuid)
         )
       order by account_role`,
      [accounts.subject.id, accounts.owner.id, EXPECTED_CARD_GV_ID],
    );
    const wants = await client.query(
      `select
         count(*)::integer as row_count,
         count(*) filter (where intents.want is true)::integer as active_want_count
       from public.user_card_intents intents
       join public.card_prints cp on cp.id = intents.card_print_id
       where intents.user_id = $1::uuid
         and cp.gv_id = $2`,
      [accounts.subject.id, EXPECTED_CARD_GV_ID],
    );
    await client.query("commit");
    return {
      profiles: {
        owner: {
          slug: accounts.owner.slug,
          display_name: accounts.owner.displayName,
          public_profile_enabled: accounts.owner.publicProfileEnabled,
          vault_sharing_enabled: accounts.owner.vaultSharingEnabled,
        },
        subject: {
          slug: accounts.subject.slug,
          display_name: accounts.subject.displayName,
          public_profile_enabled: accounts.subject.publicProfileEnabled,
          vault_sharing_enabled: accounts.subject.vaultSharingEnabled,
        },
      },
      follow: {
        row_count: follows.rows[0]?.row_count ?? 0,
        active: (follows.rows[0]?.row_count ?? 0) === 1,
      },
      owner_exact_card: copies.rows,
      card_interaction: interactions.rows[0],
      card_interaction_group_states: groupStates.rows,
      subject_want: {
        row_count: wants.rows[0]?.row_count ?? 0,
        active_want_count: wants.rows[0]?.active_want_count ?? 0,
        current_want: (wants.rows[0]?.active_want_count ?? 0) > 0,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function collectorLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

function selectJourneyEvidence(snapshot) {
  const copy = snapshot.owner_exact_card.find(
    (candidate) =>
      candidate.exact_printing_assigned === true &&
      typeof candidate.gv_vi_id === "string" &&
      candidate.gv_vi_id.trim() !== "",
  );
  if (!copy) {
    throw new Error(
      `release owner requires an active exact copy of ${EXPECTED_CARD_GV_ID}`,
    );
  }
  return {
    canonicalGvId: copy.canonical_gv_id,
    gvviId: copy.gv_vi_id,
    cardName: copy.name,
    intent: copy.intent,
    intentLabel: collectorLabel(copy.intent),
    finishLabel: collectorLabel(copy.finish_key),
    publiclyDiscoverable: ["trade", "sell", "showcase"].includes(copy.intent),
  };
}

function evaluateDatabaseTruth(snapshot, evidence) {
  const selectedCopy = snapshot.owner_exact_card.find(
    (candidate) => candidate.gv_vi_id === evidence.gvviId,
  );
  return {
    profiles_public:
      snapshot.profiles.owner.public_profile_enabled === true &&
      snapshot.profiles.owner.vault_sharing_enabled === true &&
      snapshot.profiles.subject.public_profile_enabled === true,
    subject_follows_owner: snapshot.follow.row_count === 1,
    active_owner_exact_copy:
      selectedCopy?.canonical_gv_id === EXPECTED_CARD_GV_ID &&
      selectedCopy?.intent === evidence.intent &&
      selectedCopy?.exact_printing_assigned === true,
    existing_open_interaction:
      snapshot.card_interaction.row_count >= 1 &&
      snapshot.card_interaction.open_count >= 1 &&
      snapshot.card_interaction.maximum_message_length > 0,
    subject_current_want_is_false: snapshot.subject_want.current_want === false,
  };
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    // Long-lived telemetry must not turn a rendered route into a false failure.
  }
  await page.waitForTimeout(350);
}

async function imageState(page) {
  return page.evaluate(() => {
    const images = [...document.querySelectorAll("img")];
    return {
      rendered_count: images.length,
      loaded_count: images.filter(
        (image) => image.complete && image.naturalWidth > 0,
      ).length,
      failed_count: images.filter(
        (image) => image.complete && image.naturalWidth === 0,
      ).length,
      pending_count: images.filter((image) => !image.complete).length,
    };
  });
}

async function login(context, page, origin, credentials, nextPath) {
  await page.goto(`${origin}/login?next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === nextPath, { timeout: 60_000 }),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
  await settle(page);

  const blockedRequests = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      await route.continue();
      return;
    }
    blockedRequests.push({
      method,
      url_sha256: sha256(request.url()),
    });
    await route.abort("blockedbyclient");
  });
  return blockedRequests;
}

function routeDefinitions(accounts, evidence) {
  const ownerName = accounts.owner.displayName;
  const ownerSlug = accounts.owner.slug;
  const privateCardAbsence = evidence.publiclyDiscoverable
    ? []
    : [evidence.cardName];
  return {
    subject: [
      {
        name: "collector_discovery",
        path: `/network/discover?q=${encodeURIComponent(ownerSlug)}`,
        expected: ["Discover collectors", ownerName, "Following"],
      },
      {
        name: "following",
        path: "/following",
        expected: ["Following", ownerName],
      },
      {
        name: "card_stream",
        path: "/network",
        expected: ["Cards collectors want to share", "Pikachu", "Trade"],
      },
      {
        name: "message_inbox",
        path: "/network/inbox",
        expected: ["Inbox", ownerName, "Pikachu", "Printing: Normal"],
      },
      {
        name: "owner_profile",
        path: `/u/${encodeURIComponent(ownerSlug)}`,
        expected: [ownerName, "Following"],
        absent: privateCardAbsence,
      },
      {
        name: "canonical_card",
        path: `/card/${EXPECTED_CARD_GV_ID}`,
        expected: [
          "Pikachu",
          "Normal",
          "Choose a copy above to message this collector about that card.",
        ],
      },
    ],
    owner: [
      {
        name: "vault",
        path: "/vault",
        expected: ["Vault", evidence.cardName, evidence.finishLabel],
      },
      {
        name: "private_exact_copy",
        path: `/vault/gvvi/${evidence.gvviId}`,
        expected: [
          "Your exact copy",
          evidence.cardName,
          evidence.gvviId,
          evidence.finishLabel,
          evidence.intentLabel,
        ],
      },
      {
        name: "binders",
        path: "/binders",
        expected: ["Binders", "Collection goals", "No Binders yet"],
      },
      {
        name: "dex",
        path: "/dex",
        expected: ["Grookai Dex", "Vault-aware", "Character completion"],
      },
      {
        name: "sets",
        path: "/sets",
        expected: ["Browse Pokemon Sets"],
      },
      {
        name: "wall",
        path: "/wall",
        expected: ["Manage your Wall", "Pikachu"],
      },
      {
        name: "public_profile",
        path: `/u/${encodeURIComponent(ownerSlug)}`,
        expected: [ownerName],
        absent: privateCardAbsence,
      },
    ],
  };
}

async function runRoute(page, origin, role, viewport, route, runDir) {
  const pageErrors = [];
  const onPageError = (error) => pageErrors.push(sha256(String(error)));
  page.on("pageerror", onPageError);
  try {
    const response = await page.goto(`${origin}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await settle(page);
    const body = normalizeBody(await page.locator("body").innerText());
    const textAssertions = Object.fromEntries(
      route.expected.map((expected) => [
        expected,
        body.includes(expected.toLowerCase()),
      ]),
    );
    const textAbsenceAssertions = Object.fromEntries(
      (route.absent || []).map((unexpected) => [
        unexpected,
        !body.includes(unexpected.toLowerCase()),
      ]),
    );
    const images = await imageState(page);
    const screenshotName = `${viewport}_${role}_${route.name}.png`;
    const screenshot = await page.screenshot({
      path: path.join(runDir, screenshotName),
      fullPage: true,
      animations: "disabled",
      mask:
        route.name === "message_inbox"
          ? [page.locator("[data-card-message-thread] p")]
          : [],
      maskColor: "#020617",
    });
    const status =
      response &&
      response.status() < 400 &&
      normalizedPath(page.url()) === route.path &&
      Object.values(textAssertions).every(Boolean) &&
      Object.values(textAbsenceAssertions).every(Boolean) &&
      images.failed_count === 0 &&
      pageErrors.length === 0
        ? "passed"
        : "failed";
    return {
      role,
      viewport,
      route: route.path,
      final_path: normalizedPath(page.url()),
      http_status: response?.status() ?? null,
      text_assertions: textAssertions,
      text_absence_assertions: textAbsenceAssertions,
      images,
      page_error_count: pageErrors.length,
      page_error_hashes: pageErrors,
      screenshot: screenshotName,
      screenshot_sha256: sha256(screenshot),
      status,
    };
  } finally {
    page.off("pageerror", onPageError);
  }
}

async function proveExistingMessageContext(
  page,
  origin,
  accounts,
  viewport,
  runDir,
) {
  await page.goto(`${origin}/network/inbox`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  const thread = page.locator("[data-card-message-thread]");
  const threadCount = await thread.count();
  const threadText =
    threadCount > 0 ? normalizeBody(await thread.first().innerText()) : "";
  const textareaCount = await page
    .getByRole("textbox", { name: "Reply message", exact: true })
    .count();
  const sendButtonCount = await page
    .getByRole("button", { name: "Send", exact: true })
    .count();
  const screenshotName = `${viewport}_subject_existing_message_context.png`;
  const screenshot = await page.screenshot({
    path: path.join(runDir, screenshotName),
    fullPage: true,
    animations: "disabled",
    mask: [page.locator("[data-card-message-thread] p")],
    maskColor: "#020617",
  });
  const expectedCounterpart = accounts.owner.displayName.toLowerCase();
  const status =
    threadCount === 1 &&
    threadText.includes(expectedCounterpart) &&
    threadText.includes("pikachu") &&
    threadText.includes("printing: normal") &&
    textareaCount === 1 &&
    sendButtonCount === 1
      ? "passed"
      : "failed";
  return {
    viewport,
    source_path: "/network/inbox",
    thread_count: threadCount,
    counterpart_context_visible: threadText.includes(expectedCounterpart),
    card_context_visible: threadText.includes("pikachu"),
    exact_printing_context_visible: threadText.includes("printing: normal"),
    textarea_count: textareaCount,
    send_button_count: sendButtonCount,
    reply_submitted: false,
    private_message_copy_masked_in_screenshot: true,
    screenshot: screenshotName,
    screenshot_sha256: sha256(screenshot),
    status,
  };
}

function markdown(report) {
  const routeRows = report.route_results.map(
    (result) =>
      `| ${result.viewport} | ${result.role} | \`${result.route}\` | ${result.status} | ${result.images.failed_count} |`,
  );
  const contextRows = report.message_context_results.map(
    (result) =>
      `| ${result.viewport} | ${result.thread_count} | ${result.textarea_count} | ${result.reply_submitted} | ${result.status} |`,
  );
  return `${[
    "# Final-Candidate Signed-In Web Journeys V1",
    "",
    `- Status: \`${report.status}\``,
    `- Production origin: \`${report.run_plan.origin}\``,
    `- Deployment SHA: \`${report.run_plan.deployment_sha}\``,
    `- Verifier SHA: \`${report.run_plan.verifier_sha}\``,
    `- Deployment ID: \`${report.run_plan.deployment_id}\``,
    `- Journey D web proof: \`${report.journey_assessment.journey_d_collector_connection}\``,
    `- Journey C read-only context: \`${report.journey_assessment.journey_c_want_and_match}\``,
    `- Journey E web-supported context: \`${report.journey_assessment.journey_e_collection_depth}\``,
    "",
    "## Routes",
    "",
    "| Viewport | Role | Route | Status | Broken images |",
    "| --- | --- | --- | --- | ---: |",
    ...routeRows,
    "",
    "## Existing Card Message Context",
    "",
    "| Viewport | Threads | Reply forms | Reply submitted | Status |",
    "| --- | ---: | ---: | --- | --- |",
    ...contextRows,
    "",
    "## Database Reconciliation",
    "",
    `- Before/after equal: \`${report.database_reconciliation.before_after_equal}\``,
    `- Subject follows owner: \`${report.database_assertions.subject_follows_owner}\``,
    `- Active owner exact copy: \`${report.database_assertions.active_owner_exact_copy}\``,
    `- Existing open card interaction: \`${report.database_assertions.existing_open_interaction}\``,
    `- Subject current Want remains false: \`${report.database_assertions.subject_current_want_is_false}\``,
    "",
    "## Boundaries",
    "",
    "- Credentials came from an external temporary file and are not stored in artifacts.",
    "- Each role and viewport used a new isolated browser context.",
    "- After authentication, every non-read browser request was blocked.",
    "- Follow, Want, message, vault, and database mutations were not performed.",
    "- No browser cookies, local storage, session storage, tokens, emails, or user UUIDs are preserved.",
    "- Screenshots and report artifacts are SHA-256 hashed.",
    "",
    "## Scope",
    "",
    "Journey D is proven for final-candidate web. Journey C proves the existing exact-card owner/message context but does not create a new Want-to-match transition. Journey E proves the supported web collection surfaces but leaves mobile Journeys and Memories for device evidence.",
    "",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.deploymentSha) throw new Error("--deployment-sha is required");
  if (!args.verifierSha) throw new Error("--verifier-sha is required");
  if (!args.deploymentId) throw new Error("--deployment-id is required");
  if (!args.deploymentUrl) throw new Error("--deployment-url is required");
  const databaseUrl = connectionString();
  if (!databaseUrl) throw new Error("SUPABASE_DB_URL is required");

  const secrets = await loadSecrets(args.secretsFile);
  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslConfig(databaseUrl),
  });
  await client.connect();
  let browser;
  try {
    const accounts = await lookupAccounts(client, secrets);
    const before = await queryScopedTruth(client, accounts);
    const journeyEvidence = selectJourneyEvidence(before);
    const databaseAssertions = evaluateDatabaseTruth(before, journeyEvidence);
    const routes = routeDefinitions(accounts, journeyEvidence);
    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const runPlan = {
      audit_version: AUDIT_VERSION,
      created_at: new Date().toISOString(),
      origin: args.origin,
      deployment_sha: args.deploymentSha,
      verifier_sha: args.verifierSha,
      deployment_id: args.deploymentId,
      deployment_url: args.deploymentUrl,
      expected_identity: {
        canonical_gv_id: journeyEvidence.canonicalGvId,
        gvvi_id: journeyEvidence.gvviId,
        card_name: journeyEvidence.cardName,
        intent: journeyEvidence.intent,
        finish_label: journeyEvidence.finishLabel,
        publicly_discoverable: journeyEvidence.publiclyDiscoverable,
      },
      profiles: {
        owner_slug: accounts.owner.slug,
        owner_display_name: accounts.owner.displayName,
        subject_slug: accounts.subject.slug,
        subject_display_name: accounts.subject.displayName,
      },
      viewports: VIEWPORTS,
      routes,
      credential_source: "external_temporary_file",
      boundaries: {
        isolated_browser_contexts: true,
        browser_storage_preserved: false,
        authentication_session_establishment: true,
        post_authentication_non_read_requests_blocked: true,
        database_transactions_read_only: true,
        database_writes: false,
        application_writes: false,
        follow_mutation: false,
        want_mutation: false,
        message_sent: false,
        vault_mutation: false,
      },
    };
    assertNoSensitiveArtifactKeys(runPlan);
    await fs.writeFile(
      path.join(runDir, "run_plan.json"),
      `${JSON.stringify(runPlan, null, 2)}\n`,
    );

    browser = await chromium.launch({ headless: true });
    const routeResults = [];
    const messageContextResults = [];
    const blockedRequests = [];
    for (const viewport of VIEWPORTS) {
      for (const role of ["subject", "owner"]) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: "dark",
          locale: "en-US",
          timezoneId: "America/Denver",
          reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        const page = await context.newPage();
        const credentials =
          role === "subject"
            ? {
                email: secrets.subject_email,
                password: secrets.subject_password,
              }
            : { email: secrets.owner_email, password: secrets.owner_password };
        const nextPath = role === "subject" ? "/network/discover" : "/account";
        const blocked = await login(
          context,
          page,
          args.origin,
          credentials,
          nextPath,
        );
        for (const route of routes[role]) {
          routeResults.push(
            await runRoute(
              page,
              args.origin,
              role,
              viewport.name,
              route,
              runDir,
            ),
          );
        }
        if (role === "subject") {
          messageContextResults.push(
            await proveExistingMessageContext(
              page,
              args.origin,
              accounts,
              viewport.name,
              runDir,
            ),
          );
        }
        blockedRequests.push(
          ...blocked.map((request) => ({
            ...request,
            role,
            viewport: viewport.name,
          })),
        );
        await context.close();
      }
    }
    await browser.close();
    browser = undefined;

    const after = await queryScopedTruth(client, accounts);
    const beforeAfterEqual = JSON.stringify(before) === JSON.stringify(after);
    const routeFailures = routeResults.filter(
      (result) => result.status !== "passed",
    );
    const messageContextFailures = messageContextResults.filter(
      (result) => result.status !== "passed",
    );
    const databasePassed = Object.values(databaseAssertions).every(Boolean);
    const passed =
      routeFailures.length === 0 &&
      messageContextFailures.length === 0 &&
      databasePassed &&
      beforeAfterEqual;
    const report = {
      audit_version: AUDIT_VERSION,
      as_of: new Date().toISOString(),
      status: passed ? "passed" : "failed",
      completion_allowed: passed,
      run_plan: runPlan,
      summary: {
        route_case_count: routeResults.length,
        route_pass_count: routeResults.length - routeFailures.length,
        message_context_case_count: messageContextResults.length,
        message_context_pass_count:
          messageContextResults.length - messageContextFailures.length,
        blocked_non_read_request_count: blockedRequests.length,
        database_assertion_count: Object.keys(databaseAssertions).length,
        database_assertion_pass_count:
          Object.values(databaseAssertions).filter(Boolean).length,
        failure_count:
          routeFailures.length +
          messageContextFailures.length +
          (databasePassed ? 0 : 1) +
          (beforeAfterEqual ? 0 : 1),
      },
      journey_assessment: {
        journey_d_collector_connection: passed
          ? "passed_web_final_candidate"
          : "failed",
        journey_c_want_and_match: passed
          ? "passed_read_only_context_only"
          : "failed",
        journey_e_collection_depth: passed
          ? "passed_web_supported_surfaces_only"
          : "failed",
      },
      route_results: routeResults,
      message_context_results: messageContextResults,
      blocked_non_read_requests: blockedRequests,
      database_assertions: databaseAssertions,
      database_reconciliation: {
        before_after_equal: beforeAfterEqual,
        before,
        after,
      },
      boundaries: runPlan.boundaries,
    };
    assertNoSensitiveArtifactKeys(report);
    await fs.writeFile(
      path.join(runDir, "summary.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await fs.writeFile(path.join(runDir, "REPORT.md"), markdown(report));

    const artifactNames = (await fs.readdir(runDir)).sort();
    const artifactHashes = {};
    for (const name of artifactNames) {
      artifactHashes[name] = sha256(await fs.readFile(path.join(runDir, name)));
    }
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(artifactHashes, null, 2)}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          status: report.status,
          completion_allowed: report.completion_allowed,
          summary: report.summary,
          artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (args.requirePass && !passed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[release-signed-in-web] ${error.stack || error.message}`);
  process.exitCode = 1;
});
