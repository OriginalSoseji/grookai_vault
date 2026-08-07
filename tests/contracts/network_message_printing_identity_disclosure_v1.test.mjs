import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const service = fs.readFileSync(
  "lib/services/network/card_interaction_service.dart",
  "utf8",
);
const inbox = fs.readFileSync(
  "lib/screens/network/network_inbox_screen.dart",
  "utf8",
);
const thread = fs.readFileSync(
  "lib/screens/network/network_thread_screen.dart",
  "utf8",
);
const webCreate = fs.readFileSync(
  "apps/web/src/lib/network/createCardInteractionAction.ts",
  "utf8",
);
const webInsert = fs.readFileSync(
  "apps/web/src/lib/network/insertCardInteraction.ts",
  "utf8",
);
const webReply = fs.readFileSync(
  "apps/web/src/lib/network/replyToCardInteractionGroupAction.ts",
  "utf8",
);
const webInbox = fs.readFileSync(
  "apps/web/src/app/network/inbox/page.tsx",
  "utf8",
);
const migration = fs.readFileSync(
  "supabase/migrations/20260806220000_card_interactions_exact_printing_v1.sql",
  "utf8",
);
const deviceJourneyReadback = fs.readFileSync(
  "scripts/audits/card_interaction_exact_printing_device_journey_readback_v1.mjs",
  "utf8",
);

test("message cards disclose absent or exact child-printing identity", () => {
  assert.match(service, /return 'Printing not recorded';/);
  assert.match(
    service,
    /return 'Printing: \$\{label \?\? printingGvId \?\? 'Exact printing'\}';/,
  );
  assert.match(service, /'card_printing_id': cardPrintingId/);
  assert.match(service, /finish_keys\(label\)/);
  assert.match(inbox, /group\.printingIdentityLabel/);
  assert.match(thread, /_thread\.printingIdentityLabel/);
});

test("message navigation forwards only captured exact-printing evidence", () => {
  assert.match(thread, /selectedPrintingGvId: _thread\.printingGvId/);
  assert.match(thread, /selectedFinishLabel:\s*_thread\.finishLabel/);
});

test("mobile keeps duplicate, reply, read, and grouping state scoped to exact printing", () => {
  assert.match(
    service,
    /duplicateQuery\.eq\('card_printing_id', cardPrintingId\)/,
  );
  assert.match(
    service,
    /existingThreadQuery\.eq\('card_printing_id', normalizedCardPrintingId\)/,
  );
  assert.match(service, /'card_printing_id': resolvedCardPrintingId/);
  assert.match(service, /stateByKey\[key\]/);
  assert.match(
    service,
    /query\.eq\('card_printing_id', normalizedCardPrintingId\)/,
  );
});

test("web creates, replies to, groups, and displays exact-printing threads", () => {
  assert.match(webCreate, /formData\.get\("vault_item_instance_id"\)/);
  assert.match(webCreate, /\.eq\("instance_id", vaultItemInstanceId\)/);
  assert.match(webCreate, /targetCardPrintingId/);
  assert.match(
    webCreate,
    /duplicateQuery\.eq\("card_printing_id", targetCardPrintingId\)/,
  );
  assert.match(webInsert, /card_printing_id: input\.cardPrintingId/);
  assert.match(
    webInsert,
    /vault_item_instance_id: input\.vaultItemInstanceId/,
  );
  assert.match(
    webReply,
    /groupQuery\.eq\("card_printing_id", cardPrintingId\)/,
  );
  assert.match(
    webReply,
    /duplicateQuery\.eq\("card_printing_id", cardPrintingId\)/,
  );
  assert.match(webInbox, /Printing not recorded/);
  assert.match(webInbox, /Printing: \$\{group\.card\.finishLabel/);
  assert.match(webInbox, /cardPrintingId=\{group\.card\.cardPrintingId\}/);
});

test("database contract preserves exact printing without inferring legacy rows", () => {
  assert.match(migration, /add column if not exists card_printing_id uuid/i);
  assert.match(migration, /printing\.card_print_id = new\.card_print_id/i);
  assert.match(migration, /vii\.card_printing_id/i);
  assert.match(migration, /unique nulls not distinct/i);
  assert.match(migration, /new\.card_printing_id/i);
  assert.match(migration, /card_printing_id,\s*counterpart_user_id/i);
  assert.doesNotMatch(
    migration,
    /update\s+public\.card_interactions[\s\S]*card_printing_id/i,
  );
});

test("mobile writes the resolved exact vault instance with the selected printing", () => {
  assert.match(service, /'instance_id,vault_item_id/);
  assert.match(service, /resolvedVaultItemInstanceId/);
  assert.match(
    service,
    /'vault_item_instance_id': resolvedVaultItemInstanceId/,
  );
  assert.match(
    service,
    /existingThread\['vault_item_instance_id'\]/,
  );
});

test("device journey readback is read-only, identity-redacted, and exact-printing scoped", () => {
  assert.match(deviceJourneyReadback, /begin transaction read only/i);
  assert.match(deviceJourneyReadback, /printing\.card_print_id = ci\.card_print_id/);
  assert.match(deviceJourneyReadback, /participant_state_count === 2/);
  assert.match(deviceJourneyReadback, /identities_redacted: true/);
  assert.doesNotMatch(deviceJourneyReadback, /sender_user_id:\s*interaction/);
  assert.doesNotMatch(deviceJourneyReadback, /receiver_user_id:\s*interaction/);
  assert.doesNotMatch(deviceJourneyReadback, /\b(insert|update|delete)\s+(into|public\.)/i);
});
