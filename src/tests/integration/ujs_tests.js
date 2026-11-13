import { expect, test } from "@playwright/test"
import { nextEventOnTarget, noNextEventOnTarget } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/ujs.html")
})

test("allows UJS to intercept and cancel Turbo requests for anchors inside a turbo-frame", async ({ page }) => {
  await assertRequestLimit(page, 1, async () => {
    await expect(page.locator("#frame h2")).toHaveText("Frames: #frame")

    await page.click("#frame a[data-remote=true]")

    await expect(page.locator("#frame")).toHaveText("Content from UJS response")
    expect(await noNextEventOnTarget(page, "frame", "turbo:frame-load")).toBeTruthy()
  })
})

test("handles [data-remote=true] forms within a turbo-frame", async ({ page }) => {
  await assertRequestLimit(page, 1, async () => {
    await expect(page.locator("#frame h2")).toHaveText("Frames: #frame")

    await page.click("#frame form[data-remote=true] button")

    expect(await nextEventOnTarget(page, "frame", "turbo:frame-load")).toBeTruthy()
    await expect(page.locator("#frame h2"), "navigates the target frame").toHaveText("Frame: Loaded")
  })
})

async function assertRequestLimit(page, count, callback) {
  let requestsStarted = 0
  await page.on("request", () => requestsStarted++)
  await callback()

  expect(requestsStarted, `only submits ${count} requests`).toEqual(count)
}
