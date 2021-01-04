declare type FormSubmitter = HTMLElement & {
    form?: HTMLFormElement;
    type?: string;
};
declare const submittersByForm: WeakMap<HTMLFormElement, HTMLElement>;
declare function findSubmitterFromClickTarget(target: EventTarget | null): FormSubmitter | null;
declare function clickCaptured(event: Event): void;
