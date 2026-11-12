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
  const dialogMessages = []

  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message())
    if (dialog.message() === "Continue request?") {
      await dialog.dismiss()
    } else {
      await dialog.accept()
    }
  })

  await page.click("#link")
  await nextBeat()
  await nextBeat()

  expect(dialogMessages).toContain("Continue request?")
  expect(dialogMessages).toContain("Request aborted")
  await expect(page.locator("h1")).toHaveText("Pausable Requests")
})
