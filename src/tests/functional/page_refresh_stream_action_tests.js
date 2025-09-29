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

  await page.evaluate(() => {
    const currentUrl = document.baseURI
    window.Turbo.session.recentRequests.markUrlAsRefreshed("123", currentUrl)
  })

  await assertPageRefresh(page, "123", {shouldOccur: false})

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

test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form inside the slideout/modal that redirects to conversations Show still inside the Turbo frame should refresh the page because only the content inside the Turbo frame was updated and thus, the content outside it is stale. Only one refresh should be processed.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-redirect-to-conversations-show-inside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: true})
  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})

test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form inside the slideout/modal that redirects to conversations show outside the Turbo frame should not refresh the page because we're exiting the Turbo frame and thus the content is already fresh.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-redirect-to-conversations-show-outside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})

test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form inside the slideout/modal that redirects to conversations Index still inside the Turbo frame should refresh the page because, since we're still inside the Turbo frame, the incoming updated conversation's index page only has an empty Turbo frame and since the updated content is outside it, it will be discarded. Only one refresh should be processed.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-redirect-to-conversations-index-inside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: true})
  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})

test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form inside the slideout/modal that redirects to conversations Index outside the Turbo frame should not refresh the page because we exited the Turbo frame and thus the content is already fresh.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-redirect-to-conversations-index-outside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})

test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form inside the slideout/modal that renders 422 status code, should not refresh the page because the content is already fresh.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-render-422-status-code-inside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})

test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form outside the slideout/modal that renders 422 status code still inside the Turbo frame, should not refresh the page because the content inside the Turbo frame is already fresh, and even though the content outside the Turbo frame is stale, it hasn't really been processed by the server yet.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-render-422-status-code-inside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})


test("from conversations Index, opening a Turbo frame slideout/modal to conversation Show, submitting a form outside the slideout/modal that renders 422 status code outside the Turbo frame, should not refresh the page because the content is already fresh, and even though the content inside the Turbo frame is stale, it hasn't really been processed by the server yet.", async ({ page }) => {
  await page.goto("/src/tests/fixtures/conversations/index.html")
  await page.click("#conversation-1")
  await page.click("#submit-button-to-update-conversation-and-render-422-status-code-outside-modal-frame")
  const requestIdThatTriggersRefreshes = await getLastRequestId(page)
  await assert.ok(requestIdThatTriggersRefreshes)

  await assertPageRefresh(page, requestIdThatTriggersRefreshes, {shouldOccur: false})
  await assertPageRefresh(page, "another-request-id", {shouldOccur: true})
})


async function getLastRequestIds(page) {
  await page.waitForLoadState("networkidle")
  return page.evaluate(() => {
    return Array.from(window.Turbo.session.recentRequests.requestIds)
  })
}

async function getLastRequestId(page) {
  const lastRequestIds = await getLastRequestIds(page)
  return lastRequestIds[lastRequestIds.length - 1]
}

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

async function assertPageRefresh(page, requestId, {shouldOccur}) {
  await page.evaluate(() => { window.eventLogs = [] })
  triggerRefresh(page, requestId)
  await nextPageRefresh(page)

  const visitLogs = await readEventLogs(page)
  const visitEvents = visitLogs.filter(([name]) => name == "turbo:visit")

  if (shouldOccur === true) {
    assert.equal(visitEvents.length, 1, "page refresh should occur")
  } else {
    assert.equal(visitEvents.length, 0, "page refresh should not occur")
  }
}

function triggerRefresh(page, requestId) {
  const html = `<turbo-stream action="refresh"${requestId ? ` request-id="${requestId}"` : ''}></turbo-stream>`
  page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), html)
}