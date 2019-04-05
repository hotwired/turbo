import { Adapter } from "./adapter"
import { FetchResponse } from "./fetch_response"
import { FormSubmission } from "./form_submission"
import { History } from "./history"
import { Location } from "./location"
import { View } from "./view"
import { Visit } from "./visit"

export interface NavigatorDelegate {
  readonly adapter: Adapter
  readonly view: View
  readonly history: History
}

export enum NavigationTarget {
  background,
  foreground,
  modal
}

export type NavigationOptions = {
  target: NavigationTarget
}

export class Navigator {
  readonly delegate: NavigatorDelegate
  foregroundFormSubmission?: FormSubmission
  backgroundFormSubmissions: Set<FormSubmission> = new Set

  constructor(delegate: NavigatorDelegate) {
    this.delegate = delegate
  }

  visit(location: Location, options: Partial<NavigationOptions> = {}) {
    const form = formForLocation(location)
    this.submit(form, options)
  }

  submit(form: HTMLFormElement, options: Partial<NavigationOptions> = {}) {
    const formSubmission = new FormSubmission(this, form)

    if (options.target == NavigationTarget.background) {
      this.backgroundFormSubmissions.add(formSubmission)
    } else {
      this.stop()
      this.foregroundFormSubmission = formSubmission
    }

    formSubmission.start()
  }

  stop() {
    if (this.foregroundFormSubmission) {
      this.foregroundFormSubmission.stop()
      delete this.foregroundFormSubmission
    }
  }

  reload() {

  }

  goBack() {

  }

  get adapter() {
    return this.delegate.adapter
  }

  get view() {
    return this.delegate.view
  }

  get history() {
    return this.delegate.history
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission: FormSubmission) {

  }

  formSubmissionProgressed(formSubmission: FormSubmission, progress: number) {

  }

  formSubmissionWillRedirectToLocation(formSubmission: FormSubmission, location: Location) {
    return true
  }

  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {

  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {

  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {

  }

  formSubmissionFinished(formSubmission: FormSubmission) {

  }

  // Visit delegate

  visitCompleted(visit: Visit) {

  }
}

function formForLocation(location: Location) {
  const form = document.createElement("form")
  form.action = location.absoluteURL
  return form
}
