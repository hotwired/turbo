import { FormSubmission, FormSubmissionDelegate } from "./form_submission"
import { FetchResponse } from "../../http/fetch_response"

export class Ping implements FormSubmissionDelegate {
  readonly url: URL

  constructor(url: URL) {
    this.url = url
  }

  perform() {
    const formSubmission = new FormSubmission(this, this.createFormElement())
    formSubmission.start()
  }

  createFormElement(): HTMLFormElement {
    const form = document.createElement("form")
    form.action = this.url.href
    form.method = "POST"
    return form
  }

  // Form submission delegate

  formSubmissionStarted(formSubmission: FormSubmission): void {}
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void {}
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void {}
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void {}
  formSubmissionFinished(formSubmission: FormSubmission): void {}
}
