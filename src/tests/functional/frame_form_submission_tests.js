import { expect, test } from "@playwright/test"

const heldRequests = new WeakMap()
const pageErrors = new WeakMap()

test.beforeEach(async ({ page }) => {
  pageErrors.set(page, [])
  page.on("pageerror", (error) => pageErrors.get(page).push(error.message))
  await page.goto("/src/tests/fixtures/frames/form_submission_lifecycle.html")
  await page.evaluate(() => {
    window.frameFormEvents = []
    window.frameFormSubmissions = new Map()
    for (const type of ["turbo:before-fetch-request", "turbo:submit-start", "turbo:submit-end"]) {
      addEventListener(type, (event) => {
        const { formSubmission } = event.detail
        const formId = formSubmission?.formElement.id || event.target.id
        window.frameFormEvents.push([type, formId])
        if (formSubmission) window.frameFormSubmissions.set(formId, formSubmission)
      })
    }
  })
})

test.afterEach(async ({ page }) => {
  const requests = heldRequests.get(page) || []
  for (const request of requests) request.release()
  await Promise.all(requests.map((request) => request.finished))
  expect(pageErrors.get(page)).toEqual([])
})

for (const formId of ["external-form", "form-a"]) {
  test(`removing the destination cancels the GET submitted by ${formId}`, async ({ page }) => {
    const gate = await holdRequests(page)
    await submitForm(page, formId)
    await gate.arrived
    const [held] = gate.requests
    const failed = page.waitForEvent("requestfailed", (request) => request === held.request)

    await page.locator("#destination").evaluate((frame) => frame.remove())

    expect(await submissionAborted(page, formId)).toEqual(true)
    await failed
    await submissionEnded(page, formId)
    await expect(page).toHaveURL(/\/frames\/form_submission_lifecycle\.html$/)
  })
}

test("removing the source preserves a GET aimed at another connected frame", async ({ page }) => {
  const gate = await holdRequests(page)
  await submitForm(page, "form-a")
  await gate.arrived

  await page.locator("#source-a").evaluate((frame) => frame.remove())

  expect(await submissionAborted(page, "form-a")).toEqual(false)
  gate.requests[0].release()
  await expect(page.locator("#destination")).toHaveText("Updated destination")
  await submissionEnded(page, "form-a")
})

test("removing the destination cancels GET submissions from both source frames", async ({ page }) => {
  const gate = await holdRequests(page, 2)
  await submitForm(page, "form-a")
  await submitForm(page, "form-c")
  await gate.arrived
  const failures = gate.requests.map(({ request }) => page.waitForEvent("requestfailed", (failed) => failed === request))

  await page.locator("#destination").evaluate((frame) => frame.remove())

  expect(await submissionAborted(page, "form-a")).toEqual(true)
  expect(await submissionAborted(page, "form-c")).toEqual(true)
  await Promise.all(failures)
  await submissionEnded(page, "form-a")
  await submissionEnded(page, "form-c")
})

test("finishing one GET does not unregister another source's pending submission", async ({ page }) => {
  const gate = await holdRequests(page, 2)
  await submitForm(page, "form-a")
  await submitForm(page, "form-c")
  await gate.arrived
  const first = gate.requests.find(({ request }) => new URL(request.url()).searchParams.get("source") === "a")
  const second = gate.requests.find(({ request }) => new URL(request.url()).searchParams.get("source") === "c")
  first.release()
  await submissionEnded(page, "form-a")
  await expect(page.locator("#destination")).toHaveText("Updated destination")
  const failed = page.waitForEvent("requestfailed", (request) => request === second.request)

  await page.locator("#destination").evaluate((frame) => frame.remove())

  expect(await submissionAborted(page, "form-c")).toEqual(true)
  await failed
  await submissionEnded(page, "form-c")
})

test("declining confirmation does not start a frame form submission", async ({ page }) => {
  await deferConfirmation(page)
  await submitForm(page, "form-a")
  await page.waitForFunction(() => window.confirmationAsked)

  await page.evaluate(() => window.answerConfirmation(false))
  await page.waitForFunction(() => window.confirmationResolved)
  await page.locator("#destination").evaluate((frame) => frame.remove())

  expect(await page.evaluate(() => window.frameFormEvents)).toEqual([])
})

test("removing the destination while confirming prevents the accepted GET from starting", async ({ page }) => {
  await deferConfirmation(page)
  await submitForm(page, "form-a")
  await page.waitForFunction(() => window.confirmationAsked)

  await page.locator("#destination").evaluate((frame) => frame.remove())
  await page.evaluate(() => window.answerConfirmation(true))
  await page.waitForFunction(() => window.confirmationResolved)

  expect(await page.evaluate(() => window.frameFormEvents)).toEqual([])
})

test("removing the destination preserves a POST Turbo Stream response", async ({ page }) => {
  const gate = await holdRequests(page, 1, "**/__turbo/messages")
  await submitForm(page, "post-form")
  await gate.arrived

  await page.locator("#destination").evaluate((frame) => frame.remove())

  expect(await submissionAborted(page, "post-form")).toEqual(false)
  gate.requests[0].release()
  await expect(page.locator("#messages .message")).toHaveText("POST applied")
  await submissionEnded(page, "post-form")
})

test("moving the connected destination atomically preserves its GET submission", async ({ page }) => {
  const gate = await holdRequests(page)
  await submitForm(page, "form-a")
  await gate.arrived

  await page.locator("#destination").evaluate((frame) => document.getElementById("moved-frames").append(frame))

  expect(await submissionAborted(page, "form-a")).toEqual(false)
  gate.requests[0].release()
  await expect(page.locator("#moved-frames #destination")).toHaveText("Updated destination")
  await submissionEnded(page, "form-a")
})

test("removing a destination with recurse preserves its GET submission", async ({ page }) => {
  const gate = await holdRequests(page)
  await page.locator("#destination").evaluate((frame) => frame.setAttribute("recurse", "nested"))
  await submitForm(page, "external-form")
  await gate.arrived

  await page.locator("#destination").evaluate((frame) => {
    window.detachedDestination = frame
    frame.remove()
  })

  expect(await submissionAborted(page, "external-form")).toEqual(false)
  gate.requests[0].release()
  await page.waitForFunction(() => window.detachedDestination.textContent.includes("Updated destination"))
  await submissionEnded(page, "external-form")
})

async function holdRequests(page, count = 1, pattern = "**/frames/form_submission_target.html?*") {
  const requests = []
  heldRequests.set(page, requests)
  let arrived
  const allArrived = new Promise((resolve) => arrived = resolve)
  await page.route(pattern, async (route) => {
    let release
    const gate = new Promise((resolve) => release = resolve)
    const request = route.request()
    const held = { request, release }
    held.finished = (async () => {
      await gate
      if (!request.failure()) await route.continue()
    })()
    requests.push(held)
    if (requests.length === count) arrived()
    await held.finished
  })

  return { requests, arrived: allArrived }
}

async function submitForm(page, id) {
  await page.locator(`#${id}`).evaluate((form) => form.requestSubmit())
}

async function submissionAborted(page, id) {
  return page.evaluate((id) => window.frameFormSubmissions.get(id).fetchRequest.abortSignal.aborted, id)
}

async function submissionEnded(page, id) {
  await page.waitForFunction((id) => window.frameFormEvents.some(([type, formId]) => type === "turbo:submit-end" && formId === id), id)
}

async function deferConfirmation(page) {
  await page.locator("#form-a").evaluate((form) => form.setAttribute("data-turbo-confirm", "Continue?"))
  await page.evaluate(() => {
    const answer = new Promise((resolve) => window.answerConfirmation = resolve)
    window.Turbo.config.forms.confirm = async () => {
      window.confirmationAsked = true
      const result = await answer
      window.confirmationResolved = true
      return result
    }
  })
}
