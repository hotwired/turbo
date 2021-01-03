import { FrameElement } from "../../elements/frame_element";
import { RenderCallback, RenderDelegate, Renderer } from "../drive/renderer";
import { Snapshot } from "../drive/snapshot";
export { RenderCallback, RenderDelegate } from "../drive/renderer";
export declare type PermanentElement = Element & {
    id: string;
};
export declare type Placeholder = {
    element: Element;
    permanentElement: PermanentElement;
};
export declare class FrameRenderer extends Renderer {
    readonly delegate: RenderDelegate;
    readonly frameElement: FrameElement;
    readonly currentSnapshot: Snapshot;
    readonly newSnapshot: Snapshot;
    readonly newBody: HTMLBodyElement;
    static render(delegate: RenderDelegate, callback: RenderCallback, frameElement: FrameElement, newSnapshot: Snapshot): Promise<void>;
    constructor(delegate: RenderDelegate, frameElement: FrameElement, newSnapshot: Snapshot);
    renderView(callback: RenderCallback): Promise<void>;
    private findFrameElement;
    private relocateCurrentBodyPermanentElements;
    private replacePlaceholderElementsWithClonedPermanentElements;
    get currentBodyPermanentElements(): PermanentElement[];
    private focusFirstAutofocusableElement;
    private get id();
}
