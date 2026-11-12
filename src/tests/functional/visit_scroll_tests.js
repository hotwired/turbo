import { test, expect } from "@playwright/test"
import { isScrolledToSelector, nextEventNamed, readEventLogs, scrollPosition } from "../helpers/page"

const path = "/src/tests/fixtures/scroll_restoration.html"

for (const scroll of ["preserve", "reset", undefined]) {
  const option = scroll ? `scroll: '${scroll}'` : "the scroll option omitted"
  const fragmentBehavior = scroll === "preserve" ? "preserves the current scroll instead of following a fragment" : "follows a fragment normally"

  test(`Turbo.visit with ${option} ${fragmentBehavior} after changing query parameters`, async ({ page }) => {
    await page.goto(`${path}?page=first`)
    await scrollPageTo(page, 100)

    await visitWithScroll(page, `${path}?page=second#three`, scroll)

    if (scroll === "preserve") {
      await expect.poll(() => scrollPosition(page)).toEqual({ x: 0, y: 100 })
    } else {
      await expect.poll(() => isScrolledToSelector(page, "#three")).toBeTruthy()
    }
  })

  test(`Turbo.visit with ${option} does not change subsequent browser Back scroll restoration`, async ({ page }) => {
    const previousLocation = `${path}?page=previous#three`
    await page.goto(previousLocation)
    await page.locator("#one").evaluate((element) => element.setAttribute("data-cached-marker", "previous page"))
    await scrollPageTo(page, 300)

    await visitWithScroll(page, `${path}?page=current`, scroll)
    await scrollPageTo(page, 100)
    await readEventLogs(page)

    await page.goBack()
    await nextEventNamed(page, "turbo:load")

    await expect(page).toHaveURL(previousLocation)
    await expect(page.locator("#one")).toHaveAttribute("data-cached-marker", "previous page")
    await expect.poll(() => scrollPosition(page)).toEqual({ x: 0, y: 300 })
  })
}

async function scrollPageTo(page, y) {
  await page.evaluate((y) => new Promise((resolve) => {
    const finish = () => requestAnimationFrame(() => resolve())
    if (window.scrollX === 0 && window.scrollY === y) {
      finish()
    } else {
      addEventListener("scroll", finish, { once: true })
      window.scrollTo(0, y)
    }
  }), y)
  await expect.poll(() => scrollPosition(page)).toEqual({ x: 0, y })
}

async function visitWithScroll(page, location, scroll) {
  await readEventLogs(page)
  const options = scroll ? { scroll } : {}
  await page.evaluate(([location, options]) => window.Turbo.visit(location, options), [location, options])
  await nextEventNamed(page, "turbo:load")
  await expect(page).toHaveURL(location)
}
