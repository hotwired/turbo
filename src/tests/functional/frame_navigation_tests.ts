import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameNavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frame_navigation.html")
    await this.trackFrameEvents()
  }

  async "test frame navigation with descendant link"() {
    await this.clickSelector("#inside")
    await this.nextBeat

    const disptachedFrameEvents = await this.readDispatchedFrameEvents()
    const [
      [ beforeVisit, beforeVisitTarget, { url } ],
      [ visit, visitTarget ],
      [ beforeCache, beforeCacheTarget ],
      [ beforeRender, beforeRenderTarget, { newBody } ],
      [ render, renderTarget ],
      [ load, loadTarget, { timing } ],
    ] = disptachedFrameEvents

    this.assert.equal(beforeVisit, "turbo:before-frame-visit")
    this.assert.equal(beforeVisitTarget, "frame")
    this.assert.ok(url.includes("/src/tests/fixtures/frame_navigation.html"))

    this.assert.equal(visit, "turbo:frame-visit")
    this.assert.equal(visitTarget, "frame")

    this.assert.equal(beforeCache, "turbo:before-frame-cache")
    this.assert.equal(beforeCacheTarget, "frame")

    this.assert.equal(beforeRender, "turbo:before-frame-render")
    this.assert.equal(beforeRenderTarget, "frame")
    this.assert.ok(newBody)

    this.assert.equal(render, "turbo:frame-render")
    this.assert.equal(renderTarget, "frame")

    this.assert.equal(load, "turbo:frame-load")
    this.assert.equal(loadTarget, "frame")
    this.assert.ok(Object.keys(timing).length)
  }

  async "test frame navigation with exterior link"() {
    await this.clickSelector("#outside")
    await this.nextBeat

    const disptachedFrameEvents = await this.readDispatchedFrameEvents()
    const [
      [ beforeVisit, beforeVisitTarget, { url } ],
      [ visit, visitTarget ],
      [ beforeCache, beforeCacheTarget ],
      [ beforeRender, beforeRenderTarget, { newBody } ],
      [ render, renderTarget ],
      [ load, loadTarget, { timing } ],
    ] = disptachedFrameEvents

    this.assert.equal(beforeVisit, "turbo:before-frame-visit")
    this.assert.equal(beforeVisitTarget, "frame")
    this.assert.ok(url.includes("/src/tests/fixtures/frame_navigation.html"))

    this.assert.equal(visit, "turbo:frame-visit")
    this.assert.equal(visitTarget, "frame")

    this.assert.equal(beforeCache, "turbo:before-frame-cache")
    this.assert.equal(beforeCacheTarget, "frame")

    this.assert.equal(beforeRender, "turbo:before-frame-render")
    this.assert.equal(beforeRenderTarget, "frame")
    this.assert.ok(newBody)

    this.assert.equal(render, "turbo:frame-render")
    this.assert.equal(renderTarget, "frame")

    this.assert.equal(load, "turbo:frame-load")
    this.assert.equal(loadTarget, "frame")
    this.assert.ok(Object.keys(timing).length)
  }

  async "test frame navigation with cancelled visit"() {
    await this.remote.execute(() => addEventListener("turbo:before-frame-visit", (event) => event.preventDefault(), { once: true }))
    await this.clickSelector("#inside")
    await this.nextBeat

    const disptachedFrameEvents = await this.readDispatchedFrameEvents()
    const [
      [ beforeVisit, beforeVisitTarget, { url } ],
      ...others
    ] = disptachedFrameEvents

    this.assert.equal(beforeVisit, "turbo:before-frame-visit")
    this.assert.equal(beforeVisitTarget, "frame")
    this.assert.ok(url.includes("/src/tests/fixtures/frame_navigation.html"))

    this.assert.equal(others.length, 0, "prevents subsequent events")
    this.assert.ok(await this.hasSelector("#inside"), "does not navigate the frame")
  }

  async readDispatchedFrameEvents() {
    const html = await this.querySelector("html")
    const json = await html.getAttribute("data-events")

    return JSON.parse(json || "[]")
  }

  async trackFrameEvents() {
    this.remote.execute((eventNames: string[]) => {
      const html = document.documentElement
      const element = document.getElementById("frame")?.parentNode

      if (element) {
        eventNames.forEach(eventName => element.addEventListener(eventName, (event) => {
          if (event instanceof CustomEvent && event.target instanceof HTMLElement) {
            const dispatchedEvents = JSON.parse(html.getAttribute("data-events") || "[]")
            const detail = event.detail || {}
            dispatchedEvents.push([event.type, event.target.id, { ...detail, newBody: !!detail.newBody }])
            html.setAttribute("data-events", JSON.stringify(dispatchedEvents))
          }
        }))
      }
    }, ["turbo:before-frame-visit turbo:frame-visit turbo:before-frame-cache turbo:before-frame-render turbo:frame-render turbo:frame-load".split(/\s+/)])
  }
}

FrameNavigationTests.registerSuite()
