export interface FormInterceptorDelegate {
    shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement): boolean;
    formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement): void;
}
export declare class FormInterceptor {
    readonly delegate: FormInterceptorDelegate;
    readonly element: Element;
    constructor(delegate: FormInterceptorDelegate, element: Element);
    start(): void;
    stop(): void;
    submitBubbled: EventListener;
}
