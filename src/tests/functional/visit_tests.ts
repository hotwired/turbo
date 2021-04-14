import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"
import { get } from "http"

declare const Turbo: any

export class VisitTests extends TurboDriveTestCase {
  async setup() {
    this.goToLocation("/src/tests/fixtures/visit.html")
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
    await this.visitLocation("/src/tests/fixtures/svg")
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

  async "test adding custom header via request interceptor"() {
    this.setRequestInterceptor()

    this.clickSelector("#same-origin-link")
    const { fetchOptions: { headers } } = await this.nextEventNamed("turbo:before-fetch-request")
    this.assert.equal(headers.Authorization, "Bearer Test Token")

    this.resetRequestInterceptor()
  }

  async "test navigation by history is not cancelable"() {
    this.clickSelector("#same-origin-link")
    await this.drainEventLog()
    await this.nextBeat

    await this.goBack()
    this.assert(await this.changedBody)
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

  async setRequestInterceptor() {
    this.remote.execute(() => {
      window.Turbo.setRequestInterceptor(async (request) => {
        request.addHeader("Authorization", "Bearer Test Token")
      })
    })
  }

  async resetRequestInterceptor() {
    this.remote.execute(() => {
      window.Turbo.setRequestInterceptor(async (request) => {})
    })
  }
}

function contentTypeOfURL(url: string): Promise<string | undefined> {
  return new Promise(resolve => {
    get(url, ({ headers }) => resolve(headers["content-type"]))
  })
}

VisitTests.registerSuite()
