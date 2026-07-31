import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTerminalCardSuffix } from "../../backend/identity/card_name_suffix_normalization_v1.mjs";

test("terminal EX and GX suffixes normalize without changing embedded text", () => {
  assert.equal(normalizeTerminalCardSuffix("M Lucario EX", "EX", "-"), "M Lucario-EX");
  assert.equal(normalizeTerminalCardSuffix("Jolteon-EX", "EX", " "), "Jolteon EX");
  assert.equal(normalizeTerminalCardSuffix("Zygarde - GX", "GX", "-"), "Zygarde-GX");
  assert.equal(normalizeTerminalCardSuffix("MewtwoEX", "EX", "-"), "MewtwoEX");
  assert.equal(normalizeTerminalCardSuffix("EX Deoxys", "EX", "-"), "EX Deoxys");
});

test("terminal suffix normalization remains linear for long operator input", () => {
  const input = `Pikachu${" -".repeat(100_000)} EX`;
  const started = performance.now();
  assert.equal(normalizeTerminalCardSuffix(input, "EX", "-"), "Pikachu-EX");
  assert.ok(performance.now() - started < 1_000);
});

test("terminal suffix normalization rejects unsupported configuration", () => {
  assert.throws(
    () => normalizeTerminalCardSuffix("Pikachu V", "V", "-"),
    /unsupported_terminal_card_suffix/,
  );
  assert.throws(
    () => normalizeTerminalCardSuffix("Pikachu EX", "EX", "/"),
    /unsupported_terminal_card_suffix_separator/,
  );
});
