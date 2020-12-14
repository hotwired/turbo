export interface FormSubmitObserverDelegate {
    willSubmitForm(form: HTMLFormElement, submitter?: HTMLElement): boolean;
    formSubmitted(form: HTMLFormElement, submitter?: HTMLElement): void;
}
export declare class FormSubmitObserver {
    readonly delegate: FormSubmitObserverDelegate;
    started: boolean;
    constructor(delegate: FormSubmitObserverDelegate);
    start(): void;
    stop(): void;
    submitCaptured: () => void;
    submitBubbled: (event: Event & {
        submitter?: HTMLElement;
    }) => void;
}
//# sourceMappingURL=form_submit_observer.d.ts.map