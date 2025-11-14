import { expect, test } from "@playwright/test"
import { visitAction, withPathname } from "../helpers/page"

test("visiting a location inside the root", async ({ page }) => {
  await page.goto("/src/tests/fixtures/root/index.html")
  await page.click("#link-page-inside")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/root/page.html"))
  expect(await visitAction(page)).not.toEqual("load")
})

test("visiting the root itself", async ({ page }) => {
  await page.goto("/src/tests/fixtures/root/page.html")
  await page.click("#link-root")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/root/"))
  expect(await visitAction(page)).not.toEqual("load")
})

test("visiting a location outside the root", async ({ page }) => {
  await page.goto("/src/tests/fixtures/root/index.html")
  await page.click("#link-page-outside")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  expect(await visitAction(page)).toEqual("load")
})

test("visiting a location outside the root having the root as a prefix", async ({ page }) => {
  await page.goto("/src/tests/fixtures/root/index.html")
  await page.click("#link-page-outside-prefix")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/rootlet.html"))
  expect(await visitAction(page)).toEqual("load")
})
