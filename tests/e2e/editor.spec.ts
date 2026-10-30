import { expect, test } from "@playwright/test";
const libraryKey = "bundlelab:saved-bundles:v1";
const chosenKey = "bundlelab:chosen-bundle:v1";
async function openChosen(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          source: "demo",
          savedAt: "2026-10-29T12:00:00.000Z",
          rationale:
            "A cleanser and serum form complementary steps in a daily ritual.",
          constraints: {
            maxPriceCents: 6000,
            minMarginBps: 8000,
            category: "skincare",
            theme: "daily",
          },
          draft: {
            title: "Starter ritual",
            lines: [
              { productId: "BL-001", quantity: 1 },
              { productId: "BL-004", quantity: 1 },
            ],
            discountBps: 1000,
          },
        }),
      ),
    chosenKey,
  );
  await page.goto("/bundle-editor");
  await expect(
    page.getByRole("main").getByLabel("Bundle name", { exact: true }),
  ).toHaveValue("Starter ritual");
}
test("editor synchronizes pricing, drawer selection, named library actions and listing handoff", async ({
  page,
}, testInfo) => {
  await openChosen(page);
  const main = page.getByRole("main");
  await expect(
    main.getByLabel("Final bundle price", { exact: true }),
  ).toHaveValue("59.40");
  await expect(
    main.getByText("Estimated gross margin is below the original target.", {
      exact: true,
    }),
  ).toBeVisible();
  await main.getByLabel("Bundle discount", { exact: true }).fill("0");
  await expect(
    main.getByLabel("Final bundle price", { exact: true }),
  ).toHaveValue("66.00");
  await expect(
    main.getByText("Sale price exceeds the original requested price cap.", {
      exact: true,
    }),
  ).toBeVisible();
  await main.getByLabel("Final bundle price", { exact: true }).fill("60.01");
  await expect(main.getByLabel("Bundle discount", { exact: true })).toHaveValue(
    "9.08",
  );
  await main
    .getByRole("button", { name: "Choose products", exact: true })
    .click();
  const picker = page.getByRole("dialog");
  await picker
    .getByLabel("Search catalog products", { exact: true })
    .fill("cream");
  await picker
    .getByLabel("Filter product category", { exact: true })
    .selectOption("skincare");
  await picker
    .getByRole("button", { name: "Add Everyday Barrier Cream", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "Done selecting", exact: true })
    .click();
  await expect(
    main.getByRole("button", { name: "Choose products", exact: true }),
  ).toBeFocused();
  await expect(
    main.getByLabel("Final bundle price", { exact: true }),
  ).toHaveValue("60.01");
  await expect(main.getByLabel("Bundle discount", { exact: true })).toHaveValue(
    "42.30",
  );
  await main.getByLabel("Bundle discount", { exact: true }).fill("10");
  await expect(
    main.getByLabel("Final bundle price", { exact: true }),
  ).toHaveValue("93.60");
  await main
    .getByRole("button", { name: "Remove Everyday Barrier Cream", exact: true })
    .click();
  await expect(
    main.getByLabel("Final bundle price", { exact: true }),
  ).toHaveValue("59.40");
  await main.getByLabel("Bundle name", { exact: true }).fill("My daily pair");
  await main.getByRole("button", { name: "Save bundle", exact: true }).click();
  await expect(
    main.getByRole("status").filter({ hasText: "Changes saved" }),
  ).toBeVisible();
  const library = main.getByRole("region", {
    name: "Saved bundles",
    exact: true,
  });
  await library
    .getByRole("button", { name: "Duplicate My daily pair", exact: true })
    .click();
  await expect(library.getByRole("article")).toHaveCount(2);
  await library
    .getByRole("button", { name: "Rename My daily pair copy", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Saved bundle name", { exact: true })
    .fill("Evening pair");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Rename bundle", exact: true })
    .click();
  await library
    .getByRole("button", { name: "Open Evening pair", exact: true })
    .click();
  await expect(main.getByLabel("Bundle name", { exact: true })).toHaveValue(
    "Evening pair",
  );
  await page.reload();
  await expect(main.getByLabel("Bundle name", { exact: true })).toHaveValue(
    "Evening pair",
  );
  await expect(library.getByRole("article")).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("bundle-editor.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await main
    .getByRole("button", { name: "Proceed to Listing Studio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/listing-studio$/);
  await expect(
    main.getByRole("heading", { name: "Evening pair", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Generate demo copy", exact: true }),
  ).toBeEnabled();
  await main
    .getByRole("link", { name: "Back to Bundle Editor", exact: true })
    .click();
  await library
    .getByRole("button", { name: "Delete Evening pair", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep bundle", exact: true })
    .click();
  await expect(library.getByRole("article")).toHaveCount(2);
  await library
    .getByRole("button", { name: "Delete Evening pair", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete bundle", exact: true })
    .click();
  await expect(library.getByRole("article")).toHaveCount(1);
  await page.reload();
  await expect(library.getByRole("article")).toHaveCount(1);
  await expect(main.getByLabel("Bundle name", { exact: true })).toHaveCount(0);
});
test("empty and invalid working drafts are honest, and replacement protects unsaved edits", async ({
  page,
}) => {
  await openChosen(page);
  const main = page.getByRole("main");
  await main.getByLabel("Final bundle price", { exact: true }).fill("-1");
  await expect(
    main.getByRole("button", { name: "Save bundle", exact: true }),
  ).toBeDisabled();
  await expect(main.locator(".editor-finances")).toHaveCount(0);
  await main.getByLabel("Bundle discount", { exact: true }).fill("51");
  await expect(
    main.getByRole("alert").filter({ hasText: "Discount must be between" }),
  ).toBeVisible();
  await main.getByLabel("Bundle discount", { exact: true }).fill("50");
  await main
    .getByRole("button", { name: "Remove Dewdrop Gel Cleanser", exact: true })
    .click();
  await main
    .getByRole("button", { name: "Remove Morning Dew Serum", exact: true })
    .click();
  await expect(
    main.getByRole("heading", { name: "Room for a good combination" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Save bundle", exact: true }),
  ).toBeDisabled();
  await expect(
    main.getByText("Gross margin is undefined at a zero sale price.", {
      exact: true,
    }),
  ).toBeVisible();
  await main.getByRole("button", { name: "New bundle", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Replace your working draft?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(main.getByLabel("Bundle name", { exact: true })).toHaveValue(
    "Starter ritual",
  );
});
test("storage write failures and corrupt libraries are disclosed without fabricated saves", async ({
  page,
}) => {
  await openChosen(page);
  const main = page.getByRole("main");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await main.getByRole("button", { name: "Save bundle", exact: true }).click();
  await expect(
    main.getByRole("alert").filter({ hasText: "have not been saved" }),
  ).toBeVisible();
  await expect(
    main.getByRole("region", { name: "Saved bundles" }).getByRole("article"),
  ).toHaveCount(0);
  await page.reload();
  await page.evaluate((key) => localStorage.setItem(key, "{bad"), libraryKey);
  await page.reload();
  await expect(
    main.getByRole("alert").filter({ hasText: "could not be read" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), libraryKey),
  ).toBe("{bad");
});
test("manual editor uses imported catalog products and preserves zero-money truthfully", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const product = {
      category: "wellness",
      description: "Fictional complimentary sample.",
      priceCents: 0,
      costCents: 0,
      stock: 10,
      tags: ["sample"],
      currency: "USD",
      artwork: "bottle",
    };
    localStorage.setItem(
      "bundlelab:imported-products:v1",
      JSON.stringify({
        version: 1,
        products: [
          { ...product, id: "FREE-A", name: "Complimentary Balm" },
          { ...product, id: "FREE-B", name: "Complimentary Tea" },
        ],
      }),
    );
  });
  await page.goto("/bundle-editor");
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Create a bundle", exact: true })
    .click();
  const picker = page.getByRole("dialog");
  await picker
    .getByLabel("Search catalog products", { exact: true })
    .fill("Complimentary");
  await picker
    .getByRole("button", { name: "Add Complimentary Balm", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "Add Complimentary Tea", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "Done selecting", exact: true })
    .click();
  await main
    .getByLabel("Bundle name", { exact: true })
    .fill("Complimentary pair");
  await expect(
    main.getByText("Gross margin is undefined at a zero sale price.", {
      exact: true,
    }),
  ).toBeVisible();
  await main.getByRole("button", { name: "Save bundle", exact: true }).click();
  await page.reload();
  await expect(main.getByLabel("Bundle name", { exact: true })).toHaveValue(
    "Complimentary pair",
  );
  await expect(
    main.locator(".editor-finances .margin-highlight dd"),
  ).toHaveText("Not defined");
});

test("deleting another saved bundle preserves incomplete active price edits", async ({
  page,
}) => {
  await openChosen(page);
  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Save bundle", exact: true }).click();
  await main
    .getByRole("button", { name: "Duplicate Starter ritual", exact: true })
    .click();
  const price = main.getByLabel("Final bundle price", { exact: true });
  await price.fill("");
  await main
    .getByRole("button", { name: "Delete Starter ritual copy", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete bundle", exact: true })
    .click();
  await expect(price).toHaveValue("");
  await expect(
    main.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await expect(main.locator(".editor-finances")).toHaveCount(0);
  await expect(main.getByLabel("Bundle name", { exact: true })).toHaveValue(
    "Starter ritual",
  );
});
