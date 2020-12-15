import { FetchRequest, FetchMethod, FetchRequestHeaders } from "./fetch_request";
import { FetchResponse } from "./fetch_response";
import { Location } from "./location";
export interface FormSubmissionDelegate {
    formSubmissionStarted(formSubmission: FormSubmission): void;
    formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void;
    formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void;
    formSubmissionErrored(formSubmission: FormSubmission, error: Error): void;
    formSubmissionFinished(formSubmission: FormSubmission): void;
}
export declare type FormSubmissionResult = {
    success: boolean;
    fetchResponse: FetchResponse;
} | {
    success: false;
    error: Error;
};
export declare enum FormSubmissionState {
    initialized = 0,
    requesting = 1,
    waiting = 2,
    receiving = 3,
    stopping = 4,
    stopped = 5
}
export declare class FormSubmission {
    readonly delegate: FormSubmissionDelegate;
    readonly formElement: HTMLFormElement;
    readonly formData: FormData;
    readonly fetchRequest: FetchRequest;
    readonly mustRedirect: boolean;
    state: FormSubmissionState;
    result?: FormSubmissionResult;
    constructor(delegate: FormSubmissionDelegate, formElement: HTMLFormElement, mustRedirect?: boolean);
    get method(): FetchMethod;
    get location(): Location;
    start(): Promise<FetchResponse | undefined>;
    stop(): true | undefined;
    additionalHeadersForRequest(request: FetchRequest): FetchRequestHeaders;
    requestStarted(request: FetchRequest): void;
    requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse): void;
    requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): void;
    requestFailedWithResponse(request: FetchRequest, response: FetchResponse): void;
    requestErrored(request: FetchRequest, error: Error): void;
    requestFinished(request: FetchRequest): void;
    requestMustRedirect(request: FetchRequest): boolean;
}
//# sourceMappingURL=form_submission.d.ts.map