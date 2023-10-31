import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/pausable_rendering.html")
})

test("pauses and resumes rendering", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Continue rendering?")
    dialog.accept()
  })

  await page.click("#link")
  await nextBeat()

  assert.equal(await page.textContent("h1"), "One")
})

test("aborts rendering", async ({ page }) => {
  const [firstDialog] = await Promise.all([page.waitForEvent("dialog"), page.click("#link")])

  assert.strictEqual(firstDialog.message(), "Continue rendering?")

  firstDialog.dismiss()

  assert.equal(await page.textContent("h1"), "Pausable Rendering")
})

test("pauses and resumes rendering a Frame", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Continue rendering?")
    dialog.accept()
  })

  await page.click("#frame-link")
  await nextBeat()

  assert.equal(await page.textContent("#hello h2"), "Hello from a frame")
})

test("aborts rendering a Frame", async ({ page }) => {
  page.on("dialog", (dialog) => {
    assert.strictEqual(dialog.message(), "Continue rendering?")
    dialog.dismiss()
  })

  assert.equal(await page.textContent("#hello h2"), "Pausable Frame Rendering")
})
