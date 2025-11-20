import { expect, test } from "@playwright/test"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/pausable_requests.html")
})

test("pauses and resumes request", async ({ page }) => {
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Continue request?")
    dialog.accept()
  })

  await page.click("#link")

  await expect(page.locator("h1")).toHaveText("One")
})

test("aborts request", async ({ page }) => {
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Continue request?")
    dialog.dismiss()
  })

  await page.click("#link")
  await nextBeat()

  page.once("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Request aborted")
    dialog.accept()
  })

  await nextBeat()

  await expect(page.locator("h1")).toHaveText("Pausable Requests")
})
