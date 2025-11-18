import { expect, test } from "@playwright/test"
import { nextBody } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/transitions/left.html")

  await page.evaluate(`
    document.startViewTransition = (callback) => {
      window.startViewTransitionCalled = true
      callback()
    }
  `)
})

test("navigating triggers the view transition", async ({ page }) => {
  await page.locator("#go-right").click()
  await nextBody(page)

  const called = await page.evaluate(`window.startViewTransitionCalled`)
  expect(called).toEqual(true)
})

test("navigating does not trigger a view transition when prefers reduced motion is reduce", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator("#go-right").click()
  await nextBody(page)

  const called = await page.evaluate(`window.startViewTransitionCalled`)
  expect(called).toEqual(undefined)
})

test("navigating does not trigger a view transition when meta tag not present", async ({ page }) => {
  await page.locator("#go-other").click()
  await nextBody(page)

  const called = await page.evaluate(`window.startViewTransitionCalled`)
  expect(called).toEqual(undefined)
})
