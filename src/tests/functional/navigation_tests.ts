import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class NavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/navigation.html")
  }

  async "test navigating renders a progress bar"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(0))
    await this.clickSelector("#same-origin-unannotated-link")

    await this.waitUntilSelector(".turbo-progress-bar")
    this.assert.ok(await this.hasSelector(".turbo-progress-bar"), "displays progress bar")

    await this.nextBody
    await this.waitUntilNoSelector(".turbo-progress-bar")

    this.assert.notOk(await this.hasSelector(".turbo-progress-bar"), "hides progress bar")
  }

  async "test navigating does not render a progress bar before expiring the delay"() {
    await this.remote.execute(() => window.Turbo.setProgressBarDelay(1000))
    await this.clickSelector("#same-origin-unannotated-link")

    this.assert.notOk(await this.hasSelector(".turbo-progress-bar"), "does not show progress bar before delay")
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

  // Needs revisit. Tests behavior of clicks on links contained within
  // shadow dom trees. The current test runner (intern) artificially dispatches
  // click events, bypassing the browser's own dispatch
  // logic. However it does not implement the same browser behavior around
  // setting the `MouseEvent.target` attribute. For a click on a link within a
  // shadow dom, browsers assign it the shadow dom parent (the custom element),
  // intern assigns it the link element. This prevents writing a failing test
  // case.
  async "test following a same-origin unannotated custom element link"() {
    // standard finders like `findByCssSelector` or `findByLinkText` will not
    // match elements in the shadow dom, need to reach it via javascript
    const element = await this.remote.findByCssSelector("#same-origin-unannotated-custom-element-link")
    const shadowRoot = this.remote.execute("el => el.shadowRoot", [element])
    const link = await shadowRoot.findByCssSelector("a")
    await link.click()
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test following a same-origin unannotated form[method=GET]"() {
    this.clickSelector("#same-origin-unannotated-form button")
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

  async "test following a same-origin data-turbo-action=replace form[method=GET]"() {
    this.clickSelector("#same-origin-replace-form button")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "replace")
  }

  async "test following a same-origin form with button[data-turbo-action=replace]"() {
    this.clickSelector("#same-origin-replace-form-submitter button")
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

  async "test skip link with hash-only path scrolls to the anchor without a visit"() {
    const bodyElementId = (await this.body).elementId
    await this.clickSelector('a[href="#main"]')
    await this.nextBeat

    this.assert.equal((await this.body).elementId, bodyElementId, "does not reload page")
    this.assert.ok(await this.isScrolledToSelector("#main"), "scrolled to #main")
  }

  async "test skip link with hash-only path moves focus and changes tab order"() {
    await this.clickSelector('a[href="#main"]')
    await this.nextBeat
    await this.pressTab()

    this.assert.notOk(await this.selectorHasFocus("#ignored-link"), "skips interactive elements before #main")
    this.assert.ok(await this.selectorHasFocus("#main a:first-of-type"), "skips to first interactive element after #main")
  }

  async "test same-page anchored replace link assumes the intention was a refresh"() {
    await this.clickSelector('#refresh-link')
    await this.nextBody
    this.assert.ok(await this.isScrolledToSelector("#main"), "scrolled to #main")
  }

  async "test navigating back to anchored URL"() {
    await this.clickSelector('a[href="#main"]')
    await this.nextBeat

    await this.clickSelector("#same-origin-unannotated-link")
    await this.nextBody
    await this.nextBeat

    await this.goBack()
    await this.nextBody

    this.assert.ok(await this.isScrolledToSelector("#main"), "scrolled to #main")
  }

  async "test following a redirection"() {
    await this.clickSelector('#redirection-link')
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "replace")
  }

  async "test clicking the back button after redirection"() {
    await this.clickSelector('#redirection-link')
    await this.nextBody
    await this.goBack()
    this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html")
    this.assert.equal(await this.visitAction, "restore")
  }

  async "test same-page anchor visits do not trigger visit events"() {
    const events = [
      "turbo:before-visit",
      "turbo:visit",
      "turbo:before-cache",
      "turbo:before-render",
      "turbo:render",
      "turbo:load"
    ]

    for (const eventName in events) {
      await this.goToLocation("/src/tests/fixtures/navigation.html")
      await this.clickSelector('a[href="#main"]')
      this.assert.ok(await this.noNextEventNamed(eventName), `same-page links do not trigger ${eventName} events`)
    }
  }

  async "test correct referrer header"() {
    this.clickSelector("#headers-link")
    await this.nextBody
    const pre = await this.querySelector('pre')
    const headers = await JSON.parse(await pre.getVisibleText())
    this.assert.equal(headers.referer, 'http://localhost:9000/src/tests/fixtures/navigation.html', `referer header is correctly set`)
  }
}

NavigationTests.registerSuite()
