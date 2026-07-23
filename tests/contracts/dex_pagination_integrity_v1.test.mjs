import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  chunkValues,
  getRemainingPageIndexes,
  mapWithBoundedConcurrency,
} from "../../apps/web/src/lib/pagination.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("Dex pagination plans exact row-limit boundaries without truncation", () => {
  assert.deepEqual(
    chunkValues(Array.from({ length: 611 }, (_, index) => index), 250).map(
      (chunk) => chunk.length,
    ),
    [250, 250, 111],
  );
  assert.deepEqual(getRemainingPageIndexes(1_000, 1_000), []);
  assert.deepEqual(getRemainingPageIndexes(1_001, 1_000), [1]);
  assert.deepEqual(getRemainingPageIndexes(6_718, 1_000), [1, 2, 3, 4, 5, 6]);
});

test("bounded page loading preserves order and caps simultaneous requests", async () => {
  let active = 0;
  let maximumActive = 0;
  const results = await mapWithBoundedConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    return value * 10;
  });

  assert.deepEqual(results, [10, 20, 30, 40, 50, 60]);
  assert.equal(maximumActive, 2);
});

test("Dex and child-image reads apply stable paging to every unbounded row set", () => {
  const detailSource = fs.readFileSync(
    path.join(repositoryRoot, "apps", "web", "src", "lib", "grookaiDex", "getGrookaiDexSpeciesDetail.ts"),
    "utf8",
  );
  const overviewSource = fs.readFileSync(
    path.join(repositoryRoot, "apps", "web", "src", "lib", "grookaiDex", "getGrookaiDexSpecies.ts"),
    "utf8",
  );
  const fallbackSource = fs.readFileSync(
    path.join(repositoryRoot, "apps", "web", "src", "lib", "cards", "childDisplayImageFallbacks.ts"),
    "utf8",
  );

  assert.match(detailSource, /chunkValues\(cardPrintIds, SUPABASE_IN_FILTER_CHUNK_SIZE\)/);
  assert.match(detailSource, /\.range\(printingFrom, printingTo\)/);
  assert.match(detailSource, /\.range\(cameoFrom, cameoTo\)/);
  assert.match(overviewSource, /getRemainingPageIndexes/);
  assert.match(overviewSource, /mapWithBoundedConcurrency/);
  assert.match(overviewSource, /\.from\("v_grookai_dex_species_v1"\)/);
  assert.match(overviewSource, /total_print_count/);
  assert.match(overviewSource, /getAllOwnedCountsForUser/);
  assert.match(overviewSource, /getOwnedCompletionMappings/);
  assert.match(overviewSource, /\.in\("card_print_id", chunk\)/);
  assert.doesNotMatch(overviewSource, /\.in\("species_id", chunk\)/);
  assert.match(overviewSource, /getCachedGrookaiDexOverviewBase/);
  assert.match(overviewSource, /overview:\s*buildGrookaiDexOverview/);
  assert.match(fallbackSource, /\.order\("id", \{ ascending: true \}\)\s*\.range\(from, to\)/);
});
