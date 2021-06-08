import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frames.html")
  }

  async "test following a link preserves the current <turbo-frame> element's attributes"() {
    const currentPath = await this.pathname

    await this.clickSelector("#hello a")
    await this.nextBeat

    const frame = await this.querySelector("turbo-frame#frame")
    this.assert.equal(await frame.getAttribute("data-loaded-from"), currentPath)
    this.assert.equal(await frame.getAttribute("src"), await this.propertyForSelector("#hello a", "href"))
  }

  async "test a frame whose src references itself does not infinitely loop"() {
    await this.clickSelector("#frame-self")

    await this.nextEventNamed("turbo:before-fetch-response")

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "no more events")
  }

  async "test following a link driving a frame toggles the [busy] attribute"() {
    await this.clickSelector("#hello a")

    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), "", "sets [busy] on the #frame")
    this.assert.equal(await this.nextAttributeMutationNamed("frame", "busy"), null, "removes [busy] from the #frame")
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

  async "test following a link within a frame with target=_top navigates the page"() {
    this.assert.equal(await this.attributeForSelector("#navigate-top" ,"src"), null)

    await this.clickSelector("#navigate-top a")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
    this.assert.notOk(await this.hasSelector("#navigate-top"))
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
    await this.remote.execute((src: string) => document.getElementById("frame")?.setAttribute("src", "/src/tests/fixtures/frames/frame.html"))

    this.assert.ok(await this.noNextEventNamed("turbo:before-fetch-request"), "[disabled] frames do not submit requests")

    await this.remote.execute(() => document.getElementById("frame")?.removeAttribute("disabled"))

    await this.nextEventNamed("turbo:before-fetch-request")
  }
}

FrameTests.registerSuite()
