import { expect, test } from "@playwright/test"

const framePath = "/src/tests/fixtures/frames/frame.html"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/frames.html")
  await page.evaluate(() => {
    window.frameSnapshotDocument = document
    window.frameSnapshotStarts = 0
    window.frameSnapshotEnds = 0
    addEventListener("turbo:submit-start", () => window.frameSnapshotStarts++)
    addEventListener("turbo:submit-end", () => window.frameSnapshotEnds++)
  })
})

test("Back restores an idle page after an external GET form advances a frame", async ({ page }) => {
  const location = page.url()
  const formId = "form-get-frame-action-advance"
  await prepareForm(page, formId, "Before GET submission")

  await page.click(`#${formId} button`)

  await restoreOriginalPage(page, location, "Before GET submission", formId)
})

test("Back restores an idle page after replacing an in-flight POST submission", async ({ page }) => {
  const location = page.url()
  const formId = "form-post-frame-action-advance"
  await prepareForm(page, formId, "Before POST submissions")
  const held = await holdNextPost(page)

  try {
    await page.click(`#${formId} button`)
    const firstRequest = await held.arrived
    await page.waitForFunction(() => window.frameSnapshotStarts === 1)
    await expect(page.locator(`#${formId} button`)).toBeDisabled()
    await expect(page.locator(`#${formId}`)).toHaveAttribute("aria-busy", "true")
    const canceled = page.waitForEvent("requestfailed", (request) => request === firstRequest)

    await page.locator(`#${formId}`).evaluate((form) => form.requestSubmit())
    await canceled
    held.release()

    await expect.poll(() => page.evaluate(() => window.frameSnapshotStarts)).toEqual(2)
    await restoreOriginalPage(page, location, "Before POST submissions", formId, 2)
  } finally {
    held.release()
    await held.finished
  }
})

test("Back restores the accepted state after declining an earlier confirmation", async ({ page }) => {
  const location = page.url()
  const formId = "form-get-frame-action-advance"
  await prepareForm(page, formId, "Before declined confirmation")
  await deferConfirmation(page, formId)
  await page.click(`#${formId} button`)
  await page.waitForFunction(() => window.frameConfirmations === 1)

  await page.evaluate(() => {
    document.querySelector("h1").textContent = "Changed while declining"
    window.answerFrameConfirmation(false)
  })
  await page.waitForFunction(() => window.frameConfirmationsResolved === 1)
  expect(await page.evaluate(() => window.frameSnapshotStarts)).toEqual(0)
  await expectIdlePage(page, formId)

  await page.locator("h1").evaluate((heading) => heading.textContent = "Before accepted confirmation")
  await page.click(`#${formId} button`)
  await page.waitForFunction(() => window.frameConfirmations === 2)
  await page.evaluate(() => {
    document.querySelector("h1").textContent = "Accepted client state"
    document.body.setAttribute("data-accepted-state", "changed")
    window.answerFrameConfirmation(true)
  })

  await restoreOriginalPage(page, location, "Accepted client state", formId)
  await expect(page.locator("body")).toHaveAttribute("data-accepted-state", "changed")
})

test("Back restores a clean snapshot through a pending reentrant confirmation", async ({ page }) => {
  const location = page.url()
  const formId = "form-post-frame-action-advance"
  await prepareForm(page, formId, "Before reentrant submissions")
  await deferConfirmation(page, formId)
  await page.locator(`#${formId}`).evaluate((form) => {
    form.removeAttribute("data-turbo-confirm")
    form.addEventListener("turbo:submit-start", () => {
      form.setAttribute("data-turbo-confirm", "Continue?")
      form.requestSubmit()
      form.removeAttribute("data-turbo-confirm")
      form.requestSubmit()
    }, { once: true })
  })
  const held = await holdNextPost(page)

  try {
    await page.locator(`#${formId}`).evaluate((form) => form.requestSubmit(form.querySelector("button")))
    await expect.poll(() => page.evaluate(() => window.frameSnapshotStarts)).toEqual(2)
    expect(await page.evaluate(() => window.frameConfirmations)).toEqual(1)
    expect(await page.evaluate(() => window.frameConfirmationsResolved)).toEqual(0)
    const request = await held.arrived
    expect(request.headers()["turbo-frame"]).toEqual("frame")
    held.release()

    await restoreOriginalPage(page, location, "Before reentrant submissions", formId, 2)
  } finally {
    held.release()
    await held.finished
    if (!page.isClosed()) await page.evaluate(() => window.answerFrameConfirmation?.(false))
  }
})

test("accepting a submission after its permanent frame moves does not promote the replacement page", async ({ page }) => {
  const formId = "form-post-frame-action-advance"
  const destination = "/src/tests/fixtures/frames/permanent_drive.html"
  await prepareForm(page, formId, "Before moving the frame")
  await page.evaluate((formId) => {
    const frame = document.getElementById("frame")
    frame.setAttribute("data-turbo-permanent", "")
    frame.append(document.getElementById(formId))
    window.confirmingFrame = frame
  }, formId)
  await deferConfirmation(page, formId)
  await page.click(`#${formId} button`)
  await page.waitForFunction(() => window.frameConfirmations === 1)

  await page.evaluate((path) => {
    window.replacementPageReady = false
    addEventListener("turbo:load", ({ detail }) => {
      if (new URL(detail.url).pathname === path) window.replacementPageReady = true
    })
    window.Turbo.visit(path)
  }, destination)
  await page.waitForFunction(() => window.replacementPageReady)
  await expect(page.locator("h1")).toHaveText("One")
  expect(await page.evaluate(() => document.getElementById("frame") === window.confirmingFrame)).toEqual(true)
  await page.evaluate(() => {
    window.replacementBody = document.body
    window.lateFrameVisits = []
    window.lateFrameLoads = []
    window.confirmedFrameRendered = false
    addEventListener("turbo:visit", ({ detail }) => window.lateFrameVisits.push(detail.url))
    addEventListener("turbo:load", ({ detail }) => window.lateFrameLoads.push(detail.url))
    document.getElementById("frame").addEventListener("turbo:frame-load", () => {
      window.confirmedFrameRendered = true
    }, { once: true })
    window.answerFrameConfirmation(true)
  })

  await page.waitForFunction(() => window.confirmedFrameRendered && window.frameSnapshotEnds === 1)
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL((url) => url.pathname === destination)
  await expect(page.locator("h1")).toHaveText("One")
  expect(await page.evaluate(() => window.replacementBody === document.body)).toEqual(true)
  expect(await page.evaluate(() => window.frameSnapshotDocument === document)).toEqual(true)
  expect(await page.evaluate(() => window.lateFrameVisits)).toEqual([])
  expect(await page.evaluate(() => window.lateFrameLoads)).toEqual([])
})

function prepareForm(page, formId, heading) {
  return page.evaluate(({ formId, heading }) => {
    document.querySelector("h1").textContent = heading
    document.getElementById(formId).removeAttribute("data-turbo-action")
    document.getElementById("frame").setAttribute("data-turbo-action", "advance")
  }, { formId, heading })
}

async function restoreOriginalPage(page, location, heading, formId, submissionCount = 1) {
  await expect(page).toHaveURL((url) => url.pathname === framePath)
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await page.waitForFunction((count) => window.frameSnapshotEnds === count, submissionCount)
  await expect.poll(() => page.evaluate((location) => {
    const snapshot = window.Turbo.session.view.snapshotCache.get(new URL(location))
    return snapshot?.element.querySelector("h1")?.textContent
  }, location)).toEqual(heading)

  await page.goBack()

  await expect(page).toHaveURL(location)
  await expect(page.locator("h1")).toHaveText(heading)
  await expect(page.locator("#frame h2")).toHaveText("Frames: #frame")
  expect(await page.evaluate(() => window.frameSnapshotDocument === document)).toEqual(true)
  await expectIdlePage(page, formId)
}

async function expectIdlePage(page, formId) {
  await expect(page.locator("#frame")).not.toHaveAttribute("busy")
  await expect(page.locator("#frame")).not.toHaveAttribute("aria-busy")
  await expect(page.locator(`#${formId}`)).not.toHaveAttribute("aria-busy")
  await expect(page.locator(`#${formId} button`)).toBeEnabled()
}

async function holdNextPost(page) {
  let release
  const gate = new Promise((resolve) => (release = resolve))
  let arrive
  const arrived = new Promise((resolve) => (arrive = resolve))
  let held = false
  let finished = Promise.resolve()
  await page.route("**/__turbo/redirect", async (route) => {
    const request = route.request()
    if (request.method() === "POST" && !held) {
      held = true
      finished = (async () => {
        await gate
        if (!request.failure()) await route.continue()
      })()
      arrive(request)
      await finished
    } else {
      await route.continue()
    }
  })
  return { arrived, release, get finished() { return finished } }
}

function deferConfirmation(page, formId) {
  return page.evaluate((formId) => {
    document.getElementById(formId).setAttribute("data-turbo-confirm", "Continue?")
    window.frameConfirmations = 0
    window.frameConfirmationsResolved = 0
    window.Turbo.config.forms.confirm = async () => {
      window.frameConfirmations++
      const answer = await new Promise((resolve) => (window.answerFrameConfirmation = resolve))
      window.frameConfirmationsResolved++
      return answer
    }
  }, formId)
}
