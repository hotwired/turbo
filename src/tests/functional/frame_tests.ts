import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frames.html")
  }

  async "test navigating a frame a second time does not leak event listeners"() {
    await this.withoutChangingEventListenersCount(async () => {
      await this.clickSelector("#outer-frame-link")
      await this.nextEventOnTarget("frame", "turbo:frame-load")
      await this.clickSelector("#outside-frame-form")
      await this.nextEventOnTarget("frame", "turbo:frame-load")
      await this.clickSelector("#outer-frame-link")
      await this.nextEventOnTarget("frame", "turbo:frame-load")
    })
  }

  async "test following a link preserves the current <turbo-frame> element's attributes"() {
    const currentPath = await this.pathname

    await this.clickSelector("#hello a")
    await this.nextBeat

    const frame = await this.querySelector("turbo-frame#frame")
    this.assert.equal(await frame.getAttribute("data-loaded-from"), currentPath)
    this.assert.equal(await frame.getAttribute("src"), await this.propertyForSelector("#hello a", "href"))
  }

  async "test following a link sets the frame element's [src]"() {
    await this.clickSelector("#link-frame-with-search-params")

    const { url } = await this.nextEventOnTarget("frame", "turbo:before-fetch-request")
    const fetchRequestUrl = new URL(url)

    this.assert.equal(fetchRequestUrl.pathname, "/src/tests/fixtures/frames/frame.html")
    this.assert.equal(fetchRequestUrl.searchParams.get("key"), "value", "fetch request encodes query parameters")

    await this.nextBeat
    const src = new URL((await this.attributeForSelector("#frame", "src")) || "")

    this.assert.equal(src.pathname, "/src/tests/fixtures/frames/frame.html")
    this.assert.equal(src.searchParams.get("key"), "value", "[src] attribute encodes query parameters")
  }

  async "test a frame whose src references itself does not infinitely loop"() {
    await this.clickSelector("#frame-self")

    await this.nextEventOnTarget("frame", "turbo:frame-render")
    await this.nextEventOnTarget("frame", "turbo:frame-load")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")
  }

  async "test following a link driving a frame toggles the [aria-busy=true] attribute"() {
    await this.clickSelector("#hello a")

    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), "", "sets [busy] on the #frame")
    this.assert.equal(
      await this.nextAttributeMutationNamed("frame", "aria-busy"),
      "true",
      "sets [aria-busy=true] on the #frame"
    )
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), null, "removes [busy] on the #frame")
    this.assert.equal(
      await this.nextAttributeMutationNamed("frame", "aria-busy"),
      null,
      "removes [aria-busy] from the #frame"
    )
  }

  async "test following a link to a page without a matching frame results in an empty frame"() {
    await this.clickSelector("#missing a")
    await this.nextBeat
    this.assert.notOk(await this.innerHTMLForSelector("#missing"))
  }

  async "test following a link within a frame with a target set navigates the target frame"() {
    await this.clickSelector("#hello a")
    await this.nextBeat

    const frameText = await this.querySelector("#frame h2")
    this.assert.equal(await frameText.getVisibleText(), "Frame: Loaded")
  }

  async "test following a link in rapid succession cancels the previous request"() {
    await this.clickSelector("#outside-frame-form")
    await this.clickSelector("#outer-frame-link")
    await this.nextBeat

    const frameText = await this.querySelector("#frame h2")
    this.assert.equal(await frameText.getVisibleText(), "Frame: Loaded")
  }

  async "test following a link within a descendant frame whose ancestor declares a target set navigates the descendant frame"() {
    const link = await this.querySelector("#nested-root[target=frame] #nested-child a:not([data-turbo-frame])")
    const href = await link.getProperty("href")

    await link.click()
    await this.nextBeat

    const frame = await this.querySelector("#frame h2")
    const nestedRoot = await this.querySelector("#nested-root h2")
    const nestedChild = await this.querySelector("#nested-child")
    this.assert.equal(await frame.getVisibleText(), "Frames: #frame")
    this.assert.equal(await nestedRoot.getVisibleText(), "Frames: #nested-root")
    this.assert.equal(await nestedChild.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.attributeForSelector("#frame", "src"), null)
    this.assert.equal(await this.attributeForSelector("#nested-root", "src"), null)
    this.assert.equal(await this.attributeForSelector("#nested-child", "src"), href)
  }

  async "test following a link that declares data-turbo-frame within a frame whose ancestor respects the override"() {
    await this.clickSelector("#nested-root[target=frame] #nested-child a[data-turbo-frame]")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
    this.assert.notOk(await this.hasSelector("#frame"))
    this.assert.notOk(await this.hasSelector("#nested-root"))
    this.assert.notOk(await this.hasSelector("#nested-child"))
  }

  async "test following a form within a nested frame with form target top"() {
    await this.clickSelector("#nested-child-navigate-form-top-submit")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
    this.assert.notOk(await this.hasSelector("#frame"))
    this.assert.notOk(await this.hasSelector("#nested-root"))
    this.assert.notOk(await this.hasSelector("#nested-child"))
  }

  async "test following a form within a nested frame with child frame target top"() {
    await this.clickSelector("#nested-child-navigate-top-submit")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
    this.assert.notOk(await this.hasSelector("#frame"))
    this.assert.notOk(await this.hasSelector("#nested-root"))
    this.assert.notOk(await this.hasSelector("#nested-child-navigate-top"))
  }

  async "test following a link within a frame with target=_top navigates the page"() {
    this.assert.equal(await this.attributeForSelector("#navigate-top", "src"), null)

    await this.clickSelector("#navigate-top a:not([data-turbo-frame])")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
    this.assert.notOk(await this.hasSelector("#navigate-top a"))
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.getSearchParam("key"), "value")
  }

  async "test following a link that declares data-turbo-frame='_self' within a frame with target=_top navigates the frame itself"() {
    this.assert.equal(await this.attributeForSelector("#navigate-top", "src"), null)

    await this.clickSelector("#navigate-top a[data-turbo-frame='_self']")
    await this.nextBeat

    const title = await this.querySelector("body > h1")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.ok(await this.hasSelector("#navigate-top"))
    const frame = await this.querySelector("#navigate-top")
    this.assert.equal(await frame.getVisibleText(), "Replaced only the frame")
  }

  async "test following a link to a page with a <turbo-frame recurse> which lazily loads a matching frame"() {
    await this.nextBeat
    await this.clickSelector("#recursive summary")
    this.assert.ok(await this.querySelector("#recursive details[open]"))

    await this.clickSelector("#recursive a")
    await this.nextBeat
    this.assert.ok(await this.querySelector("#recursive details:not([open])"))
  }

  async "test submitting a form that redirects to a page with a <turbo-frame recurse> which lazily loads a matching frame"() {
    await this.nextBeat
    await this.clickSelector("#recursive summary")
    this.assert.ok(await this.querySelector("#recursive details[open]"))

    await this.clickSelector("#recursive input[type=submit]")
    await this.nextBeat
    this.assert.ok(await this.querySelector("#recursive details:not([open])"))
  }

  async "test removing [disabled] attribute from eager-loaded frame navigates it"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("disabled", ""))
    await this.remote.execute(() =>
      document.getElementById("frame")?.setAttribute("src", "/src/tests/fixtures/frames/frame.html")
    )

    this.assert.ok(
      await this.noNextEventNamed("turbo:before-fetch-request"),
      "[disabled] frames do not submit requests"
    )

    await this.remote.execute(() => document.getElementById("frame")?.removeAttribute("disabled"))

    await this.nextEventNamed("turbo:before-fetch-request")
  }

  async "test evaluates frame script elements on each render"() {
    this.assert.equal(await this.frameScriptEvaluationCount, undefined)

    this.clickSelector("#body-script-link")
    await this.sleep(200)
    this.assert.equal(await this.frameScriptEvaluationCount, 1)

    this.clickSelector("#body-script-link")
    await this.sleep(200)
    this.assert.equal(await this.frameScriptEvaluationCount, 2)
  }

  async "test does not evaluate data-turbo-eval=false scripts"() {
    this.clickSelector("#eval-false-script-link")
    await this.nextBeat
    this.assert.equal(await this.frameScriptEvaluationCount, undefined)
  }

  async "test redirecting in a form is still navigatable after redirect"() {
    await this.nextBeat
    await this.clickSelector("#navigate-form-redirect")
    await this.nextBeat
    this.assert.ok(await this.querySelector("#form-redirect"))

    await this.nextBeat
    await this.clickSelector("#submit-form")
    await this.nextBeat
    this.assert.ok(await this.querySelector("#form-redirected-header"))

    await this.nextBeat
    await this.clickSelector("#navigate-form-redirect")
    await this.nextBeat
    this.assert.ok(await this.querySelector("#form-redirect-header"))
  }

  async "test 'turbo:frame-render' is triggered after frame has finished rendering"() {
    await this.clickSelector("#frame-part")

    await this.nextEventNamed("turbo:frame-render") // recursive
    const { fetchResponse } = await this.nextEventNamed("turbo:frame-render")

    this.assert.include(fetchResponse.response.url, "/src/tests/fixtures/frames/part.html")
  }

  async "test navigating a frame fires events"() {
    await this.clickSelector("#outside-frame-form")

    const { fetchResponse } = await this.nextEventOnTarget("frame", "turbo:frame-render")
    this.assert.include(fetchResponse.response.url, "/src/tests/fixtures/frames/form.html")

    await this.nextEventOnTarget("frame", "turbo:frame-load")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")
  }

  async "test following inner link reloads frame on every click"() {
    await this.clickSelector("#hello a")
    await this.nextEventNamed("turbo:before-fetch-request")

    await this.clickSelector("#hello a")
    await this.nextEventNamed("turbo:before-fetch-request")
  }

  async "test following outer link reloads frame on every click"() {
    await this.clickSelector("#outer-frame-link")
    await this.nextEventNamed("turbo:before-fetch-request")

    await this.clickSelector("#outer-frame-link")
    await this.nextEventNamed("turbo:before-fetch-request")
  }

  async "test following outer form reloads frame on every submit"() {
    await this.clickSelector("#outer-frame-submit")
    await this.nextEventNamed("turbo:before-fetch-request")

    await this.clickSelector("#outer-frame-submit")
    await this.nextEventNamed("turbo:before-fetch-request")
  }

  async "test an inner/outer link reloads frame on every click"() {
    await this.clickSelector("#inner-outer-frame-link")
    await this.nextEventNamed("turbo:before-fetch-request")

    await this.clickSelector("#inner-outer-frame-link")
    await this.nextEventNamed("turbo:before-fetch-request")
  }

  async "test an inner/outer form reloads frame on every submit"() {
    await this.clickSelector("#inner-outer-frame-submit")
    await this.nextEventNamed("turbo:before-fetch-request")

    await this.clickSelector("#inner-outer-frame-submit")
    await this.nextEventNamed("turbo:before-fetch-request")
  }

  async "test reconnecting after following a link does not reload the frame"() {
    await this.clickSelector("#hello a")
    await this.nextEventNamed("turbo:before-fetch-request")

    await this.remote.execute(() => {
      window.savedElement = document.querySelector("#frame")
      window.savedElement?.remove()
    })
    await this.nextBeat

    await this.remote.execute(() => {
      if (window.savedElement) {
        document.body.appendChild(window.savedElement)
      }
    })
    await this.nextBeat

    const eventLogs = await this.eventLogChannel.read()
    const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
    this.assert.equal(requestLogs.length, 0)
  }

  async "test navigating pushing URL state from a frame navigation fires events"() {
    await this.clickSelector("#link-outside-frame-action-advance")

    this.assert.equal(
      await this.nextAttributeMutationNamed("frame", "aria-busy"),
      "true",
      "sets aria-busy on the <turbo-frame>"
    )
    await this.nextEventOnTarget("frame", "turbo:before-fetch-request")
    await this.nextEventOnTarget("frame", "turbo:before-fetch-response")
    await this.nextEventOnTarget("frame", "turbo:frame-render")
    await this.nextEventOnTarget("frame", "turbo:frame-load")
    this.assert.notOk(
      await this.nextAttributeMutationNamed("frame", "aria-busy"),
      "removes aria-busy from the <turbo-frame>"
    )

    this.assert.equal(
      await this.nextAttributeMutationNamed("html", "aria-busy"),
      "true",
      "sets aria-busy on the <html>"
    )
    await this.nextEventOnTarget("html", "turbo:before-visit")
    await this.nextEventOnTarget("html", "turbo:visit")
    await this.nextEventOnTarget("html", "turbo:before-cache")
    await this.nextEventOnTarget("html", "turbo:before-render")
    await this.nextEventOnTarget("html", "turbo:render")
    await this.nextEventOnTarget("html", "turbo:load")
    this.assert.notOk(await this.nextAttributeMutationNamed("html", "aria-busy"), "removes aria-busy from the <html>")
  }

  async "test navigating a frame with a form[method=get] that does not redirect still updates the [src]"() {
    await this.clickSelector("#frame-form-get-no-redirect")
    await this.nextEventNamed("turbo:before-fetch-request")
    await this.nextEventNamed("turbo:before-fetch-response")
    await this.nextEventOnTarget("frame", "turbo:frame-render")
    await this.nextEventOnTarget("frame", "turbo:frame-load")
    await this.noNextEventNamed("turbo:before-fetch-request")

    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await (await this.querySelector("h1")).getVisibleText(), "Frames")
    this.assert.equal(await (await this.querySelector("#frame h2")).getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames.html")
  }

  async "test navigating turbo-frame[data-turbo-action=advance] from within pushes URL state"() {
    await this.clickSelector("#add-turbo-action-to-frame")
    await this.clickSelector("#link-frame")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")

    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test navigating turbo-frame[data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state"() {
    await this.clickSelector("#link-outside-frame-action-advance")
    await this.nextEventNamed("turbo:load")
    await this.clickSelector("#link-outside-frame-action-advance")
    await this.nextEventNamed("turbo:load")
    await this.clickSelector("#link-outside-frame-action-advance")
    await this.nextEventNamed("turbo:load")

    this.assert.equal(await this.attributeForSelector("#frame", "aria-busy"), null, "clears turbo-frame[aria-busy]")
    this.assert.equal(await this.attributeForSelector("#html", "aria-busy"), null, "clears html[aria-busy]")
    this.assert.equal(await this.attributeForSelector("#html", "data-turbo-preview"), null, "clears html[aria-busy]")
  }

  async "test navigating a turbo-frame with an a[data-turbo-action=advance] preserves page state"() {
    await this.scrollToSelector("#below-the-fold-input")
    await this.fillInSelector("#below-the-fold-input", "a value")
    await this.clickSelector("#below-the-fold-link-frame-action")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
    this.assert.equal(
      await this.propertyForSelector("#below-the-fold-input", "value"),
      "a value",
      "preserves page state"
    )

    const { y } = await this.scrollPosition
    this.assert.notEqual(y, 0, "preserves Y scroll position")
  }

  async "test a turbo-frame that has been driven by a[data-turbo-action] can be navigated normally"() {
    await this.clickSelector("#remove-target-from-hello")
    await this.clickSelector("#link-hello-advance")
    await this.nextEventNamed("turbo:load")

    this.assert.equal(await (await this.querySelector("h1")).getVisibleText(), "Frames")
    this.assert.equal(await (await this.querySelector("#hello h2")).getVisibleText(), "Hello from a frame")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/hello.html")

    await this.clickSelector("#hello a")
    await this.nextEventOnTarget("hello", "turbo:frame-load")
    await this.noNextEventNamed("turbo:load")

    this.assert.equal(await (await this.querySelector("#hello h2")).getVisibleText(), "Frames: #hello")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/hello.html")
  }

  async "test navigating turbo-frame from within with a[data-turbo-action=advance] pushes URL state"() {
    await this.clickSelector("#link-nested-frame-action-advance")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test navigating frame with a[data-turbo-action=advance] pushes URL state"() {
    await this.clickSelector("#link-outside-frame-action-advance")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test navigating frame with form[method=get][data-turbo-action=advance] pushes URL state"() {
    await this.clickSelector("#form-get-frame-action-advance button")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test navigating frame with form[method=get][data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state"() {
    await this.clickSelector("#form-get-frame-action-advance button")
    await this.nextEventNamed("turbo:load")
    await this.clickSelector("#form-get-frame-action-advance button")
    await this.nextEventNamed("turbo:load")
    await this.clickSelector("#form-get-frame-action-advance button")
    await this.nextEventNamed("turbo:load")

    this.assert.equal(await this.attributeForSelector("#frame", "aria-busy"), null, "clears turbo-frame[aria-busy]")
    this.assert.equal(await this.attributeForSelector("#html", "aria-busy"), null, "clears html[aria-busy]")
    this.assert.equal(await this.attributeForSelector("#html", "data-turbo-preview"), null, "clears html[aria-busy]")
  }

  async "test navigating frame with form[method=post][data-turbo-action=advance] pushes URL state"() {
    await this.clickSelector("#form-post-frame-action-advance button")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test navigating frame with form[method=post][data-turbo-action=advance] to the same URL clears the [aria-busy] and [data-turbo-preview] state"() {
    await this.clickSelector("#form-post-frame-action-advance button")
    await this.nextEventNamed("turbo:load")
    await this.clickSelector("#form-post-frame-action-advance button")
    await this.nextEventNamed("turbo:load")
    await this.clickSelector("#form-post-frame-action-advance button")
    await this.nextEventNamed("turbo:load")

    this.assert.equal(await this.attributeForSelector("#frame", "aria-busy"), null, "clears turbo-frame[aria-busy]")
    this.assert.equal(await this.attributeForSelector("#html", "aria-busy"), null, "clears html[aria-busy]")
    this.assert.equal(await this.attributeForSelector("#html", "data-turbo-preview"), null, "clears html[aria-busy]")
  }

  async "test navigating frame with button[data-turbo-action=advance] pushes URL state"() {
    await this.clickSelector("#button-frame-action-advance")
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test navigating back after pushing URL state from a turbo-frame[data-turbo-action=advance] restores the frames previous contents"() {
    await this.clickSelector("#add-turbo-action-to-frame")
    await this.clickSelector("#link-frame")
    await this.nextEventNamed("turbo:load")
    await this.goBack()
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")

    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frames: #frame")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames.html")
    this.assert.equal(await this.propertyForSelector("#frame", "src"), null)
  }

  async "test navigating back then forward after pushing URL state from a turbo-frame[data-turbo-action=advance] restores the frames next contents"() {
    await this.clickSelector("#add-turbo-action-to-frame")
    await this.clickSelector("#link-frame")
    await this.nextEventNamed("turbo:load")
    await this.goBack()
    await this.nextEventNamed("turbo:load")
    await this.goForward()
    await this.nextEventNamed("turbo:load")

    const title = await this.querySelector("h1")
    const frameTitle = await this.querySelector("#frame h2")
    const src = (await this.attributeForSelector("#frame", "src")) ?? ""

    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame.html"), "updates src attribute")
    this.assert.equal(await title.getVisibleText(), "Frames")
    this.assert.equal(await frameTitle.getVisibleText(), "Frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/frame.html")
  }

  async "test turbo:before-fetch-request fires on the frame element"() {
    await this.clickSelector("#hello a")
    this.assert.ok(await this.nextEventOnTarget("frame", "turbo:before-fetch-request"))
  }

  async "test turbo:before-fetch-response fires on the frame element"() {
    await this.clickSelector("#hello a")
    this.assert.ok(await this.nextEventOnTarget("frame", "turbo:before-fetch-response"))
  }

  async "test navigating a eager frame with a link[method=get] that does not fetch eager frame twice"() {
    await this.clickSelector("#link-to-eager-loaded-frame")

    await this.nextBeat

    const eventLogs = await this.eventLogChannel.read()
    const fetchLogs = eventLogs.filter(([name, options]) => 
      name == "turbo:before-fetch-request" && options?.url?.includes('/src/tests/fixtures/frames/frame_for_eager.html')
    )
    this.assert.equal(fetchLogs.length, 1)

    const src = await this.attributeForSelector("#eager-loaded-frame", "src") ?? ""
    this.assert.ok(src.includes("/src/tests/fixtures/frames/frame_for_eager.html"), "updates src attribute")
    this.assert.equal(await (await this.querySelector("h1")).getVisibleText(), "Eager-loaded frame")
    this.assert.equal(await (await this.querySelector("#eager-loaded-frame h2")).getVisibleText(), "Eager-loaded frame: Loaded")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/page_with_eager_frame.html")
  }

  async withoutChangingEventListenersCount(callback: () => void) {
    const name = "eventListenersAttachedToDocument"
    const setup = () => {
      return this.evaluate(
        (name: string) => {
          const context = window as any
          context[name] = 0
          context.originals = {
            addEventListener: document.addEventListener,
            removeEventListener: document.removeEventListener,
          }

          document.addEventListener = (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
          ) => {
            context.originals.addEventListener.call(document, type, listener, options)
            context[name] += 1
          }

          document.removeEventListener = (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
          ) => {
            context.originals.removeEventListener.call(document, type, listener, options)
            context[name] -= 1
          }

          return context[name] || 0
        },
        [name]
      )
    }

    const teardown = () => {
      return this.evaluate(
        (name: string) => {
          const context = window as any
          const { addEventListener, removeEventListener } = context.originals

          document.addEventListener = addEventListener
          document.removeEventListener = removeEventListener

          return context[name] || 0
        },
        [name]
      )
    }

    const originalCount = await setup()
    await callback()
    const finalCount = await teardown()

    this.assert.equal(finalCount, originalCount, "expected callback not to leak event listeners")
  }

  async fillInSelector(selector: string, value: string) {
    const element = await this.querySelector(selector)

    await element.click()

    return element.type(value)
  }

  get frameScriptEvaluationCount(): Promise<number | undefined> {
    return this.evaluate(() => window.frameScriptEvaluationCount)
  }
}

declare global {
  interface Window {
    frameScriptEvaluationCount?: number
  }
}

FrameTests.registerSuite()
