import { expect, test } from "@playwright/test"
import { nextBody } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/transitions/left.html")

  await page.evaluate(`
    document.startViewTransition = (callback) => {
      window.startViewTransitionCalled = true
      const updateCallbackDone = Promise.resolve().then(callback)
      return { ready: updateCallbackDone, updateCallbackDone, finished: updateCallbackDone }
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

test("navigating does not leak an unhandled rejection when the view transition is skipped", async ({ page }) => {
  await page.evaluate(`
    window.unhandledRejections = []
    addEventListener("unhandledrejection", (event) => {
      window.unhandledRejections.push(String(event.reason))
    })

    document.startViewTransition = (callback) => {
      window.startViewTransitionCalled = true
      const updateCallbackDone = Promise.resolve(callback())
      return {
        ready: Promise.reject(new DOMException("Transition was aborted because of invalid state", "InvalidStateError")),
        finished: updateCallbackDone,
        updateCallbackDone
      }
    }
  `)

  await page.locator("#go-right").click()
  await nextBody(page)

  expect(await page.evaluate(`window.startViewTransitionCalled`)).toEqual(true)
  expect(await page.evaluate(`window.unhandledRejections`)).toEqual([])
})

test("navigating a frame with data-turbo-action does not trigger a view transition", async ({ page }) => {
  await page.evaluate(() => {
    window.initialBody = document.body
    window.frameVisitCompleted = new Promise(resolve => {
      document.addEventListener("turbo:load", () => resolve(), { once: true })
    })
  })

  await page.locator("#go-frame").click()
  await page.evaluate(() => window.frameVisitCompleted.then(() => {}))

  await expect(page.locator("#frame h2")).toHaveText("Loaded")
  await expect(page).toHaveURL("/src/tests/fixtures/transitions/frame.html")
  await expect(page.locator("h1")).toHaveText("Left")
  expect(await page.evaluate(() => document.body === window.initialBody)).toEqual(true)
  expect(await page.evaluate(() => window.startViewTransitionCalled)).toEqual(undefined)
})
