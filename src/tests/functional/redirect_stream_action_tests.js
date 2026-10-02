import { expect, test } from "@playwright/test"
import { visitAction, withPathname } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/bare.html")
  await page.goto("/src/tests/fixtures/redirect_stream_action.html")
})

test("redirecting to a same-origin url replaces the history entry", async ({ page }) => {
  await page.click("#same-origin button")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  expect(await visitAction(page)).toEqual("replace")

  await page.goBack()

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/bare.html"))
})

test("redirecting to a same-origin url with advance pushes a history entry", async ({ page }) => {
  await page.click("#advance button")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  expect(await visitAction(page)).toEqual("advance")

  await page.goBack()

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/redirect_stream_action.html"))
})

test("redirecting to a cross-origin url performs a full page load", async ({ page }) => {
  await page.route("https://example.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body>External</body></html>" })
  )

  await page.click("#cross-origin button")

  await page.waitForURL("https://example.com/")
  await expect(page.locator("body")).toHaveText("External")
})
