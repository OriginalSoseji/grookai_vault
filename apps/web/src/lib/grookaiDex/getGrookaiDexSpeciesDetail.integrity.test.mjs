import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "getGrookaiDexSpeciesDetail.ts"), "utf8");

test("species detail deduplicates card mappings and cameo rows", () => {
  assert.match(source, /SUPABASE_DETAIL_PAGE_SIZE\s*=\s*1_000/);
  assert.match(source, /\.range\(detailFrom, detailTo\)/);
  assert.match(source, /detailPage\.length < SUPABASE_DETAIL_PAGE_SIZE/);
  assert.match(source, /function dedupeDexCardPrintRows/);
  assert.match(source, /const rows = dedupeDexCardPrintRows/);
  assert.match(source, /candidateCompletion && !currentCompletion/);
  assert.match(source, /function dedupeCameoAppearances/);
  assert.match(source, /dedupeCameoAppearances\(\[\.\.\.cameoAppearances, \.\.\.cameoPage\]\)/);
  assert.match(source, /SUPABASE_IN_FILTER_CHUNK_SIZE\s*=\s*250/);
  assert.match(source, /mapWithBoundedConcurrency/);
  assert.match(source, /\.range\(printingFrom, printingTo\)/);
  assert.match(source, /printingPageRows|pageRows\.length < SUPABASE_DETAIL_PAGE_SIZE/);
  assert.match(source, /\.range\(cameoFrom, cameoTo\)/);
  assert.match(source, /cameoRawPage\.length < CAMEO_PAGE_SIZE/);
});
