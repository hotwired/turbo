import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"
import { Element } from "@theintern/leadfoot"

export class RenderingTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/rendering.html")
  }

  async "test triggers before-render and render events"() {
    this.clickSelector("#same-origin-link")
    const { newBody } = await this.nextEventNamed("turbo:before-render")

    const h1 = await this.querySelector("h1")
    this.assert.equal(await h1.getVisibleText(), "One")

    await this.nextEventNamed("turbo:render")
    this.assert(await newBody.equals(await this.body))
  }

  async "test triggers before-render and render events for error pages"() {
    this.clickSelector("#nonexistent-link")
    const { newBody } = await this.nextEventNamed("turbo:before-render")

    this.assert.equal(await newBody.getVisibleText(), "404 Not Found: /nonexistent")

    await this.nextEventNamed("turbo:render")
    this.assert(await newBody.equals(await this.body))
  }

  async "test reloads when tracked elements change"() {
    this.clickSelector("#tracked-asset-change-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/tracked_asset_change.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test wont reload when tracked elements has a nonce"() {
    this.clickSelector("#tracked-nonce-tag-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/tracked_nonce_tag.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test reloads when turbo-visit-control setting is reload"() {
    this.clickSelector("#visit-control-reload-link")
    await this.nextBody
    this.assert.equal(await this.pathname, "/src/tests/fixtures/visit_control_reload.html")
    this.assert.equal(await this.visitAction, "load")
  }

  async "test accumulates asset elements in head"() {
    const originalElements = await this.assetElements

    this.clickSelector("#additional-assets-link")
    await this.nextBody
    const newElements = await this.assetElements
    this.assert.notDeepEqual(newElements, originalElements)

    this.goBack()
    await this.nextBody
    const finalElements = await this.assetElements
    this.assert.deepEqual(finalElements, newElements)
  }

  async "test replaces provisional elements in head"() {
    const originalElements = await this.provisionalElements
    this.assert(!await this.hasSelector("meta[name=test]"))

    this.clickSelector("#same-origin-link")
    await this.nextBody
    const newElements = await this.provisionalElements
    this.assert.notDeepEqual(newElements, originalElements)
    this.assert(await this.hasSelector("meta[name=test]"))

    this.goBack()
    await this.nextBody
    const finalElements = await this.provisionalElements
    this.assert.notDeepEqual(finalElements, newElements)
    this.assert(!await this.hasSelector("meta[name=test]"))
  }

  async "test evaluates head stylesheet elements"() {
    this.assert.equal(await this.isStylesheetEvaluated, false)

    this.clickSelector("#additional-assets-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.isStylesheetEvaluated, true)
  }

  async "test does not evaluate head stylesheet elements inside noscript elements"() {
    this.assert.equal(await this.isNoscriptStylesheetEvaluated, false)

    this.clickSelector("#additional-assets-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.isNoscriptStylesheetEvaluated, false)
  }

  async "skip evaluates head script elements once"() {
    this.assert.equal(await this.headScriptEvaluationCount, undefined)

    this.clickSelector("#head-script-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.headScriptEvaluationCount, 1)

    this.goBack()
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.headScriptEvaluationCount, 1)

    this.clickSelector("#head-script-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.headScriptEvaluationCount, 1)
  }

  async "test evaluates body script elements on each render"() {
    this.assert.equal(await this.bodyScriptEvaluationCount, undefined)

    this.clickSelector("#body-script-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.bodyScriptEvaluationCount, 1)

    this.goBack()
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.bodyScriptEvaluationCount, 1)

    this.clickSelector("#body-script-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.bodyScriptEvaluationCount, 2)
  }

  async "test does not evaluate data-turbo-eval=false scripts"() {
    this.clickSelector("#eval-false-script-link")
    await this.nextEventNamed("turbo:render")
    this.assert.equal(await this.bodyScriptEvaluationCount, undefined)
  }

  async "test preserves permanent elements"() {
    let permanentElement = await this.permanentElement
    this.assert.equal(await permanentElement.getVisibleText(), "Rendering")

    this.clickSelector("#permanent-element-link")
    await this.nextEventNamed("turbo:render")
    this.assert(await permanentElement.equals(await this.permanentElement))
    this.assert.equal(await permanentElement.getVisibleText(), "Rendering")

    this.goBack()
    await this.nextEventNamed("turbo:render")
    this.assert(await permanentElement.equals(await this.permanentElement))
  }

  async "test preserves permanent elements within turbo-frames"() {
    let permanentElement = await this.querySelector("#permanent-in-frame")
    this.assert.equal(await permanentElement.getVisibleText(), "Rendering")

    await this.clickSelector("#permanent-in-frame-element-link")
    await this.nextBeat
    permanentElement = await this.querySelector("#permanent-in-frame")
    this.assert.equal(await permanentElement.getVisibleText(), "Rendering")
  }

  async "test preserves permanent elements within turbo-frames rendered without layouts"() {
    let permanentElement = await this.querySelector("#permanent-in-frame")
    this.assert.equal(await permanentElement.getVisibleText(), "Rendering")

    await this.clickSelector("#permanent-in-frame-without-layout-element-link")
    await this.nextBeat
    permanentElement = await this.querySelector("#permanent-in-frame")
    this.assert.equal(await permanentElement.getVisibleText(), "Rendering")
  }

  async "test preserves permanent element video playback"() {
    let videoElement = await this.querySelector("#permanent-video")
    await this.clickSelector("#permanent-video-button")
    await this.sleep(500)

    const timeBeforeRender = await videoElement.getProperty("currentTime")
    this.assert.notEqual(timeBeforeRender, 0, "playback has started")

    await this.clickSelector("#permanent-element-link")
    await this.nextBody
    videoElement = await this.querySelector("#permanent-video")

    const timeAfterRender = await videoElement.getProperty("currentTime")
    this.assert.equal(timeAfterRender, timeBeforeRender, "element state is preserved")
  }

  async "test before-cache event"() {
    this.beforeCache(body => body.innerHTML = "Modified")
    this.clickSelector("#same-origin-link")
    await this.nextBody
    await this.goBack()
    const body = await this.nextBody
    this.assert(await body.getVisibleText(), "Modified")
  }

  async "test mutation record as before-cache notification"() {
    this.modifyBodyAfterRemoval()
    this.clickSelector("#same-origin-link")
    await this.nextBody
    await this.goBack()
    const body = await this.nextBody
    this.assert(await body.getVisibleText(), "Modified")
  }

  async "test error pages"() {
    this.clickSelector("#nonexistent-link")
    const body = await this.nextBody
    this.assert.equal(await body.getVisibleText(), "404 Not Found: /nonexistent")
    await this.goBack()
  }

  async "test frame with rendering=after inserts the contents after the frame"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "after"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame"), "Rendering", "preserves frame contents")
    this.assert.equal(await this.getVisibleText("#frame ~ h2"), "Frame: Loaded", "inserts contents after frame")
  }

  async "test frame with rendering=append appends the contents"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "append"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.ok(await this.hasSelector("#frame"), "preserves existing frame")
    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Rendering")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Frame: Loaded")
  }

  async "test frame with rendering=before inserts the contents before the frame"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "before"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame-rendering :first-child"), "Frame: Loaded", "inserts contents before frame")
    this.assert.equal(await this.getVisibleText("#frame"), "Rendering", "preserves frame contents")
  }

  async "test frame with rendering=prepend prepends the contents"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "prepend"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.ok(await this.hasSelector("#frame"), "preserves existing frame")
    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Frame: Loaded")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Rendering")
  }

  async "test frame with rendering=remove removes the element"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "remove"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.notOk(await this.hasSelector("#frame"), "removes existing frame")
    this.assert.ok(await this.hasSelector("#outside-frame"), "does not navigate page")
  }

  async "test frame with rendering=replace sets outerHTML"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "replace"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.notOk(await this.hasSelector("#frame"), "removes existing frame")
    this.assert.equal(await this.getVisibleText("#frame-rendering :first-child"), "Frame: Loaded")
  }

  async "test frame without action defaults to rendering=update"() {
    await this.remote.execute(() => document.getElementById("frame")?.removeAttribute("action"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame"), "Frame: Loaded")
  }

  async "test frame with rendering=update sets innerHTML"() {
    await this.remote.execute(() => document.getElementById("frame")?.setAttribute("rendering", "update"))
    await this.clickSelector("#outside-frame")
    await this.nextBeat

    this.assert.ok(await this.hasSelector("#frame"))
    this.assert.equal(await this.getVisibleText("#frame"), "Frame: Loaded")
  }

  async "test link with data-turbo-rendering=after inserts the contents after the frame"() {
    await this.clickSelector("#frame-after")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame"), "Rendering", "preserves frame contents")
    this.assert.equal(await this.getVisibleText("#frame ~ h2"), "Frame: Loaded", "inserts contents after frame")
  }

  async "test link with data-turbo-rendering=append appends the contents"() {
    await this.clickSelector("#frame-append")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Rendering")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Frame: Loaded")
  }

  async "test link with data-turbo-rendering=before inserts the contents before the frame"() {
    await this.clickSelector("#frame-before")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame-rendering :first-child"), "Frame: Loaded", "inserts contents before frame")
    this.assert.equal(await this.getVisibleText("#frame"), "Rendering", "preserves frame contents")
  }

  async "test link with data-turbo-rendering=prepend prepends the contents"() {
    await this.clickSelector("#frame-prepend")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Frame: Loaded")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Rendering")
  }

  async "test link with data-turbo-rendering=remove removes the element"() {
    await this.clickSelector("#frame-remove")
    await this.nextBeat

    this.assert.notOk(await this.hasSelector("#frame"), "removes existing frame")
    this.assert.ok(await this.hasSelector("#frame-remove"), "does not navigate the page")
  }

  async "test link with data-turbo-rendering=replace sets outerHTML"() {
    await this.clickSelector("#frame-replace")
    await this.nextBeat

    this.assert.notOk(await this.hasSelector("#frame"), "removes existing frame")
    this.assert.equal(await this.getVisibleText("#frame-rendering :first-child"), "Frame: Loaded")
  }

  async "test link with data-turbo-rendering=update sets innerHTML"() {
    await this.clickSelector("#frame-update")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame"), "Frame: Loaded")
  }

  async "test form[method=get][data-turbo-rendering=prepend] prepends the contents"() {
    await this.clickSelector("#frame-form-get-prepend")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Frame: Loaded")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Rendering")
  }

  async "test form[method=post][data-turbo-rendering=prepend] prepends the contents"() {
    await this.clickSelector("#frame-form-post-prepend")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Frame: Loaded")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Rendering")
  }

  async "test form[method=get] with button[data-turbo-rendering=append] appends the contents"() {
    await this.clickSelector("#frame-form-get-append")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Rendering")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Frame: Loaded")
  }

  async "test form[method=post] with button[data-turbo-rendering=append] appends the contents"() {
    await this.clickSelector("#frame-form-post-append")
    await this.nextBeat

    this.assert.equal(await this.getVisibleText("#frame :first-child"), "Rendering")
    this.assert.equal(await this.getVisibleText("#frame :last-child"), "Frame: Loaded")
  }

  get assetElements(): Promise<Element[]> {
    return filter(this.headElements, isAssetElement)
  }

  get provisionalElements(): Promise<Element[]> {
    return filter(this.headElements, async element => !await isAssetElement(element))
  }

  get headElements(): Promise<Element[]> {
    return this.evaluate(() => Array.from(document.head.children) as any[])
  }

  get permanentElement(): Promise<Element> {
    return this.querySelector("#permanent")
  }

  get headScriptEvaluationCount(): Promise<number | undefined> {
    return this.evaluate(() => window.headScriptEvaluationCount)
  }

  get bodyScriptEvaluationCount(): Promise<number | undefined> {
    return this.evaluate(() => window.bodyScriptEvaluationCount)
  }

  get isStylesheetEvaluated(): Promise<boolean> {
    return this.evaluate(() => getComputedStyle(document.body).getPropertyValue("--black-if-evaluated").trim() === "black")
  }

  get isNoscriptStylesheetEvaluated(): Promise<boolean> {
    return this.evaluate(() => getComputedStyle(document.body).getPropertyValue("--black-if-noscript-evaluated").trim() === "black")
  }

  async modifyBodyBeforeCaching() {
    return this.remote.execute(() => addEventListener("turbo:before-cache", function eventListener(event) {
      removeEventListener("turbo:before-cache", eventListener, false)
      document.body.innerHTML = "Modified"
    }, false))
  }

  async beforeCache(callback: (body: HTMLElement) => void) {
    return this.remote.execute((callback: (body: HTMLElement) => void) => {
      addEventListener("turbo:before-cache", function eventListener(event) {
        removeEventListener("turbo:before-cache", eventListener, false)
        callback(document.body)
      }, false)
    }, [callback])
  }

  async modifyBodyAfterRemoval() {
    return this.remote.execute(() => {
      const { documentElement, body } = document
      const observer = new MutationObserver(records => {
        for (const record of records) {
          if (Array.from(record.removedNodes).indexOf(body) > -1) {
            body.innerHTML = "Modified"
            observer.disconnect()
            break
          }
        }
      })
      observer.observe(documentElement, { childList: true })
    })
  }
}

async function filter<T>(promisedValues: Promise<T[]>, predicate: (value: T) => Promise<boolean>): Promise<T[]> {
  const values = await promisedValues
  const matches = await Promise.all(values.map(value => predicate(value)))
  return matches.reduce((result, match, index) => result.concat(match ? values[index] : []), [] as T[])
}

async function isAssetElement(element: Element): Promise<boolean> {
  const tagName = await element.getTagName()
  const relValue = await element.getAttribute("rel")
  return tagName == "script" || tagName == "style" || (tagName == "link" && relValue == "stylesheet")
}

declare global {
  interface Window {
    headScriptEvaluationCount?: number
    bodyScriptEvaluationCount?: number
  }
}

RenderingTests.registerSuite()
