import { expect, test } from "@playwright/test";

test("opens the home page and navigates to submission", async ({ page }) => {
  await page.goto("./#/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/easymsa/i);

  await page.getByRole("link", { name: /start analysis|开始分析/i }).click();
  await expect(page).toHaveURL(/#\/submit$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /submit job|提交任务/i
  );
});
