import { expect, test } from "@playwright/test"
import { getFromLocalStorage, setLocalStorageFromEvent } from "../helpers/page"

test("a Drive POST stream response invalidates previously cached pages", async ({ page }) => {
  await submitStreamAndRestorePage(page, { method: "post", inFrame: false })

  await expect(page.locator("body")).not.toHaveAttribute("data-cached-page")
  await expectStreamPageRestored(page)
})

test("a Drive GET stream response preserves previously cached pages", async ({ page }) => {
  await submitStreamAndRestorePage(page, { method: "get", inFrame: false })

  await expect(page.locator("body")).toHaveAttribute("data-cached-page", "cached")
  await expectStreamPageRestored(page)
})

test("a frame POST stream response invalidates previously cached pages", async ({ page }) => {
  await submitStreamAndRestorePage(page, { method: "post", inFrame: true })

  await expect(page.locator("body")).not.toHaveAttribute("data-cached-page")
  await expectStreamPageRestored(page)
})

test("a frame GET stream response preserves previously cached pages", async ({ page }) => {
  await submitStreamAndRestorePage(page, { method: "get", inFrame: true })

  await expect(page.locator("body")).toHaveAttribute("data-cached-page", "cached")
  await expectStreamPageRestored(page)
})

async function submitStreamAndRestorePage(page, { method, inFrame }) {
  await page.goto("/src/tests/fixtures/one.html")
  const location = page.url()
  await page.evaluate(() => {
    window.streamCacheDocument = document
    document.body.setAttribute("data-cached-page", "cached")
    window.Turbo.visit("/src/tests/fixtures/form.html")
  })
  await expect(page.locator("h1")).toHaveText("Form")
  expect(await page.evaluate(() => window.streamCacheDocument === document)).toEqual(true)
  await expect.poll(() => page.evaluate((location) => {
    const snapshot = window.Turbo.session.view.snapshotCache.get(new URL(location))
    return snapshot?.element.getAttribute("data-cached-page")
  }, location)).toBe("cached")

  await page.evaluate(({ method, inFrame }) => {
    const form = document.querySelector("#frame form.stream[method=post]")
    form.id = "stream-cache-form"
    form.querySelector("[name=content]").value = "Snapshot cache stream"
    if (!inFrame) form.closest("turbo-frame").before(form)
    if (method === "get") {
      form.method = "get"
      form.action = "/__turbo/stream-response"
      form.setAttribute("data-turbo-stream", "")
    }
  }, { method, inFrame })
  await setLocalStorageFromEvent(page, "turbo:submit-end", "streamSubmitEnded", "true")

  const path = method === "post" ? "/__turbo/messages" : "/__turbo/stream-response"
  const [request] = await Promise.all([
    page.waitForRequest((request) => request.method() === method.toUpperCase() && new URL(request.url()).pathname === path),
    page.click("#stream-cache-form input[type=submit]")
  ])

  expect(request.headers()["turbo-frame"]).toEqual(inFrame ? "frame" : undefined)
  const response = await request.response()
  expect(response.status()).toEqual(200)
  expect(response.headers()["content-type"]).toContain("text/vnd.turbo-stream.html")
  await expect(page.locator("#messages .message")).toHaveText("Snapshot cache stream")
  await expect.poll(() => getFromLocalStorage(page, "streamSubmitEnded")).toBe("true")
  await expect(page).toHaveURL(new URL("/src/tests/fixtures/form.html", location).href)

  await page.goBack()

  await expect(page).toHaveURL(location)
  await expect(page.locator("h1")).toHaveText("One")
  expect(await page.evaluate(() => window.streamCacheDocument === document)).toEqual(true)
}

async function expectStreamPageRestored(page) {
  const location = new URL("/src/tests/fixtures/form.html", page.url()).href
  await page.goForward()

  await expect(page).toHaveURL(location)
  await expect(page.locator("h1")).toHaveText("Form")
  await expect(page.locator("#messages .message")).toHaveText("Snapshot cache stream")
  expect(await page.evaluate(() => window.streamCacheDocument === document)).toEqual(true)
}
