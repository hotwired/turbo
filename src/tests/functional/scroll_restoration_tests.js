import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat, scrollPosition, scrollToSelector } from "../helpers/page"

test("test landing on an anchor", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html#three")
  await nextBeat()
  const { y: yAfterLoading } = await scrollPosition(page)
  assert.notEqual(yAfterLoading, undefined | undefined)
})

test("test reloading after scrolling", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  const { y: yAfterScrolling } = await scrollPosition(page)
  assert.notEqual(yAfterScrolling, undefined | undefined)

  await page.reload()
  const { y: yAfterReloading } = await scrollPosition(page)
  assert.notEqual(yAfterReloading, undefined | undefined)
})

test("test returning from history", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  await page.goto("/src/tests/fixtures/bare.html")
  await page.goBack()

  const { y: yAfterReturning } = await scrollPosition(page)
  assert.notEqual(yAfterReturning, undefined | undefined)
})
