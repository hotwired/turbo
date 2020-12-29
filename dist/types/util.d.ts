export declare type DispatchOptions = {
    target: EventTarget;
    cancelable: boolean;
    detail: any;
};
export declare function dispatch(eventName: string, { target, cancelable, detail }?: Partial<DispatchOptions>): CustomEvent<any>;
export declare function nextAnimationFrame(): Promise<void>;
export declare function nextMicrotask(): Promise<void>;
export declare function unindent(strings: TemplateStringsArray, ...values: any[]): string;
export declare function uuid(): string;
