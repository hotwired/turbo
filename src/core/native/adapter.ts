import type { Visit, VisitOptions } from "../drive/visit"
import type { FormSubmission } from "../drive/form_submission"
import type { ReloadReason } from "../types"

export interface Adapter {
  visitProposedToLocation(location: URL, options?: Partial<VisitOptions>): void
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
  linkPrefetchingIsEnabledForLocation?(location: URL): boolean
  pageInvalidated(reason: ReloadReason): void
}
