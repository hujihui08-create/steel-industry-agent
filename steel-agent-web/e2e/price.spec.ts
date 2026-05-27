import { test, expect } from "@playwright/test";

test.describe("Price Board", () => {
  test("price board page loads", async ({ page }) => {
    await page.goto("/price-board");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
