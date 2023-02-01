import { VisitOptions, Visit } from "../../core/drive/visit"
import { FormSubmission } from "../../core/drive/form_submission"
import { Adapter } from "../../core/native/adapter"
import * as Turbo from "../../index"
import { beforeEach, afterEach, expect, test } from "@jest/globals"

export class DeprecatedAdapter implements Adapter {
  locations: any[] = []

  // Adapter interface
  visitProposedToLocation(location: URL, _options?: Partial<VisitOptions>): void {
    this.locations.push(location)
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

const originalAdapter = Turbo.navigator.adapter
let adapter: DeprecatedAdapter

beforeEach(() => {
  adapter = new DeprecatedAdapter()
  Turbo.registerAdapter(adapter)
})

afterEach(() => {
  Turbo.registerAdapter(originalAdapter)
})

test("visit proposal location includes deprecated absoluteURL property", async () => {
  Turbo.navigator.proposeVisit(new URL(window.location.toString()))
  expect(adapter.locations.length).toEqual(1)

  const [location] = adapter.locations
  expect(location.toString()).toEqual(location.absoluteURL)
})

test("visit start location includes deprecated absoluteURL property", async () => {
  Turbo.navigator.startVisit(window.location.toString(), "123")
  expect(adapter.locations.length).toEqual(1)

  const [location] = adapter.locations
  expect(location.toString()).toEqual(location.absoluteURL)
})
