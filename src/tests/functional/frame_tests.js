import { test, expect } from "@playwright/test"
import {
  attributeForSelector,
  listenForEventOnTarget,
  nextAttributeMutationNamed,
  noNextAttributeMutationNamed,
  nextBeat,
  nextEventNamed,
  nextEventOnTarget,
  noNextEventNamed,
  noNextEventOnTarget,
  pathname,
  propertyForSelector,
  readEventLogs,
  scrollPosition,
  scrollToSelector,
  withPathname,
  withSearchParam
} from "../helpers/page"

test.beforeEach(async ({ page }) => {
  await page.goto("/src/tests/fixtures/frames.html")
  await readEventLogs(page)
})

test("navigating a frame with Turbo.visit", async ({ page }) => {
  const pathname = "/src/tests/fixtures/frames/frame.html"

  await page.locator("#frame").evaluate((frame) => frame.setAttribute("disabled", ""))
  await page.evaluate((pathname) => window.Turbo.visit(pathname, { frame: "frame" }), pathname)

  await expect(page.locator("#frame h2"), "does not navigate a disabled frame").toHaveText("Frames: #frame")

  await page.locator("#frame").evaluate((frame) => frame.removeAttribute("disabled"))
  await page.evaluate((pathname) => window.Turbo.visit(pathname, { frame: "frame" }), pathname)

  await expect(page.locator("#frame h2"), "navigates the target frame").toHaveText("Frame: Loaded")
})

test("navigating a frame a second time does not leak event listeners", async ({ page }) => {
  await withoutChangingEventListenersCount(page, async () => {
    await page.click("#outer-frame-link")
    await nextEventOnTarget(page, "frame", "turbo:frame-load")
    await page.click("#outside-frame-form")
    await nextEventOnTarget(page, "frame", "turbo:frame-load")
    await page.click("#outer-frame-link")
    await nextEventOnTarget(page, "frame", "turbo:frame-load")
  })
})

test("following a link preserves the current <turbo-frame> element's attributes", async ({ page }) => {
  const currentPath = pathname(page.url())

  await page.click("#hello a")

  const frame = page.locator("turbo-frame#frame")
  await expect(frame).toHaveAttribute("data-loaded-from", currentPath)
  await expect(frame).toHaveAttribute("src", await propertyForSelector(page, "#hello a", "href"))
})

test("following a link sets the frame element's [src]", async ({ page }) => {
  await page.click("#link-frame-with-search-params")

  const { url } = await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  const fetchRequestUrl = new URL(url)

  expect(fetchRequestUrl.pathname).toEqual("/src/tests/fixtures/frames/frame.html")
  expect(fetchRequestUrl.searchParams.get("key"), "fetch request encodes query parameters").toEqual("value")

  await nextBeat()
  const src = new URL((await attributeForSelector(page, "#frame", "src")) || "")

  expect(src.pathname).toEqual("/src/tests/fixtures/frames/frame.html")
  expect(src.searchParams.get("key"), "[src] attribute encodes query parameters").toEqual("value")
})

test("following a link doesn't set the frame element's [src] if the link has [data-turbo-stream]", async ({ page }) => {
  await page.goto("/src/tests/fixtures/form.html")

  const originalSrc = await page.getAttribute("#frame", "src")

  await page.click("#stream-link-get-method-inside-frame")
  await nextBeat()

  const newSrc = await page.getAttribute("#frame", "src")

  expect(originalSrc, "the turbo-frame src should not change after clicking the link").toEqual(newSrc)
})

test("a frame whose src references itself does not infinitely loop", async ({ page }) => {
  await page.click("#frame-self")

  await nextEventOnTarget(page, "frame", "turbo:frame-render")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)
})

test("following a link driving a frame toggles the [aria-busy=true] attribute", async ({ page }) => {
  await page.click("#hello a")

  expect(await nextAttributeMutationNamed(page, "frame", "busy"), "sets [busy] on the #frame").toEqual("")
  expect(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "sets [aria-busy=true] on the #frame"
  ).toEqual(
    "true"
  )
  expect(await nextAttributeMutationNamed(page, "frame", "busy"), "removes [busy] on the #frame").toEqual(null)
  expect(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "removes [aria-busy] from the #frame"
  ).toEqual(
    null
  )
})

test("following an a[data-turbo-frame=_top] does not toggle the frame's [aria-busy=true] attribute", async ({
  page
}) => {
  await page.click("#frame #link-top")

  expect(await noNextAttributeMutationNamed(page, "frame", "busy"), "does not toggle [busy] on parent frame").toBeTruthy()
  expect(
    await noNextAttributeMutationNamed(page, "frame", "aria-busy"),
    "does not toggle [aria-busy=true] on parent frame"
  ).toBeTruthy()
})

test("submitting a form[data-turbo-frame=_top] does not toggle the frame's [aria-busy=true] attribute", async ({
  page
}) => {
  await page.click("#frame #form-submit-top")

  expect(await noNextAttributeMutationNamed(page, "frame", "busy"), "does not toggle [busy] on parent frame").toBeTruthy()
  expect(
    await noNextAttributeMutationNamed(page, "frame", "aria-busy"),
    "does not toggle [aria-busy=true] on parent frame"
  ).toBeTruthy()
})

test("successfully following a link to a page without a matching frame dispatches a turbo:frame-missing event", async ({
  page
}) => {
  await page.click("#missing-frame-link")
  const { response } = await nextEventOnTarget(page, "missing", "turbo:frame-missing")

  expect(response.status).toEqual(200)
})

test("successfully following a link to a page without a matching frame shows an error and throws an exception", async ({
  page
}) => {
  let error = undefined
  page.once("pageerror", (e) => (error = e))

  await page.click("#missing-frame-link")

  await expect(page.locator("#missing")).toHaveText("Content missing")

  expect(error).toBeTruthy()
  expect(error.message).toContain(`The response (200) did not contain the expected <turbo-frame id="missing">`)
})

test("successfully following a link to a page with `turbo-visit-control` `reload` performs a full page reload", async ({
  page
}) => {
  await page.click("#unvisitable-page-link")
  await page.getByText("Unvisitable page loaded").waitFor()

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/unvisitable.html"))
})

test("failing to follow a link to a page without a matching frame dispatches a turbo:frame-missing event", async ({
  page
}) => {
  await page.click("#missing-page-link")
  const { response } = await nextEventOnTarget(page, "missing", "turbo:frame-missing")

  expect(response.status).toEqual(404)
})

test("failing to follow a link to a page without a matching frame shows an error and throws an exception", async ({
  page
}) => {
  let error = undefined
  page.once("pageerror", (e) => (error = e))

  await page.click("#missing-page-link")

  await expect(page.locator("#missing")).toHaveText("Content missing")

  expect(error).toBeTruthy()
  expect(error.message).toContain(`The response (404) did not contain the expected <turbo-frame id="missing">`)
})

test("the turbo:frame-missing event following a link to a page without a matching frame can be handled", async ({
  page
}) => {
  await page.locator("#missing").evaluate((frame) => {
    frame.addEventListener(
      "turbo:frame-missing",
      (event) => {
        if (event.target instanceof Element) {
          event.preventDefault()
          event.target.textContent = "Overridden"
        }
      },
      { once: true }
    )
  })
  await page.click("#missing-frame-link")
  await nextEventOnTarget(page, "missing", "turbo:frame-missing")

  await expect(page.locator("#missing")).toHaveText("Overridden")
})

test("the turbo:frame-missing event following a link to a page without a matching frame can drive a Visit", async ({
  page
}) => {
  await page.locator("#missing").evaluate((frame) => {
    frame.addEventListener(
      "turbo:frame-missing",
      (event) => {
        event.preventDefault()
        const { response, visit } = event.detail

        visit(response)
      },
      { once: true }
    )
  })
  await page.click("#missing-frame-link")
  await nextEventOnTarget(page, "missing", "turbo:frame-missing")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Frames: #frame")
  await expect(page.locator("turbo-frame#missing")).not.toBeAttached()

  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames.html"))
  await expect(page.locator("turbo-frame#missing")).toBeAttached()
})

test("following a link to a page with a matching frame does not dispatch a turbo:frame-missing event", async ({
  page
}) => {
  await page.click("#link-frame")

  expect(await noNextEventNamed(page, "turbo:frame-missing")).toBeTruthy()

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const src = await attributeForSelector(page, "#frame", "src")
  expect(
    src,
    "navigates frame without dispatching turbo:frame-missing"
  ).toContain(
    "/src/tests/fixtures/frames/frame.html"
  )
})

test("following a link within a frame which has a target set navigates the target frame without morphing even when frame[refresh=morph]", async ({ page }) => {
  await page.click("#add-refresh-morph-to-frame")
  await page.click("#hello a")
  await nextBeat()

  expect(await nextEventOnTarget(page, "frame", "turbo:before-frame-render")).toBeTruthy()
  expect(await noNextEventOnTarget(page, "frame", "turbo:before-frame-morph")).toBeTruthy()
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
})

test("navigating from within replaces the contents even with turbo-frame[refresh=morph]", async ({ page }) => {
  await page.click("#add-refresh-morph-to-frame")
  await page.click("#link-frame")
  await nextBeat()

  expect(await nextEventOnTarget(page, "frame", "turbo:before-frame-render")).toBeTruthy()
  expect(await noNextEventOnTarget(page, "frame", "turbo:before-frame-morph")).toBeTruthy()
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
})

test("calling reload on a frame replaces the contents", async ({ page }) => {
  await page.click("#add-src-to-frame")

  await page.evaluate(() => document.getElementById("frame").reload())

  expect(await nextEventOnTarget(page, "frame", "turbo:before-frame-render")).toBeTruthy()
  expect(await noNextEventOnTarget(page, "frame", "turbo:before-frame-morph")).toBeTruthy()
})

test("calling reload on a frame[refresh=morph] morphs the contents", async ({ page }) => {
  await page.click("#add-src-to-frame")
  await page.click("#add-refresh-morph-to-frame")

  await page.evaluate(() => document.getElementById("frame").reload())

  expect(await nextEventOnTarget(page, "frame", "turbo:before-frame-render")).toBeTruthy()
  expect(await nextEventOnTarget(page, "frame", "turbo:before-frame-morph")).toBeTruthy()
})

test("calling reload on a frame[refresh=morph] reloads descendant frame[refresh=morph]s via reload() as well", async ({ page }) => {
  await page.click("#nested-root #add-refresh-morph-to-frame")
  await page.click("#nested-root #add-src-to-frame")
  await page.click("#nested-child #add-refresh-morph-to-frame")
  await page.click("#nested-child #add-src-to-frame")
  await page.click("#nested-child-navigate-top #add-src-to-frame")

  await page.evaluate(() => document.getElementById("nested-root").reload())

  // Only the frames marked with refresh="morph" uses morphing
  expect(await nextEventOnTarget(page, "nested-root", "turbo:before-frame-morph")).toBeTruthy()
  expect(await nextEventOnTarget(page, "nested-child", "turbo:before-frame-morph")).toBeTruthy()
  expect(await noNextEventOnTarget(page, "nested-child-navigate-top", "turbo:before-frame-morph")).toBeTruthy()
})

test("calling reload on a frame[refresh=morph] preserves [data-turbo-permanent] elements", async ({ page }) => {
  await page.click("#add-src-to-frame")
  await page.click("#add-refresh-morph-to-frame")
  const input = await page.locator("#permanent-input")

  await input.fill("Preserve me")
  await page.evaluate(() => document.getElementById("frame").reload())

  await expect(input).toBeFocused()
  await expect(input).toHaveValue("Preserve me")
})

test("following a link in rapid succession cancels the previous request", async ({ page }) => {
  await page.click("#outside-frame-form")
  await page.click("#outer-frame-link")

  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
})

test("following a link within a descendant frame whose ancestor declares a target set navigates the descendant frame", async ({
  page
}) => {
  const selector = "#nested-root[target=frame] #nested-child a:not([data-turbo-frame])"
  const link = await page.locator(selector)
  const href = await propertyForSelector(page, selector, "href")

  await link.click()

  await expect(page.locator("#frame h2")).toHaveText("Frames: #frame")
  await expect(page.locator("#nested-root > h2")).toHaveText("Frames: #nested-root")
  await expect(page.locator("#nested-child")).toHaveText("Frame: Loaded")
  await expect(page.locator("#frame")).not.toHaveAttribute("src")
  await expect(page.locator("#nested-root")).not.toHaveAttribute("src")
  await expect(page.locator("#nested-child")).toHaveAttribute("src", href)
})

test("following a link that declares data-turbo-frame within a frame whose ancestor respects the override", async ({
  page
}) => {
  await page.click("#nested-root[target=frame] #nested-child a[data-turbo-frame]")

  await expect(page.locator("body > h1")).toHaveText("One")
  await expect(page.locator("#frame")).not.toBeAttached()
  await expect(page.locator("#nested-root")).not.toBeAttached()
  await expect(page.locator("#nested-child")).not.toBeAttached()
})

test("following a form within a nested frame with form target top", async ({ page }) => {
  await page.click("#nested-child-navigate-form-top-submit")

  await expect(page.locator("body > h1")).toHaveText("One")
  await expect(page.locator("#frame")).not.toBeAttached()
  await expect(page.locator("#nested-root")).not.toBeAttached()
  await expect(page.locator("#nested-child")).not.toBeAttached()
})

test("following a form within a nested frame with child frame target top", async ({ page }) => {
  await page.click("#nested-child-navigate-top-submit")

  await expect(page.locator("body > h1")).toHaveText("One")
  await expect(page.locator("#frame")).not.toBeAttached()
  await expect(page.locator("#nested-root")).not.toBeAttached()
  await expect(page.locator("#nested-child-navigate-top")).not.toBeAttached()
})

test("following a link within a frame with target=_top navigates the page", async ({ page }) => {
  await expect(page.locator("#navigate-top")).not.toHaveAttribute("src")

  await page.click("#navigate-top a:not([data-turbo-frame])")

  await expect(page.locator("body > h1")).toHaveText("One")
  await expect(page.locator("#navigate-top a")).not.toBeAttached()
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/one.html"))
  await expect(page).toHaveURL(withSearchParam("key", "value"))
})

test("following a link that declares data-turbo-frame='_self' within a frame with target=_top navigates the frame itself", async ({
  page
}) => {
  await expect(page.locator("#navigate-top")).not.toHaveAttribute("src")

  await page.click("#navigate-top a[data-turbo-frame='_self']")

  await expect(page.locator("body > h1")).toHaveText("Frames")
  await expect(page.locator("#navigate-top")).toHaveText("Replaced only the frame")
})

test("following a link with data-turbo-frame='_parent' within a nested frame navigates the parent frame", async ({
  page
}) => {
  assert.ok(await hasSelector(page, "#nested-child"), "child frame exists before navigation")
  assert.equal(await page.textContent("#nested-root h2"), "Frames: #nested-root")

  await page.click("#nested-child #link-parent")
  await nextBeat()

  const nestedRootContent = await page.textContent("#nested-root h2")
  assert.equal(nestedRootContent, "Parent: Loaded", "parent frame content updated")

  assert.notOk(await hasSelector(page, "#nested-child"), "child frame removed when parent navigates")

  const nestedRootSrc = await attributeForSelector(page, "#nested-root", "src")
  assert.ok(nestedRootSrc?.includes("/src/tests/fixtures/frames/parent.html"), "parent frame src updated")
})

test("submitting a form with data-turbo-frame='_parent' within a nested frame navigates the parent frame", async ({
  page
}) => {
  await page.click("#nested-child #form-submit-parent")
  await nextBeat()

  const nestedRootContent = await page.textContent("#nested-root h2")
  assert.equal(nestedRootContent, "Parent: Loaded", "parent frame content updated via form")

  assert.notOk(await hasSelector(page, "#nested-child"), "child frame removed after form submission to parent")

  const nestedRootSrc = await attributeForSelector(page, "#nested-root", "src")
  assert.ok(nestedRootSrc?.includes("/src/tests/fixtures/frames/parent.html"), "parent frame src updated via form")
})

test("following a link with data-turbo-frame='_parent' navigates only the immediate parent frame", async ({ page }) => {
  assert.ok(await hasSelector(page, "#nested-grandchild"), "grandchild frame exists before navigation")
  assert.equal(await page.textContent("#nested-child h2"), "Frames: #nested-child")
  assert.equal(await page.textContent("#nested-root h2"), "Frames: #nested-root")

  await page.click("#nested-grandchild #grandchild-link-parent")
  await nextBeat()

  const nestedChildContent = await page.textContent("#nested-child h2")
  assert.equal(nestedChildContent, "Frame: Loaded", "immediate parent frame (#nested-child) was updated")

  const nestedRootContent = await page.textContent("#nested-root h2")
  assert.equal(nestedRootContent, "Frames: #nested-root", "grandparent frame (#nested-root) was NOT updated")

  assert.notOk(await hasSelector(page, "#nested-grandchild"), "grandchild frame removed when parent navigates")
})

test("following a link with data-turbo-frame='_parent' in a top-level frame navigates the page", async ({ page }) => {
  assert.equal(await attributeForSelector(page, "#top-level-parent", "src"), null)

  await page.click("#top-level-parent a")
  await nextBeat()

  const frameText = await page.textContent("body > h1")
  assert.equal(frameText, "One")
  assert.notOk(await hasSelector(page, "#top-level-parent a"))
  assert.equal(pathname(page.url()), "/src/tests/fixtures/one.html")
  assert.equal(await searchParams(page.url()).get("key"), "value")
})

test("following a link with data-turbo-frame='_parent' when parent frame is disabled navigates the page", async ({ page }) => {
  await page.locator("#nested-root").evaluate((frame) => frame.setAttribute("disabled", ""))

  await page.click("#nested-child #link-parent")
  await nextBeat()

  const pageTitle = await page.textContent("body > h1")
  assert.equal(pageTitle, "Nested Root: Parent", "navigates the page when parent frame is disabled")
  assert.equal(pathname(page.url()), "/src/tests/fixtures/frames/parent.html")
})

test("following a link to a page with a <turbo-frame recurse> which lazily loads a matching frame", async ({
  page
}) => {
  await page.click("#recursive summary")

  await expect(page.locator("#recursive details")).toHaveAttribute("open")

  await page.click("#recursive a")
  await nextEventOnTarget(page, "recursive", "turbo:frame-load")
  await nextEventOnTarget(page, "composer", "turbo:frame-load")

  await expect(page.locator("#recursive details")).not.toHaveAttribute("open")
})

test("submitting a form that redirects to a page with a <turbo-frame recurse> which lazily loads a matching frame", async ({
  page
}) => {
  await page.click("#recursive summary")

  await expect(page.locator("#recursive details")).toHaveAttribute("open")

  await page.click("#recursive input[type=submit]")
  await nextEventOnTarget(page, "recursive", "turbo:frame-load")
  await nextEventOnTarget(page, "composer", "turbo:frame-load")

  await expect(page.locator("#recursive details")).not.toHaveAttribute("open")
})

test("removing [disabled] attribute from eager-loaded frame navigates it", async ({ page }) => {
  await page.evaluate(() => document.getElementById("frame")?.setAttribute("disabled", ""))
  await page.evaluate(() =>
    document.getElementById("frame")?.setAttribute("src", "/src/tests/fixtures/frames/frame.html")
  )

  expect(
    await noNextEventOnTarget(page, "frame", "turbo:before-fetch-request"),
    "[disabled] frames do not submit requests"
  ).toBeTruthy()

  await page.evaluate(() => document.getElementById("frame")?.removeAttribute("disabled"))

  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
})

test("evaluates frame script elements on each render", async ({ page }) => {
  expect(await frameScriptEvaluationCount(page)).toEqual(undefined)

  await page.click("#body-script-link")
  await nextEventOnTarget(page, "body-script", "turbo:frame-load")
  expect(await frameScriptEvaluationCount(page)).toEqual(1)

  await page.click("#body-script-link")
  await nextEventOnTarget(page, "body-script", "turbo:frame-load")
  expect(await frameScriptEvaluationCount(page)).toEqual(2)
})

test("does not evaluate data-turbo-eval=false scripts", async ({ page }) => {
  await page.click("#eval-false-script-link")
  await nextBeat()
  expect(await frameScriptEvaluationCount(page)).toEqual(undefined)
})

test("redirecting in a form is still navigatable after redirect", async ({ page }) => {
  await page.click("#navigate-form-redirect")
  await nextEventOnTarget(page, "form-redirect", "turbo:frame-load")
  await expect(page.locator("turbo-frame#form-redirect h2")).toHaveText("Form Redirect")

  await page.click("#submit-form")
  await nextEventOnTarget(page, "form-redirect", "turbo:frame-load")
  await expect(page.locator("turbo-frame#form-redirect h2")).toHaveText("Form Redirected")

  await page.click("#navigate-form-redirect")
  await nextEventOnTarget(page, "form-redirect", "turbo:frame-load")

  await expect(page.locator("turbo-frame#form-redirect h2")).toHaveText("Form Redirect")
})

test("'turbo:frame-render' is triggered after frame has finished rendering", async ({ page }) => {
  await page.click("#frame-part")

  await nextEventNamed(page, "turbo:frame-render") // recursive
  const { fetchResponse } = await nextEventNamed(page, "turbo:frame-render")

  expect(fetchResponse.response.url).toContain("/src/tests/fixtures/frames/part.html")
})

test("navigating a frame from an outer link with a turbo-frame child fires events", async ({ page }) => {
  await page.click("#outside-frame-link-with-frame-child")

  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  expect(fetchResponse.response.url).toContain("/src/tests/fixtures/frames/form.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  expect(await readEventLogs(page), "no more events").toHaveLength(0)
})

test("navigating a frame from an outer form fires events", async ({ page }) => {
  await page.click("#outside-frame-form")

  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  expect(fetchResponse.response.url).toContain("/src/tests/fixtures/frames/form.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)
})

test("navigating a frame from an outer link fires events", async ({ page }) => {
  await listenForEventOnTarget(page, "outside-frame-form", "turbo:click")
  await page.click("#outside-frame-form")

  await nextEventOnTarget(page, "outside-frame-form", "turbo:click")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  expect(fetchResponse.response.url).toContain("/src/tests/fixtures/frames/form.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)
})

test("navigating a frame from an inner link fires events", async ({ page }) => {
  await listenForEventOnTarget(page, "link-frame", "turbo:click")
  await page.click("#link-frame")

  await nextEventOnTarget(page, "link-frame", "turbo:click")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  const { fetchResponse } = await nextEventOnTarget(page, "frame", "turbo:frame-render")
  expect(fetchResponse.response.url).toContain("/src/tests/fixtures/frames/frame.html")

  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)
})

test("navigating a frame targeting _top from an outer link fires events", async ({ page }) => {
  await listenForEventOnTarget(page, "outside-navigate-top-link", "turbo:click")
  await page.click("#outside-navigate-top-link")

  await nextEventOnTarget(page, "outside-navigate-top-link", "turbo:click")
  await nextEventOnTarget(page, "html", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "html", "turbo:before-fetch-response")
  await nextEventOnTarget(page, "html", "turbo:before-render")
  await nextEventOnTarget(page, "html", "turbo:render")
  await nextEventOnTarget(page, "html", "turbo:load")

  const otherEvents = await readEventLogs(page)
  expect(otherEvents.length, "no more events").toEqual(0)
})

test("invoking .reload() re-fetches the frame's content", async ({ page }) => {
  await page.click("#link-frame")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")
  await page.evaluate(() => document.getElementById("frame").reload())

  const dispatchedEvents = await readEventLogs(page)

  expect(
    dispatchedEvents.map(([name, _, id]) => [id, name])
  ).toEqual(
    [
      ["frame", "turbo:before-fetch-request"],
      ["frame", "turbo:before-fetch-response"],
      ["frame", "turbo:before-frame-render"],
      ["frame", "turbo:frame-render"],
      ["frame", "turbo:frame-load"]
    ]
  )
})

test("following inner link reloads frame on every click", async ({ page }) => {
  await page.click("#hello a")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#hello a")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("following outer link reloads frame on every click", async ({ page }) => {
  await page.click("#outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("following outer form reloads frame on every submit", async ({ page }) => {
  await page.click("#outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("an inner/outer link reloads frame on every click", async ({ page }) => {
  await page.click("#inner-outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#inner-outer-frame-link")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("an inner/outer form reloads frame on every submit", async ({ page }) => {
  await page.click("#inner-outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.click("#inner-outer-frame-submit")
  await nextEventNamed(page, "turbo:before-fetch-request")
})

test("reconnecting after following a link does not reload the frame", async ({ page }) => {
  await page.click("#hello a")
  await nextEventNamed(page, "turbo:before-fetch-request")

  await page.evaluate(() => {
    window.savedElement = document.querySelector("#frame")
    window.savedElement?.remove()
  })
  await nextBeat()

  await page.evaluate(() => {
    if (window.savedElement) {
      document.body.appendChild(window.savedElement)
    }
  })
  await nextBeat()

  const eventLogs = await readEventLogs(page)
  const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
  expect(requestLogs.length).toEqual(0)
})

test("navigating pushing URL state from a frame navigation fires events", async ({ page }) => {
  await page.click("#link-outside-frame-action-advance")

  expect(
    await nextAttributeMutationNamed(page, "frame", "aria-busy"),
    "sets aria-busy on the <turbo-frame>"
  ).toEqual(
    "true"
  )
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")
  await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")
  expect(await nextAttributeMutationNamed(page, "frame", "aria-busy"), "removes aria-busy from the <turbo-frame>").not.toBeTruthy()

  expect(await nextAttributeMutationNamed(page, "html", "aria-busy"), "sets aria-busy on the <html>").toEqual("true")
  await nextEventOnTarget(page, "html", "turbo:before-visit")
  await nextEventOnTarget(page, "html", "turbo:visit")
  await nextEventOnTarget(page, "html", "turbo:before-cache")
  await nextEventOnTarget(page, "html", "turbo:before-render")
  await nextEventOnTarget(page, "html", "turbo:render")
  await nextEventOnTarget(page, "html", "turbo:load")
  expect(await nextAttributeMutationNamed(page, "html", "aria-busy"), "removes aria-busy from the <html>").not.toBeTruthy()
})

test("navigating a frame with a form[method=get] that does not redirect still updates the [src]", async ({
  page
}) => {
  await page.click("#frame-form-get-no-redirect")
  await nextEventNamed(page, "turbo:before-fetch-request")
  await nextEventNamed(page, "turbo:before-fetch-response")
  await nextEventOnTarget(page, "frame", "turbo:frame-render")
  await nextEventOnTarget(page, "frame", "turbo:frame-load")

  expect(await noNextEventNamed(page, "turbo:before-fetch-request")).toBeTruthy()

  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(page.locator("h1")).toHaveText("Frames")
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames.html"))
})

test("navigating turbo-frame[data-turbo-action=advance] from within pushes URL state", async ({ page }) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#link-frame")
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")

  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
})

test("navigating turbo-frame[data-turbo-action=advance] from outside with target pushes URL state", async ({ page }) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#hello a")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Frames")
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  expect(pathname(page.url())).toEqual("/src/tests/fixtures/frames/frame.html")
})

test("navigating turbo-frame[data-turbo-action=advance] with Turbo.visit pushes URL state", async ({ page }) => {
  const path = "/src/tests/fixtures/frames/frame.html"

  await page.click("#add-turbo-action-to-frame")
  await page.evaluate((path) => window.Turbo.visit(path, { frame: "frame" }), path)
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Frames")
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  expect(pathname(page.url())).toEqual(path)
})

test("navigating turbo-frame without advance with Turbo.visit specifying advance pushes URL state", async ({ page }) => {
  const path = "/src/tests/fixtures/frames/frame.html"

  await page.evaluate((path) => window.Turbo.visit(path, { frame: "frame", action: "advance" }), path)
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Frames")
  await expect(page.locator("#frame h2")).toHaveText("Frame: Loaded")
  expect(pathname(page.url())).toEqual(path)
})

test("navigating turbo-frame[data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state", async ({
  page
}) => {
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#frame"), "clears turbo-frame[aria-busy]").not.toHaveAttribute("aria-busy")
  await expect(page.locator("#html"), "clears html[aria-busy]").not.toHaveAttribute("aria-busy")
  await expect(page.locator("#html"), "clears html[data-turbo-preview]").not.toHaveAttribute("data-turbo-preview")
})

test("navigating a turbo-frame with an a[data-turbo-action=advance] preserves page state", async ({ page }) => {
  await scrollToSelector(page, "#below-the-fold-input")
  await page.fill("#below-the-fold-input", "a value")
  await page.click("#below-the-fold-link-frame-action")
  await nextEventNamed(page, "turbo:load")

  const title = await page.locator("h1")
  const frameTitle = await page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#below-the-fold-input"), "preserves page state").toHaveValue("a value")

  const { y } = await scrollPosition(page)
  expect(y, "preserves Y scroll position").not.toEqual(0)
})

test("a turbo-frame that has been driven by a[data-turbo-action] can be navigated normally", async ({ page }) => {
  await page.click("#remove-target-from-hello")
  await page.click("#link-hello-advance")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("h1")).toHaveText("Frames")
  await expect(page.locator("#hello h2")).toHaveText("Hello from a frame")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/hello.html"))

  await page.click("#hello a")
  await nextEventOnTarget(page, "hello", "turbo:frame-load")

  expect(await noNextEventNamed(page, "turbo:load")).toBeTruthy()
  await expect(page.locator("#hello h2")).toHaveText("Frames: #hello")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/hello.html"))
})

test("navigating turbo-frame from within with a[data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#link-nested-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("navigating frame with a[data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#link-outside-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("navigating frame with form[method=get][data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("navigating frame with form[method=get][data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state", async ({
  page
}) => {
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-get-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#frame"), "clears turbo-frame[aria-busy]").not.toHaveAttribute("aria-busy")
  await expect(page.locator("#html"), "clears html[aria-busy]").not.toHaveAttribute("aria-busy")
  await expect(page.locator("#html"), "clears html[data-turbo-preview]").not.toHaveAttribute("data-turbo-preview")
})

test("navigating frame with form[method=post][data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("navigating frame with form[method=post][data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state", async ({
  page
}) => {
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")
  await page.click("#form-post-frame-action-advance button")
  await nextEventNamed(page, "turbo:load")

  await expect(page.locator("#frame"), "clears turbo-frame[aria-busy]").not.toHaveAttribute("aria-busy")
  await expect(page.locator("#html"), "clears html[aria-busy]").not.toHaveAttribute("aria-busy")
  await expect(page.locator("#html"), "clears html[data-turbo-preview]").not.toHaveAttribute("data-turbo-preview")
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("navigating frame with button[data-turbo-action=advance] pushes URL state", async ({ page }) => {
  await page.click("#button-frame-action-advance")
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("navigating back after pushing URL state from a turbo-frame[data-turbo-action=advance] restores the frames previous contents", async ({
  page
}) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#link-frame")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")

  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frames: #frame")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames.html"))
  await expect(page.locator("#frame")).not.toHaveAttribute("src")
  expect(await propertyForSelector(page, "#frame", "src")).toEqual(null)
})

test("navigating back then forward after pushing URL state from a turbo-frame[data-turbo-action=advance] restores the frames next contents", async ({
  page
}) => {
  await page.click("#add-turbo-action-to-frame")
  await page.click("#link-frame")
  await nextEventNamed(page, "turbo:load")
  await page.goBack()
  await nextEventNamed(page, "turbo:load")
  await page.goForward()
  await nextEventNamed(page, "turbo:load")

  const title = page.locator("h1")
  const frameTitle = page.locator("#frame h2")
  const src = (await attributeForSelector(page, "#frame", "src")) ?? ""

  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame.html")
  await expect(title).toHaveText("Frames")
  await expect(frameTitle).toHaveText("Frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/frames/frame.html"))
  await expect(page.locator("#frame"), "marks the frame as [complete]").toHaveAttribute("complete")
})

test("turbo:before-fetch-request fires on the frame element", async ({ page }) => {
  await page.click("#hello a")
  expect(await nextEventOnTarget(page, "frame", "turbo:before-fetch-request")).toBeTruthy()
})

test("turbo:before-fetch-response fires on the frame element", async ({ page }) => {
  await page.click("#hello a")
  expect(await nextEventOnTarget(page, "frame", "turbo:before-fetch-response")).toBeTruthy()
})

test("navigating a eager frame with a link[method=get] that does not fetch eager frame twice", async ({
  page
}) => {
  await page.click("#link-to-eager-loaded-frame")

  await nextBeat()

  const eventLogs = await readEventLogs(page)
  const fetchLogs = eventLogs.filter(
    ([name, options]) =>
      name == "turbo:before-fetch-request" && options?.url?.includes("/src/tests/fixtures/frames/frame_for_eager.html")
  )
  expect(fetchLogs.length).toEqual(1)

  const src = (await attributeForSelector(page, "#eager-loaded-frame", "src")) ?? ""
  expect(src, "updates src attribute").toContain("/src/tests/fixtures/frames/frame_for_eager.html")
  await expect(page.locator("h1")).toHaveText("Eager-loaded frame")
  await expect(page.locator("#eager-loaded-frame h2")).toHaveText("Eager-loaded frame: Loaded")
  await expect(page).toHaveURL(withPathname("/src/tests/fixtures/page_with_eager_frame.html"))
})

test("form submissions from frames clear snapshot cache", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector("h1").textContent = "Changed"
  })

  await expect(page.locator("h1")).toHaveText("Changed")

  await page.click("#navigate-form-redirect-as-new")
  await expect(page.locator("h1")).toHaveText("Page One Form")
  await page.click("#submit-form")
  await expect(page.locator("h2")).toHaveText("Form Redirected")
  await page.goBack()

  await expect(page.locator("h1")).not.toHaveText("Changed")
})

async function withoutChangingEventListenersCount(page, callback) {
  const name = "eventListenersAttachedToDocument"
  const setup = () => {
    return page.evaluate((name) => {
      const context = window
      context[name] = 0
      context.originals = {
        addEventListener: document.addEventListener,
        removeEventListener: document.removeEventListener
      }

      document.addEventListener = (type, listener, options) => {
        context.originals.addEventListener.call(document, type, listener, options)
        context[name] += 1
      }

      document.removeEventListener = (type, listener, options) => {
        context.originals.removeEventListener.call(document, type, listener, options)
        context[name] -= 1
      }

      return context[name] || 0
    }, name)
  }

  const teardown = () => {
    return page.evaluate((name) => {
      const context = window
      const { addEventListener, removeEventListener } = context.originals

      document.addEventListener = addEventListener
      document.removeEventListener = removeEventListener

      return context[name] || 0
    }, name)
  }

  await nextBeat()
  const originalCount = await setup()
  await callback()
  const finalCount = await teardown()

  expect(finalCount, "expected callback not to leak event listeners").toEqual(originalCount)
}

function frameScriptEvaluationCount(page) {
  return page.evaluate(() => window.frameScriptEvaluationCount)
}
