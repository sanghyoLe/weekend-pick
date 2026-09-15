import { test, expect } from "@playwright/test";

test("filter, save, reload, choose nearby places, share and reopen in a new browser context", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("어디로 가볼까요");
  await expect(page.getByTestId("event-card")).toHaveCount(3);
  await page.getByLabel("방문 지역").selectOption("서울");
  await page.getByRole("button", { name: "나들이 찾기" }).click();
  await expect(page).toHaveURL(/region=/);
  await page.getByRole("button", { name: "자연·산책", exact: true }).click();
  await expect(page.getByTestId("event-card")).toHaveCount(1);
  await page.getByRole("button", { name: "숲 사이, 느린 산책 저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "숲 사이, 느린 산책 저장 취소", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "숲 사이, 느린 산책 저장 취소", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: /저장한 나들이/ }).click();
  await expect(page.getByTestId("event-card")).toHaveCount(1);
  await page.getByRole("link", { name: "숲 사이, 느린 산책", exact: true }).click();
  await page.getByRole("button", { name: "숲길 산책 지점 추가" }).click();
  await page.getByRole("button", { name: "근처 문화 공간 추가" }).click();
  await page.getByRole("button", { name: "방문 순서 바꾸기" }).click();
  await page.getByRole("button", { name: "이 나들이 공유하기" }).click();
  await expect(page.locator("#share-url")).toBeVisible();
  const url = await page.locator("#share-url").inputValue();
  const other = await browser.newContext();
  const shared = await other.newPage();
  await shared.goto(url);
  await expect(shared.getByRole("heading", { name: "숲 사이, 느린 산책" })).toBeVisible();
  await expect(shared.locator(".shared-stops li")).toHaveCount(3);
  await expect(shared.locator(".shared-stops li").nth(1)).toContainText("근처 문화 공간");
  await other.close();
  expect(errors).toEqual([]);
});

test("empty filters, corrupted storage, invalid requests and cron access fail clearly", async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem("weekend-pick:saved:v1", "invalid-json"));
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: /하나씩 모아 두세요/ })).toBeVisible();
  await page.goto("/?date=2030-01-01&region=전체&category=전체");
  await expect(page.getByRole("heading", { name: "이날의 나들이는 아직 준비 중이에요" })).toBeVisible();
  expect((await request.get("/api/events?date=2026-02-30")).status()).toBe(400);
  expect((await request.post("/api/plans", { data: { eventId: "missing", placeIds: [], date: "2030-01-01" } })).status()).toBe(400);
  expect((await request.post("/api/plans", { headers: { origin: "https://unrelated.example" }, data: {} })).status()).toBe(403);
  expect((await request.post("/api/plans", { data: { eventId: "x".repeat(3000) } })).status()).toBe(413);
  expect((await request.get("/api/cron/sync")).status()).toBe(503);
  await page.goto("/s/d.invalid");
  await expect(page.getByRole("heading", { name: "이 나들이를 찾을 수 없어요." })).toBeVisible();
});

for (const width of [320, 375, 414, 768, 1440]) {
  test(`layout has no horizontal overflow at ${width}px and real images load`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("event-card").first().locator("img")).toBeVisible();
    expect(await page.locator(".event-card img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const overflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return [...document.querySelectorAll("main *, header *, footer *")].filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 1 && (rect.right > width + 1 || rect.left < -1) && style.position !== "absolute" && !el.classList.contains("sr-only");
      }).map(el => `${el.tagName}.${el.className}`);
    });
    expect(overflow).toEqual([]);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "숲 사이, 느린 산책", exact: true }).click();
    await expect(page.getByRole("heading", { name: "나의 나들이" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/detail-${width}.png`, fullPage: true });
  });
}
