import { expect, test } from "@playwright/test";

test("the final Editorial workspace ignores legacy appearance preferences on every page", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("bundlelab:design-preview:v1", "original");
  });
  for (const route of [
    "/",
    "/catalog",
    "/bundle-generator",
    "/bundle-editor",
    "/listing-studio",
  ]) {
    await page.goto(route);
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "data-design",
      "editorial",
    );
    await expect(
      page.getByRole("group", { name: "Design preview", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^(Original|Editorial)$/ }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link"),
    ).toHaveCount(5);
  }
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-design",
    "editorial",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("bundlelab:design-preview:v1"),
    ),
  ).toBe("original");
});
