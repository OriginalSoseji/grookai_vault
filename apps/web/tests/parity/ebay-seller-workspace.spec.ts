import { expect, test, type Page } from '@playwright/test';

const id = (n: number) => `ed000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const copy = { id: id(2), gvviId: 'GVVI-SELLER-FIXTURE-000002', name: 'Eevee', gvId: 'GV-PK-PR-SV-173',
  setCode: 'PR-SV', number: '173', condition: null, isGraded: false, grader: null, grade: null, cardPrintingId: id(4) };
const listing = () => ({ title: 'Eevee 173 exact physical copy', description: 'Actual fixture copy, front and back photographed.',
  priceCents: 1250, categoryId: '183454', locationKey: 'home', policies: { fulfillment: '20', payment: '21', return: '22' },
  aspects: { Game: ['Pokemon'] }, condition: { conditionId: '4000', description: 'Edge wear shown in photos.',
    descriptors: [{ id: '40001', values: ['400015'] }] } });
const metadata = { categoryId: '183454', fetchedAt: Date.now(),
  policies: Object.fromEntries(['fulfillment', 'payment', 'return'].map((kind, i) => [kind, [{ [kind + 'PolicyId']: String(20 + i), name: `${kind} policy` }]])),
  locations: [{ merchantLocationKey: 'home', merchantLocationStatus: 'ENABLED', name: 'Home stock' }],
  aspects: [{ localizedAspectName: 'Game', aspectConstraint: { aspectRequired: true, aspectMode: 'SELECTION_ONLY', itemToAspectCardinality: 'SINGLE' }, aspectValues: [{ localizedValue: 'Pokemon' }] }],
  conditionChoices: [{ conditionId: '4000', conditionDescription: 'Ungraded', conditionDescriptors: [{
    conditionDescriptorId: '40001', conditionDescriptorName: 'Card Condition',
    conditionDescriptorConstraint: { usage: 'REQUIRED', mode: 'SELECTION_ONLY', cardinality: 'SINGLE' },
    conditionDescriptorValues: [{ conditionDescriptorValueId: '400010', conditionDescriptorValueName: 'Near Mint or Better' },
      { conditionDescriptorValueId: '400015', conditionDescriptorValueName: 'Lightly Played (Excellent)' }],
  }] }], suggestedCondition: { conditionId: '4000', description: '', descriptors: [] } };
const frozenReview = { reviewDetails: { condition: 'Ungraded', conditionDescription: 'Edge wear shown in photos.',
  descriptors: [{ name: 'Card Condition', values: ['Lightly Played (Excellent)'] }], aspects: { Game: ['Pokemon'] },
  policies: { fulfillment: { name: 'Tracked shipping', terms: ['DOMESTIC · USPSGroundAdvantage · USD 3.99'] },
    payment: { name: 'eBay payments', terms: [] }, return: { name: '30-day returns', terms: ['Returns accepted: 30 day'] } } } };

async function setup(page: Page, options: { saved?: boolean; prepared?: boolean; stale?: boolean; lostSave?: boolean; lostPublish?: boolean } = {}) {
  const requests: Record<string, unknown>[] = [];
  let firstSave = true;
  let prepareStep = 0;
  await page.route('**/api/canon/cards/**/image', route => route.fulfill({ contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="90"><rect width="64" height="90" rx="7" fill="#d6c886"/><rect x="4" y="4" width="56" height="82" rx="4" fill="#314633"/><circle cx="32" cy="40" r="18" fill="#9cae72"/><text x="8" y="77" fill="white" font-size="10">Fixture 173</text></svg>' }));
  let draft: Record<string, unknown> | null = options.saved || options.prepared ? {
    id: id(3), instanceId: copy.id, accountId: id(5), revision: 1, state: options.prepared ? 'prepared' : 'editing',
    input: listing(), photos: [{ id: id(6), path: `${id(1)}/${id(3)}/${id(6)}.jpg`, state: 'hosted' }],
    operations: [], reviewHash: 'a'.repeat(64), listingId: null,
    prepared: options.prepared ? frozenReview : null,
    feeQuote: options.prepared ? { requestedAt: Date.now() - (options.stale ? 121000 : 0),
      fees: [{ type: 'InsertionFee', amount: { currency: 'USD', cents: 35 } }] } : null,
  } : null;
  await page.route('**/api/ebay/seller**', async route => {
    const req = route.request();
    if (req.method() === 'GET') {
      const url = new URL(req.url());
      return route.fulfill({ json: url.searchParams.has('draftId') ? { draft } : {
        account: { accountId: id(5), username: 'Fixture seller', linked: true, reconnectRequired: false,
          linkingEnabled: true, preparationEnabled: true, publicationEnabled: true }, copy,
        drafts: draft ? [{ id: draft.id, instanceId: copy.id, revision: draft.revision, state: draft.state, title: 'Eevee' }] : [],
      } });
    }
    const body = req.postDataJSON(); requests.push(body);
    if (body.action === 'metadata') return route.fulfill({ json: metadata });
    if (body.action === 'save') {
      draft = { ...(draft ?? {}), id: body.draftId, instanceId: copy.id, accountId: id(5),
        revision: 1, state: 'editing', input: body.listing, photos: draft?.photos ?? [], operations: [],
        reviewHash: null, feeQuote: null, listingId: null };
      if (options.lostSave && firstSave) { firstSave = false; return route.abort('failed'); }
      return route.fulfill({ json: { id: draft.id, revision: draft.revision, state: draft.state } });
    }
    if (body.action === 'prepare') {
      prepareStep++;
      if (prepareStep === 1) return route.fulfill({ json: { operationId: id(7), status: 'running', continuationReady: true } });
      draft = { ...draft, state: 'prepared', prepared: frozenReview, reviewHash: 'a'.repeat(64), feeQuote: {
        requestedAt: Date.now(), fees: [{ type: 'InsertionFee', amount: { currency: 'USD', cents: 35 } }] } };
      return route.fulfill({ json: { operationId: id(7), status: 'succeeded', state: 'prepared' } });
    }
    if (body.action === 'remove_photo') {
      draft = { ...draft, photos: [], revision: Number(draft?.revision) + 1 };
      return route.fulfill({ json: { revision: draft.revision } });
    }
    if (body.action === 'abandon') {
      draft = { ...draft, state: 'abandoned', revision: Number(draft?.revision) + 1 };
      return route.fulfill({ json: { state: 'abandoned', revision: draft.revision } });
    }
    if (body.action === 'edit') {
      draft = { ...draft, state: 'editing', revision: Number(draft?.revision) + 1,
        prepared: null, reviewHash: null, feeQuote: null };
      return route.fulfill({ json: { state: 'editing', revision: draft.revision } });
    }
    if (body.action === 'publish') {
      if (options.lostPublish) { draft = { ...draft, state: 'uncertain' }; return route.abort('failed'); }
      draft = { ...draft, state: 'live', listingId: '1234567890' };
      return route.fulfill({ json: { status: 'succeeded', state: 'live' } });
    }
    return route.fulfill({ status: 409, json: { error: 'Fixture action is unavailable.' } });
  });
  return requests;
}

test('unknown copy condition stays unselected while current selling options load', async ({ page }) => {
  await setup(page); await page.goto('/visual-fixtures/ebay-seller');
  await page.getByRole('button', { name: 'Load eBay options' }).click();
  await expect(page.getByLabel('Card Condition')).toHaveValue('');
  await expect(page.getByText('Condition unknown', { exact: false })).toBeVisible();
});

test('removing a copy photo updates its revision and blocks preparation without photos', async ({ page }) => {
  const calls = await setup(page, { saved: true });
  await page.goto('/visual-fixtures/ebay-seller');
  await page.getByRole('button', { name: 'Load eBay options' }).click();
  await page.getByRole('button', { name: 'Remove photo 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove photo 1', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prepare listing', exact: true })).toBeDisabled();
  const removals = calls.filter(c => c.action === 'remove_photo');
  expect(removals).toHaveLength(1);
  expect(removals[0].photoId).toBe(id(6));
  expect(calls.some(c => c.action === 'publish')).toBe(false);
});

test('a discarded draft permits a distinct local draft that survives refresh', async ({ page }) => {
  const calls = await setup(page, { saved: true });
  await page.goto('/visual-fixtures/ebay-seller?draftId=' + id(3));
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new listing', exact: true }).click();
  await expect(page).not.toHaveURL(/draftId=/);
  await page.getByLabel('Asking price in USD').fill('9.87');
  await page.reload();
  await expect(page.getByLabel('Asking price in USD')).toHaveValue('9.87');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => calls.filter(c => c.action === 'save').length).toBe(1);
  expect(calls.find(c => c.action === 'save')?.draftId).not.toBe(id(3));
});

test('price typing accepts decimal entry and retains it across reload', async ({ page }) => {
  await setup(page); await page.goto('/visual-fixtures/ebay-seller');
  await page.getByLabel('Asking price in USD').fill('1.25');
  await expect(page.getByLabel('Asking price in USD')).toHaveValue('1.25');
  await page.reload();
  await expect(page.getByLabel('Asking price in USD')).toHaveValue('1.25');
});

test('a lost save acknowledgement retains the same draft identity through refresh and retry', async ({ page }) => {
  const calls = await setup(page, { lostSave: true }); await page.goto('/visual-fixtures/ebay-seller');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible(); await page.reload();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => calls.filter(c => c.action === 'save').length).toBe(2);
  const writes = calls.filter(c => c.action === 'save'); expect(writes[0].draftId).toBe(writes[1].draftId);
});

test('preparation continues acknowledged steps but does not publish until separate final review', async ({ page }) => {
  const calls = await setup(page, { saved: true }); await page.goto('/visual-fixtures/ebay-seller');
  await page.getByRole('button', { name: 'Load eBay options' }).click();
  await page.getByRole('button', { name: 'Prepare listing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your listing' })).toBeVisible();
  expect(calls.filter(c => c.action === 'prepare')).toHaveLength(2);
  expect(calls.filter(c => c.action === 'publish')).toHaveLength(0);
  const publish = page.getByRole('button', { name: 'Publish on eBay', exact: true }); await expect(publish).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I reviewed this exact copy', exact: false }).check();
  await expect(publish).toBeEnabled(); await publish.click();
  await expect(page.getByRole('heading', { name: 'Live listing' })).toBeVisible();
  expect(calls.filter(c => c.action === 'publish')).toHaveLength(1);
});

test('a lost publication result stops after one call and remains available for status recovery', async ({ page }) => {
  const calls = await setup(page, { prepared: true, lostPublish: true }); await page.goto('/visual-fixtures/ebay-seller');
  await page.getByRole('checkbox', { name: 'I reviewed this exact copy', exact: false }).check();
  await page.getByRole('button', { name: 'Publish on eBay', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible(); await page.reload();
  await expect(page.getByRole('button', { name: 'Check eBay status', exact: true })).toBeVisible();
  expect(calls.filter(c => c.action === 'publish')).toHaveLength(1);
});

test('expired fee evidence cannot enable publication', async ({ page }) => {
  await setup(page, { prepared: true, stale: true }); await page.goto('/visual-fixtures/ebay-seller');
  await expect(page.getByRole('button', { name: 'Publish on eBay', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'I reviewed this exact copy', exact: false })).toBeDisabled();
  await expect(page.getByText('The fee quote has expired.', { exact: false })).toBeVisible();
});

test('a prepared listing retains readable condition and shipping terms without reloading mutable metadata', async ({ page }) => {
  const calls = await setup(page, { prepared: true }); await page.goto('/visual-fixtures/ebay-seller');
  await expect(page.getByText('Lightly Played (Excellent)', { exact: true })).toBeVisible();
  await expect(page.getByText('DOMESTIC · USPSGroundAdvantage · USD 3.99', { exact: true })).toBeVisible();
  expect(calls.filter(c => c.action === 'metadata')).toHaveLength(0);
});

for (const width of [384, 1200]) for (const colorScheme of ['dark', 'light'] as const) {
  test(`seller review fits ${width}px ${colorScheme} with bundled type and canonical controls`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 824 }); await page.emulateMedia({ colorScheme });
    await setup(page, { prepared: true }); await page.goto('/visual-fixtures/ebay-seller');
    await expect(page.getByRole('heading', { name: 'Review your listing' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      font: getComputedStyle(document.body).fontFamily,
      radius: getComputedStyle(document.querySelector('main button')!).borderRadius }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.width); expect(layout.font.toLowerCase()).toContain('roboto');
    expect(layout.radius).toBe('8px');
    await page.screenshot({ path: testInfo.outputPath('seller-review.png'), fullPage: true });
  });
}
