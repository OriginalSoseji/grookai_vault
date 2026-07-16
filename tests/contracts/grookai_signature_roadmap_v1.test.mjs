import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("Grookai Signature roadmap records future personalization without entering v1 agent scope", () => {
  const roadmap = source("docs/plans/product_evolution/GROOKAI_SIGNATURE_ROADMAP_V1.md");
  const index = source("docs/plans/product_evolution/INDEX.md");

  assert.match(roadmap, /# Grookai Signature Roadmap V1/);
  assert.match(roadmap, /future project/i);
  assert.match(roadmap, /not part of the card visual description agent v1/i);
  assert.match(roadmap, /Visual Signature/);
  assert.match(roadmap, /Market Signature/);
  assert.match(roadmap, /Collector Signature/);
  assert.match(roadmap, /We're still learning your Signature\./);
  assert.match(roadmap, /Your Signature has evolved\./);
  assert.match(roadmap, /collector-level personalization/i);
  assert.match(roadmap, /card-level derived intelligence/i);

  assert.match(index, /Grookai Signature/);
  assert.match(index, /not part of the current card visual description agent v1/i);
});
