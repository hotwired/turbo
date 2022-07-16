import { test } from "@playwright/test"
import { nextEventOnTarget } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/frame_navigation.html")
})

test("test frame navigation with descendant link", async ({ page }) => {
  await page.click("#inside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation with self link", async ({ page }) => {
  await page.click("#self")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})

test("test frame navigation with exterior link", async ({ page }) => {
  await page.click("#outside")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")
})
