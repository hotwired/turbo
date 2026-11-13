import { expect, test } from "@playwright/test"
import { cssClassIsDefined, getComputedStyle } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/stylesheets/left.html")
})

test("navigating removes unused dynamically tracked style elements", async ({ page }) => {
  const addedStyle = page.locator('style[id="added-style"]')
  const addedLink = page.locator('link[id="added-link"]')
  await expect(addedStyle).toBeAttached()
  await expect(addedLink).toBeAttached()

  await page.locator("#go-right").click()

  await expect(page.locator('link[rel=stylesheet][href="/src/tests/fixtures/stylesheets/common.css"]')).toBeAttached()
  await expect(page.locator('link[rel=stylesheet][href="/src/tests/fixtures/stylesheets/right.css"]')).toBeAttached()
  await expect(page.locator('link[rel=stylesheet][href="/src/tests/fixtures/stylesheets/left.css"]')).not.toBeAttached()
  expect(await getComputedStyle(page, "body", "backgroundColor")).toEqual("rgb(0, 128, 0)")
  expect(await getComputedStyle(page, "body", "color")).toEqual("rgb(0, 128, 0)")

  await expect(addedStyle).toBeAttached()
  await expect(addedLink).toBeAttached()

  expect(await cssClassIsDefined(page, "right")).toBeTruthy()
  expect(await cssClassIsDefined(page, "left")).not.toBeTruthy()
  expect(await getComputedStyle(page, "body", "marginLeft")).toEqual("0px")
  expect(await getComputedStyle(page, "body", "marginRight")).toEqual("20px")
})
