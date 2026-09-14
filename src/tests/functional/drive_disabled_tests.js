import { expect, test } from "@playwright/test"
import {
  getFromLocalStorage,
  nextEventOnTarget,
  setLocalStorageFromEvent,
  visitAction,
  withPathname,
  withSearchParam
} from "../helpers/page"

const path = "/src/tests/fixtures/drive_disabled.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("drive disabled by default; click normal link", async ({ page }) => {
  await page.click("#drive_disabled")

  await expect(page).toHaveURL(withPathname(path))
  expect(await visitAction(page)).toEqual("load")
})

test("drive disabled by default; click link inside data-turbo='true'", async ({ page }) => {
  await page.click("#drive_enabled")

  await expect(page).toHaveURL(withPathname(path))
  expect(await visitAction(page)).toEqual("advance")
})

test("drive disabled by default; submit form inside data-turbo='true'", async ({ page }) => {
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitted", "true")

  await page.click("#no_submitter_drive_enabled a#requestSubmit")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/form.html"))
  await expect(page).toHaveURL(withSearchParam("greeting", "Hello from a redirect"))
  expect(await getFromLocalStorage(page, "formSubmitted")).toBeTruthy()
  expect(await visitAction(page)).toEqual("advance")
})

test("drive disabled by default; links within <turbo-frame> navigate with Turbo", async ({ page }) => {
  await page.click("#frame a")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
})

test("drive disabled by default; forms within <turbo-frame> navigate with Turbo", async ({ page }) => {
  await page.click("#frame button")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
})

test("drive disabled by default; slot within <turbo-frame> navigate with Turbo", async ({ page }) => {
  await page.click("#frame-navigation-with-slot")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
})
