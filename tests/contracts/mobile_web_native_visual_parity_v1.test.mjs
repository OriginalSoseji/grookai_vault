import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const expectedDock = ["Pulse", "Wall", "Scan", "Vault", "Search"];

test("native visual parity manifest freezes the approved app and dock amendment", () => {
  const manifest = readJson(
    "docs/audits/mobile_web_native_parity_v1/app_canon_manifest.json",
  );

  assert.equal(
    manifest.source_baseline.commit,
    "abb42bddb170fe2ac71a21cc7036269c83c8b9dd",
  );
  assert.equal(manifest.installed_app.package, "com.grookai.vault");
  assert.equal(manifest.installed_app.version_code, 21);
  assert.equal(
    manifest.installed_app.apk_sha256,
    "810ae9964618f364abe1b7da548376867ff913e751edb3ca34f3e87850c2e892",
  );
  assert.deepEqual(manifest.visual_authority.approved_dock_order, expectedDock);
  assert.equal(manifest.private_reference_policy.commit_raw_captures, false);
});

test("route matrix gives every surface one shell mode and preserves Scan semantics", () => {
  const matrix = readJson(
    "docs/audits/mobile_web_native_parity_v1/route_state_matrix.json",
  );

  assert.deepEqual(matrix.primary_dock_order, expectedDock);
  assert.equal(matrix.mobile_max_width_exclusive_css_px, 900);

  for (const surface of matrix.surfaces) {
    assert.equal(typeof surface.shell_mode, "string");
    assert.ok(surface.shell_mode.length > 0, `${surface.surface} needs a shell mode`);
    assert.ok(Array.isArray(surface.routes) && surface.routes.length > 0);
    assert.ok(
      Array.isArray(surface.required_states) &&
        surface.required_states.length > 0,
      `${surface.surface} needs required states`,
    );
  }

  const scan = matrix.surfaces.find((surface) => surface.surface === "Scan");
  assert.deepEqual(scan.routes, ["/scan"]);
  assert.equal(scan.shell_mode, "fullscreen");
  assert.equal(scan.dock, "hidden");

  const importer = matrix.surfaces.find(
    (surface) => surface.surface === "Import and photos",
  );
  assert.deepEqual(importer.routes, ["/vault/import"]);
  assert.equal(importer.shell_mode, "fullscreen");
  assert.equal(importer.dock, "hidden");

  const binders = matrix.surfaces.find(
    (surface) => surface.surface === "Binders",
  );
  assert.equal(binders.shell_mode, "pushed");
  assert.equal(binders.dock, "hidden");

  const binderSecrets = matrix.surfaces.find(
    (surface) => surface.surface === "Binder share and invitation",
  );
  assert.equal(binderSecrets.shell_mode, "standalone_secret");
  assert.equal(binderSecrets.dock, "hidden");
});

test("runtime shell manifest is the exact five-item owner-approved order", () => {
  const manifest = read(
    "apps/web/src/lib/mobileParity/shellManifest.ts",
  );
  let cursor = -1;

  for (const label of expectedDock) {
    const next = manifest.indexOf(`label: "${label}"`, cursor + 1);
    assert.ok(next > cursor, `${label} must follow the prior dock item`);
    cursor = next;
  }

  assert.match(manifest, /key: "scan"[\s\S]*?href: "\/scan"[\s\S]*?kind: "action"/);
  assert.doesNotMatch(manifest, /label: "Dex"/);
});

test("production and fallback mobile docks share the manifest and presentation", () => {
  const dock = read("apps/web/src/components/layout/MobileBottomNav.tsx");
  const presentation = read(
    "apps/web/src/components/mobileParity/MobileParityDock.tsx",
  );
  const appChrome = read("apps/web/src/components/layout/AppChrome.tsx");
  const layout = read("apps/web/src/app/layout.tsx");

  assert.match(dock, /MobileParityDock/);
  assert.match(presentation, /MOBILE_PRIMARY_DOCK/);
  assert.match(presentation, /MOBILE_PRIMARY_DOCK\.map\(\(item\) =>/);
  assert.equal(
    dock.match(/<MobileParityDock/g)?.length,
    2,
    "production and fallback must render the same dock presentation",
  );
  assert.match(layout, /<MobileBottomNavFallback \/>/);
  assert.doesNotMatch(layout, /mobileNavItems/);
  assert.doesNotMatch(dock, /\bdexEnabled\b|case "dex"|label: "Dex"|label: "Profile"/);
  assert.match(
    appChrome,
    /<MobileBottomNav[\s\S]*?wallHref=\{authState\.wallHref\}[\s\S]*?pulseUnreadCount=\{authState\.networkUnreadCount\}/,
  );

  assert.match(
    dock,
    /const currentWallHref =[\s\S]*?pathname\.startsWith\("\/u\/"\)[\s\S]*?\? pathname[\s\S]*?: wallHref;/,
  );
  assert.match(
    dock,
    /wallHref=\{currentWallHref\}/,
  );
  assert.match(
    presentation,
    /const selected = item\.kind === "root" && item\.key === activeKey/,
  );
  assert.match(dock, /useKeyboardVisible/);
});

test("production mobile chrome suppresses approved Scan and Binder route families", () => {
  const manifest = read("apps/web/src/lib/mobileParity/shellManifest.ts");
  const dock = read("apps/web/src/components/layout/MobileBottomNav.tsx");
  const header = read("apps/web/src/components/layout/SiteHeader.tsx");

  assert.match(
    manifest,
    /MOBILE_FULLSCREEN_ROUTES = \["\/scan", "\/vault\/import"\]/,
  );
  assert.match(
    manifest,
    /MOBILE_BINDER_PUSHED_PREFIXES = \[[\s\S]*?"\/binders"[\s\S]*?"\/binder-templates"/,
  );
  assert.match(
    manifest,
    /MOBILE_BINDER_STANDALONE_SECRET_PREFIXES = \[[\s\S]*?"\/b"[\s\S]*?"\/binder-invites"/,
  );
  assert.match(
    manifest,
    /export function getMobileRouteChromeMode\([\s\S]*?return "fullscreen"[\s\S]*?return "pushed"[\s\S]*?return "standalone_secret"[\s\S]*?return "root"/,
  );
  assert.match(
    manifest,
    /export function shouldSuppressMobileChrome\(pathname: string\)[\s\S]*?getMobileRouteChromeMode\(pathname\) !== "root"/,
  );

  assert.equal(
    dock.match(/shouldSuppressMobileChrome\(pathname\)/g)?.length,
    2,
    "production and fallback docks must enforce route suppression",
  );
  assert.match(header, /shouldSuppressMobileChrome\(pathname\)/);
  assert.match(header, /suppressMobileChrome \? "hidden md:block" : ""/);
  assert.match(
    header,
    /\{ href: "\/scan", label: "Scan", matchHref: "\/scan" \}/,
  );
});

test("new parity authority explicitly supersedes conflicting shell guidance", () => {
  const contract = read(
    "docs/contracts/MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1.md",
  );
  const oldGuidance = read(
    "docs/contracts/MOBILE_JAKOBS_LAW_UX_CONTRACT_V1.md",
  );
  const binder = read(
    "docs/contracts/COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1.md",
  );

  assert.match(contract, /Pulse · Wall · Scan · Vault · Search/);
  assert.match(contract, /does not authorize:[\s\S]*database migration/i);
  assert.match(contract, /push, preview deployment, merge, production/i);
  assert.match(oldGuidance, /SUPERSEDED FOR MOBILE SHELL AND NAVIGATION/);
  assert.match(binder, /Pulse, Wall, Scan, Vault, and Search/);
});

test("visual fixtures fail closed in Vercel and keep private captures out of CI", () => {
  const fixtureMode = read("apps/web/src/lib/visualParity/fixtureMode.ts");
  const fixturePage = read(
    "apps/web/src/app/visual-fixtures/parity/[scenario]/page.tsx",
  );
  const packageJson = readJson("apps/web/package.json");

  assert.match(fixtureMode, /GROOKAI_VISUAL_TEST_MODE === "1"/);
  assert.match(fixtureMode, /process\.env\.VERCEL !== "1"/);
  assert.match(fixtureMode, /process\.env\.NODE_ENV !== "production"/);
  assert.match(fixturePage, /notFound\(\)/);
  assert.equal(
    packageJson.scripts["test:parity:visual"],
    "playwright test tests/parity/mobile.visual.spec.ts",
  );
  assert.equal(
    packageJson.scripts["test:parity:a11y"],
    "playwright test tests/parity/mobile.a11y.spec.ts",
  );
});
