import { test, expect } from "@playwright/test"
import { nextEventNamed, readEventLogs, visitAction } from "../helpers/page"

test("Drive visits scroll to percent-encoded Unicode fragment targets", async ({ page }) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await readEventLogs(page)

  await page.evaluate(() => window.Turbo.visit("/src/tests/fixtures/encoded_anchors.html#%E5%89%8D%E4%B8%96"))
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(/encoded_anchors\.html#%E5%89%8D%E4%B8%96$/)
  expect(await visitAction(page)).toEqual("advance")
  const target = page.locator('[data-anchor="unicode"]')
  await expect(target).toBeInViewport()
  await expect.poll(() => target.evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThanOrEqual(1)
})
