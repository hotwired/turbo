import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/pausable_rendering.html")
})

test("test pauses and resumes rendering", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Continue rendering?")
    dialog.accept()
  })

  await page.click("#link")
  await nextBeat()

  assert.equal(await page.textContent("h1"), "One")
})

test("test aborts rendering", async ({ page }) => {
  const [firstDialog] = await Promise.all([page.waitForEvent("dialog"), page.click("#link")])

  assert.strictEqual(firstDialog.message(), "Continue rendering?")

  firstDialog.dismiss()

  const nextDialog = await page.waitForEvent("dialog")

  assert.strictEqual(nextDialog.message(), "Rendering aborted")
  nextDialog.accept()

  assert.equal(await page.textContent("h1"), "Pausable Rendering")
})
