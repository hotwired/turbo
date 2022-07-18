import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/stream.html")
})

test("test receiving a stream message", async ({ page }) => {
  const selector = "#messages div.message:last-child"

  assert.equal(await page.textContent(selector), "First")

  await page.click("#create [type=submit]")
  await nextBeat()

  assert.equal(await page.textContent(selector), "Hello world!")
})

test("test receiving a stream message with css selector target", async ({ page }) => {
  let element
  const selector = ".messages div.message:last-child"

  element = await page.locator(selector).allTextContents()
  assert.equal(await element[0], "Second")
  assert.equal(await element[1], "Third")

  await page.click("#replace [type=submit]")
  await nextBeat()

  element = await page.locator(selector).allTextContents()
  assert.equal(await element[0], "Hello CSS!")
  assert.equal(await element[1], "Hello CSS!")
})

test("test overriding with custom StreamActions", async ({ page }) => {
  const html = "Rendered with Custom Action"

  await page.evaluate((html) => {
    window.Turbo.StreamActions.customUpdate = function () {
      for (const target of this.targetElements) target.innerHTML = html
    }
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<turbo-stream action="customUpdate" target="messages">
        <template></template>
      </turbo-stream>`
    )
  }, html)

  assert.equal(await page.textContent("#messages"), html, "evaluates custom StreamAction")
})

test("test receiving a stream message asynchronously", async ({ page }) => {
  let messages = await page.locator("#messages > *").allTextContents()

  assert.ok(messages[0])
  assert.notOk(messages[1], "receives streams when connected")
  assert.notOk(messages[2], "receives streams when connected")

  await page.click("#async button")
  await nextBeat()

  messages = await page.locator("#messages > *").allTextContents()

  assert.ok(messages[0])
  assert.ok(messages[1], "receives streams when connected")
  assert.notOk(messages[2], "receives streams when connected")

  await page.evaluate(() => document.getElementById("stream-source")?.remove())
  await nextBeat()

  await page.click("#async button")
  await nextBeat()

  messages = await page.locator("#messages > *").allTextContents()

  assert.ok(messages[0])
  assert.ok(messages[1], "receives streams when connected")
  assert.notOk(messages[2], "does not receive streams when disconnected")
})
