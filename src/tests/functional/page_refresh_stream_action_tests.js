import { test } from "@playwright/test"
import { assert } from "chai"
import { nextPageRefresh, readEventLogs, pathname } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_stream_action.html")
})

test("test refreshing the page", async ({ page }) => {
  assert.match(await textContent(page), /Hello/)

  await page.locator("#content").evaluate((content) => content.innerHTML = "")
  assert.notMatch(await textContent(page), /Hello/)

  await page.click("#refresh button")
  await nextPageRefresh(page)

  assert.match(await textContent(page), /Hello/)
})

test("don't refresh the page on self-originated request ids", async ({ page }) => {
  assert.match(await textContent(page), /Hello/)

  await page.locator("#content").evaluate((content) => content.innerHTML = "")
  page.evaluate(() => { window.Turbo.session.recentRequests.add("123") })

  await page.locator("#request-id").evaluate((input) => input.value = "123")
  await page.click("#refresh button")
  await nextPageRefresh(page)

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

test("debounce stream page refreshes", async ({ page }) => {
  await page.click("#refresh button")
  await page.click("#refresh button")
  await nextPageRefresh(page)
  await page.click("#refresh button")
  await nextPageRefresh(page)

  const eventLogs = await readEventLogs(page)
  const requestLogs = eventLogs.filter(([name]) => name == "turbo:visit")
  assert.equal(requestLogs.length, 2)
})

test("debounced refresh of stale URL does not hijack new location navigated to", async ({ page }) => {
  await setLongerPageRefreshDebouncePeriod(page)
  const urlBeforeVisit = page.url()

  await page.click("#refresh button")
  await page.click("#regular-link")
  await nextPageRefresh(page)

  const urlAfterVisit = page.url()
  assert.notEqual(urlBeforeVisit, urlAfterVisit)
  const expectedPath = "/src/tests/fixtures/one.html"
  assert.equal(pathname(urlAfterVisit), expectedPath)
})

async function textContent(page) {
  const messages = await page.locator("#content")
  return await messages.textContent()
}

async function fetchRequestId(page) {
  return await page.evaluate(async () => {
    const response = await window.Turbo.fetch("/__turbo/request_id_header")
    return response.text()
  })
}

async function setLongerPageRefreshDebouncePeriod(page, period = 500) {
  return page.evaluate((period) => window.Turbo.session.pageRefreshDebouncePeriod = period, period)
}
