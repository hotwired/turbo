import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/pausable_rendering.html")
})

test("pauses and resumes rendering", async ({ page }) => {
  page.on("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Continue rendering?")
    dialog.accept()
  })

  await page.click("#link")

  await expect(page.locator("h1")).toHaveText("One")
})

test("aborts rendering", async ({ page }) => {
  const [firstDialog] = await Promise.all([page.waitForEvent("dialog"), page.click("#link")])

  expect(firstDialog.message()).toEqual("Continue rendering?")

  firstDialog.dismiss()

  await expect(page.locator("h1")).toHaveText("Pausable Rendering")
})

test("pauses and resumes rendering a Frame", async ({ page }) => {
  page.on("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Continue rendering?")
    dialog.accept()
  })

  await page.click("#frame-link")

  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")
})

test("aborts rendering a Frame", async ({ page }) => {
  page.on("dialog", (dialog) => {
    expect(dialog.message()).toEqual("Continue rendering?")
    dialog.dismiss()
  })

  await expect(page.locator("#hello h2")).toHaveText("Pausable Frame Rendering")
})
