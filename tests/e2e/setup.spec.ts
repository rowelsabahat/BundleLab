import { expect, test } from "@playwright/test";
test("foundation page is accessible and honest about scope", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BundleLab/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thoughtful bundles. Clearer decisions.",
  );
  await expect(
    page.getByText("Foundation ready", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
