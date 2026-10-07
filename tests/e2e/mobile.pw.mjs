import { expect, test } from "@playwright/test";

const viewports = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "768x1024", width: 768, height: 1024 },
];

async function login(page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("guilherme@agency.local");
  await page.locator('input[name="password"]').fill("admin-agencyos-2026");
  await Promise.all([
    page.waitForURL("**/"),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function expectNoDocumentOverflow(page) {
  await expect.poll(() => page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))).toEqual(expect.objectContaining({
    client: await page.evaluate(() => document.documentElement.clientWidth),
  }));
  const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflowing).toBeFalsy();
}

test("core CRM routes stay mobile-first across target viewports", async ({ page }) => {
  await login(page);

  for (const viewport of viewports) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/");
      await expect(page.getByTestId("mobile-header")).toBeVisible();
      await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
      await expectNoDocumentOverflow(page);

      await page.goto("/leads");
      await expect(page.getByTestId("mobile-lead-filters")).toBeVisible();
      await expect(page.getByTestId("desktop-lead-filters")).toBeHidden();
      await expectNoDocumentOverflow(page);
      const leadHref = await page.locator('a[href^="/leads/"]').first().getAttribute("href");
      expect(leadHref).toBeTruthy();

      await page.goto("/pipeline");
      await expect(page.getByTestId("mobile-pipeline")).toBeVisible();
      await expect(page.getByTestId("desktop-pipeline")).toBeHidden();
      await expectNoDocumentOverflow(page);

      await page.goto("/tasks");
      await expect(page.getByTestId("mobile-task-view")).toBeVisible();
      await expect(page.getByTestId("desktop-task-tabs")).toBeHidden();
      await expectNoDocumentOverflow(page);

      await page.goto("/calendar");
      await expect(page.getByTestId("mobile-calendar-toolbar")).toBeVisible();
      await expect(page.getByTestId("mobile-calendar-agenda")).toBeVisible();
      await expect(page.getByTestId("desktop-calendar-toolbar")).toBeHidden();
      await expectNoDocumentOverflow(page);

      await page.goto(leadHref);
      await expect(page.locator("aside.order-1")).toBeVisible();
      await expectNoDocumentOverflow(page);
    });
  }
});

test("language preference switches between Portuguese and English and persists", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const language = page.getByLabel("Idioma");
  await language.selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByLabel("Language")).toHaveValue("en");

  await page.getByLabel("Language").selectOption("pt-BR");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
});
