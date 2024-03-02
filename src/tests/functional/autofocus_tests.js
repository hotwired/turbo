import { test } from "@playwright/test"
import { assert } from "chai"
import { hasSelector, nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/autofocus.html")
})

test("autofocus first autofocus element on load", async ({ page }) => {
  await nextBeat()
  assert.ok(
    await hasSelector(page, "#first-autofocus-element:focus"),
    "focuses the first [autofocus] element on the page"
  )
  assert.notOk(
    await hasSelector(page, "#second-autofocus-element:focus"),
    "focuses the first [autofocus] element on the page"
  )
})

test("autofocus first [autofocus] element on visit", async ({ page }) => {
  await page.goto("/src/tests/fixtures/navigation.html")
  await page.click("#autofocus-link")
  await nextBeat()

  assert.ok(
    await hasSelector(page, "#first-autofocus-element:focus"),
    "focuses the first [autofocus] element on the page"
  )
  assert.notOk(
    await hasSelector(page, "#second-autofocus-element:focus"),
    "focuses the first [autofocus] element on the page"
  )
})

test("navigating a frame with a descendant link autofocuses [autofocus]:first-of-type", async ({ page }) => {
  await page.click("#frame-inner-link")
  await nextBeat()

  assert.ok(
    await hasSelector(page, "#frames-form-first-autofocus-element:focus"),
    "focuses the first [autofocus] element in frame"
  )
  assert.notOk(
    await hasSelector(page, "#frames-form-second-autofocus-element:focus"),
    "focuses the first [autofocus] element in frame"
  )
})

test("autofocus visible [autofocus] element on visit with inert elements", async ({ page }) => {
  await page.click("#autofocus-inert-link")
  await nextBeat()

  assert.notOk(
    await hasSelector(page, "#dialog-autofocus-element:focus"),
    "autofocus element is ignored in a closed dialog"
  )
  assert.notOk(
    await hasSelector(page, "#details-autofocus-element:focus"),
    "autofocus element is ignored in a closed details"
  )
  assert.notOk(
    await hasSelector(page, "#hidden-autofocus-element:focus"),
    "autofocus element is ignored in a hidden div"
  )
  assert.notOk(
    await hasSelector(page, "#inert-autofocus-element:focus"),
    "autofocus element is ignored in an inert div"
  )
  assert.notOk(
    await hasSelector(page, "#disabled-autofocus-element:focus"),
    "autofocus element is ignored when disabled"
  )
  assert.ok(
    await hasSelector(page, "#visible-autofocus-element:focus"),
    "focuses the visible [autofocus] element on the page"
  )
})

test("navigating a frame with a link targeting the frame autofocuses [autofocus]:first-of-type", async ({
  page
}) => {
  await page.click("#frame-outer-link")
  await nextBeat()

  assert.ok(
    await hasSelector(page, "#frames-form-first-autofocus-element:focus"),
    "focuses the first [autofocus] element in frame"
  )
  assert.notOk(
    await hasSelector(page, "#frames-form-second-autofocus-element:focus"),
    "focuses the first [autofocus] element in frame"
  )
})

test("navigating a frame with a turbo-frame targeting the frame autofocuses [autofocus]:first-of-type", async ({
  page
}) => {
  await page.click("#drives-frame-target-link")
  await nextBeat()

  assert.ok(
    await hasSelector(page, "#frames-form-first-autofocus-element:focus"),
    "focuses the first [autofocus] element in frame"
  )
  assert.notOk(
    await hasSelector(page, "#frames-form-second-autofocus-element:focus"),
    "focuses the first [autofocus] element in frame"
  )
})

test("receiving a Turbo Stream message with an [autofocus] element when the activeElement is the document", async ({ page }) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" targets="body">
        <template><input id="autofocus-from-stream" autofocus></template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  assert.ok(
    await hasSelector(page, "#autofocus-from-stream:focus"),
    "focuses the [autofocus] element in from the turbo-stream"
  )
})

test("autofocus from a Turbo Stream message does not leak a placeholder [id]", async ({ page }) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" targets="body">
        <template><div id="container-from-stream"><input autofocus></div></template>
      </turbo-stream>
    `)
  })
  await nextBeat()
  await nextBeat()  // to avoid flakiness

  assert.ok(
    await hasSelector(page, "#container-from-stream input:focus"),
    "focuses the [autofocus] element in from the turbo-stream"
  )
})

test("receiving a Turbo Stream message with an [autofocus] element when an element within the document has focus", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" targets="body">
        <template><input id="autofocus-from-stream" autofocus></template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  assert.ok(
    await hasSelector(page, "#first-autofocus-element:focus"),
    "focuses the first [autofocus] element on the page"
  )
})
