import { Visit, TransferableVisitOptions } from "../drive/visit"
import { FormSubmission } from "../drive/form_submission"
import { ReloadReason } from "./browser_adapter"

export interface Adapter {
  visitProposedToLocation(location: URL, options?: TransferableVisitOptions): void
  visitStarted(visit: Visit): void
  visitCompleted(visit: Visit): void
  visitFailed(visit: Visit): void
  visitRequestStarted(visit: Visit): void
  visitRequestCompleted(visit: Visit): void
  visitRequestFailedWithStatusCode(visit: Visit, statusCode: number): void
  visitRequestFinished(visit: Visit): void
  visitRendered(visit: Visit): void
  formSubmissionStarted?(formSubmission: FormSubmission): void
  formSubmissionFinished?(formSubmission: FormSubmission): void
  pageInvalidated(reason: ReloadReason): void
}
