import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const id = "740b58c0-a90b-420c-b9a1-3d459ec3d0c1";
const fixture = {
  id,
  source: "manual",
  rationale: "",
  constraints: {
    maxPriceCents: null,
    minMarginBps: null,
    category: "all",
    theme: "",
  },
  createdAt: "2026-10-29T12:00:00.000Z",
  updatedAt: "2026-10-29T12:00:00.000Z",
  draft: {
    title: "Approved pair",
    lines: [
      { productId: "BL-001", quantity: 1 },
      { productId: "BL-004", quantity: 1 },
    ],
    pricing: { mode: "price", priceCents: 6001 },
  },
};
async function seedBundle(page: Page, ip: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await page.goto("/");
  await page.evaluate(
    (bundle) =>
      localStorage.setItem(
        "bundlelab:saved-bundles:v1",
        JSON.stringify({
          version: 1,
          active: bundle,
          bundles: [bundle],
          recommendationAt: null,
        }),
      ),
    fixture,
  );
  await page.goto("/listing-studio");
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Approved pair", exact: true }),
  ).toBeVisible();
}
test("complete Catalog → Generator → Editor → Studio workflow edits, previews, copies and exports", async ({
  page,
  context,
}, testInfo) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `complete-${testInfo.project.name}`,
  });
  await page.goto("/catalog");
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: /^View / })).toHaveCount(24);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Bundle Generator", exact: true })
    .click();
  await main
    .getByRole("button", { name: "Explore demo bundles", exact: true })
    .click();
  await main
    .getByRole("region", { name: "Bundle recommendations" })
    .getByRole("button", { name: "Customize this bundle", exact: true })
    .first()
    .click();
  await main
    .getByLabel("Bundle name", { exact: true })
    .fill("My launch bundle");
  await main.getByLabel("Final bundle price", { exact: true }).fill("60.01");
  await main
    .getByRole("button", { name: "Proceed to Listing Studio", exact: true })
    .click();
  await expect(
    main.getByText("Demo Mode · Simulated", { exact: true }),
  ).toBeVisible();
  await main
    .getByRole("button", { name: "Generate demo copy", exact: true })
    .click();
  const title = main.getByLabel("Listing product title", { exact: true });
  await expect(title).not.toHaveValue("");
  await title.fill("The weekend collection");
  await main
    .getByLabel("Listing short description", { exact: true })
    .fill("A selected skincare lineup, brought together.");
  await main
    .getByLabel("Listing detailed description", { exact: true })
    .fill(
      "Explore the selected products.\n\nPrepared as one considered bundle.",
    );
  for (let i = 1; i <= 3; i++)
    await main
      .getByLabel(`Selling point ${i}`, { exact: true })
      .fill(`Selected product detail ${i}`);
  await main
    .getByLabel("Listing promotional copy", { exact: true })
    .fill("Explore the weekend collection.");
  const preview = main.getByRole("region", {
    name: "Storefront live preview",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", {
      name: "The weekend collection",
      exact: true,
    }),
  ).toBeVisible();
  await expect(preview.getByText("$60.01", { exact: false })).toBeVisible();
  await preview
    .getByRole("button", { name: "Preview Dewdrop Gel Cleanser", exact: true })
    .click();
  await expect(
    preview.getByRole("button", {
      name: "Preview Dewdrop Gel Cleanser",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await preview
    .getByRole("button", { name: "About the collection", exact: true })
    .click();
  await expect(
    preview.getByText("Explore the selected products.", { exact: false }),
  ).not.toBeVisible();
  await preview
    .getByRole("button", { name: "About the collection", exact: true })
    .click();
  await main.getByRole("button", { name: /^Playful/ }).click();
  await expect(title).toHaveValue("The weekend collection");
  await main
    .getByRole("button", { name: "Regenerate demo copy", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep my edits", exact: true })
    .click();
  await expect(title).toHaveValue("The weekend collection");
  await page.reload();
  await expect(title).toHaveValue("The weekend collection");
  await expect(main.getByRole("button", { name: /^Playful/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:3100",
  });
  await main
    .getByRole("button", { name: "Copy formatted text", exact: true })
    .click();
  await expect(
    main.getByRole("status").filter({ hasText: "Formatted listing copied" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Price: $60.01 USD",
  );
  const downloaded = page.waitForEvent("download");
  await main.getByRole("button", { name: "Export JSON", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^bundlelab-listing-.*\.json$/);
  const path = await download.path();
  if (!path) throw new Error("Download was not available.");
  const exported = JSON.parse(await readFile(path, "utf8"));
  expect(exported.priceCents).toBe(6001);
  expect(exported.listing.title).toBe("The weekend collection");
  expect(exported.listing.sellingPoints).toHaveLength(3);
  expect(exported.merchantEdited).toBe(true);
  expect(exported.products).toHaveLength(3);
  expect(JSON.stringify(exported)).not.toContain('"costCents"');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("listing-studio.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("tone generation is explicit and failures never replace merchant edits", async ({
  page,
}, testInfo) => {
  await seedBundle(page, `tone-${testInfo.project.name}`);
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Generate demo copy", exact: true })
    .click();
  const title = main.getByLabel("Listing product title", { exact: true });
  await expect(title).not.toHaveValue("");
  const original = await title.inputValue();
  await main.getByRole("button", { name: /^Minimal/ }).click();
  await expect(title).toHaveValue(original);
  await main
    .getByRole("button", { name: "Regenerate demo copy", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Replace with new copy", exact: false })
    .click();
  await expect(title).toHaveValue("Skincare · The edit");
  await title.fill("Keep my considered title");
  await page.route("**/api/listings", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "AI_QUOTA_EXHAUSTED",
          message:
            "API credits are exhausted. Your existing copy is preserved.",
        },
      }),
    }),
  );
  await main
    .getByRole("button", { name: "Regenerate demo copy", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Replace with new copy", exact: false })
    .click();
  await expect(
    main.getByRole("alert").filter({ hasText: "API credits are exhausted" }),
  ).toBeVisible();
  await expect(title).toHaveValue("Keep my considered title");
  await page.reload();
  await expect(title).toHaveValue("Keep my considered title");
});
test("changed bundles preserve copy but require explicit review before exporting", async ({
  page,
}, testInfo) => {
  await seedBundle(page, `stale-${testInfo.project.name}`);
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Generate demo copy", exact: true })
    .click();
  await main
    .getByLabel("Listing product title", { exact: true })
    .fill("Retain this story");
  await main
    .getByRole("link", { name: "Back to Bundle Editor", exact: true })
    .click();
  await main.getByLabel("Final bundle price", { exact: true }).fill("62.01");
  await main
    .getByRole("button", { name: "Proceed to Listing Studio", exact: true })
    .click();
  await expect(
    main.getByLabel("Listing product title", { exact: true }),
  ).toHaveValue("Retain this story");
  await expect(
    main.getByText("Your bundle changed since this copy was written.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Export JSON", exact: true }),
  ).toBeDisabled();
  await main
    .getByRole("button", {
      name: "I reviewed this copy for the updated bundle",
      exact: true,
    })
    .click();
  await expect(
    main.getByRole("button", { name: "Export JSON", exact: true }),
  ).toBeEnabled();
  await expect(
    main
      .getByRole("region", { name: "Storefront live preview" })
      .getByText("$62.01", { exact: false }),
  ).toBeVisible();
});
test("unavailable storage and denied clipboard preserve edits and report honest errors", async ({
  page,
}, testInfo) => {
  await seedBundle(page, `storage-${testInfo.project.name}`);
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Generate demo copy", exact: true })
    .click();
  await expect(
    main.getByRole("button", { name: "Export JSON", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard access denied. Export JSON instead.");
        },
      },
    });
  });
  await main
    .getByLabel("Listing product title", { exact: true })
    .fill("Still in this tab");
  await expect(
    main.getByRole("alert").filter({ hasText: "only in this tab" }),
  ).toBeVisible();
  await main
    .getByRole("button", { name: "Copy formatted text", exact: true })
    .click();
  await expect(
    main.getByRole("alert").filter({ hasText: "Clipboard access denied" }),
  ).toBeVisible();
  await expect(
    main.getByLabel("Listing product title", { exact: true }),
  ).toHaveValue("Still in this tab");
  await expect(
    main.getByRole("button", { name: "Export JSON", exact: true }),
  ).toBeEnabled();
});
test("missing handoff and corrupt listing storage are recoverable without silent overwrites", async ({
  page,
}, testInfo) => {
  await page.goto("/listing-studio");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", {
      name: "A finalized bundle comes first.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Export JSON", exact: true }),
  ).toHaveCount(0);
  await seedBundle(page, `corrupt-${testInfo.project.name}`);
  await page.evaluate(() =>
    localStorage.setItem("bundlelab:listings:v1", "{bad"),
  );
  await page.reload();
  await expect(
    main
      .getByRole("alert")
      .filter({ hasText: "Saved listing drafts could not be read" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("bundlelab:listings:v1")),
  ).toBe("{bad");
  await main
    .getByRole("button", { name: "Reset listing storage", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("bundlelab:listings:v1")),
  ).toBe("{bad");
});
