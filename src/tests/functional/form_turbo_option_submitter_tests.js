import { expect, test } from "@playwright/test"
import { getFromLocalStorage, setLocalStorageFromEvent } from "../helpers/page"

const pageErrors = new WeakMap()

test.beforeEach(async ({ page }) => {
  const errors = []
  pageErrors.set(page, errors)
  page.on("pageerror", (error) => errors.push(error.message))

  await page.goto("/src/tests/fixtures/form_turbo_optin_submitter.html")
  await setLocalStorageFromEvent(page, "turbo:submit-start", "formSubmitStarted", "true")
  await setLocalStorageFromEvent(page, "turbo:submit-end", "formSubmitEnded", "true")
  await page.evaluate(() => window.associatedFormDocument = document)
})

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([])
})

test("allows submitting an associated data-turbo=true form without data-turbo=true on submitter", async ({ page }) => {
  await setFormMode(page, "on")
  await expectSubmission(page, () => page.click("#default-behavior-submit"), true)
})

test("prevents submitting an associated data-turbo=true form when explicitly opted out", async ({ page }) => {
  await setFormMode(page, "on")
  await expectSubmission(page, () => page.click("#opted-out-submit"), false)
})

test("an associated submitter respects form mode off", async ({ page }) => {
  await setFormMode(page, "off")
  await expectSubmission(page, () => page.click("#default-behavior-submit"), false)
})

test("an associated submitter uses an enabled form in optin mode", async ({ page }) => {
  await setFormMode(page, "optin")
  await expectSubmission(page, () => page.click("#default-behavior-submit"), true)
})

test("an explicitly opted-out associated submitter stays native in off mode", async ({ page }) => {
  await setFormMode(page, "off")
  await expectSubmission(page, () => page.click("#opted-out-submit"), false)
})

test("an explicitly opted-out associated submitter stays native in optin mode", async ({ page }) => {
  await setFormMode(page, "optin")
  await expectSubmission(page, () => page.click("#opted-out-submit"), false)
})

test("requestSubmit without a submitter uses an enabled form in on mode", async ({ page }) => {
  await setFormMode(page, "on")
  await expectSubmission(page, () => page.locator("#optin-form").evaluate((form) => form.requestSubmit()), true)
})

test("requestSubmit without a submitter respects form mode off", async ({ page }) => {
  await setFormMode(page, "off")
  await expectSubmission(page, () => page.locator("#optin-form").evaluate((form) => form.requestSubmit()), false)
})

test("requestSubmit without a submitter uses an enabled form in optin mode", async ({ page }) => {
  await setFormMode(page, "optin")
  await expectSubmission(page, () => page.locator("#optin-form").evaluate((form) => form.requestSubmit()), true)
})

test("an associated submitter does not opt an unannotated form into optin mode", async ({ page }) => {
  await setFormMode(page, "optin")
  await page.evaluate(() => {
    document.body.removeAttribute("data-turbo")
    document.getElementById("optin-form").removeAttribute("data-turbo")
  })
  await expectSubmission(page, () => page.click("#default-behavior-submit"), false)
})

test("an enabled associated submitter does not enable a disabled form", async ({ page }) => {
  await setFormMode(page, "on")
  await page.evaluate(() => {
    document.getElementById("optin-form").setAttribute("data-turbo", "false")
    document.getElementById("default-behavior-submit").setAttribute("data-turbo", "true")
  })
  await expectSubmission(page, () => page.click("#default-behavior-submit"), false)
})

test("a descendant submitter still respects its disabled ancestor", async ({ page }) => {
  await setFormMode(page, "on")
  await expectSubmission(page, () => page.click("#disabled-descendant-submit"), false)
})

test("a submitter with a form attribute uses that form inside a disabled container", async ({ page }) => {
  await setFormMode(page, "on")
  await page.locator("#default-behavior-submit").evaluate((button) => {
    document.getElementById("disabled-descendant-submit").parentElement.append(button)
  })
  await expectSubmission(page, () => page.click("#default-behavior-submit"), true)
})

test("an external associated submitter updates its form's frame instead of driving the page", async ({ page }) => {
  const sourceURL = page.url()
  await page.evaluate(() => {
    const form = document.getElementById("optin-form")
    const frame = document.createElement("turbo-frame")
    frame.id = "frame"
    form.before(frame)
    frame.append(form)
    form.method = "get"
    form.action = "/src/tests/fixtures/frames/frame.html"
  })

  const [request] = await Promise.all([
    page.waitForRequest((request) => new URL(request.url()).pathname === "/src/tests/fixtures/frames/frame.html"),
    page.click("#default-behavior-submit")
  ])

  expect(request.headers()["turbo-frame"]).toEqual("frame")
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await expect(page.locator("h1")).toHaveText("Associated form")
  await expect(page).toHaveURL(sourceURL)
  expect(await page.evaluate(() => window.associatedFormDocument === document)).toEqual(true)
  await expect.poll(() => getFromLocalStorage(page, "formSubmitStarted")).toBe("true")
  await expect.poll(() => getFromLocalStorage(page, "formSubmitEnded")).toBe("true")
})

async function setFormMode(page, mode) {
  await page.evaluate((mode) => window.Turbo.config.forms.mode = mode, mode)
}

async function expectSubmission(page, submit, turbo) {
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/src/tests/fixtures/form.html", { waitUntil: "load" }),
    submit()
  ])
  await expect(page.locator("h1")).toHaveText("Form")

  if (turbo) {
    await expect.poll(() => getFromLocalStorage(page, "formSubmitStarted")).toBe("true")
    await expect.poll(() => getFromLocalStorage(page, "formSubmitEnded")).toBe("true")
  } else {
    expect(await getFromLocalStorage(page, "formSubmitStarted")).toBeNull()
    expect(await getFromLocalStorage(page, "formSubmitEnded")).toBeNull()
  }
  expect(await page.evaluate(() => window.associatedFormDocument === document)).toEqual(turbo)
}
