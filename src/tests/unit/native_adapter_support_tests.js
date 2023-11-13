import * as Turbo from "../../index"
import { assert } from "@open-wc/testing"

class NativeAdapterSupportTest {
  proposedVisits = []
  startedVisits = []
  completedVisits = []
  startedVisitRequests = []
  completedVisitRequests = []
  failedVisitRequests = []
  finishedVisitRequests = []
  startedFormSubmissions = []
  finishedFormSubmissions = []

  // Adapter interface

  visitProposedToLocation(location, options) {
    this.proposedVisits.push({ location, options })
  }

  visitStarted(visit) {
    this.startedVisits.push(visit)
  }

  visitCompleted(visit) {
    this.completedVisits.push(visit)
  }

  visitRequestStarted(visit) {
    this.startedVisitRequests.push(visit)
  }

  visitRequestCompleted(visit) {
    this.completedVisitRequests.push(visit)
  }

  visitRequestFailedWithStatusCode(visit, _statusCode) {
    this.failedVisitRequests.push(visit)
  }

  visitRequestFinished(visit) {
    this.finishedVisitRequests.push(visit)
  }

  visitRendered(_visit) {}

  formSubmissionStarted(formSubmission) {
    this.startedFormSubmissions.push(formSubmission)
  }

  formSubmissionFinished(formSubmission) {
    this.finishedFormSubmissions.push(formSubmission)
  }

  pageInvalidated() {}
}

let adapter

setup(() => {
  adapter = new NativeAdapterSupportTest()
  Turbo.registerAdapter(adapter)
})

test("navigator adapter is native adapter", async () => {
  assert.equal(adapter, Turbo.navigator.adapter)
})

test("visit proposal location is proposed to adapter", async () => {
  const url = new URL(window.location.toString())

  Turbo.navigator.proposeVisit(url)
  assert.equal(adapter.proposedVisits.length, 1)

  const [visit] = adapter.proposedVisits
  assert.equal(visit.location, url)
})

test("visit proposal external location is proposed to adapter", async () => {
  const url = new URL("https://example.com/")

  Turbo.navigator.proposeVisit(url)
  assert.equal(adapter.proposedVisits.length, 1)

  const [visit] = adapter.proposedVisits
  assert.equal(visit.location, url)
})

test("visit started notifies adapter", async () => {
  const locatable = window.location.toString()

  Turbo.navigator.startVisit(locatable)
  assert.equal(adapter.startedVisits.length, 1)

  const [visit] = adapter.startedVisits
  assert.equal(visit.location, locatable)
})

test("test visit has cached snapshot returns boolean", async () => {
  const locatable = window.location.toString()

  await Turbo.navigator.startVisit(locatable)

  const [visit] = adapter.startedVisits
  assert.equal(visit.hasCachedSnapshot(), false)
})

test("visit completed notifies adapter", async () => {
  const locatable = window.location.toString()

  Turbo.navigator.startVisit(locatable)

  const [startedVisit] = adapter.startedVisits
  startedVisit.complete()

  const [completedVisit] = adapter.completedVisits
  assert.equal(completedVisit.location, locatable)
})

test("visit request started notifies adapter", async () => {
  const locatable = window.location.toString()

  Turbo.navigator.startVisit(locatable)

  const [startedVisit] = adapter.startedVisits
  startedVisit.startRequest()
  assert.equal(adapter.startedVisitRequests.length, 1)

  const [startedVisitRequest] = adapter.startedVisitRequests
  assert.equal(startedVisitRequest.location, locatable)
})

test("visit request completed notifies adapter", async () => {
  const locatable = window.location.toString()

  Turbo.navigator.startVisit(locatable)

  const [startedVisit] = adapter.startedVisits
  startedVisit.recordResponse({ statusCode: 200, responseHTML: "responseHtml", redirected: false })
  assert.equal(adapter.completedVisitRequests.length, 1)

  const [completedVisitRequest] = adapter.completedVisitRequests
  assert.equal(completedVisitRequest.location, locatable)
})

test("visit request failed notifies adapter", async () => {
  const locatable = window.location.toString()

  Turbo.navigator.startVisit(locatable)

  const [startedVisit] = adapter.startedVisits
  startedVisit.recordResponse({ statusCode: 404, responseHTML: "responseHtml", redirected: false })
  assert.equal(adapter.failedVisitRequests.length, 1)

  const [failedVisitRequest] = adapter.failedVisitRequests
  assert.equal(failedVisitRequest.location, locatable)
})

test("visit request finished notifies adapter", async () => {
  const locatable = window.location.toString()

  Turbo.navigator.startVisit(locatable)

  const [startedVisit] = adapter.startedVisits
  startedVisit.finishRequest()
  assert.equal(adapter.finishedVisitRequests.length, 1)

  const [finishedVisitRequest] = adapter.finishedVisitRequests
  assert.equal(finishedVisitRequest.location, locatable)
})

test("form submission started notifies adapter", async () => {
  Turbo.navigator.formSubmissionStarted("formSubmissionStub")
  assert.equal(adapter.startedFormSubmissions.length, 1)

  const [startedFormSubmission] = adapter.startedFormSubmissions
  assert.equal(startedFormSubmission, "formSubmissionStub")
})

test("form submission finished notifies adapter", async () => {
  Turbo.navigator.formSubmissionFinished("formSubmissionStub")
  assert.equal(adapter.finishedFormSubmissions.length, 1)

  const [finishedFormSubmission] = adapter.finishedFormSubmissions
  assert.equal(finishedFormSubmission, "formSubmissionStub")
})


test("visit follows redirect and proposes replace visit to adapter", async () => {
  const locatable = window.location.toString()
  const redirectedLocation = "https://example.com"

  Turbo.navigator.startVisit(locatable)

  const [startedVisit] = adapter.startedVisits
  startedVisit.redirectedToLocation = redirectedLocation
  startedVisit.recordResponse({ statusCode: 200, responseHTML: "responseHtml", redirected: true })
  startedVisit.complete()

  assert.equal(adapter.completedVisitRequests.length, 1)
  assert.equal(adapter.proposedVisits.length, 1)

  const [visit] = adapter.proposedVisits
  assert.equal(visit.location, redirectedLocation)
  assert.equal(visit.options.action, "replace")
})
