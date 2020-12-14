export interface PageObserverDelegate {
    pageBecameInteractive(): void;
    pageLoaded(): void;
    pageInvalidated(): void;
}
export declare enum PageStage {
    initial = 0,
    loading = 1,
    interactive = 2,
    complete = 3,
    invalidated = 4
}
export declare class PageObserver {
    readonly delegate: PageObserverDelegate;
    stage: PageStage;
    started: boolean;
    constructor(delegate: PageObserverDelegate);
    start(): void;
    stop(): void;
    invalidate(): void;
    interpretReadyState: () => void;
    pageIsInteractive(): void;
    pageIsComplete(): void;
    get readyState(): DocumentReadyState;
}
//# sourceMappingURL=page_observer.d.ts.map