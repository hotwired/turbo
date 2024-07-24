import { expect, test } from "@playwright/test"
import { assert } from "chai"
import {
  hasSelector,
  nextAttributeMutationNamed,
  nextBeat,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventOnTarget,
  readEventLogs,
  waitUntilNoSelector,
  waitUntilText
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/stream.html")
  await readEventLogs(page)
})

test("receiving a stream message", async ({ page }) => {
  const messages = await page.locator("#messages .message")

  assert.deepEqual(await messages.allTextContents(), ["First"])

  await page.click("#append-target button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])
})

test("dispatches a turbo:before-stream-render event", async ({ page }) => {
  await page.click("#append-target button")
  await nextEventNamed(page, "turbo:submit-end")
  const [[type, { newStream }, target]] = await readEventLogs(page, 1)

  assert.equal(type, "turbo:before-stream-render")
  assert.equal(target, "a-turbo-stream")
  assert.ok(newStream.includes(`action="append"`))
  assert.ok(newStream.includes(`target="messages"`))
})

test("receiving a stream message with css selector target", async ({ page }) => {
  const messages2 = await page.locator("#messages_2 .message")
  const messages3 = await page.locator("#messages_3 .message")

  assert.deepEqual(await messages2.allTextContents(), ["Second"])
  assert.deepEqual(await messages3.allTextContents(), ["Third"])

  await page.click("#append-targets button")
  await nextBeat()

  assert.deepEqual(await messages2.allTextContents(), ["Second", "Hello CSS!"])
  assert.deepEqual(await messages3.allTextContents(), ["Third", "Hello CSS!"])
})

test("receiving a message without a template", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="remove" target="messages"></turbo-stream>
    `)
  )

  assert.notOk(await waitUntilNoSelector(page, "#messages"), "removes target element")
})

test("receiving a message with a <script> element", async ({ page }) => {
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

test("overriding with custom StreamActions", async ({ page }) => {
  const html = "Rendered with Custom Action"

  await page.evaluate((html) => {
    const CustomActions = {
      customUpdate(newStream) {
        for (const target of newStream.targetElements) target.innerHTML = html
      }
    }

    addEventListener("turbo:before-stream-render", ({ target, detail }) => {
      const stream = target

      const defaultRender = detail.render
      detail.render = CustomActions[stream.action] || defaultRender
    })

    window.Turbo.renderStreamMessage(`
      <turbo-stream action="customUpdate" target="messages">
        <template></template>
      </turbo-stream>
    `)
  }, html)

  assert.ok(await waitUntilText(page, "Rendered with Custom Action"), "evaluates custom StreamAction")
})

test("receiving a stream message over SSE", async ({ page }) => {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<turbo-stream-source id="stream-source" src="/__turbo/messages"></turbo-stream-source>`
    )
  })

  const messages = page.locator("#messages .message")
  const streamSource = page.locator("#stream-source")
  const submit = page.locator("#async button")

  await expectReadyState(streamSource, "OPEN")
  await expect(messages).toHaveText(["First"])

  await submit.click()

  await expect(messages).toHaveText(["First", "Hello world!"])

  await expectReadyState(streamSource, "CLOSED", { removeBeforeCheck: true })

  await submit.click()

  await expect(messages).toHaveText(["First", "Hello world!"])
})

test("changes to the <turbo-stream-source> attributes triggers a reconnection", async ({ page }) => {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<turbo-stream-source id="stream-source" src="/__turbo/messages"></turbo-stream-source>`
    )
  })

  const streamSource = page.locator("#stream-source")
  await expectReadyState(streamSource, "OPEN")

  await streamSource.evaluate((element) => element.setAttribute("src", "/__turbo/changed"))

  await expect(await nextAttributeMutationNamed(page, "stream-source", "connected")).toEqual("")
})

test("receiving an update stream message preserves focus if the activeElement has an [id]", async ({ page }) => {
  await page.locator("input#container-element").focus()
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="update" target="container">
        <template><textarea id="container-element"></textarea></template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  assert.ok(await hasSelector(page, "textarea#container-element:focus"))
})

test("receiving a replace stream message preserves focus if the activeElement has an [id]", async ({ page }) => {
  await page.locator("input#container-element").focus()
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="replace" target="container-element">
        <template><textarea id="container-element"></textarea></template>
      </turbo-stream>
    `)
  })
  await nextBeat()

  assert.ok(await hasSelector(page, "textarea#container-element:focus"))
})

test("receiving a remove stream message preserves focus blurs the activeElement", async ({ page }) => {
  await page.locator("#container-element").focus()
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="remove" target="container-element"></turbo-stream>
    `)
  })
  await nextBeat()

  assert.notOk(await hasSelector(page, ":focus"))
})

test("dispatches a turbo:before-morph-element & turbo:morph-element for each morph stream action", async ({ page }) => {
  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="replace" method="morph" target="message_1">
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
  await page.evaluate(() => {
    addEventListener("turbo:before-morph-element", (event) => {
      event.preventDefault()
    })
  })

  await page.evaluate(() => {
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="replace" method="morph" target="message_1">
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

async function expectReadyState(streamSource, name, { removeBeforeCheck } = { removeBeforeCheck: false }) {
  const expected = await streamSource.evaluate((_, name) => EventSource[name], name)
  const [actual, connected] = await streamSource.evaluate((element, removeBeforeCheck) => {
    if (removeBeforeCheck) element.remove()

    return [element.streamSource.readyState, element.getAttribute("connected")]
  }, removeBeforeCheck)

  await expect(connected).toEqual(name === "OPEN" ? "" : null)
  await expect(actual).toEqual(expected)
}
