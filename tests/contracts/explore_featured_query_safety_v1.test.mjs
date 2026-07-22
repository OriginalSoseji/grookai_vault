import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = fs.readFileSync(
  path.join(repoRoot, "apps", "web", "src", "lib", "cards", "getFeaturedExploreCards.ts"),
  "utf8",
);

test("Explore featured cards avoid the unindexed full-table rarity scan", () => {
  assert.doesNotMatch(source, /count:\s*["']exact["']/);
  assert.doesNotMatch(source, /%Special Illustration Rare%/);
  assert.match(source, /\.in\(["']set_code["'],\s*setCodes\)/);
  assert.match(source, /\.in\(["']rarity["'],\s*\[\.\.\.FEATURED_EXPLORE_RARITIES\]\)/);
});

test("Explore featured-card work is explicitly bounded", () => {
  assert.match(source, /FEATURED_EXPLORE_MAX_COUNT\s*=\s*24/);
  assert.match(source, /FEATURED_EXPLORE_CANDIDATE_LIMIT\s*=\s*240/);
  assert.match(source, /\.limit\(FEATURED_EXPLORE_CANDIDATE_LIMIT\)/);
});
