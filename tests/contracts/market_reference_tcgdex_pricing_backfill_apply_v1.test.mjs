import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const applyScript = readFileSync(
  new URL("../../scripts/audits/market_reference_tcgdex_pricing_backfill_apply_v1.mjs", import.meta.url),
  "utf8",
);

function literalInsertChunkTargets(source) {
  return [...source.matchAll(/\binsertChunked\s*\(\s*supabase\s*,\s*["'`]([^"'`]+)["'`]/g)].map(
    (match) => match[1],
  );
}

test("TCGdex pricing backfill apply can write only its internal reference warehouse tables", () => {
  const helperReferences = applyScript.match(/\binsertChunked\s*\(/g) ?? [];
  const helperInvocations = helperReferences.length - 1; // Exclude the helper declaration.
  const insertTargets = literalInsertChunkTargets(applyScript);

  assert.equal(helperInvocations, 2);
  assert.equal(insertTargets.length, helperInvocations, "every insert helper call must use an auditable literal table");
  assert.deepEqual(insertTargets.sort(), [
    "market_reference_candidates",
    "market_reference_normalized_evidence",
  ]);

  assert.doesNotMatch(
    applyScript,
    /\.from\(\s*["'`](?:card_prints|card_printings)["'`]\s*\)[\s\S]{0,300}?\.(?:insert|update|upsert|delete)\s*\(/i,
  );
  assert.doesNotMatch(
    applyScript,
    /\binsertChunked\s*\(\s*supabase\s*,\s*["'`](?:card_prints|card_printings)["'`]/i,
  );
});

test("TCGdex pricing backfill apply declares both parent and child identity writes forbidden", () => {
  assert.match(applyScript, /\bboundary\s*:\s*\{[\s\S]*?\bcard_print_writes\s*:\s*false\b/);
  assert.match(applyScript, /\bboundary\s*:\s*\{[\s\S]*?\bcard_printing_writes\s*:\s*false\b/);
  assert.match(applyScript, /No identity, card, vault, image, delete, upsert, merge, migration, or global apply\./);
});
