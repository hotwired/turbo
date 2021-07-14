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
  }

  async "test lazy loading within a details element"() {
    await this.nextBeat

    const frameContents = "#loading-lazy turbo-frame h2"
    this.assert.notOk(await this.hasSelector(frameContents))

    await this.clickSelector("#loading-lazy summary")
    await this.nextBeat

    const contents = await this.querySelector(frameContents)
    this.assert.equal(await contents.getVisibleText(), "Hello from a frame")
  }

  async "test changing loading attribute from lazy to eager loads frame"() {
    const frameContents = "#loading-lazy turbo-frame h2"
    await this.nextBeat

    this.assert.notOk(await this.hasSelector(frameContents))

    await this.remote.execute(() => document.querySelector("#loading-lazy turbo-frame")?.setAttribute("loading", "eager"))
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

    await this.remote.execute(() => document.querySelector("#loading-lazy turbo-frame")?.setAttribute("src", "/src/tests/fixtures/frames.html"))
    this.assert.notOk(await this.hasSelector(frameContents))

    await this.clickSelector("#loading-lazy summary")
    await this.nextBeat

    const contents = await this.querySelector(frameContents)
    this.assert.equal(await contents.getVisibleText(), "Frames: #hello")
  }

  async "test changing src attribute on a frame with loading=eager navigates"() {
    const frameContents = "#loading-eager turbo-frame h2"
    await this.nextBeat

    await this.remote.execute(() => document.querySelector("#loading-eager turbo-frame")?.setAttribute("src", "/src/tests/fixtures/frames.html"))

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
    // @ts-ignore
    await this.remote.execute(() => document.querySelector("#loading-eager turbo-frame")?.reload())
    this.assert.ok(await this.hasSelector(frameContent))
  }

  async "test navigating away from a page does not reload its frames"() {
    await this.clickSelector("#one")
    await this.nextBody

    const eventLogs = await this.eventLogChannel.read()
    const requestLogs = eventLogs.filter(([ name ]) => name == "turbo:before-fetch-request")
    this.assert.equal(requestLogs.length, 1)
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
    const requestLogs = eventLogs.filter(([ name ]) => name == "turbo:before-fetch-request")
    this.assert.equal(requestLogs.length, 0)
  }
}

LoadingTests.registerSuite()
