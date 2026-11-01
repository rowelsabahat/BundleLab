import { expect, test } from "@playwright/test";
const preference = "bundlelab:design-preview:v1";
const bundleKey = "bundlelab:saved-bundles:v1";
const copyKey = "bundlelab:listings:v1";

test("design comparison is reversible across the full workflow without changing bundle or listing data", async ({
  page,
}, testInfo) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `comparison-${testInfo.project.name}`,
  });
  await page.goto("/");
  const shell = page.locator(".app-shell");
  const design = page.getByRole("group", {
    name: "Design preview",
    exact: true,
  });
  await expect(shell).toHaveAttribute("data-design", "editorial");
  await expect(
    page.getByRole("main").locator(".editorial-wordmark"),
  ).toBeVisible();
  await page
    .getByRole("main")
    .locator(".overview-feature")
    .screenshot({
      path: testInfo.outputPath("editorial-overview-hero.png"),
    });
  await design.getByRole("button", { name: "Original", exact: true }).click();
  await expect(shell).toHaveAttribute("data-design", "original");
  await expect(
    page.getByRole("main").locator(".editorial-wordmark"),
  ).not.toBeVisible();
  await page.reload();
  await expect(shell).toHaveAttribute("data-design", "original");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Bundle Generator", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore demo bundles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Customize this bundle", exact: true })
    .first()
    .click();
  const title = page.getByLabel("Bundle name", { exact: true });
  await title.fill("Keep this combination");
  await page.getByLabel("Final bundle price", { exact: true }).fill("60.01");
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    bundleKey,
  );
  await design.getByRole("button", { name: "Editorial", exact: true }).click();
  await expect(title).toHaveValue("Keep this combination");
  await expect(
    page.getByLabel("Final bundle price", { exact: true }),
  ).toHaveValue("60.01");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), bundleKey),
  ).toBe(before);
  await page
    .getByRole("button", { name: "Proceed to Listing Studio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate demo copy", exact: true })
    .click();
  const copyTitle = page.getByLabel("Listing product title", { exact: true });
  await expect(copyTitle).not.toHaveValue("");
  await copyTitle.fill("My collection, preserved");
  const savedCopy = await page.evaluate(
    (key) => localStorage.getItem(key),
    copyKey,
  );
  const savedBundle = await page.evaluate(
    (key) => localStorage.getItem(key),
    bundleKey,
  );
  await design.getByRole("button", { name: "Original", exact: true }).click();
  await expect(copyTitle).toHaveValue("My collection, preserved");
  expect(await page.evaluate((key) => localStorage.getItem(key), copyKey)).toBe(
    savedCopy,
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), bundleKey),
  ).toBe(savedBundle);
  await page.reload();
  await expect(shell).toHaveAttribute("data-design", "original");
  await expect(copyTitle).toHaveValue("My collection, preserved");
  await expect(
    page.getByRole("button", { name: "Export JSON", exact: true }),
  ).toBeEnabled();
  await design.getByRole("button", { name: "Editorial", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("editorial-studio-generated.png"),
    fullPage: true,
  });
});

test("an invalid or unwritable design preference cannot block the comparison", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "unknown-style");
  }, preference);
  await page.goto("/catalog");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-design",
    "editorial",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page
    .getByRole("group", { name: "Design preview", exact: true })
    .getByRole("button", { name: "Original", exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-design",
    "original",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Design changed for this tab" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("button", { name: /^View / }),
  ).toHaveCount(24);
});
