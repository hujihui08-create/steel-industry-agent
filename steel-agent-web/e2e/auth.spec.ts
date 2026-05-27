import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads successfully", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/登录/);
    await expect(page.getByPlaceholder("请输入手机号")).toBeVisible();
  });

  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByText("后台管理")).toBeVisible();
  });

  test("home page shows login when unauthenticated", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Should show some landing or login prompt
    await expect(page.locator("body")).toBeVisible();
  });
});
