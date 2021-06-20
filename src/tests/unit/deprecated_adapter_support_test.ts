import { VisitOptions, Visit } from "../../core/drive/visit"
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

    const [ location ] = this.locations
    this.assert.equal(location.toString(), location.absoluteURL)
  }

  async "test visit start location includes deprecated absoluteURL property"() {
    Turbo.navigator.startVisit(window.location.toString(), "123")
    this.assert.equal(this.locations.length, 1)

    const [ location ] = this.locations
    this.assert.equal(location.toString(), location.absoluteURL)
  }

  // Adapter interface

  visitProposedToLocation(location: URL, options?: Partial<VisitOptions>): void {
    this.locations.push(location)
  }

  visitStarted(visit: Visit): void {
    this.locations.push(visit.location)
    visit.cancel()
  }

  visitCompleted(visit: Visit): void {

  }

  visitFailed(visit: Visit): void {

  }

  visitRequestStarted(visit: Visit): void {

  }

  visitRequestCompleted(visit: Visit): void {

  }

  visitRequestFailedWithStatusCode(visit: Visit, statusCode: number): void {

  }

  visitRequestFinished(visit: Visit): void {

  }

  visitRendered(visit: Visit): void {

  }

  pageInvalidated(): void {

  }
}

DeprecatedAdapterSupportTest.registerSuite()
