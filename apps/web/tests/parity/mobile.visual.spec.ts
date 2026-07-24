import { expect, test } from "@playwright/test";
import { openParityScenario, parityScenarios } from "./helpers";

for (const scenario of parityScenarios) {
  test(`${scenario} matches the approved local golden`, async ({ page }) => {
    await openParityScenario(page, scenario);
    await expect(page).toHaveScreenshot(`${scenario}.png`, {
      fullPage: false,
    });
  });
}
