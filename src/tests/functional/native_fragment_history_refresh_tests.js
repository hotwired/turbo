import { expect, test } from "@playwright/test"
import { nextEventNamed, readEventLogs, withHash } from "../helpers/page"

const fixturePath = "/src/tests/fixtures/native_fragment_history.html"
const visitEvents = [
  "turbo:before-visit",
  "turbo:visit",
  "turbo:before-cache",
  "turbo:before-render",
  "turbo:render",
  "turbo:load"
]

for (const [change, targetPath] of [
  ["another query", `${fixturePath}?view=second`],
  ["another fragment", `${fixturePath}?view=first#three`]
]) {
  test(`a replacement visit with ${change} restores the previous document on Back`, async ({ page }) => {
    await page.goto(`${fixturePath}?view=first#one`)
    await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
    await page.locator("#client-input").fill("First document state")
    await page.locator("#widget").evaluate(widget => {
      widget.insertAdjacentHTML("beforeend", '<span id="client-marker">Live client state</span>')
    })
    await readEventLogs(page)
    await changeFragment(page, () => page.click("#link-two"), "#two")

    await page.evaluate(path => window.Turbo.visit(path, { action: "replace" }), targetPath)
    await nextEventNamed(page, "turbo:load")
    await expect(page).toHaveURL(new URL(targetPath, page.url()).href)
    await expect(page.locator("#client-marker")).not.toBeAttached()
    await expect(page.locator("#client-input")).toHaveValue("")
    await page.evaluate(() => window.replacementFragmentBody = document.body)

    await page.goBack()
    await nextEventNamed(page, "turbo:load")

    await expect(page).toHaveURL(new URL(`${fixturePath}?view=first#one`, page.url()).href)
    expect(await page.evaluate(() => document.body === window.replacementFragmentBody)).toEqual(false)
    await expect(page.locator("#client-marker")).toHaveText("Prepared client state")
    await expect(page.locator("#client-input")).toHaveValue("First document state")
    await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)

    await page.goForward()
    await nextEventNamed(page, "turbo:load")

    await expect(page).toHaveURL(new URL(targetPath, page.url()).href)
    await expect(page.locator("#client-marker")).not.toBeAttached()
    await expect(page.locator("#client-input")).toHaveValue("")
    await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  })
}

test("a page refresh keeps native history within the refreshed document", async ({ page }) => {
  await page.goto(`${fixturePath}?view=first#one`)
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  await readEventLogs(page)
  await changeFragment(page, () => page.click("#link-two"), "#two")
  await page.evaluate(() => {
    window.beforeRefreshBody = document.body
    window.Turbo.session.refresh(window.location.href)
  })
  await nextEventNamed(page, "turbo:load")
  expect(await page.evaluate(() => document.body === window.beforeRefreshBody)).toEqual(false)
  await page.evaluate(() => {
    window.refreshedFragmentBody = document.body
    document.getElementById("widget").insertAdjacentHTML("beforeend", '<span id="refreshed-marker">Refreshed client state</span>')
  })
  await page.locator("#client-input").fill("Refreshed input state")
  await readEventLogs(page)

  await changeFragment(page, () => page.goBack(), "#one")
  await changeFragment(page, () => page.goForward(), "#two")

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events.filter(name => visitEvents.includes(name))).toEqual([])
  expect(await page.evaluate(() => document.body === window.refreshedFragmentBody)).toEqual(true)
  await expect(page.locator("#refreshed-marker")).toHaveText("Refreshed client state")
  await expect(page.locator("#client-input")).toHaveValue("Refreshed input state")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
})

async function changeFragment(page, action, hash) {
  await page.evaluate(hash => {
    window.expectedRefreshFragmentChange = new Promise(resolve => {
      const changed = () => {
        if (window.location.hash === hash) {
          window.removeEventListener("hashchange", changed)
          queueMicrotask(resolve)
        }
      }
      window.addEventListener("hashchange", changed)
    })
  }, hash)
  await action()
  await page.evaluate(() => window.expectedRefreshFragmentChange)
  await expect(page).toHaveURL(withHash(hash))
}
