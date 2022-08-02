import { VisitOptions, Visit } from "../../core/drive/visit"
import { FormSubmission } from "../../core/drive/form_submission"
import { Adapter } from "../../core/native/adapter"
import * as Turbo from "../../index"
import { DOMTestCase } from "../helpers/dom_test_case"

export class DeprecatedAdapterSupportTest extends DOMTestCase implements Adapter {
  locations: any[] = []
  originalAdapter = Turbo.navigator.adapter

  async setup() {
    Turbo.registerAdapter(this)
  }

  async teardown() {
    Turbo.registerAdapter(this.originalAdapter)
  }

  async "test visit proposal location includes deprecated absoluteURL property"() {
    Turbo.navigator.proposeVisit(new URL(window.location.toString()))
    this.assert.equal(this.locations.length, 1)

    const [location] = this.locations
    this.assert.equal(location.toString(), location.absoluteURL)
  }

  async "test visit start location includes deprecated absoluteURL property"() {
    Turbo.navigator.startVisit(window.location.toString(), "123")
    this.assert.equal(this.locations.length, 1)

    const [location] = this.locations
    this.assert.equal(location.toString(), location.absoluteURL)
  }

  // Adapter interface

  visitProposedToLocation(location: URL, _options?: Partial<VisitOptions>): Promise<void> {
    this.locations.push(location)

    return Promise.resolve()
  }

  visitStarted(visit: Visit): void {
    this.locations.push(visit.location)
    visit.cancel()
  }

  visitCompleted(_visit: Visit): void {}

  visitFailed(_visit: Visit): void {}

  visitRequestStarted(_visit: Visit): void {}

  visitRequestCompleted(_visit: Visit): void {}

  visitRequestFailedWithStatusCode(_visit: Visit, _statusCode: number): void {}

  visitRequestFinished(_visit: Visit): void {}

  visitRendered(_visit: Visit): void {}

  formSubmissionStarted(_formSubmission: FormSubmission): void {}

  formSubmissionFinished(_formSubmission: FormSubmission): void {}

  pageInvalidated(): void {}
}

DeprecatedAdapterSupportTest.registerSuite()
