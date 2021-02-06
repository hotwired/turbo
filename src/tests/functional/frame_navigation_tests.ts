import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameNavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frame_navigation.html")
  }

  async "test frame navigation with descendant link"() {
    const link = await this.querySelector("#inside")
    const href = await link.getAttribute("href")
    await link.click()
    await this.nextBeat

    const { url } = await this.nextEventOnTarget("frame", "turbo:before-frame-visit")
    this.assert.ok(url.includes(href))
    await this.nextEventOnTarget("frame", "turbo:frame-visit")
    await this.nextEventOnTarget("frame", "turbo:before-frame-cache")

    const beforeFrameRender = await this.nextEventOnTarget("frame", "turbo:before-frame-render")
    this.assert.ok("newFrame" in beforeFrameRender, "reference the new snapshot")
    await this.nextEventOnTarget("frame", "turbo:frame-render")

    const { timing } = await this.nextEventOnTarget("frame", "turbo:frame-load")
    this.assert.ok(Object.keys(timing).length)
  }

  async "test frame navigation with exterior link"() {
    const link = await this.querySelector("#outside")
    const href = await link.getAttribute("href")
    await link.click()
    await this.nextBeat

    const { url } = await this.nextEventOnTarget("frame", "turbo:before-frame-visit")
    this.assert.ok(url.includes(href))
    await this.nextEventOnTarget("frame", "turbo:frame-visit")
    await this.nextEventOnTarget("frame", "turbo:before-frame-cache")

    const beforeFrameRender = await this.nextEventOnTarget("frame", "turbo:before-frame-render")
    this.assert.ok("newFrame" in beforeFrameRender, "reference the new snapshot")
    await this.nextEventOnTarget("frame", "turbo:frame-render")

    const { timing } = await this.nextEventOnTarget("frame", "turbo:frame-load")
    this.assert.ok(Object.keys(timing).length)
  }

  async "test frame navigation with cancelled visit"() {
    const link = await this.querySelector("#inside")
    const href= await link.getAttribute("href")
    await this.remote.execute(() => addEventListener("turbo:before-frame-visit", (event) => event.preventDefault(), { once: true }))

    await link.click()

    const { url } =  await this.nextEventOnTarget("frame", "turbo:before-frame-visit")
    this.assert.ok(url.includes(href))

    const otherEvents = await this.eventLogChannel.read()
    this.assert.equal(otherEvents.length, 0, "cancels subsequent events")
    this.assert.ok(await this.hasSelector("#inside"), "does not navigate the frame")
  }
}

FrameNavigationTests.registerSuite()
