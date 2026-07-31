import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("Pulse card stream renders from the verified optional server viewer", () => {
  const page = readSource("apps/web/src/app/network/page.tsx");

  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /const \{ user \} = await getOptionalServerUser\(\)/);
  assert.match(page, /const viewerUserId = user\?\.id \?\? null/);
  assert.match(page, /excludeUserId: viewerUserId/);
  assert.match(page, /href=\{user \? "\/network\/inbox" : "\/login\?next=%2Fnetwork"\}/);
  assert.match(page, /\{user \? "Open inbox" : "Sign in to interact"\}/);
  assert.match(page, /isAuthenticated=\{Boolean\(user\)\}/);
  assert.match(page, /viewerUserId=\{viewerUserId\}/);
  assert.doesNotMatch(page, /isAuthenticated=\{false\}/);
  assert.doesNotMatch(page, /viewerUserId=\{null\}/);
});

test("Pulse collector discovery preserves the verified viewer identity", () => {
  const page = readSource("apps/web/src/app/network/discover/page.tsx");

  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /const \{ user \} = await getOptionalServerUser\(\)/);
  assert.match(page, /excludeUserId: viewerUserId/);
  assert.match(page, /viewerUserId=\{viewerUserId\}/);
  assert.match(page, /isAuthenticated=\{Boolean\(user\)\}/);
  assert.doesNotMatch(page, /isAuthenticated=\{false\}/);
  assert.doesNotMatch(page, /viewerUserId=\{null\}/);
});
