import { test, expect } from "@playwright/test";
test("overview and responsive navigation", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Luna RAG Lab" }),
  ).toBeVisible();
  await expect(page.getByText("Documents indexed")).toBeVisible();
  await expect(page.getByLabel("Demo user").locator("option")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `reports/overview-${info.project.name}.png`,
    fullPage: true,
  });
});
test("query streams states, answer and citations into inspector", async ({
  page,
}, info) => {
  await page.goto("/chat");
  await page
    .getByLabel("Question", { exact: true })
    .fill("O que significa OTS?");
  await page.getByRole("button", { name: "Run query" }).click();
  await expect(
    page.getByRole("button", { name: "Open citation S1" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open citation S1" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close source" }).click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await page.getByRole("tab", { name: "Retrieval", exact: true }).click();
  await expect(page.getByRole("img", { name: /Retrieval Map/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `reports/workbench-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Retrieval strategy").selectOption("LEXICAL");
  await page
    .getByRole("button", { name: "Compare retrieval strategies" })
    .click();
  await expect(
    page.getByRole("region", { name: "Retrieval comparison" }),
  ).toBeVisible();
});
test("knowledge and chunking preview", async ({ page }) => {
  await page.goto("/knowledge");
  await expect(
    page.getByRole("heading", { name: "Knowledge base" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect", exact: true })
    .first()
    .click();
  await expect(page.getByText(/Chunk 1 \//).first()).toBeVisible();
  await page.goto("/playground/chunking");
  await page.getByRole("button", { name: "Preview chunks" }).click();
  await expect(page.getByText(/Offsets/).first()).toBeVisible();
});
test("evaluation executes real pipeline", async ({ page }) => {
  await page.goto("/evaluations");
  await page
    .getByRole("button", { name: "Run evaluation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Latest benchmark" }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByRole("cell", { name: "O que significa OTS?", exact: true }),
  ).toBeVisible();
});
