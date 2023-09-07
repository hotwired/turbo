import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/pausable_requests.html")
})

test("test pauses and resumes request", async ({ page }) => {
  page.once("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Continue request?")
    dialog.accept()
  })

  await page.click("#link")
  await nextBeat()

  assert.equal(await page.textContent("h1"), "One")
})

test("test aborts request", async ({ page }) => {
  page.once("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Continue request?")
    dialog.dismiss()
  })

  await page.click("#link")
  await nextBeat()

  page.once("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Request aborted")
    dialog.accept()
  })

  await nextBeat()

  assert.equal(await page.textContent("h1"), "Pausable Requests")
})
