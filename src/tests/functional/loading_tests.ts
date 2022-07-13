import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

declare global {
  interface Window {
    savedElement: Element | null
  }
}

export class LoadingTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/loading.html")
  }

  async "test eager loading within a details element"() {
    await this.nextBeat
    this.assert.ok(await this.hasSelector("#loading-eager turbo-frame#frame h2"))
    this.assert.ok(await this.hasSelector("#loading-eager turbo-frame[complete]"), "has [complete] attribute")
  }

  async "test lazy loading for a frame with display: contents"() {
    await this.nextBeat

    const frameContents = await this.querySelector("#eager-loaded-frame h2")
    this.assert.equal(await frameContents.getVisibleText(), "Eager-loaded frame: Loaded")
  }

  async "test lazy loading within a details element"() {
    await this.nextBeat

    const frameContents = "#loading-lazy turbo-frame h2"
    this.assert.notOk(await this.hasSelector(frameContents))
    this.assert.ok(await this.hasSelector("#loading-lazy turbo-frame:not([complete])"))

    await this.clickSelector("#loading-lazy summary")
    await this.nextBeat

    const contents = await this.querySelector(frameContents)
    this.assert.equal(await contents.getVisibleText(), "Hello from a frame")
    this.assert.ok(await this.hasSelector("#loading-lazy turbo-frame[complete]"), "has [complete] attribute")
  }

  async "test changing loading attribute from lazy to eager loads frame"() {
    const frameContents = "#loading-lazy turbo-frame h2"
    await this.nextBeat

    this.assert.notOk(await this.hasSelector(frameContents))

    await this.remote.execute(() =>
      document.querySelector("#loading-lazy turbo-frame")?.setAttribute("loading", "eager")
    )
    await this.nextBeat

    const contents = await this.querySelector(frameContents)
    await this.clickSelector("#loading-lazy summary")
    this.assert.equal(await contents.getVisibleText(), "Hello from a frame")
  }

  async "test navigating a visible frame with loading=lazy navigates"() {
    await this.clickSelector("#loading-lazy summary")
    await this.nextBeat

    const initialContents = await this.querySelector("#hello h2")
    this.assert.equal(await initialContents.getVisibleText(), "Hello from a frame")

    await this.clickSelector("#hello a")
    await this.nextBeat

    const navigatedContents = await this.querySelector("#hello h2")
    this.assert.equal(await navigatedContents.getVisibleText(), "Frames: #hello")
  }

  async "test changing src attribute on a frame with loading=lazy defers navigation"() {
    const frameContents = "#loading-lazy turbo-frame h2"
    await this.nextBeat

    await this.remote.execute(() =>
      document.querySelector("#loading-lazy turbo-frame")?.setAttribute("src", "/src/tests/fixtures/frames.html")
    )
    this.assert.notOk(await this.hasSelector(frameContents))

    await this.clickSelector("#loading-lazy summary")
    await this.nextBeat

    const contents = await this.querySelector(frameContents)
    this.assert.equal(await contents.getVisibleText(), "Frames: #hello")
  }

  async "test changing src attribute on a frame with loading=eager navigates"() {
    const frameContents = "#loading-eager turbo-frame h2"
    await this.nextBeat

    await this.remote.execute(() =>
      document.querySelector("#loading-eager turbo-frame")?.setAttribute("src", "/src/tests/fixtures/frames.html")
    )

    await this.clickSelector("#loading-eager summary")
    await this.nextBeat

    const contents = await this.querySelector(frameContents)
    this.assert.equal(await contents.getVisibleText(), "Frames: #frame")
  }

  async "test reloading a frame reloads the content"() {
    await this.nextBeat

    await this.clickSelector("#loading-eager summary")
    await this.nextBeat

    const frameContent = "#loading-eager turbo-frame#frame h2"
    this.assert.ok(await this.hasSelector(frameContent))
    this.assert.ok(await this.hasSelector("#loading-eager turbo-frame[complete]"), "has [complete] attribute")

    await this.remote.execute(() => (document.querySelector("#loading-eager turbo-frame") as any)?.reload())
    this.assert.ok(await this.hasSelector(frameContent))
    this.assert.ok(await this.hasSelector("#loading-eager turbo-frame:not([complete])"), "clears [complete] attribute")
  }

  async "test navigating away from a page does not reload its frames"() {
    await this.clickSelector("#one")
    await this.nextBody

    const eventLogs = await this.eventLogChannel.read()
    const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
    this.assert.equal(requestLogs.length, 1)
  }

  async "test removing the [complete] attribute of an eager frame reloads the content"() {
    await this.nextEventOnTarget("frame", "turbo:frame-load")
    await this.remote.execute(() => document.querySelector("#loading-eager turbo-frame")?.removeAttribute("complete"))
    await this.nextEventOnTarget("frame", "turbo:frame-load")

    this.assert.ok(
      await this.hasSelector("#loading-eager turbo-frame[complete]"),
      "sets the [complete] attribute after re-loading"
    )
  }

  async "test changing [src] attribute on a [complete] frame with loading=lazy defers navigation"() {
    await this.nextEventOnTarget("frame", "turbo:frame-load")
    await this.clickSelector("#loading-lazy summary")
    await this.nextEventOnTarget("hello", "turbo:frame-load")

    this.assert.ok(await this.hasSelector("#loading-lazy turbo-frame[complete]"), "lazy frame is complete")
    this.assert.equal(await (await this.querySelector("#hello h2")).getVisibleText(), "Hello from a frame")

    await this.clickSelector("#loading-lazy summary")
    await this.clickSelector("#one")
    await this.nextEventNamed("turbo:load")
    await this.goBack()
    await this.nextBody
    await this.noNextEventNamed("turbo:frame-load")

    let src = new URL((await this.attributeForSelector("#hello", "src")) || "")

    this.assert.ok(await this.hasSelector("#loading-lazy turbo-frame[complete]"), "lazy frame is complete")
    this.assert.equal(src.pathname, "/src/tests/fixtures/frames/hello.html", "lazy frame retains [src]")

    await this.clickSelector("#link-lazy-frame")
    await this.noNextEventNamed("turbo:frame-load")

    this.assert.ok(await this.hasSelector("#loading-lazy turbo-frame:not([complete])"), "lazy frame is not complete")

    await this.clickSelector("#loading-lazy summary")
    await this.nextEventOnTarget("hello", "turbo:frame-load")

    src = new URL((await this.attributeForSelector("#hello", "src")) || "")

    this.assert.equal(
      await (await this.querySelector("#loading-lazy turbo-frame h2")).getVisibleText(),
      "Frames: #hello"
    )
    this.assert.ok(await this.hasSelector("#loading-lazy turbo-frame[complete]"), "lazy frame is complete")
    this.assert.equal(src.pathname, "/src/tests/fixtures/frames.html", "lazy frame navigates")
  }

  async "test navigating away from a page and then back does not reload its frames"() {
    await this.clickSelector("#one")
    await this.nextBody
    await this.eventLogChannel.read()
    await this.goBack()
    await this.nextBody

    const eventLogs = await this.eventLogChannel.read()
    const requestLogs = eventLogs.filter(([name]) => name == "turbo:before-fetch-request")
    const requestsOnEagerFrame = requestLogs.filter((record) => record[2] == "frame")
    const requestsOnLazyFrame = requestLogs.filter((record) => record[2] == "hello")

    this.assert.equal(requestsOnEagerFrame.length, 0, "does not reload eager frame")
    this.assert.equal(requestsOnLazyFrame.length, 0, "does not reload lazy frame")

    await this.clickSelector("#loading-lazy summary")
    await this.nextEventOnTarget("hello", "turbo:before-fetch-request")
    await this.nextEventOnTarget("hello", "turbo:frame-render")
    await this.nextEventOnTarget("hello", "turbo:frame-load")
  }

  async "test disconnecting and reconnecting a frame does not reload the frame"() {
    await this.nextBeat

    await this.remote.execute(() => {
      window.savedElement = document.querySelector("#loading-eager")
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
}

LoadingTests.registerSuite()
