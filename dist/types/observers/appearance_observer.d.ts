export interface AppearanceObserverDelegate {
    elementAppearedInViewport(element: Element): void;
}
export declare class AppearanceObserver {
    readonly delegate: AppearanceObserverDelegate;
    readonly element: Element;
    readonly intersectionObserver: IntersectionObserver;
    started: boolean;
    constructor(delegate: AppearanceObserverDelegate, element: Element);
    start(): void;
    stop(): void;
    intersect: IntersectionObserverCallback;
}
