import { FunctionalTestCase } from "../helpers/functional_test_case"

export class FrameTests extends FunctionalTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frames.html")
  }

  async "test following a link preserves the current <turbo-frame> element's attributes"() {
    const currentPath = await this.pathname

    await this.clickSelector("#hello a")
    await this.nextBeat

    const frame = await this.querySelector("turbo-frame#frame")
    this.assert.equal(await frame.getAttribute("data-loaded-from"), currentPath)
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
    await this.clickSelector("#nested-root[target=frame] #nested-child a:not([data-turbo-frame])")
    await this.nextBeat

    const frame = await this.querySelector("#frame h2")
    const nestedRoot = await this.querySelector("#nested-root h2")
    const nestedChild = await this.querySelector("#nested-child")
    this.assert.equal(await frame.getVisibleText(), "Frames: #frame")
    this.assert.equal(await nestedRoot.getVisibleText(), "Frames: #nested-root")
    this.assert.equal(await nestedChild.getVisibleText(), "Frame: Loaded")
  }

  async "test following a link that declares data-turbo-frame within a frame whose ancestor respects the override"() {
    await this.clickSelector("#nested-root[target=frame] #nested-child a[data-turbo-frame]")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
  }

  async "test following a link within a frame with target=_top navigates the page"() {
    await this.clickSelector("#navigate-top a")
    await this.nextBeat

    const frameText = await this.querySelector("body > h1")
    this.assert.equal(await frameText.getVisibleText(), "One")
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
}

FrameTests.registerSuite()
