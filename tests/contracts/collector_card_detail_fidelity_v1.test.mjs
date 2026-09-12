import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
const read = path => readFileSync(new URL(`../../apps/web/src/${path}`, import.meta.url), 'utf8');

test('card detail preserves readers and slab action outside the authorized copy-options action', () => {
  const current = read('app/card/[gv_id]/page.tsx');
  // Frozen normalized business-body digest from preserved bcbf8bab754528bd78f65e983bb270c27de48579.
  // The private historical ref is not a prerequisite for a fresh public CI checkout.
  const baselineDigest = 'a8659114e83ea724106467f9d8a3ed8819774e987d4f73d85d71cc6a3559246d';
  const business = source => source.replaceAll('\r\n', '\n').split('async function CardPageContent(')[1].split('  const initialRenderMs')[0]
    .replace(/  async function addToVaultAction\([\s\S]*?(?=  async function createSlabAction)/, '');
  assert.equal(createHash('sha256').update(business(current)).digest('hex'), baselineDigest);
  assert.match(current, /parseCardAddOptions\(_formData.get\("condition"\), _formData.get\("quantity"\)\)/);
  assert.match(current, /conditionLabel: options.conditionLabel/);
  assert.match(current, /assertAuthenticatedVaultUser|actionClient.auth.getUser/);
});

test('collector sections have ordered navigation, bounded same-set results and grounded similarity', () => {
  const page = read('app/card/[gv_id]/page.tsx');
  const content = page.split('  const initialRenderMs')[1];
  assert.ok(content.indexOf('<NearbyCardsSection') < content.indexOf('<SetCollectionSection'));
  assert.ok(content.indexOf('<SetCollectionSection') < content.indexOf('<StreamedRelatedPrintsSection'));
  assert.equal((content.match(/<NearbyCardsSection/g) ?? []).length, 1);
  for (const token of ['getPublicSetCards(card.set_code, 0, 12, card.game_code)', '!excluded.has(item.gv_id)', 'slice(0, 5)', 'Same card name', 'Artist', 'Release date', 'Card type']) assert.ok(page.includes(token), token);
});

test('image update stays a reviewed authenticated submission and follows printing selection', () => {
  const panels = read('components/cards/CardPageMarketVaultPanels.tsx');
  for (const token of ['intent: "MISSING_IMAGE"', 'card: gvId', 'imageParams.set("printing", printingReference)', '/submit?', '/login?next=', 'Update image', 'printingReference={printingReference}']) assert.ok(panels.includes(token), token);
  assert.doesNotMatch(panels, /\.storage|\.update\(|\.insert\(/);
});

test('card artwork has no decorative stage or thumbnail background', () => {
  const css = read('app/collector-detail.css');
  assert.match(css, /\.gv-detail-art-stage \{[^}]*background: transparent/);
  assert.match(css, /a\.group img \{[^}]*background: transparent/);
  assert.doesNotMatch(css, /#f0d9c4/);
});

test('real detail keeps image truth, multiple faces, selected printing and actual action bindings', () => {
  const page = read('app/card/[gv_id]/page.tsx');
  for (const token of ['CardFaceGallery', 'CardImageTruthBadge', 'resolvedCardImageFallbacks.slice(1)', 'addToVaultAction={addToVaultAction}', 'createSlabAction={createSlabAction}', 'pricing={pricingUi}', 'pricingRecords={pricingRecords}', 'displayPrintingsWithOwnedCounts', 'ConditionSnapshotSection', 'OwnedObjectRemoveAction', 'CardNetworkOffersSection']) assert.ok(page.includes(token), token);
  assert.doesNotMatch(page, /collector-site-preview|useStore|sample Vault/);
});

test('compact actions still connect selection to pricing and genuine Vault, share and compare controls', () => {
  const panels = read('components/cards/CardPageMarketVaultPanels.tsx');
  for (const token of ['selectedCardPrintingId={selectedPrintingId}', 'selectedPrintingGvId={selectedPrintingGvId}', 'onSelectedPrintingChange={setSelectedPrinting}', 'AddToVaultCardAction', 'AddSlabCardAction', 'ShareCardButton', 'CompareCardButton']) assert.ok(panels.includes(token), token);
});

test('optional zoom label leaves every existing caller and image absence behavior intact', () => {
  const zoom = read('components/compare/CardZoomModal.tsx');
  for (const token of ['triggerLabel?: string', 'if (!hasImage)', 'fallbackSources={fallbackSources}', 'Escape', 'triggerElement?.focus()', 'aria-modal="true"']) assert.ok(zoom.includes(token), token);
  assert.ok(zoom.includes('disabled={!mounted}'));
});

test('compact printing presentation keeps a visible image limitation and exact writer payload', () => {
  const add = read('components/vault/AddToVaultCardAction.tsx');
  for (const token of ['compactPresentation = false', 'gv-detail-printing-notice', 'resolveCardImagePresentation(effectiveSelectedPrinting)', 'is_display_fallback ? null', 'name="card_printing_id" value={selectedChildPrintingId}', 'action={formAction}', 'onSelectedPrintingChange?.(printing)']) assert.ok(add.includes(token), token);
});

test('preview finish control is a native select, not the legacy nested panels', () => {
  const add = read('components/vault/AddToVaultCardAction.tsx');
  assert.ok(add.includes('htmlFor={finishSelectId}'));
  assert.ok(add.includes('value={effectiveSelectedPrinting?.id ?? ""}'));
  assert.ok(add.includes('if (printing) handleSelectedPrintingChange(printing)'));
  assert.doesNotMatch(add, /gv-detail-printing-disclosure/);
  const compact = add.split('{compactPresentation && printings.length > 0 ? (')[1].split(') : printingControls}')[0];
  assert.doesNotMatch(compact, /PrintingSelector|printingControls|Selected version|Image status/);
});
