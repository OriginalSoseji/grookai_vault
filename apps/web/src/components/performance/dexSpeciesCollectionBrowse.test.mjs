import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "..", "..", "app", "dex", "[speciesSlug]", "page.tsx"),
  "utf8",
);

test("species browsing keeps completion, additional, and cameo semantics distinct", () => {
  assert.match(source, /const collectionCards = detail\.cards\.filter\(\(card\) => card\.countsForCompletion\)/);
  assert.match(source, /const ownedCards = collectionCards\.filter\(\(card\) => card\.isOwned\)/);
  assert.match(source, /const missingCards = collectionCards\.filter\(\(card\) => !card\.isOwned\)/);
  assert.match(
    source,
    /!card\.countsForCompletion && card\.role\.trim\(\)\.toLowerCase\(\) !== "cameo"/,
  );
  assert.match(source, /view: "collection", label: "Collection"/);
  assert.match(source, /view: "additional", label: "Additional"/);
  assert.match(source, /detail\.cameoAppearances\.slice\(0, 12\)/);
  assert.match(source, /These do not count toward Species Dex completion/);
});

test("species browsing filters and sorts the already-loaded detail payload", () => {
  assert.match(source, /const activeSet = parseTextFilter\(searchParams\?\.set\)/);
  assert.match(source, /const activeRarity = parseTextFilter\(searchParams\?\.rarity\)/);
  assert.match(source, /const activeFinish = parseTextFilter\(searchParams\?\.finish\)/);
  assert.match(source, /const activeSort = parseSort\(searchParams\?\.sort\)/);
  assert.match(source, /card\.printings\.some\(\(printing\) => printing\.finishName\.trim\(\) === activeFinish\)/);
  assert.match(source, /right\.ownedCount - left\.ownedCount/);
  assert.match(source, /Number\(left\.isOwned\) - Number\(right\.isOwned\)/);
  assert.match(source, /name="set"/);
  assert.match(source, /name="rarity"/);
  assert.match(source, /name="finish"/);
  assert.match(source, /name="sort"/);
  assert.doesNotMatch(source, /\.from\(/);
});

test("view, layout, and pagination links preserve the active browse query", () => {
  assert.match(source, /function browseHref\(speciesSlug: string, state: DexBrowseState\)/);
  assert.match(source, /query\.set\("set", state\.set\)/);
  assert.match(source, /query\.set\("rarity", state\.rarity\)/);
  assert.match(source, /query\.set\("finish", state\.finish\)/);
  assert.match(source, /query\.set\("sort", state\.sort\)/);
  assert.match(source, /query\.set\("layout", state\.layout\)/);
  assert.match(source, /\{ \.\.\.browseState, view: option\.view \}/);
  assert.match(source, /\{ \.\.\.browseState, page: activePage - 1 \}/);
  assert.match(source, /\{ \.\.\.browseState, page: activePage \+ 1 \}/);
  assert.match(source, /activeLayout === "grid" \? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"/);
  assert.match(source, /activeLayout === "compact"/);
});

test("card rendering stays bounded and hosted-primary artwork remains intact", () => {
  assert.match(source, /DEX_CARD_PAGE_SIZE\s*=\s*48/);
  assert.match(source, /visibleCards\.slice\(pageStart, pageStart \+ DEX_CARD_PAGE_SIZE\)/);
  assert.match(source, /pageCards\.map/);
  assert.match(source, /src=\{card\.imageUrl \?\? undefined\}/);
  assert.match(source, /fallbackSrc=\{card\.imageFallbackUrls\[0\]\}/);
  assert.match(source, /href=\{`\/vault\?species=\$\{encodeURIComponent\(detail\.slug\)\}`\}/);
  assert.match(source, /card\.unassignedPrintingCount > 0/);
});

test("cards without a public card route render non-anchor artwork", () => {
  assert.match(source, /card\.gvId \? \(\s*<Link href=\{`\/card\/\$\{card\.gvId\}`\}/);
  assert.match(source, /\) : \(\s*<div className=\{artworkClassName\}>\{artwork\}<\/div>/);
  assert.doesNotMatch(source, /href=\{card\.gvId \?[^}]+: "#"\}/);
  assert.doesNotMatch(source, /href="#"/);
});

test("species detail surfaces use theme-aware Grookai tokens", () => {
  assert.match(source, /bg-\[var\(--gv-surface-base\)\]/);
  assert.match(source, /bg-\[var\(--gv-surface-container\)\]/);
  assert.match(source, /border-\[var\(--gv-border-hairline\)\]/);
  assert.match(source, /text-\[var\(--gv-text-primary\)\]/);
  assert.match(source, /text-\[var\(--gv-text-secondary\)\]/);
  assert.match(source, /gv-control-surface/);
  assert.match(source, /gv-primary-button/);
  assert.match(source, /gv-secondary-button/);
  assert.match(source, /dark:bg-emerald-400\/15/);
  assert.match(source, /dark:bg-amber-400\/15/);
});
