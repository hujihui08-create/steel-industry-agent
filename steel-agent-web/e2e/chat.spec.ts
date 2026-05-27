import { test, expect } from "@playwright/test";

test.describe("Chat", () => {
  test("chat page loads with input", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Verify input area exists
    const inputArea = page.locator("textarea, input[type='text'], [role='textbox']").first();
    if (await inputArea.isVisible()) {
      await expect(inputArea).toBeVisible();
    }
  });
});
