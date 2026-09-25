import { test } from "@playwright/test"
import { assert } from "chai"
import { getFromLocalStorage, nextEventNamed, readEventLogs, setLocalStorageFromEvent } from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/form_turbo_optin_submitter.html")
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitStarted", "true")
  await setLocalStorageFromEvent(page, "turbo:submit-end", "formSubmitEnded", "true")
  await readEventLogs(page)
})

test("allows submitting an associated data-turbo=true form without data-turbo=true on submitter", async ({ page }) => {
  await page.click("#default-behavior-submit")

  assert.ok(await formSubmitStarted(page), "fires turbo:submit-start")

  const { fetchOptions } = await nextEventNamed(page, "turbo:before-fetch-request")

  assert.ok(fetchOptions.headers["Accept"].includes("text/vnd.turbo-stream.html"))

  await nextEventNamed(page, "turbo:before-fetch-response")

  assert.ok(await formSubmitEnded(page), "fires turbo:submit-end")
})

test("prevents submitting an associated data-turbo=true form when explicitly opted out", async ({ page }) => {
  await page.click("#opted-out-submit")

  assert.notOk(await formSubmitStarted(page), "fires turbo:submit-start")
})

function formSubmitStarted(page) {
  return getFromLocalStorage(page, "formSubmitStarted")
}

function formSubmitEnded(page) {
  return getFromLocalStorage(page, "formSubmitEnded")
}
