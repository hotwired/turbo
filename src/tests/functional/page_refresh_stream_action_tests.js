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

  await page.locator("#content").evaluate((content) => content.innerHTML = "")
  await page.locator("#request-id").evaluate((input) => {
    input.value = "123"
    window.Turbo.session.recentRequests.add(input.value)
  })
  await page.click("#refresh button")
  await nextBeat()

  assert.notMatch(await textContent(page), /Hello/)
})

async function textContent(page) {
  const messages = await page.locator("#content")
  return await messages.textContent()
}
