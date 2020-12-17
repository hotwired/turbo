export declare function array<T>(values: ArrayLike<T>): T[];
export declare const closest: (element: Element, selector: string) => Element | null;
export declare function defer(callback: () => any): void;
export declare type DispatchOptions = {
    target: EventTarget;
    cancelable: boolean;
    detail: any;
};
export declare function dispatch(eventName: string, { target, cancelable, detail }?: Partial<DispatchOptions>): CustomEvent<any>;
export declare function nextAnimationFrame(): Promise<void>;
export declare function unindent(strings: TemplateStringsArray, ...values: any[]): string;
export declare function uuid(): string;
