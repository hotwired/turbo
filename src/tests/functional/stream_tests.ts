import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/stream.html")
})

test("test receiving a stream message", async ({ page }) => {
  const messages = await page.locator("#messages .message")

  assert.deepEqual(await messages.allTextContents(), ["First"])

  await page.click("#append-target button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])
})

test("test receiving a stream message with css selector target", async ({ page }) => {
  const messages2 = await page.locator("#messages_2 .message")
  const messages3 = await page.locator("#messages_3 .message")

  assert.deepEqual(await messages2.allTextContents(), ["Second"])
  assert.deepEqual(await messages3.allTextContents(), ["Third"])

  await page.click("#append-targets button")
  await nextBeat()

  assert.deepEqual(await messages2.allTextContents(), ["Second", "Hello CSS!"])
  assert.deepEqual(await messages3.allTextContents(), ["Third", "Hello CSS!"])
})

test("test receiving a message with a <script> element", async ({ page }) => {
  const messages = await page.locator("#messages .message")

  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" target="messages">
        <template>
          <script>
            const messages = document.querySelector("#messages .message")
            messages.textContent = "Hello from script"
          </script>
        </template>
      </turbo-stream>
    `)
  )

  assert.deepEqual(await messages.allTextContents(), ["Hello from script"])
})

test("test overriding with custom StreamActions", async ({ page }) => {
  const html = "Rendered with Custom Action"

  await page.evaluate((html) => {
    window.Turbo.StreamActions.customUpdate = function () {
      for (const target of this.targetElements) target.innerHTML = html
    }
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="customUpdate" target="messages">
        <template></template>
      </turbo-stream>
    `)
  }, html)

  assert.equal(await page.textContent("#messages"), html, "evaluates custom StreamAction")
})

test("test receiving a stream message asynchronously", async ({ page }) => {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<turbo-stream-source id="stream-source" src="/__turbo/messages"></turbo-stream-source>`
    )
  })
  const messages = await page.locator("#messages .message")

  assert.deepEqual(await messages.allTextContents(), ["First"])

  await page.click("#async button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])

  await page.evaluate(() => document.getElementById("stream-source")?.remove())
  await nextBeat()

  await page.click("#async button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])
})
