import { test, expect } from "@playwright/test";

// ============================================================
// Auth mock data — stored in localStorage before app loads
// ============================================================
const AUTH_DATA = {
  state: {
    access_token: "test-token-e2e",
    refresh_token: "test-refresh-e2e",
    isAuthenticated: true,
  },
  version: 2,
};

// ============================================================
// Shared route mocks set up once per test
// ============================================================
async function setupAuthAndRoutes(page: import("@playwright/test").Page) {
  // Inject auth state before app loads
  await page.addInitScript(
    (authDataStr: string) => {
      localStorage.setItem("auth-storage", authDataStr);
    },
    JSON.stringify(AUTH_DATA),
  );

  // Mock sessions list (called after SSE completes)
  await page.route("**/api/v1/chat/sessions**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: 200,
          message: "success",
          data: [
            {
              id: 1,
              user_id: 1,
              title: "测试会话",
              model: "",
              message_count: 2,
              context: null,
              created_at: "2025-06-23T10:00:00Z",
              updated_at: "2025-06-23T10:00:00Z",
            },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock session messages (called after SSE completes)
  await page.route(
    "**/api/v1/chat/sessions/*/messages**",
    async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: 200,
            message: "success",
            data: [],
          }),
        });
      } else {
        await route.continue();
      }
    },
  );
}

// ============================================================
// SSE response builders
// ============================================================

/** SSE: text-only response */
function sseTextOnly(content: string, sessionTitle?: string): string {
  const parts: string[] = [];
  parts.push(`data: {"content":${JSON.stringify(content)}}\n`);
  if (sessionTitle) {
    parts.push(`data: {"session_id":1,"title":${JSON.stringify(sessionTitle)}}\n`);
  }
  parts.push("data: [DONE]\n");
  return parts.join("\n");
}

/** SSE: text + price card response */
function sseWithPriceCard(): string {
  return [
    'data: {"content":"今日螺纹钢小幅上涨。"}\n',
    'data: {"type":"card","card_type":"price","data":{"eyebrow":"PRICE","title":"螺纹钢","prices":[{"region":"上海","spec":"HRB400E 20mm","price":3850,"change":12,"changePct":0.31}]}}\n',
    'data: {"session_id":1,"title":"螺纹钢价格"}\n',
    "data: [DONE]\n",
  ].join("\n");
}

// ============================================================
// Tests
// ============================================================

test.describe("Chat", () => {
  // ---- Existing test (unchanged) ----
  test("chat page loads with input", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Verify input area exists
    const inputArea = page
      .locator("textarea, input[type='text'], [role='textbox']")
      .first();
    if (await inputArea.isVisible()) {
      await expect(inputArea).toBeVisible();
    }
  });

  // ---- Conversation Flow Tests ----
  test.describe("Conversation Flow", () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthAndRoutes(page);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    test("sends a message and sees user bubble appear", async ({ page }) => {
        // Mock SSE to return simple text
        await page.route("**/api/v1/chat/completions**", async (route) => {
          await route.fulfill({
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
            body: sseTextOnly("您好，这是测试回复。", "上海螺纹钢价格"),
          });
        });

        // Use .last() because ChatInput renders two textareas:
        //   [0] mobile (lg:hidden, hidden on desktop)
        //   [1] desktop (hidden lg:block, visible on desktop)
        const input = page.locator('textarea[aria-label="输入消息"]').last();
        await input.fill("上海螺纹钢价格");

        const sendButton = page.locator('button[aria-label="发送消息"]').last();
        await sendButton.click();

        // Wait for message to render
        await page.waitForTimeout(2000);

        // User message should appear on the page
        await expect(page.locator("body")).toContainText("上海螺纹钢价格");
      });

      test("does not send empty message", async ({ page }) => {
        const input = page.locator('textarea[aria-label="输入消息"]').last();
        await input.fill("");
        await input.fill("   "); // whitespace only

        // Send button should be disabled for empty/whitespace input
        const sendButton = page.locator('button[aria-label="发送消息"]').last();
        await expect(sendButton).toBeDisabled();

        // Page should still be functional — no crash, no new messages
        await expect(page.locator("body")).toBeVisible();
        // The empty state should still be visible
        // (page shows welcome message when no messages exist)
      });

      test("shows AI response after sending a query", async ({ page }) => {
        // Mock SSE with text + price card
        await page.route("**/api/v1/chat/completions**", async (route) => {
          await route.fulfill({
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
            body: sseWithPriceCard(),
          });
        });

        const input = page.locator('textarea[aria-label="输入消息"]').last();
        await input.fill("螺纹钢价格");

        const sendButton = page.locator('button[aria-label="发送消息"]').last();
        await sendButton.click();

        // Wait for SSE processing and rendering
        await page.waitForTimeout(2500);

        // Should see AI text response
        await expect(page.locator("body")).toContainText("今日螺纹钢小幅上涨");

        // Should see card eyebrow (PRICE)
        await expect(page.locator("body")).toContainText("PRICE");
      });

      test("can interact with card inside AI bubble", async ({ page }) => {
        // Mock SSE with price card
        await page.route("**/api/v1/chat/completions**", async (route) => {
          await route.fulfill({
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
            body: sseWithPriceCard(),
          });
        });

        const input = page.locator('textarea[aria-label="输入消息"]').last();
        await input.fill("价格");

        const sendButton = page.locator('button[aria-label="发送消息"]').last();
        await sendButton.click();
        await page.waitForTimeout(2500);

        // Card should be visible — look for PRICE eyebrow text
        const card = page.locator("text=PRICE").first();
        await expect(card).toBeVisible();

        // Click the card — should trigger detail panel or interaction
        await card.click();
        await page.waitForTimeout(500);

        // Page should still be functional after interaction
        await expect(page.locator("body")).toBeVisible();
      });
  });
});
