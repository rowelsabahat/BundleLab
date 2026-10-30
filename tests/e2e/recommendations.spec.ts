import { expect, test } from "@playwright/test";
test("explicit Demo Mode produces valid cards and a persistent editable chosen bundle", async ({
  page,
}, testInfo) => {
  await page.goto("/bundle-generator");
  const workspace = page.getByRole("main");
  await expect(
    workspace.getByText("Demo Mode · Simulated", { exact: true }),
  ).toBeVisible();
  await workspace.getByRole("button", { name: "Explore demo bundles" }).click();
  const cards = page
    .getByRole("region", { name: "Bundle recommendations" })
    .getByRole("article");
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card.getByText("Simulated", { exact: true })).toBeVisible();
    await expect(
      card.getByText("Price, exact margin & category checked"),
    ).toBeVisible();
    const price = await card.locator(".bundle-total dd").innerText();
    expect(Number(price.replace(/[^0-9.]/g, ""))).toBeLessThan(80);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("recommendations.png"),
    fullPage: true,
  });
  await cards
    .first()
    .getByRole("button", { name: "Customize this bundle" })
    .click();
  await expect(page).toHaveURL(/\/bundle-editor$/);
  await expect(
    workspace.getByText("FROM A SIMULATED RECOMMENDATION", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Bundle name", { exact: true })
    .fill("My starter ritual");
  await workspace.getByRole("button", { name: "Save bundle" }).click();
  await expect(
    workspace.getByRole("status").filter({ hasText: "Changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    workspace.getByLabel("Bundle name", { exact: true }),
  ).toHaveValue("My starter ritual");
  const quantity = page
    .getByRole("spinbutton", { name: /^Quantity for/ })
    .first();
  await quantity.fill("99");
  await expect(
    workspace.getByRole("alert").filter({ hasText: /quantities|available/ }),
  ).toBeVisible();
});
test("infeasible constraints and service errors remain truthful", async ({
  page,
}) => {
  await page.goto("/bundle-generator");
  const workspace = page.getByRole("main");
  await workspace
    .getByLabel("Maximum bundle price", { exact: true })
    .fill("0.01");
  await workspace.getByRole("button", { name: "Explore demo bundles" }).click();
  await expect(
    workspace.getByRole("heading", {
      name: "No feasible combination within these limits",
    }),
  ).toBeVisible();
  await workspace.getByLabel("Maximum bundle price", { exact: true }).fill("");
  await page.route("**/api/recommendations", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "AI_UNAVAILABLE",
          message: "The service is temporarily unavailable. Try again.",
        },
      }),
    }),
  );
  await workspace.getByRole("button", { name: "Explore demo bundles" }).click();
  await expect(
    workspace
      .getByRole("alert")
      .filter({ hasText: "The service is temporarily unavailable" }),
  ).toBeVisible();
  await expect(workspace.getByRole("article")).toHaveCount(0);
  await expect(
    workspace.getByText("Demo Mode · Simulated", { exact: true }),
  ).toBeVisible();
});

test("a successful but constraint-violating response is never labeled checked", async ({
  page,
}) => {
  await page.route("**/api/recommendations", async (route) => {
    const response = await route.fetch({
      headers: {
        ...route.request().headers(),
        "x-forwarded-for": `qa-forged-${test.info().project.name}`,
      },
    });
    const body = await response.json();
    body.recommendations[0].discountBps = 0;
    body.constraints.maxPriceCents = 100;
    await route.fulfill({ response, json: body });
  });
  await page.goto("/bundle-generator");
  await page.getByRole("button", { name: "Explore demo bundles" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not match the requested constraints",
  );
  await expect(
    page.getByRole("region", { name: "Bundle recommendations" }),
  ).toHaveCount(0);
});
