import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("desktop shell freezes the five primary pillars in native order", () => {
  const manifest = read("apps/web/src/lib/desktopShellManifest.ts");
  const expected = ["Pulse", "Wall", "Scan", "Vault", "Search"];
  let cursor = -1;

  for (const label of expected) {
    const next = manifest.indexOf(`label: "${label}"`, cursor + 1);
    assert.ok(next > cursor, `${label} must follow the previous primary destination`);
    cursor = next;
  }

  assert.match(manifest, /DESKTOP_SECONDARY_NAV[\s\S]*?"Sets"[\s\S]*?"Dex"[\s\S]*?"Compare"[\s\S]*?"Binders"[\s\S]*?"Messages"/);
});

test("desktop route state maps secondary tools back to one primary pillar", () => {
  const manifest = read("apps/web/src/lib/desktopShellManifest.ts");

  assert.match(manifest, /matchesRoute\(pathname, "\/network\/inbox"\)[\s\S]*?activeSecondary = "messages"/);
  assert.match(manifest, /matchesRoute\(pathname, "\/binders"\)[\s\S]*?activePrimary = "vault"/);
  assert.match(manifest, /matchesRoute\(pathname, "\/sets"\)[\s\S]*?activePrimary = "search"/);
  assert.match(manifest, /childContext\(pathname, "\/binders", "Binders", "Binder workspace"\)/);
});

test("desktop shell uses authenticated state without creating another authority path", () => {
  const chrome = read("apps/web/src/components/layout/AppChrome.tsx");
  const route = read("apps/web/src/app/api/navigation/shell/route.ts");
  const shell = read("apps/web/src/components/layout/DesktopApplicationShell.tsx");

  assert.match(chrome, /fetch\("\/api\/navigation\/shell"/);
  assert.match(chrome, /wallAvailability: DesktopWallAvailability/);
  assert.match(route, /client\.auth\.getUser\(\)/);
  assert.match(route, /wallAvailability: profileResponse\.error/);
  assert.doesNotMatch(route, /createServerAdminClient|SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(shell, /fetch\(|supabase|createServer/);
});

test("desktop shell exposes explicit unread, unavailable Wall, and pushed-route states", () => {
  const shell = read("apps/web/src/components/layout/DesktopApplicationShell.tsx");

  assert.match(shell, /data-wall-availability="unavailable"/);
  assert.match(shell, /Wall status unavailable/);
  assert.match(shell, /data-desktop-route-context/);
  assert.match(shell, /UnreadBadge count=\{networkUnreadCount\}/);
  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
});

test("desktop and mobile shells hand off at the same 900px boundary", () => {
  const globalCss = read("apps/web/src/app/globals.css");
  const dockCss = read("apps/web/src/components/mobileParity/MobileParityDock.module.css");

  assert.match(globalCss, /@media \(min-width: 900px\)[\s\S]*?\.gv-mobile-site-header[\s\S]*?display: none[\s\S]*?\.gv-desktop-site-header[\s\S]*?display: block/);
  assert.match(dockCss, /@media \(min-width: 900px\)[\s\S]*?\.frame[\s\S]*?display: none/);
});

test("private desktop tools remain conditional and account actions stay grouped", () => {
  const shell = read("apps/web/src/components/layout/DesktopApplicationShell.tsx");

  assert.match(shell, /item\.key === "binders"[\s\S]*?isAuthenticated && bindersEnabled/);
  assert.match(shell, /item\.key === "messages"[\s\S]*?isAuthenticated/);
  assert.match(shell, /<details className="gv-desktop-account-menu/);
  assert.match(shell, />Public profile<\/Link>/);
  assert.match(shell, />Account settings<\/Link>/);
  assert.match(shell, />Support<\/Link>/);
});
