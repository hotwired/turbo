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

test("an application history entry survives a Drive visit and later native traversal", async ({ page }) => {
  await openFragmentApp(page)
  await page.evaluate(() => window.history.pushState({ router: { step: 1 } }, "", "#router"))

  await page.click("#drive-link")
  await nextEventNamed(page, "turbo:load")
  await expect(page.locator("h1")).toHaveText("One")

  await restoreBack(page, "#router")

  await expect(page.locator("#client-marker")).toHaveText("Prepared client state")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  expect(await page.evaluate(() => window.history.state.router)).toEqual({ step: 1 })
  await page.evaluate(() => window.restoredApplicationBody = document.body)
  await readEventLogs(page)

  await changeFragment(page, () => page.click("#link-one"), "#one")
  await changeFragment(page, () => page.goBack(), "#router")

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events.filter(name => visitEvents.includes(name))).toEqual([])
  expect(await page.evaluate(() => document.body === window.restoredApplicationBody)).toEqual(true)
  expect(await page.evaluate(() => window.history.state.router)).toEqual({ step: 1 })
  await expect(page.locator("#client-marker")).toHaveText("Prepared client state")
  await expect(page.locator("#client-input")).toHaveValue("Client input state")
})

test("a legacy Turbo history entry restores its document and preserves existing state", async ({ page }) => {
  await openFragmentApp(page)
  await page.evaluate(pathname => {
    window.Turbo.session.history.stop()
    window.history.replaceState({
      router: { step: 1 },
      turbo: { restorationIdentifier: "legacy-one", restorationIndex: 1 }
    }, "", `${pathname}#one`)
    window.history.pushState({
      router: { step: 2 },
      turbo: { restorationIdentifier: "legacy-two", restorationIndex: 2 }
    }, "", `${pathname}#two`)
    window.Turbo.session.history.start()
  }, fixturePath)
  await expect(page).toHaveURL(withHash("#two"))
  expect(await page.evaluate(() => window.history.state)).toMatchObject({
    router: { step: 2 },
    turbo: { restorationIdentifier: "legacy-two", restorationIndex: 2 }
  })
  await page.evaluate(() => {
    window.legacyHistoryBody = document.body
    window.legacyHistoryWindow = "preserved across a Turbo restoration"
  })

  await restoreBack(page, "#one")

  const events = (await readEventLogs(page)).map(([name]) => name)
  expect(events).toContain("turbo:visit")
  expect(events).toContain("turbo:render")
  expect(await page.evaluate(() => document.body === window.legacyHistoryBody)).toEqual(false)
  expect(await page.evaluate(() => window.legacyHistoryWindow)).toEqual("preserved across a Turbo restoration")
  expect(await page.evaluate(() => window.history.state)).toMatchObject({
    router: { step: 1 },
    turbo: { restorationIdentifier: "legacy-one", restorationIndex: 1 }
  })
  await expect(page.locator("h1")).toHaveText("Native fragment history")
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
})

async function openFragmentApp(page) {
  await page.goto(fixturePath)
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  await page.locator("#client-input").fill("Client input state")
  await page.locator("#widget").evaluate(widget => {
    widget.insertAdjacentHTML("beforeend", '<span id="client-marker">Live client state</span><span id="router">Router fragment</span>')
  })
  await readEventLogs(page)
}

async function restoreBack(page, hash) {
  await page.evaluate(hash => {
    window.expectedStateHistoryLoad = new Promise(resolve => {
      const loaded = () => {
        if (window.location.hash === hash && document.querySelector("h1")?.textContent === "Native fragment history") {
          document.removeEventListener("turbo:load", loaded)
          resolve()
        }
      }
      document.addEventListener("turbo:load", loaded)
    })
  }, hash)
  await page.goBack()
  await page.evaluate(() => window.expectedStateHistoryLoad)
  await expect(page).toHaveURL(withHash(hash))
}

async function changeFragment(page, action, hash) {
  await page.evaluate(hash => {
    window.expectedStateFragmentChange = new Promise(resolve => {
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
  await page.evaluate(() => window.expectedStateFragmentChange)
  await expect(page).toHaveURL(withHash(hash))
}
