import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class NavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/navigation.html")
  }

  async "test navigating renders a progress bar"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(0))
    await this.clickSelector("a:first-of-type")

    await this.waitUntilSelector("progress")
    this.assert.ok(await this.hasSelector("progress[value]"), "displays progress bar")

    await this.nextBody
    await this.waitUntilNoSelector("progress")

    this.assert.notOk(await this.hasSelector("progress"), "hides progress bar")
  }

  async "test navigating does not render a progress bar before expiring the delay"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(1000))
    await this.clickSelector("a:first-of-type")

    this.assert.notOk(await this.hasSelector("progress"), "does not show progress bar before delay")
  }

  async "test after loading the page"() {
    this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test following a same-origin unannotated link"() {
    this.clickSelector("#same-origin-unannotated-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test following a same-origin data-turbo-action=replace link"() {
    this.clickSelector("#same-origin-replace-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "replace")
  }

  async "test following a same-origin data-turbo=false link"() {
    this.clickSelector("#same-origin-false-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test following a same-origin unannotated link inside a data-turbo=false container"() {
    this.clickSelector("#same-origin-unannotated-link-inside-false-container")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test following a same-origin data-turbo=true link inside a data-turbo=false container"() {
    this.clickSelector("#same-origin-true-link-inside-false-container")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test following a same-origin anchored link"() {
    this.clickSelector("#same-origin-anchored-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.hash, "#element-id")
    this.assert.equal(await this.visitAction, "advance")
    this.assert(await this.isScrolledToSelector("#element-id"))
  }

  async "test following a same-origin link to a named anchor"() {
    this.clickSelector("#same-origin-anchored-link-named")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.hash, "#named-anchor")
    this.assert.equal(await this.visitAction, "advance")
    this.assert(await this.isScrolledToSelector("[name=named-anchor]"))
  }

  async "test following a cross-origin unannotated link"() {
    this.clickSelector("#cross-origin-unannotated-link")
    await this.nextBody
    this.assert.equal(await this.location, "about:blank")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test following a same-origin [target] link"() {
    this.clickSelector("#same-origin-targeted-link")
    await this.nextBeat
    this.remote.switchToWindow(await this.nextWindowHandle)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test following a same-origin [download] link"() {
    this.clickSelector("#same-origin-download-link")
    await this.nextBeat
    this.assert(!await this.changedBody)
    this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test following a same-origin link inside an SVG element"() {
    this.clickSelector("#same-origin-link-inside-svg-element")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test following a cross-origin link inside an SVG element"() {
    this.clickSelector("#cross-origin-link-inside-svg-element")
    await this.nextBody
    this.assert.equal(await this.location, "about:blank")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test clicking the back button"() {
    this.clickSelector("#same-origin-unannotated-link")
    await this.nextBody
    await this.goBack()
    this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html")
    this.assert.equal(await this.visitAction, "restore")
  }

  async "test clicking the forward button"() {
    this.clickSelector("#same-origin-unannotated-link")
    await this.nextBody
    await this.goBack()
    await this.goForward()
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "restore")
  }

  async "test link targeting a disabled turbo-frame navigates the page"() {
    await this.clickSelector("#link-to-disabled-frame")
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/frames/hello.html")
  }
}

NavigationTests.registerSuite()
