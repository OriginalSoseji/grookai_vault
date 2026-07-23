import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "PublicSetCardGrid.tsx"), "utf8");

test("set grids track raw pagination separately from deduplicated display cards", () => {
  assert.match(source, /const \[nextOffset, setNextOffset\] = useState\(initialCards\.length\)/);
  assert.match(source, /offset=\$\{nextOffset\}/);
  assert.match(source, /mergePublicSetCardPage/);
  assert.match(source, /setNextOffset\(nextState\.nextOffset\)/);
  assert.match(source, /const \[hasReachedEnd, setHasReachedEnd\]/);
  assert.match(source, /No additional cards are available/);
  assert.match(source, /nextOffset < totalCount && !hasReachedEnd/);
  assert.doesNotMatch(source, /offset=\$\{cards\.length\}/);
});
