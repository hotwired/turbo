export interface FormSubmitObserverDelegate {
    willSubmitForm(form: HTMLFormElement): boolean;
    formSubmitted(form: HTMLFormElement): void;
}
export declare class FormSubmitObserver {
    readonly delegate: FormSubmitObserverDelegate;
    started: boolean;
    constructor(delegate: FormSubmitObserverDelegate);
    start(): void;
    stop(): void;
    submitCaptured: () => void;
    submitBubbled: (event: Event) => void;
}
