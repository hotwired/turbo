import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameNavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frame_navigation.html")
  }

  async "test frame navigation with descendant link"() {
    await this.clickSelector("#inside")

    await this.nextEventOnTarget("frame", "turbo:frame-load")
  }

  async "test frame navigation with self link"() {
    await this.clickSelector("#self")

    await this.nextEventOnTarget("frame", "turbo:frame-load")
  }

  async "test frame navigation with exterior link"() {
    await this.clickSelector("#outside")

    await this.nextEventOnTarget("frame", "turbo:frame-load")
  }

  async "test promoted frame navigation updates the URL before rendering"() {
    await this.goToLocation("/src/tests/fixtures/tabs.html")

    this.remote.execute(() => {
      addEventListener("turbo:before-frame-render", () => {
        localStorage.setItem("beforeRenderUrl", window.location.pathname)
        localStorage.setItem("beforeRenderContent", document.querySelector("#tab-content")?.textContent || "")
      })
    })

    await this.clickSelector("#tab-2")
    await this.nextEventNamed("turbo:before-frame-render")

    this.assert.equal(await this.getFromLocalStorage("beforeRenderUrl"), "/src/tests/fixtures/tabs/two.html")
    this.assert.equal(await this.getFromLocalStorage("beforeRenderContent"), "One")

    await this.nextEventNamed("turbo:frame-render")

    const content = await this.querySelector("#tab-content")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/tabs/two.html")
    this.assert.equal(await content.getVisibleText(), "Two")
  }
}

FrameNavigationTests.registerSuite()
