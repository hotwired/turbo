export declare type RenderCallback = () => void;
export interface RenderDelegate {
    viewWillRender(newBody: HTMLBodyElement): void;
    viewRendered(newBody: HTMLBodyElement): void;
    viewInvalidated(): void;
}
export declare abstract class Renderer {
    abstract delegate: RenderDelegate;
    abstract newBody: HTMLBodyElement;
    renderView(callback: RenderCallback): void;
    invalidateView(): void;
    createScriptElement(element: Element): Element;
}
