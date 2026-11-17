import { expect, test } from "@playwright/test"

const pageErrors = new WeakMap()

test.beforeEach(async ({ page }) => {
  const errors = []
  pageErrors.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() => {
    window.transitionCount = 0
    window.unhandledRejections = []
    addEventListener("unhandledrejection", (event) => {
      window.unhandledRejections.push(String(event.reason))
    })

    document.startViewTransition = (callback) => {
      window.transitionCount++
      const updateCallbackDone = Promise.resolve().then(callback)
      window.lastViewTransitionFinished = updateCallbackDone
      return { ready: updateCallbackDone, updateCallbackDone, finished: updateCallbackDone }
    }
  })
  await page.goto("/src/tests/fixtures/form_view_transition.html")
})

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.lastViewTransitionFinished)
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(pageErrors.get(page)).toEqual([])
  expect(await page.evaluate(() => window.unhandledRejections)).toEqual([])
})

for (const status of [422, 500]) {
  test(`form submission with ${status} response completes one view transition`, async ({ page }) => {
    await submitForm(page, status)

    expect(await page.evaluate(() => window.transitionCount)).toEqual(1)
  })
}

test("failed form submission renders without a transition when the source page opts out", async ({ page }) => {
  await page.locator('meta[name="turbo-view-transition"]').evaluate((meta) => meta.remove())
  await submitForm(page, 422)

  expect(await page.evaluate(() => window.transitionCount)).toEqual(0)
})

test("failed form submission renders without a transition when the response opts out", async ({ page }) => {
  await page.locator("#form-422").evaluate((form) => (form.action = "/__turbo/reject"))
  await submitForm(page, 422)

  expect(await page.evaluate(() => window.transitionCount)).toEqual(0)
})

test("failed form submission respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await submitForm(page, 422)

  expect(await page.evaluate(() => window.transitionCount)).toEqual(0)
})

test("failed form submission renders when view transitions are unavailable", async ({ page }) => {
  await page.evaluate(() => (document.startViewTransition = undefined))
  await submitForm(page, 422)

  expect(await page.evaluate(() => window.transitionCount)).toEqual(0)
})

async function submitForm(page, status) {
  await page.click(`#submit-${status}`)
  await expect(page.locator("h1")).toHaveText(status === 422 ? "Unprocessable Content" : "Internal Server Error")
}
