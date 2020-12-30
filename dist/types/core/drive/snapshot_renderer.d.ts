import { HeadDetails } from "./head_details";
import { RenderCallback, RenderDelegate, Renderer } from "./renderer";
import { Snapshot } from "./snapshot";
export { RenderCallback, RenderDelegate } from "./renderer";
export declare type PermanentElement = Element & {
    id: string;
};
export declare type Placeholder = {
    element: Element;
    permanentElement: PermanentElement;
};
export declare class SnapshotRenderer extends Renderer {
    readonly delegate: RenderDelegate;
    readonly currentSnapshot: Snapshot;
    readonly currentHeadDetails: HeadDetails;
    readonly newSnapshot: Snapshot;
    readonly newHeadDetails: HeadDetails;
    readonly newBody: HTMLBodyElement;
    readonly isPreview: boolean;
    static render(delegate: RenderDelegate, callback: RenderCallback, currentSnapshot: Snapshot, newSnapshot: Snapshot, isPreview: boolean): void;
    constructor(delegate: RenderDelegate, currentSnapshot: Snapshot, newSnapshot: Snapshot, isPreview: boolean);
    render(callback: RenderCallback): void;
    mergeHead(): void;
    replaceBody(): void;
    shouldRender(): boolean;
    trackedElementsAreIdentical(): boolean;
    copyNewHeadStylesheetElements(): void;
    copyNewHeadScriptElements(): void;
    removeCurrentHeadProvisionalElements(): void;
    copyNewHeadProvisionalElements(): void;
    relocateCurrentBodyPermanentElements(): Placeholder[];
    replacePlaceholderElementsWithClonedPermanentElements(placeholders: Placeholder[]): void;
    activateNewBody(): void;
    activateNewBodyScriptElements(): void;
    assignNewBody(): void;
    focusFirstAutofocusableElement(): void;
    getNewHeadStylesheetElements(): Element[];
    getNewHeadScriptElements(): Element[];
    getCurrentHeadProvisionalElements(): Element[];
    getNewHeadProvisionalElements(): Element[];
    getCurrentBodyPermanentElements(): PermanentElement[];
    getNewBodyScriptElements(): HTMLScriptElement[];
}
