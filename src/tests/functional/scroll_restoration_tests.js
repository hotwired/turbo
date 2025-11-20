import { expect, test } from "@playwright/test"
import {
  nextBeat,
  reloadPage,
  scrollPosition,
  scrollToSelector
} from "../helpers/page"

test("landing on an anchor", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html#three")
  await nextBeat()
  const { y: yAfterLoading } = await scrollPosition(page)
  expect(yAfterLoading).not.toEqual(0)
})

test("reloading after scrolling", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  const { y: yAfterScrolling } = await scrollPosition(page)
  expect(yAfterScrolling).not.toEqual(0)

  await reloadPage(page)
  const { y: yAfterReloading } = await scrollPosition(page)
  expect(yAfterReloading).not.toEqual(0)
})

test("returning from history", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  await scrollToSelector(page, "#three")
  await page.goto("/src/tests/fixtures/bare.html")
  await page.goBack()

  const { y: yAfterReturning } = await scrollPosition(page)
  expect(yAfterReturning).not.toEqual(0)
})
