import { test } from "@playwright/test"
import { getFromLocalStorage, setLocalStorageFromEvent } from "../helpers/page"
import { assert } from "chai"

test("form submission with form mode off", async ({ page }) => {
  await gotoPageWithFormMode(page, "off")
  await page.click("#turbo-enabled-form button")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission without submitter with form mode off", async ({ page }) => {
  await gotoPageWithFormMode(page, "off")
  await page.press("#turbo-enabled-form-without-submitter [type=text]", "Enter")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission with form mode off from submitter outside form", async ({ page }) => {
  await gotoPageWithFormMode(page, "off")
  await page.click("button[form=turbo-enabled-form]")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission with form mode optin and form not enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("#form button")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission without submitter with form mode optin and form not enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.press("#form-without-submitter [type=text]", "Enter")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission with form mode optin and form not enabled from submitter outside form", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("button[form=form]")

  assert.notOk(await formSubmitStarted(page))
})

test("form submission with form mode optin and form enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("#turbo-enabled-form button")

  assert.ok(await formSubmitStarted(page))
})

test("form submission without submitter with form mode optin and form enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.press("#turbo-enabled-form-without-submitter [type=text]", "Enter")

  assert.ok(await formSubmitStarted(page))
})

test("form submission with form mode optin and form enabled from submitter outside form", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("button[form=turbo-enabled-form]")

  assert.ok(await formSubmitStarted(page))
})

async function gotoPageWithFormMode(page, formMode) {
  await page.goto(`/src/tests/fixtures/form_mode.html?formMode=${formMode}`)
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitStarted", "true")
}

function formSubmitStarted(page) {
  return getFromLocalStorage(page, "formSubmitStarted")
}
