import { VisitOptions, Visit } from "../../core/drive/visit"
import { FormSubmission } from "../../core/drive/form_submission"
import { Adapter } from "../../core/native/adapter"
import * as Turbo from "../../index"
import { assert } from "@open-wc/testing"

class DeprecatedAdapterSupportTest implements Adapter {
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

let adapter: DeprecatedAdapterSupportTest

setup(() => {
  adapter = new DeprecatedAdapterSupportTest()
  Turbo.registerAdapter(adapter)
})

test("test visit proposal location includes deprecated absoluteURL property", async () => {
  Turbo.navigator.proposeVisit(new URL(window.location.toString()))
  assert.equal(adapter.locations.length, 1)

  const [location] = adapter.locations
  assert.equal(location.toString(), location.absoluteURL)
})

test("test visit start location includes deprecated absoluteURL property", async () => {
  Turbo.navigator.startVisit(window.location.toString(), "123")
  assert.equal(adapter.locations.length, 1)

  const [location] = adapter.locations
  assert.equal(location.toString(), location.absoluteURL)
})
