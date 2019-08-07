import { FetchResponse } from "./fetch_response"
import { FormSubmission } from "./form_submission"
import { Location } from "./location"
import { uuid } from "./util"
import { Visit, VisitDelegate, VisitOptions } from "./visit"

export type NavigatorDelegate = VisitDelegate

export enum NavigationTarget {
  background,
  foreground,
  modal
}

export type NavigationOptions = VisitOptions & {
  target: NavigationTarget
}

export class Navigator {
  readonly delegate: NavigatorDelegate
  foregroundFormSubmission?: FormSubmission
  formSubmissions: Set<FormSubmission> = new Set
  currentVisit?: Visit

  constructor(delegate: NavigatorDelegate) {
    this.delegate = delegate
  }

  visit(location: Location, restorationIdentifier: string, options: Partial<NavigationOptions> = {}) {
    this.startVisit(location, restorationIdentifier, options)
  }

  submit(form: HTMLFormElement, options: Partial<NavigationOptions> = {}) {
    const formSubmission = new FormSubmission(this, form, true)
    const { target } = { ...navigationOptionsForForm(form), ...options }

    if (target != NavigationTarget.background) {
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

    if (this.currentVisit) {
      this.currentVisit.cancel()
      delete this.currentVisit
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
    this.formSubmissions.add(formSubmission)
  }

  async formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    console.log("Form submission succeeded", formSubmission)
    if (formSubmission == this.foregroundFormSubmission) {
      const responseHTML = await fetchResponse.responseHTML
      if (responseHTML) {
        const visitOptions = { response: { responseHTML } }
        console.log("Visiting", fetchResponse.location, visitOptions)
        this.startVisit(fetchResponse.location, uuid(), visitOptions)
      }
    }
  }

  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse) {
    console.error("Form submission failed", formSubmission, fetchResponse)
  }

  formSubmissionErrored(formSubmission: FormSubmission, error: Error) {
    console.error("Form submission failed", formSubmission, error)
  }

  formSubmissionFinished(formSubmission: FormSubmission) {
    this.formSubmissions.delete(formSubmission)
  }

  // Visit delegate

  visitStarted(visit: Visit) {
    this.delegate.visitStarted(visit)
  }

  visitCompleted(visit: Visit) {
    this.delegate.visitCompleted(visit)
  }

  // Visits

  startVisit(location: Location, restorationIdentifier: string, options: Partial<VisitOptions> = {}) {
    this.stop()
    this.currentVisit = new Visit(this, location, restorationIdentifier, { ...options, referrer: this.location })
    this.currentVisit.start()
  }

  get location() {
    return this.history.location
  }
}

function navigationOptionsForForm(form: HTMLFormElement) {
  const target = navigationTargetFromString(form.getAttribute("target"))
  return { target }
}

function navigationTargetFromString(target: string | null) {
  switch (target) {
    case "background": return NavigationTarget.background
    case "modal":      return NavigationTarget.modal
    default:           return NavigationTarget.foreground
  }
}
