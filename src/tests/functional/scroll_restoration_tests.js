import { test } from "@playwright/test"
import { assert } from "chai"
import {
  nextBeat,
  nextBody,
  scrollPosition,
  scrollToSelector
} from "../helpers/page"

test("landing on an anchor", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html#three")
  await nextBeat()
  const { y: yAfterLoading } = await scrollPosition(page)
  assert.notEqual(yAfterLoading, 0)
})

test("reloading after scrolling", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  const { y: yAfterScrolling } = await scrollPosition(page)
  assert.notEqual(yAfterScrolling, 0)

  await Promise.all([
    nextBody(page),
    page.evaluate(() => window.location.reload())
  ])
  const { y: yAfterReloading } = await scrollPosition(page)
  assert.notEqual(yAfterReloading, 0)
})

test("returning from history", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  await page.goto("/src/tests/fixtures/bare.html")
  await page.goBack()

  const { y: yAfterReturning } = await scrollPosition(page)
  assert.notEqual(yAfterReturning, 0)
})
