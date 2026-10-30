import { expect, test, type Route } from "@playwright/test";

for (const width of [1440, 1024, 820, 375]) {
  test(`merchant workspace remains readable and reachable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `design-${width}-${testInfo.project.name}`,
    });
    const main = page.getByRole("main");
    async function capture(name: string) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${name} should not overflow`,
      ).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${width}.png`),
        fullPage: name !== "catalog",
      });
    }
    await page.goto("/");
    await expect(
      main.getByText("24 sample · 0 imported", { exact: true }),
    ).toBeVisible();
    if (width === 375) {
      expect(
        await main.locator(".feature-art").evaluate((element) => {
          const surface = element.getBoundingClientRect();
          return [...element.querySelectorAll(".product-object")].every(
            (product) => {
              const bounds = product.getBoundingClientRect();
              return (
                bounds.left >= surface.left &&
                bounds.right <= surface.right &&
                bounds.top >= surface.top &&
                bounds.bottom <= surface.bottom
              );
            },
          );
        }),
      ).toBe(true);
    }
    await capture("overview");
    await page.goto("/catalog");
    await expect(main.getByRole("button", { name: /^View / })).toHaveCount(24);
    if (width <= 1023) {
      for (const link of await page
        .getByRole("navigation")
        .getByRole("link")
        .all()) {
        const box = await link.boundingBox();
        expect(box).not.toBeNull();
        if (!box) throw new Error("Navigation link has no box");
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    await capture("catalog");
    await main
      .locator(".product-card")
      .first()
      .screenshot({
        path: testInfo.outputPath(`product-card-${width}.png`),
      });
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Bundle Generator", exact: true })
      .click();
    const generate = main.getByRole("button", {
      name: "Explore demo bundles",
      exact: true,
    });
    const buttonBox = await generate.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    if (width === 375) {
      let pending: Route | undefined;
      await page.route("**/api/recommendations", (route) => {
        pending = route;
      });
      await generate.click();
      await expect(
        main.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await main.getByRole("button", { name: "Cancel", exact: true }).click();
      // The browser may already have cancelled the intercepted request.
      await pending?.abort().catch(() => {});
      await page.unroute("**/api/recommendations");
      await expect(main.getByRole("alert")).toContainText("Request cancelled");
    }
    await generate.click();
    await expect(
      main
        .getByRole("region", { name: "Bundle recommendations" })
        .getByRole("article"),
    ).toHaveCount(3);
    await capture("generator");
    await main
      .getByRole("button", { name: "Customize this bundle", exact: true })
      .first()
      .click();
    await expect(main.getByLabel("Bundle name", { exact: true })).toBeVisible();
    await capture("editor");
    const choose = main.getByRole("button", {
      name: "Choose products",
      exact: true,
    });
    await choose.click();
    const drawer = page.getByRole("dialog");
    await expect(
      drawer.getByLabel("Search catalog products", { exact: true }),
    ).toBeVisible();
    expect(
      await drawer.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(choose).toBeFocused();
    await main
      .getByRole("button", { name: "Proceed to Listing Studio", exact: true })
      .click();
    await expect(
      main.getByLabel("Listing product title", { exact: true }),
    ).toBeVisible();
    await capture("studio");
  });
}
