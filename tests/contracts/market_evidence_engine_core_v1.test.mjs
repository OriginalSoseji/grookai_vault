import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MARKET_EVIDENCE_ENGINE_CORE_V1 defines provider-agnostic lifecycle and boundaries", () => {
  const contract = readFileSync(
    new URL("../../docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md", import.meta.url),
    "utf8",
  );
  const checkpoint = readFileSync(
    new URL("../../docs/checkpoints/market_evidence_engine/MARKET_EVIDENCE_ENGINE_CORE_V1.md", import.meta.url),
    "utf8",
  );
  const packageDoc = readFileSync(
    new URL("../../docs/plans/market_evidence_engine_v1/MARKET_EVIDENCE_ENGINE_CORE_V1.md", import.meta.url),
    "utf8",
  );

  for (const stage of [
    "acquired",
    "raw_stored",
    "normalized",
    "matched",
    "classified",
    "quality_gated",
    "rollup_eligible",
    "rolled_up_internal",
    "publishable",
    "app_visible",
  ]) {
    assert.ok(contract.includes(`\`${stage}\``), `contract missing lifecycle stage ${stage}`);
    assert.ok(checkpoint.includes(`\`${stage}\``), `checkpoint missing lifecycle stage ${stage}`);
  }

  for (const boundary of [
    "optimizing card coverage",
    "No current Market Evidence Engine warehouse row is publishable",
    "`pricing_observations` writes",
    "`ebay_active_prices_latest` writes",
    "identity-table writes",
    "vault writes",
    "image/storage writes",
    "treating active listings as market truth",
    "treating reference APIs as market truth",
  ]) {
    assert.match(contract, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(contract, /A provider does not create price truth\. A provider creates evidence\./);
  assert.match(contract, /Providers are adapters into the lifecycle\. Providers are not pricing authorities\./);
  assert.match(checkpoint, /Coverage strategy answers which cards to acquire evidence for and how often\./);
  assert.match(packageDoc, /This package performs no DB writes, no migrations, no public pricing work, no coverage planning, and no provider acquisition\./);
});
