import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat, nextEventNamed, readEventLogs, waitUntilNoSelector, waitUntilText } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/stream.html")
  await readEventLogs(page)
})

test("test receiving a stream message", async ({ page }) => {
  const messages = await page.locator("#messages .message")

  assert.deepEqual(await messages.allTextContents(), ["First"])

  await page.click("#append-target button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])
})

test("test dispatches a turbo:before-stream-render event", async ({ page }) => {
  await page.click("#append-target button")
  await nextEventNamed(page, "turbo:submit-end")
  const [[type, { newStream }, target]] = await readEventLogs(page, 1)

  assert.equal(type, "turbo:before-stream-render")
  assert.equal(target, "a-turbo-stream")
  assert.ok(newStream.includes(`action="append"`))
  assert.ok(newStream.includes(`target="messages"`))
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

test("test receiving a message without a template", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="remove" target="messages"></turbo-stream>
    `)
  )

  assert.notOk(await waitUntilNoSelector(page, "#messages"), "removes target element")
})

test("test receiving a message with a <script> element", async ({ page }) => {
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

  assert.ok(await waitUntilText(page, "Hello from script"))
})

test("test overriding with custom StreamActions", async ({ page }) => {
  const html = "Rendered with Custom Action"

  await page.evaluate((html) => {
    const CustomActions: Record<string, any> = {
      customUpdate(newStream: { targetElements: HTMLElement[] }) {
        for (const target of newStream.targetElements) target.innerHTML = html
      },
    }

    addEventListener("turbo:before-stream-render", (({ target, detail }: CustomEvent) => {
      const stream = target as unknown as { action: string }

      const defaultRender = detail.render
      detail.render = CustomActions[stream.action] || defaultRender
    }) as EventListener)

    window.Turbo.renderStreamMessage(`
      <turbo-stream action="customUpdate" target="messages">
        <template></template>
      </turbo-stream>
    `)
  }, html)

  assert.ok(await waitUntilText(page, "Rendered with Custom Action"), "evaluates custom StreamAction")
})

test("test receiving a stream message over SSE", async ({ page }) => {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<turbo-stream-source id="stream-source" src="/__turbo/messages"></turbo-stream-source>`
    )
  })
  const messages = await page.locator("#messages .message")

  assert.deepEqual(await messages.allTextContents(), ["First"])

  await page.click("#async button")

  await waitUntilText(page, "Hello world!")
  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])

  await page.evaluate(() => document.getElementById("stream-source")?.remove())
  await nextBeat()

  await page.click("#async button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])
})
