declare type FormSubmitter = HTMLElement & {
    form?: HTMLFormElement;
};
declare const submittersByForm: WeakMap<HTMLFormElement, HTMLElement>;
declare function findSubmitterFromClickTarget(target: EventTarget | null): FormSubmitter | null;
declare function clickCaptured(event: Event): void;
