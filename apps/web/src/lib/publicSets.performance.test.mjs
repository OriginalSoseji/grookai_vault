import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  chooseCanonicalSetRow,
  getEmbeddedCardPrintCount,
  getManifestCardPrintCount,
} from "./publicSetCanonicalization.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "publicSets.ts"), "utf8");
const generatorSource = fs.readFileSync(
  path.resolve(here, "../../../../scripts/generate_public_set_card_counts.mjs"),
  "utf8",
);
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(here, "publicSetCardCounts.generated.json"),
    "utf8",
  ),
);
const webPackage = JSON.parse(
  fs.readFileSync(path.resolve(here, "../../package.json"), "utf8"),
);
const listFunctionSource = source.slice(
  source.indexOf("export const getPublicSets"),
  source.indexOf("export const getPublicSetByCode"),
);
const detailFunctionSource = source.slice(
  source.indexOf("export const getPublicSetByCode"),
  source.indexOf("export const getPublicSetCards"),
);
const cardsFunctionSource = source.slice(
  source.indexOf("export const getPublicSetCards"),
  source.indexOf("export const getPublicWorldChampionshipDecklist"),
);

test("set discovery uses bounded database-side counts instead of transferring every card", () => {
  assert.doesNotMatch(source, /fetchAllCanonicalSetCodes/);
  assert.doesNotMatch(source, /\.from\("card_prints"\)\s*\.select\("set_code"\)/s);
  assert.doesNotMatch(listFunctionSource, /card_prints\(count\)/);
  assert.match(listFunctionSource, /getManifestCardPrintCount/);
  assert.match(generatorSource, /group by lower\(trim\(set_code\)\)/);
  assert.match(generatorSource, /const PAGE_SIZE = 1000/);
  assert.match(generatorSource, /connectionTimeoutMillis/);
  assert.match(generatorSource, /API_TOTAL_TIMEOUT_MS/);
  assert.match(generatorSource, /AbortSignal\.timeout/);
  assert.match(generatorSource, /MIN_RETAINED_SNAPSHOT_RATIO/);
  assert.match(generatorSource, /assertPlausibleSnapshot/);
  assert.match(generatorSource, /for \(let offset = 0;/);
  assert.doesNotMatch(
    generatorSource,
    /^import .* from ["'](?:pg|dotenv|@supabase\/supabase-js)["'];?$/m,
  );
  assert.match(generatorSource, /validateOnly/);
  assert.match(webPackage.scripts.prebuild, /--validate-only/);
  assert.doesNotMatch(webPackage.scripts.prebuild, /--allow-stale/);
  assert.doesNotMatch(source, /Math\.max\(row\.printed_total \?\? 0, 1\)/);
});

test("canonical aliases are selected by reconciled catalog rows, not printed total", () => {
  const alias = {
    code: "sv3",
    release_date: "2023-08-11",
    printed_total: 197,
    card_count: getManifestCardPrintCount(manifest.counts, "sv3"),
  };
  const canonical = {
    code: "sv03",
    release_date: "2023-08-11",
    printed_total: 197,
    card_count: getManifestCardPrintCount(manifest.counts, "sv03"),
  };

  assert.equal(chooseCanonicalSetRow(alias, canonical), canonical);
  assert.ok(canonical.card_count > alias.card_count);
  assert.ok(canonical.card_count > canonical.printed_total);
  assert.equal(getEmbeddedCardPrintCount(null), 0);
  assert.equal(getEmbeddedCardPrintCount([{ count: -4 }]), 0);
});

test("set detail performs one targeted exact-count lookup", () => {
  assert.match(detailFunctionSource, /select\(PUBLIC_SET_DETAIL_SELECT\)/);
  assert.match(detailFunctionSource, /\.ilike\("code", normalizedCode\)/);
  assert.match(detailFunctionSource, /card_prints\.gv_id/);
  assert.match(detailFunctionSource, /card_prints\.set_code/);
  assert.match(detailFunctionSource, /\.limit\(1\)[\s\S]*?\.maybeSingle\(\)/);
  assert.doesNotMatch(
    detailFunctionSource,
    /getPublicSetByCode[\s\S]*?const sets = await getPublicSets\(\)/,
  );
});

test("checked-in count manifest has a valid bounded snapshot", () => {
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.set_code_count, Object.keys(manifest.counts).length);
  assert.ok(manifest.set_code_count > 100);
  assert.ok(Number.isFinite(Date.parse(manifest.generated_at)));
});

test("full card loading is scoped to one selected set", () => {
  assert.match(source, /getAllPublicSetCards\(setInfo\.code\)/);
  assert.match(source, /const pageSize = 500/);
});

test("set card pages use the stable card-print id as the final database order", () => {
  assert.equal(
    [...cardsFunctionSource.matchAll(/\.order\("id", \{ ascending: true \}\)/g)].length,
    3,
  );
  assert.match(source, /\(left\.id \?\? ""\)\.localeCompare\(right\.id \?\? ""\)/);
});
