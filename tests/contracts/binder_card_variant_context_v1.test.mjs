import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/20260801160000_binder_card_variant_context_v1.sql',
  import.meta.url,
);
const migration = readFileSync(migrationPath, 'utf8');
const rpc = readFileSync(
  new URL('../../apps/web/src/lib/binders/rpc.ts', import.meta.url),
  'utf8',
);
const checklist = readFileSync(
  new URL('../../apps/web/src/components/binders/BinderChecklist.tsx', import.meta.url),
  'utf8',
);
const views = readFileSync(
  new URL('../../apps/web/src/components/binders/BinderViews.tsx', import.meta.url),
  'utf8',
);
const cardOptions = readFileSync(
  new URL('../../apps/web/src/app/binders/card-options/route.ts', import.meta.url),
  'utf8',
);
const editor = readFileSync(
  new URL('../../apps/web/src/components/binders/CustomBinderSlotEditor.tsx', import.meta.url),
  'utf8',
);

test('binder card context exposes governed canonical variant fields', () => {
  assert.match(
    migration,
    /create or replace function public\.binder_card_json_v1\(/i,
  );
  assert.match(migration, /'variant_key',\s*left\(nullif\(btrim\(cp\.variant_key\)/i);
  assert.match(
    migration,
    /'printed_identity_modifier',\s*left\(nullif\(btrim\(cp\.printed_identity_modifier\)/i,
  );
  assert.match(migration, /'rarity',\s*left\(nullif\(btrim\(cp\.rarity\)/i);
  assert.match(migration, /'finish_label'/i);
  assert.match(migration, /'canonical_image_url'/i);
  assert.match(migration, /'hosted_image'/i);
});

test('binder variant context remains a bounded read-only contract', () => {
  assert.match(migration, /^begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(migration, /alter\s+table|create\s+table|drop\s+table/i);
  assert.doesNotMatch(migration, /split_part\s*\([^)]*gv_id|regexp[^\n]*gv_id/i);
});

test('binder web reads and renders exact printing identity on every card row', () => {
  assert.match(rpc, /function binderPrintingLabels\(item: JsonRecord, card: JsonRecord\)/);
  assert.match(rpc, /field\(card, "variant_key"\)/);
  assert.match(rpc, /field\(card, "printed_identity_modifier"\)/);
  assert.match(rpc, /field\(card, "finish_label"\)/);
  assert.match(rpc, /\["Standard print"\]/);
  assert.match(checklist, /copy\.printingLabels\.join\(" · "\)/);
  assert.match(checklist, /slot\.printingLabels\.join\(" · "\)/);
  assert.match(views, /slot\.printingLabels\.join\(" · "\)/);
  assert.match(cardOptions, /variantLabels: getVariantLabels\(/);
  assert.match(editor, /option\.variantLabels/);
  assert.match(editor, /getEditorPrintingLabels\(slot\)\.join\(" · "\)/);
});
