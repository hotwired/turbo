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
    submitBubbled: EventListener;
}
