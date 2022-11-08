import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBody, pathname, visitAction } from "../helpers/page"

const path = "/src/tests/fixtures/visitable.html"

test.beforeEach(async ({ page }) => {
  await page.goto(path)
})

test("test user-defined visitable URL", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.session.isVisitable = (_url) => true
  })

  page.click("#link")
  await nextBody(page)
  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "advance")
})

test("test user-defined unvisitable URL", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.session.isVisitable = (_url) => false
  })

  page.click("#link")
  await nextBody(page)
  assert.equal(pathname(page.url()), path)
  assert.equal(await visitAction(page), "load")
})
