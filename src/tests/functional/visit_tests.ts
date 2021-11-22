import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"
import { get } from "http"

declare const Turbo: any

export class VisitTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/visit.html")
  }

  async "test programmatically visiting a same-origin location"() {
    const urlBeforeVisit = await this.location
    await this.visitLocation("/src/tests/fixtures/one.html")

    const urlAfterVisit = await this.location
    this.assert.notEqual(urlBeforeVisit, urlAfterVisit)
    this.assert.equal(await this.visitAction, "advance")

    const { url: urlFromBeforeVisitEvent } = await this.nextEventNamed("turbo:before-visit")
    this.assert.equal(urlFromBeforeVisitEvent, urlAfterVisit)

    const { url: urlFromVisitEvent } = await this.nextEventNamed("turbo:visit")
    this.assert.equal(urlFromVisitEvent, urlAfterVisit)

    const { timing } = await this.nextEventNamed("turbo:load")
    this.assert.ok(timing)
  }

  async "skip programmatically visiting a cross-origin location falls back to window.location"() {
    const urlBeforeVisit = await this.location
    await this.visitLocation("about:blank")

    const urlAfterVisit = await this.location
    this.assert.notEqual(urlBeforeVisit, urlAfterVisit)
    this.assert.equal(await this.visitAction, "load")
  }

  async "test visiting a location served with a non-HTML content type"() {
    const urlBeforeVisit = await this.location
    await this.visitLocation("/src/tests/fixtures/svg.svg")
    await this.nextBeat

    const url = await this.remote.getCurrentUrl()
    const contentType = await contentTypeOfURL(url)
    this.assert.equal(contentType, "image/svg+xml")

    const urlAfterVisit = await this.location
    this.assert.notEqual(urlBeforeVisit, urlAfterVisit)
    this.assert.equal(await this.visitAction, "load")
  }

  async "test canceling a before-visit event prevents navigation"() {
    this.cancelNextVisit()
    const urlBeforeVisit = await this.location

    this.clickSelector("#same-origin-link")
    await this.nextBeat
    this.assert(!await this.changedBody)

    const urlAfterVisit = await this.location
    this.assert.equal(urlAfterVisit, urlBeforeVisit)
  }

  async "test navigation by history is not cancelable"() {
    this.clickSelector("#same-origin-link")
    await this.drainEventLog()
    await this.nextBeat

    this.cancelNextVisit()
    await this.goBack()
    this.assert(await this.changedBody)
  }

  async "test turbo:before-fetch-request event.detail"() {
    await this.clickSelector("#same-origin-link")
    const { url, fetchOptions } = await this.nextEventNamed("turbo:before-fetch-request")

    this.assert.equal(fetchOptions.method, "GET")
    this.assert.ok(url.toString().includes("/src/tests/fixtures/one.html"))
  }

  async "test turbo:before-fetch-response open new site"() {
    this.remote.execute(() => addEventListener("turbo:before-fetch-response", async function eventListener(event: any) {
      removeEventListener("turbo:before-fetch-response", eventListener, false);

      (window as any).fetchResponseResult = {
        responseText: await event.detail.fetchResponse.responseText,
        responseHTML: await event.detail.fetchResponse.responseHTML,
      };
    }, false));

    await this.clickSelector("#sample-response")
    await this.nextEventNamed("turbo:before-fetch-response")

    const fetchResponseResult = await this.evaluate(() => (window as any).fetchResponseResult)

    this.assert.isTrue(fetchResponseResult.responseText.indexOf('An element with an ID') > -1)
    this.assert.isTrue(fetchResponseResult.responseHTML.indexOf('An element with an ID') > -1)
  }

  async "test cache does not override response after redirect"() {
    await this.remote.execute(() => {
      const cachedElement = document.createElement("some-cached-element")
      document.body.appendChild(cachedElement)
    })

    this.assert(await this.hasSelector("some-cached-element"))
    this.clickSelector("#same-origin-link")
    await this.nextBeat
    this.clickSelector("#redirection-link")
    await this.nextBeat // 301 redirect response
    await this.nextBeat // 200 response
    this.assert.notOk(await this.hasSelector("some-cached-element"))
  }

  async visitLocation(location: string) {
    this.remote.execute((location: string) => window.Turbo.visit(location), [location])
  }

  async cancelNextVisit() {
    this.remote.execute(() => addEventListener("turbo:before-visit", function eventListener(event) {
      removeEventListener("turbo:before-visit", eventListener, false)
      event.preventDefault()
    }, false))
  }
}

function contentTypeOfURL(url: string): Promise<string | undefined> {
  return new Promise(resolve => {
    get(url, ({ headers }) => resolve(headers["content-type"]))
  })
}

VisitTests.registerSuite()
