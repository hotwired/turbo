export interface FormInterceptorDelegate {
    shouldInterceptFormSubmission(element: HTMLFormElement): boolean;
    formSubmissionIntercepted(element: HTMLFormElement): void;
}
export declare class FormInterceptor {
    readonly delegate: FormInterceptorDelegate;
    readonly element: Element;
    constructor(delegate: FormInterceptorDelegate, element: Element);
    start(): void;
    stop(): void;
    submitBubbled: (event: Event) => void;
}
