export interface PageObserverDelegate {
    pageBecameInteractive(): void;
    pageLoaded(): void;
    pageWillUnload(): void;
}
export declare enum PageStage {
    initial = 0,
    loading = 1,
    interactive = 2,
    complete = 3
}
export declare class PageObserver {
    readonly delegate: PageObserverDelegate;
    stage: PageStage;
    started: boolean;
    constructor(delegate: PageObserverDelegate);
    start(): void;
    stop(): void;
    interpretReadyState: () => void;
    pageIsInteractive(): void;
    pageIsComplete(): void;
    pageWillUnload: () => void;
    get readyState(): DocumentReadyState;
}
