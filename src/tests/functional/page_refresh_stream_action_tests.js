import { expect, test } from "@playwright/test"
import { nextPageRefresh, readEventLogs, withPathname } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/page_refresh_stream_action.html")
})

test("test refreshing the page", async ({ page }) => {
  const content = page.locator("#content")
  await expect(content).toHaveText(/Hello/)

  await content.evaluate((content) => content.innerHTML = "")
  await expect(content).not.toHaveText(/Hello/)

  await page.click("#refresh button")

  await expect(content).toHaveText(/Hello/)
})

test("don't refresh the page on self-originated request ids", async ({ page }) => {
  const content = page.locator("#content")
  await expect(content).toHaveText(/Hello/)

  await content.evaluate((content) => content.innerHTML = "")
  await page.evaluate(() => { window.Turbo.session.recentRequests.add("123") })

  await page.locator("#request-id").evaluate((input) => input.value = "123")
  await page.click("#refresh button")
  await nextPageRefresh(page)

  await expect(content).not.toHaveText(/Hello/)
})

test("fetch injects a Turbo-Request-Id with a UID generated automatically", async ({ page }) => {
  const response1 = await fetchRequestId(page)
  const response2 = await fetchRequestId(page)

  expect(response1).not.toEqual(response2)

  for (const response of [response1, response2]) {
    expect(response).toMatch(/.+-.+-.+-.+/)
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
  expect(requestLogs.length).toEqual(2)
})

test("debounced refresh of stale URL does not hijack new location navigated to", async ({ page }) => {
  await setLongerPageRefreshDebouncePeriod(page)

  await page.click("#refresh button")
  await page.click("#regular-link")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
})

async function fetchRequestId(page) {
  return await page.evaluate(async () => {
    const response = await window.Turbo.fetch("/__turbo/request_id_header")
    return response.text()
  })
}

async function setLongerPageRefreshDebouncePeriod(page, period = 500) {
  return page.evaluate((period) => window.Turbo.session.pageRefreshDebouncePeriod = period, period)
}
