import { expect, test } from "@playwright/test";
const header =
  "id,name,category,description,retail_price,cost,stock,tags,currency\n";
const sample =
  header +
  "CUSTOM-1,Meadow Test Balm,skincare,A soft shea balm.,18.00,5.50,40,shea|hands,USD\n";
test("overview, navigation, catalog search, filters, details and focus", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BundleLab/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A little more possibility",
  );
  await expect(page.getByText("24 sample · 0 imported")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("overview.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Explore your catalog" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(24);
  await page.screenshot({ path: testInfo.outputPath("catalog.png") });
  await page.getByRole("button", { name: /^Wellness/ }).click();
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(8);
  await page.getByRole("button", { name: /^All products/ }).click();
  await page.getByRole("textbox", { name: "Search products" }).fill("BL-001");
  const opener = page.getByRole("button", {
    name: "View Dewdrop Gel Cleanser",
  });
  await expect(opener).toBeVisible();
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("$24.00", { exact: true })).toBeVisible();
  await expect(dialog.getByText("$8.20", { exact: true })).toBeVisible();
  await expect(dialog.getByText("65.8%", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page
    .getByRole("textbox", { name: "Search products" })
    .fill("does-not-exist");
  await expect(
    page.getByRole("heading", { name: "No products match just yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".list-card")).toHaveCount(24);
  for (const name of ["Bundle Generator", "Bundle Editor", "Listing Studio"]) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: new RegExp(name) })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("CSV errors are atomic; valid imports persist, duplicate IDs fail, and reset restores seed", async ({
  page,
}) => {
  await page.goto("/catalog");
  await page
    .getByRole("button", { name: "Import products", exact: true })
    .click();
  const input = page.getByLabel("Choose product CSV");
  await expect(
    page.getByRole("link", { name: "Download sample CSV" }),
  ).toHaveAttribute("download", "bundlelab-products-template.csv");
  await input.setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      sample + "CUSTOM-2,Bad Balm,skincare,A balm.,-1,1,2,shea,USD",
    ),
  });
  await expect(page.getByRole("alert")).toContainText("Row 3:");
  await input.setInputFiles({
    name: "valid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sample),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "1 product imported" }),
  ).toBeVisible();
  await input.setInputFiles({
    name: "duplicate.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sample),
  });
  await expect(page.getByRole("alert")).toContainText("already exists");
  await page
    .getByRole("button", { name: "Back to catalog" })
    .or(page.getByRole("button", { name: "Close", exact: true }))
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "View Meadow Test Balm" }),
  ).toBeVisible();
  await expect(page.getByText("1 imported", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Clear saved imports", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear imports", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(24);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "View Meadow Test Balm" }),
  ).toHaveCount(0);
});
test("corrupt storage is disclosed and can be recovered without overwriting it", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("bundlelab:imported-products:v1", "{bad"),
  );
  await page.goto("/catalog");
  await page.reload();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Saved imports could not be loaded" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import products", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Clear saved imports", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear imports", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import products", exact: true }),
  ).toBeEnabled();
});
test("blocked writes do not report successful imports", async ({ page }) => {
  await page.goto("/catalog");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Import products", exact: true })
    .click();
  await page.getByLabel("Choose product CSV").setInputFiles({
    name: "valid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sample),
  });
  await expect(page.getByRole("alert")).toContainText("No products were added");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: /^View / })).toHaveCount(24);
});

test("a stale catalog tab cannot overwrite newer imports", async ({
  page,
  context,
}) => {
  await page.goto("/catalog");
  await expect(page.getByText("0 imported", { exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/catalog");
  await other
    .getByRole("button", { name: "Import products", exact: true })
    .click();
  await other.getByLabel("Choose product CSV").setInputFiles({
    name: "first.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sample),
  });
  await expect(
    other.getByRole("status").filter({ hasText: "1 product imported" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import products", exact: true })
    .click();
  await page.getByLabel("Choose product CSV").setInputFiles({
    name: "second.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(sample.replaceAll("CUSTOM-1", "CUSTOM-2")),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Another tab changed the catalog",
  );
  await page.reload();
  await expect(page.getByText("1 imported", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("bundlelab:imported-products:v1") ?? "null",
    ),
  );
  expect(stored.products.map((product: { id: string }) => product.id)).toEqual([
    "CUSTOM-1",
  ]);
});

test("keyboard-only catalog details trap focus and restore it on Escape", async ({
  page,
}) => {
  await page.goto("/catalog");
  const search = page.getByRole("textbox", { name: "Search products" });
  await search.focus();
  await page.keyboard.type("BL-001");
  const opener = page.getByRole("button", {
    name: "View Dewdrop Gel Cleanser",
    exact: true,
  });
  for (
    let step = 0;
    step < 12 &&
    !(await opener.evaluate((element) => element === document.activeElement));
    step++
  )
    await page.keyboard.press("Tab");
  await expect(opener).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let step = 0; step < 8; step++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});
