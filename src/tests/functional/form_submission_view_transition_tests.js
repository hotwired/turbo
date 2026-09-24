import { expect, test } from "@playwright/test"
import { nextBody } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/form_view_transition.html")

  await page.evaluate(`
    document.startViewTransition = (callback) => {
      window.startViewTransitionCalled = true
      callback()
    }
  `)
})

test("form submission with 422 response triggers view transition", async ({ page }) => {
  await page.click("#submit-422")
  await nextBody(page)

  await expect(page.locator("h1")).toHaveText("Unprocessable Content")
  const called = await page.evaluate(`window.startViewTransitionCalled`)
  await expect(called).toEqual(true)
})

test("form submission with 500 response triggers view transition", async ({ page }) => {
  await page.click("#submit-500")
  await nextBody(page)

  await expect(page.locator("h1")).toHaveText("Internal Server Error")
  const called = await page.evaluate(`window.startViewTransitionCalled`)
  await expect(called).toEqual(true)
})
