import { expect, test } from "@playwright/test";

test("essential workflow supporting text meets normal-text contrast", async ({
  page,
}, testInfo) => {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `contrast-${testInfo.project.name}`,
  });
  for (const [route, selectors] of [
    [
      "/catalog",
      ".assumption, .unit-cost, .product-margin span, .results-count, .product-description",
    ],
    [
      "/bundle-generator",
      ".assumption, .composer-footnote, .constraint-note, .constraint-fields label > span",
    ],
    [
      "/bundle-editor",
      ".assumption, .pricing-mode-note, .rounding-note, .draft-save-status, .editor-products-footer, .full-editor-lines li > div > span",
    ],
    [
      "/listing-studio",
      ".assumption, .listing-strip-name > span, .listing-approved-price > span, .listing-generate-row > span, .listing-tone p, .listing-tone button span, .listing-fields label > span:not(.selling-point-number), .listing-review-note, .preview-heading > span:last-child, .preview-commerce-note",
    ],
  ]) {
    if (route === "/bundle-editor") {
      await page.getByRole("button", { name: "Explore demo bundles" }).click();
      await page
        .getByRole("button", { name: "Customize this bundle" })
        .first()
        .click();
      await expect(
        page.getByLabel("Bundle name", { exact: true }),
      ).toBeVisible();
    } else if (route === "/listing-studio") {
      await page
        .getByRole("button", { name: "Proceed to Listing Studio", exact: true })
        .click();
      await expect(
        page.getByLabel("Listing product title", { exact: true }),
      ).toBeVisible();
    } else await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (route === "/catalog")
      await expect(page.getByRole("button", { name: /^View / })).toHaveCount(
        24,
      );
    const failures = await page.locator(selectors).evaluateAll((elements) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas color conversion unavailable");
      const drawing = context;
      function rgba(color: string) {
        drawing.clearRect(0, 0, 1, 1);
        drawing.fillStyle = color;
        drawing.fillRect(0, 0, 1, 1);
        return [...drawing.getImageData(0, 0, 1, 1).data];
      }
      function luminance(channels: number[]) {
        const linear = channels.slice(0, 3).map((value) => {
          const normalized = value / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      }
      return elements.flatMap((element) => {
        if (!(element instanceof HTMLElement) || !element.checkVisibility())
          return [];
        let background = [255, 255, 255, 255];
        for (
          let ancestor: Element | null = element;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const color = rgba(getComputedStyle(ancestor).backgroundColor);
          if (color[3] === 255) {
            background = color;
            break;
          }
        }
        const foregroundLuminance = luminance(
          rgba(getComputedStyle(element).color),
        );
        const backgroundLuminance = luminance(background);
        const ratio =
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
        return ratio < 4.5
          ? [
              {
                text: element.textContent?.trim().slice(0, 60),
                ratio: Number(ratio.toFixed(2)),
              },
            ]
          : [];
      });
    });
    expect(failures, `Low-contrast supporting text on ${route}`).toEqual([]);
  }
});
