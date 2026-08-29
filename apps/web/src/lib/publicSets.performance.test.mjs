import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  chooseCanonicalSetRow,
  choosePreferredEquivalentSetRow,
  escapePostgrestLikePattern,
  getEmbeddedCardPrintCount,
  getManifestCardPrintCount,
} from "./publicSetCanonicalization.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "publicSets.ts"), "utf8");
const generatorSource = fs.readFileSync(
  path.resolve(here, "../../../../scripts/generate_public_set_card_counts.mjs"),
  "utf8",
);
const exactCodesSource = fs.readFileSync(path.join(here, "publicSetExactCodes.ts"), "utf8");
const countMigrationSource = fs.readFileSync(
  path.resolve(here, "../../../../supabase/migrations/20260816120000_public_set_card_counts_v1.sql"),
  "utf8",
);
const countVisibilityMigrationSource = fs.readFileSync(
  path.resolve(
    here,
    "../../../../supabase/migrations/20260816123000_public_set_card_counts_visibility_v2.sql",
  ),
  "utf8",
);
const manifest = JSON.parse(fs.readFileSync(path.join(here, "publicSetCardCounts.generated.json"), "utf8"));
const webPackage = JSON.parse(fs.readFileSync(path.resolve(here, "../../package.json"), "utf8"));
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
  assert.match(listFunctionSource, /getDynamicPublicSetCardCounts/);
  assert.doesNotMatch(listFunctionSource, /getManifestCardPrintCount[\s\S]*?=== 0/);
  assert.match(source, /rpc\("get_public_set_card_counts_v1"/);
  assert.match(generatorSource, /group by lower\(trim\(set_code\)\)/);
  assert.match(generatorSource, /const PAGE_SIZE = 1000/);
  assert.match(generatorSource, /connectionTimeoutMillis/);
  assert.match(generatorSource, /API_TOTAL_TIMEOUT_MS/);
  assert.match(generatorSource, /AbortSignal\.timeout/);
  assert.match(generatorSource, /MIN_RETAINED_SNAPSHOT_RATIO/);
  assert.match(generatorSource, /assertPlausibleSnapshot/);
  assert.match(generatorSource, /for \(let offset = 0;/);
  assert.doesNotMatch(generatorSource, /^import .* from ["'](?:pg|dotenv|@supabase\/supabase-js)["'];?$/m);
  assert.match(generatorSource, /validateOnly/);
  assert.match(webPackage.scripts.prebuild, /--validate-only/);
  assert.doesNotMatch(webPackage.scripts.prebuild, /--allow-stale/);
  assert.doesNotMatch(source, /Math\.max\(row\.printed_total \?\? 0, 1\)/);
});

test("set discovery paginates beyond the PostgREST row ceiling", () => {
  assert.match(source, /const PUBLIC_SET_ROW_PAGE_SIZE = 1000/);
  assert.match(source, /async function getAllVisibleSetRows/);
  assert.match(source, /\.order\("id", \{ ascending: true \}\)/);
  assert.match(source, /\.range\(\s*offset,\s*offset \+ PUBLIC_SET_ROW_PAGE_SIZE - 1,?\s*\)/);
  assert.match(listFunctionSource, /getAllVisibleSetRows\(supabase, gameCode\)/);
  assert.match(source, /query = query\.eq\("game", normalizedGameCode\)/);
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

test("set detail counts exact visible set lanes without relationship aggregates", () => {
  assert.match(source, /const PUBLIC_SET_DETAIL_SELECT = PUBLIC_SET_LIST_SELECT;/);
  assert.doesNotMatch(source, /card_prints\(count\)/);
  assert.match(detailFunctionSource, /select\(PUBLIC_SET_DETAIL_SELECT\)/);
  assert.match(detailFunctionSource, /\.ilike\("code", escapePostgrestLikePattern\(normalizedCode\)\)/);
  assert.match(detailFunctionSource, /getVisibleCardCountBySetIds/);
  assert.match(detailFunctionSource, /rows\.map\(\(row\) => row\.id \?\? ""\)/);
  assert.match(detailFunctionSource, /combinedCardCount/);
  assert.doesNotMatch(detailFunctionSource, /\.maybeSingle\(\)/);
  assert.doesNotMatch(detailFunctionSource, /getPublicSetByCode[\s\S]*?const sets = await getPublicSets\(\)/);
});

test("card reads resolve visible game-scoped set metadata before exact indexed set-id queries", () => {
  assert.match(exactCodesSource, /\.from\("sets"\)/);
  assert.match(exactCodesSource, /\.ilike\("code"/);
  assert.match(exactCodesSource, /query = query\.eq\("game", normalizedGameCode\)/);
  assert.doesNotMatch(source, /\.ilike\("set_code"/);
  assert.match(cardsFunctionSource, /resolveVisiblePublicSetReferences/);
  assert.match(cardsFunctionSource, /\.in\("set_id", exactSetIds\)/);
});

test("release sorting never treats catalog ingestion time as a release date", () => {
  assert.match(source, /return row\.release_date \?\? undefined/);
  assert.doesNotMatch(source, /row\.release_date \?\? row\.created_at/);
});

test("dynamic set counts are bounded and enforce catalog visibility", () => {
  assert.match(countMigrationSource, /security definer/i);
  assert.match(countMigrationSource, /card\.set_code = any\(p_set_codes\)/);
  assert.match(countMigrationSource, /catalog_game_visible_to_request_v1\(game\.code\)/);
  assert.match(countMigrationSource, /cardinality\(p_set_codes\) > 1000/);
  assert.match(countMigrationSource, /card\.gv_id is not null/);
  assert.match(countMigrationSource, /grant execute[\s\S]*to anon, authenticated, service_role/);
  assert.match(
    countVisibilityMigrationSource,
    /data_quality_flags #>> '\{app_visibility_v1,status\}'/,
  );
  assert.match(countVisibilityMigrationSource, /<> 'suppressed'/);
});

test("case-equivalent Japanese set rows prefer descriptive metadata", () => {
  const generated = {
    code: "jpn-s8b",
    name: "Japanese S8b",
    release_date: "2021-12-03",
  };
  const descriptive = {
    code: "jpn-S8b",
    name: "VMAX Climax",
    release_date: "2021-12-03",
  };

  assert.equal(choosePreferredEquivalentSetRow(generated, descriptive), descriptive);
  assert.equal(choosePreferredEquivalentSetRow(descriptive, generated), descriptive);
});

test("PostgREST case-insensitive exact patterns escape wildcards", () => {
  assert.equal(escapePostgrestLikePattern("jpn-s8b"), "jpn-s8b");
  assert.equal(escapePostgrestLikePattern("set_100%"), "set\\_100\\%");
});

test("checked-in count manifest has a valid bounded snapshot", () => {
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.set_code_count, Object.keys(manifest.counts).length);
  assert.ok(manifest.set_code_count > 100);
  assert.ok(Number.isFinite(Date.parse(manifest.generated_at)));
});

test("full card loading is scoped to one selected game and set", () => {
  assert.match(source, /getAllPublicSetCards\(setInfo\.code, setInfo\.game_code\)/);
  assert.match(source, /const pageSize = 500/);
});

test("set card pages use the stable card-print id as the final database order", () => {
  assert.equal([...cardsFunctionSource.matchAll(/\.order\("id", \{ ascending: true \}\)/g)].length, 3);
  assert.match(source, /\(left\.id \?\? ""\)\.localeCompare\(right\.id \?\? ""\)/);
});
