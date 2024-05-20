import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/autofocus.html")
})

test("autofocus first autofocus element on load", async ({ page }) => {
  await expect(page.locator("#first-autofocus-element")).toBeFocused()
})

test("autofocus first [autofocus] element on visit", async ({ page }) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await page.click("#autofocus-link")
  await expect(page.locator("#first-autofocus-element")).toBeFocused()
})

test("navigating a frame with a descendant link autofocuses [autofocus]:first-of-type", async ({ page }) => {
  await page.click("#frame-inner-link")
  await expect(page.locator("#frames-form-first-autofocus-element")).toBeFocused()
})

test("autofocus visible [autofocus] element on visit with inert elements", async ({ page }) => {
  await page.click("#autofocus-inert-link")
  await expect(page.locator("#visible-autofocus-element")).toBeFocused()
})

test("navigating a frame with a link targeting the frame autofocuses [autofocus]:first-of-type", async ({
  page
}) => {
  await page.click("#frame-outer-link")
  await expect(page.locator("#frames-form-first-autofocus-element")).toBeFocused()
})

test("navigating a frame with a turbo-frame targeting the frame autofocuses [autofocus]:first-of-type", async ({
  page
}) => {
  await page.click("#drives-frame-target-link")
  await expect(page.locator("#frames-form-first-autofocus-element")).toBeFocused()
})

test("receiving a Turbo Stream message with an [autofocus] element when the activeElement is the document", async ({ page }) => {
  await page.evaluate(() => {
    document.activeElement.blur()
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" targets="body">
        <template><input id="autofocus-from-stream" autofocus></template>
      </turbo-stream>
    `)
  })
  await expect(page.locator("#autofocus-from-stream")).toBeFocused()
})

test("autofocus from a Turbo Stream message does not leak a placeholder [id]", async ({ page }) => {
  await page.evaluate(() => {
    document.activeElement.blur()
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" targets="body">
        <template><div id="container-from-stream"><input autofocus></div></template>
      </turbo-stream>
    `)
  })

  await expect(page.locator("#container-from-stream input")).toBeFocused()

})

test("receiving a Turbo Stream message with an [autofocus] element when an element within the document has focus", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" targets="body">
        <template><input id="autofocus-from-stream" autofocus></template>
      </turbo-stream>
    `)
  })
  await expect(page.locator("#first-autofocus-element")).toBeFocused()
})
