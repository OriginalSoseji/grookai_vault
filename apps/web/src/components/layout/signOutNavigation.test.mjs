import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("authenticated web navigation and account settings expose sign out", () => {
  const signOutButton = readSource("components", "account", "SignOutButton.tsx");
  const desktopShell = readSource("components", "layout", "DesktopApplicationShell.tsx");
  const mobileTools = readSource("components", "layout", "CollectorMobileTools.tsx");
  const accountPage = readSource("app", "account", "page.tsx");

  assert.match(signOutButton, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(signOutButton, /window\.location\.replace\("\/login"\)/);
  assert.match(desktopShell, /<SignOutButton/);
  assert.match(accountPage, /<SignOutButton/);
  assert.match(mobileTools, /isAuthenticated \? <Link href="\/account"/);
});
