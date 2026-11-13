import { expect, test } from "@playwright/test"
import { visitAction, withPathname } from "../helpers/page"

const path = "/src/tests/fixtures/drive.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("drive enabled by default; click normal link", async ({ page }) => {
  await page.click("#drive_enabled")

  await expect(page).toHaveURL(withPathname(path))
})

test("drive to external link", async ({ page }) => {
  await page.route("https://example.com", async (route) => {
    await route.fulfill({ body: "Hello from the outside world" })
  })

  await page.click("#drive_enabled_external")

  await expect(page).toHaveURL("https://example.com/")
  await expect(page.locator("body")).toHaveText("Hello from the outside world")
})

test("drive enabled by default; click link inside data-turbo='false'", async ({ page }) => {
  await page.click("#drive_disabled")

  await expect(page).toHaveURL(withPathname(path))
  expect(await visitAction(page)).toEqual("load")
})
