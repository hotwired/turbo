import { test } from "@playwright/test"
import { assert } from "chai"
import { nextBeat } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_stream_action.html")
})

test("test refreshing the page", async ({ page }) => {
  assert.match(await textContent(page), /Hello/)

  await page.locator("#content").evaluate((content)=>content.innerHTML = "")
  assert.notMatch(await textContent(page), /Hello/)

  await page.click("#refresh button")
  await nextBeat()

  assert.match(await textContent(page), /Hello/)
})

test("don't refresh the page on self-originated request ids", async ({ page }) => {
  assert.match(await textContent(page), /Hello/)

  await page.locator("#content").evaluate((content)=>content.innerHTML = "")
  page.evaluate(()=> { window.Turbo.session.recentRequests.add("123") })

  await page.locator("#request-id").evaluate((input)=>input.value = "123")
  await page.click("#refresh button")
  await nextBeat()

  assert.notMatch(await textContent(page), /Hello/)
})

test("fetch injects a Turbo-Request-Id with a UID generated automatically", async ({ page }) => {
  const response1 = await fetchRequestId(page)
  const response2 = await fetchRequestId(page)

  assert.notEqual(response1, response2)

  for (const response of [response1, response2]) {
    assert.match(response, /.+-.+-.+-.+/)
  }
})

async function textContent(page) {
  const messages = await page.locator("#content")
  return await messages.textContent()
}

async function fetchRequestId(page) {
  return await page.evaluate(async () => {
    const response = await window.fetch("/__turbo/request_id_header")
    return response.text()
  })
}
