import assert from "node:assert/strict";
import test from "node:test";

import {
  decodePdfArrayText,
  decodePdfString,
  extractPdfTextItems,
} from "../../scripts/audits/lib/pdf_text_operators_v1.mjs";

test("PDF text operators preserve matrix coordinates and decoded strings", () => {
  const stream = [
    "1 0 0 1 300 500 Tm",
    "(Pikachu) Tj",
    "1 0 0 1 340 500 Tm",
    "[(Mr. ) 10 (Mime)] TJ",
  ].join("\n");

  assert.deepEqual(extractPdfTextItems(stream), [
    { x: 300, y: 500, text: "Pikachu" },
    { x: 340, y: 500, text: "Mr.Mime" },
  ]);
  assert.equal(decodePdfArrayText("[(Farfetch\\'d)]"), "Farfetch\\'d");
  assert.equal(decodePdfString(String.raw`\\222`), String.raw`\222`);
  assert.equal(decodePdfString(String.raw`\222`), "'");
});

test("PDF text extraction handles nested and escaped delimiters", () => {
  const stream = "1 0 0 1 12.5 -3 Tm (A \\(nested\\) value) Tj";
  assert.deepEqual(extractPdfTextItems(stream), [
    { x: 12.5, y: -3, text: "A (nested) value" },
  ]);
});

test("PDF text extraction remains bounded for long malformed input", () => {
  const stream = `${"(".repeat(200_000)} Tj`;
  const started = performance.now();
  assert.deepEqual(extractPdfTextItems(stream), []);
  assert.ok(performance.now() - started < 1_000);
});
