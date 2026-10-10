import { test, expect } from "@playwright/test";
test("anonymous guided query replays citations, typed decisions and learning", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByText("PUBLIC DEMO · RECORDED MOCK")).toBeVisible();
  await page.getByRole("link", { name: /01 \/ KNOWLEDGE/ }).click();
  await expect(
    page.getByRole("button", { name: "Open citation S1" }).first(),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await page.getByRole("tab", { name: "Decisions", exact: true }).click();
  await expect(page.getByText("NORMALIZE · complete")).toBeVisible();
  await page.getByRole("button", { name: /Learning mode/ }).click();
  await expect(
    page.getByRole("region", { name: "Learning mode" }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/v2-workbench-${info.project.name}.png`,
    fullPage: true,
  });
});
test("public management and paid APIs deny identity spoofing", async ({
  page,
  request,
}) => {
  await page.goto("/knowledge");
  await expect(
    page.getByRole("button", { name: "Upload & index" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }).first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Inspect", exact: true })
    .first()
    .click();
  await expect(page.getByText(/Chunk 1 \//).first()).toBeVisible();
  for (const [path, method] of [
    ["documents", "DELETE"],
    ["documents", "PATCH"],
    ["documents", "POST"],
    ["evaluation", "POST"],
    ["experiments", "POST"],
  ]) {
    const r = await request.fetch(`/api/${path}`, {
      method,
      data: { userId: "admin", projectId: "demo" },
    });
    expect(r.status()).toBe(403);
  }
  const auth = await request.post("/api/auth", { data: { password: "admin" } });
  expect(auth.status()).toBe(503);
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).database.available).toBe(false);
});
test("graph supports filters, keyboard node inspection and zoom", async ({
  page,
}, info) => {
  await page.goto("/knowledge/graph");
  await page.getByLabel("Node type").selectOption("Metric");
  const node = page.getByRole("button", {
    name: "Inspect Metric ots",
    exact: true,
  });
  await node.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "ots", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.getByLabel("Search nodes").fill("vd");
  await expect(
    page.getByRole("button", { name: "Inspect Metric vd", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/v2-graph-${info.project.name}.png`,
    fullPage: true,
  });
});
test("recorded experiment selection exports a real JSON artifact", async ({
  page,
}, info) => {
  await page.goto("/experiments");
  await expect(page.getByText(/PUBLIC REPLAY/)).toBeVisible();
  const configs = page.getByLabel("Recorded configuration B");
  await expect(configs.locator("option")).toHaveCount(4);
  await configs.selectOption({ index: 2 });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("luna-experiment.json");
  await page.screenshot({
    path: `docs/screenshots/v2-experiments-${info.project.name}.png`,
    fullPage: true,
  });
});
test("safety, dataset intent and category benchmarks are functional", async ({
  page,
}) => {
  await page.goto("/safety");
  await expect(
    page.getByRole("heading", { name: "8/8 cases passed" }),
  ).toBeVisible();
  await page.goto("/datasets");
  await page
    .getByLabel("Question", { exact: true })
    .fill("Qual unidade teve maior OTS?");
  await expect(
    page.getByText('"aggregation": "TOP"', { exact: false }),
  ).toBeVisible();
  await page.goto("/evaluations");
  await expect(
    page.getByRole("heading", { name: "Latest benchmark" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run evaluation", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Permissions");
  await expect(
    page.getByRole("heading", { name: "Permissions checks · recorded" }),
  ).toBeVisible();
});
test("all pages load anonymously without horizontal overflow or browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/chat",
    "/knowledge",
    "/knowledge/graph",
    "/playground/chunking",
    "/experiments",
    "/datasets",
    "/safety",
    "/evaluations",
    "/runs",
    "/architecture",
    "/docs",
    "/owner",
  ]) {
    const r = await page.goto(path);
    expect(r?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
