import { expect, test } from "@playwright/test"
import { getFromLocalStorage, setLocalStorageFromEvent } from "../helpers/page"

test("form submission with form mode off", async ({ page }) => {
  await gotoPageWithFormMode(page, "off")
  await page.click("#turbo-enabled-form button")

  expect(await formSubmitStarted(page)).not.toBeTruthy()
})

test("form submission without submitter with form mode off", async ({ page }) => {
  await gotoPageWithFormMode(page, "off")
  await page.press("#turbo-enabled-form-without-submitter [type=text]", "Enter")

  expect(await formSubmitStarted(page)).not.toBeTruthy()
})

test("form submission with form mode off from submitter outside form", async ({ page }) => {
  await gotoPageWithFormMode(page, "off")
  await page.click("button[form=turbo-enabled-form]")

  expect(await formSubmitStarted(page)).not.toBeTruthy()
})

test("form submission with form mode optin and form not enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("#form button")

  expect(await formSubmitStarted(page)).not.toBeTruthy()
})

test("form submission without submitter with form mode optin and form not enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.press("#form-without-submitter [type=text]", "Enter")

  expect(await formSubmitStarted(page)).not.toBeTruthy()
})

test("form submission with form mode optin and form not enabled from submitter outside form", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("button[form=form]")

  expect(await formSubmitStarted(page)).not.toBeTruthy()
})

test("form submission with form mode optin and form enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("#turbo-enabled-form button")

  expect(await formSubmitStarted(page)).toBeTruthy()
})

test("form submission without submitter with form mode optin and form enabled", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.press("#turbo-enabled-form-without-submitter [type=text]", "Enter")

  expect(await formSubmitStarted(page)).toBeTruthy()
})

test("form submission with form mode optin and form enabled from submitter outside form", async ({ page }) => {
  await gotoPageWithFormMode(page, "optin")
  await page.click("button[form=turbo-enabled-form]")

  expect(await formSubmitStarted(page)).toBeTruthy()
})

async function gotoPageWithFormMode(page, formMode) {
  await page.goto(`/src/tests/fixtures/form_mode.html?formMode=${formMode}`)
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitStarted", "true")
}

function formSubmitStarted(page) {
  return getFromLocalStorage(page, "formSubmitStarted")
}
