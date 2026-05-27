import { test, expect } from "@playwright/test";

test.describe("Quotation", () => {
  test("quotation page loads", async ({ page }) => {
    await page.goto("/quotations");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
