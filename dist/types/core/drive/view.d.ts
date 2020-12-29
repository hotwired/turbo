import { Location } from "../location";
import { Snapshot } from "./snapshot";
import { SnapshotCache } from "./snapshot_cache";
import { RenderCallback, RenderDelegate } from "./snapshot_renderer";
import { Position } from "../types";
export declare type RenderOptions = {
    snapshot: Snapshot;
    error: string;
    isPreview: boolean;
};
export declare type ViewDelegate = RenderDelegate & {
    viewWillCacheSnapshot(): void;
};
export declare class View {
    readonly delegate: ViewDelegate;
    readonly htmlElement: HTMLHtmlElement;
    readonly snapshotCache: SnapshotCache;
    lastRenderedLocation?: Location;
    constructor(delegate: ViewDelegate);
    getRootLocation(): Location;
    getElementForAnchor(anchor: string): Element | null;
    getSnapshot(): Snapshot;
    clearSnapshotCache(): void;
    shouldCacheSnapshot(): boolean;
    cacheSnapshot(): Promise<void>;
    getCachedSnapshotForLocation(location: Location): Snapshot | undefined;
    render({ snapshot, error, isPreview }: Partial<RenderOptions>, callback: RenderCallback): void;
    scrollToAnchor(anchor: string): void;
    scrollToElement(element: Element): void;
    scrollToPosition({ x, y }: Position): void;
    markAsPreview(isPreview: boolean | undefined): void;
    renderSnapshot(snapshot: Snapshot, isPreview: boolean | undefined, callback: RenderCallback): void;
    renderError(error: string | undefined, callback: RenderCallback): void;
}
