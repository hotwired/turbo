import { test } from "@playwright/test"
import { assert } from "chai"
import {
  hasSelector,
  nextBeat,
  nextEventNamed,
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
  await nextBeat()
  assert.equal(await getReadyState(page, "stream-source"), await page.evaluate(() => EventSource.OPEN))

  const messages = await page.locator("#messages .message")

  assert.deepEqual(await messages.allTextContents(), ["First"])

  await page.click("#async button")

  await waitUntilText(page, "Hello world!")
  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])

  const readyState = await page.evaluate((id) => {
    const element = document.getElementById(id)

    if (element && element.streamSource) {
      element.remove()

      return element.streamSource.readyState
    } else {
      return -1
    }
  }, "stream-source")
  assert.equal(readyState, await page.evaluate(() => EventSource.CLOSED))

  await page.click("#async button")
  await nextBeat()

  assert.deepEqual(await messages.allTextContents(), ["First", "Hello world!"])
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

test("test receiving an [action=after] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="after" target="form_with_action_names">
        <template><p id="after_form_with_action_names">After</p></template>
      </turbo-stream>
    `)
  )

  assert.equal(await page.textContent("#after_form_with_action_names"), "After")
})

test("test receiving an [action=append] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="append" target="form_with_action_names">
        <template>Append</template>
      </turbo-stream>
    `)
  )
  await nextBeat()

  assert.include(await page.textContent("#form_with_action_names"), "Append")
})

test("test receiving an [action=before] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="before" target="form_with_action_names">
        <template><p id="before_form_with_action_names">Before</p></template>
      </turbo-stream>
    `)
  )

  assert.equal(await page.textContent("#before_form_with_action_names"), "Before")
})

test("test receiving an [action=prepend] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="prepend" target="form_with_action_names">
        <template>Prepend</template>
      </turbo-stream>
    `)
  )
  await nextBeat()

  assert.include(await page.textContent("#form_with_action_names"), "Prepend")
})

test("test receiving an [action=remove] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="remove" target="form_with_action_names"></turbo-stream>
    `)
  )

  assert.notOk(await waitUntilNoSelector(page, "#form_with_action_names"), "removes target element")
})

test("test receiving an [action=replace] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="replace" target="form_with_action_names">
        <template><div id="form_with_action_names"></div></template>
      </turbo-stream>
    `)
  )

  assert.notOk(await hasSelector(page, "form#form_with_action_names"))
  assert.ok(await hasSelector(page, "div#form_with_action_names"))
})

test("test receiving an [action=update] targeting a form", async ({ page }) => {
  await page.evaluate(() =>
    window.Turbo.renderStreamMessage(`
      <turbo-stream action="update" target="form_with_action_names">
        <template><input name="updated_field"></template>
      </turbo-stream>
    `)
  )
  await nextBeat()

  assert.ok(await hasSelector(page, "#form_with_action_names [name=updated_field]"))
})

async function getReadyState(page, id) {
  return page.evaluate((id) => {
    const element = document.getElementById(id)

    if (element?.streamSource) {
      return element.streamSource.readyState
    } else {
      return -1
    }
  }, id)
}
