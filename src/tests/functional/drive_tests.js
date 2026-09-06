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

test("progressively renders streamed response when X-Turbo-Stream-Body is true (fixes #1517)", async ({
  page
}) => {
  await page.click("#drive_stream_body")

  await expect(page).toHaveURL(withPathname("/__turbo/stream-body"))
  await expect(page.locator("h1")).toHaveText("Streaming Page")
  await expect(page.locator("#chunk-1")).toHaveText("First chunk loaded")
  await expect(page.locator("#chunk-2")).toHaveText("Second chunk loaded")
  await expect(page.locator("#chunk-3")).toHaveText("Third chunk loaded")
})
