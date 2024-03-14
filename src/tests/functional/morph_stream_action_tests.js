import { test, expect } from "@playwright/test"
import { nextEventOnTarget, noNextEventOnTarget } from "../helpers/page"

test("dispatches a turbo:before-morph-element & turbo:morph-element for each morph stream action", async ({ page }) => {
  await page.goto("/src/tests/fixtures/morph_stream_action.html")

  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="morph" target="message_1">
        <template>
          <div id="message_1">
            <h1>Morphed</h1>
          </div>
        </template>
      </turbo-stream>
    `)
  })

  await nextEventOnTarget(page, "message_1", "turbo:before-morph-element")
  await nextEventOnTarget(page, "message_1", "turbo:morph-element")
  await expect(page.locator("#message_1")).toHaveText("Morphed")
})

test("preventing a turbo:before-morph-element prevents the morph", async ({ page }) => {
  await page.goto("/src/tests/fixtures/morph_stream_action.html")

  await page.evaluate(() => {
    addEventListener("turbo:before-morph-element", (event) => {
      event.preventDefault()
    })
  })

  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="morph" target="message_1">
        <template>
          <div id="message_1">
            <h1>Morphed</h1>
          </div>
        </template>
      </turbo-stream>
    `)
  })

  await nextEventOnTarget(page, "message_1", "turbo:before-morph-element")
  await noNextEventOnTarget(page, "message_1", "turbo:morph-element")
  await expect(page.locator("#message_1")).toHaveText("Morph me")
})
