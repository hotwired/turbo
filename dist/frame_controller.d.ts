import { FetchRequest, FetchRequestDelegate } from "./fetch_request";
import { FetchResponse } from "./fetch_response";
import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor";
import { FormSubmission, FormSubmissionDelegate } from "./form_submission";
import { FrameElement } from "./frame_element";
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor";
import { Locatable } from "./location";
export declare class FrameController implements FetchRequestDelegate, FormInterceptorDelegate, FormSubmissionDelegate, LinkInterceptorDelegate {
    readonly element: FrameElement;
    readonly linkInterceptor: LinkInterceptor;
    readonly formInterceptor: FormInterceptor;
    formSubmission?: FormSubmission;
    private resolveVisitPromise;
    constructor(element: FrameElement);
    connect(): void;
    disconnect(): void;
    shouldInterceptLinkClick(element: Element, url: string): boolean;
    linkClickIntercepted(element: Element, url: string): void;
    shouldInterceptFormSubmission(element: HTMLFormElement): boolean;
    formSubmissionIntercepted(element: HTMLFormElement): void;
    visit(url: Locatable): Promise<unknown>;
    additionalHeadersForRequest(request: FetchRequest): {
        "X-Turbo-Frame": string;
    };
    requestStarted(request: FetchRequest): void;
    requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse): void;
    requestSucceededWithResponse(request: FetchRequest, response: FetchResponse): Promise<void>;
    requestFailedWithResponse(request: FetchRequest, response: FetchResponse): void;
    requestErrored(request: FetchRequest, error: Error): void;
    requestFinished(request: FetchRequest): void;
    formSubmissionStarted(formSubmission: FormSubmission): void;
    formSubmissionSucceededWithResponse(formSubmission: FormSubmission, response: FetchResponse): void;
    formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void;
    formSubmissionErrored(formSubmission: FormSubmission, error: Error): void;
    formSubmissionFinished(formSubmission: FormSubmission): void;
    private findFrameElement;
    private loadResponse;
    private extractForeignFrameElement;
    private loadFrameElement;
    private focusFirstAutofocusableElement;
    private scrollFrameIntoView;
    private shouldInterceptNavigation;
    get firstAutofocusableElement(): HTMLElement | null;
    get id(): string;
    get enabled(): boolean;
}
//# sourceMappingURL=frame_controller.d.ts.map