import { test } from "@playwright/test"
import { assert } from "chai"
import { cssClassIsDefined, getComputedStyle, hasSelector, nextBody } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/stylesheets/left.html")
})

test("navigating removes unused dynamically tracked style elements", async ({ page }) => {
  assert.ok(await hasSelector(page, 'style[id="added-style"]'))
  assert.ok(await hasSelector(page, 'link[id="added-link"]'))

  await page.locator("#go-right").click()
  await nextBody(page)

  assert.ok(await hasSelector(page, 'link[rel=stylesheet][href="/src/tests/fixtures/stylesheets/common.css"]'))
  assert.ok(await hasSelector(page, 'link[rel=stylesheet][href="/src/tests/fixtures/stylesheets/right.css"]'))
  assert.notOk(await hasSelector(page, 'link[rel=stylesheet][href="/src/tests/fixtures/stylesheets/left.css"]'))
  assert.equal(await getComputedStyle(page, "body", "backgroundColor"), "rgb(0, 128, 0)")
  assert.equal(await getComputedStyle(page, "body", "color"), "rgb(0, 128, 0)")

  assert.ok(await hasSelector(page, 'style[id="added-style"]'))
  assert.ok(await hasSelector(page, 'link[id="added-link"]'))

  assert.ok(await cssClassIsDefined(page, "right"))
  assert.notOk(await cssClassIsDefined(page, "left"))
  assert.equal(await getComputedStyle(page, "body", "marginLeft"), "0px")
  assert.equal(await getComputedStyle(page, "body", "marginRight"), "20px")
})

