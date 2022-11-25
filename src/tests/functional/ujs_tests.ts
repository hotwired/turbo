import { Page, test } from "@playwright/test"
import { assert } from "chai"
import { noNextEventOnTarget } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/ujs.html")
})

test("test clicking a [data-remote=true] anchor within a turbo-frame", async ({ page }) => {
  await assertRequestLimit(page, 1, async () => {
    assert.equal(await page.textContent("#frame h2"), "Frames: #frame")

    await page.click("#frame a[data-remote=true]")

    assert.ok(await noNextEventOnTarget(page, "frame", "turbo:frame-load"))
    assert.equal(await page.textContent("#frame h2"), "Frames: #frame", "does not navigate the target frame")
  })
})

test("test submitting a [data-remote=true] form within a turbo-frame", async ({ page }) => {
  await assertRequestLimit(page, 1, async () => {
    assert.equal(await page.textContent("#frame h2"), "Frames: #frame")

    await page.click("#frame form[data-remote=true] button")

    assert.ok(await noNextEventOnTarget(page, "frame", "turbo:frame-load"))
    assert.equal(await page.textContent("#frame h2"), "Frame: Loaded", "navigates the target frame")
  })
})

async function assertRequestLimit(page: Page, count: number, callback: () => Promise<void>) {
  let requestsStarted = 0
  await page.on("request", () => requestsStarted++)
  await callback()

  assert.equal(requestsStarted, count, `only submits ${count} requests`)
}
