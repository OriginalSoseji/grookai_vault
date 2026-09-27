import { test, expect, type Page } from "@playwright/test";

const user = { id: "00000000-0000-0000-0000-000000000001", email: "fixture@example.test", aud: "authenticated", created_at: "2026-09-24T00:00:00Z" };
const session = { user, access_token: `e30.${Buffer.from(JSON.stringify({ exp: 4000000000, sub: user.id })).toString("base64url")}.fixture`,
  refresh_token: "fixture-refresh", expires_in: 3600, token_type: "bearer" };
async function intercept(page: Page, immediate = false) {
  const requests: URL[] = [];
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith("/signup")) return route.fulfill({ json: immediate ? session : { user, session: null } });
    if (url.pathname.endsWith("/resend")) return route.fulfill({ json: {} });
    if (url.pathname.endsWith("/token")) return route.fulfill({ json: session });
    if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
    return route.fulfill({ status: 400, json: { message: "Unexpected fixture request" } });
  });
  await page.route("**/api/telemetry/**", route => route.fulfill({ json: {} }));
  return requests;
}
async function signUp(page: Page) {
  await page.getByRole("button", { name: "Need an account? Sign up", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password-only");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
}

test("confirmation required explains next action and preserves account destination", async ({ page }, testInfo) => {
  const requests = await intercept(page);
  await page.goto("/login?next=%2Faccount");
  await signUp(page);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  const redirect = new URL(requests.find(url => url.pathname.endsWith("/signup"))!.searchParams.get("redirect_to")!);
  expect(redirect.origin).toBe(new URL(page.url()).origin);
  expect(redirect.pathname).toBe("/auth/callback");
  expect(redirect.searchParams.get("next")).toBe("/account");
  expect(redirect.searchParams.get("flow")).toBe("email");
  await page.screenshot({ path: testInfo.outputPath("confirmation.png") });
  await page.getByRole("button", { name: "Return to sign in" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(user.email);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.route("**/account", route => route.fulfill({ contentType: "text/html", body: "<h1>Fixture destination</h1>" }));
  await page.getByLabel("Password", { exact: true }).fill("fixture-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("immediate signup still navigates without a confirmation interstitial", async ({ page }) => {
  await intercept(page, true);
  await page.route("**/account", route => route.fulfill({ contentType: "text/html", body: "<h1>Fixture destination</h1>" }));
  await page.goto("/login?next=%2Faccount");
  await signUp(page);
  await expect(page).toHaveURL(/\/account$/);
});

test("failed confirmation offers sign-in and resend with a safe destination", async ({ page }) => {
  const requests = await intercept(page);
  await page.goto("/login?error=email_confirmation_failed&next=https%3A%2F%2Fexample.invalid");
  await expect(page.locator("form").getByRole("alert")).toContainText("confirmation link");
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Enter your email address first");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const redirect = new URL(requests.find(url => url.pathname.endsWith("/resend"))!.searchParams.get("redirect_to")!);
  expect(redirect.searchParams.get("next")).toBe("/vault");
});
