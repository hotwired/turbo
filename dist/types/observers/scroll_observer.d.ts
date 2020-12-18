import { Position } from "../core/types";
export interface ScrollObserverDelegate {
    scrollPositionChanged(position: Position): void;
}
export declare class ScrollObserver {
    readonly delegate: ScrollObserverDelegate;
    started: boolean;
    constructor(delegate: ScrollObserverDelegate);
    start(): void;
    stop(): void;
    onScroll: () => void;
    updatePosition(position: Position): void;
}
