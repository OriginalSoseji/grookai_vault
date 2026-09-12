import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectedCollectorImageCounts, installCollectorFixtureRoutes } from './fixtureSetup';

test.beforeEach(async ({ context, baseURL }) => {
  await installCollectorFixtureRoutes(context, baseURL);
});

for (const view of ['pulse', 'discover'] as const) {
  test(`collector ${view} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(`/visual-fixtures/collector?view=${view}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-collector-fixture-root]')).toBeVisible();
    await expect(page.locator('main img')).toHaveCount(expectedCollectorImageCounts[view]);
    const result = await new AxeBuilder({ page }).include('[data-collector-fixture-root]').analyze();
    const serious = result.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious');
    expect(serious.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
  });
}
