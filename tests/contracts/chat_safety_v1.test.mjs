import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

test("web and Flutter message writers enforce Chat Safety Policy V1", async () => {
  const [insert, create, reply, flutterService, flutterPolicy] = await Promise.all([
    read("apps/web/src/lib/network/insertCardInteraction.ts"),
    read("apps/web/src/lib/network/createCardInteractionAction.ts"),
    read("apps/web/src/lib/network/replyToCardInteractionGroupAction.ts"),
    read("lib/services/network/card_interaction_service.dart"),
    read("lib/services/network/chat_safety_policy.dart"),
  ]);

  assert.match(insert, /reviewChatMessageSafety\(input\.message\)/);
  assert.match(create, /reviewChatMessageSafety\(message\)/);
  assert.match(reply, /reviewChatMessageSafety\(message\)/);
  assert.equal(
    (flutterService.match(/reviewChatMessageSafety\(normalizedMessage\)/g) ?? []).length,
    2,
  );
  assert.match(flutterPolicy, /CHAT_SAFETY_POLICY_V1/);
});

test("reports capture reasons and founder-only review states", async () => {
  const [controls, founderPage, founderActions] = await Promise.all([
    read("apps/web/src/components/trust/TrustSafetyControls.tsx"),
    read("apps/web/src/app/founder/trust-safety/page.tsx"),
    read("apps/web/src/app/founder/trust-safety/actions.ts"),
  ]);

  for (const reason of ["spam", "harassment", "scam", "inappropriate", "other"]) {
    assert.match(controls, new RegExp(`value=["']${reason}["']`));
  }
  assert.match(founderPage, /requireFounderAccess\("\/founder\/trust-safety"\)/);
  assert.match(founderPage, /\.from\("trust_reports"\)/);
  assert.match(founderActions, /requireFounderAccess\("\/founder\/trust-safety"\)/);
  assert.match(founderActions, /\.update\(\{ status, updated_at:/);
});

test("Chat Safety V1 does not add or apply a database migration", async () => {
  const contract = await read("docs/contracts/CHAT_SAFETY_CONTRACT_V1.md");
  assert.match(contract, /client and web-server enforcement/i);
  assert.match(contract, /database enforcement remains\s+a gated follow-up/i);
  assert.match(contract, /20260816160000_mtg_tcgplayer_market_publication_v1\.sql/);
});
