import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Base Set print-run lane web helper preserves Pikachu special rows without generic rows", () => {
  const source = readFileSync(
    new URL("../../apps/web/src/lib/baseSetPrintRunLanes.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /base1-shadowless/);
  assert.match(source, /base1-first-edition/);
  assert.match(source, /base1-1999-2000/);
  assert.match(source, /shadowless_red_cheeks/);
  assert.match(source, /shadowless_yellow_cheeks/);
  assert.match(source, /first_edition_red_cheeks/);
  assert.match(source, /first_edition_yellow_cheeks/);
  assert.match(source, /whyDifferent/);
  assert.match(source, /visualCue/);
  assert.match(source, /collectorNote/);
  assert.match(source, /fourth print/);
  assert.match(source, /UK-style Base Set run/);
  assert.doesNotMatch(source, /ghost_stamp_shadowless/);
  assert.doesNotMatch(source, /GV-PK-BASE1-58-SHADOWLESS/);
  assert.doesNotMatch(source, /GV-PK-BASE1-58-FIRST-EDITION/);
});

test("public set cards and stats merge Base Set lane special rows from source base1", () => {
  const publicSets = readFileSync(
    new URL("../../apps/web/src/lib/publicSets.ts", import.meta.url),
    "utf8",
  );
  const stats = readFileSync(
    new URL("../../apps/web/src/lib/publicSetMasterSetStats.ts", import.meta.url),
    "utf8",
  );
  const shared = readFileSync(
    new URL("../../apps/web/src/lib/publicSets.shared.ts", import.meta.url),
    "utf8",
  );

  assert.match(publicSets, /getBaseSetPrintRunLaneSpecialVariantKeys/);
  assert.match(publicSets, /BASE_SET_PRINT_RUN_SOURCE_SET_CODE/);
  assert.match(publicSets, /getBaseSetPrintRunLaneCardCountAdjustment/);
  assert.match(publicSets, /\.in\("variant_key", specialVariantKeys\)/);
  assert.match(publicSets, /comparePublicSetCardRows/);
  assert.match(stats, /getBaseSetPrintRunLaneSpecialVariantKeys/);
  assert.match(stats, /master-set-special-ids/);
  assert.match(shared, /base set shadowless/);
  assert.match(shared, /no shadow base set/);
  assert.match(shared, /base set first edition/);
  assert.match(shared, /first ed/);
  assert.match(shared, /base set 1999-2000/);
  assert.match(shared, /base set 4th print/);
  assert.match(shared, /uk print/);
});

test("Base Set print-run set pages render lane explanations", () => {
  const page = readFileSync(
    new URL("../../apps/web/src/app/sets/[set_code]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /getBaseSetPrintRunLaneExplanation/);
  assert.match(page, /Why Different/);
  assert.match(page, /Visual Cue/);
  assert.match(page, /Collector Note/);
});
