import { expect, test } from "@playwright/test"
import { nextEventNamed, readEventLogs, scrollPosition } from "../helpers/page"

const fixturePath = "/src/tests/fixtures/native_fragment_history.html"
const formPath = "/__turbo/native_form_history"

test("reloading a native POST preserves its method and body", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept())
  await page.goto(`${formPath}?turbo=false`)
  await requireEntryIdentifier(page)

  await submitNativeForm(page)
  const control = await page.reload()
  test.skip(control.request().method() !== "POST", "This browser driver does not resubmit a native POST when reloading")
  await expect(page.locator("#request-method")).toHaveText("POST")
  await expect(page.locator("#submitted-message")).toHaveText("Native POST contents")

  await page.goto(formPath)
  await submitNativeForm(page)
  const response = await page.reload()

  expect(response.request().method()).toEqual("POST")
  expect(new URLSearchParams(response.request().postData()).get("message")).toEqual("Native POST contents")
  await expect(page.locator("#request-method")).toHaveText("POST")
  await expect(page.locator("#submitted-message")).toHaveText("Native POST contents")
})

test("Back restores the untouched initial entry after a Drive visit", async ({ page }) => {
  await page.goto(fixturePath)
  await requireEntryIdentifier(page)
  await expect(page.locator("[data-widget-runtime]")).toHaveCount(1)
  await page.locator("#widget").evaluate(widget => widget.style.height = `${widget.offsetHeight}px`)
  await page.locator("#client-input").fill("Initial entry input")
  const initialEntry = await currentEntry(page)
  expect(initialEntry.state).toEqual(null)
  await scrollToPosition(page, { x: 0, y: 500 })
  await readEventLogs(page)

  await page.click("#drive-link")
  await nextEventNamed(page, "turbo:load")
  const destinationEntry = await currentEntry(page)

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  expect(await currentEntry(page)).toEqual(initialEntry)
  await expect(page.locator("#client-input")).toHaveValue("Initial entry input")
  await expect.poll(() => scrollPosition(page)).toEqual({ x: 0, y: 500 })

  await page.goForward()
  await nextEventNamed(page, "turbo:load")

  expect(await currentEntry(page)).toEqual(destinationEntry)
  await expect(page.locator("h1")).toHaveText("One")
})

test("restarting history preserves the current initial entry and its scroll data", async ({ page }) => {
  await page.goto(fixturePath)
  await requireEntryIdentifier(page)
  const initialEntry = await currentEntry(page)
  await scrollToPosition(page, { x: 0, y: 400 })
  await page.evaluate(() => {
    window.initialHistoryBody = document.body
    window.Turbo.session.history.stop()
    window.Turbo.session.history.start()
  })

  expect(await currentEntry(page)).toEqual(initialEntry)
  expect(await page.evaluate(() => document.body === window.initialHistoryBody)).toEqual(true)
  expect(await restorationScrollPosition(page)).toEqual({ x: 0, y: 400 })
  expect(await scrollPosition(page)).toEqual({ x: 0, y: 400 })
})

test("application entries at the same URL retain distinct restoration identities", async ({ page }) => {
  await page.goto(fixturePath)
  await requireEntryIdentifier(page)
  const initialEntry = await currentEntry(page)
  await page.evaluate(() => {
    window.Turbo.session.history.stop()
    window.history.pushState({ router: "same URL" }, "", window.location.href)
    window.Turbo.session.history.start()
  })
  const applicationEntry = await currentEntry(page)
  expect(applicationEntry.id).not.toEqual(initialEntry.id)
  expect(applicationEntry.restorationIdentifier).not.toEqual(initialEntry.restorationIdentifier)
  expect(applicationEntry.state).toEqual({ router: "same URL" })

  await page.evaluate(() => {
    window.Turbo.session.history.stop()
    window.history.replaceState(null, "", window.location.href)
    window.Turbo.session.history.start()
    window.initialHistoryBody = document.body
  })
  const replacementEntry = await currentEntry(page)
  expect(replacementEntry.key).toEqual(applicationEntry.key)
  expect(replacementEntry.id).not.toEqual(applicationEntry.id)
  expect(replacementEntry.restorationIdentifier).not.toEqual(applicationEntry.restorationIdentifier)
  expect(replacementEntry.state).toEqual(null)
  await readEventLogs(page)

  await traverseHistory(page, () => page.goBack())
  expect(await currentEntry(page)).toEqual(initialEntry)

  await traverseHistory(page, () => page.goForward())
  expect(await currentEntry(page)).toEqual(replacementEntry)
  expect(await page.evaluate(() => document.body === window.initialHistoryBody)).toEqual(true)
  expect(await readEventLogs(page)).toEqual([])
})

async function requireEntryIdentifier(page) {
  test.skip(!await page.evaluate(() => Boolean(window.navigation?.currentEntry?.id)), "This browser does not expose history entry identifiers")
}

async function submitNativeForm(page) {
  await page.locator("input[name=message]").fill("Native POST contents")
  await Promise.all([
    page.waitForEvent("load"),
    page.locator("button[type=submit]").click()
  ])
  await expect(page.locator("#request-method")).toHaveText("POST")
  await expect(page.locator("#submitted-message")).toHaveText("Native POST contents")
}

function currentEntry(page) {
  return page.evaluate(() => ({
    id: window.navigation.currentEntry.id,
    key: window.navigation.currentEntry.key,
    restorationIdentifier: window.Turbo.session.history.restorationIdentifier,
    state: window.history.state
  }))
}

async function scrollToPosition(page, position) {
  await page.evaluate(({ x, y }) => window.scrollTo({ left: x, top: y, behavior: "instant" }), position)
  await expect.poll(() => scrollPosition(page)).toEqual(position)
  await expect.poll(() => restorationScrollPosition(page)).toEqual(position)
}

function restorationScrollPosition(page) {
  return page.evaluate(() => {
    const history = window.Turbo.session.history
    return history.getRestorationDataForIdentifier(history.restorationIdentifier).scrollPosition
  })
}

async function traverseHistory(page, action) {
  await page.evaluate(() => {
    window.expectedHistoryPop = new Promise(resolve => {
      window.addEventListener("popstate", () => queueMicrotask(resolve), { once: true })
    })
  })
  await action()
  await page.evaluate(() => window.expectedHistoryPop)
}
