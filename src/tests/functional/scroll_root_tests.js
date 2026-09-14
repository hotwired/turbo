import { expect, test } from "@playwright/test"
import {
  nextBeat,
  nextEventNamed,
  readEventLogs,
  scrollPosition,
  scrollToSelector
} from "../helpers/page"

test("restores custom root scroll on history return after visiting from a windowed page", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_root_entry.html")
  await readEventLogs(page)
  await page.click("#enter-link")
  await nextEventNamed(page, "turbo:load")
  await nextBeat()

  await scrollToSelector(page, "#three")
  await nextBeat()
  const { y: yAfterScrolling } = await scrollPosition(page, "[data-turbo-scroll-root]")
  expect(yAfterScrolling, "custom root scrolled").not.toEqual(0)

  await page.click("#leave-link")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")
  await nextBeat()

  const { y: yAfterReturning } = await scrollPosition(page, "[data-turbo-scroll-root]")
  expect(Math.abs(yAfterReturning - yAfterScrolling), "custom root position restored on history return").toBeLessThanOrEqual(2)
})

test("restores windowed scroll on history return after visiting from a custom-root page", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_root.html")
  await readEventLogs(page)
  await page.click("#leave-link")
  await nextEventNamed(page, "turbo:load")
  await nextBeat()

  await scrollToSelector(page, "#three")
  await nextBeat()
  const { y: yAfterScrolling } = await scrollPosition(page)
  expect(yAfterScrolling, "document scrolled").not.toEqual(0)

  await visitLocation(page, "/src/tests/fixtures/scroll_root.html")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")
  await nextBeat()

  const { y: yAfterReturning } = await scrollPosition(page)
  expect(Math.abs(yAfterReturning - yAfterScrolling), "windowed position restored on history return").toBeLessThanOrEqual(2)
})

test("falls back to the window when no [data-turbo-scroll-root] is present", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_restoration.html")
  const isWindow = await page.evaluate(() => window.Turbo.session.scrollObserver.scrollRoot === window)
  expect(isWindow, "scroll root is the window").toBe(true)
})

test("uses the first element when several carry [data-turbo-scroll-root]", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_root.html")
  const usesFirst = await page.evaluate(() => {
    const second = document.createElement("div")
    second.setAttribute("data-turbo-scroll-root", "")
    document.body.append(second)
    const first = document.querySelector("[data-turbo-scroll-root]")
    return window.Turbo.session.scrollObserver.scrollRoot === first && first !== second
  })
  expect(usesFirst, "scroll root is the first matching element").toBe(true)
})

test("re-resolves the scroll root after the element is replaced by a Turbo Stream", async ({ page }) => {
  await page.goto("/src/tests/fixtures/scroll_root.html")
  const originalIsRoot = await page.evaluate(() => {
    const original = document.querySelector("[data-turbo-scroll-root]")
    return window.Turbo.session.scrollObserver.scrollRoot === original
  })
  expect(originalIsRoot, "original element is the scroll root").toBe(true)

  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="replace" target="scroll-container">
        <template>
          <main id="scroll-container" data-turbo-scroll-root style="overflow-y: auto">
            <section id="one" style="min-height: 100vh">One</section>
            <section id="two" style="min-height: 100vh">Two</section>
          </main>
        </template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  const resolvesToNewRoot = await page.evaluate(() => {
    const current = document.querySelector("[data-turbo-scroll-root]")
    const resolved = window.Turbo.session.scrollObserver.scrollRoot
    return resolved === current && current.isConnected && resolved !== window
  })
  expect(resolvesToNewRoot, "scroll root re-resolves to the new connected element").toBe(true)
})

function visitLocation(page, location) {
  return page.evaluate((location) => window.Turbo.visit(location), location)
}
