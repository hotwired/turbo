import { expect, test } from "@playwright/test"
import {
  nextBeat,
  reloadPage,
  scrollPosition,
  scrollToSelector
} from "../helpers/page"

const scrollRoots = [
  { name: "document", fixture: "scroll_restoration.html", root: null }
]

for (const { name, fixture, root } of scrollRoots) {
  test(`landing on an anchor (${name})`, async ({ page }) => {
    await page.goto(`/src/tests/fixtures/${fixture}#three`)
    await nextBeat()
    const { y: yAfterLoading } = await scrollPosition(page, root)
    expect(yAfterLoading).not.toEqual(0)
  })

  test(`reloading after scrolling (${name})`, async ({ page }) => {
    await page.goto(`/src/tests/fixtures/${fixture}`)
    await scrollToSelector(page, "#three")
    const { y: yAfterScrolling } = await scrollPosition(page, root)
    expect(yAfterScrolling).not.toEqual(0)

    await reloadPage(page)
    const { y: yAfterReloading } = await scrollPosition(page, root)
    expect(yAfterReloading).not.toEqual(0)
  })

  test(`returning from history (${name})`, async ({ page }) => {
    await page.goto(`/src/tests/fixtures/${fixture}`)
    await scrollToSelector(page, "#three")
    await page.goto("/src/tests/fixtures/bare.html")
    await page.goBack()

    const { y: yAfterReturning } = await scrollPosition(page, root)
    expect(yAfterReturning).not.toEqual(0)
  })
}
