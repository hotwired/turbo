import { test } from "@playwright/test"
import { assert } from "chai"
import { hasSelector, nextBody } from "../helpers/page"

test("test removes stale elements", async ({ page }) => {
  await page.goto("/src/tests/fixtures/cache_observer.html")

  assert.equal(await page.textContent("#flash"), "Rendering")

  await page.click("#link")
  await nextBody(page)
  await page.goBack()
  await nextBody(page)

  assert.notOk(await hasSelector(page, "#flash"))
})

test("test following a redirect renders a [data-turbo-cache=false] element before the cache omits it", async ({
  page,
}) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await page.click("#redirect-to-cache-observer")
  await nextBody(page)

  assert.equal(await page.textContent("#flash"), "Rendering")
})
